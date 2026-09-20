(function (global) {
  var cart = global.orderCart;

  function t(key, params) {
    if (!global.i18n) return key;
    return params ? global.i18n.format(key, params) : global.i18n.t(key);
  }

  function now() {
    return new Date().toISOString();
  }

  function escapeHtml(s) {
    return String(s == null ? "" : s)
      .replace(/&/g, "&amp;")
      .replace(/</g, "&lt;")
      .replace(/>/g, "&gt;")
      .replace(/"/g, "&quot;");
  }

  function activeRows(table) {
    return global.store.getAll(table).filter(function (r) {
      return r.deleted_at == null;
    });
  }

  function actorId() {
    var u = global.auth && global.auth.getUser();
    return u ? u.id : 1;
  }

  /** PJB-YYYYMM-NNNN-SS (legacy compact PJBYYYYMMNNNN-SS still parses). */
  function parseOrderSku(sku) {
    if (sku == null || sku === "") return null;
    var s = String(sku).trim();
    var m = s.match(/^PJB-(\d{6})-(\d{4})-(\d{2})$/);
    if (m) return { yyyymm: m[1], seq: m[2], split: m[3] };
    m = s.match(/^PJB(\d{6})(\d{4})-(\d{2})$/);
    if (m) return { yyyymm: m[1], seq: m[2], split: m[3] };
    return null;
  }

  function formatOrderSku(sku) {
    if (sku == null || sku === "") return "";
    var p = parseOrderSku(sku);
    if (!p) return String(sku);
    return "PJB-" + p.yyyymm + "-" + p.seq + "-" + p.split;
  }

  function familySku(sku) {
    if (!sku) return "";
    var p = parseOrderSku(sku);
    if (p) return "PJB-" + p.yyyymm + "-" + p.seq;
    return String(sku).replace(/-\d{2}$/, "");
  }

  /** PJB-YYYYMM-NNNN for a family root (from parent or any member sku). */
  function familyBaseSku(orderOrRootId) {
    var order =
      orderOrRootId != null && typeof orderOrRootId === "object"
        ? orderOrRootId
        : global.store.getById("order_list", orderOrRootId);
    if (!order) return "";
    var rootId = order.parent_id || order.id;
    var members = familyMembers(rootId);
    for (var i = 0; i < members.length; i++) {
      var base = familySku(members[i].sku || "");
      if (base) return base;
    }
    return "";
  }

  /** splitIndex 1 = -01 (first child row under family header). */
  function formatFamilySplitSku(base, splitIndex) {
    if (!base) return "—";
    if (splitIndex == null || splitIndex < 1) return base;
    return base + "-" + String(splitIndex).padStart(2, "0");
  }

  function nextFamilySplitSku(parentOrderOrId) {
    var parent =
      parentOrderOrId != null && typeof parentOrderOrId === "object"
        ? parentOrderOrId
        : global.store.getById("order_list", parentOrderOrId);
    if (!parent) return nextOrderSku();
    var rootId = parent.parent_id || parent.id;
    var base = familyBaseSku(parent);
    if (!base) return nextOrderSku();
    var maxSplit = 0;
    familyMembers(rootId).forEach(function (o) {
      var p = parseOrderSku(o.sku);
      if (p && "PJB-" + p.yyyymm + "-" + p.seq === base) {
        var n = parseInt(p.split, 10);
        if (n > maxSplit) maxSplit = n;
      }
    });
    return base + "-" + String(maxSplit + 1).padStart(2, "0");
  }

  function familyRootId(order) {
    if (!order) return null;
    return order.parent_id || order.id;
  }

  function familyMembers(rootId) {
    return activeRows("order_list").filter(function (o) {
      return o.id === rootId || o.parent_id === rootId;
    });
  }

  function childCount(parentId) {
    return activeRows("order_list").filter(function (o) {
      return o.parent_id === parentId;
    }).length;
  }

  function orderItems(orderId) {
    return activeRows("order_list_item").filter(function (i) {
      return Number(i.order_list_id) === Number(orderId);
    });
  }

  function orderShipping(orderId) {
    return activeRows("order_list_shipping").find(function (s) {
      return Number(s.order_list_id) === Number(orderId);
    });
  }

  function paymentsForOrder(orderId) {
    return activeRows("order_payment").filter(function (p) {
      return Number(p.order_list_id) === Number(orderId);
    });
  }

  function paymentItems(paymentId) {
    return activeRows("order_payment_item").filter(function (pi) {
      return Number(pi.order_payment_id) === Number(paymentId);
    });
  }

  function orderTotals(orderId) {
    var items = orderItems(orderId);
    var count = items.length;
    var total = items.reduce(function (s, i) {
      return s + (Number(i.total_price) || 0);
    }, 0);
    var pieces = items.reduce(function (s, i) {
      return s + (Number(i.amount) || 0);
    }, 0);
    return { item_count: count, total_price: cart.roundMoney2(total), piece_count: pieces };
  }

  function paymentTotals(paymentId) {
    var items = paymentItems(paymentId);
    var count = items.length;
    var total = items.reduce(function (s, i) {
      return s + (Number(i.total_price) || 0);
    }, 0);
    var pieces = items.reduce(function (s, i) {
      return s + (Number(i.amount) || 0);
    }, 0);
    return { item_count: count, total_price: cart.roundMoney2(total), piece_count: pieces };
  }

  function aggregateFamilyTotals(rootId) {
    var members = familyMembers(rootId);
    var item_count = 0;
    var total_price = 0;
    members.forEach(function (m) {
      var t = orderTotals(m.id);
      item_count += t.item_count;
      total_price += t.total_price;
    });
    return { item_count: item_count, total_price: cart.roundMoney2(total_price) };
  }

  function statusBadgeHtml(status, kind) {
    kind = kind || "sale";
    var key = kind === "fulfill" ? "orderFulfillStatus." + status : "orderSaleStatus." + status;
    var label = t(key);
    return (
      '<span class="crud-badge crud-badge--' + escapeHtml(status) + '">' + escapeHtml(label) + "</span>"
    );
  }

  function v2SaleStatus(designStatus) {
    var map = {
      draft: "draft",
      pending: "waiting",
      success: "success",
      cancelled: "cancel",
      rejected: "reject",
    };
    return map[designStatus] || designStatus;
  }

  function designSaleStatus(v2Status) {
    var map = {
      draft: "draft",
      waiting: "pending",
      success: "success",
      cancel: "cancelled",
      reject: "rejected",
    };
    return map[v2Status] || v2Status;
  }

  function formatMoney(n) {
    var x = cart.roundMoney2(Number(n) || 0);
    return x.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 });
  }

  function formatDateTimeSplit(iso, loc) {
    if (!iso) return "—";
    var d = new Date(iso);
    if (isNaN(d.getTime())) return "—";
    loc = loc || (global.i18n ? global.i18n.getLocale() : "th");
    var date = d.toLocaleDateString(loc === "th" ? "th-TH" : "en-GB", {
      day: "2-digit",
      month: "short",
      year: "numeric",
    });
    var time = d.toLocaleTimeString(loc === "th" ? "th-TH" : "en-GB", {
      hour: "2-digit",
      minute: "2-digit",
    });
    return escapeHtml(date) + '<br><span class="crud-muted">' + escapeHtml(time) + "</span>";
  }

  function inDateRange(iso, from, to) {
    if (!iso) return !from && !to;
    var day = String(iso).slice(0, 10);
    if (from && day < from) return false;
    if (to && day > to) return false;
    return true;
  }

  function adminUserName(id) {
    if (!id) return "—";
    var u = global.store.getById("admin_user", id);
    return u ? u.username : "—";
  }

  function memberDisplayName(order) {
    return order.member_name || "—";
  }

  function vatPercent() {
    var rows = activeRows("setting_vat");
    if (!rows.length) return 7;
    return Number(rows[0].vat) || 7;
  }

  function nextOrderSku() {
    var y = new Date().getFullYear();
    var m = String(new Date().getMonth() + 1).padStart(2, "0");
    var yyyymm = String(y) + m;
    var maxSeq = 0;
    activeRows("order_list").forEach(function (o) {
      var p = parseOrderSku(o.sku);
      if (p && p.yyyymm === yyyymm) {
        var n = parseInt(p.seq, 10);
        if (n > maxSeq) maxSeq = n;
      }
    });
    var seq = String(maxSeq + 1).padStart(4, "0");
    return "PJB-" + yyyymm + "-" + seq + "-01";
  }

  function compareHash(stored, plain) {
    if (!stored || !plain) return false;
    if (stored === plain) return true;
    return false;
  }

  function listActiveSuperadmins() {
    return activeRows("admin_user").filter(function (u) {
      return u.status === "active" && u.type === "superadmin";
    });
  }

  function verifyCreditPassword(password) {
    var users = listActiveSuperadmins();
    for (var i = 0; i < users.length; i++) {
      var u = users[i];
      var stored = u.password_credit_hash || u._demo_credit_password;
      if (compareHash(stored, password)) return { ok: true, userId: u.id };
    }
    return { ok: false };
  }

  function verifyDiscountPassword(password) {
    var users = listActiveSuperadmins();
    for (var i = 0; i < users.length; i++) {
      var u = users[i];
      var stored = u.password_discount_hash || u._demo_discount_password;
      if (compareHash(stored, password)) return { ok: true, userId: u.id };
    }
    return { ok: false };
  }

  var CREDIT_SESSION_KEY = "warehouse-design-credit-approved";
  var DISCOUNT_SESSION_KEY = "warehouse-design-discount-approved";

  function getCreditApprovedBy(orderId) {
    try {
      var raw = sessionStorage.getItem(CREDIT_SESSION_KEY);
      if (!raw) return null;
      var map = JSON.parse(raw);
      return map[String(orderId)] || null;
    } catch {
      return null;
    }
  }

  function setCreditApprovedBy(orderId, userId) {
    try {
      var raw = sessionStorage.getItem(CREDIT_SESSION_KEY);
      var map = raw ? JSON.parse(raw) : {};
      map[String(orderId)] = userId;
      sessionStorage.setItem(CREDIT_SESSION_KEY, JSON.stringify(map));
    } catch {
      /* ponytail: private mode */
    }
  }

  function getDiscountApprovedSession() {
    try {
      var raw = sessionStorage.getItem(DISCOUNT_SESSION_KEY);
      return raw ? JSON.parse(raw) : null;
    } catch {
      return null;
    }
  }

  function setDiscountApprovedSession(userId) {
    try {
      sessionStorage.setItem(DISCOUNT_SESSION_KEY, JSON.stringify({ userId: userId, at: Date.now() }));
    } catch {
      /* ponytail: private mode */
    }
  }

  function productItemLabel(itemId) {
    var item = global.store.getById("product_item", itemId);
    if (!item) return "SKU #" + itemId;
    var lang = global.store.getAll("product_item_language").find(function (l) {
      return l.product_item_id === itemId && l.locale === (global.i18n ? global.i18n.getLocale() : "th");
    });
    return (lang && lang.name) || item.sku || "#" + itemId;
  }

  function productItemSearchHaystack(item) {
    if (!item) return "";
    var parts = [
      productItemLabel(item.id),
      item.sku,
      item.barcode,
      item.qrcode,
    ];
    return parts
      .filter(function (p) {
        return p != null && String(p).trim() !== "";
      })
      .join(" ")
      .toLowerCase();
  }

  function productItemStockSum(itemId) {
    var total = 0;
    activeRows("product_item_stock").forEach(function (s) {
      if (s.product_item_id !== itemId || s.is_used === false) return;
      var q = Number(s.remain_quantity);
      if (Number.isFinite(q) && q > 0) total += Math.trunc(q);
    });
    return total;
  }

  function oldestStockSellPrice(itemId) {
    var lots = activeRows("product_item_stock")
      .filter(function (s) {
        return s.product_item_id === itemId && s.is_used !== false;
      })
      .sort(function (a, b) {
        var ta = a.received_at || a.created_at || "";
        var tb = b.received_at || b.created_at || "";
        return String(ta).localeCompare(String(tb)) || (a.id || 0) - (b.id || 0);
      });
    if (!lots.length) return null;
    var p = Number(lots[0].sell_price);
    return Number.isFinite(p) ? p : null;
  }

  function productItemSellPrice(item) {
    if (!item) return 0;
    if (item.type_price === "stock") {
      var fromStock = oldestStockSellPrice(item.id);
      if (fromStock != null) return fromStock;
    }
    return Number(item.price) || 0;
  }

  function localDateYmd(d) {
    var y = d.getFullYear();
    var m = String(d.getMonth() + 1).padStart(2, "0");
    var day = String(d.getDate()).padStart(2, "0");
    return y + "-" + m + "-" + day;
  }

  function discountDateActive(row, todayYmd) {
    if (!row) return false;
    if (row.is_active === false) return false;
    var start = row.date_start ? String(row.date_start).slice(0, 10) : null;
    var end = row.date_end ? String(row.date_end).slice(0, 10) : null;
    if (start && todayYmd < start) return false;
    if (end && todayYmd > end) return false;
    return true;
  }

  function pickMemberDiscount(itemId, ctx) {
    var memberId = ctx && ctx.memberId ? Number(ctx.memberId) : null;
    if (!memberId) return null;
    var creditId = ctx && ctx.memberCreditId ? Number(ctx.memberCreditId) : null;
    var todayYmd = localDateYmd(new Date());
    var candidates = activeRows("member_user_discount").filter(function (r) {
      return (
        r.member_user_id === memberId &&
        r.product_item_id === itemId &&
        discountDateActive(r, todayYmd)
      );
    });
    if (!candidates.length) return null;
    var exact = candidates.filter(function (r) {
      return creditId && r.member_credit_id === creditId;
    });
    var pool = exact.length ? exact : candidates.filter(function (r) { return r.member_credit_id == null; });
    if (!pool.length) pool = candidates;
    pool.sort(function (a, b) {
      var ac = creditId && a.member_credit_id === creditId ? 1 : 0;
      var bc = creditId && b.member_credit_id === creditId ? 1 : 0;
      return bc - ac || (b.id || 0) - (a.id || 0);
    });
    return pool[0];
  }

  /** ponytail: tier fallback uses member_tier defaults with type=all only; upgrade: member_tier_relation + attributes */
  function pickMemberTierDiscount(itemId, ctx) {
    var memberId = ctx && ctx.memberId ? Number(ctx.memberId) : null;
    if (!memberId) return null;
    if (pickMemberDiscount(itemId, ctx)) return null;
    var member = global.store.getById("member_user", memberId);
    if (!member || !member.member_tier_id) return null;
    var tier = global.store.getById("member_tier", member.member_tier_id);
    if (!tier || tier.deleted_at != null || tier.is_active === false) return null;
    if (tier.type !== "all") return null;
    var disc = Number(tier.discount);
    if (!Number.isFinite(disc) || disc <= 0) return null;
    return { discount: disc, discount_type: tier.discount_type || "percent" };
  }

  function resolveProductItemForOrder(itemId, ctx) {
    var item = global.store.getById("product_item", itemId);
    if (!item) {
      return {
        id: itemId,
        price: 0,
        wholesale_price: null,
        amount_wholesale_price: null,
        stock: 0,
        stock_order_delivery: 0,
      };
    }
    var wholesale = Number(item.price_wholesale);
    var minWholesale = Number(item.amount_price_wholesale);
    var row = {
      id: item.id,
      product_list_id: item.product_list_id,
      sku: item.sku,
      price: productItemSellPrice(item),
      wholesale_price: Number.isFinite(wholesale) && wholesale > 0 ? wholesale : null,
      amount_wholesale_price:
        Number.isFinite(minWholesale) && minWholesale > 0 ? Math.trunc(minWholesale) : null,
      stock: productItemStockSum(item.id),
      stock_order_delivery: 0,
      member_discount: 0,
      member_discount_type: null,
      member_discount_minimum_order: null,
      member_discount_tier: 0,
      member_discount_tier_type: null,
    };
    var md = pickMemberDiscount(itemId, ctx);
    if (md) {
      row.member_discount = Number(md.discount) || 0;
      row.member_discount_type = md.discount_type || null;
      var minQ = Number(md.minimum_qty);
      row.member_discount_minimum_order = Number.isFinite(minQ) && minQ > 0 ? minQ : null;
    } else {
      var tier = pickMemberTierDiscount(itemId, ctx);
      if (tier) {
        row.member_discount_tier = tier.discount;
        row.member_discount_tier_type = tier.discount_type;
      }
    }
    return row;
  }

  function selfCheckDiscount() {
    if (!global.orderCart) throw new Error("orderCart missing");
    var cart = global.orderCart;
    var ctx = { memberId: "1", memberCreditId: "1" };
    var row = resolveProductItemForOrder(1, ctx);
    if (cart.lineMemberDiscount(row, 1) !== 0) throw new Error("min qty discount");
    var d2 = cart.lineMemberDiscount(row, 2);
    if (d2 !== cart.roundMoney2((2 * row.price * 10) / 100)) throw new Error("percent discount qty 2");
    if (!cart.isWholesale(row, 3)) throw new Error("wholesale threshold");
    if (cart.unitPrice(row, 3) !== row.wholesale_price) throw new Error("wholesale unit price");
    if (cart.lineMemberDiscount(row, 3) !== 0) throw new Error("wholesale zeroes member discount");
    if (cart.lineWholesaleDiscount(row, 3) !== cart.roundMoney2(3 * (row.price - row.wholesale_price))) {
      throw new Error("wholesale line discount");
    }
    var walk = resolveProductItemForOrder(1, {});
    if (cart.lineMemberDiscount(walk, 2) !== 0) throw new Error("walk-in discount");
    return true;
  }

  function can(module, type, action) {
    return global.permissions && global.permissions.canAction(module, type, action);
  }

  var DEFAULT_DEVBAR_TOASTS = [
    { type: "success", label: "Saved", msgKey: "notification.success.save" },
    { type: "error", label: "Forbidden", msgKey: "error.forbidden" },
  ];

  function toolbarDateFilterHtml(role, labelKey, value) {
    var hasValue = !!(value && String(value).trim());
    return (
      '<div class="crud-toolbar__date-wrap' +
      (hasValue ? " has-value" : "") +
      '">' +
      '<span class="crud-toolbar__date-placeholder" data-i18n="' +
      escapeHtml(labelKey) +
      '"></span>' +
      '<input type="date" data-role="' +
      escapeHtml(role) +
      '" class="crud-toolbar__select crud-toolbar__date-input" value="' +
      escapeHtml(value || "") +
      '" aria-label="' +
      escapeHtml(t(labelKey)) +
      '" title="' +
      escapeHtml(t(labelKey)) +
      '" /></div>'
    );
  }

  function toolbarSelectOpenHtml(role, labelKey, selectedValue, optionHtml) {
    var ph = t("form.placeholder.select", { label: t(labelKey) });
    var hasSel = selectedValue != null && String(selectedValue) !== "";
    return (
      '<select data-role="' +
      escapeHtml(role) +
      '" class="crud-toolbar__select" aria-label="' +
      escapeHtml(t(labelKey)) +
      '">' +
      '<option value="" disabled' +
      (hasSel ? "" : " selected") +
      ">" +
      escapeHtml(ph) +
      "</option>" +
      (optionHtml || "") +
      "</select>"
    );
  }

  function bindToolbarDateInput(input, onChange) {
    if (!input) return;
    var wrap = input.closest(".crud-toolbar__date-wrap");
    function syncWrap() {
      if (wrap) wrap.classList.toggle("has-value", !!input.value);
    }
    syncWrap();
    input.addEventListener("change", function () {
      syncWrap();
      if (typeof onChange === "function") onChange(input.value);
    });
  }

  function paginateRows(rows, page, pageSize) {
    var total = rows.length;
    var totalPages = Math.max(1, Math.ceil(total / pageSize) || 1);
    var p = page;
    if (p > totalPages) p = totalPages;
    if (p < 1) p = 1;
    var start = (p - 1) * pageSize;
    return {
      rows: rows.slice(start, start + pageSize),
      total: total,
      totalPages: totalPages,
      start: start,
      page: p,
    };
  }

  /** Shared admin layout + sidebar for sales order pages. */
  function mountAdminShell(opts) {
    global.store.init();
    if (global.i18n) global.i18n.init();
    if (!global.auth.requireAuth("login.html")) return false;
    if (!global.permissions.guardPage(opts.module, opts.type, "login.html")) return false;
    global.layout.mount({
      pageTitle: t(opts.titleKey),
      contentHtml: '<div id="' + opts.rootId + '"></div>',
    });
    if (global.devBar) {
      global.devBar.mount({ toasts: opts.devBarToasts || DEFAULT_DEVBAR_TOASTS });
    }
    if (typeof opts.afterMount === "function") opts.afterMount();
    return true;
  }

  function mountAdminContent(titleKey, rootId) {
    global.layout.mount({
      pageTitle: t(titleKey),
      contentHtml: '<div id="' + rootId + '"></div>',
    });
    if (global.devBar) {
      global.devBar.mount({ toasts: DEFAULT_DEVBAR_TOASTS });
    }
  }

  global.orderLib = {
    t: t,
    now: now,
    escapeHtml: escapeHtml,
    activeRows: activeRows,
    actorId: actorId,
    parseOrderSku: parseOrderSku,
    formatOrderSku: formatOrderSku,
    familySku: familySku,
    familyBaseSku: familyBaseSku,
    formatFamilySplitSku: formatFamilySplitSku,
    nextFamilySplitSku: nextFamilySplitSku,
    familyRootId: familyRootId,
    familyMembers: familyMembers,
    childCount: childCount,
    orderItems: orderItems,
    orderShipping: orderShipping,
    paymentsForOrder: paymentsForOrder,
    paymentItems: paymentItems,
    orderTotals: orderTotals,
    paymentTotals: paymentTotals,
    aggregateFamilyTotals: aggregateFamilyTotals,
    statusBadgeHtml: statusBadgeHtml,
    v2SaleStatus: v2SaleStatus,
    designSaleStatus: designSaleStatus,
    formatMoney: formatMoney,
    formatDateTimeSplit: formatDateTimeSplit,
    inDateRange: inDateRange,
    adminUserName: adminUserName,
    memberDisplayName: memberDisplayName,
    vatPercent: vatPercent,
    nextOrderSku: nextOrderSku,
    verifyCreditPassword: verifyCreditPassword,
    verifyDiscountPassword: verifyDiscountPassword,
    getCreditApprovedBy: getCreditApprovedBy,
    setCreditApprovedBy: setCreditApprovedBy,
    getDiscountApprovedSession: getDiscountApprovedSession,
    setDiscountApprovedSession: setDiscountApprovedSession,
    productItemLabel: productItemLabel,
    productItemSearchHaystack: productItemSearchHaystack,
    resolveProductItemForOrder: resolveProductItemForOrder,
    selfCheckDiscount: selfCheckDiscount,
    can: can,
    toolbarDateFilterHtml: toolbarDateFilterHtml,
    toolbarSelectOpenHtml: toolbarSelectOpenHtml,
    bindToolbarDateInput: bindToolbarDateInput,
    paginateRows: paginateRows,
    mountAdminShell: mountAdminShell,
    mountAdminContent: mountAdminContent,
  };
})(window);

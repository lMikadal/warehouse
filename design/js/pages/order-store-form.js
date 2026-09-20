(function (global) {
  var lib = global.orderLib;
  var cart = global.orderCart;
  var mlib = global.memberSettingLib;
  var pbl = global.productBrowseLib;
  var PERM = { module: "order", type: "order_store" };
  var COMPARE_DETAIL_MAX = 100;
  var LIST_HREF = "pages/order-store.html";

  var state = {
    orderId: null,
    memberId: "",
    memberName: "",
    memberTel: "",
    memberEmail: "",
    memberCreditId: "",
    deliveryType: "store",
    receiveAt: "",
    productTab: "products",
    productQuery: "",
    productQueryApplied: "",
    productCategoryId: "",
    productFilterOpen: false,
    productBrandId: "",
    productModelId: "",
    productYear: "",
    productOem: "",
    productBrowsePage: 1,
    productBrowsePageSize: 10,
    productBrowseSortKey: null,
    productBrowseSortDir: null,
    productBrowseSelectedIds: {},
    productBrowseMeta: null,
    cartTab: "arrange",
    viewCartTab: "arrange",
    existingCollapsed: false,
    addonCollapsed: false,
    products: [],
    compares: [],
    selectedFamilyId: null,
    loadedStatus: null,
    familyDetails: [],
    familyRootId: null,
    familyRootWaiting: false,
    addonCreate: false,
    readOnly: false,
    deliveryDraft: { type: "store", date: "", time: "00:00" },
    compareAddDraft: { detail: "", qty: "1" },
    compareEditId: null,
    compareEditDetail: "",
    cancelSource: "bill",
    pendingResetId: null,
  };

  var modalRoot = null;

  function t(k, params) {
    if (params && global.i18n && global.i18n.format) return global.i18n.format(k, params);
    return lib.t(k);
  }

  function fieldPh(kind, labelKey) {
    return global.i18n ? global.i18n.fieldPlaceholder(kind, labelKey) : "";
  }

  function formFieldInput(id, labelKey, attrs) {
    var ph = lib.escapeHtml(fieldPh("input", labelKey));
    return (
      '<div class="form-field">' +
      '<label for="' +
      id +
      '"><span data-i18n="' +
      lib.escapeHtml(labelKey) +
      '"></span></label>' +
      '<input id="' +
      id +
      '" data-i18n-placeholder-input="' +
      lib.escapeHtml(labelKey) +
      '" placeholder="' +
      ph +
      '" ' +
      (attrs || "") +
      "/>" +
      '<div class="form-field__error-slot" aria-live="polite"><p class="form-field__error" hidden role="alert"></p></div></div>'
    );
  }

  function can(action) {
    return lib.can(PERM.module, PERM.type, action);
  }

  function parseId() {
    var m = /[?&]id=(\d+)/.exec(global.location.search);
    return m ? Number(m[1]) : null;
  }

  function compareUid() {
    return "cmp-" + Date.now() + "-" + Math.floor(Math.random() * 1e6);
  }

  function cartHasLines(products, compares) {
    return (products && products.length > 0) || (compares && compares.length > 0);
  }

  function isEditableStatus(status) {
    return status === "draft" || status === "pending";
  }

  function isViewMode() {
    if (state.addonCreate) return false;
    if (!state.orderId) return false;
    var st = state.loadedStatus;
    if (st === "draft" || st === "pending") return !can("update");
    return true;
  }

  function showResetFlag() {
    return (
      !state.addonCreate &&
      can("update") &&
      (state.loadedStatus === "cancelled" || state.loadedStatus === "rejected")
    );
  }

  function showAddBillFlag() {
    if (!can("create") || state.addonCreate || !state.familyRootWaiting) return false;
    return !state.familyDetails.some(function (d) {
      return d.status === "draft";
    });
  }

  function defaultReceiveAtLocal() {
    var d = new Date(Date.now() + 30 * 60 * 1000);
    return d.toISOString().slice(0, 16);
  }

  function parseQty(raw, fallback, max) {
    var n = Number.parseInt(raw, 10);
    if (!Number.isFinite(n) || n < 1) return fallback;
    var qty = Math.trunc(n);
    if (max != null && Number.isFinite(max) && max >= 1) return Math.min(qty, Math.trunc(max));
    return qty;
  }

  function touchCartSchedule() {
    if (!cartHasLines(state.products, state.compares)) {
      if (!state.orderId && !state.addonCreate) {
        state.receiveAt = "";
        state.deliveryType = "store";
      }
      return;
    }
    if (!state.receiveAt) state.receiveAt = defaultReceiveAtLocal();
  }

  function formatOrderDate(iso) {
    if (!iso) return "—";
    try {
      var loc = global.i18n && global.i18n.getLocale ? global.i18n.getLocale() : "th";
      return new Intl.DateTimeFormat(loc === "th" ? "th-TH" : "en-US", {
        day: "numeric",
        month: "short",
        year: "numeric",
      }).format(new Date(iso));
    } catch (e) {
      return String(iso).slice(0, 10);
    }
  }

  function formatReceiveDateTime(localValue) {
    if (!localValue) return "";
    try {
      var loc = global.i18n && global.i18n.getLocale ? global.i18n.getLocale() : "th";
      return new Intl.DateTimeFormat(loc === "th" ? "th-TH" : "en-US", {
        day: "numeric",
        month: "short",
        year: "numeric",
        hour: "2-digit",
        minute: "2-digit",
      }).format(new Date(localValue));
    } catch (e) {
      return localValue;
    }
  }

  function receiveTypeLabel(type) {
    if (type === "parking") return t("orderForm.receiveTypeParking");
    if (type === "delivery") return t("orderForm.receiveTypeDelivery");
    return t("orderForm.receiveTypeStore");
  }

  function memberBusinessId(memberId) {
    var uid = Number(memberId);
    var biz = null;
    lib.activeRows("member_user_setting").forEach(function (s) {
      if (s.member_user_id !== uid) return;
      var rel = global.store.getById("member_setting_relation", s.member_setting_credit_id);
      if (rel && rel.business_id != null) biz = rel.business_id;
    });
    return biz;
  }

  /** Active `member_setting_credit` labels for step 1 radios (business relations, or all credits when no member). */
  function memberCreditOptions(memberId) {
    if (!mlib) return [];
    var seen = {};
    var out = [];
    function addCredit(creditId) {
      var cid = Number(creditId);
      if (!cid || seen[cid]) return;
      seen[cid] = true;
      out.push({ id: String(cid), label: mlib.creditName(cid) || "#" + cid });
    }
    if (memberId) {
      var bizId = memberBusinessId(memberId);
      if (bizId != null) {
        mlib.relationsForBusiness(bizId).forEach(function (r) {
          if (r.is_active !== false) addCredit(r.credit_id);
        });
      }
      if (!out.length) {
        lib.activeRows("member_user_setting").forEach(function (s) {
          if (s.member_user_id !== Number(memberId)) return;
          var rel = global.store.getById("member_setting_relation", s.member_setting_credit_id);
          if (rel && rel.is_active !== false) addCredit(rel.credit_id);
        });
      }
    } else {
      mlib.creditOptions().forEach(function (o) {
        addCredit(o.value);
      });
    }
    return out;
  }

  function syncMemberCreditSelection(credits) {
    if (!credits.length) {
      state.memberCreditId = "";
      return;
    }
    if (!state.memberCreditId || !credits.some(function (c) { return c.id === state.memberCreditId; })) {
      state.memberCreditId = credits[0].id;
    }
  }

  function attrLabel(attrId) {
    if (!attrId) return "";
    var loc = global.i18n ? global.i18n.getLocale() : "th";
    var rows = global.store.getAll("product_attribute_language");
    var row = rows.find(function (l) {
      return l.product_attribute_id === attrId && l.locale === loc;
    });
    if (row && row.name) return row.name;
    if (loc !== "th") {
      var th = rows.find(function (l) {
        return l.product_attribute_id === attrId && l.locale === "th";
      });
      if (th && th.name) return th.name;
    }
    var en = rows.find(function (l) {
      return l.product_attribute_id === attrId && l.locale === "en";
    });
    return en && en.name ? en.name : "#" + attrId;
  }

  function productBrandOptions() {
    return lib
      .activeRows("product_attribute")
      .filter(function (a) {
        return a.type === "brand" && a.is_active;
      })
      .sort(function (a, b) {
        return (a.sort_order || 0) - (b.sort_order || 0) || a.id - b.id;
      })
      .map(function (a) {
        return { id: String(a.id), label: attrLabel(a.id) };
      });
  }

  function productCarModelOptions() {
    return lib
      .activeRows("product_attribute")
      .filter(function (a) {
        return a.type === "car" && a.type_car === "model" && a.is_active;
      })
      .sort(function (a, b) {
        return attrLabel(a.id).localeCompare(attrLabel(b.id)) || a.id - b.id;
      })
      .map(function (a) {
        return { id: String(a.id), label: attrLabel(a.id) };
      });
  }

  function productYearOptions() {
    var years = {};
    lib.activeRows("product_list_car").forEach(function (c) {
      var ys = Number(c.year_start);
      var ye = Number(c.year_end);
      if (!ys && !ye) return;
      if (!ye || ye < ys) ye = ys;
      for (var y = ys; y <= ye && y <= ys + 30; y += 1) years[y] = true;
    });
    return Object.keys(years)
      .map(Number)
      .sort(function (a, b) {
        return b - a;
      })
      .map(function (y) {
        return { id: String(y), label: String(y) };
      });
  }

  function productListForItem(item) {
    if (!item || !item.product_list_id) return null;
    return global.store.getById("product_list", item.product_list_id);
  }

  function productListCars(plId) {
    if (!plId) return [];
    return lib.activeRows("product_list_car").filter(function (c) {
      return c.product_list_id === plId;
    });
  }

  function itemMatchesExtraFilters(item) {
    var pl = productListForItem(item);
    if (!pl) return false;
    if (state.productBrandId && String(pl.product_brand_id || "") !== state.productBrandId) return false;
    var cars = productListCars(pl.id);
    if (state.productModelId) {
      if (
        !cars.some(function (c) {
          return String(c.product_attribute_model_id || "") === state.productModelId;
        })
      ) {
        return false;
      }
    }
    if (state.productYear) {
      var want = Number(state.productYear);
      if (
        !cars.some(function (c) {
          var ys = Number(c.year_start);
          var ye = Number(c.year_end) || ys;
          return ys && want >= ys && want <= ye;
        })
      ) {
        return false;
      }
    }
    if (state.productOem.trim()) {
      var oem = state.productOem.trim().toLowerCase();
      var supplier = String(pl.supplier_sku || "").toLowerCase();
      if (supplier.indexOf(oem) >= 0) return true;
      var codes = global.store.getAll("product_list_code");
      var codeHit = codes.some(function (c) {
        return (
          c.deleted_at == null &&
          c.product_list_id === pl.id &&
          String(c.sku || "")
            .toLowerCase()
            .indexOf(oem) >= 0
        );
      });
      if (!codeHit) return false;
    }
    return true;
  }

  function categoryOptions() {
    var loc = global.i18n ? global.i18n.getLocale() : "th";
    return lib
      .activeRows("product_attribute")
      .filter(function (a) {
        return a.type === "category" && a.parent_id == null;
      })
      .sort(function (a, b) {
        return (a.sort_order || 0) - (b.sort_order || 0);
      })
      .map(function (a) {
        var lang = global.store.getAll("product_attribute_language").find(function (l) {
          return l.product_attribute_id === a.id && l.locale === loc;
        });
        return {
          id: String(a.id),
          label: (lang && lang.name) || a.sku || "#" + a.id,
        };
      });
  }

  function itemCategoryId(item) {
    if (!item || !item.product_list_id) return null;
    var pl = global.store.getById("product_list", item.product_list_id);
    return pl && pl.product_category_id != null ? String(pl.product_category_id) : null;
  }

  function orderCtx() {
    return {
      memberId: state.memberId,
      memberCreditId: state.memberCreditId,
    };
  }

  function isSellableProductItem(item) {
    if (!item || item.is_active === false || item.is_stopped) return false;
    return true;
  }

  function filteredProducts() {
    if (!pbl || !state.productQueryApplied.trim()) return [];
    var loc = global.i18n ? global.i18n.getLocale() : "th";
    var rows = pbl.listRowsFromStore(loc);
    rows = pbl.filterBrowseRows(rows, {
      query: state.productQueryApplied,
      categoryId: state.productCategoryId || "",
    });
    return rows.filter(function (row) {
      var item = global.store.getById("product_item", row.id);
      if (!isSellableProductItem(item)) return false;
      if (!itemMatchesExtraFilters(item)) return false;
      return true;
    });
  }

  function familyMembersFromStore(orderId) {
    var current = global.store.getById("order_list", orderId);
    if (!current) return [];
    var parent = current.parent_id ? global.store.getById("order_list", current.parent_id) : null;
    var rootId = parent ? parent.id : current.id;
    var byId = {};
    if (parent) byId[parent.id] = parent;
    byId[current.id] = current;
    lib.activeRows("order_list").forEach(function (o) {
      if (o.parent_id === rootId) byId[o.id] = o;
    });
    return Object.keys(byId)
      .map(Number)
      .map(function (id) {
        return byId[id];
      })
      .sort(function (a, b) {
        var as = (a.sku || "").trim();
        var bs = (b.sku || "").trim();
        return as.localeCompare(bs) || a.id - b.id;
      });
  }

  function mapCompareRow(item) {
    return {
      id: compareUid(),
      detail: String(item.detail || ""),
      amount: Number(item.amount) || 1,
    };
  }

  function orderLines(orderId) {
    return {
      products: lib.orderItems(orderId).filter(function (i) {
        return i.type === "item";
      }),
      compares: lib
        .orderItems(orderId)
        .filter(function (i) {
          return i.type === "compare";
        })
        .map(mapCompareRow),
    };
  }

  function applyOrderToState(orderId) {
    var o = global.store.getById("order_list", orderId);
    if (!o) return;
    state.orderId = orderId;
    state.selectedFamilyId = orderId;
    state.loadedStatus = o.status;
    state.memberName = o.member_name || "";
    state.memberTel = o.member_tel || "";
    state.memberEmail = o.member_email || "";
    state.memberId = o.member_user_id ? String(o.member_user_id) : "";
    var lines = orderLines(orderId);
    state.products = lines.products;
    state.compares = lines.compares;
    var ship = lib.orderShipping(orderId);
    if (ship) {
      state.deliveryType = ship.type || "store";
      state.receiveAt = ship.received_at ? String(ship.received_at).slice(0, 16) : "";
    } else {
      state.deliveryType = "store";
      state.receiveAt = "";
    }
    syncMemberCreditSelection(memberCreditOptions(state.memberId));
  }

  function loadOrder(id) {
    var o = global.store.getById("order_list", id);
    if (!o) return;
    state.familyDetails = familyMembersFromStore(id);
    var parent = o.parent_id ? global.store.getById("order_list", o.parent_id) : null;
    var root = parent || o;
    state.familyRootId = root.id;
    state.familyRootWaiting = root.status === "pending" && !root.parent_id;
    state.addonCreate = false;
    state.existingCollapsed = false;
    state.addonCollapsed = false;
    applyOrderToState(id);
    state.cartTab = "arrange";
    state.readOnly = isViewMode();
  }

  function resetCustomer() {
    state.memberId = "";
    state.memberName = "";
    state.memberTel = "";
    state.memberEmail = "";
    state.memberCreditId = "";
    state.products = [];
    state.compares = [];
    touchCartSchedule();
  }

  function summaryLinesFrom(products) {
    return products.map(function (p) {
      var row = productRow(p.product_item_id);
      var qty = Number(p.amount) || 0;
      return {
        qty: qty,
        discount: cart.lineTotalDiscount(row, qty),
        price: row.price,
        wholesale_price: row.wholesale_price,
        amount_wholesale_price: row.amount_wholesale_price,
      };
    });
  }

  function browsePriceQty(itemId) {
    var line = state.products.find(function (p) {
      return p.product_item_id === itemId;
    });
    return line ? Number(line.amount) || 1 : 1;
  }

  function productRow(itemId) {
    return lib.resolveProductItemForOrder(itemId, orderCtx());
  }

  function persistOrder(status) {
    var actor = lib.actorId();
    var ts = lib.now();
    var body = {
      status: status,
      member_user_id: state.memberId ? Number(state.memberId) : null,
      member_name: state.memberName,
      member_tel: state.memberTel,
      member_email: state.memberEmail,
      ordered_at: status === "pending" ? ts : null,
      updated_at: ts,
      updated_by: actor,
    };
    var creating = state.addonCreate || !state.orderId;
    var existingOrder = !creating && state.orderId ? global.store.getById("order_list", state.orderId) : null;
    if (status === "pending" && (creating || (existingOrder && !existingOrder.sku))) {
      body.sku = existingOrder && existingOrder.parent_id
        ? lib.nextFamilySplitSku(existingOrder.parent_id)
        : state.addonCreate && state.familyRootId
          ? lib.nextFamilySplitSku(state.familyRootId)
          : lib.nextOrderSku();
      body.fulfill_status = "pending";
    }
    var oid;
    if (creating) {
      body.created_at = ts;
      body.created_by = actor;
      body.fulfill_status = body.fulfill_status || "pending";
      body.parent_id = state.addonCreate ? state.familyRootId : null;
      if (status === "pending" && !body.sku && !state.addonCreate) body.sku = lib.nextOrderSku();
      var created = global.store.create("order_list", body);
      oid = created.id;
      state.orderId = oid;
    } else {
      global.store.update("order_list", state.orderId, body);
      oid = state.orderId;
    }
    lib.orderItems(oid).forEach(function (i) {
      global.store.remove("order_list_item", i.id);
    });
    state.products.forEach(function (p) {
      var row = productRow(p.product_item_id);
      var qty = Number(p.amount) || 1;
      var disc = cart.lineTotalDiscount(row, qty);
      var unit = cart.isWholesale(row, qty) ? Number(row.price) || 0 : cart.unitPrice(row, qty);
      global.store.create("order_list_item", {
        order_list_id: oid,
        product_item_id: p.product_item_id,
        type: "item",
        amount: qty,
        amount_picked: 0,
        amount_checked: 0,
        status: "pending",
        price_per_unit: unit,
        discount: disc,
        total_price: cart.lineTotal(qty, unit, disc),
        detail: null,
        created_at: ts,
        updated_at: ts,
        created_by: actor,
        updated_by: actor,
      });
    });
    state.compares.forEach(function (c) {
      global.store.create("order_list_item", {
        order_list_id: oid,
        product_item_id: null,
        type: "compare",
        amount: Number(c.amount) || 1,
        amount_picked: 0,
        amount_checked: 0,
        status: "pending",
        price_per_unit: 0,
        discount: 0,
        total_price: 0,
        detail: c.detail || "",
        created_at: ts,
        updated_at: ts,
        created_by: actor,
        updated_by: actor,
      });
    });
    var ship = lib.orderShipping(oid);
    var shipBody = {
      order_list_id: oid,
      type: state.deliveryType,
      received_at: state.receiveAt ? new Date(state.receiveAt).toISOString() : null,
      updated_at: ts,
    };
    if (ship) {
      var sidx = global.store.getAll("order_list_shipping").findIndex(function (s) {
        return Number(s.order_list_id) === Number(oid);
      });
      if (sidx >= 0) global.store.updateAt("order_list_shipping", sidx, shipBody);
    } else {
      global.store.create(
        "order_list_shipping",
        Object.assign({ order_list_id: oid, created_at: ts }, shipBody)
      );
    }
  }

  function patchOrderStatus(id, status) {
    if (!id) return;
    global.store.update("order_list", id, {
      status: status,
      updated_at: lib.now(),
      updated_by: lib.actorId(),
    });
  }

  function stepHead(num, titleKey) {
    return (
      '<div class="order-store-form__step-head">' +
      '<span class="order-store-form__step-num">' +
      num +
      '</span><h2 class="order-store-form__step-title" data-i18n="' +
      lib.escapeHtml(titleKey) +
      '"></h2></div>'
    );
  }

  function creditRadiosHtml(credits, ro) {
    if (!credits.length) return "";
    return (
      '<fieldset class="order-store-form__credit-radios"' +
      (ro ? " disabled" : "") +
      '><legend class="visually-hidden" data-i18n="orderForm.memberCredit"></legend>' +
      credits
        .map(function (c) {
          return (
            '<label><input type="radio" name="os-credit" value="' +
            lib.escapeHtml(c.id) +
            '"' +
            (state.memberCreditId === c.id ? " checked" : "") +
            (ro ? " disabled" : "") +
            " /> " +
            lib.escapeHtml(c.label) +
            "</label>"
          );
        })
        .join("") +
      "</fieldset>"
    );
  }

  function renderStep1(members, ro) {
    var memberPh = lib.escapeHtml(fieldPh("select", "orderForm.memberCustomerCode"));
    var credits = memberCreditOptions(state.memberId);
    syncMemberCreditSelection(credits);
    return (
      '<section class="order-store-form__step">' +
      stepHead("1", "orderForm.stepCustomer") +
      '<div class="order-store-form__member-row">' +
      '<div class="order-store-form__member-code form-field">' +
      '<label for="os-member"><span data-i18n="orderForm.memberCustomerCode"></span></label>' +
      '<div class="order-store-form__member-inline">' +
      '<div class="order-store-form__picker">' +
      '<img src="../assets/icons/user-round.svg" alt="" width="18" height="18" />' +
      '<select id="os-member" data-role="member"' +
      ro +
      '><option value="" disabled>' +
      memberPh +
      '</option><option value="__walkin"' +
      (!state.memberId ? " selected" : "") +
      ' data-i18n="orderForm.walkIn"></option>' +
      members +
      "</select></div>" +
      creditRadiosHtml(credits, ro) +
      (state.readOnly
        ? ""
        : '<button type="button" class="btn btn--icon order-store-form__reset-btn" data-reset-customer aria-label="' +
          lib.escapeHtml(t("orderForm.resetCustomer")) +
          '"><img src="../assets/icons/rotate-ccw.svg" alt="" width="18" height="18"/></button>') +
      "</div>" +
      '<div class="form-field__error-slot" aria-live="polite"><p class="form-field__error" hidden role="alert"></p></div></div></div>' +
      '<div class="order-store-form__fields-row">' +
      formFieldInput(
        "os-name",
        "orderForm.memberName",
        'data-role="name" value="' + lib.escapeHtml(state.memberName) + '"' + ro
      ) +
      formFieldInput(
        "os-tel",
        "orderForm.memberTel",
        'type="tel" inputmode="tel" autocomplete="tel" data-role="tel" value="' +
          lib.escapeHtml(state.memberTel) +
          '"' +
          ro
      ) +
      formFieldInput(
        "os-email",
        "orderForm.memberEmail",
        'type="email" inputmode="email" autocomplete="email" data-role="email" value="' +
          lib.escapeHtml(state.memberEmail) +
          '"' +
          ro
      ) +
      "</div></section>"
    );
  }

  function resetProductBrowsePage() {
    state.productBrowsePage = 1;
  }

  function enrichedBrowseRows() {
    if (!pbl) return [];
    return filteredProducts();
  }

  function productBrowseSortIcon(colId) {
    if (state.productBrowseSortKey !== colId) return "arrow-up-down";
    return state.productBrowseSortDir === "desc" ? "arrow-down" : "arrow-up";
  }

  function cycleProductBrowseSort(colId) {
    if (state.productBrowseSortKey !== colId) {
      state.productBrowseSortKey = colId;
      state.productBrowseSortDir = "asc";
    } else if (state.productBrowseSortDir === "asc") {
      state.productBrowseSortDir = "desc";
    } else {
      state.productBrowseSortKey = null;
      state.productBrowseSortDir = null;
    }
    resetProductBrowsePage();
  }

  function productBrowsePipeline() {
    if (global.crudList && global.crudList.readStoredPageSize) {
      state.productBrowsePageSize = global.crudList.readStoredPageSize();
    }
    var sorted = pbl
      ? pbl.sortBrowseRows(enrichedBrowseRows(), state.productBrowseSortKey, state.productBrowseSortDir)
      : [];
    var sliced = lib.paginateRows(sorted, state.productBrowsePage, state.productBrowsePageSize);
    state.productBrowsePage = sliced.page;
    state.productBrowseMeta = {
      total: sliced.total,
      totalPages: sliced.totalPages,
      start: sliced.start,
      page: sliced.page,
    };
    return sliced.rows;
  }

  function tieredUnitPriceHtml(row, qty) {
    var q = Number.isFinite(qty) ? qty : 1;
    var list = Number(row.price) || 0;
    var wh = Number(row.wholesale_price);
    var hasWh = Number.isFinite(wh) && wh > 0 && wh < list;
    if (hasWh && cart.isWholesale(row, q)) {
      return (
        '<div class="order-store-form__cart-unit">' +
        '<div class="tabular-nums order-store-form__cart-unit-selling">' +
        lib.formatMoney(list) +
        "</div>" +
        '<div class="tabular-nums order-store-form__price-promo">' +
        lib.formatMoney(wh) +
        "</div></div>"
      );
    }
    var html =
      '<span class="tabular-nums order-store-form__price-base">' + lib.formatMoney(list) + "</span>";
    if (hasWh) {
      html +=
        '<div class="order-store-form__price-promo tabular-nums">' +
        lib.formatMoney(wh) +
        "</div>";
      if (row.amount_wholesale_price != null) {
        html +=
          '<div class="order-store-form__price-promo-note">' +
          lib.escapeHtml(
            t("orderForm.wholesaleMinQty", { count: Math.trunc(row.amount_wholesale_price) })
          ) +
          "</div>";
      }
    }
    return html;
  }

  function renderProductPriceCell(resolved, qty) {
    return tieredUnitPriceHtml(resolved, qty);
  }

  function renderCartUnitPriceCell(row, qty) {
    return tieredUnitPriceHtml(row, qty);
  }

  function browseSelectedCount() {
    return Object.keys(state.productBrowseSelectedIds).filter(function (k) {
      return state.productBrowseSelectedIds[k];
    }).length;
  }

  function addProductLine(itemId) {
    var id = Number(itemId);
    if (!id) return false;
    var row = productRow(id);
    var max = cart.availableStock(row);
    if (max < 1) return false;
    var existing = state.products.find(function (p) {
      return p.product_item_id === id;
    });
    if (existing) {
      existing.amount = parseQty(String(Number(existing.amount) + 1), 1, max);
    } else {
      state.products.push({ product_item_id: id, amount: 1 });
    }
    return true;
  }

  function browseColumns(compareMode) {
    var cols = [];
    if (!compareMode) {
      cols.push({
        id: "_checkbox",
        sort: false,
        class: "order-store-form__col-check data-table__col-center",
      });
    }
    cols.push(
      { id: "_productName", sort: true, labelKey: "productList.colProduct", class: "product-list__col-product" },
      { id: "_totalStock", sort: true, labelKey: "productList.colStock", class: "data-table__col-numeric" },
      {
        id: "price",
        sort: true,
        labelKey: "productList.colNetPrice",
        class: "data-table__col-numeric order-store-form__price-cell",
      },
      {
        id: "qty_per_unit",
        sort: false,
        labelKey: "productList.colPackaging",
        class: "product-list__col-pack data-table__col-center",
      },
      { id: "_brandName", sort: true, labelKey: "col.brand", class: "product-list__col-brand" },
      {
        id: "_warehouseCount",
        sort: false,
        labelKey: "productList.colWarehouse",
        class: "product-list__col-wh data-table__col-center",
      },
      {
        id: "actions",
        sort: false,
        labelKey: "productList.colManageProduct",
        class: "data-table__actions-col product-list__col-actions",
        cellClass: "product-list__col-actions data-table__col-center",
      }
    );
    return cols;
  }

  function browseCellHtml(col, row, compareMode, ro) {
    if (col.id === "_checkbox") {
      var checked = !!state.productBrowseSelectedIds[String(row.id)];
      return (
        '<input type="checkbox" class="order-store-form__row-check" data-browse-row="' +
        row.id +
        '"' +
        (checked ? " checked" : "") +
        (ro ? " disabled" : "") +
        ' aria-label="' +
        lib.escapeHtml(row._productName) +
        '" />'
      );
    }
    if (col.id === "_productName") return pbl.productCellHtml(row);
    if (col.id === "_totalStock") return lib.escapeHtml(String(row._totalStock));
    if (col.id === "price") {
      var resolved = lib.resolveProductItemForOrder(row.id, orderCtx());
      return renderProductPriceCell(resolved, browsePriceQty(row.id));
    }
    if (col.id === "qty_per_unit") return pbl.packagingCellHtml(row);
    if (col.id === "_brandName") return lib.escapeHtml(row._brandName);
    if (col.id === "_warehouseCount") return pbl.warehouseCellHtml(row);
    if (col.id === "actions") {
      if (ro) return "";
      if (compareMode) {
        return (
          '<div class="data-table__actions">' +
          '<button type="button" class="btn btn--icon crud-add" data-open-compare-add data-compare-product="' +
          row.id +
          '" aria-label="' +
          lib.escapeHtml(t("orderForm.comparePrice")) +
          '"><img src="../assets/icons/plus.svg" alt="" width="18" height="18"/></button></div>'
        );
      }
      return (
        '<div class="data-table__actions">' +
        '<button type="button" class="btn btn--icon crud-add" data-add-product="' +
        row.id +
        '" aria-label="' +
        lib.escapeHtml(t("crud.create")) +
        '"><img src="../assets/icons/plus.svg" alt="" width="18" height="18"/></button></div>'
      );
    }
    return "";
  }

  function renderProductBrowseTable(pageRows, compareMode, ro) {
    var cols = browseColumns(compareMode);
    var head = cols
      .map(function (col) {
        if (col.id === "_checkbox") {
          var allOnPage =
            pageRows.length &&
            pageRows.every(function (r) {
              return state.productBrowseSelectedIds[String(r.id)];
            });
          return (
            '<th scope="col" class="' +
            col.class +
            '"><input type="checkbox" data-browse-select-page' +
            (allOnPage ? " checked" : "") +
            (ro ? " disabled" : "") +
            ' aria-label="' +
            lib.escapeHtml(t("rolePerm.selectAll")) +
            '" /></th>'
          );
        }
        if (!col.sort) {
          return (
            '<th scope="col" class="' +
            col.class +
            '"><span data-i18n="' +
            lib.escapeHtml(col.labelKey) +
            '"></span></th>'
          );
        }
        return (
          '<th scope="col" class="' +
          col.class +
          ' data-table__sort-col"><button type="button" class="data-table__sort-btn" data-browse-sort="' +
          lib.escapeHtml(col.id) +
          '"><span data-i18n="' +
          lib.escapeHtml(col.labelKey) +
          '"></span><img src="../assets/icons/' +
          productBrowseSortIcon(col.id) +
          '.svg" alt="" width="14" height="14" class="data-table__sort-icon" aria-hidden="true" /></button></th>'
        );
      })
      .join("");
    var body = pageRows
      .map(function (row) {
        var cells = cols
          .map(function (col) {
            return (
              '<td class="' +
              pbl.tableTdClass(col, row) +
              '">' +
              browseCellHtml(col, row, compareMode, ro) +
              "</td>"
            );
          })
          .join("");
        return '<tr data-item-id="' + row.id + '">' + cells + "</tr>";
      })
      .join("");
    if (!pageRows.length) {
      body =
        '<tr><td class="crud-empty" colspan="' +
        cols.length +
        '" data-i18n="crud.empty"></td></tr>';
    }
    var toolbar = "";
    if (!compareMode && !ro) {
      var sel = browseSelectedCount();
      toolbar =
        '<div class="order-store-form__browse-toolbar">' +
        '<button type="button" class="btn btn--primary btn--sm" data-browse-select-all data-i18n="rolePerm.selectAll"></button>' +
        '<button type="button" class="btn btn--primary btn--sm"' +
        (sel ? "" : " disabled") +
        ' data-browse-add-selected data-i18n="orderForm.addSelectedProducts"></button>' +
        "</div>";
    }
    return (
      toolbar +
      '<div class="order-store-form__product-table-wrap crud-table-wrap__body">' +
      '<table class="data-table product-list__table order-store-form__product-table">' +
      "<thead><tr>" +
      head +
      "</tr></thead><tbody>" +
      body +
      "</tbody></table></div>" +
      '<nav class="crud-pagination" id="os-product-browse-pager" aria-label="Pagination"></nav>'
    );
  }

  function mountProductBrowsePager(root) {
    var pager = root.querySelector("#os-product-browse-pager");
    if (!pager || !state.productBrowseMeta || !global.crudList) return;
    global.crudList.renderPaginationBar(
      pager,
      { page: state.productBrowsePage, pageSize: state.productBrowsePageSize },
      state.productBrowseMeta,
      function (patch) {
        if (patch.pageSize != null) state.productBrowsePageSize = patch.pageSize;
        if (patch.page != null) state.productBrowsePage = patch.page;
        render();
      }
    );
  }

  function renderProductResults(ro) {
    var compareMode = state.productTab === "compare";
    if (!state.productQueryApplied.trim()) {
      if (compareMode) {
        return (
          '<div class="order-store-form__empty">' +
          '<img src="../assets/icons/clipboard-list.svg" alt="" width="48" height="48" />' +
          '<p data-i18n="orderForm.compareAddHint"></p>' +
          (ro
            ? ""
            : '<button type="button" class="btn btn--primary" data-open-compare-add data-i18n="orderForm.comparePrice"></button>') +
          "</div>"
        );
      }
      return (
        '<div class="order-store-form__empty">' +
        '<img src="../assets/icons/package.svg" alt="" width="48" height="48" />' +
        '<p data-i18n="orderForm.productSearchHint"></p></div>'
      );
    }
    if (!pbl) {
      return '<p class="crud-muted" data-i18n="crud.empty"></p>';
    }
    var pageRows = productBrowsePipeline();
    if (!state.productBrowseMeta || !state.productBrowseMeta.total) {
      return '<p class="crud-muted" data-i18n="crud.empty"></p>';
    }
    return renderProductBrowseTable(pageRows, compareMode, ro);
  }

  function compareModalSectionHead(iconFile, titleKey) {
    return (
      '<div class="order-store-form__compare-modal-section-head">' +
      '<span class="order-store-form__compare-modal-icon" aria-hidden="true">' +
      '<img src="../assets/icons/' +
      iconFile +
      '" alt="" width="16" height="16" /></span>' +
      '<h3 class="order-store-form__compare-modal-section-title" data-i18n="' +
      lib.escapeHtml(titleKey) +
      '"></h3></div>'
    );
  }

  function compareAddModalHtml() {
    var detailPh = lib.escapeHtml(t("orderForm.compareDetailPlaceholder"));
    var qtyPh = lib.escapeHtml(fieldPh("input", "orderForm.compareQtyAmount"));
    return (
      '<div class="modal-overlay" data-os-modal="compare-add" hidden>' +
      '<div class="modal crud-modal order-store-form__compare-modal" role="dialog" aria-labelledby="os-compare-add-title">' +
      '<div class="modal__header"><h2 class="modal__title" id="os-compare-add-title" data-i18n="orderForm.compareModalTitle"></h2>' +
      '<button type="button" class="modal__close" data-os-close aria-label="' +
      lib.escapeHtml(t("crud.cancel")) +
      '"><img src="../assets/icons/x.svg" alt="" width="18" height="18"/></button></div>' +
      '<div class="modal__content">' +
      '<section class="order-store-form__compare-modal-section">' +
      compareModalSectionHead("pencil.svg", "orderForm.compareModalTitle") +
      '<div class="form-field">' +
      '<textarea id="os-compare-detail" class="order-store-form__compare-textarea" rows="4" data-compare-detail maxlength="' +
      COMPARE_DETAIL_MAX +
      '" data-i18n-placeholder="orderForm.compareDetailPlaceholder" placeholder="' +
      detailPh +
      '"></textarea>' +
      '<div class="form-field__error-slot" aria-live="polite"><p class="form-field__error" data-compare-detail-error hidden role="alert"></p></div>' +
      '<p class="order-store-form__compare-char-count" data-compare-char-count></p></div></section>' +
      '<section class="order-store-form__compare-modal-section">' +
      compareModalSectionHead("package.svg", "orderForm.compareQtySection") +
      '<div class="form-field">' +
      '<input type="number" id="os-compare-qty" min="1" step="1" data-compare-qty data-i18n-placeholder-input="orderForm.compareQtyAmount" placeholder="' +
      qtyPh +
      '" value="1" /></div></section></div>' +
      '<div class="modal__footer order-store-form__compare-modal-footer">' +
      '<button type="button" class="btn" data-os-close data-i18n="orderForm.cancel"></button>' +
      '<button type="button" class="btn btn--primary" data-compare-add-confirm data-i18n="crud.save"></button>' +
      "</div></div></div>"
    );
  }

  function compareEditModalHtml() {
    var detailPh = lib.escapeHtml(t("orderForm.compareDetailPlaceholder"));
    return (
      '<div class="modal-overlay" data-os-modal="compare-edit" hidden>' +
      '<div class="modal crud-modal order-store-form__compare-modal" role="dialog">' +
      '<div class="modal__header"><h2 class="modal__title" data-i18n="orderForm.compareModalTitle"></h2>' +
      '<button type="button" class="modal__close" data-os-close><img src="../assets/icons/x.svg" alt="" width="18" height="18"/></button></div>' +
      '<div class="modal__content">' +
      '<section class="order-store-form__compare-modal-section">' +
      compareModalSectionHead("pencil.svg", "orderForm.compareModalTitle") +
      '<div class="form-field">' +
      '<textarea class="order-store-form__compare-textarea" rows="4" data-compare-edit-detail maxlength="' +
      COMPARE_DETAIL_MAX +
      '" data-i18n-placeholder="orderForm.compareDetailPlaceholder" placeholder="' +
      detailPh +
      '"></textarea>' +
      '<p class="order-store-form__compare-char-count" data-compare-edit-char-count></p></div></section></div>' +
      '<div class="modal__footer order-store-form__compare-modal-footer">' +
      '<button type="button" class="btn" data-os-close data-i18n="orderForm.cancel"></button>' +
      '<button type="button" class="btn btn--primary" data-compare-edit-confirm data-i18n="crud.save"></button>' +
      "</div></div></div>"
    );
  }

  function updateCompareCharCount(ta, outEl) {
    if (!ta || !outEl) return;
    outEl.textContent = t("orderForm.compareCharCount", {
      max: COMPARE_DETAIL_MAX,
      current: ta.value.length,
    });
  }

  function openCompareAddModal() {
    ensureModals();
    var ta = modalRoot.querySelector("[data-compare-detail]");
    var q = modalRoot.querySelector("[data-compare-qty]");
    var err = modalRoot.querySelector("[data-compare-detail-error]");
    if (ta) ta.value = "";
    if (q) q.value = "1";
    if (err) {
      err.hidden = true;
      err.textContent = "";
    }
    updateCompareCharCount(ta, modalRoot.querySelector("[data-compare-char-count]"));
    openOsModal("compare-add");
    if (ta) ta.focus();
  }

  function filterSelectHtml(id, role, labelKey, options, selectedId) {
    var ph = lib.escapeHtml(fieldPh("select", labelKey));
    var opts =
      '<option value="" disabled>' +
      ph +
      '</option><option value=""' +
      (!selectedId ? " selected" : "") +
      ">" +
      lib.escapeHtml(t("orderForm.filterAll")) +
      "</option>" +
      options
        .map(function (o) {
          return (
            '<option value="' +
            lib.escapeHtml(o.id) +
            '"' +
            (selectedId === o.id ? " selected" : "") +
            ">" +
            lib.escapeHtml(o.label) +
            "</option>"
          );
        })
        .join("");
    return (
      '<select id="' +
      id +
      '" class="crud-toolbar__select" data-role="' +
      role +
      '" aria-label="' +
      lib.escapeHtml(t(labelKey)) +
      '">' +
      opts +
      "</select>"
    );
  }

  function renderProductFilterRow() {
    if (!state.productFilterOpen) return "";
    var oemPh = lib.escapeHtml(fieldPh("input", "orderForm.filterOem"));
    return (
      '<div class="order-store-form__product-filters is-open">' +
      filterSelectHtml(
        "os-filter-brand",
        "product-brand",
        "orderForm.filterBrand",
        productBrandOptions(),
        state.productBrandId
      ) +
      filterSelectHtml(
        "os-filter-model",
        "product-model",
        "orderForm.filterModel",
        productCarModelOptions(),
        state.productModelId
      ) +
      filterSelectHtml(
        "os-filter-year",
        "product-year",
        "orderForm.filterYear",
        productYearOptions(),
        state.productYear
      ) +
      '<input type="search" class="crud-toolbar__search" id="os-filter-oem" data-role="product-oem" data-i18n-placeholder="orderForm.filterOem" placeholder="' +
      oemPh +
      '" value="' +
      lib.escapeHtml(state.productOem) +
      '" aria-label="' +
      lib.escapeHtml(t("orderForm.filterOem")) +
      '" /></div>'
    );
  }

  function renderStep2(ro) {
    var catPh = lib.escapeHtml(fieldPh("select", "orderForm.productCategory"));
    var cats = categoryOptions();
    var catOpts = cats
      .map(function (c) {
        return (
          '<option value="' +
          lib.escapeHtml(c.id) +
          '"' +
          (state.productCategoryId === c.id ? " selected" : "") +
          ">" +
          lib.escapeHtml(c.label) +
          "</option>"
        );
      })
      .join("");
    return (
      '<section class="order-store-form__step order-store-form__step--search">' +
      stepHead("2", "orderForm.stepProductSearch") +
      (state.readOnly
        ? '<p class="crud-muted" data-i18n="orderForm.viewOnly"></p>'
        : '<div class="order-store-form__product-toolbar-wrap">' +
          '<div class="order-store-form__product-toolbar">' +
          '<div class="order-store-form__search-group">' +
          '<input type="search" class="crud-toolbar__search" data-role="product-q" data-i18n-placeholder="orderForm.productSearch" placeholder="' +
          lib.escapeHtml(fieldPh("input", "orderForm.productSearch")) +
          '" value="' +
          lib.escapeHtml(state.productQuery) +
          '" />' +
          '<button type="button" class="btn btn--primary btn--icon" data-product-search aria-label="' +
          lib.escapeHtml(t("search.placeholder")) +
          '"><img src="../assets/icons/search.svg" alt="" width="18" height="18"/></button></div>' +
          '<select class="crud-toolbar__select" data-role="product-cat" aria-label="' +
          lib.escapeHtml(t("orderForm.productCategory")) +
          '"><option value="" disabled>' +
          catPh +
          '</option><option value=""' +
          (!state.productCategoryId ? " selected" : "") +
          ">" +
          lib.escapeHtml(t("orderForm.tabAllProducts")) +
          "</option>" +
          catOpts +
          "</select>" +
          '<button type="button" class="btn' +
          (state.productFilterOpen ? " is-active" : "") +
          '" data-product-filter aria-expanded="' +
          (state.productFilterOpen ? "true" : "false") +
          '"><img src="../assets/icons/filter.svg" alt="" width="18" height="18" /><span data-i18n="orderForm.filter"></span></button></div>' +
          renderProductFilterRow() +
          "</div>") +
      '<div class="order-store-form__tabs order-store-form__tabs--underline">' +
      '<button type="button" class="order-store-form__tab' +
      (state.productTab === "products" ? " is-active" : "") +
      '" data-product-tab="products" data-i18n="orderForm.tabAllProducts"></button>' +
      '<button type="button" class="order-store-form__tab' +
      (state.productTab === "compare" ? " is-active" : "") +
      '" data-product-tab="compare" data-i18n="orderForm.tabCompare"></button></div>' +
      renderProductResults(ro) +
      "</section>"
    );
  }

  function renderPriceSummary(sum, lineCount) {
    return (
      '<div class="order-store-form__price-summary">' +
      '<div class="order-store-form__price-summary-title" data-i18n="orderForm.priceSummary"></div>' +
      '<div class="order-store-form__price-summary-rows">' +
      '<div class="order-store-form__price-summary-row"><span>' +
      lib.escapeHtml(t("orderForm.itemsTotal", { count: lineCount })) +
      '</span><span class="tabular-nums">' +
      lib.formatMoney(sum.itemsTotal) +
      "</span></div>" +
      '<div class="order-store-form__price-summary-row"><span data-i18n="orderForm.discountTotal"></span><span class="tabular-nums">' +
      lib.formatMoney(sum.discountTotal) +
      "</span></div>" +
      '<div class="order-store-form__price-summary-row"><span data-i18n="orderForm.shipping"></span><span class="tabular-nums">' +
      lib.formatMoney(sum.shipping) +
      "</span></div>" +
      '<div class="order-store-form__price-summary-row"><span data-i18n="orderForm.vatAmount"></span><span class="tabular-nums">' +
      lib.formatMoney(sum.vatAmount) +
      "</span></div>" +
      '<div class="order-store-form__price-summary-row"><span data-i18n="orderForm.grandTotal"></span><span class="tabular-nums">' +
      lib.formatMoney(sum.grandTotal) +
      "</span></div>" +
      '<div class="order-store-form__price-summary-net"><span data-i18n="orderForm.netTotal"></span><span class="tabular-nums">' +
      lib.formatMoney(sum.netTotal) +
      "</span></div></div></div>"
    );
  }

  function renderProductTable(products, readOnly, panel) {
    if (!products.length) {
      return (
        '<p class="crud-muted" data-i18n="orderForm.emptyCartTitle"></p>'
      );
    }
    var rows = products
      .map(function (p, i) {
        var row = productRow(p.product_item_id);
        var qty = Number(p.amount) || 1;
        var max = Math.max(cart.availableStock(row), 1);
        var unit = cart.isWholesale(row, qty) ? Number(row.price) || 0 : cart.unitPrice(row, qty);
        var disc = cart.lineTotalDiscount(row, qty);
        var total = cart.lineTotal(qty, unit, disc);
        return (
          "<tr>" +
          "<td>" +
          lib.escapeHtml(lib.productItemLabel(p.product_item_id)) +
          '</td><td class="data-table__col-numeric">' +
          (readOnly
            ? qty
            : '<input type="number" min="1" max="' +
              max +
              '" data-panel="' +
              panel +
              '" data-prod-idx="' +
              i +
              '" value="' +
              qty +
              '"/>') +
          '</td><td class="data-table__col-numeric">' +
          renderCartUnitPriceCell(row, qty) +
          '</td><td class="data-table__col-numeric tabular-nums">' +
          lib.formatMoney(disc) +
          '</td><td class="data-table__col-numeric tabular-nums">' +
          lib.formatMoney(total) +
          '</td><td class="data-table__actions-cell">' +
          (readOnly
            ? ""
            : '<button type="button" class="btn btn--icon crud-delete" data-panel="' +
              panel +
              '" data-rm-prod="' +
              i +
              '" aria-label="' +
              lib.escapeHtml(t("crud.delete")) +
              '"><img src="../assets/icons/trash-2.svg" alt="" width="18" height="18"/></button>') +
          "</td></tr>"
        );
      })
      .join("");
    return (
      '<div class="crud-table-wrap"><div class="crud-table-wrap__body"><table class="data-table crud-table"><thead><tr>' +
      '<th data-i18n="orderForm.colProduct"></th>' +
      '<th class="data-table__col-numeric" data-i18n="orderForm.quantity"></th>' +
      '<th class="data-table__col-numeric" data-i18n="orderForm.pricePerUnit"></th>' +
      '<th class="data-table__col-numeric" data-i18n="orderForm.discount"></th>' +
      '<th class="data-table__col-numeric" data-i18n="orderForm.lineTotal"></th>' +
      '<th class="data-table__actions-col"></th></tr></thead><tbody>' +
      rows +
      "</tbody></table></div></div>"
    );
  }

  function renderCompareTable(compares, readOnly, panel) {
    if (!compares.length) {
      return '<p class="crud-muted" data-i18n="orderForm.emptyCartTitle"></p>';
    }
    var rows = compares
      .map(function (c, i) {
        return (
          "<tr><td class=\"whitespace-pre-wrap\">" +
          lib.escapeHtml(c.detail) +
          '</td><td class="data-table__col-numeric">' +
          (readOnly
            ? Number(c.amount) || 1
            : '<input type="number" min="1" data-panel="' +
              panel +
              '" data-cmp-idx="' +
              i +
              '" value="' +
              (Number(c.amount) || 1) +
              '"/>') +
          '</td><td class="data-table__actions-cell">' +
          (readOnly
            ? ""
            : '<button type="button" class="btn btn--icon" data-panel="' +
              panel +
              '" data-edit-cmp="' +
              lib.escapeHtml(c.id) +
              '" aria-label="' +
              lib.escapeHtml(t("crud.edit")) +
              '"><img src="../assets/icons/pencil.svg" alt="" width="18" height="18"/></button>' +
              '<button type="button" class="btn btn--icon crud-delete" data-panel="' +
              panel +
              '" data-rm-cmp="' +
              lib.escapeHtml(c.id) +
              '" aria-label="' +
              lib.escapeHtml(t("crud.delete")) +
              '"><img src="../assets/icons/trash-2.svg" alt="" width="18" height="18"/></button>') +
          "</td></tr>"
        );
      })
      .join("");
    return (
      '<div class="crud-table-wrap"><div class="crud-table-wrap__body"><table class="data-table crud-table"><thead><tr>' +
      '<th data-i18n="orderForm.colProduct"></th>' +
      '<th class="data-table__col-numeric" data-i18n="orderForm.quantity"></th>' +
      '<th class="data-table__actions-col"></th></tr></thead><tbody>' +
      rows +
      "</tbody></table></div></div>"
    );
  }

  function renderDocumentPanel(cfg) {
    var products = cfg.products || [];
    var compares = cfg.compares || [];
    var cartTab = cfg.cartTab || "arrange";
    var collapsed = !!cfg.collapsed;
    var readOnly = !!cfg.readOnly;
    var actions = cfg.actions || "create";
    var showReset = !!cfg.showReset;
    var panel = cfg.panel || "main";
    var deliveryNumber = cfg.deliveryNumber;
    var orderAt = cfg.orderAt;
    var receiveAt = cfg.receiveAt;
    var deliveryType = cfg.deliveryType || "store";
    var skuOptions = cfg.skuOptions || [];
    var selectedSkuId = cfg.selectedSkuId;
    var allowRemoveCard = !!cfg.allowRemoveCard;
    var onToggleKey = cfg.onToggleKey || "existingCollapsed";

    var hasSkuSelect = skuOptions.length > 1 && selectedSkuId != null;
    var empty =
      !hasSkuSelect &&
      !(deliveryNumber && String(deliveryNumber).trim()) &&
      !cartHasLines(products, compares);
    var canSave = cartHasLines(products, compares);
    var title =
      deliveryNumber && String(deliveryNumber).trim()
        ? lib.escapeHtml(lib.formatOrderSku ? lib.formatOrderSku(deliveryNumber) : deliveryNumber)
        : lib.escapeHtml(t("orderForm.createDocument"));
    var sum = cart.priceSummary(summaryLinesFrom(products), lib.vatPercent(), 0);
    var lineCount = products.length + compares.length;
    var receiveLabel = receiveTypeLabel(deliveryType);
    var receiveText =
      receiveLabel +
      (deliveryType === "delivery" ? " " + t("orderForm.receiveDateSent") + " " : " ") +
      formatReceiveDateTime(receiveAt);

    var cartTabs =
      '<div class="order-store-form__tabs order-store-form__tabs--underline">' +
      '<button type="button" class="order-store-form__tab' +
      (cartTab === "arrange" ? " is-active" : "") +
      '" data-cart-tab="arrange" data-doc-panel="' +
      panel +
      '">' +
      lib.escapeHtml(t("orderForm.arrangeProducts", { count: products.length })) +
      '</button><button type="button" class="order-store-form__tab' +
      (cartTab === "compare" ? " is-active" : "") +
      '" data-cart-tab="compare" data-doc-panel="' +
      panel +
      '">' +
      lib.escapeHtml(t("orderForm.compareProducts", { count: compares.length })) +
      "</button></div>";

    var skuSelect = hasSkuSelect
      ? '<select class="crud-toolbar__select order-store-form__doc-sku-select" data-family-sku data-doc-panel="' +
        panel +
        '">' +
        skuOptions
          .map(function (opt) {
            return (
              '<option value="' +
              opt.id +
              '"' +
              (selectedSkuId === opt.id ? " selected" : "") +
              ">" +
              lib.escapeHtml(opt.label) +
              "</option>"
            );
          })
          .join("") +
        "</select>"
      : "";

    var bodyInner = empty
      ? '<div class="order-store-form__doc-empty">' +
        '<img src="../assets/icons/file-plus.svg" alt="" width="48" height="48" />' +
        '<p data-i18n="orderForm.emptyCartTitle"></p></div>'
      : (receiveAt
          ? '<div class="order-store-form__receive-row"><strong data-i18n="orderForm.receiveLabel"></strong>' +
            '<span class="order-store-form__receive-value">' +
            lib.escapeHtml(receiveText) +
            "</span>" +
            (readOnly
              ? ""
              : '<button type="button" class="btn btn--icon" data-open-delivery data-doc-panel="' +
                panel +
                '" aria-label="' +
                lib.escapeHtml(t("crud.edit")) +
                '"><img src="../assets/icons/pencil.svg" alt="" width="18" height="18"/></button>') +
            "</div>"
          : "") +
        skuSelect +
        cartTabs +
        (cartTab === "arrange"
          ? renderProductTable(products, readOnly, panel)
          : renderCompareTable(compares, readOnly, panel)) +
        renderPriceSummary(sum, lineCount);

    var actionsHtml = "";
    if (!collapsed && (actions !== "create" ? !empty : true)) {
      if (actions === "view") {
        actionsHtml =
          '<div class="order-store-form__doc-actions' +
          (showReset ? " order-store-form__doc-actions--view-reset" : "") +
          '">' +
          '<button type="button" class="btn btn--danger" data-action-cancel data-doc-panel="' +
          panel +
          '" data-i18n="orderForm.cancel"></button>' +
          (showReset
            ? '<button type="button" class="btn btn--outline" data-action-reset data-doc-panel="' +
              panel +
              '" data-i18n="orderForm.resetOrder"></button>'
            : "") +
          "</div>";
      } else {
        actionsHtml =
          '<div class="order-store-form__doc-actions">' +
          '<button type="button" class="btn btn--danger" data-action-cancel data-doc-panel="' +
          panel +
          '" data-i18n="orderForm.cancel"></button>' +
          '<button type="button" class="btn btn--outline" data-save="draft" data-doc-panel="' +
          panel +
          '"' +
          (canSave && !readOnly ? "" : " disabled") +
          ">" +
          lib.escapeHtml(t("orderForm.saveDraft")) +
          '</button><button type="button" class="btn btn--success" data-save="pending" data-doc-panel="' +
          panel +
          '"' +
          (canSave && !readOnly ? "" : " disabled") +
          ">" +
          lib.escapeHtml(t("orderForm.printPicking")) +
          "</button></div>";
      }
    }

    return (
      '<section class="order-store-form__step order-store-form__doc-card" data-doc-card="' +
      panel +
      '">' +
      '<div class="order-store-form__doc-header">' +
      '<div class="order-store-form__doc-header-main">' +
      '<span class="order-store-form__doc-icon"><img src="../assets/icons/clipboard-list.svg" alt="" width="20" height="20"/></span>' +
      '<div class="order-store-form__doc-head-text">' +
      "<strong>" +
      title +
      "</strong>" +
      '<p class="order-store-form__doc-subtitle" data-i18n="orderForm.createDocumentHint"></p></div></div>' +
      '<div class="order-store-form__doc-header-actions">' +
      (empty
        ? ""
        : '<div class="order-store-form__doc-order-date"><strong data-i18n="orderForm.orderDate"></strong><span>' +
          lib.escapeHtml(formatOrderDate(orderAt || new Date().toISOString())) +
          "</span></div>") +
      (allowRemoveCard
        ? '<button type="button" class="btn btn--icon crud-delete" data-remove-addon-card aria-label="' +
          lib.escapeHtml(t("crud.delete")) +
          '"><img src="../assets/icons/trash-2.svg" alt="" width="18" height="18"/></button>'
        : "") +
      '<button type="button" class="order-store-form__doc-head' +
      (collapsed ? " is-collapsed" : "") +
      '" data-doc-toggle data-toggle-key="' +
      onToggleKey +
      '" aria-expanded="' +
      (collapsed ? "false" : "true") +
      '" aria-label="' +
      lib.escapeHtml(collapsed ? t("orderForm.expandCard") : t("orderForm.collapseCard")) +
      '"><img class="order-store-form__doc-chevron" src="../assets/icons/chevron-down.svg" alt="" width="18" height="18"/></button>' +
      "</div></div>" +
      '<div class="order-store-form__doc-body' +
      (collapsed ? " is-collapsed" : "") +
      '">' +
      bodyInner +
      actionsHtml +
      "</div></section>"
    );
  }

  function viewPanelData() {
    var id = state.selectedFamilyId || state.orderId;
    if (!id) return null;
    var o = global.store.getById("order_list", id);
    if (!o) return null;
    var lines = orderLines(id);
    var ship = lib.orderShipping(id);
    return {
      products: lines.products,
      compares: lines.compares,
      deliveryNumber: o.sku,
      orderAt: o.ordered_at || o.created_at,
      receiveAt: ship && ship.received_at ? String(ship.received_at).slice(0, 16) : "",
      deliveryType: (ship && ship.type) || "store",
      status: o.status,
    };
  }

  function skuOptionsFromFamily() {
    return state.familyDetails
      .filter(function (d) {
        return d.sku && String(d.sku).trim();
      })
      .map(function (d) {
        return {
          id: d.id,
          label: lib.formatOrderSku ? lib.formatOrderSku(d.sku) : d.sku,
        };
      });
  }

  function ensureModals() {
    if (modalRoot) return;
    modalRoot = document.createElement("div");
    modalRoot.id = "os-modal-root";
    modalRoot.innerHTML =
      '<div class="modal-overlay" data-os-modal="delivery" hidden><div class="modal crud-modal" role="dialog"><div class="modal__header"><h2 class="modal__title" data-i18n="orderForm.deliveryDialogTitle"></h2><button type="button" class="modal__close" data-os-close><img src="../assets/icons/x.svg" alt="" width="18" height="18"/></button></div><div class="modal__content"><p class="crud-muted" data-i18n="orderForm.deliveryDialogHint"></p><fieldset class="order-store-form__delivery-radios" data-delivery-type-field></fieldset><div class="crud-form"><div class="form-field"><label><span data-i18n="orderForm.deliveryDate"></span></label><input type="date" data-delivery-date/></div><div class="form-field"><label><span data-i18n="orderForm.deliveryTime"></span></label><input type="time" data-delivery-time/></div></div></div><div class="modal__footer"><button type="button" class="btn btn--outline" data-os-close data-i18n="orderForm.cancel"></button><button type="button" class="btn btn--primary" data-delivery-confirm data-i18n="modal.ok"></button></div></div></div>' +
      compareAddModalHtml() +
      compareEditModalHtml() +
      '<div class="modal-overlay" data-os-modal="cancel" hidden><div class="modal crud-modal" role="dialog"><div class="modal__header"><h2 class="modal__title" data-i18n="orderDelivery.cancelDialogTitle"></h2></div><div class="modal__content"><p data-i18n="orderDelivery.cancelDialogDescription"></p></div><div class="modal__footer"><button type="button" class="btn btn--outline" data-os-close data-i18n="orderForm.cancel"></button><button type="button" class="btn btn--primary" data-cancel-confirm data-i18n="modal.ok"></button></div></div></div>' +
      '<div class="modal-overlay" data-os-modal="reset" hidden><div class="modal crud-modal" role="dialog"><div class="modal__header"><h2 class="modal__title" data-i18n="orderDelivery.resetDialogTitle"></h2></div><div class="modal__content"><p data-i18n="orderDelivery.resetDialogDescription"></p></div><div class="modal__footer"><button type="button" class="btn btn--outline" data-os-close data-i18n="orderForm.cancel"></button><button type="button" class="btn btn--primary" data-reset-confirm data-i18n="modal.ok"></button></div></div></div>';
    document.body.appendChild(modalRoot);
    fillDeliveryRadios();
    bindModalsOnce();
  }

  function fillDeliveryRadios() {
    var field = modalRoot.querySelector("[data-delivery-type-field]");
    if (!field) return;
    var opts = [
      { v: "store", k: "orderForm.receiveTypeStore" },
      { v: "parking", k: "orderForm.receiveTypeParking" },
      { v: "delivery", k: "orderForm.receiveTypeDelivery" },
    ];
    field.innerHTML = opts
      .map(function (o) {
        return (
          '<label><input type="radio" name="os-delivery-type" value="' +
          o.v +
          '"/> <span data-i18n="' +
          o.k +
          '"></span></label>'
        );
      })
      .join("");
  }

  function openOsModal(name) {
    ensureModals();
    var el = modalRoot.querySelector('[data-os-modal="' + name + '"]');
    if (!el) return;
    el.hidden = false;
    document.body.classList.add("modal-open");
    if (global.i18n) global.i18n.init();
  }

  function closeOsModal(name) {
    if (!modalRoot) return;
    if (name) {
      var el = modalRoot.querySelector('[data-os-modal="' + name + '"]');
      if (el) el.hidden = true;
    } else {
      modalRoot.querySelectorAll("[data-os-modal]").forEach(function (m) {
        m.hidden = true;
      });
    }
    document.body.classList.remove("modal-open");
  }

  function openDeliveryModal() {
    if (!state.receiveAt) return;
    var parts = state.receiveAt.split("T");
    state.deliveryDraft.type = state.deliveryType;
    state.deliveryDraft.date = parts[0] || "";
    state.deliveryDraft.time = (parts[1] || "00:00").slice(0, 5);
    ensureModals();
    modalRoot.querySelectorAll('input[name="os-delivery-type"]').forEach(function (rb) {
      rb.checked = rb.value === state.deliveryDraft.type;
    });
    var dEl = modalRoot.querySelector("[data-delivery-date]");
    var tEl = modalRoot.querySelector("[data-delivery-time]");
    if (dEl) dEl.value = state.deliveryDraft.date;
    if (tEl) tEl.value = state.deliveryDraft.time;
    openOsModal("delivery");
  }

  function bindModalsOnce() {
    if (modalRoot._bound) return;
    modalRoot._bound = true;
    modalRoot.querySelectorAll("[data-os-close]").forEach(function (btn) {
      btn.addEventListener("click", function () {
        closeOsModal();
      });
    });
    modalRoot.querySelectorAll(".modal-overlay").forEach(function (ov) {
      ov.addEventListener("click", function (e) {
        if (e.target === ov) closeOsModal();
      });
    });
    var delConfirm = modalRoot.querySelector("[data-delivery-confirm]");
    if (delConfirm) {
      delConfirm.addEventListener("click", function () {
        // ponytail: delivery confirm reads native date/time inputs only; upgrade: shared calendar widget.
        var typeRb = modalRoot.querySelector('input[name="os-delivery-type"]:checked');
        var dEl = modalRoot.querySelector("[data-delivery-date]");
        var tEl = modalRoot.querySelector("[data-delivery-time]");
        if (!dEl || !dEl.value) return;
        state.deliveryType = typeRb ? typeRb.value : "store";
        state.receiveAt = dEl.value + "T" + (tEl && tEl.value ? tEl.value : "00:00");
        closeOsModal();
        render();
      });
    }
    var cmpDetail = modalRoot.querySelector("[data-compare-detail]");
    if (cmpDetail) {
      cmpDetail.addEventListener("input", function () {
        var err = modalRoot.querySelector("[data-compare-detail-error]");
        if (err) {
          err.hidden = true;
          err.textContent = "";
        }
        updateCompareCharCount(cmpDetail, modalRoot.querySelector("[data-compare-char-count]"));
      });
    }
    var cmpEditDetail = modalRoot.querySelector("[data-compare-edit-detail]");
    if (cmpEditDetail) {
      cmpEditDetail.addEventListener("input", function () {
        updateCompareCharCount(cmpEditDetail, modalRoot.querySelector("[data-compare-edit-char-count]"));
      });
    }
    var cmpAdd = modalRoot.querySelector("[data-compare-add-confirm]");
    if (cmpAdd) {
      cmpAdd.addEventListener("click", function () {
        var ta = modalRoot.querySelector("[data-compare-detail]");
        var q = modalRoot.querySelector("[data-compare-qty]");
        var err = modalRoot.querySelector("[data-compare-detail-error]");
        var detail = ta ? ta.value.trim() : "";
        if (!detail) {
          if (err) {
            err.textContent = t("error.required");
            err.hidden = false;
          }
          if (ta) ta.focus();
          return;
        }
        var qty = parseQty(q ? q.value : "1", 1);
        state.compares.push({ id: compareUid(), detail: detail.slice(0, COMPARE_DETAIL_MAX), amount: qty });
        state.cartTab = "compare";
        touchCartSchedule();
        closeOsModal();
        render();
      });
    }
    var cmpEdit = modalRoot.querySelector("[data-compare-edit-confirm]");
    if (cmpEdit) {
      cmpEdit.addEventListener("click", function () {
        var ta = modalRoot.querySelector("[data-compare-edit-detail]");
        var detail = ta ? ta.value.trim() : "";
        if (!state.compareEditId || !detail) return;
        state.compares = state.compares.map(function (c) {
          return c.id === state.compareEditId
            ? { id: c.id, detail: detail.slice(0, COMPARE_DETAIL_MAX), amount: c.amount }
            : c;
        });
        state.compareEditId = null;
        closeOsModal();
        render();
      });
    }
    var cancelBtn = modalRoot.querySelector("[data-cancel-confirm]");
    if (cancelBtn) cancelBtn.addEventListener("click", confirmCancel);
    var resetBtn = modalRoot.querySelector("[data-reset-confirm]");
    if (resetBtn) {
      resetBtn.addEventListener("click", function () {
        var id = state.pendingResetId || state.selectedFamilyId || state.orderId;
        if (id) patchOrderStatus(id, "draft");
        closeOsModal();
        global.toast.success(t("notification.success.save"));
        global.location.href = global.nav.resolve(LIST_HREF);
      });
    }
  }

  function confirmCancel() {
    if (state.addonCreate && state.cancelSource === "addon") {
      var vd = viewPanelData();
      if (vd && state.selectedFamilyId) applyOrderToState(state.selectedFamilyId);
      state.addonCreate = false;
      state.existingCollapsed = false;
      state.addonCollapsed = false;
      state.cartTab = "arrange";
      closeOsModal();
      render();
      return;
    }
    var id = state.selectedFamilyId || state.orderId;
    var row = state.familyDetails.find(function (d) {
      return d.id === id;
    });
    var st = (row && row.status) || state.loadedStatus;
    if (can("update") && id != null && isEditableStatus(st)) {
      patchOrderStatus(id, "cancelled");
      closeOsModal();
      global.toast.success(t("notification.success.save"));
      global.location.href = global.nav.resolve(LIST_HREF);
      return;
    }
    closeOsModal();
    global.location.href = global.nav.resolve(LIST_HREF);
  }

  function render() {
    var root = document.getElementById("order-store-form-root");
    if (!root) return;
    state.readOnly = isViewMode();

    var members = lib.activeRows("member_user").map(function (m) {
      return (
        '<option value="' +
        m.id +
        '"' +
        (String(state.memberId) === String(m.id) ? " selected" : "") +
        ">" +
        lib.escapeHtml(m.name || m.username) +
        "</option>"
      );
    });
    var ro = state.readOnly ? " disabled" : "";
    var skuOpts = skuOptionsFromFamily();
    var docPanels = "";

    if (state.addonCreate) {
      var vd = viewPanelData();
      if (vd) {
        docPanels +=
          renderDocumentPanel({
            panel: "view",
            products: vd.products,
            compares: vd.compares,
            cartTab: state.viewCartTab,
            collapsed: state.existingCollapsed,
            readOnly: true,
            actions: "view",
            showReset: showResetFlag(),
            deliveryNumber: vd.deliveryNumber,
            orderAt: vd.orderAt,
            receiveAt: vd.receiveAt,
            deliveryType: vd.deliveryType,
            skuOptions: skuOpts,
            selectedSkuId: state.selectedFamilyId,
            onToggleKey: "existingCollapsed",
          }) +
          renderDocumentPanel({
            panel: "addon",
            products: state.products,
            compares: state.compares,
            cartTab: state.cartTab,
            collapsed: state.addonCollapsed,
            readOnly: false,
            actions: "create",
            deliveryNumber: null,
            orderAt: null,
            receiveAt: state.receiveAt,
            deliveryType: state.deliveryType,
            allowRemoveCard: true,
            onToggleKey: "addonCollapsed",
          });
      }
    } else {
      var order = state.orderId ? global.store.getById("order_list", state.orderId) : null;
      docPanels += renderDocumentPanel({
        panel: "main",
        products: state.products,
        compares: state.compares,
        cartTab: state.cartTab,
        collapsed: state.existingCollapsed,
        readOnly: state.readOnly,
        actions: state.readOnly ? "view" : "create",
        showReset: showResetFlag(),
        deliveryNumber: order && order.sku,
        orderAt: order && (order.ordered_at || order.created_at),
        receiveAt: state.receiveAt,
        deliveryType: state.deliveryType,
        skuOptions: skuOpts,
        selectedSkuId: state.selectedFamilyId,
        onToggleKey: "existingCollapsed",
      });
    }

    var addBill =
      showAddBillFlag()
        ? '<button type="button" class="btn btn--primary btn--block order-store-form__add-bill" data-start-addon><img src="../assets/icons/plus.svg" alt="" width="18" height="18" /> <span data-i18n="crud.create"></span></button>'
        : "";

    root.innerHTML =
      '<div class="order-store-form order-store-form__layout"><div class="order-store-form__grid">' +
      '<div class="order-store-form__col order-store-form__col--left">' +
      renderStep1(members, ro) +
      renderStep2(ro) +
      "</div>" +
      '<div class="order-store-form__col order-store-form__col--right">' +
      '<div class="order-store-form__doc-scroll">' +
      docPanels +
      "</div>" +
      addBill +
      "</div></div></div>";

    var memberSel = root.querySelector("[data-role=member]");
    if (memberSel && state.memberId) memberSel.value = String(state.memberId);
    if (global.i18n) global.i18n.init();
    if (global.telInput) global.telInput.bind(root);
    bind(root);
    mountProductBrowsePager(root);
  }

  function panelProducts(panel) {
    if (panel === "addon" || panel === "main") return state.products;
    var vd = viewPanelData();
    return vd ? vd.products : [];
  }

  function panelCompares(panel) {
    if (panel === "addon" || panel === "main") return state.compares;
    var vd = viewPanelData();
    return vd ? vd.compares : [];
  }

  function bind(root) {
    var memberEl = root.querySelector("[data-role=member]");
    if (memberEl) {
      memberEl.addEventListener("change", function (e) {
        var v = e.target.value;
        var prev = state.memberId;
        if (v === "__walkin") {
          resetCustomer();
          render();
          return;
        }
        state.memberId = v;
        state.memberCreditId = "";
        if (v !== prev) {
          state.products = [];
          state.compares = [];
          touchCartSchedule();
        }
        var m = global.store.getById("member_user", Number(state.memberId));
        if (m) {
          state.memberName = m.name || "";
          state.memberTel = m.tel || "";
          state.memberEmail = m.email || "";
        }
        render();
      });
    }
    root.querySelectorAll('input[name="os-credit"]').forEach(function (rb) {
      rb.addEventListener("change", function () {
        state.memberCreditId = rb.value;
        render();
      });
    });
    var resetBtn = root.querySelector("[data-reset-customer]");
    if (resetBtn) {
      resetBtn.addEventListener("click", function () {
        resetCustomer();
        render();
      });
    }
    ["name", "tel", "email"].forEach(function (role) {
      var el = root.querySelector('[data-role="' + role + '"]');
      if (!el) return;
      el.addEventListener("input", function (e) {
        if (role === "name") state.memberName = e.target.value;
        if (role === "tel") state.memberTel = e.target.value;
        if (role === "email") state.memberEmail = e.target.value;
      });
    });
    root.querySelectorAll("[data-product-tab]").forEach(function (btn) {
      btn.addEventListener("click", function () {
        var tab = btn.getAttribute("data-product-tab");
        state.productTab = tab;
        resetProductBrowsePage();
        if (tab === "compare") state.productBrowseSelectedIds = {};
        render();
        if (tab === "compare" && !state.readOnly) {
          openCompareAddModal();
        } else if (tab !== "compare") {
          closeOsModal("compare-add");
        }
      });
    });
    var pq = root.querySelector("[data-role=product-q]");
    if (pq) {
      pq.addEventListener("input", function (e) {
        state.productQuery = e.target.value;
      });
      pq.addEventListener("keydown", function (e) {
        if (e.key === "Enter") {
          state.productQueryApplied = state.productQuery;
          resetProductBrowsePage();
          render();
        }
      });
    }
    var searchBtn = root.querySelector("[data-product-search]");
    if (searchBtn) {
      searchBtn.addEventListener("click", function () {
        state.productQueryApplied = state.productQuery;
        resetProductBrowsePage();
        render();
      });
    }
    var catEl = root.querySelector("[data-role=product-cat]");
    if (catEl) {
      catEl.addEventListener("change", function (e) {
        state.productCategoryId = e.target.value;
        resetProductBrowsePage();
        render();
      });
    }
    var filterBtn = root.querySelector("[data-product-filter]");
    if (filterBtn) {
      filterBtn.addEventListener("click", function () {
        state.productFilterOpen = !state.productFilterOpen;
        render();
      });
    }
    [["product-brand", "productBrandId"], ["product-model", "productModelId"], ["product-year", "productYear"]].forEach(
      function (pair) {
        var el = root.querySelector('[data-role="' + pair[0] + '"]');
        if (!el) return;
        el.addEventListener("change", function (e) {
          state[pair[1]] = e.target.value;
          resetProductBrowsePage();
          if (state.productQueryApplied.trim()) render();
        });
      }
    );
    var oemEl = root.querySelector("[data-role=product-oem]");
    if (oemEl) {
      oemEl.addEventListener("input", function (e) {
        state.productOem = e.target.value;
        if (state.productQueryApplied.trim()) render();
      });
      oemEl.addEventListener("keydown", function (e) {
        if (e.key !== "Enter") return;
        e.preventDefault();
        state.productQueryApplied = state.productQuery;
        resetProductBrowsePage();
        render();
      });
    }
    if (pbl) pbl.bindDetailTriggers(root);
    root.querySelectorAll("[data-browse-sort]").forEach(function (btn) {
      btn.addEventListener("click", function () {
        cycleProductBrowseSort(btn.getAttribute("data-browse-sort"));
        render();
      });
    });
    root.querySelectorAll("[data-browse-row]").forEach(function (cb) {
      cb.addEventListener("change", function () {
        var id = cb.getAttribute("data-browse-row");
        if (cb.checked) state.productBrowseSelectedIds[id] = true;
        else delete state.productBrowseSelectedIds[id];
        render();
      });
    });
    var pageCb = root.querySelector("[data-browse-select-page]");
    if (pageCb) {
      pageCb.addEventListener("change", function () {
        root.querySelectorAll("[data-browse-row]").forEach(function (cb) {
          var id = cb.getAttribute("data-browse-row");
          if (pageCb.checked) state.productBrowseSelectedIds[id] = true;
          else delete state.productBrowseSelectedIds[id];
        });
        render();
      });
    }
    var selectAllBtn = root.querySelector("[data-browse-select-all]");
    if (selectAllBtn) {
      selectAllBtn.addEventListener("click", function () {
        root.querySelectorAll("[data-browse-row]").forEach(function (cb) {
          state.productBrowseSelectedIds[cb.getAttribute("data-browse-row")] = true;
        });
        render();
      });
    }
    var addSelectedBtn = root.querySelector("[data-browse-add-selected]");
    if (addSelectedBtn) {
      addSelectedBtn.addEventListener("click", function () {
        var ids = Object.keys(state.productBrowseSelectedIds).filter(function (k) {
          return state.productBrowseSelectedIds[k];
        });
        var added = false;
        ids.forEach(function (id) {
          if (addProductLine(id)) added = true;
        });
        if (added) {
          state.cartTab = "arrange";
          touchCartSchedule();
        }
        state.productBrowseSelectedIds = {};
        render();
      });
    }
    root.querySelectorAll("[data-add-product]").forEach(function (btn) {
      btn.addEventListener("click", function () {
        var id = Number(btn.getAttribute("data-add-product"));
        if (!id) return;
        if (!addProductLine(id)) return;
        state.cartTab = "arrange";
        touchCartSchedule();
        render();
      });
    });
    root.querySelectorAll("[data-open-compare-add]").forEach(function (btn) {
      btn.addEventListener("click", function () {
        openCompareAddModal();
      });
    });
    root.querySelectorAll("[data-doc-toggle]").forEach(function (btn) {
      btn.addEventListener("click", function () {
        var key = btn.getAttribute("data-toggle-key");
        if (key === "addonCollapsed") state.addonCollapsed = !state.addonCollapsed;
        else state.existingCollapsed = !state.existingCollapsed;
        render();
      });
    });
    root.querySelectorAll("[data-cart-tab]").forEach(function (btn) {
      btn.addEventListener("click", function () {
        var panel = btn.getAttribute("data-doc-panel");
        var tab = btn.getAttribute("data-cart-tab");
        if (panel === "view") state.viewCartTab = tab;
        else state.cartTab = tab;
        render();
      });
    });
    root.querySelectorAll("[data-open-delivery]").forEach(function (btn) {
      btn.addEventListener("click", openDeliveryModal);
    });
    root.querySelectorAll("[data-family-sku]").forEach(function (sel) {
      sel.addEventListener("change", function (e) {
        var id = Number(e.target.value);
        if (!id) return;
        state.selectedFamilyId = id;
        if (state.addonCreate) {
          state.viewCartTab = "arrange";
          render();
          return;
        }
        applyOrderToState(id);
        state.familyDetails = familyMembersFromStore(id);
        render();
      });
    });
    root.querySelectorAll("[data-prod-idx]").forEach(function (inp) {
      inp.addEventListener("change", function () {
        var panel = inp.getAttribute("data-panel");
        var products = panelProducts(panel);
        var i = Number(inp.getAttribute("data-prod-idx"));
        var row = productRow(products[i].product_item_id);
        products[i].amount = parseQty(inp.value, products[i].amount || 1, cart.availableStock(row));
        if (panel === "main" || panel === "addon") render();
      });
    });
    root.querySelectorAll("[data-rm-prod]").forEach(function (btn) {
      btn.addEventListener("click", function () {
        var panel = btn.getAttribute("data-panel");
        var i = Number(btn.getAttribute("data-rm-prod"));
        var products = panelProducts(panel);
        products.splice(i, 1);
        touchCartSchedule();
        render();
      });
    });
    root.querySelectorAll("[data-cmp-idx]").forEach(function (inp) {
      inp.addEventListener("change", function () {
        var panel = inp.getAttribute("data-panel");
        var compares = panelCompares(panel);
        var i = Number(inp.getAttribute("data-cmp-idx"));
        compares[i].amount = parseQty(inp.value, compares[i].amount || 1);
        render();
      });
    });
    root.querySelectorAll("[data-edit-cmp]").forEach(function (btn) {
      btn.addEventListener("click", function () {
        var id = btn.getAttribute("data-edit-cmp");
        var line = state.compares.find(function (c) {
          return c.id === id;
        });
        if (!line) return;
        state.compareEditId = id;
        ensureModals();
        var ta = modalRoot.querySelector("[data-compare-edit-detail]");
        if (ta) ta.value = line.detail;
        updateCompareCharCount(ta, modalRoot.querySelector("[data-compare-edit-char-count]"));
        openOsModal("compare-edit");
      });
    });
    root.querySelectorAll("[data-rm-cmp]").forEach(function (btn) {
      btn.addEventListener("click", function () {
        var id = btn.getAttribute("data-rm-cmp");
        state.compares = state.compares.filter(function (c) {
          return c.id !== id;
        });
        touchCartSchedule();
        render();
      });
    });
    root.querySelectorAll("[data-action-cancel]").forEach(function (btn) {
      btn.addEventListener("click", function () {
        state.cancelSource = btn.getAttribute("data-doc-panel") === "addon" ? "addon" : "bill";
        openOsModal("cancel");
      });
    });
    root.querySelectorAll("[data-action-reset]").forEach(function (btn) {
      btn.addEventListener("click", function () {
        state.pendingResetId = state.selectedFamilyId || state.orderId;
        openOsModal("reset");
      });
    });
    root.querySelectorAll('[data-save="draft"], [data-save="pending"]').forEach(function (btn) {
      btn.addEventListener("click", function () {
        var panel = btn.getAttribute("data-doc-panel");
        if (panel === "view") return;
        if (!cartHasLines(state.products, state.compares)) return;
        var status = btn.getAttribute("data-save") === "pending" ? "pending" : "draft";
        persistOrder(status);
        global.toast.success(t("notification.success.save"));
        global.location.href = global.nav.resolve(LIST_HREF);
      });
    });
    var startAddon = root.querySelector("[data-start-addon]");
    if (startAddon) {
      startAddon.addEventListener("click", function () {
        state.addonCreate = true;
        state.existingCollapsed = true;
        state.addonCollapsed = false;
        state.products = [];
        state.compares = [];
        state.cartTab = "arrange";
        state.deliveryType = "store";
        state.receiveAt = defaultReceiveAtLocal();
        render();
      });
    }
    var rmAddon = root.querySelector("[data-remove-addon-card]");
    if (rmAddon) {
      rmAddon.addEventListener("click", function () {
        state.cancelSource = "addon";
        openOsModal("cancel");
      });
    }
  }

  function selfCheck() {
    if (cartHasLines([], []) !== false) throw new Error("empty cartHasLines");
    if (cartHasLines([], [{ id: "x", detail: "a", amount: 1 }]) !== true) {
      throw new Error("compare-only cartHasLines");
    }
    var sum = cart.priceSummary([], 7, 0);
    if (sum.netTotal !== 0 || sum.itemsTotal !== 0) throw new Error("empty priceSummary");
    if (lib.selfCheckDiscount) lib.selfCheckDiscount();
    return true;
  }

  function boot() {
    global.store.init();
    if (global.i18n) global.i18n.init();
    if (!global.auth.requireAuth("login.html")) return;
    var id = parseId();
    if (id && !can("view")) {
      global.toast.error(t("error.forbidden"));
      return;
    }
    if (!id && !can("create")) {
      global.toast.error(t("error.forbidden"));
      global.location.href = global.nav.resolve(LIST_HREF);
      return;
    }
    lib.mountAdminContent("orderStore.title", "order-store-form-root");
    ensureModals();
    if (id) loadOrder(id);
    render();
    document.addEventListener("i18n:change", render);
  }

  global.orderStoreFormPage = { boot: boot, selfCheck: selfCheck, cartHasLines: cartHasLines };
})(window);

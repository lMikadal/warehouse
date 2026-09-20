(function (global) {
  var lib = global.orderLib;
  var cart = global.orderCart;
  var dlib = global.orderDeliveryLib;
  var PERM = { module: "order", type: "order_list" };

  var state = {
    orderIds: [],
    activeId: null,
    verifyItemId: null,
    barcode: "",
    qty: "1",
    extraPay: false,
  };

  function t(k, params) {
    if (params && global.i18n && global.i18n.format) return global.i18n.format(k, params);
    return lib.t(k);
  }

  function fieldPh(kind, labelKey) {
    return global.i18n ? global.i18n.fieldPlaceholder(kind, labelKey) : "";
  }

  function can(action) {
    return lib.can(PERM.module, PERM.type, action);
  }

  function parseIds() {
    var m = /[?&]ids=([^&]+)/.exec(global.location.search);
    if (!m) return [];
    return m[1]
      .split(",")
      .map(Number)
      .filter(function (n) {
        return n > 0;
      });
  }

  function activeOrder() {
    return global.store.getById("order_list", state.activeId);
  }

  function activeItems() {
    return lib.orderItems(state.activeId);
  }

  function memberCreditLimit() {
    var o = activeOrder();
    if (!o || !o.member_user_id) return null;
    var addr = lib.activeRows("member_user_address").find(function (a) {
      return a.member_user_id === o.member_user_id && a.type === "financial";
    });
    return addr && addr.credit_limit != null ? Number(addr.credit_limit) : null;
  }

  function orderNetTotal(orderId) {
    return lib.orderTotals(orderId).total_price;
  }

  function render() {
    var root = document.getElementById("order-order-form-root");
    if (!root || !state.activeId) return;
    var order = activeOrder();
    var items = activeItems();
    var sel = items.find(function (i) {
      return i.id === state.verifyItemId;
    });
    var summaryLines = items
      .filter(function (i) {
        return (Number(i.amount_checked) || 0) > 0;
      })
      .map(function (i) {
        return {
          qty: Number(i.amount_checked) || 0,
          discount: Number(i.discount) || 0,
          price: Number(i.price_per_unit) || 0,
          wholesale_price: null,
          amount_wholesale_price: null,
        };
      });
    var sum = cart.priceSummary(summaryLines, lib.vatPercent(), 0);

    var tabs = state.orderIds
      .map(function (id) {
        var o = global.store.getById("order_list", id);
        return (
          '<button type="button" class="order-order-form__tab' +
          (state.activeId === id ? " is-active" : "") +
          '" data-tab-id="' +
          id +
          '">' +
          lib.escapeHtml(o.sku ? lib.formatOrderSku(o.sku) : "#" + id) +
          "</button>"
        );
      })
      .join("");

    var pickRows = items
      .map(function (i) {
        var rem = dlib.remainingQty(i);
        return (
          "<tr><td>" +
          lib.escapeHtml(lib.productItemLabel(i.product_item_id)) +
          '</td><td class="data-table__col-numeric">' +
          i.amount +
          '</td><td class="data-table__col-numeric">' +
          (i.amount_checked || 0) +
          '</td><td class="data-table__col-numeric">' +
          rem +
          '</td><td class="data-table__actions-cell"><button type="button" class="btn btn--icon" data-pick-line="' +
          i.id +
          '" data-i18n="orderForm.pickLine"></button></td></tr>'
        );
      })
      .join("");

    root.innerHTML =
      '<div class="order-order-form"><div class="order-order-form__tabs">' +
      tabs +
      '</div><div class="order-order-form__grid"><div class="order-order-form__col">' +
      '<section class="crud-card"><h2>' +
      lib.escapeHtml(order.member_name || "—") +
      "</h2></section>" +
      '<section class="crud-card"><h2 data-i18n="orderForm.sectionVerify"></h2>' +
      '<p class="crud-muted">' +
      lib.escapeHtml(sel ? lib.productItemLabel(sel.product_item_id) : t("orderForm.selectLineHint")) +
      '</p><div class="crud-form">' +
      '<div class="form-field"><label for="oof-barcode"><span data-i18n="orderForm.barcode"></span></label>' +
      '<input id="oof-barcode" type="search" data-role="barcode" data-i18n-placeholder-input="orderForm.barcode" placeholder="' +
      lib.escapeHtml(fieldPh("input", "orderForm.barcode")) +
      '" value="' +
      lib.escapeHtml(state.barcode) +
      '"/><div class="form-field__error-slot" aria-live="polite"><p class="form-field__error" hidden role="alert"></p></div></div>' +
      '<div class="form-field"><label for="oof-qty"><span data-i18n="orderForm.verifyQty"></span></label>' +
      '<input id="oof-qty" data-role="qty" type="number" min="1" data-i18n-placeholder-input="orderForm.verifyQty" placeholder="' +
      lib.escapeHtml(fieldPh("input", "orderForm.verifyQty")) +
      '" value="' +
      lib.escapeHtml(state.qty) +
      '"/><div class="form-field__error-slot" aria-live="polite"><p class="form-field__error" hidden role="alert"></p></div></div>' +
      '<button type="button" class="btn" data-verify data-i18n="orderForm.verifyScan"></button></div></section>' +
      '<section class="crud-card"><div class="crud-table-wrap"><div class="crud-table-wrap__body"><table class="data-table crud-table"><thead><tr><th data-i18n="orderForm.colProduct"></th><th class="data-table__col-numeric" data-i18n="orderForm.colOrdered"></th><th class="data-table__col-numeric" data-i18n="orderForm.colChecked"></th><th class="data-table__col-numeric" data-i18n="orderForm.colRemaining"></th><th class="data-table__actions-col"></th></tr></thead><tbody>' +
      pickRows +
      '</tbody></table></div></div></section></div><div class="order-order-form__col">' +
      '<section class="crud-card"><h2 data-i18n="orderForm.sectionSummary"></h2><p><span data-i18n="orderStore.colTotal"></span> ' +
      lib.formatMoney(sum.netTotal) +
      '</p></section><div class="order-order-form__footer">' +
      '<button type="button" class="btn" data-fail>' +
      t("orderForm.cancel") +
      '</button><button type="button" class="btn" data-draft>' +
      t("orderForm.saveDraft") +
      '</button><button type="button" class="btn" data-credit>' +
      t("orderDelivery.issueLoan") +
      '</button><button type="button" class="btn btn--primary" data-pay>' +
      t("orderDelivery.pay") +
      "</button></div></div></div></div>";
    if (global.i18n) global.i18n.init();
    bind(root);
  }

  function patchItem(itemId, patch) {
    global.store.update("order_list_item", itemId, Object.assign({ updated_at: lib.now() }, patch));
  }

  function bind(root) {
    root.querySelectorAll("[data-tab-id]").forEach(function (btn) {
      btn.addEventListener("click", function () {
        state.activeId = Number(btn.getAttribute("data-tab-id"));
        state.verifyItemId = null;
        render();
      });
    });
    root.querySelectorAll("[data-pick-line]").forEach(function (btn) {
      btn.addEventListener("click", function () {
        state.verifyItemId = Number(btn.getAttribute("data-pick-line"));
        render();
      });
    });
    root.querySelector("[data-role=barcode]").addEventListener("input", function (e) {
      state.barcode = e.target.value;
    });
    root.querySelector("[data-role=qty]").addEventListener("input", function (e) {
      state.qty = e.target.value;
    });
    root.querySelector("[data-verify]").addEventListener("click", verifyScan);
    root.querySelector("[data-fail]").addEventListener("click", function () {
      global.store.update("order_list", state.activeId, {
        fulfill_status: "fail",
        updated_at: lib.now(),
      });
      global.location.href = global.nav.resolve("pages/order-order.html");
    });
    root.querySelector("[data-draft]").addEventListener("click", function () {
      global.store.update("order_list", state.activeId, {
        fulfill_status: "in_progress",
        updated_at: lib.now(),
        updated_by: lib.actorId(),
      });
      global.toast.success(lib.t("notification.success.save"));
      global.location.href = global.nav.resolve("pages/order-order.html");
    });
    root.querySelector("[data-credit]").addEventListener("click", function () {
      goPayment("credit");
    });
    root.querySelector("[data-pay]").addEventListener("click", function () {
      goPayment("payment");
    });
  }

  function verifyScan() {
    if (!state.verifyItemId) return;
    var item = global.store.getById("order_list_item", state.verifyItemId);
    if (!item) return;
    var rem = dlib.remainingQty(item);
    if (rem <= 0) {
      global.toast.error(t("orderDelivery.verifyAlreadyComplete"));
      return;
    }
    var scan = state.barcode.trim();
    var pi = global.store.getById("product_item", item.product_item_id);
    if (scan && pi && scan !== pi.sku && scan !== String(pi.id)) {
      global.toast.error(t("orderDelivery.verifySkuMismatch"));
      return;
    }
    var add = Math.min(rem, Math.max(1, parseInt(state.qty, 10) || 1));
    var checked = (Number(item.amount_checked) || 0) + add;
    patchItem(item.id, {
      amount_checked: checked,
      status: checked >= item.amount ? "success" : "in_progress",
    });
    global.toast.success(t("orderDelivery.verifySuccess"));
    state.barcode = "";
    render();
  }

  function goPayment(flow) {
    if (!summaryHasLines()) return;
    var limit = memberCreditLimit();
    var net = orderNetTotal(state.activeId);
    if (flow === "credit" && limit != null && net > limit) {
      if (!confirm(t("orderDelivery.creditExceeded") + " — ต้องการอนุมัติ?")) return;
      global.approvalPasswordModal.open({
        onConfirm: function (pwd) {
          var res = lib.verifyCreditPassword(pwd);
          if (!res.ok) {
            global.toast.error(t("orderApproval.invalid"));
            return;
          }
          lib.setCreditApprovedBy(state.activeId, res.userId);
          navigatePayment(flow, res.userId);
        },
      });
      return;
    }
    navigatePayment(flow, lib.getCreditApprovedBy(state.activeId));
  }

  function summaryHasLines() {
    return activeItems().some(function (i) {
      return (Number(i.amount_checked) || 0) > 0;
    });
  }

  function navigatePayment(flow, creditApprovedBy) {
    var q =
      "pages/order-order-payment.html?orderId=" +
      state.activeId +
      "&flow=" +
      flow;
    if (creditApprovedBy) q += "&credit_approved_by=" + creditApprovedBy;
    global.location.href = global.nav.resolve(q);
  }

  function boot() {
    global.store.init();
    if (global.i18n) global.i18n.init();
    if (!global.auth.requireAuth("login.html")) return;
    if (!global.permissions.guardPage(PERM.module, PERM.type, "login.html")) return;
    state.orderIds = parseIds();
    if (!state.orderIds.length) {
      global.location.href = global.nav.resolve("pages/order-order.html");
      return;
    }
    state.activeId = state.orderIds[0];
    state.extraPay = /extraPay=1/.test(global.location.search);
    lib.mountAdminContent("orderOrder.title", "order-order-form-root");
    render();
    document.addEventListener("i18n:change", render);
  }

  global.orderOrderFormPage = { boot: boot };
})(window);

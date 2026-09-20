(function (global) {
  var lib = global.orderLib;
  var cart = global.orderCart;
  var dlib = global.orderDeliveryLib;
  var PERM = { module: "order", type: "order_list" };

  var state = {
    orderId: null,
    flow: "credit",
    modeView: false,
    paymentId: null,
    specialDiscount: 0,
    discountApprovedBy: null,
    methods: {},
    amountInput: "",
  };

  function t(k, params) {
    if (params && global.i18n && global.i18n.format) return global.i18n.format(k, params);
    return lib.t(k);
  }

  function fieldPh(kind, labelKey) {
    return global.i18n ? global.i18n.fieldPlaceholder(kind, labelKey) : "";
  }

  function parseQuery() {
    var q = global.location.search;
    function g(name) {
      var m = new RegExp("[?&]" + name + "=([^&]+)").exec(q);
      return m ? decodeURIComponent(m[1]) : null;
    }
    state.orderId = Number(g("orderId"));
    state.flow = g("flow") || "credit";
    state.modeView = g("mode") === "view";
    state.paymentId = g("paymentId") ? Number(g("paymentId")) : null;
    var cab = g("credit_approved_by");
    if (cab) lib.setCreditApprovedBy(state.orderId, Number(cab));
    var sess = lib.getDiscountApprovedSession();
    if (sess) state.discountApprovedBy = sess.userId;
  }

  function payableLines() {
    return lib.orderItems(state.orderId).filter(function (i) {
      return (Number(i.amount_checked) || 0) > 0;
    });
  }

  function netTotal() {
    var lines = payableLines().map(function (i) {
      var q = Number(i.amount_checked) || 0;
      return {
        qty: q,
        discount: Number(i.discount) || 0,
        price: Number(i.price_per_unit) || 0,
        wholesale_price: null,
        amount_wholesale_price: null,
      };
    });
    var sum = cart.priceSummary(lines, lib.vatPercent(), 0);
    return Math.max(0, sum.netTotal - (Number(state.specialDiscount) || 0));
  }

  function render() {
    var root = document.getElementById("order-order-payment-root");
    if (!root) return;
    var order = global.store.getById("order_list", state.orderId);
    var pays = lib.paymentsForOrder(state.orderId);
    var net = netTotal();
    var methodOpts = lib
      .activeRows("setting_payment_method")
      .map(function (m) {
        var lang = global.store.getAll("setting_payment_method_language").find(function (l) {
          return l.setting_payment_method_id === m.id && l.locale === "th";
        });
        return { id: m.id, name: (lang && lang.name) || "#" + m.id };
      });

    var linesHtml = payableLines()
      .map(function (i) {
        return (
          "<tr><td>" +
          lib.escapeHtml(lib.productItemLabel(i.product_item_id)) +
          '</td><td class="data-table__col-numeric">' +
          i.amount_checked +
          '</td><td class="data-table__col-numeric">' +
          lib.formatMoney(i.total_price) +
          "</td></tr>"
        );
      })
      .join("");

    var tabs = pays
      .map(function (p, idx) {
        return (
          '<button type="button" class="order-payment__tab' +
          (state.paymentId === p.id || (!state.paymentId && idx === 0) ? " is-active" : "") +
          '" data-pay-tab="' +
          p.id +
          '">' +
          lib.escapeHtml(t("orderPayment.tabBill", { n: idx + 1 })) +
          "</button>"
        );
      })
      .join("");

    root.innerHTML =
      '<div class="order-payment"><div class="order-payment__grid">' +
      '<section class="crud-card"><h2>' +
      lib.escapeHtml(order.member_name || "—") +
      "</h2><p>" +
      lib.escapeHtml(lib.formatOrderSku(order.sku || "")) +
      "</p></section>" +
      '<section class="crud-card"><h2 data-i18n="' +
      (state.flow === "credit" ? "orderPayment.titleCredit" : "orderPayment.titlePayment") +
      '"></h2>' +
      (tabs ? '<div class="order-payment__tabs">' + tabs + "</div>" : "") +
      '<div class="crud-table-wrap"><div class="crud-table-wrap__body"><table class="data-table crud-table"><thead><tr><th data-i18n="orderForm.colProduct"></th><th class="data-table__col-numeric" data-i18n="orderForm.colChecked"></th><th class="data-table__col-numeric" data-i18n="orderForm.colPrice"></th></tr></thead><tbody>' +
      (linesHtml || "<tr><td colspan=3>—</td></tr>") +
      "</tbody></table></div></div>" +
      (state.modeView
        ? ""
        : '<p>' +
          t("orderPayment.specialDiscount") +
          ': <strong>' +
          lib.formatMoney(state.specialDiscount) +
          '</strong> <button type="button" class="crud-icon-btn" data-edit-disc aria-label="' +
          lib.escapeHtml(t("orderPayment.editDiscount")) +
          '"><img src="../assets/icons/pencil.svg" alt="" width="18" height="18"/></button></p>') +
      '<p><span data-i18n="orderPayment.netTotal"></span> <strong>' +
      lib.formatMoney(net) +
      "</strong></p>" +
      (state.flow === "payment" && !state.modeView
        ? methodOpts
            .map(function (m) {
              var ph = lib.escapeHtml(fieldPh("input", "orderPayment.methodAmount"));
              return (
                '<div class="form-field"><label for="opm-' +
                m.id +
                '">' +
                lib.escapeHtml(m.name) +
                '</label><input id="opm-' +
                m.id +
                '" type="number" min="0" step="0.01" data-method="' +
                m.id +
                '" data-i18n-placeholder-input="orderPayment.methodAmount" placeholder="' +
                ph +
                '" value="' +
                lib.escapeHtml(state.methods[m.id] || "") +
                '"/><div class="form-field__error-slot" aria-live="polite"><p class="form-field__error" hidden role="alert"></p></div></div>'
              );
            })
            .join("")
        : "") +
      "</section></div>" +
      (state.modeView
        ? '<a class="btn" href="' +
          lib.escapeHtml(global.nav.resolve("pages/order-order.html")) +
          '" data-i18n="orderPayment.backList"></a>'
        : '<div class="order-payment__footer">' +
          '<button type="button" class="btn" data-back-form data-i18n="orderPayment.backToPick"></button>' +
          '<button type="button" class="btn" data-save-draft data-i18n="orderForm.saveDraft"></button>' +
          '<button type="button" class="btn btn--primary" data-confirm data-i18n="' +
          (state.flow === "credit" ? "orderPayment.printCredit" : "orderPayment.confirmPay") +
          '"></button>' +
          (dlib.familyHasRemainingPicking(lib.familyRootId(order))
            ? '<button type="button" class="btn" data-extra-pay data-i18n="orderPayment.extraBill"></button>'
            : "") +
          "</div>") +
      "</div>";
    if (global.i18n) global.i18n.init();
    bind(root);
  }

  function bind(root) {
    root.querySelectorAll("[data-pay-tab]").forEach(function (btn) {
      btn.addEventListener("click", function () {
        state.paymentId = Number(btn.getAttribute("data-pay-tab"));
        var u = new URL(global.location.href);
        u.searchParams.set("paymentId", String(state.paymentId));
        global.history.replaceState({}, "", u.pathname + u.search);
        render();
      });
    });
    var editDisc = root.querySelector("[data-edit-disc]");
    if (editDisc) editDisc.addEventListener("click", function () {
      var run = function () {
        var amt = prompt("ส่วนลดพิเศษ (บาท)", String(state.specialDiscount || 0));
        if (amt == null) return;
        state.specialDiscount = Number(amt) || 0;
        render();
      };
      if (state.discountApprovedBy) {
        run();
        return;
      }
      global.approvalPasswordModal.open({
        onConfirm: function (pwd) {
          var res = lib.verifyDiscountPassword(pwd);
          if (!res.ok) {
            global.toast.error(t("orderApproval.invalid"));
            return;
          }
          state.discountApprovedBy = res.userId;
          lib.setDiscountApprovedSession(res.userId);
          run();
        },
      });
    });
    root.querySelectorAll("[data-method]").forEach(function (inp) {
      inp.addEventListener("input", function () {
        state.methods[inp.getAttribute("data-method")] = inp.value;
      });
    });
    var backForm = root.querySelector("[data-back-form]");
    if (backForm) backForm.addEventListener("click", function () {
      global.location.href = global.nav.resolve(
        "pages/order-order-form.html?ids=" + state.orderId
      );
    });
    var saveDraft = root.querySelector("[data-save-draft]");
    if (saveDraft) saveDraft.addEventListener("click", function () {
      savePayment(false);
      global.store.update("order_list", state.orderId, { fulfill_status: "in_progress" });
      global.toast.success(t("notification.success.save"));
      global.location.href = global.nav.resolve("pages/order-order.html");
    });
    var confirmBtn = root.querySelector("[data-confirm]");
    if (confirmBtn) confirmBtn.addEventListener("click", function () {
      if (state.flow === "payment") {
        var paid = Object.keys(state.methods).reduce(function (s, k) {
          return s + (Number(state.methods[k]) || 0);
        }, 0);
        if (Math.abs(paid - netTotal()) > 0.02) {
          global.toast.error("ยอดชำระไม่ตรงคงค้าง");
          return;
        }
      }
      savePayment(true);
      global.store.update("order_list", state.orderId, {
        fulfill_status: "success",
        status: "success",
        updated_at: lib.now(),
      });
      global.toast.success(t("notification.success.save"));
      global.location.href = global.nav.resolve("pages/order-order.html");
    });
    var extraPay = root.querySelector("[data-extra-pay]");
    if (extraPay) extraPay.addEventListener("click", function () {
      global.location.href = global.nav.resolve(
        "pages/order-order-form.html?ids=" + state.orderId + "&extraPay=1"
      );
    });
  }

  function savePayment(settled) {
    var actor = lib.actorId();
    var ts = lib.now();
    var total = netTotal();
    var skuPrefix = state.flow === "credit" ? "REV" : "INV";
    var pay = global.store.create("order_payment", {
      order_list_id: state.orderId,
      sku: skuPrefix + ts.slice(0, 10).replace(/-/g, "") + lib.paymentsForOrder(state.orderId).length,
      payment_category: state.flow === "credit" ? "credit" : "payment",
      ordered_at: ts,
      vat_rate: lib.vatPercent(),
      discount: 0,
      special_discount: state.specialDiscount,
      total_price: total,
      amount_paid: settled && state.flow === "payment" ? total : 0,
      is_paid: settled,
      credit_approved_by: lib.getCreditApprovedBy(state.orderId),
      discount_approved_by: state.discountApprovedBy,
      created_at: ts,
      updated_at: ts,
      created_by: actor,
      updated_by: actor,
    });
    payableLines().forEach(function (i) {
      global.store.create("order_payment_item", {
        order_payment_id: pay.id,
        order_list_item_id: i.id,
        amount: i.amount_checked,
        vat_rate: lib.vatPercent(),
        price_per_unit: i.price_per_unit,
        discount: i.discount,
        total_price: i.total_price,
        created_at: ts,
        updated_at: ts,
      });
    });
    if (state.flow === "payment") {
      Object.keys(state.methods).forEach(function (mid) {
        var amt = Number(state.methods[mid]) || 0;
        if (amt <= 0) return;
        global.store.create("order_payment_method", {
          order_payment_id: pay.id,
          setting_payment_method_id: Number(mid),
          amount: amt,
          created_at: ts,
          updated_at: ts,
          created_by: actor,
          updated_by: actor,
        });
      });
    }
  }

  function boot() {
    global.store.init();
    if (global.i18n) global.i18n.init();
    if (!global.auth.requireAuth("login.html")) return;
    if (!global.permissions.guardPage(PERM.module, PERM.type, "login.html")) return;
    parseQuery();
    if (!state.orderId) {
      global.location.href = global.nav.resolve("pages/order-order.html");
      return;
    }
    lib.mountAdminContent("orderOrder.title", "order-order-payment-root");
    render();
    document.addEventListener("i18n:change", render);
  }

  global.orderOrderPaymentPage = { boot: boot };
})(window);

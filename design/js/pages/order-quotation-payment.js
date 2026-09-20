(function (global) {
  var lib = global.orderLib;
  var PERM = { module: "order", type: "order_quotation" };

  function t(k) {
    return lib.t(k);
  }

  function quoteId() {
    var m = /[?&]id=(\d+)/.exec(global.location.search);
    return m ? Number(m[1]) : null;
  }

  function render() {
    var root = document.getElementById("order-quotation-payment-root");
    if (!root) return;
    var id = quoteId();
    var row = id != null ? global.store.getById("order_quotation", id) : null;
    var detailHref = global.nav.resolve("pages/order-quotation-detail.html?id=" + (id || ""));
    root.innerHTML =
      '<div class="crud-page">' +
      '<header class="crud-page-header"><h1 class="crud-page-header__title">' +
      t("orderQuotation.paymentTitle") +
      "</h1></header>" +
      '<p class="tabular-nums text-lg">' +
      lib.formatMoney(row ? row.grand_total : 0) +
      '</p><div class="crud-form"><div class="form-field"><label for="pay-amt">' +
      t("orderQuotation.paymentAmount") +
      '</label><input id="pay-amt" type="number" data-pay-amount /></div></div>' +
      '<div class="order-store-form__doc-actions"><a class="btn btn--outline" href="' +
      lib.escapeHtml(detailHref) +
      '">' +
      t("crud.back") +
      '</a><button type="button" class="btn btn--primary" data-confirm-pay>' +
      t("orderQuotation.paymentConfirm") +
      "</button></div></div>";
    root.querySelector("[data-confirm-pay]").addEventListener("click", function () {
      if (row && id != null) {
        var rows = global.store.getAll("order_quotation");
        var idx = rows.findIndex(function (r) {
          return r.id === id;
        });
        if (idx >= 0) {
          global.store.updateAt("order_quotation", idx, {
            status: "success",
            accept_mode: "payment",
            updated_at: new Date().toISOString(),
          });
        }
      }
      global.toast && global.toast.show(t("crud.toast.saved"));
      global.location.href = detailHref;
    });
  }

  function boot() {
    if (
      !lib.mountAdminShell({
        module: PERM.module,
        type: PERM.type,
        titleKey: "orderQuotation.paymentTitle",
        rootId: "order-quotation-payment-root",
        afterMount: render,
      })
    ) {
      return;
    }
    document.addEventListener("i18n:change", render);
  }

  global.orderQuotationPaymentPage = { boot: boot };
})(window);

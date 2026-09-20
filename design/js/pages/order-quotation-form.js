(function (global) {
  var lib = global.orderLib;
  var PERM = { module: "order", type: "order_quotation" };
  var LIST = "pages/order-quotation.html";

  function t(k) {
    return lib.t(k);
  }

  function editId() {
    var m = /[?&]id=(\d+)/.exec(global.location.search);
    return m ? Number(m[1]) : null;
  }

  function render() {
    var root = document.getElementById("order-quotation-form-root");
    if (!root) return;
    var id = editId();
    root.innerHTML =
      '<div class="crud-page order-store-form">' +
      '<header class="crud-page-header"><h1 class="crud-page-header__title">' +
      t(id ? "orderQuotation.formEdit" : "orderQuotation.formCreate") +
      '</h1></header><p class="crud-muted">' +
      t("orderQuotation.formHint") +
      '</p><div class="crud-form"><div class="form-field"><label for="qt-issue"><span data-i18n="orderQuotation.formIssueDate"></span></label><input id="qt-issue" type="date" data-issue-date /></div><div class="form-field"><label for="qt-valid"><span data-i18n="orderQuotation.formValidUntil"></span></label><input id="qt-valid" type="date" data-valid-until /></div><div class="form-field"><label><input type="checkbox" data-reserve-stock /> <span data-i18n="orderQuotation.formReserve"></span></label></div></div><div class="order-store-form__doc-actions"><a class="btn btn--outline" href="' +
      lib.escapeHtml(global.nav.resolve(LIST)) +
      '" data-i18n="crud.back"></a><button type="button" class="btn btn--primary" data-save-draft data-i18n="crud.save"></button></div></div>';
    if (global.i18n) global.i18n.init();
    root.querySelector("[data-save-draft]").addEventListener("click", function () {
      global.toast && global.toast.show(t("crud.toast.saved"));
      global.location.href = global.nav.resolve(LIST);
    });
  }

  function boot() {
    if (
      !lib.mountAdminShell({
        module: PERM.module,
        type: PERM.type,
        titleKey: "orderQuotation.title",
        rootId: "order-quotation-form-root",
        afterMount: render,
      })
    ) {
      return;
    }
    document.addEventListener("i18n:change", render);
  }

  global.orderQuotationFormPage = { boot: boot };
})(window);

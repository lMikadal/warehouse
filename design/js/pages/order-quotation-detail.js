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

  function linesFor(qid) {
    return lib
      .activeRows("order_quotation_item")
      .filter(function (r) {
        return r.order_quotation_id === qid;
      })
      .sort(function (a, b) {
        return (a.sort_order || 0) - (b.sort_order || 0);
      });
  }

  function render() {
    var root = document.getElementById("order-quotation-detail-root");
    if (!root) return;
    var id = quoteId();
    var row = id != null ? global.store.getById("order_quotation", id) : null;
    if (!row) {
      root.innerHTML = "<p>—</p>";
      return;
    }
    var items = linesFor(id);
    var itemRows = items
      .map(function (it) {
        return (
          "<tr><td>" +
          lib.escapeHtml(String(it.product_item_id)) +
          '</td><td class="data-table__col-numeric">' +
          it.amount +
          '</td><td class="data-table__col-numeric">' +
          lib.formatMoney(it.total_price) +
          "</td></tr>"
        );
      })
      .join("");
    var listHref = global.nav.resolve("pages/order-quotation.html");
    var payHref = global.nav.resolve("pages/order-quotation-payment.html?id=" + id);
    root.innerHTML =
      '<div class="crud-page">' +
      '<header class="crud-page-header">' +
      '<div class="crud-page-header__text"><h1 class="crud-page-header__title">' +
      lib.escapeHtml(row.sku || "#" + row.id) +
      '</h1><p class="crud-muted">' +
      lib.statusBadgeHtml(row.status, "sale") +
      "</p></div>" +
      '<div class="crud-page-header__actions"><a class="btn btn--outline" href="' +
      lib.escapeHtml(listHref) +
      '">' +
      t("crud.back") +
      "</a></div></header>" +
      '<div class="crud-form"><div class="form-field"><label>' +
      t("orderQuotation.colMember") +
      "</label><p>" +
      lib.escapeHtml(row.member_name || "—") +
      "</p></div>" +
      '<div class="form-field"><label>' +
      t("orderQuotation.formValidUntil") +
      "</label><p>" +
      lib.escapeHtml(row.valid_until || "—") +
      "</p></div>" +
      '<p class="tabular-nums"><strong>' +
      lib.formatMoney(row.grand_total || 0) +
      "</strong></p></div>" +
      '<table class="data-table"><thead><tr><th>SKU</th><th class="data-table__col-numeric">Qty</th><th class="data-table__col-numeric">Total</th></tr></thead><tbody>' +
      (itemRows || '<tr><td colspan="3">—</td></tr>') +
      "</tbody></table>" +
      '<div class="order-store-form__doc-actions">' +
      (row.status === "approved"
        ? '<a class="btn btn--primary" href="' +
          lib.escapeHtml(payHref) +
          '">' +
          t("orderQuotation.payNow") +
          "</a>"
        : "") +
      "</div></div>";
  }

  function boot() {
    if (
      !lib.mountAdminShell({
        module: PERM.module,
        type: PERM.type,
        titleKey: "orderQuotation.title",
        rootId: "order-quotation-detail-root",
        afterMount: render,
      })
    ) {
      return;
    }
    document.addEventListener("i18n:change", render);
  }

  global.orderQuotationDetailPage = { boot: boot };
})(window);

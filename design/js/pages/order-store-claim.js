(function (global) {
  var lib = global.orderLib;
  var PERM = { module: "order", type: "order_store_claim" };
  var state = { query: "", dateFrom: "", dateTo: "", category: "", page: 1, pageSize: 10 };

  function t(k, params) {
    if (params && global.i18n && global.i18n.format) return global.i18n.format(k, params);
    return lib.t(k);
  }

  function paymentRows() {
    return lib.activeRows("order_payment").filter(function (p) {
      return p.is_paid && lib.paymentItems(p.id).length > 0;
    });
  }

  function filtered() {
    var q = state.query.trim().toLowerCase();
    return paymentRows().filter(function (p) {
      if (state.category && p.payment_category !== state.category) return false;
      if (!lib.inDateRange(p.created_at, state.dateFrom, state.dateTo)) return false;
      var order = global.store.getById("order_list", p.order_list_id);
      if (!q) return true;
      return (
        String(p.sku || "").toLowerCase().indexOf(q) >= 0 ||
        String(order && order.member_name).toLowerCase().indexOf(q) >= 0
      );
    });
  }

  function categoryOptionsHtml() {
    return (
      '<option value="credit"' +
      (state.category === "credit" ? " selected" : "") +
      ">" +
      lib.escapeHtml(t("orderClaim.categoryCredit")) +
      '</option><option value="payment"' +
      (state.category === "payment" ? " selected" : "") +
      ">" +
      lib.escapeHtml(t("orderClaim.categoryPayment")) +
      "</option>"
    );
  }

  function render() {
    var root = document.getElementById("order-store-claim-root");
    if (!root) return;
    var allRows = filtered();
    var meta = lib.paginateRows(allRows, state.page, state.pageSize);
    state.page = meta.page;
    var rows = meta.rows;

    var body = rows
      .map(function (p) {
        var order = global.store.getById("order_list", p.order_list_id);
        var href = global.nav.resolve("pages/order-store-claim-form.html?id=" + p.id);
        var catLabel =
          p.payment_category === "credit"
            ? t("orderClaim.categoryCredit")
            : p.payment_category === "payment"
              ? t("orderClaim.categoryPayment")
              : p.payment_category;
        return (
          "<tr><td>" +
          lib.escapeHtml(p.sku || "") +
          "</td><td>" +
          lib.escapeHtml(order ? order.member_name : "—") +
          '</td><td class="data-table__col-numeric">' +
          lib.formatMoney(p.total_price) +
          "</td><td>" +
          lib.escapeHtml(catLabel) +
          "</td><td>" +
          lib.formatDateTimeSplit(p.created_at) +
          '</td><td class="data-table__actions-cell"><div class="crud-table__actions"><a class="crud-icon-btn" href="' +
          lib.escapeHtml(href) +
          '" aria-label="' +
          lib.escapeHtml(t("crud.edit")) +
          '"><img src="../assets/icons/pencil.svg" width="18" height="18" alt=""/></a></div></td></tr>'
        );
      })
      .join("");

    root.innerHTML =
      '<div class="crud-page"><header class="crud-page-header">' +
      '<div class="crud-page-header__text"><h1 class="crud-page-header__title">' +
      t("orderClaim.titlePick") +
      '</h1></div></header><div class="crud-toolbar">' +
      '<div class="crud-toolbar__row crud-toolbar__row--filters">' +
      '<input type="search" class="crud-toolbar__search" data-role="search" value="' +
      lib.escapeHtml(state.query) +
      '" data-i18n-placeholder="orderStore.search" placeholder="' +
      lib.escapeHtml(t("orderStore.search")) +
      '"/>' +
      lib.toolbarDateFilterHtml("date-from", "orderStore.dateFrom", state.dateFrom) +
      lib.toolbarDateFilterHtml("date-to", "orderStore.dateTo", state.dateTo) +
      lib.toolbarSelectOpenHtml("category", "orderClaim.colCategory", state.category, categoryOptionsHtml()) +
      '</div></div><div class="crud-table-wrap"><div class="crud-table-wrap__body"><table class="data-table crud-table"><thead><tr><th>' +
      t("orderClaim.colPaymentSku") +
      "</th><th>" +
      t("orderStore.colMember") +
      '</th><th class="data-table__col-numeric">' +
      t("orderStore.colTotal") +
      "</th><th>" +
      t("orderClaim.colCategory") +
      "</th><th>" +
      t("orderStore.colOrderedAt") +
      '</th><th class="data-table__actions-col"></th></tr></thead><tbody>' +
      (body || "<tr><td colspan=6>—</td></tr>") +
      "</tbody></table></div></div>" +
      '<nav class="crud-pagination" id="order-store-claim-pagination" aria-label="Pagination"></nav></div>';

    if (global.crudList) {
      global.crudList.renderPaginationBar(
        document.getElementById("order-store-claim-pagination"),
        { page: state.page, pageSize: state.pageSize },
        meta,
        function (patch) {
          if (patch.pageSize != null) state.pageSize = patch.pageSize;
          if (patch.page != null) state.page = patch.page;
          render();
        }
      );
    }
    if (global.i18n) global.i18n.init();
    bind(root);
  }

  function bind(root) {
    root.querySelector("[data-role=search]").addEventListener("input", function (e) {
      state.query = e.target.value;
      state.page = 1;
      render();
    });
    lib.bindToolbarDateInput(root.querySelector("[data-role=date-from]"), function (val) {
      state.dateFrom = val;
      state.page = 1;
      render();
    });
    lib.bindToolbarDateInput(root.querySelector("[data-role=date-to]"), function (val) {
      state.dateTo = val;
      state.page = 1;
      render();
    });
    root.querySelector("[data-role=category]").addEventListener("change", function (e) {
      state.category = e.target.value;
      state.page = 1;
      render();
    });
  }

  function boot() {
    if (global.crudList) state.pageSize = global.crudList.readStoredPageSize();
    if (
      !lib.mountAdminShell({
        module: PERM.module,
        type: PERM.type,
        titleKey: "orderClaim.titlePick",
        rootId: "order-store-claim-root",
        afterMount: render,
      })
    ) {
      return;
    }
    document.addEventListener("i18n:change", render);
    if (global.realtime) global.realtime.onMessage(render);
    document.addEventListener("store:change", function () {
      setTimeout(render, 0);
    });
  }

  global.orderStoreClaimPage = { boot: boot };
})(window);

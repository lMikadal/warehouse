(function (global) {
  var lib = global.orderLib;
  var PERM = { module: "order", type: "order_store_claim_list" };
  var state = {
    query: "",
    dateFrom: "",
    dateTo: "",
    type: "",
    status: "",
    page: 1,
    pageSize: 10,
  };

  var STATUS_GROUPS = {
    waiting: ["pending"],
    process: ["acknowledged", "waiting_supplier"],
    success: ["success"],
    reject: ["rejected", "cancelled"],
  };

  function t(k, params) {
    if (params && global.i18n && global.i18n.format) return global.i18n.format(k, params);
    return lib.t(k);
  }

  function can(action) {
    return lib.can(PERM.module, PERM.type, action);
  }

  function mapUiStatus(dbStatus) {
    var keys = Object.keys(STATUS_GROUPS);
    for (var i = 0; i < keys.length; i++) {
      if (STATUS_GROUPS[keys[i]].indexOf(dbStatus) >= 0) return keys[i];
    }
    return "waiting";
  }

  function filtered() {
    var q = state.query.trim().toLowerCase();
    return lib.activeRows("order_claim").filter(function (c) {
      if (state.type && c.type !== state.type) return false;
      if (state.status) {
        var allowed = STATUS_GROUPS[state.status] || [];
        if (allowed.indexOf(c.status) < 0) return false;
      }
      if (!lib.inDateRange(c.created_at, state.dateFrom, state.dateTo)) return false;
      if (!q) return true;
      var pay = global.store.getById("order_payment", c.order_payment_id);
      return (
        String(c.sku || "").toLowerCase().indexOf(q) >= 0 ||
        String(pay && pay.sku).toLowerCase().indexOf(q) >= 0
      );
    });
  }

  function counts() {
    var c = { waiting: 0, process: 0, success: 0, reject: 0, all: 0 };
    lib.activeRows("order_claim").forEach(function (row) {
      c.all++;
      var ui = mapUiStatus(row.status);
      if (c[ui] != null) c[ui]++;
    });
    return c;
  }

  function statusFilterHtml() {
    var cnt = counts();
    return ["", "waiting", "process", "success", "reject"]
      .map(function (st) {
        var label =
          st === ""
            ? t("orderStore.statusAll") + " (" + cnt.all + ")"
            : t("orderClaimStatus." + st) + " (" + (cnt[st] || 0) + ")";
        var badgeClass =
          st === "" ? "crud-badge crud-badge--inactive" : "crud-badge crud-badge--" + st;
        var active = state.status === st;
        return (
          '<button type="button" class="order-store-status-filter' +
          (active ? " is-active" : "") +
          '" data-st="' +
          lib.escapeHtml(st) +
          '"><span class="' +
          badgeClass +
          '">' +
          lib.escapeHtml(label) +
          "</span></button>"
        );
      })
      .join("");
  }

  function typeOptionsHtml() {
    return (
      '<option value="claim"' +
      (state.type === "claim" ? " selected" : "") +
      ">" +
      lib.escapeHtml(t("orderClaim.typeClaim")) +
      '</option><option value="return"' +
      (state.type === "return" ? " selected" : "") +
      ">" +
      lib.escapeHtml(t("orderClaim.typeReturn")) +
      "</option>"
    );
  }

  function render() {
    var root = document.getElementById("order-store-claim-list-root");
    if (!root) return;
    var allRows = filtered();
    var meta = lib.paginateRows(allRows, state.page, state.pageSize);
    state.page = meta.page;
    var pageRows = meta.rows;

    var body = pageRows
      .map(function (c) {
        var pay = global.store.getById("order_payment", c.order_payment_id);
        var order = pay ? global.store.getById("order_list", pay.order_list_id) : null;
        var href = pay
          ? global.nav.resolve("pages/order-store-claim-form.html?id=" + pay.id)
          : "#";
        var viewLabel = lib.escapeHtml(t("action.view"));
        return (
          "<tr><td>" +
          lib.escapeHtml(c.sku || "") +
          "</td><td>" +
          lib.formatDateTimeSplit(c.created_at) +
          "</td><td>" +
          lib.escapeHtml(pay && pay.sku) +
          "</td><td>" +
          lib.escapeHtml(order && order.member_name) +
          "</td><td>" +
          (c.type === "claim" ? t("orderClaim.typeClaim") : t("orderClaim.typeReturn")) +
          '</td><td class="data-table__col-center">' +
          t("orderClaimStatus." + mapUiStatus(c.status)) +
          '</td><td class="data-table__col-numeric">' +
          lib.formatMoney(c.total_price) +
          '</td><td class="data-table__actions-cell"><div class="crud-table__actions"><a href="' +
          lib.escapeHtml(href) +
          '" class="crud-icon-btn" aria-label="' +
          viewLabel +
          '" title="' +
          viewLabel +
          '"><img src="../assets/icons/file-text.svg" width="18" height="18" alt=""/></a>' +
          (can("delete")
            ? '<button type="button" class="crud-icon-btn crud-delete" data-del="' +
              c.id +
              '" aria-label="' +
              lib.escapeHtml(t("crud.delete")) +
              '"><img src="../assets/icons/trash-2.svg" width="18" height="18" alt=""/></button>'
            : "") +
          "</div></td></tr>"
        );
      })
      .join("");

    root.innerHTML =
      '<div class="crud-page"><header class="crud-page-header">' +
      '<div class="crud-page-header__text"><h1 class="crud-page-header__title">' +
      t("orderClaim.titleList") +
      '</h1></div></header><div class="crud-toolbar">' +
      '<div class="crud-toolbar__row crud-toolbar__row--filters">' +
      '<input type="search" class="crud-toolbar__search" data-role="search" value="' +
      lib.escapeHtml(state.query) +
      '" data-i18n-placeholder="orderStore.search" placeholder="' +
      lib.escapeHtml(t("orderStore.search")) +
      '"/>' +
      lib.toolbarDateFilterHtml("date-from", "orderStore.dateFrom", state.dateFrom) +
      lib.toolbarDateFilterHtml("date-to", "orderStore.dateTo", state.dateTo) +
      lib.toolbarSelectOpenHtml("type", "orderClaim.colType", state.type, typeOptionsHtml()) +
      "</div>" +
      '<div class="order-store-status-filters">' +
      statusFilterHtml() +
      '</div></div><div class="crud-table-wrap"><div class="crud-table-wrap__body"><table class="data-table crud-table"><thead><tr><th>' +
      t("orderClaim.colClaimSku") +
      "</th><th>" +
      t("orderStore.colOrderedAt") +
      "</th><th>" +
      t("orderClaim.colPaymentSku") +
      "</th><th>" +
      t("orderStore.colMember") +
      "</th><th>" +
      t("orderClaim.colType") +
      "</th>" +
      '<th class="data-table__col-center">' +
      t("orderStore.colStatus") +
      "</th>" +
      '<th class="data-table__col-numeric">' +
      t("orderStore.colTotal") +
      '</th><th class="data-table__actions-col"></th></tr></thead><tbody>' +
      (body || "<tr><td colspan=8>—</td></tr>") +
      "</tbody></table></div></div>" +
      '<nav class="crud-pagination" id="order-store-claim-list-pagination" aria-label="Pagination"></nav></div>';

    if (global.crudList) {
      global.crudList.renderPaginationBar(
        document.getElementById("order-store-claim-list-pagination"),
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
    root.querySelector("[data-role=type]").addEventListener("change", function (e) {
      state.type = e.target.value;
      state.page = 1;
      render();
    });
    root.querySelectorAll("[data-st]").forEach(function (btn) {
      btn.addEventListener("click", function () {
        state.status = btn.getAttribute("data-st");
        state.page = 1;
        render();
      });
    });
    root.querySelectorAll("[data-del]").forEach(function (btn) {
      btn.addEventListener("click", function () {
        if (!confirm(t("crud.confirmDelete"))) return;
        global.store.update("order_claim", Number(btn.getAttribute("data-del")), {
          deleted_at: lib.now(),
        });
        render();
      });
    });
  }

  function boot() {
    if (global.crudList) state.pageSize = global.crudList.readStoredPageSize();
    if (
      !lib.mountAdminShell({
        module: PERM.module,
        type: PERM.type,
        titleKey: "orderClaim.titleList",
        rootId: "order-store-claim-list-root",
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

  global.orderStoreClaimListPage = { boot: boot };
})(window);

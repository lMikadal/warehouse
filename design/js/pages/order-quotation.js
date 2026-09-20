(function (global) {
  var lib = global.orderLib;
  var PERM = { module: "order", type: "order_quotation" };
  var state = {
    query: "",
    dateFrom: "",
    dateTo: "",
    sellerId: "",
    status: "",
    page: 1,
    pageSize: 10,
  };

  function t(k, params) {
    if (params && global.i18n && global.i18n.format) return global.i18n.format(k, params);
    return lib.t(k);
  }

  function can(action) {
    return lib.can(PERM.module, PERM.type, action);
  }

  function activeQuotes() {
    return lib.activeRows("order_quotation");
  }

  function isOverdue(row) {
    if (!row.valid_until) return false;
    if (row.status !== "draft" && row.status !== "pending" && row.status !== "approved") {
      return false;
    }
    var today = new Date().toISOString().slice(0, 10);
    return String(row.valid_until) < today;
  }

  function receiptLocked(row) {
    return lib.activeRows("order_payment").some(function (p) {
      return p.order_quotation_id === row.id && p.is_paid;
    });
  }

  function fulfilled(row) {
    return lib.activeRows("order_list").some(function (o) {
      return o.order_quotation_id === row.id && o.fulfill_status === "success";
    });
  }

  function filteredRows() {
    var q = state.query.trim().toLowerCase();
    return activeQuotes()
      .filter(function (row) {
        if (state.status === "overdue") {
          if (!isOverdue(row)) return false;
        } else if (state.status && row.status !== state.status) return false;
        if (state.sellerId && String(row.created_by) !== String(state.sellerId)) return false;
        if (!lib.inDateRange(row.created_at, state.dateFrom, state.dateTo)) return false;
        if (!q) return true;
        return (
          String(row.sku || "").toLowerCase().indexOf(q) >= 0 ||
          String(row.member_name || "").toLowerCase().indexOf(q) >= 0
        );
      })
      .sort(function (a, b) {
        var ca = a.created_at || "";
        var cb = b.created_at || "";
        if (ca !== cb) return ca < cb ? 1 : -1;
        return Number(b.id) - Number(a.id);
      });
  }

  function statusCounts() {
    var counts = {
      all: 0,
      draft: 0,
      pending: 0,
      approved: 0,
      success: 0,
      cancelled: 0,
      rejected: 0,
      overdue: 0,
    };
    activeQuotes().forEach(function (row) {
      counts.all++;
      if (counts[row.status] != null) counts[row.status]++;
      if (isOverdue(row)) counts.overdue++;
    });
    return counts;
  }

  function statusTabsHtml(counts) {
    var tabs = ["", "success", "pending", "draft", "overdue", "cancelled", "rejected"];
    return tabs
      .map(function (st) {
        var count = st === "" ? counts.all : counts[st] || 0;
        var labelKey =
          st === ""
            ? "orderQuotation.statusAll"
            : st === "overdue"
              ? "orderQuotation.statusOverdue"
              : "orderSaleStatus." + st;
        var badgeClass =
          st === "" || st === "overdue"
            ? "crud-badge crud-badge--inactive"
            : "crud-badge crud-badge--" + st;
        var active = state.status === st;
        return (
          '<button type="button" class="order-store-status-filter' +
          (active ? " is-active" : "") +
          '" data-status="' +
          lib.escapeHtml(st) +
          '"><span class="' +
          badgeClass +
          '">' +
          lib.escapeHtml(t(labelKey) + " (" + count + ")") +
          "</span></button>"
        );
      })
      .join("");
  }

  function actionsHtml(row) {
    var viewHref = global.nav.resolve("pages/order-quotation-detail.html?id=" + row.id);
    var editHref = global.nav.resolve("pages/order-quotation-form.html?id=" + row.id);
    var locked = receiptLocked(row);
    var html = "";
    if (row.status === "draft" && can("update") && !locked) {
      html +=
        '<a class="btn btn--icon" href="' +
        lib.escapeHtml(editHref) +
        '" title="' +
        lib.escapeHtml(t("action.edit")) +
        '"><img src="../assets/icons/square-pen.svg" alt="" width="16" height="16"/></a>';
    }
    if (can("view")) {
      html +=
        '<a class="btn btn--icon" href="' +
        lib.escapeHtml(viewHref) +
        '" title="' +
        lib.escapeHtml(t("action.view")) +
        '"><img src="../assets/icons/eye.svg" alt="" width="16" height="16"/></a>';
    }
    if (
      (row.status === "draft" || row.status === "pending") &&
      can("update") &&
      !locked
    ) {
      html +=
        '<button type="button" class="btn btn--icon crud-delete" data-cancel="' +
        row.id +
        '" title="' +
        lib.escapeHtml(t("action.cancel")) +
        '"><img src="../assets/icons/trash-2.svg" alt="" width="16" height="16"/></button>';
    }
    return html;
  }

  function render() {
    var el = document.getElementById("order-quotation-root");
    if (!el) return;
    var rows = filteredRows();
    var meta = lib.paginateRows(rows, state.page, state.pageSize);
    state.page = meta.page;
    var pageRows = meta.rows;

    var counts = statusCounts();
    var sellerOpts = lib
      .activeRows("admin_user")
      .map(function (u) {
        return (
          '<option value="' +
          u.id +
          '"' +
          (String(state.sellerId) === String(u.id) ? " selected" : "") +
          ">" +
          lib.escapeHtml(u.username) +
          "</option>"
        );
      })
      .join("");

    var body = pageRows
      .map(function (row) {
        var sku = row.sku ? lib.escapeHtml(row.sku) : "—";
        var detailHref = global.nav.resolve("pages/order-quotation-detail.html?id=" + row.id);
        return (
          "<tr>" +
          '<td><a href="' +
          lib.escapeHtml(detailHref) +
          '">' +
          sku +
          "</a></td>" +
          "<td>" +
          lib.escapeHtml(row.member_name || "—") +
          "</td>" +
          "<td>" +
          lib.formatDateTimeSplit(row.created_at) +
          "</td>" +
          '<td class="data-table__col-numeric">' +
          lib.formatMoney(row.grand_total || 0) +
          "</td>" +
          '<td class="data-table__col-center">' +
          lib.statusBadgeHtml(row.status, "sale") +
          "</td>" +
          '<td class="data-table__col-center">' +
          (fulfilled(row)
            ? '<img src="../assets/icons/check.svg" alt="" width="16" height="16"/>'
            : "—") +
          "</td>" +
          "<td>" +
          lib.escapeHtml(lib.adminUserName(row.created_by)) +
          "</td>" +
          '<td class="data-table__actions-cell"><div class="crud-table__actions">' +
          actionsHtml(row) +
          "</div></td>" +
          "</tr>"
        );
      })
      .join("");

    el.innerHTML =
      '<div class="crud-page">' +
      '<header class="crud-page-header">' +
      '<div class="crud-page-header__text"><h1 class="crud-page-header__title">' +
      t("orderQuotation.title") +
      "</h1></div>" +
      (can("create")
        ? '<div class="crud-page-header__actions"><a class="btn btn--primary" href="' +
          lib.escapeHtml(global.nav.resolve("pages/order-quotation-form.html")) +
          '">' +
          t("orderQuotation.create") +
          "</a></div>"
        : "") +
      "</header>" +
      '<div class="crud-toolbar">' +
      '<div class="crud-toolbar__row crud-toolbar__row--filters">' +
      '<input type="search" class="crud-toolbar__search" data-i18n-placeholder="search.placeholder" placeholder="' +
      lib.escapeHtml(t("search.placeholder")) +
      '" value="' +
      lib.escapeHtml(state.query) +
      '" data-role="search" />' +
      lib.toolbarDateFilterHtml("date-from", "orderQuotation.dateRangePlaceholder", state.dateFrom) +
      lib.toolbarDateFilterHtml("date-to", "orderQuotation.dateRangePlaceholder", state.dateTo) +
      lib.toolbarSelectOpenHtml("seller", "orderQuotation.colSeller", state.sellerId, sellerOpts) +
      "</div>" +
      '<div class="order-store-status-filters">' +
      statusTabsHtml(counts) +
      "</div></div>" +
      '<div class="crud-table-wrap"><div class="crud-table-wrap__body"><table class="data-table crud-table"><thead><tr>' +
      "<th>" +
      t("orderQuotation.colSku") +
      "</th><th>" +
      t("orderQuotation.colMember") +
      "</th><th>" +
      t("orderQuotation.colCreatedAt") +
      '</th><th class="data-table__col-numeric">' +
      t("orderQuotation.colTotal") +
      '</th><th class="data-table__col-center">' +
      t("orderQuotation.colStatus") +
      '</th><th class="data-table__col-center">' +
      t("orderQuotation.colFulfill") +
      "</th><th>" +
      t("orderQuotation.colSeller") +
      '</th><th class="data-table__actions-col"></th></tr></thead><tbody>' +
      (body || '<tr><td colspan="8">—</td></tr>') +
      "</tbody></table></div></div>" +
      '<nav class="crud-pagination" id="order-quotation-pagination" aria-label="Pagination"></nav></div>';

    if (global.crudList) {
      global.crudList.renderPaginationBar(
        document.getElementById("order-quotation-pagination"),
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
    bindEvents(el);
  }

  function setCancelled(id) {
    var rows = global.store.getAll("order_quotation");
    var idx = rows.findIndex(function (r) {
      return r.id === id;
    });
    if (idx < 0) return;
    global.store.updateAt("order_quotation", idx, {
      status: "cancelled",
      updated_at: new Date().toISOString(),
    });
  }

  function bindEvents(root) {
    root.querySelector("[data-role=search]").addEventListener("input", function (e) {
      state.query = e.target.value;
      state.page = 1;
      render();
    });
    root.querySelector("[data-role=date-from]").addEventListener("change", function (e) {
      state.dateFrom = e.target.value;
      state.page = 1;
      render();
    });
    root.querySelector("[data-role=date-to]").addEventListener("change", function (e) {
      state.dateTo = e.target.value;
      state.page = 1;
      render();
    });
    root.querySelector("[data-role=seller]").addEventListener("change", function (e) {
      state.sellerId = e.target.value;
      state.page = 1;
      render();
    });
    root.querySelectorAll("[data-status]").forEach(function (btn) {
      btn.addEventListener("click", function () {
        state.status = btn.getAttribute("data-status");
        state.page = 1;
        render();
      });
    });
    root.querySelectorAll("[data-cancel]").forEach(function (btn) {
      btn.addEventListener("click", function () {
        var id = Number(btn.getAttribute("data-cancel"));
        if (!confirm(t("orderQuotation.confirmCancel"))) return;
        setCancelled(id);
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
        titleKey: "orderQuotation.title",
        rootId: "order-quotation-root",
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

  global.orderQuotationPage = { boot: boot };
})(window);

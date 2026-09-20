(function (global) {
  var lib = global.orderLib;
  var PERM = { module: "order", type: "order_store" };
  var state = {
    query: "",
    dateFrom: "",
    dateTo: "",
    sellerId: "",
    status: "",
    page: 1,
    pageSize: 10,
    expanded: {},
  };

  function t(k, params) {
    if (params && global.i18n && global.i18n.format) return global.i18n.format(k, params);
    return lib.t(k);
  }

  function can(action) {
    return lib.can(PERM.module, PERM.type, action);
  }

  function paginateParents(rows) {
    var meta = lib.paginateRows(rows, state.page, state.pageSize);
    state.page = meta.page;
    return meta;
  }

  function parentsFiltered() {
    var q = state.query.trim().toLowerCase();
    return lib
      .activeRows("order_list")
      .filter(function (o) {
        return o.parent_id == null;
      })
      .filter(function (o) {
        if (state.status && o.status !== state.status) {
          if (state.status && lib.childCount(o.id) > 0) {
            var kids = lib.activeRows("order_list").filter(function (c) {
              return c.parent_id === o.id && c.status === state.status;
            });
            if (!kids.length) return false;
          } else if (o.status !== state.status) return false;
        }
        if (state.sellerId && String(o.created_by) !== String(state.sellerId)) return false;
        if (!lib.inDateRange(o.ordered_at || o.created_at, state.dateFrom, state.dateTo)) return false;
        if (!q) return true;
        return (
          lib.formatOrderSku(o.sku).toLowerCase().indexOf(q) >= 0 ||
          String(o.member_name || "").toLowerCase().indexOf(q) >= 0
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
    var counts = { all: 0, draft: 0, pending: 0, success: 0, cancelled: 0, rejected: 0 };
    lib.activeRows("order_list").forEach(function (o) {
      counts.all++;
      if (counts[o.status] != null) counts[o.status]++;
    });
    return counts;
  }

  function familyRows(parent) {
    var rootId = parent.id;
    var kids = lib
      .activeRows("order_list")
      .filter(function (c) {
        return c.parent_id === rootId;
      })
      .sort(function (a, b) {
        return String(a.created_at).localeCompare(String(b.created_at));
      });
    var rows = [parent].concat(kids);
    if (state.status) {
      rows = rows.filter(function (r) {
        return r.status === state.status;
      });
    }
    return rows;
  }

  function sellerSelectHtml(sellerOpts) {
    return lib.toolbarSelectOpenHtml("seller", "orderStore.colSeller", state.sellerId, sellerOpts);
  }

  function render() {
    var el = document.getElementById("order-store-root");
    if (!el) return;
    var parents = parentsFiltered();
    var meta = paginateParents(parents);
    var pageParents = meta.rows;
    var start = meta.start;
    var counts = statusCounts();

    var statusTabs = ["", "draft", "pending", "success", "cancelled", "rejected"]
      .map(function (st) {
        var count = st === "" ? counts.all : counts[st] || 0;
        var label =
          (st === "" ? t("orderStore.statusAll") : t("orderSaleStatus." + st)) +
          " (" +
          count +
          ")";
        var badgeClass =
          st === ""
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
          lib.escapeHtml(label) +
          "</span></button>"
        );
      })
      .join("");

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

    var body = "";
    pageParents.forEach(function (parent, idx) {
      var cc = lib.childCount(parent.id);
      var expanded = !!state.expanded[parent.id];
      var fam = expanded && cc > 0 ? familyRows(parent) : [parent];
      var agg = lib.aggregateFamilyTotals(parent.id);
      var rootMember = lib.memberDisplayName(parent);

      fam.forEach(function (row, fi) {
        var isChild = fi > 0 || (cc > 0 && expanded && row.id !== parent.id);
        var isHead = fi === 0;
        var totals = isHead && cc > 0 ? agg : lib.orderTotals(row.id);
        var familyBase = cc > 0 ? lib.familyBaseSku(parent) : "";
        var sku;
        if (isHead && cc > 0 && fi === 0) {
          sku = familyBase || lib.formatOrderSku(row.sku || "") || "—";
        } else if (cc > 0 && expanded && fi > 0) {
          sku = lib.formatFamilySplitSku(familyBase, fi);
        } else if (row.sku) {
          sku = lib.formatOrderSku(row.sku);
        } else {
          sku = "—";
        }
        var chevron = expanded ? "chevron-down.svg" : "chevron-right.svg";
        body +=
          "<tr" +
          (isChild ? ' class="crud-table__child"' : "") +
          ">" +
          '<td class="wh-expand-cell">' +
          (isHead && cc > 0
            ? '<button type="button" class="btn btn--icon wh-expand" data-expand="' +
              parent.id +
              '" aria-expanded="' +
              (expanded ? "true" : "false") +
              '"><img src="../assets/icons/' +
              chevron +
              '" alt="" width="16" height="16" /></button>'
            : "") +
          "</td>" +
          "<td>" +
          (isChild ? '<span class="crud-table__indent"></span>' : "") +
          lib.escapeHtml(sku) +
          "</td>" +
          "<td>" +
          (isHead ? lib.escapeHtml(rootMember) : "—") +
          "</td>" +
          "<td>" +
          (isHead ? lib.formatDateTimeSplit(row.ordered_at || row.created_at) : "—") +
          "</td>" +
          '<td class="data-table__col-numeric">' +
          totals.item_count +
          "</td>" +
          '<td class="data-table__col-numeric">' +
          lib.formatMoney(totals.total_price) +
          "</td>" +
          '<td class="data-table__col-center">' +
          (isHead && cc > 0 ? "" : lib.statusBadgeHtml(row.status, "sale")) +
          "</td>" +
          "<td>" +
          (isHead ? lib.escapeHtml(lib.adminUserName(row.created_by)) : "—") +
          "</td>" +
          '<td class="data-table__actions-cell"><div class="crud-table__actions">' +
          actionsHtml(row, isHead && cc > 0) +
          "</div></td>" +
          "</tr>";
      });
    });

    el.innerHTML =
      '<div class="crud-page">' +
      '<header class="crud-page-header">' +
      '<div class="crud-page-header__text"><h1 class="crud-page-header__title">' +
      t("orderStore.title") +
      "</h1></div>" +
      (can("create")
        ? '<div class="crud-page-header__actions"><a class="btn btn--primary crud-page-header__create" href="' +
          lib.escapeHtml(global.nav.resolve("pages/order-store-form.html")) +
          '">' +
          t("orderStore.create") +
          "</a></div>"
        : "") +
      "</header>" +
      '<div class="crud-toolbar">' +
      '<div class="crud-toolbar__row crud-toolbar__row--filters">' +
      '<input type="search" class="crud-toolbar__search" data-i18n-placeholder="orderStore.search" placeholder="' +
      lib.escapeHtml(t("orderStore.search")) +
      '" value="' +
      lib.escapeHtml(state.query) +
      '" data-role="search" />' +
      lib.toolbarDateFilterHtml("date-from", "orderStore.dateFrom", state.dateFrom) +
      lib.toolbarDateFilterHtml("date-to", "orderStore.dateTo", state.dateTo) +
      sellerSelectHtml(sellerOpts) +
      "</div>" +
      '<div class="order-store-status-filters">' +
      statusTabs +
      "</div></div>" +
      '<div class="crud-table-wrap"><div class="crud-table-wrap__body"><table class="data-table crud-table"><thead><tr>' +
      '<th class="wh-expand-col" aria-hidden="true"></th><th>' +
      t("orderStore.colSku") +
      "</th><th>" +
      t("orderStore.colMember") +
      "</th><th>" +
      t("orderStore.colOrderedAt") +
      '</th><th class="data-table__col-numeric">' +
      t("orderStore.colItems") +
      '</th><th class="data-table__col-numeric">' +
      t("orderStore.colTotal") +
      '</th><th class="data-table__col-center">' +
      t("orderStore.colStatus") +
      "</th><th>" +
      t("orderStore.colSeller") +
      '</th><th class="data-table__actions-col"></th></tr></thead><tbody>' +
      (body || '<tr><td colspan="9">—</td></tr>') +
      "</tbody></table></div></div>" +
      '<nav class="crud-pagination" id="order-store-pagination" aria-label="Pagination"></nav></div>';

    if (global.crudList) {
      global.crudList.renderPaginationBar(
        document.getElementById("order-store-pagination"),
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

  function actionsHtml(row, familyHead) {
    var href = global.nav.resolve("pages/order-store-form.html?id=" + row.id);
    var viewLabel = lib.escapeHtml(t("action.view"));
    var html = "";
    if (can("view")) {
      html +=
        '<a class="crud-icon-btn" href="' +
        lib.escapeHtml(href) +
        '" aria-label="' +
        viewLabel +
        '" title="' +
        viewLabel +
        '"><img src="../assets/icons/file-text.svg" alt="" width="18" height="18"/></a>';
    }
    if (can("update")) {
      if (row.status === "draft") {
        html +=
          '<a class="crud-icon-btn" href="' +
          lib.escapeHtml(href) +
          '" aria-label="' +
          lib.escapeHtml(t("crud.edit")) +
          '" title="' +
          lib.escapeHtml(t("crud.edit")) +
          '"><img src="../assets/icons/pencil.svg" alt="" width="18" height="18"/></a>';
      }
      if (row.status === "draft" || row.status === "pending") {
        html +=
          '<button type="button" class="crud-icon-btn crud-delete" data-cancel="' +
          row.id +
          '" data-family="' +
          (familyHead ? "1" : "0") +
          '" aria-label="' +
          lib.escapeHtml(t("crud.cancel")) +
          '" title="' +
          lib.escapeHtml(t("crud.cancel")) +
          '"><img src="../assets/icons/x.svg" alt="" width="18" height="18"/></button>';
      }
      if (row.status === "cancelled" || row.status === "rejected") {
        html +=
          '<button type="button" class="crud-icon-btn" data-reset="' +
          row.id +
          '" aria-label="' +
          lib.escapeHtml(t("orderStore.confirmReset")) +
          '"><img src="../assets/icons/rotate-ccw.svg" alt="" width="18" height="18"/></button>';
      }
    }
    return html;
  }

  function setStatus(id, status) {
    global.store.update("order_list", id, { status: status, updated_at: lib.now() });
  }

  function cancelFamily(rootId) {
    familyRows(global.store.getById("order_list", rootId)).forEach(function (r) {
      setStatus(r.id, "cancelled");
    });
  }

  function bindEvents(root) {
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
    root.querySelectorAll(".wh-expand[data-expand]").forEach(function (btn) {
      btn.addEventListener("click", function () {
        var id = Number(btn.getAttribute("data-expand"));
        state.expanded[id] = !state.expanded[id];
        render();
      });
    });
    root.querySelectorAll("[data-cancel]").forEach(function (btn) {
      btn.addEventListener("click", function () {
        var id = Number(btn.getAttribute("data-cancel"));
        var fam = btn.getAttribute("data-family") === "1";
        if (!confirm(t("orderStore.confirmCancel"))) return;
        if (fam) cancelFamily(id);
        else setStatus(id, "cancelled");
        render();
      });
    });
    root.querySelectorAll("[data-reset]").forEach(function (btn) {
      btn.addEventListener("click", function () {
        var id = Number(btn.getAttribute("data-reset"));
        if (!confirm(t("orderStore.confirmReset"))) return;
        setStatus(id, "draft");
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
        titleKey: "orderStore.title",
        rootId: "order-store-root",
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

  global.orderStorePage = { boot: boot };
})(window);

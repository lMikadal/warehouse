(function (global) {
  var lib = global.orderLib;
  var dlib = global.orderDeliveryLib;
  var PERM = { module: "order", type: "order_order" };
  var state = {
    query: "",
    dateFrom: "",
    dateTo: "",
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

  function pickableOrders() {
    return lib.activeRows("order_order").filter(function (o) {
      return o.status === "pending" || o.status === "success";
    });
  }

  function filtered() {
    var q = state.query.trim().toLowerCase();
    return pickableOrders().filter(function (o) {
      if (state.status && o.fulfill_status !== state.status) return false;
      if (!lib.inDateRange(o.ordered_at || o.created_at, state.dateFrom, state.dateTo)) return false;
      if (!q) return true;
      return (
        lib.formatOrderSku(o.sku).toLowerCase().indexOf(q) >= 0 ||
        String(o.member_name || "").toLowerCase().indexOf(q) >= 0
      );
    });
  }

  function fulfillCounts() {
    var counts = { all: 0, pending: 0, in_progress: 0, success: 0, fail: 0 };
    pickableOrders().forEach(function (o) {
      counts.all++;
      if (counts[o.fulfill_status] != null) counts[o.fulfill_status]++;
    });
    return counts;
  }

  function statusFilterHtml() {
    var counts = fulfillCounts();
    return ["", "pending", "in_progress", "success", "fail"]
      .map(function (st) {
        var count = st === "" ? counts.all : counts[st] || 0;
        var label =
          (st === "" ? t("orderStore.statusAll") : t("orderFulfillStatus." + st)) +
          " (" +
          count +
          ")";
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

  function render() {
    var root = document.getElementById("order-order-root");
    if (!root) return;
    var activeEl = document.activeElement;
    var restoreSearchFocus =
      activeEl &&
      activeEl.getAttribute &&
      activeEl.getAttribute("data-role") === "search" &&
      root.contains(activeEl);
    var restoreSearchCaret = restoreSearchFocus ? activeEl.selectionStart : null;
    var allRows = filtered();
    var meta = lib.paginateRows(allRows, state.page, state.pageSize);
    state.page = meta.page;
    var pageRows = meta.rows;
    var paymentsByOrder = {};
    pageRows.forEach(function (o) {
      paymentsByOrder[o.id] = lib.paymentsForOrder(o.id);
    });
    var flat = dlib.flattenPaymentRows(pageRows, state.expanded, paymentsByOrder);

    var body = flat
      .map(function (r) {
        if (r.kind === "parent") {
          var pays = paymentsByOrder[r.id] || [];
          var tot = lib.orderTotals(r.id);
          var expanded = !!state.expanded[r.id];
          var chevron = expanded ? "chevron-down.svg" : "chevron-right.svg";
          return (
            "<tr>" +
            '<td class="wh-expand-cell">' +
            (pays.length > 1
              ? '<button type="button" class="btn btn--icon wh-expand" data-expand="' +
                r.id +
                '" aria-expanded="' +
                (expanded ? "true" : "false") +
                '"><img src="../assets/icons/' +
                chevron +
                '" alt="" width="16" height="16" /></button>'
              : "") +
            '</td><td class="data-table__col-center">' +
            lib.escapeHtml(lib.familySku(r.sku || "") || "—") +
            "</td><td>" +
            lib.escapeHtml(lib.memberDisplayName(r)) +
            '</td><td class="data-table__col-numeric">' +
            tot.item_count +
            " / " +
            tot.piece_count +
            '</td><td class="data-table__col-numeric">' +
            lib.formatMoney(tot.total_price) +
            '</td><td class="data-table__col-center">' +
            lib.statusBadgeHtml(r.fulfill_status, "fulfill") +
            "</td><td>" +
            (r.fulfill_status !== "pending"
              ? lib.escapeHtml(lib.adminUserName(r.updated_by)) +
                "<br>" +
                lib.formatDateTimeSplit(r.updated_at)
              : "—") +
            "</td><td>" +
            (pays.length === 1 && r.fulfill_status === "success"
              ? lib.escapeHtml(pays[0].sku || "")
              : pays.length > 1
                ? "—"
                : lib.escapeHtml((pays[0] && pays[0].sku) || "—")) +
            '</td><td class="data-table__actions-cell"><div class="crud-table__actions">' +
            actionsHtml(r, null) +
            "</div></td></tr>"
          );
        }
        var childOrder = global.store.getById("order_order", r.orderId);
        var payTot = lib.paymentTotals(r.id);
        return (
          "<tr class='crud-table__child'><td class='wh-expand-cell'></td><td class='data-table__col-center'>" +
          lib.escapeHtml(lib.formatOrderSku(r.sku || "")) +
          "</td><td>" +
          lib.escapeHtml(childOrder ? lib.memberDisplayName(childOrder) : "—") +
          '</td><td class="data-table__col-numeric">' +
          payTot.item_count +
          " / " +
          payTot.piece_count +
          '</td><td class="data-table__col-numeric">' +
          lib.formatMoney(r.total_price) +
          '</td><td class="data-table__col-center"></td><td>—</td><td>' +
          lib.escapeHtml(lib.formatOrderSku(r.sku || "")) +
          '</td><td class="data-table__actions-cell"><div class="crud-table__actions">' +
          actionsHtml(r, r.orderId) +
          "</div></td></tr>"
        );
      })
      .join("");

    root.innerHTML =
      '<div class="crud-page"><header class="crud-page-header">' +
      '<div class="crud-page-header__text"><h1 class="crud-page-header__title">' +
      t("orderOrder.title") +
      '</h1></div></header><div class="crud-toolbar">' +
      '<div class="crud-toolbar__row crud-toolbar__row--filters">' +
      '<input type="search" class="crud-toolbar__search" data-role="search" value="' +
      lib.escapeHtml(state.query) +
      '" data-i18n-placeholder="orderStore.search" placeholder="' +
      lib.escapeHtml(t("orderStore.search")) +
      '" />' +
      lib.toolbarDateFilterHtml("date-from", "orderStore.dateFrom", state.dateFrom) +
      lib.toolbarDateFilterHtml("date-to", "orderStore.dateTo", state.dateTo) +
      "</div>" +
      '<div class="order-store-status-filters">' +
      statusFilterHtml() +
      "</div></div>" +
      '<div class="crud-table-wrap"><div class="crud-table-wrap__body"><table class="data-table crud-table"><thead><tr>' +
      '<th class="wh-expand-col" aria-hidden="true"></th>' +
      '<th class="data-table__col-center">' +
      t("orderOrder.colSku") +
      "</th><th>" +
      t("orderStore.colMember") +
      '</th><th class="data-table__col-numeric">' +
      t("orderStore.colItems") +
      '</th><th class="data-table__col-numeric">' +
      t("orderStore.colTotal") +
      '</th><th class="data-table__col-center">' +
      t("orderStore.colStatus") +
      "</th><th>" +
      t("orderOrder.colVerified") +
      "</th><th>" +
      t("orderOrder.colDocNo") +
      '</th><th class="data-table__actions-col" data-i18n="orderForm.colManage">' +
      t("orderForm.colManage") +
      "</th></tr></thead><tbody>" +
      (body || "<tr><td colspan=9>—</td></tr>") +
      "</tbody></table></div></div>" +
      '<nav class="crud-pagination" id="order-order-pagination" aria-label="Pagination"></nav></div>';

    if (global.crudList) {
      global.crudList.renderPaginationBar(
        document.getElementById("order-order-pagination"),
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
    if (restoreSearchFocus) {
      var searchRestore = root.querySelector("[data-role=search]");
      if (searchRestore) {
        searchRestore.focus();
        var caretPos =
          restoreSearchCaret != null ? restoreSearchCaret : searchRestore.value.length;
        try {
          searchRestore.setSelectionRange(caretPos, caretPos);
        } catch (ignore) {}
      }
    }
  }

  function fulfillStatusForRow(r, orderIdForChild) {
    if (r.kind === "parent") return r.fulfill_status;
    var order = global.store.getById("order_order", orderIdForChild);
    return order ? order.fulfill_status : "";
  }

  function actionsHtml(r, orderIdForChild) {
    var oid = r.kind === "child" ? orderIdForChild : r.id;
    var payId = r.kind === "child" ? r.id : null;
    var viewHref =
      global.nav.resolve("pages/order-order-payment.html?orderId=" + oid + "&mode=view") +
      (payId ? "&paymentId=" + payId : "");
    var viewLabel = lib.escapeHtml(t("action.view"));
    var pickLabel = lib.escapeHtml(t("orderOrder.startPicking"));
    var fulfill = fulfillStatusForRow(r, orderIdForChild);
    var pickActive =
      can("update") && (fulfill === "pending" || fulfill === "in_progress");
    var pickHref = global.nav.resolve("pages/order-order-form.html?ids=" + oid);
    var html =
      '<a class="crud-icon-btn crud-icon-btn--success-outline" href="' +
      lib.escapeHtml(viewHref) +
      '" aria-label="' +
      viewLabel +
      '" title="' +
      viewLabel +
      '"><img src="../assets/icons/file-text.svg" width="18" height="18" alt=""/></a>';
    if (!can("update")) return html;
    if (pickActive) {
      html +=
        '<a class="crud-icon-btn crud-icon-btn--primary" href="' +
        lib.escapeHtml(pickHref) +
        '" aria-label="' +
        pickLabel +
        '" title="' +
        pickLabel +
        '"><img src="../assets/icons/pencil.svg" width="18" height="18" alt=""/></a>';
    } else {
      html +=
        '<span class="crud-icon-btn is-inert" aria-disabled="true" title="' +
        pickLabel +
        '"><img src="../assets/icons/pencil.svg" width="18" height="18" alt=""/></span>';
    }
    return html;
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
    root.querySelectorAll("[data-st]").forEach(function (btn) {
      btn.addEventListener("click", function () {
        state.status = btn.getAttribute("data-st");
        state.page = 1;
        render();
      });
    });
    root.querySelectorAll("[data-expand]").forEach(function (btn) {
      btn.addEventListener("click", function () {
        var id = Number(btn.getAttribute("data-expand"));
        state.expanded[id] = !state.expanded[id];
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
        titleKey: "orderOrder.title",
        rootId: "order-order-root",
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

  global.orderOrderPage = { boot: boot };
})(window);

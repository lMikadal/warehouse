(function (global) {
  var lib = global.memberSettingLib;
  var PERM_MODULE = "member";
  var PERM_TYPE = "member_user";

  var state = {
    query: "",
    dateFrom: "",
    dateTo: "",
    businessId: "",
    statusFilter: "",
    page: 1,
    pageSize: 10,
    sortKey: null,
    sortDir: null,
  };

  var confirmOverlay = null;
  var pendingDeleteId = null;

  function t(key, params) {
    if (!global.i18n) return key;
    return params ? global.i18n.format(key, params) : global.i18n.t(key);
  }

  function can(action) {
    return global.permissions && global.permissions.canAction(PERM_MODULE, PERM_TYPE, action);
  }

  function escapeHtml(s) {
    return lib.escapeHtml(s);
  }

  function escapeAttr(s) {
    return escapeHtml(String(s == null ? "" : s));
  }

  function now() {
    return lib.now();
  }

  function actorId() {
    var u = global.auth && global.auth.getUser();
    return u ? u.id : 1;
  }

  function activeMembers() {
    return lib.activeRows("member_user");
  }

  function businessIdsForMember(memberId) {
    var relIds = {};
    global.store.getAll("member_user_setting").forEach(function (r) {
      if (r.member_user_id === memberId) relIds[r.member_setting_relation_id] = true;
    });
    var ids = [];
    lib.activeRows("member_setting_relation").forEach(function (rel) {
      if (relIds[rel.id] && ids.indexOf(rel.business_id) < 0) ids.push(rel.business_id);
    });
    return ids;
  }

  function businessNames(memberId) {
    return businessIdsForMember(memberId)
      .map(function (id) {
        return lib.businessName(id);
      })
      .filter(Boolean);
  }

  function inDateRange(iso, from, to) {
    if (!iso) return !from && !to;
    var day = String(iso).slice(0, 10);
    if (from && day < from) return false;
    if (to && day > to) return false;
    return true;
  }

  function isThisMonth(iso) {
    if (!iso) return false;
    var d = new Date(iso);
    if (isNaN(d.getTime())) return false;
    var nowD = new Date();
    return d.getFullYear() === nowD.getFullYear() && d.getMonth() === nowD.getMonth();
  }

  function filteredRows() {
    var q = state.query.trim().toLowerCase();
    var biz = state.businessId ? Number(state.businessId) : null;
    return activeMembers()
      .filter(function (row) {
        if (state.statusFilter === "active" && !row.is_active) return false;
        if (state.statusFilter === "inactive" && row.is_active) return false;
        if (!inDateRange(row.created_at, state.dateFrom, state.dateTo)) return false;
        if (biz && businessIdsForMember(row.id).indexOf(biz) < 0) return false;
        if (!q) return true;
        var names = businessNames(row.id).join(" ").toLowerCase();
        return (
          String(row.name || "").toLowerCase().indexOf(q) >= 0 ||
          String(row.sku || "").toLowerCase().indexOf(q) >= 0 ||
          String(row.tel || "").toLowerCase().indexOf(q) >= 0 ||
          names.indexOf(q) >= 0
        );
      })
      .sort(function (a, b) {
        var ca = a.created_at || "";
        var cb = b.created_at || "";
        if (ca !== cb) return ca < cb ? -1 : 1;
        return a.id - b.id;
      });
  }

  function compareRows(a, b, key) {
    var av;
    var bv;
    if (key === "name") {
      av = String(a.name || "").toLowerCase();
      bv = String(b.name || "").toLowerCase();
    } else if (key === "tel") {
      av = String(a.tel || "");
      bv = String(b.tel || "");
    } else if (key === "business") {
      av = businessNames(a.id).join(", ").toLowerCase();
      bv = businessNames(b.id).join(", ").toLowerCase();
    } else if (key === "is_active") {
      av = a.is_active ? 1 : 0;
      bv = b.is_active ? 1 : 0;
    } else if (key === "created_at") {
      av = a.created_at || "";
      bv = b.created_at || "";
    } else {
      av = a[key];
      bv = b[key];
    }
    if (av < bv) return -1;
    if (av > bv) return 1;
    return 0;
  }

  function sortedRows(rows) {
    if (!state.sortKey || !state.sortDir) return rows;
    var dir = state.sortDir === "desc" ? -1 : 1;
    return rows.slice().sort(function (a, b) {
      var cmp = compareRows(a, b, state.sortKey);
      if (cmp !== 0) return cmp * dir;
      return a.id - b.id;
    });
  }

  function paginate(rows) {
    var total = rows.length;
    var totalPages = Math.max(1, Math.ceil(total / state.pageSize) || 1);
    if (state.page > totalPages) state.page = totalPages;
    if (state.page < 1) state.page = 1;
    var start = (state.page - 1) * state.pageSize;
    return {
      rows: rows.slice(start, start + state.pageSize),
      total: total,
      totalPages: totalPages,
    };
  }

  function sortIcon(colId) {
    if (state.sortKey !== colId) return "arrow-up-down";
    return state.sortDir === "desc" ? "arrow-down" : "arrow-up";
  }

  function sortAria(colId) {
    if (state.sortKey !== colId) return "none";
    return state.sortDir === "desc" ? "descending" : "ascending";
  }

  function cycleSort(colId) {
    if (state.sortKey !== colId) {
      state.sortKey = colId;
      state.sortDir = "asc";
    } else if (state.sortDir === "asc") {
      state.sortDir = "desc";
    } else {
      state.sortKey = null;
      state.sortDir = null;
    }
    state.page = 1;
    render();
  }

  function sortTh(colId, labelKey, extraClass) {
    return (
      '<th class="data-table__sort-col' +
      (extraClass ? " " + extraClass : "") +
      '">' +
      '<button type="button" class="data-table__sort-btn" data-sort-key="' +
      escapeHtml(colId) +
      '" aria-sort="' +
      sortAria(colId) +
      '"><span data-i18n="' +
      escapeHtml(labelKey) +
      '"></span>' +
      '<img src="../assets/icons/' +
      sortIcon(colId) +
      '.svg" alt="" width="14" height="14" class="data-table__sort-icon" /></button></th>'
    );
  }

  function statusSwitchHtml(row) {
    return (
      '<label class="crud-switch">' +
      '<input type="checkbox" role="switch" class="member-user-status" data-id="' +
      row.id +
      '"' +
      (row.is_active ? " checked" : "") +
      (can("update") ? "" : " disabled") +
      " />" +
      '<span class="crud-switch__track" aria-hidden="true"><span class="crud-switch__thumb"></span></span></label>'
    );
  }

  function statCard(icon, iconClass, labelKey, value, unitKey) {
    return (
      '<div class="member-user-stat">' +
      '<span class="member-user-stat__icon' +
      (iconClass ? " " + iconClass : "") +
      '"><img src="../assets/icons/' +
      icon +
      '.svg" alt="" width="20" height="20" /></span>' +
      "<div><p class=\"member-user-stat__label\" data-i18n=\"" +
      labelKey +
      '"></p>' +
      '<p class="member-user-stat__value">' +
      escapeHtml(String(value)) +
      ' <span class="member-user-stat__unit" data-i18n="' +
      unitKey +
      '"></span></p></div></div>'
    );
  }

  function businessOptionsHtml() {
    var opts = lib
      .activeRows("member_setting_business")
      .filter(function (r) {
        return r.is_active;
      })
      .map(function (r) {
        var sel = String(state.businessId) === String(r.id) ? " selected" : "";
        return (
          '<option value="' +
          r.id +
          '"' +
          sel +
          ">" +
          escapeHtml(lib.businessName(r.id)) +
          "</option>"
        );
      })
      .join("");
    return (
      '<option value="">' +
      escapeHtml(t("memberUser.business")) +
      "</option>" +
      opts
    );
  }

  function statusFilterBtnHtml(value, i18nKey) {
    var active = state.statusFilter === value;
    return (
      '<button type="button" class="crud-status-filter__btn' +
      (active ? " crud-status-filter__btn--active" : "") +
      '" data-status-filter="' +
      escapeAttr(value) +
      '"' +
      (active ? ' aria-pressed="true"' : ' aria-pressed="false"') +
      '><span data-i18n="' +
      escapeAttr(i18nKey) +
      '"></span></button>'
    );
  }

  function pageHeaderHtml() {
    var actions = "";
    if (can("import") || can("export") || can("create")) {
      actions = '<div class="crud-page-header__actions">';
      if (can("export")) {
        actions +=
          '<button type="button" class="btn crud-page-header__export" id="mu-export">' +
          '<img src="../assets/icons/download.svg" alt="" width="16" height="16" />' +
          '<span data-i18n="crud.export"></span></button>';
      }
      if (can("import")) {
        actions +=
          '<button type="button" class="btn crud-page-header__import" id="mu-import">' +
          '<img src="../assets/icons/upload.svg" alt="" width="16" height="16" />' +
          '<span data-i18n="crud.import"></span></button>';
      }
      if (can("create")) {
        actions +=
          '<a class="btn btn--primary crud-page-header__create" href="member-user-form.html">' +
          '<img src="../assets/icons/plus.svg" alt="" width="16" height="16" />' +
          '<span data-i18n="crud.create"></span></a>';
      }
      actions += "</div>";
    }
    return (
      '<div class="crud-page-header">' +
      '<div class="crud-page-header__text">' +
      '<h1 class="crud-page-header__title" data-i18n="page.memberUser"></h1>' +
      '<p class="crud-page-header__desc" data-i18n="page.memberUser.desc"></p>' +
      "</div>" +
      actions +
      "</div>"
    );
  }

  function dateFilterHtml(id, labelKey, value) {
    var hasValue = !!(value && String(value).trim());
    return (
      '<div class="crud-toolbar__date-wrap' +
      (hasValue ? " has-value" : "") +
      '">' +
      '<span class="crud-toolbar__date-placeholder" data-i18n="' +
      escapeAttr(labelKey) +
      '"></span>' +
      '<input type="date" id="' +
      escapeAttr(id) +
      '" class="crud-toolbar__select crud-toolbar__date-input" value="' +
      escapeAttr(value || "") +
      '" aria-label="' +
      escapeAttr(t(labelKey)) +
      '" title="' +
      escapeAttr(t(labelKey)) +
      '" /></div>'
    );
  }

  function toolbarHtml() {
    var statusGroup =
      '<div class="crud-filter-btn-group" data-filter-key="status">' +
      '<span class="crud-filter-btn-group__label" data-i18n="col.status"></span>' +
      '<div class="crud-status-filter" id="mu-status-filter" role="group">' +
      statusFilterBtnHtml("", "crud.filterAll") +
      statusFilterBtnHtml("active", "col.active") +
      statusFilterBtnHtml("inactive", "col.inactive") +
      "</div></div>";
    return (
      '<div class="crud-toolbar member-user-toolbar">' +
      '<div class="crud-toolbar__row member-user-toolbar__row">' +
      '<input type="search" id="mu-search" class="crud-toolbar__search" data-i18n-placeholder="search.placeholder" placeholder="ค้นหา" value="' +
      escapeAttr(state.query) +
      '" />' +
      dateFilterHtml("mu-date-from", "memberUser.dateFrom", state.dateFrom) +
      dateFilterHtml("mu-date-to", "memberUser.dateTo", state.dateTo) +
      '<select id="mu-business" class="crud-toolbar__select" aria-label="' +
      escapeAttr(t("memberUser.business")) +
      '">' +
      businessOptionsHtml() +
      "</select></div>" +
      '<div class="crud-toolbar__row crud-toolbar__row--filters">' +
      statusGroup +
      "</div></div>"
    );
  }

  function shellHtml(meta, pageRows) {
    var startNo = (state.page - 1) * state.pageSize;
    var body;
    if (!pageRows.length) {
      body = '<tr><td colspan="9" class="crud-empty" data-i18n="crud.empty"></td></tr>';
    } else {
      body = pageRows
        .map(function (row, i) {
          var names = businessNames(row.id);
          var biz =
            names.length === 0
              ? "—"
              : names
                  .map(function (n) {
                    return '<span class="crud-badge crud-badge--inactive">' + escapeHtml(n) + "</span>";
                  })
                  .join(" ");
          var sku = row.sku
            ? '<div class="member-user-sku"><span>' +
              escapeHtml(row.sku) +
              '</span><button type="button" class="member-user-sku__copy" data-sku="' +
              escapeHtml(row.sku) +
              '" aria-label="' +
              escapeHtml(t("memberUser.copySku")) +
              '"><img src="../assets/icons/copy.svg" alt="" width="12" height="12" /></button></div>'
            : "";
          var editHref = "member-user-form.html?id=" + row.id;
          var delBtn = can("delete")
            ? '<button type="button" class="btn btn--icon crud-delete member-user-delete" data-id="' +
              row.id +
              '" aria-label="' +
              escapeHtml(t("crud.delete")) +
              '"><img src="../assets/icons/trash-2.svg" alt="" width="16" height="16" /></button>'
            : "";
          return (
            "<tr>" +
            '<td class="data-table__col-center">' +
            (startNo + i + 1) +
            "</td>" +
            "<td><div class=\"data-table__stack-primary\">" +
            escapeHtml(row.name || "—") +
            "</div>" +
            sku +
            "</td>" +
            "<td>" +
            escapeHtml(row.tel || "") +
            "</td>" +
            '<td class="data-table__col-center">' +
            biz +
            "</td>" +
            '<td class="data-table__col-numeric">0</td>' +
            '<td class="data-table__col-center"></td>' +
            '<td class="data-table__col-center">' +
            statusSwitchHtml(row) +
            "</td>" +
            '<td class="data-table__col-center data-table__cell--datetime">' +
            escapeHtml(global.i18n.formatDateTime(row.created_at)) +
            "</td>" +
            '<td class="data-table__actions-cell"><div class="data-table__actions">' +
            '<a class="btn btn--icon" href="' +
            editHref +
            '" aria-label="' +
            escapeHtml(t("crud.edit")) +
            '"><img src="../assets/icons/pencil.svg" alt="" width="16" height="16" /></a>' +
            delBtn +
            "</div></td></tr>"
          );
        })
        .join("");
    }

    var all = activeMembers();
    var newCount = all.filter(function (r) {
      return isThisMonth(r.created_at);
    }).length;

    var statsHtml =
      statCard("users", "", "memberUser.totalCustomers", all.length, "memberUser.listUnit") +
      statCard("user-check", "", "memberUser.members", all.length, "memberUser.personUnit") +
      statCard("user-plus", "member-user-stat__icon--green", "memberUser.newThisMonth", newCount, "memberUser.listUnit");
    if (global.auth && global.auth.isSuperAdmin(global.auth.getUser())) {
      statsHtml +=
        statCard("coins", "member-user-stat__icon--gold", "memberUser.salesThisMonth", "0", "memberUser.bahtUnit");
    }

    return (
      '<div class="crud-page">' +
      pageHeaderHtml() +
      toolbarHtml() +
      '<div class="member-user-stats">' +
      statsHtml +
      "</div>" +
      '<div class="crud-table-wrap"><div class="crud-table-wrap__body"><table class="data-table"><thead><tr>' +
      '<th class="data-table__col-center" data-i18n="memberUser.colIndex"></th>' +
      sortTh("name", "memberUser.customerName") +
      sortTh("tel", "col.tel") +
      sortTh("business", "memberUser.business", "data-table__col-center") +
      '<th class="data-table__col-numeric" data-i18n="memberUser.annualPurchase"></th>' +
      '<th class="data-table__col-center" data-i18n="memberUser.lastPurchase"></th>' +
      sortTh("is_active", "col.status", "data-table__col-center") +
      sortTh("created_at", "memberUser.memberSince", "data-table__col-center") +
      '<th class="data-table__actions-col" data-i18n="crud.actions"></th>' +
      "</tr></thead><tbody>" +
      body +
      "</tbody></table></div></div>" +
      '<nav class="crud-pagination" id="mu-pagination"></nav></div>'
    );
  }

  function softDeleteMember(id) {
    var ts = now();
    global.store.update("member_user", id, {
      deleted_at: ts,
      updated_at: ts,
      updated_by: actorId(),
    });
    global.store.getAll("member_user_address").forEach(function (r, idx) {
      if (r.member_user_id === id && r.deleted_at == null) {
        global.store.updateAt("member_user_address", idx, { deleted_at: ts, updated_at: ts });
      }
    });
    global.store.getAll("member_user_discount").forEach(function (r, idx) {
      if (r.member_user_id === id && r.deleted_at == null) {
        global.store.updateAt("member_user_discount", idx, { deleted_at: ts, updated_at: ts });
      }
    });
    global.store.getAll("member_user_file").forEach(function (r, idx) {
      if (r.member_user_id === id && r.deleted_at == null) {
        global.store.updateAt("member_user_file", idx, { deleted_at: ts, updated_at: ts });
      }
    });
  }

  function ensureConfirm() {
    if (confirmOverlay) return;
    confirmOverlay = document.createElement("div");
    confirmOverlay.className = "modal-overlay";
    confirmOverlay.hidden = true;
    confirmOverlay.innerHTML =
      '<div class="modal" role="dialog" aria-modal="true">' +
      '<div class="modal__header"><h2 class="modal__title" data-i18n="crud.delete"></h2>' +
      '<button type="button" class="modal__close" id="mu-confirm-close"><img src="../assets/icons/x.svg" alt="" width="18" height="18" /></button></div>' +
      '<div class="modal__content"><p class="modal__body" data-i18n="crud.confirmDelete"></p></div>' +
      '<div class="modal__footer">' +
      '<button type="button" class="btn" id="mu-confirm-cancel" data-i18n="crud.cancel"></button>' +
      '<button type="button" class="btn btn--primary" id="mu-confirm-ok" data-i18n="crud.delete"></button></div></div>';
    document.body.appendChild(confirmOverlay);
    confirmOverlay.querySelector("#mu-confirm-close").addEventListener("click", closeConfirm);
    confirmOverlay.querySelector("#mu-confirm-cancel").addEventListener("click", closeConfirm);
    confirmOverlay.querySelector("#mu-confirm-ok").addEventListener("click", function () {
      if (pendingDeleteId != null) {
        softDeleteMember(pendingDeleteId);
        global.toast.show(t("crud.deleted"), "success");
      }
      closeConfirm();
      render();
    });
    confirmOverlay.addEventListener("click", function (e) {
      if (e.target === confirmOverlay) closeConfirm();
    });
  }

  function openConfirm(id) {
    ensureConfirm();
    pendingDeleteId = id;
    if (global.i18n) global.i18n.init();
    confirmOverlay.hidden = false;
    document.body.classList.add("modal-open");
  }

  function closeConfirm() {
    pendingDeleteId = null;
    if (confirmOverlay) confirmOverlay.hidden = true;
    document.body.classList.remove("modal-open");
  }

  function bind(root) {
    var search = root.querySelector("#mu-search");
    if (search) {
      search.addEventListener("input", function () {
        state.query = search.value;
        state.page = 1;
        render();
      });
    }
    var from = root.querySelector("#mu-date-from");
    var to = root.querySelector("#mu-date-to");
    function bindDateFilter(input) {
      if (!input) return;
      var wrap = input.closest(".crud-toolbar__date-wrap");
      function syncWrap() {
        if (wrap) wrap.classList.toggle("has-value", !!input.value);
      }
      syncWrap();
      input.addEventListener("change", function () {
        if (input.id === "mu-date-from") state.dateFrom = input.value;
        if (input.id === "mu-date-to") state.dateTo = input.value;
        syncWrap();
        state.page = 1;
        render();
      });
    }
    bindDateFilter(root.querySelector("#mu-date-from"));
    bindDateFilter(root.querySelector("#mu-date-to"));
    var biz = root.querySelector("#mu-business");
    if (biz) {
      biz.addEventListener("change", function () {
        state.businessId = biz.value;
        state.page = 1;
        render();
      });
    }
    root.querySelectorAll("[data-status-filter]").forEach(function (btn) {
      btn.addEventListener("click", function () {
        state.statusFilter = btn.getAttribute("data-status-filter") || "";
        state.page = 1;
        render();
      });
    });
    var imp = root.querySelector("#mu-import");
    if (imp) {
      imp.addEventListener("click", function () {
        global.toast.show(t("crud.importComingSoon"), "info");
      });
    }
    var exp = root.querySelector("#mu-export");
    if (exp) {
      exp.addEventListener("click", function () {
        global.toast.show(t("crud.exportComingSoon"), "info");
      });
    }
    root.querySelectorAll(".data-table__sort-btn").forEach(function (btn) {
      btn.addEventListener("click", function () {
        cycleSort(btn.getAttribute("data-sort-key"));
      });
    });
    root.querySelectorAll(".member-user-sku__copy").forEach(function (btn) {
      btn.addEventListener("click", function () {
        var sku = btn.getAttribute("data-sku") || "";
        if (!sku || !navigator.clipboard) {
          global.toast.show(t("memberUser.copyFailed"), "error");
          return;
        }
        navigator.clipboard.writeText(sku).then(
          function () {
            global.toast.show(t("memberUser.copied"), "success");
          },
          function () {
            global.toast.show(t("memberUser.copyFailed"), "error");
          }
        );
      });
    });
    root.querySelectorAll(".member-user-status").forEach(function (input) {
      input.addEventListener("change", function () {
        if (!can("update")) return;
        var id = Number(input.getAttribute("data-id"));
        global.store.update("member_user", id, {
          is_active: input.checked,
          updated_at: now(),
          updated_by: actorId(),
        });
        global.toast.show(t("crud.statusChanged"), "success");
      });
    });
    root.querySelectorAll(".member-user-delete").forEach(function (btn) {
      btn.addEventListener("click", function () {
        openConfirm(Number(btn.getAttribute("data-id")));
      });
    });
  }

  function render() {
    var root = document.getElementById("mu-root");
    if (!root) return;
    var meta = paginate(sortedRows(filteredRows()));
    root.innerHTML = shellHtml(meta, meta.rows);
    global.crudList.renderPaginationBar(
      document.getElementById("mu-pagination"),
      { page: state.page, pageSize: state.pageSize },
      meta,
      function (patch) {
        if (patch.pageSize != null) state.pageSize = patch.pageSize;
        if (patch.page != null) state.page = patch.page;
        render();
      }
    );
    if (global.i18n) global.i18n.init();
    if (global.permissions) global.permissions.applyActionButtons(root);
    bind(root);
  }

  function boot() {
    global.store.init();
    global.i18n.init();
    if (!global.auth.requireAuth("login.html")) return;
    if (!global.permissions.guardPage(PERM_MODULE, PERM_TYPE, "login.html")) return;
    if (global.crudList) state.pageSize = global.crudList.readStoredPageSize();
    global.layout.mount({
      pageTitle: t("page.memberUser"),
      contentHtml: '<div id="mu-root"></div>',
    });
    render();
    global.devBar.mount({
      toasts: [
        { type: "success", label: "Created", msgKey: "crud.created" },
        { type: "success", label: "Updated", msgKey: "crud.updated" },
        { type: "success", label: "Deleted", msgKey: "crud.deleted" },
        { type: "success", label: "Status", msgKey: "crud.statusChanged" },
        { type: "info", label: "Import", msgKey: "crud.importComingSoon" },
      ],
    });
    document.addEventListener("store:change", function () {
      setTimeout(render, 0);
    });
    document.addEventListener("i18n:change", render);
    if (global.realtime) global.realtime.onMessage(render);
  }

  global.memberUserPage = { boot: boot };
})(window);

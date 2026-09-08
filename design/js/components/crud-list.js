(function (global) {
  var formOverlay = null;
  var confirmOverlay = null;
  var state = { config: null, permModule: null, permType: null, container: null, query: "", statusFilter: "", page: 1, pageSize: 10 };

  var PAGE_SIZE_OPTIONS = [10, 25, 50, 100];
  var DEFAULT_PAGE_SIZE = 10;
  var PAGE_SIZE_STORAGE_KEY = "warehouse-design-page-size";

  function readStoredPageSize() {
    try {
      var n = parseInt(sessionStorage.getItem(PAGE_SIZE_STORAGE_KEY), 10);
      return PAGE_SIZE_OPTIONS.indexOf(n) >= 0 ? n : DEFAULT_PAGE_SIZE;
    } catch {
      return DEFAULT_PAGE_SIZE;
    }
  }

  function storePageSize(n) {
    try {
      sessionStorage.setItem(PAGE_SIZE_STORAGE_KEY, String(n));
    } catch {
      /* ponytail: private mode — skip persist */
    }
  }

  function pageSizeOptionsHtml() {
    return PAGE_SIZE_OPTIONS.map(function (n) {
      return (
        '<option value="' +
        n +
        '"' +
        (n === state.pageSize ? " selected" : "") +
        ">" +
        n +
        "</option>"
      );
    }).join("");
  }

  // Returns array of page numbers and "..." strings for the ellipsis pagination
  function buildPageItems(current, total) {
    if (total <= 7) {
      var all = [];
      for (var i = 1; i <= total; i++) all.push(i);
      return all;
    }
    var items = [1];
    var windowStart = Math.max(2, current - 1);
    var windowEnd = Math.min(total - 1, current + 1);
    // If near the start, show more from start
    if (current <= 4) {
      windowStart = 2;
      windowEnd = Math.min(5, total - 1);
    }
    // If near the end, show more from end
    if (current >= total - 3) {
      windowStart = Math.max(2, total - 4);
      windowEnd = total - 1;
    }
    if (windowStart > 2) items.push("...");
    for (var p = windowStart; p <= windowEnd; p++) items.push(p);
    if (windowEnd < total - 1) items.push("...");
    items.push(total);
    return items;
  }

  function pageNumbersHtml(totalPages) {
    return buildPageItems(state.page, totalPages)
      .map(function (item) {
        if (item === "...") {
          return '<span class="crud-pagination__ellipsis" aria-hidden="true">&hellip;</span>';
        }
        var active = item === state.page;
        return (
          '<button type="button" class="crud-pagination__page-btn' +
          (active ? " crud-pagination__page-btn--active" : "") +
          '" data-page="' +
          item +
          '"' +
          (active ? ' aria-current="page"' : "") +
          ">" +
          item +
          "</button>"
        );
      })
      .join("");
  }

  function compareCreatedAt(a, b) {
    var ca = a.created_at || "";
    var cb = b.created_at || "";
    if (ca !== cb) return ca < cb ? -1 : 1;
    return (a.id || 0) - (b.id || 0);
  }

  function hasTreePath(rows) {
    return rows.some(function (r) {
      return r.tree_path != null && r.tree_path !== "";
    });
  }

  function hasSortOrder(rows) {
    return rows.some(function (r) {
      return r.sort_order != null;
    });
  }

  function compareTreeSibling(a, b) {
    var so = (a.sort_order || 0) - (b.sort_order || 0);
    if (so !== 0) return so;
    return (a.id || 0) - (b.id || 0);
  }

  function flattenTreeRows(rows) {
    var byParent = {};
    rows.forEach(function (r) {
      var key = r.parent_id == null ? "root" : String(r.parent_id);
      if (!byParent[key]) byParent[key] = [];
      byParent[key].push(r);
    });
    Object.keys(byParent).forEach(function (key) {
      byParent[key].sort(compareTreeSibling);
    });
    var out = [];
    var seen = {};
    function walk(parentKey) {
      (byParent[parentKey] || []).forEach(function (r) {
        out.push(r);
        seen[r.id] = true;
        walk(String(r.id));
      });
    }
    walk("root");
    // ponytail: orphans when parent missing from filtered set — append at end
    rows
      .filter(function (r) {
        return !seen[r.id];
      })
      .sort(compareTreeSibling)
      .forEach(function (r) {
        out.push(r);
      });
    return out;
  }

  function sortRows(rows) {
    if (state.config && state.config.listCompare) {
      return rows.slice().sort(state.config.listCompare);
    }
    var copy = rows.slice();
    if (hasTreePath(copy)) {
      return flattenTreeRows(copy);
    }
    if (hasSortOrder(copy)) {
      copy.sort(function (a, b) {
        var so = (a.sort_order || 0) - (b.sort_order || 0);
        if (so !== 0) return so;
        return compareCreatedAt(a, b);
      });
      return copy;
    }
    copy.sort(compareCreatedAt);
    return copy;
  }

  function paginateRows(rows) {
    var pageSize = state.pageSize;
    var total = rows.length;
    var totalPages = Math.max(1, Math.ceil(total / pageSize) || 1);
    if (state.page > totalPages) state.page = totalPages;
    if (state.page < 1) state.page = 1;
    var start = (state.page - 1) * pageSize;
    return {
      rows: rows.slice(start, start + pageSize),
      total: total,
      totalPages: totalPages,
      from: total === 0 ? 0 : start + 1,
      to: Math.min(start + pageSize, total),
    };
  }

  function fieldPlaceholder(kind, labelKey) {
    return global.i18n && global.i18n.fieldPlaceholder
      ? global.i18n.fieldPlaceholder(kind, labelKey)
      : labelKey;
  }

  function formatMsg(key, vars) {
    if (global.i18n && global.i18n.format) return global.i18n.format(key, vars);
    var msg = t(key);
    if (!vars) return msg;
    return Object.keys(vars).reduce(function (s, k) {
      return s.replace(new RegExp("\\{" + k + "\\}", "g"), String(vars[k]));
    }, msg);
  }

  function t(key) {
    return global.i18n ? global.i18n.t(key) : key;
  }

  function escapeHtml(s) {
    return String(s)
      .replace(/&/g, "&amp;")
      .replace(/</g, "&lt;")
      .replace(/>/g, "&gt;")
      .replace(/"/g, "&quot;");
  }

  function can(action) {
    return global.permissions.canAction(state.permModule, state.permType, action);
  }

  function statusFilterBtnHtml(value, i18nKey) {
    var active = state.statusFilter === value;
    return (
      '<button type="button" class="crud-status-filter__btn' +
      (active ? " crud-status-filter__btn--active" : "") +
      '" data-status="' +
      escapeHtml(value) +
      '"' +
      (active ? ' aria-pressed="true"' : ' aria-pressed="false"') +
      '><span data-i18n="' +
      escapeHtml(i18nKey) +
      '"></span></button>'
    );
  }

  function matchesStatusFilter(row) {
    if (!state.config.statusFilter || !state.statusFilter) return true;
    var field = state.config.statusFilterField || "is_active";
    if (state.statusFilter === "active") return !!row[field];
    if (state.statusFilter === "inactive") return !row[field];
    return true;
  }

  function shellHtml() {
    var showCreate = state.config.canCreate !== false && !state.config.readOnly && can("create");
    var statusFilter = state.config.statusFilter
      ? '<div class="crud-status-filter" id="crud-status-filter" role="group" aria-label="' +
        escapeHtml(t("crud.statusFilter")) +
        '">' +
        statusFilterBtnHtml("", "crud.filterAll") +
        statusFilterBtnHtml("active", "col.active") +
        statusFilterBtnHtml("inactive", "col.inactive") +
        "</div>"
      : "";
    return (
      '<div class="crud-page">' +
      '  <div class="crud-toolbar">' +
      '    <input type="search" class="crud-toolbar__search" id="crud-search" data-i18n-placeholder="search.placeholder" placeholder="ค้นหา" />' +
      statusFilter +
      (showCreate
        ? '    <button type="button" class="btn btn--primary crud-toolbar__create" id="crud-create" data-perm-module="' +
          escapeHtml(state.permModule) +
          '" data-perm-type="' +
          escapeHtml(state.permType) +
          '" data-perm-action="create">' +
          '      <img src="../assets/icons/plus.svg" alt="" width="16" height="16" />' +
          '      <span data-i18n="crud.create"></span>' +
          "    </button>"
        : "") +
      "  </div>" +
      '  <div class="crud-table-wrap">' +
      '    <div class="crud-table-wrap__body" id="crud-table-body"></div>' +
      "  </div>" +
      '  <nav class="crud-pagination" id="crud-pagination" aria-label="Pagination"></nav>' +
      "</div>"
    );
  }

  function renderPagination(meta) {
    var pager = state.container.querySelector("#crud-pagination");
    if (!pager) return;

    if (meta.total === 0) {
      pager.innerHTML = "";
      pager.hidden = true;
      return;
    }

    pager.hidden = false;
    var prevDisabled = state.page <= 1;
    var nextDisabled = state.page >= meta.totalPages;
    var prevLabel = escapeHtml(t("crud.prev"));
    var nextLabel = escapeHtml(t("crud.next"));

    pager.innerHTML =
      '<div class="crud-pagination__bar">' +
      // Left: limit select only
      '  <div class="crud-pagination__size">' +
      '    <select class="crud-pagination__select" id="crud-page-size" aria-label="' +
      escapeHtml(t("crud.rowsPerPage")) +
      '">' +
      pageSizeOptionsHtml() +
      "    </select>" +
      '    <span class="crud-pagination__total">' +
      escapeHtml(formatMsg("crud.totalCount", { total: meta.total })) +
      "</span>" +
      "  </div>" +
      // Center: page numbers with ellipsis
      '  <div class="crud-pagination__pages" role="group" aria-label="' +
      escapeHtml(formatMsg("crud.pageOf", { page: state.page, total: meta.totalPages })) +
      '">' +
      pageNumbersHtml(meta.totalPages) +
      "  </div>" +
      // Right: Previous / Next text buttons
      '  <div class="crud-pagination__nav">' +
      '    <button type="button" class="crud-pagination__nav-btn crud-pagination__nav-btn--text" id="crud-page-prev"' +
      (prevDisabled ? " disabled" : "") +
      '><img src="../assets/icons/chevron-left.svg" alt="" width="16" height="16" />' +
      '<span data-i18n="crud.prev">' +
      prevLabel +
      "</span></button>" +
      '    <button type="button" class="crud-pagination__nav-btn crud-pagination__nav-btn--text" id="crud-page-next"' +
      (nextDisabled ? " disabled" : "") +
      '><span data-i18n="crud.next">' +
      nextLabel +
      "</span>" +
      '<img src="../assets/icons/chevron-right.svg" alt="" width="16" height="16" /></button>' +
      "  </div>" +
      "</div>";

    if (global.i18n) global.i18n.init();

    var sizeSelect = pager.querySelector("#crud-page-size");
    if (sizeSelect) {
      sizeSelect.addEventListener("change", function () {
        var next = parseInt(sizeSelect.value, 10);
        if (PAGE_SIZE_OPTIONS.indexOf(next) < 0) return;
        state.pageSize = next;
        storePageSize(next);
        state.page = 1;
        renderTable();
      });
    }

    var prevBtn = pager.querySelector("#crud-page-prev");
    var nextBtn = pager.querySelector("#crud-page-next");
    if (prevBtn && !prevDisabled) {
      prevBtn.addEventListener("click", function () {
        state.page -= 1;
        renderTable();
      });
    }
    if (nextBtn && !nextDisabled) {
      nextBtn.addEventListener("click", function () {
        state.page += 1;
        renderTable();
      });
    }

    pager.querySelectorAll(".crud-pagination__page-btn:not(.crud-pagination__page-btn--active)").forEach(function (btn) {
      btn.addEventListener("click", function () {
        var p = parseInt(btn.getAttribute("data-page"), 10);
        if (!p || p === state.page) return;
        state.page = p;
        renderTable();
      });
    });
  }

  function reorderSortOrder(fullSorted, fromIdx, toIdx) {
    // fullSorted = all rows after sort (before pagination), pageIdx-relative
    // Convert page-relative indices to absolute indices in fullSorted
    var pageSize = state.pageSize;
    var pageStart = (state.page - 1) * pageSize;
    var absFrom = pageStart + fromIdx;
    var absTo = pageStart + toIdx;
    if (absFrom === absTo) return;

    // For tree: only allow drag within same parent_id group
    var srcRow = fullSorted[absFrom];
    var dstRow = fullSorted[absTo];
    if (srcRow == null || dstRow == null) return;
    if ("parent_id" in srcRow && srcRow.parent_id !== dstRow.parent_id) {
      global.toast.show(t("crud.dragSiblingOnly"), "warning");
      return;
    }

    // Splice in fullSorted to get new order
    var reordered = fullSorted.slice();
    reordered.splice(absFrom, 1);
    reordered.splice(absTo, 0, srcRow);

    // Determine which rows share the same parent scope (for geo: same parent FK; for tree: same parent_id)
    var parentKey = state.config.sortParentKey || null; // e.g. "website_country_id"
    var scopeId = parentKey ? srcRow[parentKey] : null;

    // Reassign sort_order * 10 for rows in scope, commit changed ones
    var idx = 0;
    var changed = false;
    reordered.forEach(function (row) {
      var inScope = parentKey ? row[parentKey] === scopeId : true;
      if (!inScope) return;
      idx++;
      var newOrder = idx * 10;
      if (row.sort_order !== newOrder) {
        var patch = { sort_order: newOrder, updated_at: new Date().toISOString() };
        global.store.update(state.config.storeTable || state.permType, row._id || row.id, patch);
        changed = true;
      }
    });

    if (changed) global.toast.show(t("crud.reordered"), "success");
    renderTable();
  }

  function bindDrag(wrap, pageRows, fullSorted) {
    var dragFromIdx = null;
    var tbody = wrap.querySelector("tbody");
    if (!tbody) return;

    function clearOver() {
      tbody.querySelectorAll("tr.is-drag-over").forEach(function (r) {
        r.classList.remove("is-drag-over");
      });
    }

    tbody.querySelectorAll("tr[draggable]").forEach(function (tr) {
      tr.addEventListener("dragstart", function (e) {
        dragFromIdx = parseInt(tr.getAttribute("data-drag-idx"), 10);
        e.dataTransfer.effectAllowed = "move";
        tr.classList.add("is-dragging");
      });

      tr.addEventListener("dragend", function () {
        tr.classList.remove("is-dragging");
        clearOver();
        dragFromIdx = null;
      });

      tr.addEventListener("dragover", function (e) {
        e.preventDefault();
        e.dataTransfer.dropEffect = "move";
        clearOver();
        tr.classList.add("is-drag-over");
      });

      tr.addEventListener("dragleave", function () {
        tr.classList.remove("is-drag-over");
      });

      tr.addEventListener("drop", function (e) {
        e.preventDefault();
        clearOver();
        var toIdx = parseInt(tr.getAttribute("data-drag-idx"), 10);
        if (dragFromIdx == null || dragFromIdx === toIdx) return;
        reorderSortOrder(fullSorted, dragFromIdx, toIdx);
      });
    });
  }

  function renderTable() {
    var wrap = state.container.querySelector("#crud-table-body");
    if (!wrap || !state.config) return;

    var filtered = state.config.listRows().filter(function (row) {
      if (!matchesStatusFilter(row)) return false;
      if (!state.query) return true;
      return state.config.searchFilter(row, state.query.toLowerCase());
    });

    var sorted = sortRows(filtered);
    var meta = paginateRows(sorted);
    var rows = meta.rows;

    var isSortable = !!state.config.sortable && !state.config.readOnly && can("update");
    var handleTh = isSortable
      ? '<th class="data-table__drag-col" aria-hidden="true"></th>'
      : "";
    var head = handleTh + state.config.columns
      .map(function (col) {
        return '<th data-i18n="' + escapeHtml(col.labelKey) + '"></th>';
      })
      .join("");
    if (!state.config.readOnly && (can("update") || can("delete"))) {
      head += '<th class="data-table__actions-col" data-i18n="crud.actions"></th>';
    }

    if (filtered.length === 0) {
      var colSpan = state.config.columns.length;
      if (isSortable) colSpan++;
      if (!state.config.readOnly && (can("update") || can("delete"))) colSpan++;
      wrap.innerHTML =
        '<table class="data-table"><thead><tr>' +
        head +
        '</tr></thead><tbody><tr><td class="crud-empty" colspan="' +
        colSpan +
        '" data-i18n="crud.empty"></td></tr></tbody></table>';
      renderPagination({ total: 0, totalPages: 1, from: 0, to: 0 });
      if (global.i18n) global.i18n.init();
      return;
    }

    var body = rows
      .map(function (row, i) {
        var handleTd = isSortable
          ? '<td class="data-table__drag-handle" aria-hidden="true">' +
            '<img src="../assets/icons/grip-vertical.svg" alt="" width="16" height="16" />' +
            "</td>"
          : "";
        var cells = handleTd + state.config.columns
          .map(function (col) {
            var val = col.render ? col.render(row) : escapeHtml(row[col.id] != null ? row[col.id] : "");
            var metaIds = { path: true, module: true };
            var tdClass =
              col.cellClass ||
              (metaIds[col.id] ? "data-table__cell--meta" : "");
            var clsAttr = tdClass ? ' class="' + escapeHtml(tdClass) + '"' : "";
            return "<td" + clsAttr + ">" + val + "</td>";
          })
          .join("");

        if (!state.config.readOnly && (can("update") || can("delete"))) {
          cells += '<td class="data-table__actions">';
          if (state.config.canEdit !== false && can("update")) {
            cells +=
              '<button type="button" class="btn btn--icon crud-edit" data-id="' +
              escapeHtml(row._id) +
              '" data-perm-module="' +
              escapeHtml(state.permModule) +
              '" data-perm-type="' +
              escapeHtml(state.permType) +
              '" data-perm-action="update" aria-label="' +
              escapeHtml(t("crud.edit")) +
              '"><img src="../assets/icons/pencil.svg" alt="" width="16" height="16" /></button>';
          }
          if (state.config.canDelete !== false && can("delete")) {
            cells +=
              '<button type="button" class="btn btn--icon crud-delete" data-id="' +
              escapeHtml(row._id) +
              '" data-perm-module="' +
              escapeHtml(state.permModule) +
              '" data-perm-type="' +
              escapeHtml(state.permType) +
              '" data-perm-action="delete" aria-label="' +
              escapeHtml(t("crud.delete")) +
              '"><img src="../assets/icons/trash-2.svg" alt="" width="16" height="16" /></button>';
          }
          cells += "</td>";
        }
        return (
          '<tr' +
          (isSortable ? ' draggable="true" data-drag-idx="' + i + '"' : "") +
          ">" +
          cells +
          "</tr>"
        );
      })
      .join("");

    wrap.innerHTML =
      '<table class="data-table"><thead><tr>' + head + "</tr></thead><tbody>" + body + "</tbody></table>";

    if (global.i18n) global.i18n.init();
    if (global.permissions) global.permissions.applyActionButtons(wrap);

    wrap.querySelectorAll(".crud-edit").forEach(function (btn) {
      btn.addEventListener("click", function () {
        openForm(Number(btn.getAttribute("data-id")));
      });
    });
    wrap.querySelectorAll(".crud-delete").forEach(function (btn) {
      btn.addEventListener("click", function () {
        openConfirm(Number(btn.getAttribute("data-id")));
      });
    });

    if (isSortable) bindDrag(wrap, rows, sorted);
    if (state.config.statusSwitch) bindStatusSwitches(wrap);
    if (state.config.afterRender) state.config.afterRender(wrap);
    renderPagination(meta);
  }

  function ensureFormModal() {
    if (formOverlay) return;
    formOverlay = document.createElement("div");
    formOverlay.className = "modal-overlay";
    formOverlay.hidden = true;
    formOverlay.innerHTML =
      '<div class="modal crud-modal" role="dialog" aria-modal="true" aria-labelledby="crud-form-title">' +
      '  <div class="modal__header">' +
      '    <h2 class="modal__title" id="crud-form-title"></h2>' +
      '    <button type="button" class="modal__close" id="crud-form-close" aria-label="Close">' +
      '      <img src="../assets/icons/x.svg" alt="" width="18" height="18" />' +
      "    </button>" +
      "  </div>" +
      '  <div class="modal__content">' +
      '    <form id="crud-form" class="crud-form" novalidate></form>' +
      "  </div>" +
      '  <div class="modal__footer">' +
      '    <button type="button" class="btn" id="crud-form-cancel" data-i18n="crud.cancel"></button>' +
      '    <button type="submit" form="crud-form" class="btn btn--primary" id="crud-form-save" data-i18n="crud.save"></button>' +
      "  </div>" +
      "</div>";
    document.body.appendChild(formOverlay);
    formOverlay.querySelector("#crud-form-close").addEventListener("click", closeForm);
    formOverlay.querySelector("#crud-form-cancel").addEventListener("click", closeForm);
    formOverlay.addEventListener("click", function (e) {
      if (e.target === formOverlay) closeForm();
    });
    formOverlay.querySelector("#crud-form").addEventListener("submit", onFormSubmit);
  }

  function ensureConfirmModal() {
    if (confirmOverlay) return;
    confirmOverlay = document.createElement("div");
    confirmOverlay.className = "modal-overlay";
    confirmOverlay.hidden = true;
    confirmOverlay.innerHTML =
      '<div class="modal" role="dialog" aria-modal="true" aria-labelledby="crud-confirm-title">' +
      '  <div class="modal__header">' +
      '    <h2 class="modal__title" id="crud-confirm-title" data-i18n="crud.delete"></h2>' +
      '    <button type="button" class="modal__close" id="crud-confirm-close" aria-label="Close">' +
      '      <img src="../assets/icons/x.svg" alt="" width="18" height="18" />' +
      "    </button>" +
      "  </div>" +
      '  <div class="modal__content">' +
      '    <p class="modal__body" data-i18n="crud.confirmDelete"></p>' +
      "  </div>" +
      '  <div class="modal__footer">' +
      '    <button type="button" class="btn" id="crud-confirm-cancel" data-i18n="crud.cancel"></button>' +
      '    <button type="button" class="btn btn--primary" id="crud-confirm-ok" data-i18n="crud.delete"></button>' +
      "  </div>" +
      "</div>";
    document.body.appendChild(confirmOverlay);
    confirmOverlay.querySelector("#crud-confirm-close").addEventListener("click", closeConfirm);
    confirmOverlay.querySelector("#crud-confirm-cancel").addEventListener("click", closeConfirm);
    confirmOverlay.addEventListener("click", function (e) {
      if (e.target === confirmOverlay) closeConfirm();
    });
  }

  function fieldHtml(field, values) {
    var val = values[field.key] != null ? values[field.key] : field.defaultValue != null ? field.defaultValue : "";
    var req = field.required ? '<span class="form-field__required" aria-hidden="true">*</span>' : "";
    var errSlot =
      '<div class="form-field__error-slot" aria-live="polite"><p class="form-field__error" hidden role="alert"></p></div>';

    if (field.type === "checkbox") {
      var id = "crud-field-" + escapeHtml(field.key);
      return (
        '<div class="form-field form-field--switch">' +
        '<label for="' + id + '">' +
        '<span data-i18n="' + escapeHtml(field.labelKey) + '"></span>' +
        req +
        "</label>" +
        '<label class="crud-switch" aria-label="">' +
        '<input type="checkbox" role="switch" name="' + escapeHtml(field.key) + '" id="' + id + '"' +
        (val ? " checked" : "") +
        " />" +
        '<span class="crud-switch__track" aria-hidden="true"><span class="crud-switch__thumb"></span></span>' +
        "</label>" +
        "</div>"
      );
    }

    if (field.type === "select") {
      var selectPh = escapeHtml(fieldPlaceholder("select", field.labelKey));
      var emptySelected = val == null || val === "" ? " selected" : "";
      var placeholderOpt =
        '<option value="" disabled' +
        emptySelected +
        ">" +
        selectPh +
        "</option>";
      var opts = placeholderOpt + (field.options || [])
        .map(function (opt) {
          var selected = String(val) === String(opt.value) ? " selected" : "";
          return (
            '<option value="' +
            escapeHtml(opt.value) +
            '"' +
            selected +
            ">" +
            escapeHtml(opt.label) +
            "</option>"
          );
        })
        .join("");
      return (
        '<div class="form-field">' +
        '<label for="crud-field-' +
        escapeHtml(field.key) +
        '"><span data-i18n="' +
        escapeHtml(field.labelKey) +
        '"></span>' +
        req +
        "</label>" +
        '<select id="crud-field-' +
        escapeHtml(field.key) +
        '" name="' +
        escapeHtml(field.key) +
        '">' +
        opts +
        "</select>" +
        errSlot +
        "</div>"
      );
    }

    var inputType = field.type === "number" ? "number" : "text";
    var phText = escapeHtml(fieldPlaceholder("input", field.labelKey));
    return (
      '<div class="form-field">' +
      '<label for="crud-field-' +
      escapeHtml(field.key) +
      '"><span data-i18n="' +
      escapeHtml(field.labelKey) +
      '"></span>' +
      req +
      "</label>" +
      '<input type="' +
      inputType +
      '" id="crud-field-' +
      escapeHtml(field.key) +
      '" name="' +
      escapeHtml(field.key) +
      '" value="' +
      escapeHtml(val) +
      '" placeholder="' +
      phText +
      '" data-i18n-placeholder-input="' +
      escapeHtml(field.labelKey) +
      '"' +
      (field.required ? " required" : "") +
      " />" +
      errSlot +
      "</div>"
    );
  }

  function renderFormFields(fields, values) {
    var html = [];
    var i = 0;
    while (i < fields.length) {
      var f = fields[i];
      var next = fields[i + 1];
      if (f.key === "name_th" && next && next.key === "name_en") {
        html.push(
          '<div class="crud-form__row">' +
            fieldHtml(f, values) +
            fieldHtml(next, values) +
            "</div>"
        );
        i += 2;
      } else {
        html.push(fieldHtml(f, values));
        i += 1;
      }
    }
    return html.join("");
  }

  var editId = null;

  function openForm(id) {
    if (!state.config.formFields) return;
    if (state.config.parentOptions) {
      state.config.formFields.forEach(function (f) {
        if (f.type === "select") f.options = state.config.parentOptions();
      });
    }
    ensureFormModal();
    editId = id || null;
    var values = state.config.getFormValues(editId);
    var title = editId ? t("crud.edit") : t("crud.create");
    formOverlay.querySelector("#crud-form-title").textContent = title;
    var form = formOverlay.querySelector("#crud-form");
    form.innerHTML = renderFormFields(state.config.formFields, values);
    if (global.i18n) global.i18n.init();
    form.querySelectorAll("input, select").forEach(function (el) {
      el.addEventListener("input", function () {
        clearFieldError(el.closest(".form-field"));
      });
    });
    formOverlay.hidden = false;
    document.body.classList.add("modal-open");
  }

  function closeForm() {
    if (!formOverlay) return;
    formOverlay.hidden = true;
    document.body.classList.remove("modal-open");
    editId = null;
  }

  function clearFieldError(fieldEl) {
    if (!fieldEl) return;
    fieldEl.classList.remove("form-field--invalid");
    var err = fieldEl.querySelector(".form-field__error");
    if (err) {
      err.hidden = true;
      err.textContent = "";
    }
  }

  function showFieldError(fieldEl, msg) {
    if (!fieldEl) return;
    fieldEl.classList.add("form-field--invalid");
    var err = fieldEl.querySelector(".form-field__error");
    if (err) {
      err.hidden = false;
      err.textContent = msg;
    }
  }

  function readFormValues() {
    var form = formOverlay.querySelector("#crud-form");
    var values = {};
    state.config.formFields.forEach(function (field) {
      var el = form.querySelector('[name="' + field.key + '"]');
      if (!el) return;
      if (field.type === "checkbox") values[field.key] = el.checked;
      else if (field.type === "number") values[field.key] = el.value === "" ? null : Number(el.value);
      else values[field.key] = el.value.trim();
    });
    return values;
  }

  function onFormSubmit(e) {
    e.preventDefault();
    var form = formOverlay.querySelector("#crud-form");
    form.querySelectorAll(".form-field").forEach(clearFieldError);

    var values = readFormValues();
    var result = state.config.validate(values, editId);
    if (!result.ok) {
      Object.keys(result.errors || {}).forEach(function (key) {
        var fieldEl = form.querySelector('[name="' + key + '"]');
        showFieldError(fieldEl ? fieldEl.closest(".form-field") : null, result.errors[key]);
      });
      var firstInvalid = form.querySelector(".form-field--invalid input, .form-field--invalid select");
      if (firstInvalid) firstInvalid.focus();
      return;
    }

    var saveBtn = formOverlay.querySelector("#crud-form-save");
    saveBtn.disabled = true;
    try {
      state.config.save(values, editId);
      global.toast.show(t(editId ? "crud.updated" : "crud.created"), "success");
      closeForm();
      renderTable();
    } catch (err) {
      global.toast.show(err.message || t("error.forbidden"), "error");
    } finally {
      saveBtn.disabled = false;
    }
  }

  var deleteId = null;

  function openConfirm(id) {
    ensureConfirmModal();
    deleteId = id;
    if (global.i18n) global.i18n.init();
    confirmOverlay.hidden = false;
    document.body.classList.add("modal-open");
    confirmOverlay.querySelector("#crud-confirm-ok").onclick = function () {
      try {
        state.config.remove(deleteId);
        global.toast.show(t("crud.deleted"), "success");
        renderTable();
      } catch (err) {
        global.toast.show(err.message || t("error.forbidden"), "error");
      }
      closeConfirm();
    };
  }

  function closeConfirm() {
    if (!confirmOverlay) return;
    confirmOverlay.hidden = true;
    document.body.classList.remove("modal-open");
    deleteId = null;
  }

  function bindStatusSwitches(wrap) {
    var table = state.config.storeTable || state.permType;
    var field = state.config.statusSwitchField || "is_active";
    var canUpdate = can("update");
    wrap.querySelectorAll(".crud-status-switch").forEach(function (input) {
      if (!canUpdate) input.disabled = true;
      input.addEventListener("change", function () {
        var id = Number(input.getAttribute("data-id"));
        global.store.update(table, id, {
          [field]: input.checked,
          updated_at: new Date().toISOString(),
        });
        global.toast.show(t("crud.statusChanged"), "success");
        renderTable();
      });
    });
  }

  function bindToolbar() {
    var search = state.container.querySelector("#crud-search");
    if (search) {
      search.addEventListener("input", function () {
        state.query = search.value;
        state.page = 1;
        renderTable();
      });
    }
    var statusGroup = state.container.querySelector("#crud-status-filter");
    if (statusGroup) {
      statusGroup.querySelectorAll(".crud-status-filter__btn").forEach(function (btn) {
        btn.addEventListener("click", function () {
          var next = btn.getAttribute("data-status") || "";
          if (next === state.statusFilter) return;
          state.statusFilter = next;
          state.page = 1;
          statusGroup.querySelectorAll(".crud-status-filter__btn").forEach(function (b) {
            var on = b === btn;
            b.classList.toggle("crud-status-filter__btn--active", on);
            b.setAttribute("aria-pressed", on ? "true" : "false");
          });
          renderTable();
        });
      });
    }
    var createBtn = state.container.querySelector("#crud-create");
    if (createBtn) {
      createBtn.addEventListener("click", function () {
        openForm(null);
      });
    }
  }

  function mount(container, config, permModule, permType) {
    state.container = container;
    state.config = config;
    state.permModule = permModule;
    state.permType = permType;
    state.query = "";
    state.statusFilter = "";
    state.page = 1;
    state.pageSize = config.pageSize || readStoredPageSize();
    container.innerHTML = shellHtml();
    if (global.i18n) global.i18n.init();
    if (global.permissions) global.permissions.applyActionButtons(container);
    bindToolbar();
    renderTable();
  }

  function refresh() {
    renderTable();
  }

  global.crudList = { mount: mount, refresh: refresh, renderTable: renderTable };
})(window);

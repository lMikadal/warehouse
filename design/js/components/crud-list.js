(function (global) {
  var formOverlay = null;
  var confirmOverlay = null;
  var state = {
    config: null,
    permModule: null,
    permType: null,
    container: null,
    query: "",
    statusFilter: "",
    columnFilters: {},
    page: 1,
    pageSize: 10,
    sortKey: null,
    sortDir: null,
  };

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

  function compareColumnValues(a, b, colId) {
    var va = a[colId];
    var vb = b[colId];
    if (va == null && vb == null) return 0;
    if (va == null) return 1;
    if (vb == null) return -1;
    if (typeof va === "boolean" || typeof vb === "boolean") {
      return (va ? 1 : 0) - (vb ? 1 : 0);
    }
    if (typeof va === "number" && typeof vb === "number") {
      return va - vb;
    }
    if (typeof va === "string" && typeof vb === "string") {
      if (/^\d{4}-\d{2}-\d{2}/.test(va) && /^\d{4}-\d{2}-\d{2}/.test(vb)) {
        if (va !== vb) return va < vb ? -1 : 1;
        return 0;
      }
      return va.localeCompare(vb, undefined, { sensitivity: "base" });
    }
    return String(va).localeCompare(String(vb));
  }

  function applyHeaderSort(rows) {
    if (!state.sortKey || !state.sortDir) return rows;
    var dir = state.sortDir === "desc" ? -1 : 1;
    var key = state.sortKey;
    return rows.slice().sort(function (a, b) {
      var cmp = compareColumnValues(a, b, key);
      if (cmp !== 0) return cmp * dir;
      return compareCreatedAt(a, b);
    });
  }

  function sortIconName(colId) {
    if (state.sortKey !== colId) return "arrow-up-down";
    return state.sortDir === "desc" ? "arrow-down" : "arrow-up";
  }

  function sortAriaSort(colId) {
    if (state.sortKey !== colId) return "none";
    return state.sortDir === "desc" ? "descending" : "ascending";
  }

  function sortAriaLabel(col) {
    var field = t(col.labelKey);
    if (state.sortKey !== col.id) {
      return formatMsg("crud.sortNone", { field: field });
    }
    if (state.sortDir === "desc") {
      return formatMsg("crud.sortDesc", { field: field });
    }
    return formatMsg("crud.sortAsc", { field: field });
  }

  function columnHeaderHtml(col) {
    var icon = sortIconName(col.id);
    return (
      '<th class="data-table__sort-col">' +
      '<button type="button" class="data-table__sort-btn" data-sort-key="' +
      escapeHtml(col.id) +
      '" aria-sort="' +
      sortAriaSort(col.id) +
      '" aria-label="' +
      escapeHtml(sortAriaLabel(col)) +
      '">' +
      '<span data-i18n="' +
      escapeHtml(col.labelKey) +
      '"></span>' +
      '<img src="../assets/icons/' +
      icon +
      '.svg" alt="" width="14" height="14" class="data-table__sort-icon" aria-hidden="true" />' +
      "</button></th>"
    );
  }

  function cycleHeaderSort(colId) {
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
    renderTable();
  }

  function bindSortHeaders(wrap) {
    wrap.querySelectorAll(".data-table__sort-btn").forEach(function (btn) {
      btn.addEventListener("click", function () {
        cycleHeaderSort(btn.getAttribute("data-sort-key"));
      });
    });
  }

  function paginateRows(rows) {
    if (state.config && state.config.showPagination === false) {
      return {
        rows: rows,
        total: rows.length,
        totalPages: 1,
        from: rows.length === 0 ? 0 : 1,
        to: rows.length,
      };
    }
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

  function filterOptionLabel(filterDef, value) {
    if (!value) return t("crud.filterAll");
    if (filterDef.optionLabel) return filterDef.optionLabel(value);
    if (filterDef.optionI18nPrefix) {
      var i18nKey = filterDef.optionI18nPrefix + value;
      var translated = t(i18nKey);
      if (translated !== i18nKey) return translated;
    }
    return value;
  }

  function filterTriggerLabel(filterDef) {
    return formatMsg("crud.filterField", {
      field: t(filterDef.labelKey),
      value: filterOptionLabel(filterDef, state.columnFilters[filterDef.key] || ""),
    });
  }

  function buildColumnFilterOptions(filterDef) {
    var opts = [];
    var seen = {};
    var source =
      typeof filterDef.optionValues === "function" ? filterDef.optionValues() : filterDef.optionValues;
    if (Array.isArray(source)) {
      source.forEach(function (v) {
        if (v == null || v === "" || seen[v]) return;
        seen[v] = true;
        opts.push(String(v));
      });
    } else {
      state.config.listRows().forEach(function (row) {
        var v = row[filterDef.key];
        if (v == null || v === "" || seen[v]) return;
        seen[v] = true;
        opts.push(String(v));
      });
    }
    opts.sort(function (a, b) {
      if (filterDef.optionLabel) {
        return filterDef.optionLabel(a).localeCompare(filterDef.optionLabel(b));
      }
      if (filterDef.optionI18nPrefix) {
        return t(filterDef.optionI18nPrefix + a).localeCompare(t(filterDef.optionI18nPrefix + b));
      }
      return a.localeCompare(b);
    });
    return opts;
  }

  function columnFilterBtnHtml(filterDef, value) {
    var selected = state.columnFilters[filterDef.key] || "";
    var active = selected === value;
    return (
      '<button type="button" class="crud-status-filter__btn' +
      (active ? " crud-status-filter__btn--active" : "") +
      '" data-filter-value="' +
      escapeHtml(value) +
      '"' +
      (active ? ' aria-pressed="true"' : ' aria-pressed="false"') +
      ">" +
      escapeHtml(filterOptionLabel(filterDef, value)) +
      "</button>"
    );
  }

  function columnFilterButtonGroupHtml(filterDef) {
    if (state.columnFilters[filterDef.key] === undefined) state.columnFilters[filterDef.key] = "";
    var buttons = columnFilterBtnHtml(filterDef, "");
    buildColumnFilterOptions(filterDef).forEach(function (val) {
      buttons += columnFilterBtnHtml(filterDef, val);
    });
    return (
      '<div class="crud-filter-btn-group" data-filter-key="' +
      escapeHtml(filterDef.key) +
      '">' +
      '<span class="crud-filter-btn-group__label" data-i18n="' +
      escapeHtml(filterDef.labelKey) +
      '"></span>' +
      '<div class="crud-status-filter" role="group" aria-label="' +
      escapeHtml(t(filterDef.labelKey)) +
      '">' +
      buttons +
      "</div></div>"
    );
  }

  function columnFilterOptionsHtml(filterDef) {
    var selected = state.columnFilters[filterDef.key] || "";
    var html =
      '<li class="crud-filter-select__option' +
      (selected === "" ? " crud-filter-select__option--selected" : "") +
      '" role="option" data-value="" tabindex="0">' +
      escapeHtml(filterOptionLabel(filterDef, "")) +
      "</li>";
    buildColumnFilterOptions(filterDef).forEach(function (val) {
      html +=
        '<li class="crud-filter-select__option' +
        (selected === val ? " crud-filter-select__option--selected" : "") +
        '" role="option" data-value="' +
        escapeHtml(val) +
        '" tabindex="0">' +
        escapeHtml(filterOptionLabel(filterDef, val)) +
        "</li>";
    });
    return html;
  }

  function columnFiltersHtml(mode) {
    if (!state.config.columnFilters || !state.config.columnFilters.length) return "";
    var filters = state.config.columnFilters.filter(function (f) {
      var isBtn = f.ui === "buttonGroup";
      if (mode === "buttonGroup") return isBtn;
      if (mode === "dropdown") return !isBtn;
      return true;
    });
    if (!filters.length) return "";
    return (
      '<div class="crud-toolbar__filters">' +
      filters
        .map(function (f) {
          if (f.ui === "buttonGroup") return columnFilterButtonGroupHtml(f);
          if (state.columnFilters[f.key] === undefined) state.columnFilters[f.key] = "";
          return (
            '<div class="crud-filter-select" data-filter-key="' +
            escapeHtml(f.key) +
            '">' +
            '<button type="button" class="crud-filter-select__trigger" aria-haspopup="listbox" aria-expanded="false">' +
            '<span class="crud-filter-select__label">' +
            escapeHtml(filterTriggerLabel(f)) +
            "</span>" +
            '<img src="../assets/icons/chevron-down.svg" alt="" width="16" height="16" class="crud-filter-select__chevron" />' +
            "</button>" +
            '<div class="crud-filter-select__panel" hidden>' +
            '<input type="search" class="crud-filter-select__search" data-i18n-placeholder="search.placeholder" placeholder="ค้นหา" />' +
            '<ul class="crud-filter-select__list" role="listbox">' +
            columnFilterOptionsHtml(f) +
            "</ul>" +
            "</div>" +
            "</div>"
          );
        })
        .join("") +
      "</div>"
    );
  }

  function matchesColumnFilters(row) {
    if (!state.config.columnFilters) return true;
    return state.config.columnFilters.every(function (f) {
      var v = state.columnFilters[f.key];
      return !v || String(row[f.key]) === v;
    });
  }

  function closeAllColumnFilterPanels(exceptWrap) {
    if (!state.container) return;
    state.container.querySelectorAll(".crud-filter-select").forEach(function (wrap) {
      if (exceptWrap && wrap === exceptWrap) return;
      var panel = wrap.querySelector(".crud-filter-select__panel");
      var trigger = wrap.querySelector(".crud-filter-select__trigger");
      if (panel) panel.hidden = true;
      if (trigger) trigger.setAttribute("aria-expanded", "false");
    });
  }

  function filterColumnFilterList(list, q) {
    list.querySelectorAll(".crud-filter-select__option").forEach(function (opt) {
      var text = (opt.textContent || "").toLowerCase();
      opt.hidden = !!(q && text.indexOf(q) < 0);
    });
  }

  function bindColumnFilters() {
    if (!state.config.columnFilters) return;
    state.container.querySelectorAll(".crud-filter-select").forEach(function (wrap) {
      var key = wrap.getAttribute("data-filter-key");
      var filterDef = state.config.columnFilters.filter(function (f) {
        return f.key === key;
      })[0];
      if (!filterDef) return;

      var trigger = wrap.querySelector(".crud-filter-select__trigger");
      var panel = wrap.querySelector(".crud-filter-select__panel");
      var search = wrap.querySelector(".crud-filter-select__search");
      var list = wrap.querySelector(".crud-filter-select__list");

      trigger.addEventListener("click", function (e) {
        e.stopPropagation();
        var willOpen = panel.hidden;
        closeAllColumnFilterPanels();
        if (willOpen) {
          panel.hidden = false;
          trigger.setAttribute("aria-expanded", "true");
          if (search) {
            search.value = "";
            filterColumnFilterList(list, "");
            search.focus();
          }
        }
      });

      panel.addEventListener("click", function (e) {
        e.stopPropagation();
      });

      if (search) {
        search.addEventListener("input", function () {
          filterColumnFilterList(list, search.value.trim().toLowerCase());
        });
      }

      list.querySelectorAll(".crud-filter-select__option").forEach(function (opt) {
        opt.addEventListener("click", function () {
          state.columnFilters[key] = opt.getAttribute("data-value") || "";
          state.page = 1;
          closeAllColumnFilterPanels();
          state.container.querySelectorAll(".crud-filter-select").forEach(function (w) {
            var k = w.getAttribute("data-filter-key");
            var fd = state.config.columnFilters.filter(function (f) {
              return f.key === k;
            })[0];
            if (!fd) return;
            var lbl = w.querySelector(".crud-filter-select__label");
            if (lbl) lbl.textContent = filterTriggerLabel(fd);
            var sel = state.columnFilters[k] || "";
            w.querySelectorAll(".crud-filter-select__option").forEach(function (o) {
              o.classList.toggle("crud-filter-select__option--selected", (o.getAttribute("data-value") || "") === sel);
            });
          });
          renderTable();
        });
      });
    });

    if (!state.container._columnFilterCloseBound) {
      state.container._columnFilterCloseBound = true;
      state.container.addEventListener("click", function () {
        closeAllColumnFilterPanels();
      });
    }

    state.container.querySelectorAll(".crud-filter-btn-group").forEach(function (wrap) {
      var key = wrap.getAttribute("data-filter-key");
      var group = wrap.querySelector(".crud-status-filter");
      if (!group) return;
      group.querySelectorAll(".crud-status-filter__btn").forEach(function (btn) {
        btn.addEventListener("click", function () {
          var next = btn.getAttribute("data-filter-value") || "";
          if (next === (state.columnFilters[key] || "")) return;
          state.columnFilters[key] = next;
          state.page = 1;
          group.querySelectorAll(".crud-status-filter__btn").forEach(function (b) {
            var on = b === btn;
            b.classList.toggle("crud-status-filter__btn--active", on);
            b.setAttribute("aria-pressed", on ? "true" : "false");
          });
          renderTable();
        });
      });
    });
  }

  function pageHeaderHtml() {
    var cfg = state.config;
    var showCreate = cfg.canCreate !== false && !cfg.readOnly && can("create");
    var showExport = cfg.canExport !== false && !cfg.readOnly;
    var showImport = cfg.canImport === true && !cfg.readOnly;
    var desc = cfg.pageDescriptionKey
      ? '<p class="crud-page-header__desc" data-i18n="' + escapeHtml(cfg.pageDescriptionKey) + '"></p>'
      : "";
    var actions = "";
    if (showCreate || showExport || showImport) {
      actions = '<div class="crud-page-header__actions">';
      if (showExport) {
        actions +=
          '<button type="button" class="btn crud-page-header__export" id="crud-page-export">' +
          '<img src="../assets/icons/download.svg" alt="" width="16" height="16" />' +
          '<span data-i18n="crud.export"></span>' +
          "</button>";
      }
      if (showImport) {
        actions +=
          '<button type="button" class="btn crud-page-header__import" id="crud-page-import">' +
          '<img src="../assets/icons/upload.svg" alt="" width="16" height="16" />' +
          '<span data-i18n="crud.import"></span>' +
          "</button>";
      }
      if (showCreate) {
        actions +=
          '<button type="button" class="btn btn--primary crud-page-header__create" id="crud-page-create" data-perm-module="' +
          escapeHtml(state.permModule) +
          '" data-perm-type="' +
          escapeHtml(state.permType) +
          '" data-perm-action="create">' +
          '<img src="../assets/icons/plus.svg" alt="" width="16" height="16" />' +
          '<span data-i18n="crud.create"></span>' +
          "</button>";
      }
      actions += "</div>";
    }
    return (
      '<div class="crud-page-header">' +
      '<div class="crud-page-header__text">' +
      '<h1 class="crud-page-header__title" data-i18n="' +
      escapeHtml(cfg.pageTitleKey) +
      '"></h1>' +
      desc +
      "</div>" +
      actions +
      "</div>"
    );
  }

  function shellHtml() {
    var showSearch = state.config.showSearch !== false;
    var showPagination = state.config.showPagination !== false;
    var statusFilter = state.config.statusFilter
      ? '<div class="crud-status-filter" id="crud-status-filter" role="group" aria-label="' +
        escapeHtml(t("crud.statusFilter")) +
        '">' +
        statusFilterBtnHtml("", "crud.filterAll") +
        statusFilterBtnHtml("active", "col.active") +
        statusFilterBtnHtml("inactive", "col.inactive") +
        "</div>"
      : "";
    var searchInput = showSearch
      ? '<input type="search" class="crud-toolbar__search" id="crud-search" data-i18n-placeholder="search.placeholder" placeholder="ค้นหา" />'
      : "";
    var dropdownFilters = columnFiltersHtml("dropdown");
    var buttonGroupFilters = columnFiltersHtml("buttonGroup");
    var filterRow =
      buttonGroupFilters !== ""
        ? '<div class="crud-toolbar__row crud-toolbar__row--filters">' + buttonGroupFilters + "</div>"
        : "";
    var toolbarRow1 = searchInput || dropdownFilters || statusFilter;
    var toolbarHtml =
      toolbarRow1 || filterRow
        ? '  <div class="crud-toolbar">' +
          (toolbarRow1 ? '    <div class="crud-toolbar__row">' + searchInput + dropdownFilters + statusFilter + "    </div>" : "") +
          filterRow +
          "  </div>"
        : "";
    var paginationHtml = showPagination
      ? '  <nav class="crud-pagination" id="crud-pagination" aria-label="Pagination"></nav>'
      : "";
    return (
      '<div class="crud-page">' +
      pageHeaderHtml() +
      toolbarHtml +
      '  <div class="crud-table-wrap">' +
      '    <div class="crud-table-wrap__body" id="crud-table-body"></div>' +
      "  </div>" +
      paginationHtml +
      "</div>"
    );
  }

  function renderPagination(meta) {
    if (state.config && state.config.showPagination === false) return;
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
      if (!matchesColumnFilters(row)) return false;
      if (!matchesStatusFilter(row)) return false;
      if (!state.query) return true;
      return state.config.searchFilter(row, state.query.toLowerCase());
    });

    var sorted = applyHeaderSort(sortRows(filtered));
    var meta = paginateRows(sorted);
    var rows = meta.rows;

    var canDnd = !!state.config.sortable && !state.config.readOnly && can("update");
    var dndEnabled = canDnd && !state.sortKey;
    var handleTh = canDnd
      ? '<th class="data-table__drag-col" aria-hidden="true"></th>'
      : "";
    var head = handleTh + state.config.columns.map(columnHeaderHtml).join("");
    if (!state.config.readOnly && (can("update") || can("delete"))) {
      head += '<th class="data-table__actions-col" data-i18n="crud.actions"></th>';
    }

    if (filtered.length === 0) {
      var colSpan = state.config.columns.length;
      if (canDnd) colSpan++;
      if (!state.config.readOnly && (can("update") || can("delete"))) colSpan++;
      wrap.innerHTML =
        '<table class="data-table"><thead><tr>' +
        head +
        '</tr></thead><tbody><tr><td class="crud-empty" colspan="' +
        colSpan +
        '" data-i18n="crud.empty"></td></tr></tbody></table>';
      renderPagination({ total: 0, totalPages: 1, from: 0, to: 0 });
      if (global.i18n) global.i18n.init();
      bindSortHeaders(wrap);
      return;
    }

    var body = rows
      .map(function (row, i) {
        var handleTd = canDnd
          ? '<td class="data-table__drag-handle' +
            (dndEnabled ? "" : " data-table__drag-handle--disabled") +
            '" aria-hidden="true">' +
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
          (dndEnabled ? ' draggable="true" data-drag-idx="' + i + '"' : "") +
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

    if (dndEnabled) bindDrag(wrap, rows, sorted);
    bindSortHeaders(wrap);
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

  function filterFormSearchSelectList(list, q) {
    list.querySelectorAll(".form-search-select__option").forEach(function (opt) {
      var text = (opt.textContent || "").toLowerCase();
      opt.hidden = !!(q && text.indexOf(q) < 0);
    });
  }

  function closeAllFormSearchSelectPanels(exceptWrap) {
    if (!formOverlay) return;
    formOverlay.querySelectorAll(".form-search-select").forEach(function (wrap) {
      if (exceptWrap && wrap === exceptWrap) return;
      var panel = wrap.querySelector(".form-search-select__panel");
      var trigger = wrap.querySelector(".form-search-select__trigger");
      if (panel) panel.hidden = true;
      if (trigger) trigger.setAttribute("aria-expanded", "false");
    });
  }

  function bindFormSearchableSelects(form) {
    form.querySelectorAll(".form-search-select").forEach(function (wrap) {
      var hidden = wrap.querySelector('input[type="hidden"]');
      var trigger = wrap.querySelector(".form-search-select__trigger");
      var panel = wrap.querySelector(".form-search-select__panel");
      var search = wrap.querySelector(".form-search-select__search");
      var list = wrap.querySelector(".form-search-select__list");
      var labelEl = wrap.querySelector(".form-search-select__label");
      if (!hidden || !trigger || !panel || !list) return;

      trigger.addEventListener("click", function (e) {
        e.stopPropagation();
        var willOpen = panel.hidden;
        closeAllFormSearchSelectPanels();
        if (willOpen) {
          panel.hidden = false;
          trigger.setAttribute("aria-expanded", "true");
          if (search) {
            search.value = "";
            filterFormSearchSelectList(list, "");
            search.focus();
          }
        }
      });

      panel.addEventListener("click", function (e) {
        e.stopPropagation();
      });

      if (search) {
        search.addEventListener("input", function () {
          filterFormSearchSelectList(list, search.value.trim().toLowerCase());
        });
      }

      list.querySelectorAll(".form-search-select__option").forEach(function (opt) {
        opt.addEventListener("click", function () {
          var value = opt.getAttribute("data-value") || "";
          hidden.value = value;
          if (labelEl) labelEl.textContent = opt.textContent || "";
          list.querySelectorAll(".form-search-select__option").forEach(function (o) {
            o.classList.toggle("form-search-select__option--selected", o === opt);
          });
          closeAllFormSearchSelectPanels();
          clearFieldError(wrap);
        });
      });
    });

    if (!form._formSearchSelectCloseBound) {
      form._formSearchSelectCloseBound = true;
      form.addEventListener("click", function () {
        closeAllFormSearchSelectPanels();
      });
    }
  }

  function passwordInputHtml(name, labelKey) {
    var ph = escapeHtml(fieldPlaceholder("input", labelKey));
    return (
      '<div class="form-field">' +
      '<label for="crud-field-' +
      escapeHtml(name) +
      '"><span data-i18n="' +
      escapeHtml(labelKey) +
      '"></span></label>' +
      '<div class="password-field">' +
      '<input type="password" id="crud-field-' +
      escapeHtml(name) +
      '" name="' +
      escapeHtml(name) +
      '" value="" placeholder="' +
      ph +
      '" data-i18n-placeholder-input="' +
      escapeHtml(labelKey) +
      '" autocomplete="new-password" />' +
      '<button type="button" class="password-field__toggle" aria-label=""></button>' +
      "</div>" +
      '<div class="form-field__error-slot" aria-live="polite"><p class="form-field__error" hidden role="alert"></p></div>' +
      "</div>"
    );
  }

  function bindPasswordGroup(form) {
    var btn = form.querySelector("#crud-change-password");
    var group = form.querySelector(".password-group");
    if (!btn || !group) return;
    btn.addEventListener("click", function () {
      btn.hidden = true;
      group.hidden = false;
      if (global.passwordToggle) global.passwordToggle.bind(group);
      var first = group.querySelector("input");
      if (first) first.focus();
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

    if (field.type === "searchableSelect") {
      var optsSource = typeof field.options === "function" ? field.options() : field.options || [];
      var selectPh = escapeHtml(fieldPlaceholder("select", field.labelKey));
      var selectedLabel = selectPh;
      if (val != null && val !== "") {
        var match = optsSource.find(function (o) {
          return String(o.value) === String(val);
        });
        if (match) selectedLabel = escapeHtml(match.label);
      }
      var optionsHtml = optsSource
        .map(function (opt) {
          var sel = String(val) === String(opt.value) ? " form-search-select__option--selected" : "";
          return (
            '<li class="form-search-select__option' +
            sel +
            '" role="option" data-value="' +
            escapeHtml(opt.value) +
            '" tabindex="0">' +
            escapeHtml(opt.label) +
            "</li>"
          );
        })
        .join("");
      return (
        '<div class="form-field form-search-select" data-field-key="' +
        escapeHtml(field.key) +
        '">' +
        '<label><span data-i18n="' +
        escapeHtml(field.labelKey) +
        '"></span>' +
        req +
        "</label>" +
        '<input type="hidden" name="' +
        escapeHtml(field.key) +
        '" value="' +
        escapeHtml(val) +
        '" />' +
        '<div class="form-search-select__control">' +
        '<button type="button" class="form-search-select__trigger" aria-haspopup="listbox" aria-expanded="false">' +
        '<span class="form-search-select__label">' +
        selectedLabel +
        "</span>" +
        '<img src="../assets/icons/chevron-down.svg" alt="" width="16" height="16" class="form-search-select__chevron" />' +
        "</button>" +
        '<div class="form-search-select__panel" hidden>' +
        '<input type="search" class="form-search-select__search" data-i18n-placeholder="search.placeholder" placeholder="ค้นหา" />' +
        '<ul class="form-search-select__list" role="listbox">' +
        optionsHtml +
        "</ul>" +
        "</div></div>" +
        errSlot +
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
      var optsSource = typeof field.options === "function" ? field.options() : field.options || [];
      var opts = placeholderOpt + optsSource
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

    if (field.type === "passwordGroup") {
      if (editId) {
        return (
          '<div class="form-field form-field--password-group" data-password-group="edit">' +
          '<button type="button" class="btn crud-change-password" id="crud-change-password" data-i18n="crud.changePassword"></button>' +
          '<div class="password-group" hidden>' +
          passwordInputHtml("password", "col.password") +
          passwordInputHtml("password_confirm", "col.passwordConfirm") +
          "</div>" +
          errSlot +
          "</div>"
        );
      }
      return (
        '<div class="password-group-wrap" data-password-group="create">' +
        passwordInputHtml("password", "col.password") +
        passwordInputHtml("password_confirm", "col.passwordConfirm") +
        "</div>"
      );
    }

    if (field.type === "password") {
      var pwdPh = escapeHtml(fieldPlaceholder("input", field.labelKey));
      return (
        '<div class="form-field">' +
        '<label for="crud-field-' +
        escapeHtml(field.key) +
        '"><span data-i18n="' +
        escapeHtml(field.labelKey) +
        '"></span>' +
        req +
        "</label>" +
        '<div class="password-field">' +
        '<input type="password" id="crud-field-' +
        escapeHtml(field.key) +
        '" name="' +
        escapeHtml(field.key) +
        '" value="" placeholder="' +
        pwdPh +
        '" data-i18n-placeholder-input="' +
        escapeHtml(field.labelKey) +
        '" autocomplete="new-password"' +
        (field.required ? " required" : "") +
        " />" +
        '<button type="button" class="password-field__toggle" aria-label=""></button>' +
        "</div>" +
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
      if (next && (f.rowWith === next.key || (f.key === "name_th" && next.key === "name_en"))) {
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
        if (f.type === "select" && !f.options) f.options = state.config.parentOptions();
      });
    }
    ensureFormModal();
    editId = id || null;
    var values = state.config.getFormValues(editId);
    var title = editId ? t("crud.edit") : t("crud.create");
    formOverlay.querySelector("#crud-form-title").textContent = title;
    var form = formOverlay.querySelector("#crud-form");
    var modal = formOverlay.querySelector(".crud-modal");
    form.innerHTML = renderFormFields(state.config.formFields, values);
    if (state.config.permissionMatrix && global.rolePermissionMatrix) {
      form.insertAdjacentHTML("beforeend", global.rolePermissionMatrix.render(editId));
      if (modal) modal.classList.add("crud-modal--wide");
      var matrixRoot = form.querySelector("[data-role-perm-matrix]");
      global.rolePermissionMatrix.bind(matrixRoot, editId);
    } else if (modal) {
      modal.classList.remove("crud-modal--wide");
    }
    if (global.i18n) global.i18n.init();
    bindFormSearchableSelects(form);
    bindPasswordGroup(form);
    if (global.passwordToggle) global.passwordToggle.bind(form);
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
    var modal = formOverlay.querySelector(".crud-modal");
    if (modal) modal.classList.remove("crud-modal--wide");
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
      if (field.type === "passwordGroup") {
        var pwdEl = form.querySelector('[name="password"]');
        var confirmEl = form.querySelector('[name="password_confirm"]');
        values.password = pwdEl ? pwdEl.value.trim() : "";
        values.password_confirm = confirmEl ? confirmEl.value.trim() : "";
        var editWrap = form.querySelector('[data-password-group="edit"]');
        var group = form.querySelector(".password-group");
        values._passwordChange = !editWrap || !group || !group.hidden;
        return;
      }
      var el = form.querySelector('[name="' + field.key + '"]');
      if (!el) return;
      if (field.type === "checkbox") values[field.key] = el.checked;
      else if (field.type === "number") values[field.key] = el.value === "" ? null : Number(el.value);
      else values[field.key] = el.value.trim();
    });
    if (state.config.permissionMatrix && global.rolePermissionMatrix) {
      var matrixRoot = form.querySelector("[data-role-perm-matrix]");
      values._permissionIds = global.rolePermissionMatrix.readSelected(matrixRoot);
    }
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
    var defaultField = state.config.statusSwitchField || "is_active";
    var canUpdate = can("update");
    wrap.querySelectorAll(".crud-status-switch").forEach(function (input) {
      if (!canUpdate) input.disabled = true;
      input.addEventListener("change", function () {
        var field = input.getAttribute("data-switch-field") || defaultField;
        var id = Number(input.getAttribute("data-id"));
        var ts = new Date().toISOString();
        if (
          state.config.statusSwitchExclusive &&
          input.checked &&
          field === defaultField
        ) {
          global.store.getAll(table).forEach(function (r) {
            if (r.id !== id && r[field]) {
              global.store.update(table, r.id, { [field]: false, updated_at: ts });
            }
          });
        }
        global.store.update(table, id, {
          [field]: input.checked,
          updated_at: ts,
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
    var createBtn = state.container.querySelector("#crud-page-create");
    if (createBtn) {
      createBtn.addEventListener("click", function () {
        openForm(null);
      });
    }
    var exportBtn = state.container.querySelector("#crud-page-export");
    if (exportBtn) {
      exportBtn.addEventListener("click", function () {
        global.toast.show(t("crud.exportComingSoon"), "info");
      });
    }
    var importBtn = state.container.querySelector("#crud-page-import");
    if (importBtn) {
      importBtn.addEventListener("click", function () {
        global.toast.show(t("crud.importComingSoon"), "info");
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
    state.columnFilters = {};
    state.page = 1;
    state.sortKey = null;
    state.sortDir = null;
    state.pageSize = config.pageSize || readStoredPageSize();
    container.innerHTML = shellHtml();
    if (global.i18n) global.i18n.init();
    if (global.permissions) global.permissions.applyActionButtons(container);
    bindToolbar();
    bindColumnFilters();
    renderTable();
  }

  function refresh() {
    renderTable();
  }

  global.crudList = { mount: mount, refresh: refresh, renderTable: renderTable };
})(window);

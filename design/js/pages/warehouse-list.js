(function (global) {
  var wh = global.warehouseLib;
  var PERM_MODULE = "warehouse";
  var PERM_TYPE = "warehouse_list";

  var state = {
    query: "",
    statusFilter: "",
    page: 1,
    pageSize: 10,
    expanded: {},
  };

  var formOverlay = null;
  var confirmOverlay = null;
  var pendingDeleteId = null;

  function t(key, params) {
    return wh.t(key, params);
  }

  function warehouses() {
    return global.store
      .getAll("warehouse_list")
      .filter(function (r) {
        return r.deleted_at == null && r.type === "warehouse";
      })
      .sort(function (a, b) {
        return a.sort_order - b.sort_order || a.id - b.id;
      });
  }

  function filteredWarehouses() {
    var q = state.query.trim().toLowerCase();
    return warehouses().filter(function (row) {
      if (state.statusFilter === "active" && !row.is_active) return false;
      if (state.statusFilter === "inactive" && row.is_active) return false;
      if (!q) return true;
      var name = wh.langName(row.id).toLowerCase();
      return name.indexOf(q) >= 0 || String(row.sku).toLowerCase().indexOf(q) >= 0;
    });
  }

  function paginate(rows) {
    var total = rows.length;
    var totalPages = Math.max(1, Math.ceil(total / state.pageSize));
    if (state.page > totalPages) state.page = totalPages;
    if (state.page < 1) state.page = 1;
    var start = (state.page - 1) * state.pageSize;
    return {
      rows: rows.slice(start, start + state.pageSize),
      total: total,
      totalPages: totalPages,
    };
  }

  function zoneCardsHtml(warehouseId) {
    var zones = wh.childrenOf(warehouseId, "zone");
    if (zones.length === 0) {
      return '<p class="wh-expanded__empty">' + wh.escapeHtml(t("warehouse.noZones")) + "</p>";
    }
    return (
      '<div class="wh-zone-grid">' +
      zones
        .map(function (zone) {
          return zoneCardHtml(zone, warehouseId);
        })
        .join("") +
      "</div>"
    );
  }

  function zoneCardHtml(zone, warehouseId) {
    var name = wh.langName(zone.id);
    var condRows = wh.CONDITION_TYPES.map(function (type) {
      var c = wh.getCondition(zone.id, type);
      var inactive = Math.max(0, c.amount - c.amount_active);
      return (
        "<tr>" +
        '<td><div class="wh-cond-type">' +
        '<img src="' +
        wh.conditionTypeIcon(type) +
        '" alt="" width="18" height="18" class="wh-cond-type__icon" />' +
        "<span>" +
        wh.escapeHtml(wh.conditionTypeLabel(type)) +
        "</span></div></td>" +
        '<td class="wh-cond-num">' +
        wh.escapeHtml(c.amount) +
        "</td>" +
        '<td class="wh-cond-num wh-cond-num--active">' +
        wh.escapeHtml(c.amount_active) +
        "</td>" +
        '<td class="wh-cond-num">' +
        wh.escapeHtml(inactive) +
        "</td></tr>"
      );
    }).join("");

    var actions = "";
    if (wh.can("view")) {
      actions +=
        '<a class="btn btn--icon" href="' +
        wh.escapeHtml(global.nav.resolve("pages/warehouse-list-view.html?id=" + warehouseId)) +
        '" aria-label="' +
        wh.escapeHtml(t("action.view")) +
        '"><img src="../assets/icons/clipboard-list.svg" alt="" width="16" height="16" /></a>';
    }
    if (wh.can("update")) {
      actions +=
        '<button type="button" class="btn btn--icon wh-zone-edit" data-id="' +
        zone.id +
        '" data-parent="' +
        warehouseId +
        '" aria-label="' +
        wh.escapeHtml(t("crud.edit")) +
        '"><img src="../assets/icons/pencil.svg" alt="" width="16" height="16" /></button>';
    }
    if (wh.can("delete")) {
      actions +=
        '<button type="button" class="btn btn--icon crud-delete wh-zone-delete" data-id="' +
        zone.id +
        '" aria-label="' +
        wh.escapeHtml(t("crud.delete")) +
        '"><img src="../assets/icons/trash-2.svg" alt="" width="16" height="16" /></button>';
    }

    return (
      '<article class="wh-zone-card">' +
      '<header class="wh-zone-card__head">' +
      '<div class="wh-zone-card__title">' +
      "<strong>" +
      wh.escapeHtml(name || "-") +
      "</strong> " +
      wh.statusSwitchHtml(zone.id, zone.is_active) +
      "</div>" +
      '<div class="wh-zone-card__actions">' +
      actions +
      "</div></header>" +
      '<div class="wh-zone-card__table-wrap">' +
      '<table class="data-table wh-cond-table"><thead><tr>' +
      "<th>" +
      wh.escapeHtml(t("col.type")) +
      "</th>" +
      "<th>" +
      wh.escapeHtml(t("warehouse.amountMax")) +
      "</th>" +
      "<th>" +
      wh.escapeHtml(t("warehouse.amountActive")) +
      "</th>" +
      "<th>" +
      wh.escapeHtml(t("warehouse.amountInactive")) +
      "</th>" +
      "</tr></thead><tbody>" +
      condRows +
      "</tbody></table></div></article>"
    );
  }

  function tableHtml(meta) {
    var colSpan = 8;
    if (meta.rows.length === 0) {
      return (
        '<table class="data-table wh-list-table"><thead><tr>' +
        headerCells() +
        '</tr></thead><tbody><tr><td colspan="' +
        colSpan +
        '" class="crud-empty" data-i18n="crud.empty"></td></tr></tbody></table>'
      );
    }

    var body = meta.rows
      .map(function (row) {
        var stats = wh.warehouseStats(row.id);
        var expanded = !!state.expanded[row.id];
        var name = wh.langName(row.id);
        var chevron = expanded ? "chevron-down.svg" : "chevron-right.svg";
        var editBtn = wh.can("update")
          ? '<button type="button" class="btn btn--icon wh-wh-edit" data-id="' +
            row.id +
            '" aria-label="' +
            wh.escapeHtml(t("crud.edit")) +
            '"><img src="../assets/icons/pencil.svg" alt="" width="16" height="16" /></button>'
          : "";
        var actions = '<div class="data-table__actions">';
        if (wh.can("view")) {
          actions +=
            '<a class="btn btn--icon" href="' +
            wh.escapeHtml(global.nav.resolve("pages/warehouse-list-view.html?id=" + row.id)) +
            '" aria-label="' +
            wh.escapeHtml(t("action.view")) +
            '"><img src="../assets/icons/clipboard-list.svg" alt="" width="16" height="16" /></a>';
        }
        if (wh.can("create")) {
          actions +=
            '<button type="button" class="btn btn--icon crud-add wh-add-zone" data-id="' +
            row.id +
            '" aria-label="' +
            wh.escapeHtml(t("warehouse.addZone")) +
            '"><img src="../assets/icons/plus.svg" alt="" width="16" height="16" /></button>';
        }
        if (wh.can("delete")) {
          actions +=
            '<button type="button" class="btn btn--icon crud-delete wh-wh-delete" data-id="' +
            row.id +
            '" aria-label="' +
            wh.escapeHtml(t("crud.delete")) +
            '"><img src="../assets/icons/trash-2.svg" alt="" width="16" height="16" /></button>';
        }
        actions += "</div>";

        var mainRow =
          "<tr>" +
          '<td class="wh-expand-cell"><button type="button" class="btn btn--icon wh-expand" data-id="' +
          row.id +
          '" aria-expanded="' +
          (expanded ? "true" : "false") +
          '"><img src="../assets/icons/' +
          chevron +
          '" alt="" width="16" height="16" /></button></td>' +
          '<td><div class="wh-name-cell">' +
          '<img src="../assets/icons/warehouse.svg" alt="" width="20" height="20" class="wh-name-cell__icon" />' +
          "<span>" +
          wh.escapeHtml(name || "-") +
          "</span>" +
          editBtn +
          "</div></td>" +
          "<td>" +
          wh.escapeHtml(row.sku) +
          "</td>" +
          "<td>" +
          wh.escapeHtml(stats.skuCount + " SKU") +
          "</td>" +
          "<td>" +
          wh.escapeHtml(wh.formatQty(stats.remainQty) + " " + t("warehouse.pieces")) +
          "</td>" +
          "<td>" +
          wh.escapeHtml(stats.zoneCount + " " + t("warehouse.zonesUnit")) +
          "</td>" +
          "<td>" +
          wh.statusSwitchHtml(row.id, row.is_active) +
          "</td>" +
          "<td>" +
          actions +
          "</td></tr>";

        var detailRow = expanded
          ? '<tr class="wh-expanded-row"><td colspan="' +
            colSpan +
            '"><div class="wh-expanded"><h3 class="wh-expanded__title">' +
            wh.escapeHtml(t("warehouse.details")) +
            "</h3>" +
            zoneCardsHtml(row.id) +
            "</div></td></tr>"
          : "";
        return mainRow + detailRow;
      })
      .join("");

    return (
      '<table class="data-table wh-list-table"><thead><tr>' +
      headerCells() +
      "</tr></thead><tbody>" +
      body +
      "</tbody></table>"
    );
  }

  function headerCells() {
    return (
      '<th class="wh-expand-col" aria-hidden="true"></th>' +
      "<th>" +
      wh.escapeHtml(t("warehouse.warehouseCol")) +
      "</th>" +
      "<th>" +
      wh.escapeHtml(t("warehouse.skuCol")) +
      "</th>" +
      "<th>SKU</th>" +
      "<th>" +
      wh.escapeHtml(t("warehouse.remainCol")) +
      "</th>" +
      "<th>" +
      wh.escapeHtml(t("warehouse.zoneCol")) +
      "</th>" +
      "<th>" +
      wh.escapeHtml(t("col.status")) +
      "</th>" +
      '<th class="data-table__actions-col">' +
      wh.escapeHtml(t("crud.actions")) +
      "</th>"
    );
  }

  function shellHtml() {
    var createBtn = wh.can("create")
      ? '<button type="button" class="btn btn--primary" id="wh-create">' +
        '<img src="../assets/icons/plus.svg" alt="" width="16" height="16" />' +
        "<span>" +
        wh.escapeHtml(t("warehouse.addWarehouse")) +
        "</span></button>"
      : "";
    return (
      '<div class="crud-page wh-page">' +
      '<div class="crud-page-header">' +
      '<div class="crud-page-header__text">' +
      '<h1 class="crud-page-header__title" data-i18n="page.warehouseList"></h1>' +
      '<p class="crud-page-header__desc" data-i18n="page.warehouseList.desc"></p>' +
      "</div>" +
      (createBtn ? '<div class="crud-page-header__actions">' + createBtn + "</div>" : "") +
      "</div>" +
      '<div class="crud-toolbar">' +
      '<div class="crud-toolbar__row">' +
      '<input type="search" class="crud-toolbar__search" id="wh-search" placeholder="' +
      wh.escapeHtml(t("warehouse.searchPlaceholder")) +
      '" />' +
      '<div class="crud-status-filter" id="wh-status-filter" role="group">' +
      statusBtn("", "crud.filterAll") +
      statusBtn("active", "col.active") +
      statusBtn("inactive", "col.inactive") +
      "</div></div></div>" +
      '<div class="crud-table-wrap"><div class="crud-table-wrap__body" id="wh-table"></div></div>' +
      '<nav class="crud-pagination" id="wh-pagination" aria-label="Pagination"></nav>' +
      "</div>"
    );
  }

  function statusBtn(value, key) {
    var active = state.statusFilter === value;
    return (
      '<button type="button" class="crud-status-filter__btn' +
      (active ? " crud-status-filter__btn--active" : "") +
      '" data-status="' +
      value +
      '" aria-pressed="' +
      (active ? "true" : "false") +
      '">' +
      wh.escapeHtml(t(key)) +
      "</button>"
    );
  }

  function render() {
    var root = document.getElementById("wh-root");
    if (!root) return;
    var meta = paginate(filteredWarehouses());
    root.innerHTML = shellHtml();
    document.getElementById("wh-table").innerHTML = tableHtml(meta);
    global.crudList.renderPaginationBar(
      document.getElementById("wh-pagination"),
      { page: state.page, pageSize: state.pageSize },
      meta,
      function (patch) {
        if (patch.pageSize != null) state.pageSize = patch.pageSize;
        if (patch.page != null) state.page = patch.page;
        render();
      }
    );
    if (global.i18n) global.i18n.init();
    bindEvents(root);
  }

  function bindEvents(root) {
    var search = document.getElementById("wh-search");
    if (search) {
      search.value = state.query;
      search.addEventListener("input", function () {
        state.query = search.value;
        state.page = 1;
        render();
      });
    }

    root.querySelectorAll(".crud-status-filter__btn").forEach(function (btn) {
      btn.addEventListener("click", function () {
        state.statusFilter = btn.getAttribute("data-status") || "";
        state.page = 1;
        render();
      });
    });

    root.querySelectorAll(".wh-expand").forEach(function (btn) {
      btn.addEventListener("click", function () {
        var id = Number(btn.getAttribute("data-id"));
        state.expanded[id] = !state.expanded[id];
        render();
      });
    });

    var create = document.getElementById("wh-create");
    if (create) create.addEventListener("click", function () { openWarehouseForm(null); });

    root.querySelectorAll(".wh-wh-edit").forEach(function (btn) {
      btn.addEventListener("click", function () {
        openWarehouseForm(Number(btn.getAttribute("data-id")));
      });
    });
    root.querySelectorAll(".wh-add-zone").forEach(function (btn) {
      btn.addEventListener("click", function () {
        openZoneForm(Number(btn.getAttribute("data-id")), null);
      });
    });
    root.querySelectorAll(".wh-wh-delete").forEach(function (btn) {
      btn.addEventListener("click", function () {
        openDeleteConfirm(Number(btn.getAttribute("data-id")));
      });
    });
    root.querySelectorAll(".wh-zone-edit").forEach(function (btn) {
      btn.addEventListener("click", function () {
        openZoneForm(Number(btn.getAttribute("data-parent")), Number(btn.getAttribute("data-id")));
      });
    });
    root.querySelectorAll(".wh-zone-delete").forEach(function (btn) {
      btn.addEventListener("click", function () {
        openDeleteConfirm(Number(btn.getAttribute("data-id")));
      });
    });

    root.querySelectorAll(".crud-status-switch").forEach(function (input) {
      if (!wh.can("update")) input.disabled = true;
      input.addEventListener("change", function () {
        var id = Number(input.getAttribute("data-id"));
        global.store.update("warehouse_list", id, {
          is_active: input.checked,
          updated_at: wh.now(),
        });
        global.toast.show(t("crud.statusChanged"), "success");
        render();
      });
    });

  }

  function ensureFormModal() {
    if (formOverlay) return;
    formOverlay = document.createElement("div");
    formOverlay.className = "modal-overlay";
    formOverlay.hidden = true;
    formOverlay.innerHTML =
      '<div class="modal crud-modal" role="dialog" aria-modal="true">' +
      '<div class="modal__header"><h2 class="modal__title" id="wh-form-title"></h2>' +
      '<button type="button" class="modal__close" id="wh-form-close"><img src="../assets/icons/x.svg" alt="" width="18" height="18" /></button></div>' +
      '<div class="modal__content"><form id="wh-form" class="crud-form" novalidate></form></div>' +
      '<div class="modal__footer">' +
      '<button type="button" class="btn" id="wh-form-cancel" data-i18n="crud.cancel"></button>' +
      '<button type="submit" form="wh-form" class="btn btn--primary" id="wh-form-save" data-i18n="crud.save"></button>' +
      "</div></div>";
    document.body.appendChild(formOverlay);
    formOverlay.querySelector("#wh-form-close").addEventListener("click", closeForm);
    formOverlay.querySelector("#wh-form-cancel").addEventListener("click", closeForm);
    formOverlay.addEventListener("click", function (e) {
      if (e.target === formOverlay) closeForm();
    });
    formOverlay.querySelector("#wh-form").addEventListener("submit", onFormSubmit);
  }

  function ensureConfirmModal() {
    if (confirmOverlay) return;
    confirmOverlay = document.createElement("div");
    confirmOverlay.className = "modal-overlay";
    confirmOverlay.hidden = true;
    confirmOverlay.innerHTML =
      '<div class="modal" role="dialog" aria-modal="true">' +
      '<div class="modal__header"><h2 class="modal__title" data-i18n="crud.delete"></h2>' +
      '<button type="button" class="modal__close" id="wh-confirm-close"><img src="../assets/icons/x.svg" alt="" width="18" height="18" /></button></div>' +
      '<div class="modal__content"><p class="modal__body" data-i18n="crud.confirmDelete"></p></div>' +
      '<div class="modal__footer">' +
      '<button type="button" class="btn" id="wh-confirm-cancel" data-i18n="crud.cancel"></button>' +
      '<button type="button" class="btn btn--primary" id="wh-confirm-ok" data-i18n="crud.delete"></button>' +
      "</div></div>";
    document.body.appendChild(confirmOverlay);
    confirmOverlay.querySelector("#wh-confirm-close").addEventListener("click", closeConfirm);
    confirmOverlay.querySelector("#wh-confirm-cancel").addEventListener("click", closeConfirm);
    confirmOverlay.querySelector("#wh-confirm-ok").addEventListener("click", onConfirmDelete);
    confirmOverlay.addEventListener("click", function (e) {
      if (e.target === confirmOverlay) closeConfirm();
    });
  }

  var formState = { mode: "", id: null, parentId: null };

  function fieldHtml(key, labelKey, type, value, required) {
    var ph =
      global.i18n && global.i18n.fieldPlaceholder
        ? wh.escapeHtml(global.i18n.fieldPlaceholder("input", labelKey))
        : "";
    return (
      '<div class="form-field">' +
      '<label for="wh-f-' +
      key +
      '">' +
      wh.escapeHtml(t(labelKey)) +
      (required ? ' <span class="form-field__required" aria-hidden="true">*</span>' : "") +
      "</label>" +
      '<input id="wh-f-' +
      key +
      '" name="' +
      key +
      '" type="' +
      (type || "text") +
      '" class="form-input" value="' +
      wh.escapeHtml(value != null ? value : "") +
      '" placeholder="' +
      ph +
      '" data-i18n-placeholder-input="' +
      wh.escapeHtml(labelKey) +
      '"' +
      (required ? " required" : "") +
      " /></div>"
    );
  }

  function nameRowHtml(nameTh, nameEn) {
    return (
      '<div class="crud-form__row">' +
      fieldHtml("name_th", "col.nameTh", "text", nameTh, true) +
      fieldHtml("name_en", "col.nameEn", "text", nameEn, true) +
      "</div>"
    );
  }

  function switchFieldHtml(checked) {
    return (
      '<div class="form-field form-field--switch">' +
      '<label for="wh-f-is_active">' +
      wh.escapeHtml(t("col.active")) +
      "</label>" +
      '<label class="crud-switch">' +
      '<input type="checkbox" role="switch" name="is_active" id="wh-f-is_active"' +
      (checked !== false ? " checked" : "") +
      " />" +
      '<span class="crud-switch__track" aria-hidden="true"><span class="crud-switch__thumb"></span></span>' +
      "</label></div>"
    );
  }

  function openWarehouseForm(id) {
    ensureFormModal();
    formState = { mode: id ? "warehouse-edit" : "warehouse-create", id: id, parentId: null };
    var row = id ? wh.getNode(id) : null;
    document.getElementById("wh-form-title").textContent = id ? t("warehouse.editWarehouse") : t("warehouse.addWarehouse");
    document.getElementById("wh-form").innerHTML =
      nameRowHtml(id ? wh.langName(id, "th") : "", id ? wh.langName(id, "en") : "") +
      fieldHtml("sku", "warehouse.skuCol", "text", row ? row.sku : "", true) +
      switchFieldHtml(row ? row.is_active : true);
    if (global.i18n) global.i18n.init();
    formOverlay.hidden = false;
    document.body.classList.add("modal-open");
  }

  function openZoneForm(parentId, zoneId) {
    ensureFormModal();
    formState = { mode: zoneId ? "zone-edit" : "zone-create", id: zoneId, parentId: parentId };
    var row = zoneId ? wh.getNode(zoneId) : null;
    document.getElementById("wh-form-title").textContent = zoneId ? t("warehouse.editZone") : t("warehouse.addZone");
    var condFields = wh.CONDITION_TYPES.map(function (type) {
      var c = zoneId ? wh.getCondition(zoneId, type) : { amount: 0, amount_active: 0 };
      return (
        '<fieldset class="wh-form-cond"><legend>' +
        wh.escapeHtml(wh.conditionTypeLabel(type)) +
        "</legend>" +
        '<div class="crud-form__row">' +
        fieldHtml(type + "_amount", "warehouse.amountMax", "number", c.amount, false) +
        fieldHtml(type + "_active", "warehouse.amountActive", "number", c.amount_active, false) +
        "</div></fieldset>"
      );
    }).join("");
    document.getElementById("wh-form").innerHTML =
      nameRowHtml(zoneId ? wh.langName(zoneId, "th") : "", zoneId ? wh.langName(zoneId, "en") : "") +
      fieldHtml("sku", "col.sku", "text", row ? row.sku : "", true) +
      switchFieldHtml(row ? row.is_active : true) +
      condFields;
    if (global.i18n) global.i18n.init();
    formOverlay.hidden = false;
    document.body.classList.add("modal-open");
  }

  function closeForm() {
    if (formOverlay) formOverlay.hidden = true;
    document.body.classList.remove("modal-open");
  }

  function openDeleteConfirm(id) {
    ensureConfirmModal();
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

  function onConfirmDelete() {
    if (!pendingDeleteId || !wh.can("delete")) return;
    wh.softDeleteSubtree(pendingDeleteId);
    global.toast.show(t("crud.deleted"), "success");
    closeConfirm();
    render();
  }

  function onFormSubmit(e) {
    e.preventDefault();
    var fd = new FormData(e.target);
    var nameTh = String(fd.get("name_th") || "").trim();
    var nameEn = String(fd.get("name_en") || "").trim();
    var sku = String(fd.get("sku") || "").trim();
    var isActive = fd.get("is_active") === "on";
    if (!nameTh || !nameEn || !sku) {
      global.toast.show(t("error.required"), "error");
      return;
    }

    if (formState.mode === "warehouse-create") {
      if (!wh.can("create")) return;
      var sort =
        warehouses().reduce(function (m, r) {
          return Math.max(m, r.sort_order);
        }, 0) + 100;
      var created = global.store.create("warehouse_list", {
        type: "warehouse",
        sku: sku,
        parent_id: null,
        sort_order: sort,
        capacity: 0,
        is_active: isActive,
        tree_path: "",
        created_at: wh.now(),
        updated_at: wh.now(),
        deleted_at: null,
        created_by: 1,
        updated_by: 1,
      });
      global.store.update("warehouse_list", created.id, {
        tree_path: wh.assignTreePath(created.id, null),
      });
      wh.upsertLang(created.id, "th", nameTh);
      wh.upsertLang(created.id, "en", nameEn);
      global.toast.show(t("crud.created"), "success");
    } else if (formState.mode === "warehouse-edit") {
      if (!wh.can("update") || !formState.id) return;
      global.store.update("warehouse_list", formState.id, {
        sku: sku,
        is_active: isActive,
        updated_at: wh.now(),
      });
      wh.upsertLang(formState.id, "th", nameTh);
      wh.upsertLang(formState.id, "en", nameEn);
      global.toast.show(t("crud.updated"), "success");
    } else if (formState.mode === "zone-create") {
      if (!wh.can("create") || !formState.parentId) return;
      var zSort =
        wh.childrenOf(formState.parentId, "zone").reduce(function (m, r) {
          return Math.max(m, r.sort_order);
        }, 0) + 100;
      var zCreated = global.store.create("warehouse_list", {
        type: "zone",
        sku: sku,
        parent_id: formState.parentId,
        sort_order: zSort,
        capacity: 0,
        is_active: isActive,
        tree_path: "",
        created_at: wh.now(),
        updated_at: wh.now(),
        deleted_at: null,
        created_by: 1,
        updated_by: 1,
      });
      global.store.update("warehouse_list", zCreated.id, {
        tree_path: wh.assignTreePath(zCreated.id, formState.parentId),
      });
      wh.upsertLang(zCreated.id, "th", nameTh);
      wh.upsertLang(zCreated.id, "en", nameEn);
      wh.CONDITION_TYPES.forEach(function (type) {
        var amount = Number(fd.get(type + "_amount")) || 0;
        var active = Number(fd.get(type + "_active")) || 0;
        wh.upsertCondition(zCreated.id, type, amount, active);
      });
      state.expanded[formState.parentId] = true;
      global.toast.show(t("crud.created"), "success");
    } else if (formState.mode === "zone-edit") {
      if (!wh.can("update") || !formState.id) return;
      global.store.update("warehouse_list", formState.id, {
        sku: sku,
        is_active: isActive,
        updated_at: wh.now(),
      });
      wh.upsertLang(formState.id, "th", nameTh);
      wh.upsertLang(formState.id, "en", nameEn);
      wh.CONDITION_TYPES.forEach(function (type) {
        var amount = Number(fd.get(type + "_amount")) || 0;
        var active = Number(fd.get(type + "_active")) || 0;
        wh.upsertCondition(formState.id, type, amount, active);
      });
      global.toast.show(t("crud.updated"), "success");
    }

    closeForm();
    render();
  }

  function boot() {
    global.store.init();
    global.i18n.init();
    if (!global.auth.requireAuth("login.html")) return;
    if (!global.permissions.guardPage(PERM_MODULE, PERM_TYPE, "login.html")) return;

    if (global.crudList) state.pageSize = global.crudList.readStoredPageSize();

    global.layout.mount({
      pageTitle: t("page.warehouseList"),
      contentHtml: '<div id="wh-root"></div>',
    });

    render();

    global.devBar.mount({
      toasts: [
        { type: "success", label: "Created", msgKey: "crud.created" },
        { type: "success", label: "Updated", msgKey: "crud.updated" },
        { type: "success", label: "Deleted", msgKey: "crud.deleted" },
      ],
      actions: [
        {
          group: "Data",
          items: [
            {
              label: "Reset store",
              fn: function () {
                global.store.reset();
                window.location.reload();
              },
            },
          ],
        },
      ],
    });

    document.addEventListener("store:change", render);
    document.addEventListener("i18n:change", render);
    if (global.realtime) {
      global.realtime.onMessage(function () {
        render();
      });
    }
  }

  global.warehouseListPage = { boot: boot };
})(window);

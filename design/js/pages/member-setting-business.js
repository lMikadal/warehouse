(function (global) {
  var lib = global.memberSettingLib;
  var PERM_MODULE = lib.PERM_MODULE;
  var PERM_TYPE = lib.PERM_TYPE;

  var state = {
    query: "",
    statusFilter: "",
    page: 1,
    pageSize: 10,
    expanded: {},
  };

  var formOverlay = null;
  var confirmOverlay = null;
  var pendingDelete = null;
  var formEditId = null;

  function t(key, params) {
    return lib.t(key, params);
  }

  function businesses() {
    return lib
      .activeRows("member_setting_business")
      .slice()
      .sort(function (a, b) {
        var ca = a.created_at || "";
        var cb = b.created_at || "";
        if (ca !== cb) return ca < cb ? -1 : 1;
        return a.id - b.id;
      });
  }

  function filteredBusinesses() {
    var q = state.query.trim().toLowerCase();
    return businesses().filter(function (row) {
      if (state.statusFilter === "active" && !row.is_active) return false;
      if (state.statusFilter === "inactive" && row.is_active) return false;
      if (!q) return true;
      var name = lib.businessName(row.id).toLowerCase();
      return name.indexOf(q) >= 0 || String(row.sku || "").toLowerCase().indexOf(q) >= 0;
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

  function headerCells() {
    return (
      '<th class="wh-expand-col" aria-hidden="true"></th>' +
      "<th>" +
      lib.escapeHtml(t("col.sku")) +
      "</th>" +
      "<th>" +
      lib.escapeHtml(t("col.name")) +
      "</th>" +
      '<th class="data-table__col-center">' +
      lib.escapeHtml(t("col.status")) +
      "</th>" +
      "<th>" +
      lib.escapeHtml(t("col.updatedAt")) +
      "</th>" +
      '<th class="data-table__actions-col">' +
      lib.escapeHtml(t("crud.actions")) +
      "</th>"
    );
  }

  function relationTableHtml(businessId) {
    var rels = lib.relationsForBusiness(businessId);
    if (rels.length === 0) {
      return '<p class="wh-expanded__empty" data-i18n="crud.empty"></p>';
    }
    var body = rels
      .map(function (r) {
        var delBtn = lib.can("delete")
          ? '<button type="button" class="btn btn--icon crud-delete msb-rel-delete" data-id="' +
            r.id +
            '" aria-label="' +
            lib.escapeHtml(t("crud.delete")) +
            '"><img src="../assets/icons/trash-2.svg" alt="" width="16" height="16" /></button>'
          : "";
        return (
          "<tr>" +
          "<td>" +
          lib.escapeHtml(lib.creditName(r.credit_id) || "—") +
          "</td>" +
          "<td>" +
          lib.escapeHtml(lib.groupName(r.group_id) || "—") +
          "</td>" +
          '<td class="data-table__col-center">' +
          lib.statusSwitchHtml(r.id, r.is_active, "relation") +
          "</td>" +
          '<td class="data-table__actions-cell"><div class="data-table__actions">' +
          delBtn +
          "</div></td></tr>"
        );
      })
      .join("");
    return (
      '<table class="data-table msb-rel-table"><thead><tr>' +
      "<th>" +
      lib.escapeHtml(t("page.memberSettingCredit")) +
      "</th>" +
      "<th>" +
      lib.escapeHtml(t("page.memberSettingGroup")) +
      "</th>" +
      '<th class="data-table__col-center">' +
      lib.escapeHtml(t("col.status")) +
      "</th>" +
      '<th class="data-table__actions-col">' +
      lib.escapeHtml(t("crud.actions")) +
      "</th>" +
      "</tr></thead><tbody>" +
      body +
      "</tbody></table>"
    );
  }

  function showRelationFields(editId) {
    return (lib.can("create") || (editId && lib.can("update"))) && !!global.chipMultiSelect;
  }

  function relationFieldsHtml(editId) {
    if (!showRelationFields(editId)) return "";
    var prefill = editId ? lib.relationChipPrefill(editId) : { creditIds: [], groupIds: [] };
    return (
      global.chipMultiSelect.fieldHtml({
        id: "msb-f-credits",
        labelKey: "memberSettingBusiness.paymentMethods",
        placeholderLabelKey: "memberSettingBusiness.paymentMethods",
        required: false,
        selectedIds: prefill.creditIds,
        options: lib.creditOptions(),
      }) +
      global.chipMultiSelect.fieldHtml({
        id: "msb-f-groups",
        labelKey: "memberSettingBusiness.types",
        placeholderLabelKey: "memberSettingBusiness.types",
        required: false,
        selectedIds: prefill.groupIds,
        options: lib.groupOptions(),
      })
    );
  }

  function expandedHtml(row) {
    return (
      '<div class="wh-expanded">' +
      '<h3 class="wh-expanded__title" data-i18n="memberSettingBusiness.relationsTitle"></h3>' +
      relationTableHtml(row.id) +
      "</div>"
    );
  }

  function tableHtml(meta) {
    var colSpan = 6;
    if (meta.rows.length === 0) {
      return (
        '<table class="data-table"><thead><tr>' +
        headerCells() +
        '</tr></thead><tbody><tr><td colspan="' +
        colSpan +
        '" class="crud-empty" data-i18n="crud.empty"></td></tr></tbody></table>'
      );
    }
    var body = meta.rows
      .map(function (row) {
        var expanded = !!state.expanded[row.id];
        var chevron = expanded ? "chevron-down.svg" : "chevron-right.svg";
        var actions = '<div class="data-table__actions">';
        if (lib.can("update")) {
          actions +=
            '<button type="button" class="btn btn--icon msb-edit" data-id="' +
            row.id +
            '" aria-label="' +
            lib.escapeHtml(t("crud.edit")) +
            '"><img src="../assets/icons/pencil.svg" alt="" width="16" height="16" /></button>';
        }
        if (lib.can("delete")) {
          actions +=
            '<button type="button" class="btn btn--icon crud-delete msb-delete" data-id="' +
            row.id +
            '" aria-label="' +
            lib.escapeHtml(t("crud.delete")) +
            '"><img src="../assets/icons/trash-2.svg" alt="" width="16" height="16" /></button>';
        }
        actions += "</div>";
        var mainRow =
          "<tr>" +
          '<td class="wh-expand-cell"><button type="button" class="btn btn--icon msb-expand" data-id="' +
          row.id +
          '" aria-expanded="' +
          (expanded ? "true" : "false") +
          '"><img src="../assets/icons/' +
          chevron +
          '" alt="" width="16" height="16" /></button></td>' +
          "<td>" +
          lib.escapeHtml(row.sku || "—") +
          "</td>" +
          "<td>" +
          lib.escapeHtml(lib.businessName(row.id) || "—") +
          "</td>" +
          '<td class="data-table__col-center">' +
          lib.statusSwitchHtml(row.id, row.is_active, "business") +
          "</td>" +
          '<td class="data-table__cell--datetime">' +
          lib.escapeHtml(global.i18n ? global.i18n.formatDateTime(row.updated_at) : row.updated_at || "—") +
          "</td>" +
          '<td class="data-table__actions-cell">' +
          actions +
          "</td></tr>";
        var detail = expanded
          ? '<tr class="wh-expanded-row"><td colspan="' +
            colSpan +
            '">' +
            expandedHtml(row) +
            "</td></tr>"
          : "";
        return mainRow + detail;
      })
      .join("");
    return (
      '<table class="data-table"><thead><tr>' +
      headerCells() +
      "</tr></thead><tbody>" +
      body +
      "</tbody></table>"
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
      lib.escapeHtml(t(key)) +
      "</button>"
    );
  }

  function shellHtml() {
    var createBtn = lib.can("create")
      ? '<button type="button" class="btn btn--primary" id="msb-create">' +
        '<img src="../assets/icons/plus.svg" alt="" width="16" height="16" />' +
        "<span data-i18n=\"crud.create\"></span></button>"
      : "";
    return (
      '<div class="crud-page">' +
      '<div class="crud-page-header">' +
      '<div class="crud-page-header__text">' +
      '<h1 class="crud-page-header__title" data-i18n="page.memberSettingBusiness"></h1>' +
      '<p class="crud-page-header__desc" data-i18n="page.memberSettingBusiness.desc"></p>' +
      "</div>" +
      (createBtn ? '<div class="crud-page-header__actions">' + createBtn + "</div>" : "") +
      "</div>" +
      '<div class="crud-toolbar"><div class="crud-toolbar__row">' +
      '<input type="search" class="crud-toolbar__search" id="msb-search" data-i18n-placeholder="search.placeholder" placeholder="' +
      lib.escapeHtml(t("search.placeholder")) +
      '" />' +
      '<div class="crud-status-filter" role="group">' +
      statusBtn("", "crud.filterAll") +
      statusBtn("active", "col.active") +
      statusBtn("inactive", "col.inactive") +
      "</div></div></div>" +
      '<div class="crud-table-wrap"><div class="crud-table-wrap__body" id="msb-table"></div></div>' +
      '<nav class="crud-pagination" id="msb-pagination" aria-label="Pagination"></nav>' +
      "</div>"
    );
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

  function bindChip(panel, id) {
    if (!global.chipMultiSelect) return;
    global.chipMultiSelect.bind(panel, id, {
      onChange: function () {
        var el = panel.querySelector("#" + id);
        if (el) clearFieldError(el.closest(".form-field"));
      },
    });
  }

  function bindEvents(root) {
    var search = document.getElementById("msb-search");
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

    root.querySelectorAll(".msb-expand").forEach(function (btn) {
      btn.addEventListener("click", function () {
        var id = Number(btn.getAttribute("data-id"));
        state.expanded[id] = !state.expanded[id];
        render();
      });
    });

    var create = document.getElementById("msb-create");
    if (create) create.addEventListener("click", function () { openForm(null); });

    root.querySelectorAll(".msb-edit").forEach(function (btn) {
      btn.addEventListener("click", function () {
        openForm(Number(btn.getAttribute("data-id")));
      });
    });
    root.querySelectorAll(".msb-delete").forEach(function (btn) {
      btn.addEventListener("click", function () {
        openDeleteConfirm("business", Number(btn.getAttribute("data-id")));
      });
    });
    root.querySelectorAll(".msb-rel-delete").forEach(function (btn) {
      btn.addEventListener("click", function () {
        openDeleteConfirm("relation", Number(btn.getAttribute("data-id")));
      });
    });

    root.querySelectorAll(".crud-status-switch").forEach(function (input) {
      if (!lib.can("update")) input.disabled = true;
      input.addEventListener("change", function () {
        var id = Number(input.getAttribute("data-id"));
        var kind = input.getAttribute("data-kind") || "business";
        var table = kind === "relation" ? "member_setting_relation" : "member_setting_business";
        global.store.update(table, id, { is_active: input.checked, updated_at: lib.now() });
        global.toast.show(t("crud.statusChanged"), "success");
      });
    });

  }

  function validateRelationSelection(form, creditIds, groupIds) {
    var creditEl = form.querySelector("#msb-f-credits");
    var groupEl = form.querySelector("#msb-f-groups");
    if (!creditEl && !groupEl) return true;
    var ok = true;
    if (creditIds.length && !groupIds.length) {
      showFieldError(groupEl.closest(".form-field"), t("error.required"));
      ok = false;
    }
    if (!creditIds.length && groupIds.length) {
      showFieldError(creditEl.closest(".form-field"), t("error.required"));
      ok = false;
    }
    return ok;
  }

  function applyRelationsFromForm(form, businessId, isEdit) {
    if (!showRelationFields(isEdit ? businessId : null)) return;
    var creditIds = global.chipMultiSelect.getSelectedIds(form, "msb-f-credits");
    var groupIds = global.chipMultiSelect.getSelectedIds(form, "msb-f-groups");
    if (isEdit) lib.syncRelations(businessId, creditIds, groupIds);
    else if (creditIds.length && groupIds.length) lib.addRelations(businessId, creditIds, groupIds);
  }

  function render() {
    var root = document.getElementById("msb-root");
    if (!root) return;
    var meta = paginate(filteredBusinesses());
    root.innerHTML = shellHtml();
    document.getElementById("msb-table").innerHTML = tableHtml(meta);
    global.crudList.renderPaginationBar(
      document.getElementById("msb-pagination"),
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

  var renderQueued = false;
  function queueRender() {
    if (renderQueued) return;
    renderQueued = true;
    setTimeout(function () {
      renderQueued = false;
      render();
    }, 0);
  }

  function fieldHtml(key, labelKey, value, required) {
    var ph =
      global.i18n && global.i18n.fieldPlaceholder
        ? lib.escapeHtml(global.i18n.fieldPlaceholder("input", labelKey))
        : "";
    return (
      '<div class="form-field">' +
      '<label for="msb-f-' +
      key +
      '"><span data-i18n="' +
      lib.escapeHtml(labelKey) +
      '"></span>' +
      (required ? ' <span class="form-field__required" aria-hidden="true">*</span>' : "") +
      "</label>" +
      '<input id="msb-f-' +
      key +
      '" name="' +
      key +
      '" type="text" value="' +
      lib.escapeHtml(value != null ? value : "") +
      '" placeholder="' +
      ph +
      '" data-i18n-placeholder-input="' +
      lib.escapeHtml(labelKey) +
      '"' +
      (required ? " required" : "") +
      " />" +
      '<div class="form-field__error-slot" aria-live="polite">' +
      '<p class="form-field__error" hidden role="alert"></p></div></div>'
    );
  }

  function ensureFormModal() {
    if (formOverlay) return;
    formOverlay = document.createElement("div");
    formOverlay.className = "modal-overlay";
    formOverlay.hidden = true;
    formOverlay.innerHTML =
      '<div class="modal crud-modal" role="dialog" aria-modal="true">' +
      '<div class="modal__header"><h2 class="modal__title" id="msb-form-title"></h2>' +
      '<button type="button" class="modal__close" id="msb-form-close"><img src="../assets/icons/x.svg" alt="" width="18" height="18" /></button></div>' +
      '<div class="modal__content"><form id="msb-form" class="crud-form" novalidate></form></div>' +
      '<div class="modal__footer">' +
      '<button type="button" class="btn" id="msb-form-cancel"></button>' +
      '<button type="submit" form="msb-form" class="btn btn--primary" data-i18n="crud.save"></button>' +
      "</div></div>";
    document.body.appendChild(formOverlay);
    formOverlay.querySelector("#msb-form-close").addEventListener("click", closeForm);
    formOverlay.querySelector("#msb-form-cancel").addEventListener("click", closeForm);
    formOverlay.addEventListener("click", function (e) {
      if (e.target === formOverlay) closeForm();
    });
    formOverlay.querySelector("#msb-form").addEventListener("submit", onFormSubmit);
  }

  function ensureConfirmModal() {
    if (confirmOverlay) return;
    confirmOverlay = document.createElement("div");
    confirmOverlay.className = "modal-overlay";
    confirmOverlay.hidden = true;
    confirmOverlay.innerHTML =
      '<div class="modal" role="dialog" aria-modal="true">' +
      '<div class="modal__header"><h2 class="modal__title" data-i18n="crud.delete"></h2>' +
      '<button type="button" class="modal__close" id="msb-confirm-close"><img src="../assets/icons/x.svg" alt="" width="18" height="18" /></button></div>' +
      '<div class="modal__content"><p class="modal__body" data-i18n="crud.confirmDelete"></p></div>' +
      '<div class="modal__footer">' +
      '<button type="button" class="btn" id="msb-confirm-cancel" data-i18n="crud.cancel"></button>' +
      '<button type="button" class="btn btn--primary" id="msb-confirm-ok" data-i18n="crud.delete"></button>' +
      "</div></div>";
    document.body.appendChild(confirmOverlay);
    confirmOverlay.querySelector("#msb-confirm-close").addEventListener("click", closeConfirm);
    confirmOverlay.querySelector("#msb-confirm-cancel").addEventListener("click", closeConfirm);
    confirmOverlay.querySelector("#msb-confirm-ok").addEventListener("click", onConfirmDelete);
    confirmOverlay.addEventListener("click", function (e) {
      if (e.target === confirmOverlay) closeConfirm();
    });
  }

  function openForm(id) {
    ensureFormModal();
    formEditId = id || null;
    var row = id ? global.store.getById("member_setting_business", id) : null;
    document.getElementById("msb-form-title").textContent = id ? t("crud.edit") : t("crud.create");
    var cancel = document.getElementById("msb-form-cancel");
    cancel.setAttribute("data-i18n", id ? "crud.cancel" : "crud.back");
    var nameTh = id ? lib.langName("member_setting_business_language", "member_setting_business_id", id, "th") : "";
    var nameEn = id ? lib.langName("member_setting_business_language", "member_setting_business_id", id, "en") : "";
    var formEl = document.getElementById("msb-form");
    formEl.innerHTML =
      fieldHtml("sku", "col.sku", row ? row.sku : "", false) +
      '<div class="crud-form__row">' +
      fieldHtml("name_th", "col.nameTh", nameTh, true) +
      fieldHtml("name_en", "col.nameEn", nameEn, true) +
      "</div>" +
      relationFieldsHtml(id) +
      '<div class="form-field form-field--switch">' +
      '<label for="msb-f-is_active"><span data-i18n="col.active"></span></label>' +
      '<label class="crud-switch">' +
      '<input type="checkbox" role="switch" name="is_active" id="msb-f-is_active"' +
      (!row || row.is_active ? " checked" : "") +
      " />" +
      '<span class="crud-switch__track" aria-hidden="true"><span class="crud-switch__thumb"></span></span>' +
      "</label></div>";
    if (global.i18n) global.i18n.init();
    formEl.querySelectorAll("input").forEach(function (el) {
      el.addEventListener("input", function () {
        clearFieldError(el.closest(".form-field"));
      });
    });
    bindChip(formEl, "msb-f-credits");
    bindChip(formEl, "msb-f-groups");
    formOverlay.hidden = false;
    document.body.classList.add("modal-open");
  }

  function closeForm() {
    if (formOverlay) formOverlay.hidden = true;
    document.body.classList.remove("modal-open");
    formEditId = null;
  }

  function openDeleteConfirm(kind, id) {
    ensureConfirmModal();
    pendingDelete = { kind: kind, id: id };
    if (global.i18n) global.i18n.init();
    confirmOverlay.hidden = false;
    document.body.classList.add("modal-open");
  }

  function closeConfirm() {
    pendingDelete = null;
    if (confirmOverlay) confirmOverlay.hidden = true;
    document.body.classList.remove("modal-open");
  }

  function onConfirmDelete() {
    if (!pendingDelete || !lib.can("delete")) return;
    if (pendingDelete.kind === "relation") lib.deleteRelation(pendingDelete.id);
    else lib.deleteBusiness(pendingDelete.id);
    global.toast.show(t("crud.deleted"), "success");
    closeConfirm();
    render();
  }

  function onFormSubmit(e) {
    e.preventDefault();
    var form = e.target;
    var fd = new FormData(form);
    var sku = String(fd.get("sku") || "").trim();
    var nameTh = String(fd.get("name_th") || "").trim();
    var nameEn = String(fd.get("name_en") || "").trim();
    var isActive = fd.get("is_active") === "on";
    var ok = true;
    if (!nameTh) {
      showFieldError(form.querySelector("#msb-f-name_th").closest(".form-field"), t("error.required"));
      ok = false;
    }
    if (!nameEn) {
      showFieldError(form.querySelector("#msb-f-name_en").closest(".form-field"), t("error.required"));
      ok = false;
    }
    if (lib.skuTaken(sku, formEditId)) {
      showFieldError(form.querySelector("#msb-f-sku").closest(".form-field"), t("error.codeTaken"));
      ok = false;
    }
    var creditIds = global.chipMultiSelect
      ? global.chipMultiSelect.getSelectedIds(form, "msb-f-credits")
      : [];
    var groupIds = global.chipMultiSelect
      ? global.chipMultiSelect.getSelectedIds(form, "msb-f-groups")
      : [];
    if (!validateRelationSelection(form, creditIds, groupIds)) ok = false;
    if (
      formEditId &&
      lib.wouldRemoveRelations(formEditId, creditIds, groupIds) &&
      !lib.can("delete")
    ) {
      global.toast.show(t("error.forbidden"), "error");
      ok = false;
    }
    if (!ok) return;

    var businessId;
    if (formEditId) {
      if (!lib.can("update")) return;
      businessId = formEditId;
      global.store.update("member_setting_business", formEditId, {
        sku: sku || null,
        is_active: isActive,
        updated_at: lib.now(),
      });
      lib.upsertLang("member_setting_business_language", "member_setting_business_id", formEditId, "th", nameTh);
      lib.upsertLang("member_setting_business_language", "member_setting_business_id", formEditId, "en", nameEn);
      applyRelationsFromForm(form, businessId, true);
      global.toast.show(t("crud.updated"), "success");
    } else {
      if (!lib.can("create")) return;
      var created = global.store.create("member_setting_business", {
        sku: sku || null,
        is_active: isActive,
        created_at: lib.now(),
        updated_at: lib.now(),
        deleted_at: null,
        created_by: 1,
        updated_by: 1,
      });
      businessId = created.id;
      lib.upsertLang("member_setting_business_language", "member_setting_business_id", created.id, "th", nameTh);
      lib.upsertLang("member_setting_business_language", "member_setting_business_id", created.id, "en", nameEn);
      applyRelationsFromForm(form, businessId, false);
      state.expanded[created.id] = true;
      global.toast.show(t("crud.created"), "success");
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
      pageTitle: t("page.memberSettingBusiness"),
      contentHtml: '<div id="msb-root"></div>',
    });

    render();

    global.devBar.mount({
      toasts: [
        { type: "success", label: "Created", msgKey: "crud.created" },
        { type: "success", label: "Updated", msgKey: "crud.updated" },
        { type: "success", label: "Deleted", msgKey: "crud.deleted" },
        { type: "success", label: "Status changed", msgKey: "crud.statusChanged" },
      ],
    });

    document.addEventListener("store:change", queueRender);
    document.addEventListener("i18n:change", render);
    if (global.realtime) {
      global.realtime.onMessage(function () {
        render();
      });
    }
  }

  global.memberSettingBusinessPage = { boot: boot };
})(window);

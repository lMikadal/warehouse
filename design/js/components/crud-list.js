(function (global) {
  var formOverlay = null;
  var confirmOverlay = null;
  var state = { config: null, permModule: null, permType: null, container: null, query: "" };

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

  function shellHtml() {
    var showCreate = state.config.canCreate !== false && !state.config.readOnly && can("create");
    return (
      '<div class="crud-page">' +
      '  <div class="crud-toolbar">' +
      '    <input type="search" class="crud-toolbar__search" id="crud-search" data-i18n-placeholder="crud.search" placeholder="ค้นหา" />' +
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
      '  <div class="crud-table-wrap" id="crud-table-wrap"></div>' +
      "</div>"
    );
  }

  function renderTable() {
    var wrap = state.container.querySelector("#crud-table-wrap");
    if (!wrap || !state.config) return;

    var rows = state.config.listRows().filter(function (row) {
      if (!state.query) return true;
      return state.config.searchFilter(row, state.query.toLowerCase());
    });

    if (rows.length === 0) {
      wrap.innerHTML = '<p class="crud-empty" data-i18n="crud.empty"></p>';
      if (global.i18n) global.i18n.init();
      return;
    }

    var head = state.config.columns
      .map(function (col) {
        return '<th data-i18n="' + escapeHtml(col.labelKey) + '"></th>';
      })
      .join("");
    if (!state.config.readOnly && (can("update") || can("delete"))) {
      head += '<th class="data-table__actions-col" data-i18n="crud.actions"></th>';
    }

    var body = rows
      .map(function (row) {
        var cells = state.config.columns
          .map(function (col) {
            var val = col.render ? col.render(row) : escapeHtml(row[col.id] != null ? row[col.id] : "");
            return "<td>" + val + "</td>";
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
        return "<tr>" + cells + "</tr>";
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

    if (state.config.afterRender) state.config.afterRender(wrap);
  }

  function ensureFormModal() {
    if (formOverlay) return;
    formOverlay = document.createElement("div");
    formOverlay.className = "modal-overlay";
    formOverlay.hidden = true;
    formOverlay.innerHTML =
      '<div class="modal crud-modal" role="dialog" aria-modal="true">' +
      '  <div class="modal__header">' +
      '    <h2 class="modal__title" id="crud-form-title"></h2>' +
      '    <button type="button" class="modal__close btn" id="crud-form-close" aria-label="Close">&times;</button>' +
      "  </div>" +
      '  <form id="crud-form" class="crud-form" novalidate></form>' +
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
      '<div class="modal" role="dialog" aria-modal="true">' +
      '  <div class="modal__header">' +
      '    <h2 class="modal__title" data-i18n="crud.delete"></h2>' +
      '    <button type="button" class="modal__close btn" id="crud-confirm-close" aria-label="Close">&times;</button>' +
      "  </div>" +
      '  <p class="modal__body" data-i18n="crud.confirmDelete"></p>' +
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
      return (
        '<div class="form-field">' +
        '<label class="form-field__checkbox">' +
        '<input type="checkbox" name="' +
        escapeHtml(field.key) +
        '" id="crud-field-' +
        escapeHtml(field.key) +
        '"' +
        (val ? " checked" : "") +
        " /> " +
        '<span data-i18n="' +
        escapeHtml(field.labelKey) +
        '"></span>' +
        req +
        "</label>" +
        errSlot +
        "</div>"
      );
    }

    if (field.type === "select") {
      var opts = (field.options || [])
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
    var ph = field.placeholderKey ? ' data-i18n-placeholder="' + escapeHtml(field.placeholderKey) + '"' : "";
    var phAttr = field.placeholder ? ' placeholder="' + escapeHtml(field.placeholder) + '"' : "";
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
      '"' +
      ph +
      phAttr +
      (field.required ? " required" : "") +
      " />" +
      errSlot +
      "</div>"
    );
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
    form.innerHTML = state.config.formFields.map(function (f) {
      return fieldHtml(f, values);
    }).join("");
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
      global.toast.show(t("crud.saved"), "success");
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

  function bindToolbar() {
    var search = state.container.querySelector("#crud-search");
    if (search) {
      search.addEventListener("input", function () {
        state.query = search.value;
        renderTable();
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

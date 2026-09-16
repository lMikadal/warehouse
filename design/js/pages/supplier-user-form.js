(function (global) {
  var supplierId = null;
  var isEdit = false;
  var activeTab = "general";
  var pendingContacts = [];
  var nextDraftId = -1;
  var pendingBanks = [];
  var nextBankDraftId = -1;
  var contactModal = null;
  var bankModal = null;
  var confirmOverlay = null;
  var confirmAction = null;

  function t(key, vars) {
    if (!global.i18n) return key;
    return vars ? global.i18n.format(key, vars) : global.i18n.t(key);
  }

  function now() {
    return new Date().toISOString();
  }

  function escapeHtml(s) {
    return String(s)
      .replace(/&/g, "&amp;")
      .replace(/</g, "&lt;")
      .replace(/>/g, "&gt;")
      .replace(/"/g, "&quot;");
  }

  function locale() {
    return global.i18n ? global.i18n.getLocale() : "th";
  }

  function langName(langTable, parentKey, parentId, loc) {
    var row = global.store.getAll(langTable).find(function (r) {
      return r[parentKey] === parentId && r.locale === (loc || locale());
    });
    return row ? row.name : "";
  }

  function can(action) {
    return global.permissions.canAction("supplier", "supplier_user", action);
  }

  function canManageContacts() {
    return isEdit ? can("update") : can("create");
  }

  function canDeleteContacts() {
    return isEdit ? can("delete") : can("create");
  }

  function contactKey(c) {
    return isEdit ? c.id : c._draftId;
  }

  function getContactRows() {
    if (isEdit) {
      return global.store
        .getAll("supplier_contact")
        .filter(function (c) {
          return c.supplier_user_id === supplierId && c.deleted_at == null;
        })
        .sort(function (a, b) {
          return a.sort_order - b.sort_order || a.id - b.id;
        });
    }
    return pendingContacts.slice().sort(function (a, b) {
      return a.sort_order - b.sort_order || a._draftId - b._draftId;
    });
  }

  function findContact(id) {
    if (isEdit) return global.store.getById("supplier_contact", id);
    for (var i = 0; i < pendingContacts.length; i++) {
      if (pendingContacts[i]._draftId === id) return pendingContacts[i];
    }
    return null;
  }

  function persistPendingContacts(sid) {
    if (!pendingContacts.length) return;
    var actor = global.auth.getUser();
    var actorId = actor ? actor.id : 1;
    pendingContacts.forEach(function (c, i) {
      global.store.create(
        "supplier_contact",
        {
          supplier_user_id: sid,
          name: c.name,
          email: c.email,
          tel: c.tel,
          position: c.position,
          sort_order: c.sort_order || (i + 1) * 100,
          created_at: now(),
          updated_at: now(),
          deleted_at: null,
          created_by: actorId,
          updated_by: actorId,
        }
      );
    });
    pendingContacts = [];
    nextDraftId = -1;
  }

  function canManageBanks() {
    return isEdit ? can("update") : can("create");
  }

  function canDeleteBanks() {
    return isEdit ? can("delete") : can("create");
  }

  function bankKey(b) {
    return isEdit ? b.id : b._draftId;
  }

  function getBankRows() {
    if (isEdit) {
      return global.store
        .getAll("supplier_bank")
        .filter(function (b) {
          return b.supplier_user_id === supplierId && b.deleted_at == null;
        })
        .sort(function (a, b) {
          return a.sort_order - b.sort_order || a.id - b.id;
        });
    }
    return pendingBanks.slice().sort(function (a, b) {
      return a.sort_order - b.sort_order || a._draftId - b._draftId;
    });
  }

  function findBank(id) {
    if (isEdit) return global.store.getById("supplier_bank", id);
    for (var i = 0; i < pendingBanks.length; i++) {
      if (pendingBanks[i]._draftId === id) return pendingBanks[i];
    }
    return null;
  }

  function clearBankDefaultsInDrafts(exceptDraftId) {
    pendingBanks.forEach(function (b) {
      if (b._draftId !== exceptDraftId) b.is_default = false;
    });
  }

  function persistPendingBanks(sid) {
    if (!pendingBanks.length) return;
    var actor = global.auth.getUser();
    var actorId = actor ? actor.id : 1;
    pendingBanks.forEach(function (b, i) {
      global.store.create(
        "supplier_bank",
        {
          supplier_user_id: sid,
          setting_bank_id: b.setting_bank_id,
          name: b.name,
          number: b.number,
          branch: b.branch,
          is_active: b.is_active !== false,
          is_default: !!b.is_default,
          sort_order: b.sort_order || (i + 1) * 100,
          created_at: now(),
          updated_at: now(),
          deleted_at: null,
          created_by: actorId,
          updated_by: actorId,
        }
      );
    });
    pendingBanks = [];
    nextBankDraftId = -1;
  }

  function queryId() {
    var m = window.location.search.match(/[?&]id=(\d+)/);
    return m ? Number(m[1]) : null;
  }

  function getInformation(supplierUserId, type) {
    return (
      global.store.getAll("supplier_information").find(function (r) {
        return r.supplier_user_id === supplierUserId && r.type === type;
      }) || null
    );
  }

  function upsertInformation(supplierUserId, type, data) {
    var existing = getInformation(supplierUserId, type);
    var row = Object.assign({ supplier_user_id: supplierUserId, type: type }, data);
    if (existing) {
      var rows = global.store.getAll("supplier_information");
      var idx = rows.findIndex(function (r) {
        return r.id === existing.id;
      });
      global.store.updateAt("supplier_information", idx, row);
    } else {
      global.store.create(
        "supplier_information",
        Object.assign({ id: global.store.nextId("supplier_information") }, row)
      );
    }
  }

  function prefixOptions() {
    return global.store
      .getAll("setting_prefix")
      .filter(function (r) {
        return r.deleted_at == null && r.is_active && r.is_company;
      })
      .map(function (r) {
        return { value: r.id, label: langName("setting_prefix_language", "setting_prefix_id", r.id) };
      });
  }

  function bankOptions() {
    return global.store
      .getAll("setting_bank")
      .filter(function (r) {
        return r.deleted_at == null && r.is_active;
      })
      .map(function (r) {
        return { value: r.id, label: langName("setting_bank_language", "setting_bank_id", r.id) };
      });
  }

  function provinceOptions(selectedId) {
    return global.store
      .getAll("system_province")
      .filter(function (r) {
        return r.deleted_at == null && r.is_active;
      })
      .map(function (r) {
        var sel = String(selectedId) === String(r.id) ? " selected" : "";
        return (
          '<option value="' +
          r.id +
          '"' +
          sel +
          ">" +
          escapeHtml(langName("system_province_language", "system_province_id", r.id)) +
          "</option>"
        );
      })
      .join("");
  }

  function districtOptions(provinceId, selectedId) {
    if (!provinceId) return "";
    return global.store
      .getAll("system_district")
      .filter(function (r) {
        return r.deleted_at == null && r.is_active && r.system_province_id === Number(provinceId);
      })
      .map(function (r) {
        var sel = String(selectedId) === String(r.id) ? " selected" : "";
        return (
          '<option value="' +
          r.id +
          '"' +
          sel +
          ">" +
          escapeHtml(langName("system_district_language", "system_district_id", r.id)) +
          "</option>"
        );
      })
      .join("");
  }

  function subDistrictOptions(districtId, selectedId) {
    if (!districtId) return "";
    return global.store
      .getAll("system_sub_district")
      .filter(function (r) {
        return r.deleted_at == null && r.is_active && r.system_district_id === Number(districtId);
      })
      .map(function (r) {
        var sel = String(selectedId) === String(r.id) ? " selected" : "";
        return (
          '<option value="' +
          r.id +
          '"' +
          sel +
          ">" +
          escapeHtml(langName("system_sub_district_language", "website_sub_district_id", r.id)) +
          "</option>"
        );
      })
      .join("");
  }

  function selectField(labelKey, name, optionsHtml, required) {
    var ph = escapeHtml(t("form.placeholder.select", { label: t(labelKey) }));
    return (
      '<div class="form-field">' +
      '<label for="' +
      escapeHtml(name) +
      '"><span data-i18n="' +
      escapeHtml(labelKey) +
      '"></span>' +
      (required ? '<span class="form-field__required">*</span>' : "") +
      "</label>" +
      '<select id="' +
      escapeHtml(name) +
      '" name="' +
      escapeHtml(name) +
      '"' +
      (required ? " required" : "") +
      ">" +
      '<option value="" disabled' +
      (optionsHtml.indexOf(" selected") >= 0 ? "" : " selected") +
      ">" +
      ph +
      "</option>" +
      optionsHtml +
      "</select>" +
      '<div class="form-field__error-slot"><span class="form-field__error" hidden></span></div>' +
      "</div>"
    );
  }

  function textField(labelKey, name, value, required, type, disabled) {
    type = type || "text";
    var ph = escapeHtml(t("form.placeholder.input", { label: t(labelKey) }));
    var telAttrs = type === "tel" ? ' inputmode="tel" autocomplete="tel"' : "";
    return (
      '<div class="form-field">' +
      '<label for="' +
      escapeHtml(name) +
      '"><span data-i18n="' +
      escapeHtml(labelKey) +
      '"></span>' +
      (required ? '<span class="form-field__required">*</span>' : "") +
      "</label>" +
      '<input type="' +
      type +
      '" id="' +
      escapeHtml(name) +
      '" name="' +
      escapeHtml(name) +
      '" value="' +
      escapeHtml(value || "") +
      '" placeholder="' +
      ph +
      '"' +
      telAttrs +
      (required ? " required" : "") +
      (disabled ? " disabled" : "") +
      " />" +
      '<div class="form-field__error-slot"><span class="form-field__error" hidden></span></div>' +
      "</div>"
    );
  }

  function textareaField(labelKey, name, value) {
    var ph = escapeHtml(t("form.placeholder.input", { label: t(labelKey) }));
    return (
      '<div class="form-field">' +
      '<label for="' +
      escapeHtml(name) +
      '"><span data-i18n="' +
      escapeHtml(labelKey) +
      '"></span></label>' +
      '<textarea id="' +
      escapeHtml(name) +
      '" name="' +
      escapeHtml(name) +
      '" rows="3" placeholder="' +
      ph +
      '">' +
      escapeHtml(value || "") +
      "</textarea>" +
      '<div class="form-field__error-slot"><span class="form-field__error" hidden></span></div>' +
      "</div>"
    );
  }

  function branchRadios(prefix, branch) {
    var hq = branch === "headquarter" ? " checked" : "";
    var br = branch === "branch" ? " checked" : "";
    return (
      '<div class="form-field">' +
      '<span class="form-field__group-label" data-i18n="col.branch"></span>' +
      '<div class="form-field__radios">' +
      '<label><input type="radio" name="' +
      prefix +
      '_branch" value="headquarter"' +
      hq +
      ' /> <span data-i18n="entityBranch.headquarter"></span></label>' +
      '<label><input type="radio" name="' +
      prefix +
      '_branch" value="branch"' +
      br +
      ' /> <span data-i18n="entityBranch.branch"></span></label>' +
      "</div></div>"
    );
  }

  function informationCard(titleKey, prefix, info, opts) {
    opts = opts || {};
    info = info || {};
    var prefixOpts = prefixOptions()
      .map(function (o) {
        var sel = String(info.setting_prefix_id) === String(o.value) ? " selected" : "";
        return '<option value="' + o.value + '"' + sel + ">" + escapeHtml(o.label) + "</option>";
      })
      .join("");
    var provId = info.website_province_id || "";
    var distId = info.website_district_id || "";
    var subId = info.website_sub_district_id || "";
    var branchDisabled = info.branch !== "branch" ? " disabled" : "";
    var hiddenClass = opts.sameHidden ? " supplier-form__section--hidden" : "";

    var sameSwitch = opts.sameSwitch
      ? '<div class="form-field form-field--switch supplier-form__same-switch">' +
        '<span data-i18n="supplier.invoiceSameAsContact"></span>' +
        '<label class="crud-switch">' +
        '<input type="checkbox" role="switch" id="' +
        prefix +
        '_same"' +
        (info.is_same_information ? " checked" : "") +
        " />" +
        '<span class="crud-switch__track"><span class="crud-switch__thumb"></span></span>' +
        "</label></div>"
      : "";

    var prefixField = opts.showPrefix
      ? selectField("col.prefix", prefix + "_prefix_id", prefixOpts, false)
      : "";
    var taxField = opts.showTax
      ? global.otpInput.render({
          id: prefix + "_tax_number",
          labelKey: "col.taxNumber",
          value: info.tax_number,
        })
      : "";
    var nameLabelKey = opts.nameLabelKey || "col.companyName";
    var branchFields = opts.showBranch
      ? branchRadios(prefix, info.branch) +
        textField(
          "col.branchName",
          prefix + "_branch_name",
          info.branch_name,
          false,
          "text",
          info.branch !== "branch"
        )
      : "";
    var contactFields =
      opts.showContactFields !== false
        ? '<div class="supplier-form__row">' +
          textField("col.tel", prefix + "_tel", info.tel, false, "tel") +
          textField("col.email", prefix + "_email", info.email, false, "email") +
          "</div>"
        : "";

    return (
      '<section class="supplier-form__card' +
      hiddenClass +
      '" data-info-prefix="' +
      prefix +
      '">' +
      '<div class="supplier-form__card-head">' +
      '<h3 class="supplier-form__card-title" data-i18n="' +
      escapeHtml(titleKey) +
      '"></h3>' +
      sameSwitch +
      "</div>" +
      '<div class="supplier-form__card-body' +
      (opts.sameHidden ? " supplier-form__fields--hidden" : "") +
      '" data-fields="' +
      prefix +
      '">' +
      '<div class="supplier-form__row">' +
      prefixField +
      textField(nameLabelKey, prefix + "_name", info.name, prefix === "contact", "text") +
      "</div>" +
      (taxField ? '<div class="supplier-form__row">' + taxField + "</div>" : "") +
      (branchFields ? '<div class="supplier-form__row">' + branchFields + "</div>" : "") +
      textareaField("col.address", prefix + "_address", info.address) +
      '<div class="supplier-form__row supplier-form__row--geo">' +
      selectField("col.province", prefix + "_province_id", provinceOptions(provId), false) +
      selectField("col.district", prefix + "_district_id", districtOptions(provId, distId), false) +
      selectField("col.subDistrict", prefix + "_sub_district_id", subDistrictOptions(distId, subId), false) +
      textField("col.postcode", prefix + "_postcode", info.postcode, false) +
      "</div>" +
      contactFields +
      "</div></section>"
    );
  }

  function contactsHtml() {
    var contacts = getContactRows();
    var list =
      contacts.length === 0
        ? '<p class="supplier-form__hint" data-i18n="crud.empty"></p>'
        : contacts
            .map(function (c) {
              var key = contactKey(c);
              return (
                '<div class="supplier-sublist__item">' +
                '<div class="supplier-sublist__main">' +
                '<div class="supplier-sublist__title">' +
                escapeHtml(c.name) +
                "</div>" +
                '<div class="supplier-sublist__meta">' +
                escapeHtml(c.tel || "—") +
                " · " +
                escapeHtml(c.email || "—") +
                (c.position ? " · " + escapeHtml(c.position) : "") +
                "</div></div>" +
                '<div class="supplier-sublist__actions">' +
                (canManageContacts()
                  ? '<button type="button" class="btn btn--icon supplier-contact-edit" data-id="' +
                    key +
                    '"><img src="../assets/icons/pencil.svg" alt="" width="16" height="16" /></button>'
                  : "") +
                (canDeleteContacts()
                  ? '<button type="button" class="btn btn--icon crud-delete supplier-contact-delete" data-id="' +
                    key +
                    '"><img src="../assets/icons/trash-2.svg" alt="" width="16" height="16" /></button>'
                  : "") +
                "</div></div>"
              );
            })
            .join("");
    var addBtn = canManageContacts()
      ? '<button type="button" class="btn btn--primary" id="supplier-add-contact">' +
        '<img src="../assets/icons/plus.svg" alt="" width="16" height="16" />' +
        '<span data-i18n="crud.create"></span></button>'
      : "";
    return (
      '<div class="supplier-form__sublist-head">' +
      addBtn +
      "</div>" +
      '<div class="supplier-sublist">' +
      list +
      "</div>"
    );
  }

  function banksHtml() {
    var credit = isEdit ? global.store.getById("supplier_user", supplierId) : null;
    var creditVal = credit && credit.credit_term != null ? String(credit.credit_term) : "";
    var creditNote = credit && credit.credit_term_note ? credit.credit_term_note : "";
    var creditOpts = ["15", "30", "45", "60"]
      .map(function (v) {
        return (
          '<option value="' +
          v +
          '"' +
          (creditVal === v ? " selected" : "") +
          ">" +
          v +
          "</option>"
        );
      })
      .join("");

    var banks = getBankRows();
    var list =
      banks.length === 0
        ? '<p class="supplier-form__hint" data-i18n="crud.empty"></p>'
        : banks
            .map(function (b) {
              var key = bankKey(b);
              var bankLabel = langName("setting_bank_language", "setting_bank_id", b.setting_bank_id);
              return (
                '<div class="supplier-sublist__item">' +
                '<div class="supplier-sublist__main">' +
                '<div class="supplier-sublist__title">' +
                escapeHtml(b.name) +
                (b.is_default ? ' <span class="supplier-sublist__badge" data-i18n="col.default"></span>' : "") +
                "</div>" +
                '<div class="supplier-sublist__meta">' +
                escapeHtml(b.number) +
                " · " +
                escapeHtml(bankLabel) +
                (b.branch ? " · " + escapeHtml(b.branch) : "") +
                "</div></div>" +
                '<div class="supplier-sublist__actions">' +
                (canManageBanks()
                  ? '<label class="crud-switch" title="' +
                    escapeHtml(t("col.active")) +
                    '"><input type="checkbox" role="switch" class="supplier-bank-active" data-id="' +
                    key +
                    '"' +
                    (b.is_active ? " checked" : "") +
                    " /><span class=\"crud-switch__track\"><span class=\"crud-switch__thumb\"></span></span></label>" +
                    '<button type="button" class="btn btn--icon supplier-bank-default' +
                    (b.is_default ? " supplier-bank-default--on" : "") +
                    '" data-id="' +
                    key +
                    '" aria-label="default"><img src="../assets/icons/circle-check.svg" alt="" width="16" height="16" /></button>' +
                    '<button type="button" class="btn btn--icon supplier-bank-edit" data-id="' +
                    key +
                    '"><img src="../assets/icons/pencil.svg" alt="" width="16" height="16" /></button>'
                  : "") +
                (canDeleteBanks()
                  ? '<button type="button" class="btn btn--icon crud-delete supplier-bank-delete" data-id="' +
                    key +
                    '"><img src="../assets/icons/trash-2.svg" alt="" width="16" height="16" /></button>'
                  : "") +
                "</div></div>"
              );
            })
            .join("");
    var addBank = canManageBanks()
      ? '<button type="button" class="btn btn--primary" id="supplier-add-bank">' +
        '<img src="../assets/icons/plus.svg" alt="" width="16" height="16" />' +
        '<span data-i18n="crud.create"></span></button>'
      : "";
    var banksSection =
      '<div class="supplier-form__sublist-head">' +
      '<h3 class="supplier-form__card-title" data-i18n="supplier.bankAccounts"></h3>' +
      addBank +
      "</div>" +
      '<div class="supplier-sublist">' +
      list +
      "</div>";

    return (
      '<section class="supplier-form__card">' +
      '<div class="supplier-form__card-body">' +
      '<div class="supplier-form__row">' +
      selectField("col.creditTerm", "credit_term", creditOpts, false) +
      textField("col.note", "credit_term_note", creditNote, false) +
      "</div></div></section>" +
      '<section class="supplier-form__card">' +
      banksSection +
      "</section>"
    );
  }

  function render() {
    var root = document.getElementById("supplier-form-root");
    if (!root) return;

    var user = isEdit ? global.store.getById("supplier_user", supplierId) : null;
    if (isEdit && (!user || user.deleted_at != null)) {
      root.innerHTML = '<p class="supplier-form__hint" data-i18n="error.notFound"></p>';
      if (global.i18n) global.i18n.init();
      return;
    }

    var contact = isEdit ? getInformation(supplierId, "contact") : {};
    var tax = isEdit ? getInformation(supplierId, "tax_invoice") : {};
    var delivery = isEdit ? getInformation(supplierId, "delivery") : {};
    var sku = user ? user.sku : "";
    var isActive = user ? user.is_active : true;

    root.innerHTML =
      '<div class="supplier-form__toolbar">' +
      '<div class="supplier-form__tabs" role="tablist">' +
      tabBtn("general", "supplier.tabGeneral") +
      tabBtn("contacts", "supplier.tabContacts") +
      tabBtn("financial", "supplier.tabFinancial") +
      "</div>" +
      '<div class="supplier-form__toolbar-actions">' +
      '<a href="supplier-user.html" class="btn" data-i18n="' +
      (isEdit ? "crud.cancel" : "crud.back") +
      '"></a>' +
      (can(isEdit ? "update" : "create")
        ? '<button type="button" class="btn btn--primary" id="supplier-save" data-i18n="crud.save"></button>'
        : "") +
      "</div></div>" +
      '<div class="supplier-form__layout">' +
      '<div class="supplier-form__main">' +
      '<div class="supplier-form__panel' +
      (activeTab === "general" ? "" : " supplier-form__panel--hidden") +
      '" data-tab="general">' +
      informationCard("supplier.contactInfo", "contact", contact, {
        showPrefix: true,
        showTax: true,
        showBranch: true,
      }) +
      informationCard("supplier.taxInvoiceInfo", "tax", tax, {
        showPrefix: true,
        showTax: true,
        showBranch: true,
        sameSwitch: true,
        sameHidden: tax.is_same_information,
      }) +
      informationCard("supplier.deliveryInfo", "delivery", delivery, {
        showPrefix: false,
        showTax: false,
        showBranch: false,
        showContactFields: false,
        nameLabelKey: "col.recipientName",
      }) +
      "</div>" +
      '<div class="supplier-form__panel' +
      (activeTab === "contacts" ? "" : " supplier-form__panel--hidden") +
      '" data-tab="contacts">' +
      contactsHtml() +
      "</div>" +
      '<div class="supplier-form__panel' +
      (activeTab === "financial" ? "" : " supplier-form__panel--hidden") +
      '" data-tab="financial">' +
      banksHtml() +
      "</div></div>" +
      '<aside class="supplier-form__sidebar">' +
      '<section class="supplier-form__card">' +
      textField("col.sku", "sku", sku, true) +
      '<div class="form-field form-field--switch">' +
      '<span data-i18n="col.status"></span>' +
      '<label class="crud-switch">' +
      '<input type="checkbox" role="switch" id="is_active"' +
      (isActive ? " checked" : "") +
      " />" +
      '<span class="crud-switch__track"><span class="crud-switch__thumb"></span></span>' +
      "</label></div></section></aside></div>";

    if (global.i18n) global.i18n.init();
    if (global.permissions) global.permissions.applyActionButtons(root);
    root.querySelectorAll("[data-otp-input]").forEach(function (el) {
      global.otpInput.bind(el);
    });
    if (global.telInput) global.telInput.bind(root);
    bindFormEvents(root);
  }

  function tabBtn(id, labelKey) {
    return (
      '<button type="button" class="supplier-form__tab' +
      (activeTab === id ? " supplier-form__tab--active" : "") +
      '" role="tab" data-tab="' +
      id +
      '" aria-selected="' +
      (activeTab === id ? "true" : "false") +
      '"><span data-i18n="' +
      escapeHtml(labelKey) +
      '"></span></button>'
    );
  }

  function bindGeo(prefix) {
    var prov = document.getElementById(prefix + "_province_id");
    var dist = document.getElementById(prefix + "_district_id");
    var sub = document.getElementById(prefix + "_sub_district_id");
    var post = document.getElementById(prefix + "_postcode");
    if (!prov || !dist || !sub) return;

    prov.addEventListener("change", function () {
      dist.innerHTML =
        '<option value="" disabled selected>' +
        escapeHtml(t("form.placeholder.select", { label: t("col.district") })) +
        "</option>" +
        districtOptions(prov.value, "");
      sub.innerHTML =
        '<option value="" disabled selected>' +
        escapeHtml(t("form.placeholder.select", { label: t("col.subDistrict") })) +
        "</option>";
      if (post) post.value = "";
    });

    dist.addEventListener("change", function () {
      sub.innerHTML =
        '<option value="" disabled selected>' +
        escapeHtml(t("form.placeholder.select", { label: t("col.subDistrict") })) +
        "</option>" +
        subDistrictOptions(dist.value, "");
      if (post) post.value = "";
    });

    sub.addEventListener("change", function () {
      if (!post || !sub.value) return;
      var row = global.store.getById("system_sub_district", Number(sub.value));
      if (row && row.postcode) post.value = row.postcode;
    });

    document.querySelectorAll('input[name="' + prefix + '_branch"]').forEach(function (radio) {
      radio.addEventListener("change", function () {
        var branchName = document.getElementById(prefix + "_branch_name");
        if (!branchName) return;
        branchName.disabled = radio.value !== "branch";
        if (radio.value !== "branch") branchName.value = "";
      });
    });
  }

  function bindFormEvents(root) {
    root.querySelectorAll(".supplier-form__tab").forEach(function (btn) {
      btn.addEventListener("click", function () {
        activeTab = btn.getAttribute("data-tab");
        render();
      });
    });

    ["contact", "tax", "delivery"].forEach(function (p) {
      bindGeo(p);
    });

    var taxSame = document.getElementById("tax_same");
    if (taxSame) {
      taxSame.addEventListener("change", function () {
        var fields = root.querySelector('[data-fields="tax"]');
        if (fields) fields.classList.toggle("supplier-form__fields--hidden", taxSame.checked);
      });
    }

    var saveBtn = document.getElementById("supplier-save");
    if (saveBtn) saveBtn.addEventListener("click", saveSupplier);

    var addContact = document.getElementById("supplier-add-contact");
    if (addContact) addContact.addEventListener("click", function () {
      openContactModal(null);
    });
    root.querySelectorAll(".supplier-contact-edit").forEach(function (btn) {
      btn.addEventListener("click", function () {
        openContactModal(Number(btn.getAttribute("data-id")));
      });
    });
    root.querySelectorAll(".supplier-contact-delete").forEach(function (btn) {
      btn.addEventListener("click", function () {
        confirmDelete(function () {
          softDeleteContact(Number(btn.getAttribute("data-id")));
        });
      });
    });

    var addBank = document.getElementById("supplier-add-bank");
    if (addBank) addBank.addEventListener("click", function () {
      openBankModal(null);
    });
    root.querySelectorAll(".supplier-bank-edit").forEach(function (btn) {
      btn.addEventListener("click", function () {
        openBankModal(Number(btn.getAttribute("data-id")));
      });
    });
    root.querySelectorAll(".supplier-bank-delete").forEach(function (btn) {
      btn.addEventListener("click", function () {
        confirmDelete(function () {
          softDeleteBank(Number(btn.getAttribute("data-id")));
        });
      });
    });
    root.querySelectorAll(".supplier-bank-active").forEach(function (input) {
      input.addEventListener("change", function () {
        var id = Number(input.getAttribute("data-id"));
        if (!isEdit) {
          for (var i = 0; i < pendingBanks.length; i++) {
            if (pendingBanks[i]._draftId === id) {
              pendingBanks[i].is_active = input.checked;
              break;
            }
          }
          global.toast.show(t("crud.statusChanged"), "success");
          render();
          return;
        }
        global.store.update("supplier_bank", id, {
          is_active: input.checked,
          updated_at: now(),
        });
        global.toast.show(t("crud.statusChanged"), "success");
        render();
      });
    });
    root.querySelectorAll(".supplier-bank-default").forEach(function (btn) {
      btn.addEventListener("click", function () {
        var id = Number(btn.getAttribute("data-id"));
        if (!isEdit) {
          clearBankDefaultsInDrafts(id);
          for (var i = 0; i < pendingBanks.length; i++) {
            if (pendingBanks[i]._draftId === id) {
              pendingBanks[i].is_default = true;
              break;
            }
          }
          global.toast.show(t("crud.updated"), "success");
          render();
          return;
        }
        global.store.getAll("supplier_bank").forEach(function (b, idx) {
          if (b.supplier_user_id === supplierId && b.deleted_at == null) {
            global.store.updateAt("supplier_bank", idx, {
              is_default: b.id === id,
              updated_at: now(),
            });
          }
        });
        global.toast.show(t("crud.updated"), "success");
        render();
      });
    });
  }

  function val(id) {
    var el = document.getElementById(id);
    return el ? el.value.trim() : "";
  }

  function formVal(form, id) {
    var el = form.querySelector("#" + id);
    return el ? el.value.trim() : "";
  }

  function isValidEmail(value) {
    return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value);
  }

  function branchVal(prefix) {
    var checked = document.querySelector('input[name="' + prefix + '_branch"]:checked');
    return checked ? checked.value : null;
  }

  function collectBlock(prefix, type) {
    return {
      setting_prefix_id: val(prefix + "_prefix_id") ? Number(val(prefix + "_prefix_id")) : null,
      name: val(prefix + "_name") || null,
      branch: branchVal(prefix),
      branch_name: val(prefix + "_branch_name") || null,
      tax_number: val(prefix + "_tax_number") || null,
      address: val(prefix + "_address") || null,
      website_province_id: val(prefix + "_province_id") ? Number(val(prefix + "_province_id")) : null,
      website_district_id: val(prefix + "_district_id") ? Number(val(prefix + "_district_id")) : null,
      website_sub_district_id: val(prefix + "_sub_district_id")
        ? Number(val(prefix + "_sub_district_id"))
        : null,
      postcode: val(prefix + "_postcode") || null,
      tel: val(prefix + "_tel") || null,
      email: val(prefix + "_email") || null,
      is_same_information: type === "tax_invoice" && document.getElementById("tax_same")
        ? document.getElementById("tax_same").checked
        : false,
    };
  }

  function copyContactToTax(contactData) {
    var copy = Object.assign({}, contactData);
    copy.is_same_information = true;
    return copy;
  }

  function saveSupplier() {
    var sku = val("sku");
    if (!sku) {
      global.toast.show(t("error.required"), "error");
      return;
    }
    var dup = global.store.getAll("supplier_user").some(function (r) {
      return (
        r.deleted_at == null &&
        String(r.sku).toLowerCase() === sku.toLowerCase() &&
        r.id !== supplierId
      );
    });
    if (dup) {
      global.toast.show(t("error.codeTaken"), "error");
      return;
    }
    if (!val("contact_name")) {
      global.toast.show(t("error.required"), "error");
      return;
    }

    var isActive = document.getElementById("is_active").checked;
    var creditTermRaw = val("credit_term");
    var userPatch = {
      sku: sku,
      credit_term: creditTermRaw ? Number(creditTermRaw) : null,
      credit_term_note: val("credit_term_note") || null,
      is_active: isActive,
      updated_at: now(),
    };

    var wasCreate = !isEdit;
    if (isEdit) {
      global.store.update("supplier_user", supplierId, userPatch);
    } else {
      var actor = global.auth.getUser();
      var created = global.store.create(
        "supplier_user",
        Object.assign(userPatch, {
          created_at: now(),
          deleted_at: null,
          created_by: actor ? actor.id : 1,
          updated_by: actor ? actor.id : 1,
        })
      );
      supplierId = created.id;
      isEdit = true;
      window.history.replaceState({}, "", "supplier-user-form.html?id=" + supplierId);
    }

    var contactData = collectBlock("contact", "contact");
    upsertInformation(supplierId, "contact", contactData);

    var taxData = document.getElementById("tax_same") && document.getElementById("tax_same").checked
      ? copyContactToTax(contactData)
      : collectBlock("tax", "tax_invoice");
    upsertInformation(supplierId, "tax_invoice", taxData);

    upsertInformation(supplierId, "delivery", collectBlock("delivery", "delivery"));

    persistPendingContacts(supplierId);
    persistPendingBanks(supplierId);

    global.toast.show(t(wasCreate ? "crud.created" : "crud.updated"), "success");
    render();
  }

  function ensureContactModal() {
    if (contactModal) return;
    contactModal = document.createElement("div");
    contactModal.className = "modal-overlay";
    contactModal.hidden = true;
    contactModal.innerHTML =
      '<div class="modal crud-modal" role="dialog">' +
      '<div class="modal__header"><h2 class="modal__title" data-i18n="supplier.editContact"></h2>' +
      '<button type="button" class="modal__close contact-modal-close"><img src="../assets/icons/x.svg" alt="" width="18" height="18" /></button></div>' +
      '<form id="supplier-contact-form" class="modal__content crud-form" novalidate></form>' +
      '<div class="modal__footer">' +
      '<button type="button" class="btn contact-modal-close" data-i18n="crud.cancel"></button>' +
      '<button type="submit" form="supplier-contact-form" class="btn btn--primary" data-i18n="crud.save"></button>' +
      "</div></div>";
    document.body.appendChild(contactModal);
    contactModal.querySelectorAll(".contact-modal-close").forEach(function (btn) {
      btn.addEventListener("click", closeContactModal);
    });
    contactModal.addEventListener("click", function (e) {
      if (e.target === contactModal) closeContactModal();
    });
    contactModal.querySelector("#supplier-contact-form").addEventListener("submit", function (e) {
      e.preventDefault();
      saveContact();
    });
  }

  function openContactModal(id) {
    ensureContactModal();
    var c = id ? findContact(id) : null;
    var form = contactModal.querySelector("#supplier-contact-form");
    form.innerHTML =
      textField("col.name", "sc_name", c ? c.name : "", true) +
      textField("col.email", "sc_email", c ? c.email : "", false, "email") +
      textField("col.tel", "sc_tel", c ? c.tel : "", false, "tel") +
      textField("col.position", "sc_position", c ? c.position : "", false);
    form.dataset.editId = id || "";
    if (global.i18n) global.i18n.init();
    if (global.telInput) global.telInput.bind(form);
    contactModal.hidden = false;
    document.body.classList.add("modal-open");
  }

  function closeContactModal() {
    if (!contactModal) return;
    contactModal.hidden = true;
    document.body.classList.remove("modal-open");
  }

  function saveContact() {
    var form = contactModal.querySelector("#supplier-contact-form");
    var name = formVal(form, "sc_name");
    if (!name) {
      global.toast.show(t("error.required"), "error");
      return;
    }
    var emailRaw = formVal(form, "sc_email");
    if (emailRaw && !isValidEmail(emailRaw)) {
      global.toast.show(t("error.invalidEmail"), "error");
      return;
    }
    var editId = form.dataset.editId ? Number(form.dataset.editId) : null;
    var email = emailRaw || null;
    var tel = formVal(form, "sc_tel") || null;
    var position = formVal(form, "sc_position") || null;

    if (!isEdit) {
      if (editId) {
        for (var i = 0; i < pendingContacts.length; i++) {
          if (pendingContacts[i]._draftId === editId) {
            pendingContacts[i].name = name;
            pendingContacts[i].email = email;
            pendingContacts[i].tel = tel;
            pendingContacts[i].position = position;
            break;
          }
        }
      } else {
        pendingContacts.push({
          _draftId: nextDraftId,
          name: name,
          email: email,
          tel: tel,
          position: position,
          sort_order: (pendingContacts.length + 1) * 100,
        });
        nextDraftId -= 1;
      }
      closeContactModal();
      global.toast.show(t("crud.saved"), "success");
      render();
      return;
    }

    var patch = {
      supplier_user_id: supplierId,
      name: name,
      email: email,
      tel: tel,
      position: position,
      updated_at: now(),
    };
    if (editId) {
      global.store.update("supplier_contact", editId, patch);
    } else {
      var count = global.store.getAll("supplier_contact").filter(function (c) {
        return c.supplier_user_id === supplierId && c.deleted_at == null;
      }).length;
      global.store.create(
        "supplier_contact",
        Object.assign(patch, {
          sort_order: (count + 1) * 100,
          created_at: now(),
          deleted_at: null,
          created_by: 1,
          updated_by: 1,
        })
      );
    }
    closeContactModal();
    global.toast.show(t("crud.saved"), "success");
    render();
  }

  function softDeleteContact(id) {
    if (!isEdit) {
      pendingContacts = pendingContacts.filter(function (c) {
        return c._draftId !== id;
      });
      global.toast.show(t("crud.deleted"), "success");
      render();
      return;
    }
    global.store.update("supplier_contact", id, { deleted_at: now(), updated_at: now() });
    global.toast.show(t("crud.deleted"), "success");
    render();
  }

  function ensureBankModal() {
    if (bankModal) return;
    bankModal = document.createElement("div");
    bankModal.className = "modal-overlay";
    bankModal.hidden = true;
    bankModal.innerHTML =
      '<div class="modal crud-modal" role="dialog">' +
      '<div class="modal__header"><h2 class="modal__title" data-i18n="supplier.editBank"></h2>' +
      '<button type="button" class="modal__close bank-modal-close"><img src="../assets/icons/x.svg" alt="" width="18" height="18" /></button></div>' +
      '<form id="supplier-bank-form" class="modal__content crud-form"></form>' +
      '<div class="modal__footer">' +
      '<button type="button" class="btn bank-modal-close" data-i18n="crud.cancel"></button>' +
      '<button type="submit" form="supplier-bank-form" class="btn btn--primary" data-i18n="crud.save"></button>' +
      "</div></div>";
    document.body.appendChild(bankModal);
    bankModal.querySelectorAll(".bank-modal-close").forEach(function (btn) {
      btn.addEventListener("click", closeBankModal);
    });
    bankModal.addEventListener("click", function (e) {
      if (e.target === bankModal) closeBankModal();
    });
    bankModal.querySelector("#supplier-bank-form").addEventListener("submit", function (e) {
      e.preventDefault();
      saveBank();
    });
  }

  function openBankModal(id) {
    ensureBankModal();
    var b = id ? findBank(id) : null;
    var bankOpts = bankOptions()
      .map(function (o) {
        var sel = b && String(b.setting_bank_id) === String(o.value) ? " selected" : "";
        return '<option value="' + o.value + '"' + sel + ">" + escapeHtml(o.label) + "</option>";
      })
      .join("");
    var form = bankModal.querySelector("#supplier-bank-form");
    form.innerHTML =
      textField("supplier.bankAccountName", "bank_name", b ? b.name : "", true) +
      textField("supplier.bankAccountNumber", "bank_number", b ? b.number : "", true) +
      selectField("col.bank", "bank_setting_id", bankOpts, true) +
      textField("supplier.bankBranch", "bank_branch", b ? b.branch : "", false) +
      '<div class="form-field form-field--switch"><span data-i18n="col.active"></span>' +
      '<label class="crud-switch"><input type="checkbox" role="switch" id="bank_is_active"' +
      (!b || b.is_active ? " checked" : "") +
      ' /><span class="crud-switch__track"><span class="crud-switch__thumb"></span></span></label></div>' +
      '<div class="form-field form-field--switch"><span data-i18n="col.default"></span>' +
      '<label class="crud-switch"><input type="checkbox" role="switch" id="bank_is_default"' +
      (b && b.is_default ? " checked" : "") +
      ' /><span class="crud-switch__track"><span class="crud-switch__thumb"></span></span></label></div>';
    form.dataset.editId = id || "";
    if (global.i18n) global.i18n.init();
    bankModal.hidden = false;
    document.body.classList.add("modal-open");
  }

  function closeBankModal() {
    if (!bankModal) return;
    bankModal.hidden = true;
    document.body.classList.remove("modal-open");
  }

  function saveBank() {
    var form = bankModal.querySelector("#supplier-bank-form");
    var name = val("bank_name");
    var number = val("bank_number");
    var bankId = val("bank_setting_id");
    if (!name || !number || !bankId) {
      global.toast.show(t("error.required"), "error");
      return;
    }
    var editId = form.dataset.editId ? Number(form.dataset.editId) : null;
    var isDefault = document.getElementById("bank_is_default").checked;
    var isActive = document.getElementById("bank_is_active").checked;
    var branch = val("bank_branch") || null;
    var settingBankId = Number(bankId);

    if (!isEdit) {
      if (isDefault) clearBankDefaultsInDrafts(editId);
      if (editId) {
        for (var i = 0; i < pendingBanks.length; i++) {
          if (pendingBanks[i]._draftId === editId) {
            pendingBanks[i].setting_bank_id = settingBankId;
            pendingBanks[i].name = name;
            pendingBanks[i].number = number;
            pendingBanks[i].branch = branch;
            pendingBanks[i].is_active = isActive;
            pendingBanks[i].is_default = isDefault;
            break;
          }
        }
      } else {
        pendingBanks.push({
          _draftId: nextBankDraftId,
          setting_bank_id: settingBankId,
          name: name,
          number: number,
          branch: branch,
          is_active: isActive,
          is_default: isDefault,
          sort_order: (pendingBanks.length + 1) * 100,
        });
        nextBankDraftId -= 1;
      }
      closeBankModal();
      global.toast.show(t("crud.saved"), "success");
      render();
      return;
    }

    if (isDefault) {
      global.store.getAll("supplier_bank").forEach(function (b, idx) {
        if (b.supplier_user_id === supplierId && b.deleted_at == null) {
          global.store.updateAt("supplier_bank", idx, { is_default: false, updated_at: now() });
        }
      });
    }
    var patch = {
      supplier_user_id: supplierId,
      setting_bank_id: settingBankId,
      name: name,
      number: number,
      branch: branch,
      is_active: isActive,
      is_default: isDefault,
      updated_at: now(),
    };
    if (editId) {
      global.store.update("supplier_bank", editId, patch);
    } else {
      var count = global.store.getAll("supplier_bank").filter(function (b) {
        return b.supplier_user_id === supplierId && b.deleted_at == null;
      }).length;
      global.store.create(
        "supplier_bank",
        Object.assign(patch, {
          sort_order: (count + 1) * 100,
          created_at: now(),
          deleted_at: null,
          created_by: 1,
          updated_by: 1,
        })
      );
    }
    closeBankModal();
    global.toast.show(t("crud.saved"), "success");
    render();
  }

  function softDeleteBank(id) {
    if (!isEdit) {
      pendingBanks = pendingBanks.filter(function (b) {
        return b._draftId !== id;
      });
      global.toast.show(t("crud.deleted"), "success");
      render();
      return;
    }
    global.store.update("supplier_bank", id, { deleted_at: now(), updated_at: now() });
    global.toast.show(t("crud.deleted"), "success");
    render();
  }

  function ensureConfirm() {
    if (confirmOverlay) return;
    confirmOverlay = document.createElement("div");
    confirmOverlay.className = "modal-overlay";
    confirmOverlay.hidden = true;
    confirmOverlay.innerHTML =
      '<div class="modal" role="dialog"><div class="modal__header"><h2 class="modal__title" data-i18n="crud.delete"></h2></div>' +
      '<div class="modal__content"><p data-i18n="crud.confirmDelete"></p></div>' +
      '<div class="modal__footer">' +
      '<button type="button" class="btn" id="supplier-confirm-cancel" data-i18n="crud.cancel"></button>' +
      '<button type="button" class="btn btn--primary" id="supplier-confirm-ok" data-i18n="crud.delete"></button>' +
      "</div></div>";
    document.body.appendChild(confirmOverlay);
    confirmOverlay.querySelector("#supplier-confirm-cancel").addEventListener("click", closeConfirm);
    confirmOverlay.querySelector("#supplier-confirm-ok").addEventListener("click", function () {
      if (confirmAction) confirmAction();
      closeConfirm();
    });
  }

  function confirmDelete(fn) {
    ensureConfirm();
    confirmAction = fn;
    if (global.i18n) global.i18n.init();
    confirmOverlay.hidden = false;
    document.body.classList.add("modal-open");
  }

  function closeConfirm() {
    if (!confirmOverlay) return;
    confirmOverlay.hidden = true;
    document.body.classList.remove("modal-open");
    confirmAction = null;
  }

  function boot() {
    global.store.init();
    global.i18n.init();

    if (!global.auth.requireAuth("login.html")) return;

    supplierId = queryId();
    isEdit = supplierId != null;
    pendingContacts = [];
    nextDraftId = -1;
    pendingBanks = [];
    nextBankDraftId = -1;

    if (isEdit && !can("update")) {
      global.toast.show(t("error.forbidden"), "error");
      window.location.replace("supplier-user.html");
      return;
    }
    if (!isEdit && !can("create")) {
      global.toast.show(t("error.forbidden"), "error");
      window.location.replace("supplier-user.html");
      return;
    }

    var titleKey = isEdit ? "page.supplierUserEdit" : "page.supplierUserCreate";
    global.layout.mount({
      pageTitle: global.i18n.t(titleKey),
      contentHtml: '<div id="supplier-form-root" class="crud-page supplier-form"></div>',
    });

    render();

    global.devBar.mount({
      toasts: [
        { type: "success", label: "Created", msgKey: "crud.created" },
        { type: "success", label: "Updated", msgKey: "crud.updated" },
        { type: "success", label: "Deleted", msgKey: "crud.deleted" },
        { type: "error", label: "Forbidden", msgKey: "error.forbidden" },
        { type: "error", label: "Required", msgKey: "error.required" },
      ],
    });

    document.addEventListener("i18n:change", render);
    if (global.realtime) {
      global.realtime.onMessage(function () {
        render();
      });
    }
  }

  global.supplierUserForm = { boot: boot };
})(window);

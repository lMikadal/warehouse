(function (global) {
  var lib = global.memberSettingLib;
  var PERM_MODULE = "member";
  var PERM_TYPE = "member_user";
  var FILE_PREVIEW_KEY = "warehouse-design-file-data:";
  var AVATAR_PURPOSE = "member_avatar";
  var DOC_PURPOSE = "member_document";
  var AVATAR_MAX = 2 * 1024 * 1024;
  var DOC_MAX = 10 * 1024 * 1024;

  var memberId = null;
  var isEdit = false;
  var editTab = "info";
  var discountTab = "list";
  var discountCreditId = "";
  var pickerQuery = "";
  var pickerSelected = {};
  var pickerBrandId = "";
  var pickerPage = 1;
  var pickerPageSize = 10;
  var bulkChecked = {};
  var bulkDraft = {};
  var bulkDiscountRowIds = [];
  var discountQuery = "";
  var discountBrandId = "";
  var discountDate = "";
  var discountPage = 1;
  var discountPageSize =
    global.crudList && global.crudList.readStoredPageSize ? global.crudList.readStoredPageSize() : 10;
  var ordersDateFrom = "";
  var ordersDateTo = "";
  var ordersCategoryId = "";
  var ordersQuery = "";
  var ordersStatus = "all";
  var ordersSort = "newest";
  var ordersPage = 1;
  var ordersPageSize =
    global.crudList && global.crudList.readStoredPageSize ? global.crudList.readStoredPageSize() : 10;
  var overlay = null;
  var overlayKind = null;
  var confirmOverlay = null;
  var confirmFn = null;
  var submitting = false;
  var draft = blankDraft();

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

  function fieldPlaceholder(kind, labelKey) {
    return global.i18n ? global.i18n.fieldPlaceholder(kind, labelKey) : "";
  }

  function now() {
    return lib.now();
  }

  function actorId() {
    var u = global.auth && global.auth.getUser();
    return u ? u.id : 1;
  }

  function locale() {
    return global.i18n ? global.i18n.getLocale() : "th";
  }

  function queryId() {
    var m = window.location.search.match(/[?&]id=(\d+)/);
    return m ? Number(m[1]) : null;
  }

  function val(id) {
    var el = document.getElementById(id);
    return el ? String(el.value || "").trim() : "";
  }

  function numOrNull(id) {
    var v = val(id);
    if (v === "") return null;
    var n = Number(v);
    return Number.isNaN(n) ? null : n;
  }

  function checked(id) {
    var el = document.getElementById(id);
    return !!(el && el.checked);
  }

  function radioVal(name) {
    var el = document.querySelector('input[name="' + name + '"]:checked');
    return el ? el.value : "";
  }

  function blankInfo() {
    return {
      type: "person",
      setting_prefix_id: "",
      name: "",
      store_name: "",
      tax_number: "",
      branch: "",
      branch_name: "",
      address: "",
      website_province_id: "",
      website_district_id: "",
      website_sub_district_id: "",
      postcode: "",
      tel: "",
      email: "",
    };
  }

  function blankDraft() {
    return {
      system_file_id: null,
      business_id: "",
      credit_ids: [],
      group_ids: [],
      member_tier_id: "",
      admin_user_ids: [],
      is_active: true,
      note: "",
      info: blankInfo(),
      tax: Object.assign(blankInfo(), { is_same_information: false }),
      financial: {
        name: "",
        address: "",
        website_province_id: "",
        website_district_id: "",
        website_sub_district_id: "",
        postcode: "",
        tel: "",
        credit_limit: "",
        credit_date: "",
        relationship: "",
      },
      document: {
        is_same_information: false,
        name: "",
        address: "",
        website_province_id: "",
        website_district_id: "",
        website_sub_district_id: "",
        postcode: "",
        tel: "",
        email: "",
      },
    };
  }

  function langName(table, fk, id) {
    return lib.langName(table, fk, id);
  }

  function filePreview(id) {
    if (!id) return null;
    try {
      return sessionStorage.getItem(FILE_PREVIEW_KEY + id);
    } catch (e) {
      return null;
    }
  }

  function setFilePreview(id, dataUrl) {
    try {
      sessionStorage.setItem(FILE_PREVIEW_KEY + id, dataUrl);
    } catch (e) {
      /* ponytail: sessionStorage quota */
    }
  }

  function formatMoney(n) {
    var x = Number(n);
    if (Number.isNaN(x)) x = 0;
    return x.toLocaleString(locale() === "th" ? "th-TH" : "en-US", {
      minimumFractionDigits: 2,
      maximumFractionDigits: 2,
    });
  }

  function formatBytes(bytes) {
    if (bytes >= 1048576) return (bytes / 1048576).toFixed(2) + " MB";
    if (bytes >= 1024) return Math.round(bytes / 1024) + " KB";
    return bytes + " B";
  }

  function requiredMark() {
    return '<span class="form-field__required" aria-hidden="true">*</span>';
  }

  function errorSlot() {
    return '<div class="form-field__error-slot" aria-live="polite"><p class="form-field__error" hidden role="alert"></p></div>';
  }

  function setFieldError(field, msg) {
    if (!field) return;
    field.classList.add("form-field--invalid");
    var err = field.querySelector(".form-field__error");
    if (err) {
      err.hidden = false;
      err.textContent = msg;
    }
  }

  function clearFieldError(field) {
    if (!field) return;
    field.classList.remove("form-field--invalid");
    var err = field.querySelector(".form-field__error");
    if (err) {
      err.hidden = true;
      err.textContent = "";
    }
  }

  function clearAllErrors(root) {
    root.querySelectorAll(".form-field").forEach(clearFieldError);
  }

  function textField(labelKey, id, value, required, type, disabled) {
    type = type || "text";
    var ph = escapeHtml(fieldPlaceholder("input", labelKey));
    var telAttrs = type === "tel" ? ' inputmode="tel" autocomplete="tel"' : "";
    return (
      '<div class="form-field">' +
      '<label for="' +
      escapeHtml(id) +
      '"><span data-i18n="' +
      labelKey +
      '"></span>' +
      (required ? requiredMark() : "") +
      "</label>" +
      '<input type="' +
      type +
      '" id="' +
      escapeHtml(id) +
      '" value="' +
      escapeHtml(value || "") +
      '" placeholder="' +
      ph +
      '" data-i18n-placeholder-input="' +
      escapeHtml(labelKey) +
      '"' +
      telAttrs +
      (required ? " required" : "") +
      (disabled ? " disabled" : "") +
      " />" +
      errorSlot() +
      "</div>"
    );
  }

  function textareaField(labelKey, id, value, rows) {
    var ph = escapeHtml(fieldPlaceholder("input", labelKey));
    return (
      '<div class="form-field">' +
      '<label for="' +
      escapeHtml(id) +
      '"><span data-i18n="' +
      labelKey +
      '"></span></label>' +
      '<textarea id="' +
      escapeHtml(id) +
      '" rows="' +
      (rows || 3) +
      '" placeholder="' +
      ph +
      '" data-i18n-placeholder-input="' +
      escapeHtml(labelKey) +
      '">' +
      escapeHtml(value || "") +
      "</textarea>" +
      errorSlot() +
      "</div>"
    );
  }

  function searchSelectHtml(id, labelKey, options, value, required) {
    var selectedLabel = escapeHtml(fieldPlaceholder("select", labelKey));
    if (value != null && value !== "") {
      var match = options.find(function (o) {
        return String(o.value) === String(value);
      });
      if (match) selectedLabel = escapeHtml(match.label);
    }
    var optionsHtml = options
      .map(function (opt) {
        var sel = String(value) === String(opt.value) ? " form-search-select__option--selected" : "";
        return (
          '<li class="form-search-select__option' +
          sel +
          '" role="option" data-value="' +
          escapeAttr(opt.value) +
          '">' +
          escapeHtml(opt.label) +
          "</li>"
        );
      })
      .join("");
    return (
      '<div class="form-field form-search-select" data-field-id="' +
      escapeAttr(id) +
      '">' +
      '<label><span data-i18n="' +
      escapeAttr(labelKey) +
      '"></span>' +
      (required ? requiredMark() : "") +
      "</label>" +
      '<input type="hidden" id="' +
      escapeAttr(id) +
      '" value="' +
      escapeAttr(value != null ? value : "") +
      '"' +
      (required ? " required" : "") +
      " />" +
      '<div class="form-search-select__control">' +
      '<button type="button" class="form-search-select__trigger" aria-haspopup="listbox" aria-expanded="false">' +
      '<span class="form-search-select__label">' +
      selectedLabel +
      "</span>" +
      '<img src="../assets/icons/chevron-down.svg" alt="" width="16" height="16" class="form-search-select__chevron" />' +
      "</button>" +
      '<div class="form-search-select__panel" hidden>' +
      '<input type="search" class="form-search-select__search" data-i18n-placeholder="search.placeholder" placeholder="' +
      escapeAttr(t("search.placeholder")) +
      '" />' +
      '<ul class="form-search-select__list" role="listbox">' +
      optionsHtml +
      "</ul></div></div>" +
      errorSlot() +
      "</div>"
    );
  }

  function selectField(labelKey, id, optionsHtml, required) {
    var ph = escapeHtml(global.i18n.fieldPlaceholder("select", labelKey));
    var hasSel = optionsHtml.indexOf(" selected") >= 0;
    return (
      '<div class="form-field">' +
      '<label for="' +
      escapeHtml(id) +
      '"><span data-i18n="' +
      labelKey +
      '"></span>' +
      (required ? requiredMark() : "") +
      "</label>" +
      '<select id="' +
      escapeHtml(id) +
      '"' +
      (required ? " required" : "") +
      ">" +
      '<option value="" disabled' +
      (hasSel ? "" : " selected") +
      ">" +
      ph +
      "</option>" +
      optionsHtml +
      "</select>" +
      errorSlot() +
      "</div>"
    );
  }

  function prefixOptionsList(type) {
    return global.store
      .getAll("setting_prefix")
      .filter(function (r) {
        if (r.deleted_at != null || !r.is_active) return false;
        if (type === "person") return r.is_person;
        if (type === "company") return r.is_company;
        return false;
      })
      .map(function (r) {
        return {
          value: String(r.id),
          label: langName("setting_prefix_language", "setting_prefix_id", r.id),
        };
      });
  }

  function geoOptionsList(table, langTable, fk, parentKey, parentId) {
    if (parentKey && !parentId) return [];
    return global.store
      .getAll(table)
      .filter(function (r) {
        if (r.deleted_at != null || !r.is_active) return false;
        if (parentKey && r[parentKey] !== Number(parentId)) return false;
        return true;
      })
      .map(function (r) {
        return { value: String(r.id), label: langName(langTable, fk, r.id) };
      });
  }

  function geoRow(prefix, info) {
    var prov = info.website_province_id || "";
    var dist = info.website_district_id || "";
    var sub = info.website_sub_district_id || "";
    return (
      '<div class="supplier-form__row supplier-form__row--geo">' +
      searchSelectHtml(
        prefix + "_province_id",
        "col.province",
        geoOptionsList("system_province", "system_province_language", "system_province_id", null, null),
        prov,
        false
      ) +
      searchSelectHtml(
        prefix + "_district_id",
        "col.district",
        geoOptionsList(
          "system_district",
          "system_district_language",
          "system_district_id",
          "system_province_id",
          prov
        ),
        dist,
        false
      ) +
      searchSelectHtml(
        prefix + "_sub_district_id",
        "col.subDistrict",
        geoOptionsList(
          "system_sub_district",
          "system_sub_district_language",
          "system_sub_district_id",
          "system_district_id",
          dist
        ),
        sub,
        false
      ) +
      textField("col.postcode", prefix + "_postcode", info.postcode) +
      "</div>"
    );
  }

  function typeRadios(prefix, type) {
    return (
      '<div class="form-field"><span data-i18n="memberUser.infoType"></span>' +
      '<div class="member-user-radio-row">' +
      '<label><input type="radio" name="' +
      prefix +
      '_type" value="person"' +
      (type !== "company" ? " checked" : "") +
      ' /><span data-i18n="memberUser.person"></span></label>' +
      '<label><input type="radio" name="' +
      prefix +
      '_type" value="company"' +
      (type === "company" ? " checked" : "") +
      ' /><span data-i18n="memberUser.company"></span></label>' +
      "</div>" +
      errorSlot() +
      "</div>"
    );
  }

  function branchRadios(prefix, branch) {
    return (
      '<div class="form-field"><span data-i18n="col.branch"></span>' +
      '<div class="member-user-radio-row">' +
      '<label><input type="radio" name="' +
      prefix +
      '_branch" value="headquarter"' +
      (branch !== "branch" ? " checked" : "") +
      ' /><span data-i18n="memberUser.headquarter"></span></label>' +
      '<label><input type="radio" name="' +
      prefix +
      '_branch" value="branch"' +
      (branch === "branch" ? " checked" : "") +
      ' /><span data-i18n="col.branch"></span></label>' +
      "</div></div>"
    );
  }

  function sameSwitch(id, checkedVal, labelKey) {
    return (
      '<div class="form-field form-field--switch supplier-form__same-switch">' +
      '<span data-i18n="' +
      labelKey +
      '"></span>' +
      '<label class="crud-switch"><input type="checkbox" role="switch" id="' +
      id +
      '"' +
      (checkedVal ? " checked" : "") +
      ' /><span class="crud-switch__track"><span class="crud-switch__thumb"></span></span></label></div>'
    );
  }

  function infoFields(prefix, info, opts) {
    opts = opts || {};
    var type = info.type || "person";
    var isCompany = type === "company";
    var nameReq = !!opts.requireContact;
    var hidden = opts.hidden ? " supplier-form__fields--hidden" : "";
    var taxHtml = global.otpInput.render({
      id: prefix + "_tax_number",
      labelKey: "col.taxNumber",
      value: info.tax_number,
    });
    var store =
      isCompany
        ? ""
        : textField("memberUser.storeName", prefix + "_store_name", info.store_name);
    var branch =
      isCompany
        ? branchRadios(prefix, info.branch) +
          textField("col.branchName", prefix + "_branch_name", info.branch_name, false, "text", info.branch !== "branch")
        : "";
    return (
      '<div class="supplier-form__card-body' +
      hidden +
      '" data-fields="' +
      prefix +
      '">' +
      typeRadios(prefix, type) +
      '<div class="supplier-form__row">' +
      searchSelectHtml(
        prefix + "_prefix_id",
        "col.prefix",
        prefixOptionsList(type),
        info.setting_prefix_id || "",
        false
      ) +
      textField("col.name", prefix + "_name", info.name, nameReq) +
      store +
      "</div>" +
      taxHtml +
      (branch ? '<div class="supplier-form__row">' + branch + "</div>" : "") +
      textareaField("col.address", prefix + "_address", info.address) +
      geoRow(prefix, info) +
      '<div class="supplier-form__row">' +
      textField("col.tel", prefix + "_tel", info.tel, nameReq, "tel") +
      textField("col.email", prefix + "_email", info.email, false, "email") +
      "</div></div>"
    );
  }

  function relationsForBusiness(businessId) {
    if (!businessId) return [];
    return lib.relationsForBusiness(Number(businessId)).filter(function (r) {
      return r.is_active;
    });
  }

  function creditOptsForBusiness(businessId) {
    var seen = {};
    var out = [];
    relationsForBusiness(businessId).forEach(function (r) {
      if (seen[r.credit_id]) return;
      seen[r.credit_id] = true;
      out.push({ value: r.credit_id, label: lib.creditName(r.credit_id) });
    });
    return out;
  }

  function groupOptsForBusiness(businessId, creditIds) {
    var allow = {};
    (creditIds || []).forEach(function (id) {
      allow[Number(id)] = true;
    });
    var seen = {};
    var out = [];
    relationsForBusiness(businessId).forEach(function (r) {
      if (creditIds && creditIds.length && !allow[r.credit_id]) return;
      if (seen[r.group_id]) return;
      seen[r.group_id] = true;
      out.push({ value: r.group_id, label: lib.groupName(r.group_id) });
    });
    return out;
  }

  function resolveRelationIds(businessId, creditIds, groupIds) {
    var credits = {};
    var groups = {};
    (creditIds || []).forEach(function (id) {
      credits[Number(id)] = true;
    });
    (groupIds || []).forEach(function (id) {
      groups[Number(id)] = true;
    });
    return relationsForBusiness(businessId)
      .filter(function (r) {
        if (creditIds && creditIds.length && !credits[r.credit_id]) return false;
        if (groupIds && groupIds.length && !groups[r.group_id]) return false;
        return true;
      })
      .map(function (r) {
        return r.id;
      });
  }

  function businessSelectHtml() {
    var opts = lib
      .activeRows("member_setting_business")
      .filter(function (r) {
        return r.is_active;
      })
      .map(function (r) {
        return { value: String(r.id), label: lib.businessName(r.id) };
      });
    return searchSelectHtml("mu-business", "memberUser.business", opts, draft.business_id || "", true);
  }

  function tierSelectHtml() {
    var opts = lib
      .activeRows("member_tier")
      .filter(function (r) {
        return r.is_active;
      })
      .map(function (r) {
        return {
          value: String(r.id),
          label: langName("member_tier_language", "member_tier_id", r.id),
        };
      });
    return searchSelectHtml("mu-tier", "memberUser.memberTier", opts, draft.member_tier_id || "", false);
  }

  function avatarHtml() {
    var fileId = draft.system_file_id;
    var preview = filePreview(fileId);
    var img = preview
      ? '<img src="' + escapeHtml(preview) + '" alt="" width="72" height="72" />'
      : '<img src="../assets/icons/user-round.svg" alt="" width="72" height="72" />';
    return (
      '<div class="member-tier-badge-upload">' +
      '<label class="member-tier-badge-upload__trigger" for="mu-avatar-file">' +
      '<span class="member-tier-badge-upload__preview" id="mu-avatar-preview">' +
      img +
      "</span>" +
      '<span class="member-tier-badge-upload__label" data-i18n="memberUser.uploadImage"></span></label>' +
      '<input type="file" id="mu-avatar-file" class="visually-hidden" accept="image/png,image/jpeg,image/webp,image/gif" />' +
      '<input type="hidden" id="mu-system_file_id" value="' +
      escapeHtml(fileId != null ? String(fileId) : "") +
      '" />' +
      '<button type="button" class="btn btn--sm" id="mu-avatar-clear" data-i18n="memberUser.removeImage"' +
      (fileId ? "" : " hidden") +
      "></button></div>"
    );
  }

  function memberInfoCard(includeAvatar) {
    var creditDisabled = !draft.business_id;
    var groupDisabled = !draft.credit_ids.length;
    return (
      '<section class="supplier-form__card">' +
      '<div class="supplier-form__card-head"><h3 class="supplier-form__card-title" data-i18n="memberUser.memberInfo"></h3></div>' +
      (includeAvatar ? '<div class="member-user-form__profile">' + avatarHtml() + '<div class="member-user-form__profile-fields">' : "") +
      '<div class="member-user-form__row-4">' +
      businessSelectHtml() +
      (creditDisabled
        ? selectField("memberUser.creditType", "mu-credit-disabled", "", true)
        : global.chipMultiSelect.fieldHtml({
            id: "mu-credits",
            labelKey: "memberUser.creditType",
            placeholderLabelKey: "memberUser.creditType",
            options: creditOptsForBusiness(draft.business_id),
            selectedIds: draft.credit_ids,
            required: true,
          })) +
      (groupDisabled
        ? selectField("memberUser.groupType", "mu-group-disabled", "", true)
        : global.chipMultiSelect.fieldHtml({
            id: "mu-groups",
            labelKey: "memberUser.groupType",
            placeholderLabelKey: "memberUser.groupType",
            options: groupOptsForBusiness(draft.business_id, draft.credit_ids),
            selectedIds: draft.group_ids,
            required: true,
          })) +
      tierSelectHtml() +
      "</div>" +
      (includeAvatar ? "</div></div>" : "") +
      "</section>"
    );
  }

  function generalCard() {
    return (
      '<section class="supplier-form__card">' +
      '<div class="supplier-form__card-head"><h3 class="supplier-form__card-title" data-i18n="memberUser.generalInfo"></h3></div>' +
      infoFields("info", draft.info, { requireContact: true }) +
      "</section>"
    );
  }

  function taxCard() {
    return (
      '<section class="supplier-form__card">' +
      '<div class="supplier-form__card-head"><h3 class="supplier-form__card-title" data-i18n="memberUser.taxInfo"></h3>' +
      sameSwitch("tax_same", draft.tax.is_same_information, "memberUser.sameAsGeneral") +
      "</div>" +
      infoFields("tax", draft.tax, { hidden: draft.tax.is_same_information }) +
      "</section>"
    );
  }

  function financialCard() {
    var f = draft.financial;
    return (
      '<section class="supplier-form__card">' +
      '<div class="supplier-form__card-head"><h3 class="supplier-form__card-title" data-i18n="memberUser.financialInfo"></h3></div>' +
      '<div class="supplier-form__row">' +
      textField("memberUser.creditLimit", "fin_credit_limit", f.credit_limit, false, "number") +
      textField("memberUser.creditDate", "fin_credit_date", f.credit_date, false, "number") +
      "</div>" +
      textField("memberUser.guarantorName", "fin_name", f.name) +
      textareaField("col.address", "fin_address", f.address) +
      geoRow("fin", f) +
      '<div class="supplier-form__row">' +
      textField("col.tel", "fin_tel", f.tel, false, "tel") +
      textField("memberUser.relationship", "fin_relationship", f.relationship) +
      "</div></section>"
    );
  }

  function documentCard() {
    var d = draft.document;
    var hidden = d.is_same_information ? " supplier-form__fields--hidden" : "";
    return (
      '<section class="supplier-form__card">' +
      '<div class="supplier-form__card-head"><h3 class="supplier-form__card-title" data-i18n="memberUser.documentInfo"></h3>' +
      sameSwitch("doc_same", d.is_same_information, "memberUser.sameAsGeneral") +
      "</div>" +
      '<div class="supplier-form__card-body' +
      hidden +
      '" data-fields="doc">' +
      textField("memberUser.contactName", "doc_name", d.name) +
      textareaField("col.address", "doc_address", d.address) +
      geoRow("doc", d) +
      '<div class="supplier-form__row">' +
      textField("col.tel", "doc_tel", d.tel, false, "tel") +
      textField("col.email", "doc_email", d.email, false, "email") +
      "</div></div></section>"
    );
  }

  function adminOptions() {
    return lib
      .activeRows("admin_user")
      .map(function (u) {
        return { value: u.id, label: u.username };
      });
  }

  function sidebarCard() {
    return (
      '<aside class="member-user-form__sidebar">' +
      '<section class="supplier-form__card">' +
      '<div class="form-field form-field--switch"><label for="mu-is_active"><span data-i18n="col.status"></span></label>' +
      '<label class="crud-switch"><input type="checkbox" role="switch" id="mu-is_active"' +
      (draft.is_active ? " checked" : "") +
      ' /><span class="crud-switch__track"><span class="crud-switch__thumb"></span></span></label></div>' +
      global.chipMultiSelect.fieldHtml({
        id: "mu-admins",
        labelKey: "memberUser.adminUsers",
        placeholderLabelKey: "memberUser.adminUsers",
        options: adminOptions(),
        selectedIds: draft.admin_user_ids,
      }) +
      textareaField("col.note", "mu-note", draft.note, 4) +
      "</section></aside>"
    );
  }

  function leaveBtn() {
    var key = isEdit ? "crud.cancel" : "crud.back";
    return (
      '<a class="btn" href="member-user.html" data-i18n="' + key + '">' + t(key) + "</a>"
    );
  }

  function saveBtn() {
    if (isEdit && !can("update")) return "";
    return (
      '<button type="button" class="btn btn--primary" id="mu-save"' +
      (submitting ? " disabled" : "") +
      '><span data-i18n="crud.save"></span></button>'
    );
  }

  function createHtml() {
    return (
      '<div class="supplier-form member-user-form">' +
      '<div class="member-user-form__toolbar">' +
      leaveBtn() +
      saveBtn() +
      "</div>" +
      '<div class="member-user-form__layout"><div>' +
      memberInfoCard(true) +
      generalCard() +
      taxCard() +
      financialCard() +
      documentCard() +
      "</div>" +
      sidebarCard() +
      "</div></div>"
    );
  }

  function memberRow() {
    return global.store.getById("member_user", memberId);
  }

  function addressByType(type) {
    return (
      global.store.getAll("member_user_address").find(function (r) {
        return r.member_user_id === memberId && r.type === type && r.deleted_at == null;
      }) || null
    );
  }

  function historyItems() {
    return global.store
      .getAll("member_history")
      .filter(function (r) {
        return r.member_user_id === memberId;
      })
      .sort(function (a, b) {
        return String(b.created_at).localeCompare(String(a.created_at));
      });
  }

  function historyTitle(id) {
    var rows = global.store.getAll("member_history_language");
    var loc = locale();
    var hit = rows.find(function (r) {
      return r.member_history_id === id && r.locale === loc;
    });
    if (hit && hit.title) return hit.title;
    hit = rows.find(function (r) {
      return r.member_history_id === id && r.locale === "th";
    });
    return hit && hit.title ? hit.title : "";
  }

  function historyDesc(id) {
    var rows = global.store.getAll("member_history_language");
    var loc = locale();
    var hit = rows.find(function (r) {
      return r.member_history_id === id && r.locale === loc;
    });
    if (hit && hit.description) return hit.description;
    hit = rows.find(function (r) {
      return r.member_history_id === id && r.locale === "th";
    });
    return hit && hit.description ? hit.description : "";
  }

  function staffChips() {
    return draft.admin_user_ids
      .map(function (id) {
        var u = global.store.getById("admin_user", Number(id));
        if (!u) return "";
        return '<span class="member-user-chip">' + escapeHtml(u.username) + "</span>";
      })
      .join("");
  }

  function editHeaderHtml() {
    var row = memberRow() || {};
    var preview = filePreview(draft.system_file_id);
    var img = preview
      ? '<img src="' + escapeHtml(preview) + '" alt="" width="96" height="96" />'
      : '<img src="../assets/icons/user-round.svg" alt="" width="96" height="96" />';
    var tierName = draft.member_tier_id
      ? langName("member_tier_language", "member_tier_id", Number(draft.member_tier_id))
      : "";
    var sku = row.sku || "—";
    return (
      '<section class="supplier-form__card member-user-edit-header">' +
      '<div>' +
      '<label class="member-tier-badge-upload__trigger" for="mu-avatar-file">' +
      '<span class="member-tier-badge-upload__preview" id="mu-avatar-preview">' +
      img +
      "</span></label>" +
      '<input type="file" id="mu-avatar-file" class="visually-hidden" accept="image/png,image/jpeg,image/webp,image/gif" />' +
      '<input type="hidden" id="mu-system_file_id" value="' +
      escapeHtml(draft.system_file_id != null ? String(draft.system_file_id) : "") +
      '" /></div>' +
      "<div>" +
      '<button type="button" class="member-user-status-btn" id="mu-status-badge">' +
      '<span class="crud-badge crud-badge--' +
      (draft.is_active ? "active" : "inactive") +
      '" data-i18n="' +
      (draft.is_active ? "col.active" : "col.inactive") +
      '"></span></button>' +
      (tierName ? ' <span class="crud-badge crud-badge--inactive">' + escapeHtml(tierName) + "</span>" : "") +
      '<h2 class="member-user-edit-header__name">' +
      escapeHtml(draft.info.name || row.name || "—") +
      "</h2>" +
      '<div class="member-user-sku">' +
      escapeHtml(t("memberUser.customerCode", { sku: sku })) +
      (row.sku
        ? '<button type="button" class="member-user-sku__copy" data-sku="' +
          escapeHtml(row.sku) +
          '"><img src="../assets/icons/copy.svg" alt="" width="12" height="12" /></button>'
        : "") +
      "</div>" +
      '<div class="member-user-edit-header__meta">' +
      '<span><img src="../assets/icons/phone.svg" alt="" width="14" height="14" /> ' +
      escapeHtml(draft.info.tel || row.tel || "—") +
      "</span>" +
      '<span><img src="../assets/icons/mail.svg" alt="" width="14" height="14" /> ' +
      escapeHtml(draft.info.email || row.email || "—") +
      "</span>" +
      '<span><img src="../assets/icons/calendar-days.svg" alt="" width="14" height="14" /> ' +
      escapeHtml(t("memberUser.memberSinceOn", { date: global.i18n.formatDate(row.created_at) })) +
      "</span></div>" +
      '<div class="member-user-edit-header__staff"><span data-i18n="memberUser.staff"></span> ' +
      staffChips() +
      '<button type="button" class="btn btn--icon crud-add" id="mu-staff-add" aria-label="' +
      escapeHtml(t("memberUser.addStaff")) +
      '"><img src="../assets/icons/plus.svg" alt="" width="16" height="16" /></button></div>' +
      "</div></section>"
    );
  }

  function tabBtn(id, icon, labelKey) {
    return (
      '<button type="button" class="member-user-tabs__btn' +
      (editTab === id ? " member-user-tabs__btn--active" : "") +
      '" data-tab="' +
      id +
      '"><img src="../assets/icons/' +
      icon +
      '.svg" alt="" width="16" height="16" /><span data-i18n="' +
      labelKey +
      '"></span></button>'
    );
  }

  function calcSpecial(price, discount, type) {
    var p = Number(price) || 0;
    var d = Number(discount) || 0;
    var out = type === "baht" ? p - d : p * (1 - d / 100);
    return Math.max(0, out);
  }

  (function selfCheck() {
    if (calcSpecial(100, 10, "percent") !== 90) throw new Error("member-user special percent");
    if (calcSpecial(100, 15, "baht") !== 85) throw new Error("member-user special baht");
    if (calcSpecial(10, 50, "baht") !== 0) throw new Error("member-user special floor");
  })();

  function todayIso() {
    var d = new Date();
    var m = d.getMonth() + 1;
    var day = d.getDate();
    return d.getFullYear() + "-" + (m < 10 ? "0" : "") + m + "-" + (day < 10 ? "0" : "") + day;
  }

  function productName(itemId) {
    return langName("product_item_language", "product_item_id", itemId) || "";
  }

  function memberDiscountCreditIds() {
    if (draft.credit_ids.length) return draft.credit_ids.slice();
    return creditOptsForBusiness(draft.business_id).map(function (o) {
      return o.value;
    });
  }

  function findMemberDiscountRowForCredit(productItemId, creditId) {
    var pid = Number(productItemId);
    return (
      lib.activeRows("member_user_discount").find(function (r) {
        return (
          Number(r.member_user_id) === Number(memberId) &&
          Number(r.product_item_id) === pid &&
          Number(r.member_credit_id) === Number(creditId)
        );
      }) || null
    );
  }

  function findMemberDiscountRow(productItemId) {
    return findMemberDiscountRowForCredit(productItemId, discountCreditId);
  }

  function bulkDiscountRowIncluded(rowId) {
    var rid = Number(rowId);
    return bulkDiscountRowIds.some(function (x) {
      return Number(x) === rid;
    });
  }

  function discountsForCredit(creditId, expiredOnly) {
    var today = todayIso();
    return lib
      .activeRows("member_user_discount")
      .filter(function (r) {
        if (Number(r.member_user_id) !== Number(memberId)) return false;
        if (creditId && Number(r.member_credit_id) !== Number(creditId)) return false;
        var exp = r.date_end && r.date_end < today;
        return expiredOnly ? exp : !exp;
      });
  }

  function attrName(attrId) {
    return langName("product_attribute_language", "product_attribute_id", attrId) || "—";
  }

  function itemBrandName(productItemId) {
    var item = global.store.getById("product_item", productItemId);
    if (!item) return "—";
    var list = global.store.getById("product_list", item.product_list_id);
    if (!list || !list.product_brand_id) return "—";
    return attrName(list.product_brand_id);
  }

  function itemBrandId(productItemId) {
    var item = global.store.getById("product_item", productItemId);
    if (!item) return null;
    var list = global.store.getById("product_list", item.product_list_id);
    return list && list.product_brand_id != null ? Number(list.product_brand_id) : null;
  }

  function itemCategoryId(productItemId) {
    var item = global.store.getById("product_item", productItemId);
    if (!item) return null;
    var list = global.store.getById("product_list", item.product_list_id);
    return list && list.product_category_id != null ? Number(list.product_category_id) : null;
  }

  function adminUsername(userId) {
    var u = global.store.getById("admin_user", Number(userId));
    return u ? u.username : "—";
  }

  function orderShippingType(orderId) {
    var row = lib.activeRows("order_shipping").find(function (r) {
      return Number(r.order_list_id) === Number(orderId);
    });
    return row ? row.type : "store";
  }

  function paymentsForOrder(orderId) {
    return lib
      .activeRows("order_payment")
      .filter(function (p) {
        return Number(p.order_list_id) === Number(orderId);
      })
      .sort(function (a, b) {
        return b.id - a.id;
      });
  }

  function orderRowDate(order, payment) {
    var iso = order.ordered_at || (payment && payment.ordered_at) || order.created_at;
    return iso ? String(iso).slice(0, 10) : "";
  }

  function orderDisplayStatus(order, payment) {
    var st = order.status;
    if (st === "cancelled" || st === "rejected") return "cancelled";
    if (st === "draft") return "draft";
    if (payment && payment.payment_category === "credit" && !payment.is_full) {
      var creditDays = Number(draft.financial && draft.financial.credit_date) || 0;
      var ordered = order.ordered_at || payment.ordered_at;
      if (creditDays > 0 && ordered) {
        var due = new Date(ordered);
        due.setDate(due.getDate() + creditDays);
        if (due.getTime() < Date.now()) return "overdue";
      }
    }
    if (payment && payment.is_full) return "success";
    return "pending";
  }

  function inOrdersDateRange(dateIso) {
    if (!dateIso) return true;
    if (ordersDateFrom && dateIso < ordersDateFrom) return false;
    if (ordersDateTo && dateIso > ordersDateTo) return false;
    return true;
  }

  function memberOrderEntries() {
    if (!memberId) return [];
    return lib
      .activeRows("order_list")
      .filter(function (o) {
        return Number(o.member_user_id) === Number(memberId);
      })
      .map(function (order) {
        var payment = paymentsForOrder(order.id)[0] || null;
        var items = lib.activeRows("order_list_item").filter(function (i) {
          return Number(i.order_list_id) === Number(order.id);
        });
        var itemQty = items.reduce(function (s, i) {
          return s + (Number(i.amount) || 0);
        }, 0);
        return {
          order: order,
          payment: payment,
          shippingType: orderShippingType(order.id),
          itemQty: itemQty,
          items: items,
          dateIso: orderRowDate(order, payment),
          statusKey: orderDisplayStatus(order, payment),
        };
      });
  }

  function filterMemberOrderEntries(entries) {
    var q = ordersQuery.trim().toLowerCase();
    var catId = ordersCategoryId ? Number(ordersCategoryId) : null;
    return entries.filter(function (e) {
      if (e.statusKey === "draft" && (!ordersStatus || ordersStatus === "all")) return false;
      if (ordersStatus && ordersStatus !== "all" && e.statusKey !== ordersStatus) return false;
      if (!inOrdersDateRange(e.dateIso)) return false;
      if (catId) {
        var hasCat = e.items.some(function (it) {
          return itemCategoryId(it.product_item_id) === catId;
        });
        if (!hasCat) return false;
      }
      if (q) {
        var orderSku = (e.order.sku || "").toLowerCase();
        var paySku = e.payment && e.payment.sku ? e.payment.sku.toLowerCase() : "";
        var matchOrder = orderSku.indexOf(q) >= 0 || paySku.indexOf(q) >= 0;
        var matchProduct = e.items.some(function (it) {
          var item = global.store.getById("product_item", it.product_item_id) || {};
          var sku = (item.sku || "").toLowerCase();
          var name = productName(it.product_item_id).toLowerCase();
          var cid = itemCategoryId(it.product_item_id);
          var cname = cid ? attrName(cid).toLowerCase() : "";
          return sku.indexOf(q) >= 0 || name.indexOf(q) >= 0 || cname.indexOf(q) >= 0;
        });
        if (!matchOrder && !matchProduct) return false;
      }
      return true;
    });
  }

  function sortMemberOrderEntries(entries) {
    var sorted = entries.slice();
    sorted.sort(function (a, b) {
      var da = a.dateIso || "";
      var db = b.dateIso || "";
      if (da !== db) return ordersSort === "oldest" ? (da < db ? -1 : 1) : da < db ? 1 : -1;
      return ordersSort === "oldest" ? a.order.id - b.order.id : b.order.id - a.order.id;
    });
    return sorted;
  }

  function paymentLinesForEntries(entries) {
    var orderIds = {};
    entries.forEach(function (e) {
      orderIds[e.order.id] = true;
    });
    var lines = [];
    lib.activeRows("order_payment_item").forEach(function (pi) {
      var pay = global.store.getById("order_payment", pi.order_payment_id);
      if (!pay || pay.deleted_at != null) return;
      if (!orderIds[pay.order_list_id]) return;
      var ooi = global.store.getById("order_list_item", pi.order_list_item_id);
      if (!ooi) return;
      lines.push({
        payment: pay,
        line: pi,
        productItemId: ooi.product_item_id,
        total: Number(pi.total_price) || 0,
        amount: Number(pi.amount) || 0,
      });
    });
    return lines;
  }

  function ordersTimeBucket(dateIso) {
    if (!dateIso) return "unknown";
    if (ordersDateFrom && ordersDateTo) {
      var from = new Date(ordersDateFrom + "T00:00:00");
      var to = new Date(ordersDateTo + "T00:00:00");
      var days = (to.getTime() - from.getTime()) / 86400000;
      if (days >= 0 && days <= 31) return dateIso;
    }
    return dateIso.slice(0, 7);
  }

  function aggregateProductTotals(plines) {
    var by = {};
    plines.forEach(function (row) {
      var pid = row.productItemId;
      if (!pid) return;
      if (!by[pid]) by[pid] = { productItemId: pid, qty: 0, total: 0 };
      by[pid].qty += row.amount;
      by[pid].total += row.total;
    });
    return Object.keys(by)
      .map(function (k) {
        return by[k];
      })
      .sort(function (a, b) {
        return b.total - a.total;
      });
  }

  function ordersSummaryData(entries) {
    var totalPurchase = 0;
    var totalPaid = 0;
    var creditOutstanding = 0;
    var byCategory = {};
    var byBrand = {};
    var byTime = {};
    var seenPayments = {};
    entries.forEach(function (e) {
      var p = e.payment;
      if (!p) return;
      if (seenPayments[p.id]) return;
      seenPayments[p.id] = true;
      totalPurchase += Number(p.total_price) || 0;
      totalPaid += Number(p.amount_paid) || 0;
      if (p.payment_category === "credit" && !p.is_full) {
        creditOutstanding += Math.max(0, (Number(p.total_price) || 0) - (Number(p.amount_paid) || 0));
      }
      var bucket = ordersTimeBucket(orderRowDate(e.order, p));
      byTime[bucket] = (byTime[bucket] || 0) + (Number(p.total_price) || 0);
    });
    paymentLinesForEntries(entries).forEach(function (row) {
      var catId = itemCategoryId(row.productItemId);
      var brandId = itemBrandId(row.productItemId);
      if (catId) {
        var ck = String(catId);
        byCategory[ck] = (byCategory[ck] || 0) + row.total;
      }
      if (brandId) {
        var bk = String(brandId);
        byBrand[bk] = (byBrand[bk] || 0) + row.total;
      }
    });
    return {
      totalPurchase: totalPurchase,
      totalPaid: totalPaid,
      creditOutstanding: creditOutstanding,
      byCategory: byCategory,
      byBrand: byBrand,
      byTime: byTime,
      productTotals: aggregateProductTotals(paymentLinesForEntries(entries)),
    };
  }

  function memberCreditOutstandingKpi() {
    if (!memberId) return 0;
    var sum = 0;
    lib.activeRows("order_payment").forEach(function (p) {
      if (p.payment_category !== "credit" || p.is_full) return;
      var o = global.store.getById("order_list", p.order_list_id);
      if (!o || Number(o.member_user_id) !== Number(memberId)) return;
      sum += Math.max(0, (Number(p.total_price) || 0) - (Number(p.amount_paid) || 0));
    });
    return sum;
  }

  function memberOverdueKpi() {
    if (!memberId) return 0;
    var sum = 0;
    lib.activeRows("order_list").forEach(function (order) {
      if (Number(order.member_user_id) !== Number(memberId)) return;
      var payment = paymentsForOrder(order.id)[0];
      if (!payment || orderDisplayStatus(order, payment) !== "overdue") return;
      sum += Math.max(0, (Number(payment.total_price) || 0) - (Number(payment.amount_paid) || 0));
    });
    return sum;
  }

  function ordersCategoryOptions() {
    var ids = {};
    memberOrderEntries().forEach(function (e) {
      e.items.forEach(function (it) {
        var cid = itemCategoryId(it.product_item_id);
        if (cid) ids[cid] = true;
      });
    });
    return Object.keys(ids)
      .map(Number)
      .sort(function (a, b) {
        return attrName(a).localeCompare(attrName(b));
      })
      .map(function (id) {
        return { value: id, label: attrName(id) };
      });
  }

  function ordersStatCard(icon, iconClass, labelKey, valueHtml) {
    return (
      '<div class="member-user-stat member-user-orders-stat">' +
      '<span class="member-user-stat__icon' +
      (iconClass ? " " + iconClass : "") +
      '"><img src="../assets/icons/' +
      icon +
      '.svg" alt="" width="20" height="20" /></span>' +
      "<div><p class=\"member-user-stat__label\" data-i18n=\"" +
      labelKey +
      '"></p>' +
      '<p class="member-user-stat__value">' +
      valueHtml +
      ' <span class="member-user-stat__unit" data-i18n="memberUser.bahtUnit"></span></p></div></div>'
    );
  }

  function ordersDonutSvg(byCategory) {
    var keys = Object.keys(byCategory);
    if (!keys.length) {
      return '<p class="member-user-empty" data-i18n="memberUser.emptyData"></p>';
    }
    var total = keys.reduce(function (s, k) {
      return s + byCategory[k];
    }, 0);
    var colors = ["#2563eb", "#16a34a", "#ea580c", "#9333ea", "#0891b2", "#dc2626"];
    var r = 40;
    var cx = 50;
    var cy = 50;
    var start = -Math.PI / 2;
    var arcs = "";
    var legend = "";
    keys.forEach(function (k, i) {
      var v = byCategory[k];
      var frac = total > 0 ? v / total : 0;
      var angle = frac * Math.PI * 2;
      var end = start + angle;
      var x1 = cx + r * Math.cos(start);
      var y1 = cy + r * Math.sin(start);
      var x2 = cx + r * Math.cos(end);
      var y2 = cy + r * Math.sin(end);
      var large = angle > Math.PI ? 1 : 0;
      if (frac > 0.999) {
        arcs += '<circle cx="' + cx + '" cy="' + cy + '" r="' + r + '" fill="' + colors[i % colors.length] + '" />';
      } else if (frac > 0) {
        arcs +=
          '<path d="M ' +
          cx +
          " " +
          cy +
          " L " +
          x1 +
          " " +
          y1 +
          " A " +
          r +
          " " +
          r +
          " 0 " +
          large +
          " 1 " +
          x2 +
          " " +
          y2 +
          ' Z" fill="' +
          colors[i % colors.length] +
          '" />';
      }
      start = end;
      legend +=
        '<li><span class="member-user-orders-legend__dot" style="background:' +
        colors[i % colors.length] +
        '"></span>' +
        escapeHtml(attrName(Number(k))) +
        "</li>";
    });
    return (
      '<div class="member-user-orders-chart__donut">' +
      '<svg viewBox="0 0 100 100" class="member-user-orders-chart__svg" aria-hidden="true">' +
      arcs +
      '<circle cx="' +
      cx +
      '" cy="' +
      cy +
      '" r="' +
      (r * 0.55) +
      '" class="member-user-orders-chart__donut-hole" />' +
      "</svg>" +
      '<ul class="member-user-orders-legend">' +
      legend +
      "</ul></div>"
    );
  }

  function ordersBarSvg(byBrand) {
    var keys = Object.keys(byBrand)
      .map(function (k) {
        return { id: k, v: byBrand[k] };
      })
      .sort(function (a, b) {
        return b.v - a.v;
      })
      .slice(0, 8);
    if (!keys.length) {
      return '<p class="member-user-empty" data-i18n="memberUser.emptyData"></p>';
    }
    var max = keys[0].v || 1;
    var rows = keys
      .map(function (row) {
        var w = Math.max(4, (row.v / max) * 100);
        return (
          '<div class="member-user-orders-bar">' +
          '<span class="member-user-orders-bar__label">' +
          escapeHtml(attrName(Number(row.id))) +
          "</span>" +
          '<div class="member-user-orders-bar__track"><div class="member-user-orders-bar__fill" style="width:' +
          w +
          '%"></div></div>' +
          '<span class="member-user-orders-bar__value">' +
          formatMoney(row.v) +
          "</span></div>"
        );
      })
      .join("");
    return '<div class="member-user-orders-bars">' + rows + "</div>";
  }

  function ordersLineSvg(byTime) {
    var keys = Object.keys(byTime).filter(function (k) {
      return k !== "unknown";
    });
    keys.sort();
    if (!keys.length) {
      return '<p class="member-user-empty" data-i18n="memberUser.emptyData"></p>';
    }
    var max = Math.max.apply(
      null,
      keys.map(function (k) {
        return byTime[k];
      })
    );
    if (!max) max = 1;
    var w = 280;
    var h = 120;
    var pad = 8;
    var pts = keys
      .map(function (k, i) {
        var x = pad + (i / Math.max(1, keys.length - 1)) * (w - pad * 2);
        var y = h - pad - (byTime[k] / max) * (h - pad * 2);
        return x.toFixed(1) + "," + y.toFixed(1);
      })
      .join(" ");
    return (
      '<svg viewBox="0 0 ' +
      w +
      " " +
      h +
      '" class="member-user-orders-chart__line" aria-hidden="true">' +
      '<polyline fill="none" stroke="var(--color-primary)" stroke-width="2" points="' +
      pts +
      '" />' +
      "</svg>"
    );
  }

  function ordersChartsHtml(summary) {
    return (
      '<div class="member-user-orders__charts">' +
      '<div class="supplier-form__card member-user-orders__chart">' +
      '<h3 class="supplier-form__card-title member-user-orders__chart-title">' +
      '<img src="../assets/icons/chart-pie.svg" alt="" width="18" height="18" />' +
      '<span data-i18n="memberUser.ordersChartCategory"></span></h3>' +
      ordersDonutSvg(summary.byCategory) +
      "</div>" +
      '<div class="supplier-form__card member-user-orders__chart">' +
      '<h3 class="supplier-form__card-title member-user-orders__chart-title">' +
      '<img src="../assets/icons/bar-chart-3.svg" alt="" width="18" height="18" />' +
      '<span data-i18n="memberUser.ordersChartBrand"></span></h3>' +
      ordersBarSvg(summary.byBrand) +
      "</div>" +
      '<div class="supplier-form__card member-user-orders__chart">' +
      '<h3 class="supplier-form__card-title member-user-orders__chart-title">' +
      '<img src="../assets/icons/trending-up.svg" alt="" width="18" height="18" />' +
      '<span data-i18n="memberUser.ordersChartTime"></span></h3>' +
      ordersLineSvg(summary.byTime) +
      "</div></div>"
    );
  }

  function ordersCarouselHtml(productTotals) {
    var top = productTotals.slice(0, 8);
    if (!top.length) return "";
    var cards = top
      .map(function (row) {
        var item = global.store.getById("product_item", row.productItemId) || {};
        var preview = item.system_file_id ? filePreview(item.system_file_id) : null;
        var img = preview
          ? '<img src="' + escapeAttr(preview) + '" alt="" />'
          : '<img src="../assets/icons/package.svg" alt="" width="32" height="32" />';
        return (
          '<div class="member-user-orders-carousel__card">' +
          '<div class="member-user-orders-carousel__thumb">' +
          img +
          "</div>" +
          '<div class="member-user-orders-carousel__name">' +
          escapeHtml(productName(row.productItemId)) +
          "</div>" +
          '<div class="member-user-orders-carousel__meta">' +
          escapeHtml(
            t("memberUser.ordersCarouselQty", {
              qty: String(Math.round(row.qty)),
              amount: formatMoney(row.total),
            })
          ) +
          "</div></div>"
        );
      })
      .join("");
    return (
      '<div class="member-user-orders-carousel">' +
      '<h3 class="member-user-orders-carousel__title" data-i18n="memberUser.ordersCarouselTitle"></h3>' +
      '<div class="member-user-orders-carousel__track">' +
      cards +
      "</div></div>"
    );
  }

  function orderStatusBadge(statusKey) {
    return (
      '<span class="member-user-order-badge member-user-order-badge--' +
      escapeHtml(statusKey) +
      '" data-i18n="memberUser.ordersStatus_' +
      statusKey +
      '"></span>'
    );
  }

  function ordersTableHtml(rows) {
    if (!rows.length) {
      return (
        '<div class="crud-table-wrap"><table class="data-table"><tbody><tr><td colspan="8" class="crud-empty" data-i18n="memberUser.ordersEmpty"></td></tr></tbody></table></div>'
      );
    }
    var body = rows
      .map(function (e) {
        var order = e.order;
        var payment = e.payment;
        var net = payment ? Number(payment.total_price) : 0;
        var subSku = payment && payment.sku ? payment.sku : "—";
        var shipKey = "memberUser.ordersShipping_" + e.shippingType;
        return (
          "<tr>" +
          '<td><div class="member-user-orders-order-id">' +
          escapeHtml(order.sku || "—") +
          '</div><div class="member-user-orders-order-sub">' +
          escapeHtml(subSku) +
          "</div></td>" +
          "<td>" +
          escapeHtml(global.i18n.formatDate(order.ordered_at || (payment && payment.ordered_at))) +
          "</td>" +
          '<td class="data-table__col-numeric">' +
          escapeHtml(String(Math.round(e.itemQty))) +
          "</td>" +
          '<td class="data-table__col-numeric">' +
          formatMoney(net) +
          "</td>" +
          "<td><span data-i18n=\"" +
          shipKey +
          '"></span></td>' +
          '<td class="data-table__col-center">' +
          orderStatusBadge(e.statusKey) +
          "</td>" +
          "<td>" +
          escapeHtml(adminUsername(order.created_by)) +
          "</td>" +
          '<td class="data-table__col-center data-table__actions-cell"><div class="data-table__actions">' +
          '<button type="button" class="btn btn--icon crud-add mu-order-view" data-order="' +
          order.id +
          '" aria-label="' +
          escapeHtml(t("memberUser.ordersView")) +
          '"><img src="../assets/icons/file-text.svg" alt="" width="16" height="16" /></button>' +
          "</div></td></tr>"
        );
      })
      .join("");
    return (
      '<div class="crud-table-wrap"><table class="data-table"><thead><tr>' +
      '<th data-i18n="memberUser.ordersColOrder"></th>' +
      '<th data-i18n="memberUser.ordersColDate"></th>' +
      '<th class="data-table__col-numeric" data-i18n="memberUser.ordersColQty"></th>' +
      '<th class="data-table__col-numeric" data-i18n="memberUser.ordersColNet"></th>' +
      '<th data-i18n="memberUser.ordersColShipping"></th>' +
      '<th class="data-table__col-center" data-i18n="col.status"></th>' +
      '<th data-i18n="memberUser.ordersColIssuer"></th>' +
      '<th class="data-table__actions-col" data-i18n="col.actions"></th>' +
      "</tr></thead><tbody>" +
      body +
      "</tbody></table></div>"
    );
  }

  function discountRowActiveOnDate(row, isoDate) {
    if (!isoDate) return true;
    if (row.date_start && row.date_start > isoDate) return false;
    if (row.date_end && row.date_end < isoDate) return false;
    return true;
  }

  function filteredDiscountRows() {
    var rows = discountsForCredit(discountCreditId, discountTab === "expired");
    rows.sort(function (a, b) {
      var ca = a.created_at || "";
      var cb = b.created_at || "";
      if (ca !== cb) return ca < cb ? -1 : 1;
      return a.id - b.id;
    });
    var q = discountQuery.trim().toLowerCase();
    if (q) {
      rows = rows.filter(function (r) {
        var item = global.store.getById("product_item", r.product_item_id) || {};
        var sku = String(item.sku || "").toLowerCase();
        var name = productName(r.product_item_id).toLowerCase();
        var brand = itemBrandName(r.product_item_id).toLowerCase();
        return sku.indexOf(q) >= 0 || name.indexOf(q) >= 0 || brand.indexOf(q) >= 0;
      });
    }
    if (discountBrandId) {
      var bid = Number(discountBrandId);
      rows = rows.filter(function (r) {
        return itemBrandId(r.product_item_id) === bid;
      });
    }
    if (discountDate) {
      rows = rows.filter(function (r) {
        return discountRowActiveOnDate(r, discountDate);
      });
    }
    if (discountTab === "list") {
      rows = rows.filter(function (r) {
        return !bulkDiscountRowIncluded(r.id);
      });
    } else if (discountTab === "bulk") {
      rows = rows.filter(function (r) {
        return bulkDiscountRowIncluded(r.id);
      });
    }
    return rows;
  }

  function pushBulkDiscountRowId(id) {
    if (!bulkDiscountRowIncluded(id)) bulkDiscountRowIds.push(Number(id));
  }

  function removeBulkDiscountRowId(id) {
    var rid = Number(id);
    bulkDiscountRowIds = bulkDiscountRowIds.filter(function (x) {
      return Number(x) !== rid;
    });
  }

  function paginateRows(rows, page, pageSize) {
    var total = rows.length;
    var totalPages = Math.max(1, Math.ceil(total / pageSize) || 1);
    var p = Math.min(Math.max(1, page), totalPages);
    var start = (p - 1) * pageSize;
    return {
      rows: rows.slice(start, start + pageSize),
      meta: {
        total: total,
        totalPages: totalPages,
        page: p,
        from: total ? start + 1 : 0,
        to: Math.min(start + pageSize, total),
      },
    };
  }

  function bulkRowDraft(row) {
    var d = bulkDraft[row.id];
    if (d) return d;
    return {
      minimum_qty: row.minimum_qty != null ? String(row.minimum_qty) : "0",
      discount: row.discount != null ? String(row.discount) : "0",
      discount_type: "percent",
      date_start: row.date_start || "",
      date_end: row.date_end || "",
    };
  }

  function discountTableHead(opts) {
    opts = opts || {};
    var selHead = opts.selectable
      ? '<th class="data-table__col-center"><input type="checkbox" id="mu-disc-all" aria-label="' +
        escapeAttr(t("rolePerm.selectAll")) +
        '" /></th>'
      : "";
    var actHead = opts.showActions !== false ? '<th class="data-table__actions-col" data-i18n="crud.actions"></th>' : "";
    return (
      selHead +
      '<th data-i18n="memberUser.productSku"></th><th data-i18n="memberUser.productName"></th>' +
      '<th data-i18n="col.brand"></th>' +
      '<th class="data-table__col-numeric" data-i18n="memberUser.minQty"></th>' +
      '<th class="data-table__col-numeric" data-i18n="memberUser.regularPrice"></th>' +
      '<th class="data-table__col-numeric" data-i18n="memberTier.discount"></th>' +
      '<th class="data-table__col-numeric" data-i18n="memberUser.specialPrice"></th>' +
      '<th data-i18n="memberUser.startDate"></th><th data-i18n="memberUser.endDate"></th>' +
      actHead
    );
  }

  function discountTabUsesBulkEditor() {
    return discountTab === "bulk" || discountTab === "expired";
  }

  function discountTableEmpty(colspan) {
    return (
      '<div class="crud-table-wrap"><table class="data-table"><thead><tr>' +
      discountTableHead({ selectable: discountTabUsesBulkEditor(), showActions: discountTabUsesBulkEditor() }) +
      '</tr></thead><tbody><tr><td colspan="' +
      colspan +
      '" class="crud-empty" data-i18n="memberUser.emptyData"></td></tr></tbody></table></div>'
    );
  }

  function formatDiscDate(iso) {
    if (!iso) return "—";
    if (!global.i18n) return iso;
    return global.i18n.formatDate(iso);
  }

  function formatDiscountDisplay(amount) {
    return String(amount != null ? amount : 0) + "%";
  }

  function discountTableList(pageRows, editable) {
    if (!pageRows.length) return discountTableEmpty(editable ? 10 : 9);
    var body = pageRows
      .map(function (r) {
        var item = global.store.getById("product_item", r.product_item_id) || {};
        var price = item.price || 0;
        var special = calcSpecial(price, r.discount, r.discount_type);
        var actions = editable
          ? '<td class="data-table__actions-cell"><div class="data-table__actions">' +
            '<button type="button" class="btn btn--icon mu-disc-edit" data-id="' +
            r.id +
            '"><img src="../assets/icons/pencil.svg" alt="" width="16" height="16" /></button>' +
            '<button type="button" class="btn btn--icon crud-delete mu-disc-del" data-id="' +
            r.id +
            '"><img src="../assets/icons/trash-2.svg" alt="" width="16" height="16" /></button></div></td>'
          : "";
        return (
          "<tr><td>" +
          escapeHtml(item.sku || "") +
          "</td><td>" +
          escapeHtml(productName(r.product_item_id)) +
          "</td><td>" +
          escapeHtml(itemBrandName(r.product_item_id)) +
          '</td><td class="data-table__col-numeric">' +
          escapeHtml(String(r.minimum_qty || 0)) +
          '</td><td class="data-table__col-numeric">' +
          formatMoney(price) +
          '</td><td class="data-table__col-numeric">' +
          escapeHtml(formatDiscountDisplay(r.discount)) +
          '</td><td class="data-table__col-numeric">' +
          formatMoney(special) +
          "</td><td>" +
          escapeHtml(formatDiscDate(r.date_start)) +
          "</td><td>" +
          escapeHtml(formatDiscDate(r.date_end)) +
          "</td>" +
          actions +
          "</tr>"
        );
      })
      .join("");
    return (
      '<div class="crud-table-wrap"><table class="data-table"><thead><tr>' +
      discountTableHead({ showActions: editable }) +
      "</tr></thead><tbody>" +
      body +
      "</tbody></table></div>"
    );
  }

  function discountTableBulk(pageRows) {
    if (!pageRows.length) return discountTableEmpty(11);
    var body = pageRows
      .map(function (r) {
        var item = global.store.getById("product_item", r.product_item_id) || {};
        var price = item.price || 0;
        var d = bulkRowDraft(r);
        var special = calcSpecial(price, d.discount, "percent");
        return (
          "<tr>" +
          '<td class="data-table__col-center"><input type="checkbox" class="mu-disc-check" data-id="' +
          r.id +
          '"' +
          (bulkChecked[r.id] ? " checked" : "") +
          " /></td><td>" +
          escapeHtml(item.sku || "") +
          "</td><td>" +
          escapeHtml(productName(r.product_item_id)) +
          "</td><td>" +
          escapeHtml(itemBrandName(r.product_item_id)) +
          '</td><td class="data-table__col-numeric"><input type="number" class="mu-disc-inline" data-id="' +
          r.id +
          '" data-field="minimum_qty" min="0" step="1" value="' +
          escapeAttr(d.minimum_qty) +
          '" /></td><td class="data-table__col-numeric">' +
          formatMoney(price) +
          '</td><td class="data-table__col-numeric"><span class="member-user-discount-inline">' +
          '<input type="number" class="mu-disc-inline" data-id="' +
          r.id +
          '" data-field="discount" min="0" step="0.01" value="' +
          escapeAttr(d.discount) +
          '" /><span class="member-user-discount-inline__pct" aria-hidden="true">%</span></span></td><td class="data-table__col-numeric mu-disc-special" data-id="' +
          r.id +
          '">' +
          formatMoney(special) +
          '</td><td><input type="date" class="mu-disc-inline" data-id="' +
          r.id +
          '" data-field="date_start" value="' +
          escapeAttr(d.date_start) +
          '" /></td><td><input type="date" class="mu-disc-inline" data-id="' +
          r.id +
          '" data-field="date_end" value="' +
          escapeAttr(d.date_end) +
          '" /></td>' +
          '<td class="data-table__actions-cell"><div class="data-table__actions">' +
          '<button type="button" class="btn btn--icon mu-disc-save" data-id="' +
          r.id +
          '" aria-label="' +
          escapeAttr(t("crud.save")) +
          '"><img src="../assets/icons/save.svg" alt="" width="16" height="16" /></button>' +
          '<button type="button" class="btn btn--icon mu-disc-revert" data-id="' +
          r.id +
          '" aria-label="' +
          escapeAttr(t("memberUser.revertRow")) +
          '"><img src="../assets/icons/rotate-ccw.svg" alt="" width="16" height="16" /></button></div></td></tr>'
        );
      })
      .join("");
    return (
      '<div class="crud-table-wrap"><table class="data-table"><thead><tr>' +
      discountTableHead({ selectable: true, showActions: true }) +
      "</tr></thead><tbody>" +
      body +
      "</tbody></table></div>"
    );
  }

  function brandFilterOptions(selected) {
    var rows = lib
      .activeRows("product_attribute")
      .filter(function (r) {
        return r.type === "brand" && r.is_active;
      })
      .sort(function (a, b) {
        return (a.sort_order || 0) - (b.sort_order || 0) || a.id - b.id;
      });
    var ph = global.i18n
      ? global.i18n.format("form.placeholder.select", { label: t("col.brand") })
      : t("col.brand");
    var html =
      '<option value="" disabled' +
      (!selected ? " selected" : "") +
      ">" +
      escapeHtml(ph) +
      "</option>";
    rows.forEach(function (r) {
      html +=
        '<option value="' +
        r.id +
        '"' +
        (String(selected) === String(r.id) ? " selected" : "") +
        ">" +
        escapeHtml(attrName(r.id)) +
        "</option>";
    });
    return html;
  }

  function discountDateFilterHtml() {
    var hasValue = !!(discountDate && String(discountDate).trim());
    return (
      '<div class="crud-toolbar__date-wrap' +
      (hasValue ? " has-value" : "") +
      '">' +
      '<span class="crud-toolbar__date-placeholder" data-i18n="memberUser.discountFilterDate"></span>' +
      '<input type="date" id="mu-disc-date" class="crud-toolbar__select crud-toolbar__date-input" value="' +
      escapeAttr(discountDate || "") +
      '" aria-label="' +
      escapeAttr(t("memberUser.discountFilterDate")) +
      '" /></div>'
    );
  }

  function discountActionsHtml() {
    return (
      '<div class="member-user-discount-head__actions">' +
      '<button type="button" class="btn" id="mu-disc-import"><img src="../assets/icons/upload.svg" alt="" width="16" height="16" /><span data-i18n="action.import"></span></button>' +
      '<button type="button" class="btn" id="mu-disc-export"><img src="../assets/icons/download.svg" alt="" width="16" height="16" /><span data-i18n="action.export"></span></button>' +
      '<button type="button" class="btn btn--primary" id="mu-add-product"><img src="../assets/icons/plus.svg" alt="" width="16" height="16" /><span data-i18n="memberUser.addProduct"></span></button>' +
      "</div>"
    );
  }

  function discountFiltersHtml() {
    return (
      '<div class="member-user-discount-filters">' +
      '<input type="search" id="mu-disc-search" class="crud-toolbar__search" data-i18n-placeholder="memberUser.discountSearch" placeholder="' +
      escapeAttr(t("memberUser.discountSearch")) +
      '" value="' +
      escapeAttr(discountQuery) +
      '" />' +
      '<select id="mu-disc-brand" class="crud-toolbar__select" aria-label="' +
      escapeAttr(t("col.brand")) +
      '">' +
      brandFilterOptions(discountBrandId) +
      "</select>" +
      discountDateFilterHtml() +
      "</div>"
    );
  }

  function bulkApplyBarHtml() {
    return (
      '<div class="member-user-discount-bulk-bar">' +
      '<div class="form-field"><label for="mu-bulk-min"><span data-i18n="memberUser.minQty"></span></label>' +
      '<input type="number" id="mu-bulk-min" min="0" step="1" value="0" data-i18n-placeholder-input="memberUser.minQty" placeholder="" /></div>' +
      '<div class="form-field"><label for="mu-bulk-disc"><span data-i18n="memberUser.discountPercent"></span></label>' +
      '<input type="number" id="mu-bulk-disc" min="0" step="0.01" value="0" data-i18n-placeholder-input="memberTier.discount" placeholder="" /></div>' +
      '<div class="form-field"><label for="mu-bulk-start"><span data-i18n="memberUser.startDate"></span></label>' +
      '<input type="date" id="mu-bulk-start" /></div>' +
      '<div class="form-field"><label for="mu-bulk-end"><span data-i18n="memberUser.endDate"></span></label>' +
      '<input type="date" id="mu-bulk-end" /></div>' +
      '<button type="button" class="btn btn--primary" id="mu-apply-bulk"><span data-i18n="memberUser.applyBulk"></span></button>' +
      "</div>"
    );
  }

  function creditSubTabs() {
    var credits = memberDiscountCreditIds();
    if (!credits.length) return "";
    if (!discountCreditId || credits.map(String).indexOf(String(discountCreditId)) < 0) {
      discountCreditId = String(credits[0]);
    }
    return (
      '<div class="member-user-credit-tabs">' +
      credits
        .map(function (id) {
          return (
            '<button type="button" class="member-user-credit-tabs__btn' +
            (String(discountCreditId) === String(id) ? " member-user-credit-tabs__btn--active" : "") +
            '" data-credit="' +
            id +
            '">' +
            escapeHtml(lib.creditName(Number(id))) +
            "</button>"
          );
        })
        .join("") +
      "</div>"
    );
  }

  function discountsHtml() {
    var allRows = filteredDiscountRows();
    var sliced = paginateRows(allRows, discountPage, discountPageSize);
    discountPage = sliced.meta.page;
    var tableHtml;
    if (discountTabUsesBulkEditor()) {
      tableHtml = discountTableBulk(sliced.rows);
    } else {
      tableHtml = discountTableList(sliced.rows, true);
    }
    var showDiscTools = discountTab !== "expired";
    var showBulkBar =
      (discountTab === "bulk" && bulkDiscountRowIds.length > 0) ||
      (discountTab === "expired" && allRows.length > 0);
    var bulkBar = showBulkBar ? bulkApplyBarHtml() : "";
    return (
      '<section class="supplier-form__card">' +
      '<div class="member-user-discount-head">' +
      '<div class="member-user-subtabs">' +
      '<button type="button" class="member-user-subtabs__btn' +
      (discountTab === "list" ? " member-user-subtabs__btn--active" : "") +
      '" data-dtab="list" data-i18n="memberUser.discountTabList"></button>' +
      '<button type="button" class="member-user-subtabs__btn' +
      (discountTab === "bulk" ? " member-user-subtabs__btn--active" : "") +
      '" data-dtab="bulk" data-i18n="memberUser.discountTabBulk"></button>' +
      '<button type="button" class="member-user-subtabs__btn' +
      (discountTab === "expired" ? " member-user-subtabs__btn--active" : "") +
      '" data-dtab="expired" data-i18n="memberUser.discountTabExpired"></button></div>' +
      (showDiscTools ? discountActionsHtml() : "") +
      "</div>" +
      (showDiscTools ? discountFiltersHtml() : "") +
      creditSubTabs() +
      bulkBar +
      tableHtml +
      '<div id="mu-disc-pagination" class="crud-pagination"></div>' +
      "</section>"
    );
  }

  function memberFiles() {
    return lib
      .activeRows("member_user_file")
      .filter(function (r) {
        return r.member_user_id === memberId;
      })
      .sort(function (a, b) {
        return (a.sort_order || 0) - (b.sort_order || 0) || a.id - b.id;
      });
  }

  function filesHtml() {
    var rows = memberFiles();
    var list =
      rows.length === 0
        ? '<p class="member-user-empty" data-i18n="memberUser.emptyData"></p>'
        : '<div class="member-user-files">' +
          rows
            .map(function (r) {
              var f = global.store.getById("system_file", r.system_file_id) || {};
              var admin = global.store.getById("admin_user", f.created_by);
              var ext = (f.original_name || "").split(".").pop() || "FILE";
              var iconClass = /pdf/i.test(f.content_type || "") ? " member-user-file__icon--pdf" : "";
              return (
                '<div class="member-user-file"><span class="member-user-file__icon' +
                iconClass +
                '">' +
                escapeHtml(String(ext).toUpperCase()) +
                '</span><div class="member-user-file__meta"><div class="member-user-file__name">' +
                escapeHtml(f.original_name || "file") +
                "</div><div>" +
                escapeHtml(
                  t("memberUser.filesUploadedBy", {
                    name: admin ? admin.username : "—",
                    date: global.i18n.formatDateTime(f.created_at),
                    size: formatBytes(f.size_bytes || 0),
                  })
                ) +
                '</div></div><button type="button" class="btn btn--icon crud-delete mu-file-del" data-id="' +
                r.id +
                '"><img src="../assets/icons/trash-2.svg" alt="" width="16" height="16" /></button></div>'
              );
            })
            .join("") +
          "</div>";
    return (
      '<section class="supplier-form__card">' +
      '<p class="supplier-form__hint" data-i18n="memberUser.filesHint"></p>' +
      '<div style="margin:0.75rem 0"><label class="btn btn--primary" for="mu-file-input"><img src="../assets/icons/upload.svg" alt="" width="16" height="16" /><span data-i18n="memberUser.filesUpload"></span></label>' +
      '<input type="file" id="mu-file-input" class="visually-hidden" accept="application/pdf,image/jpeg,image/png" /></div>' +
      list +
      "</section>"
    );
  }

  function ordersHtml() {
    var all = sortMemberOrderEntries(filterMemberOrderEntries(memberOrderEntries()));
    var summary = ordersSummaryData(all);
    var sliced = paginateRows(all, ordersPage, ordersPageSize);
    ordersPage = sliced.meta.page;
    var catOpts = ordersCategoryOptions();
    var catSelect =
      '<option value=""' +
      (ordersCategoryId ? "" : " selected") +
      ' data-i18n="memberUser.ordersCategoryAll"></option>' +
      catOpts
        .map(function (o) {
          var sel = String(ordersCategoryId) === String(o.value) ? " selected" : "";
          return '<option value="' + o.value + '"' + sel + ">" + escapeHtml(o.label) + "</option>";
        })
        .join("");
    var statusOpts = ["all", "success", "pending", "overdue", "cancelled"]
      .map(function (v) {
        var sel = (ordersStatus || "all") === v ? " selected" : "";
        return (
          '<option value="' +
          v +
          '"' +
          sel +
          ' data-i18n="memberUser.ordersStatus_' +
          v +
          '"></option>'
        );
      })
      .join("");
    var sortOpts = ["newest", "oldest"]
      .map(function (v) {
        var sel = ordersSort === v ? " selected" : "";
        return (
          '<option value="' +
          v +
          '"' +
          sel +
          ' data-i18n="memberUser.ordersSort_' +
          v +
          '"></option>'
        );
      })
      .join("");
    function ordersDateField(id, labelKey, value) {
      var hasValue = !!(value && String(value).trim());
      return (
        '<label class="member-user-orders__field crud-toolbar__date-wrap' +
        (hasValue ? " has-value" : "") +
        '" for="' +
        escapeAttr(id) +
        '"><span class="member-user-orders__field-label" data-i18n="' +
        labelKey +
        '"></span>' +
        '<input type="date" id="' +
        escapeAttr(id) +
        '" class="crud-toolbar__select crud-toolbar__date-input" value="' +
        escapeAttr(value || "") +
        '" /></label>'
      );
    }
    var ordersRangeFilters =
      '<div class="member-user-orders__filters">' +
      ordersDateField("mu-orders-from", "memberUser.dateFrom", ordersDateFrom) +
      ordersDateField("mu-orders-to", "memberUser.dateTo", ordersDateTo) +
      '<label class="member-user-orders__field member-user-orders__field--grow" for="mu-orders-category">' +
      '<span class="member-user-orders__field-label" data-i18n="memberUser.ordersCategory"></span>' +
      '<select id="mu-orders-category" class="crud-toolbar__select" data-i18n-placeholder-select="memberUser.ordersCategory">' +
      catSelect +
      "</select></label></div>";
    return (
      '<div class="member-user-orders">' +
      '<div class="member-user-orders__kpis member-user-stats">' +
      ordersStatCard("file-text", "", "memberUser.ordersKpiTotal", formatMoney(summary.totalPurchase)) +
      ordersStatCard("circle-check", "member-user-stat__icon--green", "memberUser.ordersKpiPaid", formatMoney(summary.totalPaid)) +
      ordersStatCard("target", "member-user-stat__icon--gold", "memberUser.ordersKpiCredit", formatMoney(summary.creditOutstanding)) +
      "</div>" +
      ordersChartsHtml(summary) +
      '<section class="supplier-form__card member-user-orders__list">' +
      '<h3 class="supplier-form__card-title" data-i18n="memberUser.ordersListTitle"></h3>' +
      ordersRangeFilters +
      '<div class="member-user-orders__toolbar member-user-discount-filters">' +
      '<input type="search" id="mu-orders-search" class="crud-toolbar__search" value="' +
      escapeAttr(ordersQuery) +
      '" data-i18n-placeholder="memberUser.ordersSearch" placeholder="' +
      escapeAttr(t("memberUser.ordersSearch")) +
      '" />' +
      '<select id="mu-orders-status" class="crud-toolbar__select" data-i18n-placeholder-select="col.status">' +
      statusOpts +
      "</select>" +
      '<select id="mu-orders-sort" class="crud-toolbar__select" data-i18n-placeholder-select="memberUser.ordersSortLabel">' +
      sortOpts +
      "</select>" +
      '<button type="button" class="btn" id="mu-orders-export">' +
      '<img src="../assets/icons/download.svg" alt="" width="16" height="16" /><span data-i18n="crud.export"></span></button>' +
      "</div>" +
      ordersCarouselHtml(summary.productTotals) +
      ordersTableHtml(sliced.rows) +
      '<div id="mu-orders-pagination" class="crud-pagination"></div>' +
      "</section></div>"
    );
  }

  function rightPanelHtml() {
    var fin = draft.financial;
    var limit = Number(fin.credit_limit) || 0;
    var outstanding = memberCreditOutstandingKpi();
    var available = Math.max(0, limit - outstanding);
    var items = historyItems();
    var recent = items.slice(0, 5);
    var list =
      recent.length === 0
        ? '<p class="supplier-form__hint" data-i18n="memberUser.emptyData"></p>'
        : '<ul class="member-user-activity">' +
          recent
            .map(function (h) {
              return (
                "<li><strong>" +
                escapeHtml(historyTitle(h.id)) +
                '</strong><span class="member-user-activity__time">' +
                escapeHtml(global.i18n.formatDateTime(h.created_at)) +
                "</span></li>"
              );
            })
            .join("") +
          "</ul>";
    return (
      '<aside class="member-user-form__sidebar member-user-panel">' +
      '<section class="supplier-form__card"><h3 class="supplier-form__card-title" data-i18n="memberUser.currentBalance"></h3>' +
      '<p class="member-user-balance">' +
      escapeHtml(t("memberUser.creditBalance", { amount: formatMoney(available), unit: t("memberUser.bahtUnit") })) +
      "</p>" +
      '<div class="member-user-balance-tiles">' +
      '<div class="member-user-balance-tile"><div class="member-user-balance-tile__label" data-i18n="memberUser.creditLimit"></div><div class="member-user-balance-tile__value">' +
      formatMoney(limit) +
      '</div></div><div class="member-user-balance-tile"><div class="member-user-balance-tile__label" data-i18n="memberUser.outstandingBalance"></div><div class="member-user-balance-tile__value">' +
      formatMoney(memberCreditOutstandingKpi()) +
      '</div></div>' +
      '<div class="member-user-balance-tile"><div class="member-user-balance-tile__label" data-i18n="memberUser.overdue"></div><div class="member-user-balance-tile__value">' +
      formatMoney(memberOverdueKpi()) +
      "</div></div></div></section>" +
      '<section class="supplier-form__card"><div class="member-user-note-head"><h3 class="supplier-form__card-title" data-i18n="memberUser.recentActivity"></h3>' +
      '<button type="button" class="btn btn--sm" id="mu-history-all" data-i18n="memberUser.viewAll"></button></div>' +
      list +
      "</section>" +
      '<section class="supplier-form__card"><div class="member-user-note-head"><h3 class="supplier-form__card-title" data-i18n="col.note"></h3>' +
      '<button type="button" class="btn btn--icon" id="mu-note-edit" aria-label="' +
      escapeHtml(t("memberUser.editNote")) +
      '"><img src="../assets/icons/pencil.svg" alt="" width="16" height="16" /></button></div>' +
      "<p>" +
      escapeHtml(draft.note || "—") +
      "</p></section></aside>"
    );
  }

  function editHtml() {
    var tabBody = generalCard() + taxCard() + financialCard() + documentCard();
    if (editTab === "orders") tabBody = ordersHtml();
    else if (editTab === "discounts") tabBody = discountsHtml();
    else if (editTab === "files") tabBody = filesHtml();
    else tabBody = memberInfoCard(false) + tabBody;
    return (
      '<div class="supplier-form member-user-form">' +
      editHeaderHtml() +
      '<div class="member-user-tabs" role="tablist">' +
      tabBtn("info", "contact.svg", "memberUser.tabInfo") +
      tabBtn("orders", "clipboard-list.svg", "memberUser.tabOrders") +
      tabBtn("discounts", "star.svg", "memberUser.tabDiscounts") +
      tabBtn("files", "file-text.svg", "memberUser.tabFiles") +
      "</div>" +
      '<div class="member-user-form__layout"><div>' +
      tabBody +
      "</div>" +
      rightPanelHtml() +
      "</div>" +
      '<div class="member-user-form__savebar">' +
      leaveBtn() +
      saveBtn() +
      "</div></div>"
    );
  }

  function collectInfo(prefix) {
    var type = radioVal(prefix + "_type") || "person";
    var tax = "";
    var hidden = document.getElementById(prefix + "_tax_number");
    if (hidden && global.otpInput) {
      var wrap = hidden.closest("[data-otp-input]");
      tax = wrap ? global.otpInput.getValue(wrap) : hidden.value;
    }
    return {
      type: type,
      setting_prefix_id: val(prefix + "_prefix_id"),
      name: val(prefix + "_name"),
      store_name: val(prefix + "_store_name"),
      tax_number: tax,
      branch: radioVal(prefix + "_branch"),
      branch_name: val(prefix + "_branch_name"),
      address: val(prefix + "_address"),
      website_province_id: val(prefix + "_province_id"),
      website_district_id: val(prefix + "_district_id"),
      website_sub_district_id: val(prefix + "_sub_district_id"),
      postcode: val(prefix + "_postcode"),
      tel: val(prefix + "_tel"),
      email: val(prefix + "_email"),
    };
  }

  function collectDraft() {
    var fileEl = document.getElementById("mu-system_file_id");
    if (fileEl) draft.system_file_id = fileEl.value ? Number(fileEl.value) : null;
    if (document.getElementById("mu-business")) draft.business_id = val("mu-business");
    if (document.getElementById("mu-credits") && global.chipMultiSelect) {
      draft.credit_ids = global.chipMultiSelect.getSelectedIds(document.getElementById("mu-credits"), "mu-credits");
    }
    if (document.getElementById("mu-groups") && global.chipMultiSelect) {
      draft.group_ids = global.chipMultiSelect.getSelectedIds(document.getElementById("mu-groups"), "mu-groups");
    }
    if (document.getElementById("mu-tier")) draft.member_tier_id = val("mu-tier");
    if (document.getElementById("mu-is_active")) draft.is_active = checked("mu-is_active");
    if (document.getElementById("mu-note")) draft.note = val("mu-note");
    if (document.getElementById("mu-admins") && global.chipMultiSelect) {
      draft.admin_user_ids = global.chipMultiSelect.getSelectedIds(document.getElementById("mu-admins"), "mu-admins");
    }
    if (document.getElementById("info_name")) draft.info = collectInfo("info");
    if (document.getElementById("tax_same") || document.getElementById("tax_name")) {
      draft.tax = Object.assign(collectInfo("tax"), { is_same_information: checked("tax_same") });
    }
    if (document.getElementById("fin_name") || document.getElementById("fin_credit_limit")) {
      draft.financial = {
        name: val("fin_name"),
        address: val("fin_address"),
        website_province_id: val("fin_province_id"),
        website_district_id: val("fin_district_id"),
        website_sub_district_id: val("fin_sub_district_id"),
        postcode: val("fin_postcode"),
        tel: val("fin_tel"),
        credit_limit: val("fin_credit_limit"),
        credit_date: val("fin_credit_date"),
        relationship: val("fin_relationship"),
      };
    }
    if (document.getElementById("doc_same") || document.getElementById("doc_name")) {
      draft.document = {
        is_same_information: checked("doc_same"),
        name: val("doc_name"),
        address: val("doc_address"),
        website_province_id: val("doc_province_id"),
        website_district_id: val("doc_district_id"),
        website_sub_district_id: val("doc_sub_district_id"),
        postcode: val("doc_postcode"),
        tel: val("doc_tel"),
        email: val("doc_email"),
      };
    }
  }

  function copyInfoTo(target) {
    return Object.assign({}, target, {
      type: draft.info.type,
      setting_prefix_id: draft.info.setting_prefix_id,
      name: draft.info.name,
      store_name: draft.info.store_name,
      tax_number: draft.info.tax_number,
      branch: draft.info.branch,
      branch_name: draft.info.branch_name,
      address: draft.info.address,
      website_province_id: draft.info.website_province_id,
      website_district_id: draft.info.website_district_id,
      website_sub_district_id: draft.info.website_sub_district_id,
      postcode: draft.info.postcode,
      tel: draft.info.tel,
      email: draft.info.email,
    });
  }

  function n(v) {
    if (v === "" || v == null) return null;
    var x = Number(v);
    return Number.isNaN(x) ? null : x;
  }

  function upsertAddress(type, payload) {
    var existing = isEdit ? addressByType(type) : null;
    var row = Object.assign(
      {
        member_user_id: memberId,
        type: type,
        deleted_at: null,
        updated_at: now(),
        updated_by: actorId(),
      },
      payload
    );
    if (existing) {
      global.store.update("member_user_address", existing.id, row);
    } else {
      global.store.create(
        "member_user_address",
        Object.assign({ created_at: now(), created_by: actorId() }, row)
      );
    }
  }

  function syncSettings() {
    var wanted = resolveRelationIds(draft.business_id, draft.credit_ids, draft.group_ids);
    var have = global.store.getAll("member_user_setting").filter(function (r) {
      return r.member_user_id === memberId;
    });
    have.forEach(function (r, idx) {
      var all = global.store.getAll("member_user_setting");
      var i = all.indexOf(r);
      if (wanted.indexOf(r.member_setting_credit_id) < 0 && i >= 0) {
        global.store.deleteAt("member_user_setting", i);
      }
    });
    wanted.forEach(function (rid) {
      var exists = global.store.getAll("member_user_setting").some(function (r) {
        return r.member_user_id === memberId && r.member_setting_credit_id === rid;
      });
      if (!exists) {
        global.store.create("member_user_setting", {
          member_user_id: memberId,
          member_setting_credit_id: rid,
          created_at: now(),
        });
      }
    });
  }

  function syncOwners() {
    var wanted = draft.admin_user_ids.map(Number);
    var have = global.store.getAll("member_user_owner").filter(function (r) {
      return r.member_user_id === memberId;
    });
    have.forEach(function (r) {
      if (wanted.indexOf(r.admin_user_id) < 0) {
        var all = global.store.getAll("member_user_owner");
        var i = all.indexOf(r);
        if (i >= 0) global.store.deleteAt("member_user_owner", i);
      }
    });
    wanted.forEach(function (aid) {
      var exists = global.store.getAll("member_user_owner").some(function (r) {
        return r.member_user_id === memberId && r.admin_user_id === aid;
      });
      if (!exists) {
        global.store.create("member_user_owner", {
          member_user_id: memberId,
          admin_user_id: aid,
          created_at: now(),
        });
      }
    });
  }

  function addHistory(titleTh, titleEn, descTh, descEn) {
    var h = global.store.create("member_history", {
      member_user_id: memberId,
      created_at: now(),
      created_by: actorId(),
    });
    global.store.create("member_history_language", {
      member_history_id: h.id,
      locale: "th",
      title: titleTh,
      description: descTh,
      created_at: now(),
      updated_at: now(),
    });
    global.store.create("member_history_language", {
      member_history_id: h.id,
      locale: "en",
      title: titleEn,
      description: descEn,
      created_at: now(),
      updated_at: now(),
    });
  }

  function addrPayload(src, type, isSame) {
    return {
      type: type,
      member_type: src.type || "person",
      setting_prefix_id: n(src.setting_prefix_id),
      name: src.name || null,
      store_name: src.store_name || null,
      tax_number: src.tax_number || null,
      branch: src.branch || null,
      branch_name: src.branch_name || null,
      address: src.address || null,
      website_province_id: n(src.website_province_id),
      website_district_id: n(src.website_district_id),
      website_sub_district_id: n(src.website_sub_district_id),
      postcode: src.postcode || null,
      tel: src.tel || null,
      email: src.email || null,
      is_same_information: !!isSame,
      credit_limit: type === "financial" ? n(draft.financial.credit_limit) : null,
      credit_date: type === "financial" ? n(draft.financial.credit_date) : null,
      relationship: type === "financial" ? draft.financial.relationship || null : null,
    };
  }

  function validate(root) {
    clearAllErrors(root);
    var ok = true;
    var first = null;
    function need(id) {
      var el = document.getElementById(id);
      var field = el ? el.closest(".form-field") : null;
      var v = val(id);
      if (!v) {
        ok = false;
        if (field) setFieldError(field, t("error.required"));
        if (!first && el) first = el;
      }
    }
    need("mu-business");
    if (!draft.credit_ids.length) {
      var cf = document.getElementById("mu-credits") || document.getElementById("mu-credit-disabled");
      if (cf) {
        setFieldError(cf.closest(".form-field"), t("error.required"));
        ok = false;
        if (!first) first = cf;
      }
    }
    if (!draft.group_ids.length) {
      var gf = document.getElementById("mu-groups") || document.getElementById("mu-group-disabled");
      if (gf) {
        setFieldError(gf.closest(".form-field"), t("error.required"));
        ok = false;
        if (!first) first = gf;
      }
    }
    if (!isEdit) {
      need("info_name");
      need("info_tel");
    } else if (editTab === "info") {
      need("info_name");
      need("info_tel");
    }
    if (first) first.focus();
    return ok;
  }

  function save() {
    collectDraft();
    var root = document.getElementById("mu-form-root");
    if (!validate(root)) {
      global.toast.show(t("error.required"), "error");
      return;
    }
    submitting = true;
    var taxSrc = draft.tax.is_same_information ? copyInfoTo(draft.tax) : draft.tax;
    var docSrc = draft.document.is_same_information
      ? {
          name: draft.info.name,
          address: draft.info.address,
          website_province_id: draft.info.website_province_id,
          website_district_id: draft.info.website_district_id,
          website_sub_district_id: draft.info.website_sub_district_id,
          postcode: draft.info.postcode,
          tel: draft.info.tel,
          email: draft.info.email,
        }
      : draft.document;
    var payload = {
      member_tier_id: n(draft.member_tier_id),
      type: draft.info.type || "person",
      setting_prefix_id: n(draft.info.setting_prefix_id),
      name: draft.info.name,
      store_name: draft.info.store_name || null,
      tax_number: draft.info.tax_number || null,
      branch: draft.info.branch || null,
      branch_name: draft.info.branch_name || null,
      tel: draft.info.tel || null,
      email: draft.info.email || null,
      address: draft.info.address || null,
      website_province_id: n(draft.info.website_province_id),
      website_district_id: n(draft.info.website_district_id),
      website_sub_district_id: n(draft.info.website_sub_district_id),
      postcode: draft.info.postcode || null,
      system_file_id: draft.system_file_id,
      note: draft.note || null,
      is_active: !!draft.is_active,
      updated_at: now(),
      updated_by: actorId(),
    };
    if (isEdit) {
      global.store.update("member_user", memberId, payload);
      addHistory(t("memberUser.updatedHistory"), "Profile updated", draft.info.name, draft.info.name);
    } else {
      var sku = global.systemCodeLib.nextCode("member_user");
      var created = global.store.create(
        "member_user",
        Object.assign(
          {
            sku: sku,
            created_at: now(),
            created_by: actorId(),
            deleted_at: null,
          },
          payload
        )
      );
      memberId = created.id;
      addHistory(t("memberUser.createdHistory"), "Member created", draft.info.name, draft.info.name);
    }
    upsertAddress("tax", addrPayload(taxSrc, "tax", draft.tax.is_same_information));
    upsertAddress(
      "doc",
      addrPayload(Object.assign(blankInfo(), docSrc), "doc", draft.document.is_same_information)
    );
    upsertAddress(
      "financial",
      addrPayload(Object.assign(blankInfo(), { name: draft.financial.name, address: draft.financial.address, website_province_id: draft.financial.website_province_id, website_district_id: draft.financial.website_district_id, website_sub_district_id: draft.financial.website_sub_district_id, postcode: draft.financial.postcode, tel: draft.financial.tel }), "financial", false)
    );
    syncSettings();
    syncOwners();
    submitting = false;
    global.toast.show(isEdit ? t("crud.updated") : t("crud.created"), "success");
    if (!isEdit) {
      window.location.href = "member-user.html";
      return;
    }
    render();
  }

  function hydrate() {
    bulkDiscountRowIds = [];
    var row = memberRow();
    if (!row) {
      global.toast.show(t("error.notFound"), "error");
      window.location.replace("member-user.html");
      return false;
    }
    var settings = global.store.getAll("member_user_setting").filter(function (r) {
      return r.member_user_id === memberId;
    });
    var rels = settings
      .map(function (s) {
        return global.store.getById("member_setting_relation", s.member_setting_credit_id);
      })
      .filter(Boolean);
    var credits = [];
    var groups = [];
    var biz = rels[0] ? String(rels[0].business_id) : "";
    rels.forEach(function (r) {
      if (credits.indexOf(String(r.credit_id)) < 0) credits.push(String(r.credit_id));
      if (groups.indexOf(String(r.group_id)) < 0) groups.push(String(r.group_id));
    });
    var owners = global.store.getAll("member_user_owner").filter(function (r) {
      return r.member_user_id === memberId;
    });
    var tax = addressByType("tax") || {};
    var fin = addressByType("financial") || {};
    var doc = addressByType("doc") || {};
    draft = {
      system_file_id: row.system_file_id,
      business_id: biz,
      credit_ids: credits,
      group_ids: groups,
      member_tier_id: row.member_tier_id ? String(row.member_tier_id) : "",
      admin_user_ids: owners.map(function (o) {
        return String(o.admin_user_id);
      }),
      is_active: !!row.is_active,
      note: row.note || "",
      info: {
        type: row.type || "person",
        setting_prefix_id: row.setting_prefix_id ? String(row.setting_prefix_id) : "",
        name: row.name || "",
        store_name: row.store_name || "",
        tax_number: row.tax_number || "",
        branch: row.branch || "",
        branch_name: row.branch_name || "",
        address: row.address || "",
        website_province_id: row.website_province_id ? String(row.website_province_id) : "",
        website_district_id: row.website_district_id ? String(row.website_district_id) : "",
        website_sub_district_id: row.website_sub_district_id ? String(row.website_sub_district_id) : "",
        postcode: row.postcode || "",
        tel: row.tel || "",
        email: row.email || "",
      },
      tax: {
        type: tax.member_type || "person",
        setting_prefix_id: tax.setting_prefix_id ? String(tax.setting_prefix_id) : "",
        name: tax.name || "",
        store_name: tax.store_name || "",
        tax_number: tax.tax_number || "",
        branch: tax.branch || "",
        branch_name: tax.branch_name || "",
        address: tax.address || "",
        website_province_id: tax.website_province_id ? String(tax.website_province_id) : "",
        website_district_id: tax.website_district_id ? String(tax.website_district_id) : "",
        website_sub_district_id: tax.website_sub_district_id ? String(tax.website_sub_district_id) : "",
        postcode: tax.postcode || "",
        tel: tax.tel || "",
        email: tax.email || "",
        is_same_information: !!tax.is_same_information,
      },
      financial: {
        name: fin.name || "",
        address: fin.address || "",
        website_province_id: fin.website_province_id ? String(fin.website_province_id) : "",
        website_district_id: fin.website_district_id ? String(fin.website_district_id) : "",
        website_sub_district_id: fin.website_sub_district_id ? String(fin.website_sub_district_id) : "",
        postcode: fin.postcode || "",
        tel: fin.tel || "",
        credit_limit: fin.credit_limit != null ? String(fin.credit_limit) : "",
        credit_date: fin.credit_date != null ? String(fin.credit_date) : "",
        relationship: fin.relationship || "",
      },
      document: {
        is_same_information: !!doc.is_same_information,
        name: doc.name || "",
        address: doc.address || "",
        website_province_id: doc.website_province_id ? String(doc.website_province_id) : "",
        website_district_id: doc.website_district_id ? String(doc.website_district_id) : "",
        website_sub_district_id: doc.website_sub_district_id ? String(doc.website_sub_district_id) : "",
        postcode: doc.postcode || "",
        tel: doc.tel || "",
        email: doc.email || "",
      },
    };
    return true;
  }

  function draftGeoTarget(prefix) {
    if (prefix === "info") return draft.info;
    if (prefix === "tax") return draft.tax;
    if (prefix === "fin") return draft.financial;
    if (prefix === "doc") return draft.document;
    return null;
  }

  function handleSearchSelectCascade(hiddenId) {
    if (hiddenId === "mu-business") {
      collectDraft();
      draft.credit_ids = [];
      draft.group_ids = [];
      render();
      return;
    }
    if (/_province_id$/.test(hiddenId)) {
      collectDraft();
      var prefixP = hiddenId.replace(/_province_id$/, "");
      var tP = draftGeoTarget(prefixP);
      if (tP) {
        tP.website_district_id = "";
        tP.website_sub_district_id = "";
        tP.postcode = "";
      }
      render();
      return;
    }
    if (/_district_id$/.test(hiddenId)) {
      collectDraft();
      var prefixD = hiddenId.replace(/_district_id$/, "");
      var tD = draftGeoTarget(prefixD);
      if (tD) {
        tD.website_sub_district_id = "";
        tD.postcode = "";
      }
      render();
      return;
    }
    if (/_sub_district_id$/.test(hiddenId)) {
      collectDraft();
      var prefixS = hiddenId.replace(/_sub_district_id$/, "");
      var tS = draftGeoTarget(prefixS);
      if (tS && tS.website_sub_district_id) {
        var row = global.store.getById("system_sub_district", Number(tS.website_sub_district_id));
        if (row && row.postcode) tS.postcode = row.postcode;
      }
      render();
    }
  }

  function closeAllSearchPanels(form) {
    form.querySelectorAll(".form-search-select__panel").forEach(function (p) {
      p.hidden = true;
    });
    form.querySelectorAll(".form-search-select__trigger").forEach(function (tr) {
      tr.setAttribute("aria-expanded", "false");
    });
  }

  function bindFormSearchSelects(form) {
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
        closeAllSearchPanels(form);
        if (willOpen) {
          panel.hidden = false;
          trigger.setAttribute("aria-expanded", "true");
          if (search) {
            search.value = "";
            list.querySelectorAll(".form-search-select__option").forEach(function (opt) {
              opt.hidden = false;
            });
            search.focus();
          }
        }
      });

      if (search) {
        search.addEventListener("click", function (e) {
          e.stopPropagation();
        });
        search.addEventListener("input", function () {
          var q = search.value.trim().toLowerCase();
          list.querySelectorAll(".form-search-select__option").forEach(function (opt) {
            opt.hidden = !!(q && (opt.textContent || "").toLowerCase().indexOf(q) < 0);
          });
        });
      }

      list.querySelectorAll(".form-search-select__option").forEach(function (opt) {
        opt.addEventListener("click", function () {
          hidden.value = opt.getAttribute("data-value") || "";
          if (labelEl) labelEl.textContent = opt.textContent || "";
          list.querySelectorAll(".form-search-select__option").forEach(function (o) {
            o.classList.toggle("form-search-select__option--selected", o === opt);
          });
          panel.hidden = true;
          trigger.setAttribute("aria-expanded", "false");
          clearFieldError(wrap);
          handleSearchSelectCascade(hidden.id);
        });
      });
    });

    if (!form._formSearchSelectCloseBound) {
      form._formSearchSelectCloseBound = true;
      form.addEventListener("click", function () {
        closeAllSearchPanels(form);
      });
    }
  }

  function bindTypeChange(prefix) {
    document.querySelectorAll('input[name="' + prefix + '_type"]').forEach(function (r) {
      r.addEventListener("change", function () {
        collectDraft();
        render();
      });
    });
    document.querySelectorAll('input[name="' + prefix + '_branch"]').forEach(function (r) {
      r.addEventListener("change", function () {
        var bn = document.getElementById(prefix + "_branch_name");
        if (!bn) return;
        bn.disabled = r.value !== "branch";
        if (r.value !== "branch") bn.value = "";
      });
    });
  }

  function bindAvatar() {
    var input = document.getElementById("mu-avatar-file");
    if (!input) return;
    input.addEventListener("change", function () {
      var file = input.files && input.files[0];
      input.value = "";
      if (!file) return;
      if (!/^image\//.test(file.type || "")) {
        global.toast.show(t("memberUser.errorImageType"), "error");
        return;
      }
      if (file.size > AVATAR_MAX) {
        global.toast.show(t("memberUser.errorImageSize"), "error");
        return;
      }
      var reader = new FileReader();
      reader.onload = function () {
        var id = global.store.nextId("system_file");
        var safe = String(file.name || "avatar").replace(/[^\w.\-]+/g, "_");
        var row = global.store.create("system_file", {
          id: id,
          bucket: "warehouse-design-mock",
          object_key: "design/member_avatar/" + id + "/" + safe,
          content_type: file.type || "image/png",
          size_bytes: file.size || 0,
          purpose: AVATAR_PURPOSE,
          original_name: safe,
          created_at: now(),
          updated_at: now(),
          deleted_at: null,
          created_by: actorId(),
          updated_by: actorId(),
        });
        setFilePreview(row.id, reader.result);
        draft.system_file_id = row.id;
        render();
      };
      reader.readAsDataURL(file);
    });
    var clear = document.getElementById("mu-avatar-clear");
    if (clear) {
      clear.addEventListener("click", function () {
        draft.system_file_id = null;
        render();
      });
    }
  }

  function bindChips(root) {
    if (!global.chipMultiSelect) return;
    ["mu-credits", "mu-groups", "mu-admins"].forEach(function (id) {
      var el = root.querySelector("#" + id);
      if (!el) return;
      global.chipMultiSelect.bind(root, id, {
        onChange: function () {
          if (id === "mu-credits") {
            collectDraft();
            draft.group_ids = [];
            render();
          } else if (id === "mu-groups") {
            collectDraft();
          }
        },
      });
    });
  }

  function bindCopy() {
    document.querySelectorAll(".member-user-sku__copy").forEach(function (btn) {
      btn.addEventListener("click", function () {
        var sku = btn.getAttribute("data-sku") || "";
        if (!sku || !navigator.clipboard) return;
        navigator.clipboard.writeText(sku).then(function () {
          global.toast.show(t("memberUser.copied"), "success");
        });
      });
    });
  }

  function openOverlay(kind, html) {
    if (!overlay) {
      overlay = document.createElement("div");
      overlay.className = "modal-overlay member-user-form-modal supplier-form";
      overlay.hidden = true;
      document.body.appendChild(overlay);
      overlay.addEventListener("click", function (e) {
        if (e.target === overlay) closeOverlay();
      });
    }
    overlayKind = kind;
    overlay.innerHTML = html;
    overlay.hidden = false;
    document.body.classList.add("modal-open");
    if (global.i18n) global.i18n.init();
    bindOverlay();
  }

  function closeOverlay() {
    overlayKind = null;
    if (overlay) overlay.hidden = true;
    document.body.classList.remove("modal-open");
  }

  function staffDialogHtml() {
    var opts = adminOptions()
      .map(function (o) {
        var on = draft.admin_user_ids.map(String).indexOf(String(o.value)) >= 0;
        return (
          '<label class="form-field form-field--switch"><span>' +
          escapeHtml(o.label) +
          '</span><input type="checkbox" class="mu-staff-opt" value="' +
          o.value +
          '"' +
          (on ? " checked" : "") +
          " /></label>"
        );
      })
      .join("");
    return (
      '<div class="modal" role="dialog"><div class="modal__header"><h2 class="modal__title" data-i18n="memberUser.adminUsers"></h2>' +
      '<button type="button" class="modal__close" id="mu-ov-close"><img src="../assets/icons/x.svg" alt="" width="18" height="18" /></button></div>' +
      '<div class="modal__content">' +
      opts +
      '</div><div class="modal__footer"><button type="button" class="btn" id="mu-ov-cancel" data-i18n="crud.cancel"></button>' +
      '<button type="button" class="btn btn--primary" id="mu-staff-ok" data-i18n="memberUser.confirm"></button></div></div>'
    );
  }

  function noteDialogHtml() {
    return (
      '<div class="modal" role="dialog"><div class="modal__header"><h2 class="modal__title" data-i18n="col.note"></h2>' +
      '<button type="button" class="modal__close" id="mu-ov-close"><img src="../assets/icons/x.svg" alt="" width="18" height="18" /></button></div>' +
      '<div class="modal__content">' +
      textareaField("col.note", "mu-note-dialog", draft.note, 6) +
      '</div><div class="modal__footer"><button type="button" class="btn" id="mu-ov-cancel" data-i18n="crud.cancel"></button>' +
      '<button type="button" class="btn btn--primary" id="mu-note-ok" data-i18n="crud.save"></button></div></div>'
    );
  }

  function historyDialogHtml() {
    var items = historyItems();
    var list =
      items.length === 0
        ? '<p data-i18n="memberUser.emptyData"></p>'
        : '<ul class="member-user-activity">' +
          items
            .map(function (h) {
              return (
                "<li><strong>" +
                escapeHtml(historyTitle(h.id)) +
                "</strong><div>" +
                escapeHtml(historyDesc(h.id)) +
                '</div><span class="member-user-activity__time">' +
                escapeHtml(global.i18n.formatDateTime(h.created_at)) +
                "</span></li>"
              );
            })
            .join("") +
          "</ul>";
    return (
      '<div class="modal" role="dialog"><div class="modal__header"><h2 class="modal__title" data-i18n="memberUser.historyTitle"></h2>' +
      '<button type="button" class="modal__close" id="mu-ov-close"><img src="../assets/icons/x.svg" alt="" width="18" height="18" /></button></div>' +
      '<div class="modal__content">' +
      list +
      '</div><div class="modal__footer"><button type="button" class="btn btn--primary" id="mu-ov-cancel" data-i18n="modal.ok"></button></div></div>'
    );
  }

  function pickerFilteredItems() {
    var q = pickerQuery.trim().toLowerCase();
    return lib.activeRows("product_item").filter(function (r) {
      if (!r.is_active) return false;
      if (pickerBrandId && itemBrandId(r.id) !== Number(pickerBrandId)) return false;
      if (!q) return true;
      return (
        String(r.sku || "").toLowerCase().indexOf(q) >= 0 ||
        productName(r.id).toLowerCase().indexOf(q) >= 0 ||
        itemBrandName(r.id).toLowerCase().indexOf(q) >= 0
      );
    });
  }

  function syncPickerSelectionFromDom() {
    if (!overlay) return;
    overlay.querySelectorAll(".mu-pick-item").forEach(function (c) {
      var id = Number(c.getAttribute("data-id"));
      if (c.checked) pickerSelected[id] = true;
      else delete pickerSelected[id];
    });
  }

  function refreshPickerOverlay() {
    syncPickerSelectionFromDom();
    overlay.innerHTML = pickerDialogHtml();
    if (global.i18n) global.i18n.init();
    bindOverlay();
    var s = overlay.querySelector("#mu-pick-search");
    if (s) {
      s.focus();
      s.setSelectionRange(s.value.length, s.value.length);
    }
  }

  function pickerDialogHtml() {
    var items = pickerFilteredItems();
    items.sort(function (a, b) {
      return a.id - b.id;
    });
    var sliced = paginateRows(items, pickerPage, pickerPageSize);
    pickerPage = sliced.meta.page;
    var pageIds = sliced.rows.map(function (r) {
      return r.id;
    });
    var allPageSelected =
      pageIds.length > 0 &&
      pageIds.every(function (id) {
        return !!pickerSelected[id];
      });
    var rows = sliced.rows
      .map(function (r) {
        var on = !!pickerSelected[r.id];
        return (
          '<tr><td class="data-table__col-center"><input type="checkbox" class="mu-pick-item" data-id="' +
          r.id +
          '"' +
          (on ? " checked" : "") +
          ' /></td><td>' +
          escapeHtml(productName(r.id)) +
          "</td><td>" +
          escapeHtml(itemBrandName(r.id)) +
          "</td><td>" +
          escapeHtml(r.sku || "") +
          '</td><td class="data-table__col-numeric">0</td></tr>'
        );
      })
      .join("");
    var searchPh = t("search.placeholder");
    return (
      '<div class="modal crud-modal crud-modal--wide member-user-picker-modal" role="dialog"><div class="modal__header"><h2 class="modal__title" data-i18n="memberUser.pickProduct"></h2>' +
      '<button type="button" class="modal__close" id="mu-ov-close"><img src="../assets/icons/x.svg" alt="" width="18" height="18" /></button></div>' +
      '<div class="modal__content">' +
      '<div class="member-user-picker-filters">' +
      '<select id="mu-pick-brand" class="crud-toolbar__select" aria-label="' +
      escapeAttr(t("col.brand")) +
      '">' +
      brandFilterOptions(pickerBrandId) +
      '</select><input type="search" id="mu-pick-search" class="crud-toolbar__search" data-i18n-placeholder="search.placeholder" placeholder="' +
      escapeAttr(searchPh) +
      '" value="' +
      escapeHtml(pickerQuery) +
      '" /></div>' +
      '<p class="supplier-form__hint">' +
      escapeHtml(t("memberUser.selectedCount", { count: Object.keys(pickerSelected).length })) +
      '</p><div class="member-user-picker-table"><table class="data-table"><thead><tr><th class="data-table__col-center"><input type="checkbox" id="mu-pick-all" aria-label="' +
      escapeAttr(t("rolePerm.selectAll")) +
      '"' +
      (allPageSelected ? " checked" : "") +
      ' /></th><th data-i18n="memberUser.productName"></th><th data-i18n="col.brand"></th><th data-i18n="memberUser.productSku"></th><th class="data-table__col-numeric" data-i18n="memberUser.purchaseAmount"></th></tr></thead><tbody>' +
      (rows || '<tr><td colspan="5" class="crud-empty" data-i18n="crud.empty"></td></tr>') +
      '</tbody></table></div><div id="mu-pick-pagination" class="crud-pagination"></div></div>' +
      '<div class="modal__footer"><button type="button" class="btn" id="mu-ov-cancel" data-i18n="crud.cancel"></button>' +
      '<button type="button" class="btn btn--primary" id="mu-pick-ok" data-i18n="memberUser.confirm"></button></div></div>'
    );
  }

  function discEditHtml(row) {
    row = row || {};
    return (
      '<div class="modal" role="dialog"><div class="modal__header"><h2 class="modal__title" data-i18n="memberTier.discount"></h2>' +
      '<button type="button" class="modal__close" id="mu-ov-close"><img src="../assets/icons/x.svg" alt="" width="18" height="18" /></button></div>' +
      '<div class="modal__content">' +
      '<input type="hidden" id="mu-disc-id" value="' +
      escapeHtml(row.id != null ? String(row.id) : "") +
      '" />' +
      textField("memberUser.minQty", "mu-disc-min", row.minimum_qty != null ? String(row.minimum_qty) : "0", false, "number") +
      '<div class="form-field"><label for="mu-disc-val"><span data-i18n="memberTier.discount"></span></label>' +
      '<div class="member-user-discount-inline">' +
      '<input type="number" id="mu-disc-val" min="0" step="0.01" value="' +
      escapeAttr(row.discount != null ? String(row.discount) : "0") +
      '" data-i18n-placeholder-input="memberTier.discount" placeholder="" />' +
      '<span class="member-user-discount-inline__pct" aria-hidden="true">%</span></div></div>' +
      textField("memberUser.startDate", "mu-disc-start", row.date_start || "", false, "date") +
      textField("memberUser.endDate", "mu-disc-end", row.date_end || "", false, "date") +
      '</div><div class="modal__footer"><button type="button" class="btn" id="mu-ov-cancel" data-i18n="crud.cancel"></button>' +
      '<button type="button" class="btn btn--primary" id="mu-disc-ok" data-i18n="crud.save"></button></div></div>'
    );
  }

  function bindOverlay() {
    var closeBtn = overlay.querySelector("#mu-ov-close");
    var cancel = overlay.querySelector("#mu-ov-cancel");
    if (closeBtn) closeBtn.addEventListener("click", closeOverlay);
    if (cancel) cancel.addEventListener("click", closeOverlay);
    var staffOk = overlay.querySelector("#mu-staff-ok");
    if (staffOk) {
      staffOk.addEventListener("click", function () {
        draft.admin_user_ids = [];
        overlay.querySelectorAll(".mu-staff-opt:checked").forEach(function (c) {
          draft.admin_user_ids.push(c.value);
        });
        closeOverlay();
        render();
      });
    }
    var noteOk = overlay.querySelector("#mu-note-ok");
    if (noteOk) {
      noteOk.addEventListener("click", function () {
        draft.note = val("mu-note-dialog");
        closeOverlay();
        render();
      });
    }
    var pickSearch = overlay.querySelector("#mu-pick-search");
    if (pickSearch) {
      pickSearch.addEventListener("input", function () {
        pickerQuery = pickSearch.value;
        pickerPage = 1;
        refreshPickerOverlay();
      });
    }
    var pickBrand = overlay.querySelector("#mu-pick-brand");
    if (pickBrand) {
      pickBrand.addEventListener("change", function () {
        pickerBrandId = pickBrand.value;
        pickerPage = 1;
        refreshPickerOverlay();
      });
    }
    function updatePickerSelectedHint() {
      var hint = overlay.querySelector(".supplier-form__hint");
      if (hint) {
        hint.textContent = t("memberUser.selectedCount", { count: Object.keys(pickerSelected).length });
      }
    }
    function syncPickerPickAllHeader() {
      var pickAll = overlay.querySelector("#mu-pick-all");
      if (!pickAll) return;
      var boxes = overlay.querySelectorAll(".mu-pick-item");
      if (!boxes.length) {
        pickAll.checked = false;
        return;
      }
      var checked = 0;
      boxes.forEach(function (c) {
        if (c.checked) checked += 1;
      });
      pickAll.checked = checked === boxes.length;
    }
    var pickAll = overlay.querySelector("#mu-pick-all");
    if (pickAll) {
      pickAll.addEventListener("change", function () {
        overlay.querySelectorAll(".mu-pick-item").forEach(function (c) {
          c.checked = pickAll.checked;
          var id = Number(c.getAttribute("data-id"));
          if (c.checked) pickerSelected[id] = true;
          else delete pickerSelected[id];
        });
        updatePickerSelectedHint();
      });
    }
    overlay.querySelectorAll(".mu-pick-item").forEach(function (c) {
      c.addEventListener("change", function () {
        var id = Number(c.getAttribute("data-id"));
        if (c.checked) pickerSelected[id] = true;
        else delete pickerSelected[id];
        updatePickerSelectedHint();
        syncPickerPickAllHeader();
      });
    });
    var pickPager = overlay.querySelector("#mu-pick-pagination");
    if (pickPager && global.crudList && global.crudList.renderPaginationBar) {
      var pickItems = pickerFilteredItems();
      var pickMeta = paginateRows(pickItems, pickerPage, pickerPageSize).meta;
      global.crudList.renderPaginationBar(
        pickPager,
        { page: pickMeta.page, pageSize: pickerPageSize },
        pickMeta,
        function (patch) {
          syncPickerSelectionFromDom();
          if (patch.pageSize != null) pickerPageSize = patch.pageSize;
          if (patch.page != null) pickerPage = patch.page;
          refreshPickerOverlay();
        }
      );
    }
    var pickOk = overlay.querySelector("#mu-pick-ok");
    if (pickOk) {
      pickOk.addEventListener("click", function () {
        syncPickerSelectionFromDom();
        var credits = memberDiscountCreditIds();
        if (!credits.length) {
          global.toast.show(t("memberUser.noCredits"), "info");
          return;
        }
        var added = 0;
        Object.keys(pickerSelected).forEach(function (id) {
          var pid = Number(id);
          credits.forEach(function (creditId) {
            var existing = findMemberDiscountRowForCredit(pid, creditId);
            if (existing) {
              pushBulkDiscountRowId(existing.id);
              added += 1;
              return;
            }
            var created = global.store.create("member_user_discount", {
              member_user_id: memberId,
              member_credit_id: n(creditId),
              product_item_id: pid,
              minimum_qty: 1,
              discount: 0,
              discount_type: "percent",
              date_start: todayIso(),
              date_end: null,
              is_active: true,
              created_at: now(),
              updated_at: now(),
              deleted_at: null,
              created_by: actorId(),
              updated_by: actorId(),
            });
            pushBulkDiscountRowId(created.id);
            added += 1;
          });
        });
        pickerSelected = {};
        pickerQuery = "";
        pickerBrandId = "";
        pickerPage = 1;
        closeOverlay();
        discountTab = "bulk";
        discountPage = 1;
        if (added) global.toast.show(t("crud.created"), "success");
        render();
      });
    }
    var discOk = overlay.querySelector("#mu-disc-ok");
    if (discOk) {
      discOk.addEventListener("click", function () {
        var id = Number(val("mu-disc-id"));
        global.store.update("member_user_discount", id, {
          minimum_qty: numOrNull("mu-disc-min") || 0,
          discount: numOrNull("mu-disc-val") || 0,
          discount_type: "percent",
          date_start: val("mu-disc-start") || null,
          date_end: val("mu-disc-end") || null,
          updated_at: now(),
          updated_by: actorId(),
        });
        closeOverlay();
        render();
      });
    }
    bindFormSearchSelects(overlay);
  }

  function ensureConfirm() {
    if (confirmOverlay) return;
    confirmOverlay = document.createElement("div");
    confirmOverlay.className = "modal-overlay";
    confirmOverlay.hidden = true;
    confirmOverlay.innerHTML =
      '<div class="modal" role="dialog"><div class="modal__header"><h2 class="modal__title" data-i18n="crud.delete"></h2>' +
      '<button type="button" class="modal__close" id="mu-c-close"><img src="../assets/icons/x.svg" alt="" width="18" height="18" /></button></div>' +
      '<div class="modal__content"><p class="modal__body" data-i18n="crud.confirmDelete"></p></div>' +
      '<div class="modal__footer"><button type="button" class="btn" id="mu-c-cancel" data-i18n="crud.cancel"></button>' +
      '<button type="button" class="btn btn--primary" id="mu-c-ok" data-i18n="crud.delete"></button></div></div>';
    document.body.appendChild(confirmOverlay);
    confirmOverlay.querySelector("#mu-c-close").addEventListener("click", closeConfirm);
    confirmOverlay.querySelector("#mu-c-cancel").addEventListener("click", closeConfirm);
    confirmOverlay.querySelector("#mu-c-ok").addEventListener("click", function () {
      if (confirmFn) confirmFn();
      closeConfirm();
    });
  }

  function openConfirm(fn) {
    ensureConfirm();
    confirmFn = fn;
    if (global.i18n) global.i18n.init();
    confirmOverlay.hidden = false;
    document.body.classList.add("modal-open");
  }

  function closeConfirm() {
    confirmFn = null;
    if (confirmOverlay) confirmOverlay.hidden = true;
    document.body.classList.remove("modal-open");
  }

  function seedBulkDraftFromStore(discId) {
    var row = global.store.getById("member_user_discount", discId);
    if (!row) return;
    bulkDraft[discId] = {
      minimum_qty: row.minimum_qty != null ? String(row.minimum_qty) : "0",
      discount: row.discount != null ? String(row.discount) : "0",
      discount_type: "percent",
      date_start: row.date_start || "",
      date_end: row.date_end || "",
    };
  }

  function updateBulkSpecialCell(root, discId) {
    var row = global.store.getById("member_user_discount", discId);
    if (!row) return;
    if (!bulkDraft[discId]) seedBulkDraftFromStore(discId);
    var d = bulkDraft[discId];
    var item = global.store.getById("product_item", row.product_item_id) || {};
    var cell = root.querySelector('.mu-disc-special[data-id="' + discId + '"]');
    if (cell) cell.textContent = formatMoney(calcSpecial(item.price || 0, d.discount, "percent"));
  }

  function saveBulkDiscountRow(discId) {
    var row = global.store.getById("member_user_discount", discId);
    if (!row) return;
    var d = bulkDraft[discId] || bulkRowDraft(row);
    global.store.update("member_user_discount", discId, {
      minimum_qty: Number(d.minimum_qty) || 0,
      discount: Number(d.discount) || 0,
      discount_type: "percent",
      date_start: d.date_start || null,
      date_end: d.date_end || null,
      updated_at: now(),
      updated_by: actorId(),
    });
    delete bulkDraft[discId];
    global.toast.show(t("crud.saved"), "success");
    render();
  }

  function bindDiscountSection(root) {
    var discSearch = root.querySelector("#mu-disc-search");
    if (discSearch) {
      discSearch.addEventListener("input", function () {
        discountQuery = discSearch.value;
        discountPage = 1;
        render();
      });
    }
    var discBrand = root.querySelector("#mu-disc-brand");
    if (discBrand) {
      discBrand.addEventListener("change", function () {
        discountBrandId = discBrand.value;
        discountPage = 1;
        render();
      });
    }
    var discDate = root.querySelector("#mu-disc-date");
    if (discDate) {
      var wrap = discDate.closest(".crud-toolbar__date-wrap");
      function syncDateWrap() {
        if (wrap) wrap.classList.toggle("has-value", !!discDate.value);
      }
      syncDateWrap();
      discDate.addEventListener("change", function () {
        discountDate = discDate.value;
        syncDateWrap();
        discountPage = 1;
        render();
      });
    }
    var discImp = root.querySelector("#mu-disc-import");
    if (discImp) {
      discImp.addEventListener("click", function () {
        global.toast.show(t("crud.importComingSoon"), "info");
      });
    }
    var discExp = root.querySelector("#mu-disc-export");
    if (discExp) {
      discExp.addEventListener("click", function () {
        global.toast.show(t("crud.exportComingSoon"), "info");
      });
    }
    root.querySelectorAll("#mu-orders-from, #mu-orders-to").forEach(function (input) {
      function syncOrdersDateWrap() {
        var wrap = input.closest(".crud-toolbar__date-wrap");
        if (wrap) wrap.classList.toggle("has-value", !!input.value);
      }
      syncOrdersDateWrap();
      input.addEventListener("change", function () {
        syncOrdersDateWrap();
        if (input.id === "mu-orders-from") ordersDateFrom = input.value;
        else ordersDateTo = input.value;
        ordersPage = 1;
        render();
      });
    });
    var ordersCat = root.querySelector("#mu-orders-category");
    if (ordersCat) {
      ordersCat.addEventListener("change", function () {
        ordersCategoryId = ordersCat.value;
        ordersPage = 1;
        render();
      });
    }
    var ordersSearch = root.querySelector("#mu-orders-search");
    if (ordersSearch) {
      ordersSearch.addEventListener("input", function () {
        ordersQuery = ordersSearch.value;
        ordersPage = 1;
        render();
      });
    }
    var ordersStatusEl = root.querySelector("#mu-orders-status");
    if (ordersStatusEl) {
      ordersStatusEl.addEventListener("change", function () {
        ordersStatus = ordersStatusEl.value;
        ordersPage = 1;
        render();
      });
    }
    var ordersSortEl = root.querySelector("#mu-orders-sort");
    if (ordersSortEl) {
      ordersSortEl.addEventListener("change", function () {
        ordersSort = ordersSortEl.value;
        ordersPage = 1;
        render();
      });
    }
    var ordersExport = root.querySelector("#mu-orders-export");
    if (ordersExport) {
      ordersExport.addEventListener("click", function () {
        global.toast.show(t("crud.exportComingSoon"), "info");
      });
    }
    root.querySelectorAll(".mu-order-view").forEach(function (btn) {
      btn.addEventListener("click", function () {
        global.toast.show(t("page.comingSoon"), "info");
      });
    });
    var ordersPager = root.querySelector("#mu-orders-pagination");
    if (ordersPager && global.crudList && global.crudList.renderPaginationBar) {
      var orderAll = sortMemberOrderEntries(filterMemberOrderEntries(memberOrderEntries()));
      var orderMeta = paginateRows(orderAll, ordersPage, ordersPageSize).meta;
      global.crudList.renderPaginationBar(
        ordersPager,
        { page: orderMeta.page, pageSize: ordersPageSize },
        orderMeta,
        function (patch) {
          if (patch.pageSize != null) ordersPageSize = patch.pageSize;
          if (patch.page != null) ordersPage = patch.page;
          render();
        }
      );
    }
    var discPager = root.querySelector("#mu-disc-pagination");
    if (discPager && global.crudList && global.crudList.renderPaginationBar) {
      var allRows = filteredDiscountRows();
      var meta = paginateRows(allRows, discountPage, discountPageSize).meta;
      global.crudList.renderPaginationBar(
        discPager,
        { page: meta.page, pageSize: discountPageSize },
        meta,
        function (patch) {
          if (patch.pageSize != null) discountPageSize = patch.pageSize;
          if (patch.page != null) discountPage = patch.page;
          render();
        }
      );
    }
    var addProd = root.querySelector("#mu-add-product");
    if (addProd) {
      addProd.addEventListener("click", function () {
        pickerQuery = "";
        pickerSelected = {};
        pickerBrandId = "";
        pickerPage = 1;
        openOverlay("picker", pickerDialogHtml());
      });
    }
    root.querySelectorAll(".mu-disc-check").forEach(function (c) {
      c.addEventListener("change", function () {
        var id = Number(c.getAttribute("data-id"));
        bulkChecked[id] = c.checked;
      });
    });
    var discAll = root.querySelector("#mu-disc-all");
    if (discAll) {
      discAll.addEventListener("change", function () {
        root.querySelectorAll(".mu-disc-check").forEach(function (c) {
          c.checked = discAll.checked;
          bulkChecked[Number(c.getAttribute("data-id"))] = discAll.checked;
        });
      });
    }
    root.querySelectorAll(".mu-disc-inline").forEach(function (el) {
      function sync() {
        var id = Number(el.getAttribute("data-id"));
        var field = el.getAttribute("data-field");
        if (!bulkDraft[id]) seedBulkDraftFromStore(id);
        bulkDraft[id][field] = el.value;
        bulkDraft[id].discount_type = "percent";
        updateBulkSpecialCell(root, id);
      }
      el.addEventListener("input", sync);
      el.addEventListener("change", sync);
    });
    root.querySelectorAll(".mu-disc-save").forEach(function (btn) {
      btn.addEventListener("click", function () {
        saveBulkDiscountRow(Number(btn.getAttribute("data-id")));
      });
    });
    root.querySelectorAll(".mu-disc-revert").forEach(function (btn) {
      btn.addEventListener("click", function () {
        delete bulkDraft[Number(btn.getAttribute("data-id"))];
        render();
      });
    });
    var applyBulk = root.querySelector("#mu-apply-bulk");
    if (applyBulk) {
      applyBulk.addEventListener("click", function () {
        var minEl = root.querySelector("#mu-bulk-min");
        var discEl = root.querySelector("#mu-bulk-disc");
        var startEl = root.querySelector("#mu-bulk-start");
        var endEl = root.querySelector("#mu-bulk-end");
        var ids = Object.keys(bulkChecked).filter(function (k) {
          return bulkChecked[k];
        });
        if (!ids.length) {
          global.toast.show(t("memberUser.applyBulkNone"), "info");
          return;
        }
        ids.forEach(function (idStr) {
          var id = Number(idStr);
          var patch = {
            updated_at: now(),
            updated_by: actorId(),
            discount_type: "percent",
          };
          if (minEl && minEl.value !== "") patch.minimum_qty = Number(minEl.value) || 0;
          if (discEl && discEl.value !== "") patch.discount = Number(discEl.value) || 0;
          if (startEl && startEl.value) patch.date_start = startEl.value;
          if (endEl && endEl.value) patch.date_end = endEl.value;
          global.store.update("member_user_discount", id, patch);
          delete bulkDraft[id];
          delete bulkChecked[id];
          if (discountTab === "bulk") removeBulkDiscountRowId(id);
        });
        if (discountTab === "bulk") {
          discountTab = "list";
        }
        discountPage = 1;
        global.toast.show(t("crud.updated"), "success");
        render();
      });
    }
    root.querySelectorAll(".mu-disc-edit").forEach(function (btn) {
      btn.addEventListener("click", function () {
        var row = global.store.getById("member_user_discount", Number(btn.getAttribute("data-id")));
        openOverlay("disc", discEditHtml(row));
      });
    });
    root.querySelectorAll(".mu-disc-del").forEach(function (btn) {
      btn.addEventListener("click", function () {
        var id = Number(btn.getAttribute("data-id"));
        openConfirm(function () {
          global.store.update("member_user_discount", id, { deleted_at: now(), updated_at: now() });
          delete bulkDraft[id];
          delete bulkChecked[id];
          removeBulkDiscountRowId(id);
          global.toast.show(t("crud.deleted"), "success");
          render();
        });
      });
    });
  }

  function bind(root) {
    var saveEl = root.querySelector("#mu-save");
    if (saveEl) saveEl.addEventListener("click", save);
    ["info", "tax"].forEach(bindTypeChange);
    bindFormSearchSelects(root);
    if (overlay) bindFormSearchSelects(overlay);
    var taxSame = root.querySelector("#tax_same");
    if (taxSame) {
      taxSame.addEventListener("change", function () {
        collectDraft();
        render();
      });
    }
    var docSame = root.querySelector("#doc_same");
    if (docSame) {
      docSame.addEventListener("change", function () {
        collectDraft();
        render();
      });
    }
    bindAvatar();
    bindChips(root);
    bindCopy();
    if (global.otpInput) {
      root.querySelectorAll("[data-otp-input]").forEach(function (el) {
        global.otpInput.bind(el);
      });
    }
    if (global.telInput) global.telInput.bind(root);
    root.querySelectorAll(".form-field input, .form-field textarea, .form-field select").forEach(function (el) {
      el.addEventListener("input", function () {
        clearFieldError(el.closest(".form-field"));
      });
    });
    root.querySelectorAll(".member-user-tabs__btn").forEach(function (btn) {
      btn.addEventListener("click", function () {
        collectDraft();
        editTab = btn.getAttribute("data-tab");
        render();
      });
    });
    var statusBadge = root.querySelector("#mu-status-badge");
    if (statusBadge && can("update")) {
      statusBadge.addEventListener("click", function () {
        draft.is_active = !draft.is_active;
        global.store.update("member_user", memberId, {
          is_active: draft.is_active,
          updated_at: now(),
          updated_by: actorId(),
        });
        global.toast.show(t("crud.statusChanged"), "success");
        render();
      });
    }
    var staffAdd = root.querySelector("#mu-staff-add");
    if (staffAdd) staffAdd.addEventListener("click", function () {
      openOverlay("staff", staffDialogHtml());
    });
    var noteEdit = root.querySelector("#mu-note-edit");
    if (noteEdit) noteEdit.addEventListener("click", function () {
      openOverlay("note", noteDialogHtml());
    });
    var histAll = root.querySelector("#mu-history-all");
    if (histAll) histAll.addEventListener("click", function () {
      openOverlay("history", historyDialogHtml());
    });
    root.querySelectorAll("[data-dtab]").forEach(function (btn) {
      btn.addEventListener("click", function () {
        collectDraft();
        discountTab = btn.getAttribute("data-dtab");
        discountPage = 1;
        render();
      });
    });
    root.querySelectorAll("[data-credit]").forEach(function (btn) {
      btn.addEventListener("click", function () {
        collectDraft();
        discountCreditId = btn.getAttribute("data-credit");
        discountPage = 1;
        render();
      });
    });
    bindDiscountSection(root);
    var fileInput = root.querySelector("#mu-file-input");
    if (fileInput) {
      fileInput.addEventListener("change", function () {
        var file = fileInput.files && fileInput.files[0];
        fileInput.value = "";
        if (!file) return;
        var allowed = ["application/pdf", "image/jpeg", "image/png"];
        if (allowed.indexOf(file.type) < 0) {
          global.toast.show(t("memberUser.filesUnsupportedType"), "error");
          return;
        }
        if (file.size > DOC_MAX) {
          global.toast.show(t("memberUser.filesTooLarge"), "error");
          return;
        }
        var reader = new FileReader();
        reader.onload = function () {
          var fid = global.store.nextId("system_file");
          var safe = String(file.name || "file").replace(/[^\w.\-]+/g, "_");
          var wf = global.store.create("system_file", {
            id: fid,
            bucket: "warehouse-design-mock",
            object_key: "design/member_document/" + fid + "/" + safe,
            content_type: file.type,
            size_bytes: file.size,
            purpose: DOC_PURPOSE,
            original_name: file.name || safe,
            created_at: now(),
            updated_at: now(),
            deleted_at: null,
            created_by: actorId(),
            updated_by: actorId(),
          });
          setFilePreview(wf.id, reader.result);
          var sort =
            memberFiles().reduce(function (m, r) {
              return Math.max(m, r.sort_order || 0);
            }, 0) + 100;
          global.store.create("member_user_file", {
            member_user_id: memberId,
            system_file_id: wf.id,
            sort_order: sort,
            created_at: now(),
            updated_at: now(),
            deleted_at: null,
            created_by: actorId(),
            updated_by: actorId(),
          });
          global.toast.show(t("crud.created"), "success");
          render();
        };
        reader.readAsDataURL(file);
      });
    }
    root.querySelectorAll(".mu-file-del").forEach(function (btn) {
      btn.addEventListener("click", function () {
        var id = Number(btn.getAttribute("data-id"));
        openConfirm(function () {
          global.store.update("member_user_file", id, { deleted_at: now(), updated_at: now() });
          global.toast.show(t("crud.deleted"), "success");
          render();
        });
      });
    });
  }

  function render() {
    var root = document.getElementById("mu-form-root");
    if (!root) return;
    root.innerHTML = isEdit ? editHtml() : createHtml();
    if (global.i18n) global.i18n.init();
    if (global.permissions) global.permissions.applyActionButtons(root);
    bind(root);
  }

  function boot() {
    global.store.init();
    global.i18n.init();
    if (!global.auth.requireAuth("login.html")) return;
    memberId = queryId();
    isEdit = memberId != null;
    if (isEdit && !can("update") && !can("view")) {
      global.toast.show(t("error.forbidden"), "error");
      window.location.replace("member-user.html");
      return;
    }
    if (!isEdit && !can("create")) {
      global.toast.show(t("error.forbidden"), "error");
      window.location.replace("member-user.html");
      return;
    }
    if (isEdit && !hydrate()) return;
    var titleKey = isEdit ? "page.memberUserEdit" : "page.memberUserCreate";
    global.layout.mount({
      pageTitle: t(titleKey),
      contentHtml: '<div id="mu-form-root"></div>',
    });
    render();
    global.devBar.mount({
      toasts: [
        { type: "success", label: "Saved", msgKey: "crud.saved" },
        { type: "success", label: "Created", msgKey: "crud.created" },
        { type: "success", label: "Updated", msgKey: "crud.updated" },
        { type: "error", label: "Required", msgKey: "error.required" },
      ],
    });
    document.addEventListener("i18n:change", function () {
      collectDraft();
      render();
    });
  }

  global.memberUserFormPage = { boot: boot };
})(window);

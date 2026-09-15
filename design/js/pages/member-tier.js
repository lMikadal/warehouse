(function (global) {
  var lib = global.memberSettingLib;
  var PERM_MODULE = "member";
  var PERM_TYPE = "member_tier";

  var state = {
    query: "",
    page: 1,
    pageSize: 10,
    expanded: {},
    editingTierId: null,
  };

  var relationOverlay = null;
  var confirmOverlay = null;
  var pendingDelete = null;
  var relationEdit = { tierId: null, relationId: null };

  function t(key, params) {
    return lib.t(key, params);
  }

  function can(action) {
    return global.permissions && global.permissions.canAction(PERM_MODULE, PERM_TYPE, action);
  }

  function activeTiers() {
    return lib.activeRows("member_tier");
  }

  function tierName(id, loc) {
    return lib.langName("member_tier_language", "member_tier_id", id, loc);
  }

  function flattenTree(rows) {
    var byParent = {};
    rows.forEach(function (r) {
      var pk = r.parent_id == null ? "root" : String(r.parent_id);
      if (!byParent[pk]) byParent[pk] = [];
      byParent[pk].push(r);
    });
    Object.keys(byParent).forEach(function (k) {
      byParent[k].sort(function (a, b) {
        var so = (Number(a.sort_order) || 0) - (Number(b.sort_order) || 0);
        if (so !== 0) return so;
        return a.id - b.id;
      });
    });
    var out = [];
    function walk(parentKey, depth) {
      (byParent[parentKey] || []).forEach(function (r) {
        out.push({ row: r, depth: depth });
        walk(String(r.id), depth + 1);
      });
    }
    walk("root", 0);
    return out;
  }

  function filteredTierEntries() {
    var q = state.query.trim().toLowerCase();
    var flat = flattenTree(activeTiers());
    if (!q) return flat;
    return flat.filter(function (entry) {
      var th = tierName(entry.row.id, "th").toLowerCase();
      var en = tierName(entry.row.id, "en").toLowerCase();
      return th.indexOf(q) >= 0 || en.indexOf(q) >= 0;
    });
  }

  function paginate(entries) {
    var total = entries.length;
    var totalPages = Math.max(1, Math.ceil(total / state.pageSize) || 1);
    if (state.page > totalPages) state.page = totalPages;
    if (state.page < 1) state.page = 1;
    var start = (state.page - 1) * state.pageSize;
    return {
      entries: entries.slice(start, start + state.pageSize),
      total: total,
      totalPages: totalPages,
    };
  }

  function memberCount(tierId) {
    return lib.activeRows("member_user").filter(function (u) {
      return u.member_tier_id === tierId;
    }).length;
  }

  function relationsForTier(tierId) {
    return lib
      .activeRows("member_tier_relation")
      .filter(function (r) {
        return r.member_tier_id === tierId;
      })
      .sort(function (a, b) {
        var ca = a.created_at || "";
        var cb = b.created_at || "";
        if (ca !== cb) return ca < cb ? -1 : 1;
        return a.id - b.id;
      });
  }

  function settingRelationLabel(settingRelId) {
    var sr = global.store.getById("member_setting_relation", settingRelId);
    if (!sr) return "—";
    return lib.comboLabel(sr.business_id, sr.credit_id, sr.group_id) || "—";
  }

  function attrIdsForTier(tierId) {
    return global.store
      .getAll("member_tier_attribute")
      .filter(function (a) {
        return a.member_tier_id === tierId;
      })
      .map(function (a) {
        return a.product_attribute_id;
      });
  }

  function attrIdsForRelation(relationId) {
    return global.store
      .getAll("member_tier_relation_attribute")
      .filter(function (a) {
        return a.member_tier_relation_id === relationId;
      })
      .map(function (a) {
        return a.product_attribute_id;
      });
  }

  function productAttrName(attrId) {
    return lib.langName("product_attribute_language", "product_attribute_id", attrId);
  }

  function productAttrOptions(scopeType) {
    var wantBrand =
      scopeType === "brand" || scopeType === "except_brand";
    var wantCat =
      scopeType === "category" || scopeType === "except_category";
    return lib
      .activeRows("product_attribute")
      .filter(function (a) {
        if (!a.is_active) return false;
        if (wantBrand && a.type === "brand") return true;
        if (wantCat && a.type === "category") return true;
        return false;
      })
      .sort(function (a, b) {
        var so = (a.sort_order || 0) - (b.sort_order || 0);
        if (so !== 0) return so;
        return a.id - b.id;
      })
      .map(function (a) {
        return { value: a.id, label: productAttrName(a.id) || String(a.id) };
      });
  }

  function scopeSummary(type, attrIds) {
    if (type === "all") return t("memberTier.scopeAll");
    var key =
      type === "brand"
        ? "memberTier.scopeBrand"
        : type === "category"
          ? "memberTier.scopeCategory"
          : type === "except_brand"
            ? "memberTier.scopeExceptBrand"
            : "memberTier.scopeExceptCategory";
    var base = t(key);
    if (!attrIds || !attrIds.length) return base;
    return base + " (" + attrIds.length + ")";
  }

  function scopeRelationDetail(type, attrIds) {
    var n = attrIds && attrIds.length ? attrIds.length : 0;
    if (type === "all") return { kind: "all", text: t("memberTier.countAllProducts") };
    var key =
      type === "brand"
        ? "memberTier.relBrandCount"
        : type === "category"
          ? "memberTier.relCategoryCount"
          : type === "except_brand"
            ? "memberTier.relExceptBrandCount"
            : "memberTier.relExceptCategoryCount";
    return { kind: "text", text: t(key, { count: n }) };
  }

  function formatPurchaseRangeLabel(rel) {
    return (
      formatBaht(rel.purchase_start) +
      "–" +
      formatBaht(rel.purchase_end) +
      " " +
      t("memberTier.bahtUnit")
    );
  }

  function relationProfileCellHtml(settingRelId) {
    var sr = global.store.getById("member_setting_relation", settingRelId);
    if (!sr) return '<span class="member-tier-rel-row__muted">—</span>';
    var business = lib.businessName(sr.business_id);
    var credit = lib.creditName(sr.credit_id);
    var group = lib.groupName(sr.group_id);
    var title = lib.escapeHtml(business || "—");
    if (group && group !== business) {
      title = lib.escapeHtml(business + group);
    }
    var creditBadge = credit
      ? '<span class="member-tier-rel-row__credit-badge">' + lib.escapeHtml(credit) + "</span>"
      : "";
    return (
      '<div class="member-tier-rel-row__profile">' +
      '<span class="member-tier-rel-row__business">' +
      title +
      "</span>" +
      creditBadge +
      "</div>"
    );
  }

  function relationCheckLine(text) {
    return (
      '<span class="member-tier-rel-row__check-line">' +
      '<img class="member-tier-rel-row__check-icon" src="../assets/icons/circle-check.svg" alt="" width="14" height="14" />' +
      lib.escapeHtml(text) +
      "</span>"
    );
  }

  function relationScopeCellHtml(type, attrIds) {
    var detail = scopeRelationDetail(type, attrIds);
    if (detail.kind === "all") {
      return relationCheckLine(detail.text);
    }
    return '<span class="member-tier-rel-row__scope-text">' + lib.escapeHtml(detail.text) + "</span>";
  }

  function relationDiscountCellHtml(rel) {
    var v = Number(rel.discount);
    if (Number.isNaN(v)) v = 0;
    var badge =
      rel.discount_type === "baht"
        ? lib.escapeHtml(formatBaht(v) + " " + t("memberTier.discountBaht"))
        : lib.escapeHtml(String(v) + "%");
    return (
      '<div class="member-tier-rel-row__discount-col">' +
      '<span class="member-tier-rel-row__discount-label" data-i18n="memberTier.tierDiscount"></span>' +
      '<span class="member-tier-rel-row__discount-badge">' +
      badge +
      "</span></div>"
    );
  }

  function formatBaht(n) {
    var v = Number(n);
    if (Number.isNaN(v)) return "—";
    return v.toLocaleString(undefined, { maximumFractionDigits: 2 });
  }

  function formatDiscount(row) {
    var v = Number(row.discount);
    if (Number.isNaN(v)) return "—";
    if (row.discount_type === "baht") return formatBaht(v) + " " + t("memberTier.discountBaht");
    return String(v) + "%";
  }

  function parentByIdMap() {
    var map = {};
    activeTiers().forEach(function (r) {
      map[r.id] = r.parent_id != null ? r.parent_id : null;
    });
    return map;
  }

  function treePathFor(id, parentId) {
    return global.ADMIN_SEED_SHARED.buildTreePath(id, parentId, parentByIdMap());
  }

  function descendantIds(rootId) {
    var out = {};
    function walk(id) {
      activeTiers().forEach(function (r) {
        if (r.parent_id === id && !out[r.id]) {
          out[r.id] = true;
          walk(r.id);
        }
      });
    }
    walk(rootId);
    return out;
  }

  function nextSortOrder(parentId) {
    var max = 0;
    activeTiers().forEach(function (r) {
      var same =
        (parentId == null && r.parent_id == null) ||
        (parentId != null && r.parent_id === parentId);
      if (same) max = Math.max(max, Number(r.sort_order) || 0);
    });
    return max + 100;
  }

  function syncTierAttributes(tierId, type, ids) {
    var table = "member_tier_attribute";
    var rows = global.store.getAll(table);
    for (var i = rows.length - 1; i >= 0; i--) {
      if (rows[i].member_tier_id === tierId) global.store.deleteAt(table, i);
    }
    if (type === "all") return;
    ids.forEach(function (aid) {
      global.store.create(table, { member_tier_id: tierId, product_attribute_id: Number(aid) });
    });
  }

  function syncRelationAttributes(relationId, type, ids) {
    var table = "member_tier_relation_attribute";
    var rows = global.store.getAll(table);
    for (var i = rows.length - 1; i >= 0; i--) {
      if (rows[i].member_tier_relation_id === relationId) global.store.deleteAt(table, i);
    }
    if (type === "all") return;
    ids.forEach(function (aid) {
      global.store.create(table, {
        member_tier_relation_id: relationId,
        product_attribute_id: Number(aid),
      });
    });
  }

  function comboTaken(tierId, settingRelId, exceptRelationId) {
    return relationsForTier(tierId).some(function (r) {
      return (
        r.member_setting_relation_id === settingRelId &&
        r.id !== exceptRelationId
      );
    });
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

  var TIER_BADGE_ICON = "../assets/icons/medal.svg";
  var TIER_BADGE_PURPOSE = "member_tier_badge";
  var TIER_BADGE_PREVIEW_KEY = "warehouse-design-file-data:";
  var TIER_BADGE_MAX_BYTES = 2 * 1024 * 1024;

  function tierBadgePreviewUrl(websiteFileId) {
    if (!websiteFileId) return null;
    try {
      var cached = sessionStorage.getItem(TIER_BADGE_PREVIEW_KEY + websiteFileId);
      if (cached) return cached;
    } catch (e) {
      /* ignore */
    }
    return null;
  }

  function setTierBadgePreviewData(fileId, dataUrl) {
    try {
      sessionStorage.setItem(TIER_BADGE_PREVIEW_KEY + fileId, dataUrl);
    } catch (e) {
      /* ponytail: sessionStorage quota — preview lost on reload until re-upload */
    }
  }

  function createTierBadgeWebsiteFile(file, dataUrl) {
    var id = global.store.nextId("system_file");
    var safeName = (file && file.name ? String(file.name) : "badge").replace(/[^\w.\-]+/g, "_");
    var row = global.store.create("system_file", {
      id: id,
      bucket: "warehouse-design-mock",
      object_key: "design/member_tier_badge/" + id + "/" + safeName,
      content_type: (file && file.type) || "image/png",
      size_bytes: file && file.size ? file.size : 0,
      purpose: TIER_BADGE_PURPOSE,
      original_name: safeName,
      created_at: lib.now(),
      updated_at: lib.now(),
      deleted_at: null,
      created_by: 1,
      updated_by: 1,
    });
    setTierBadgePreviewData(row.id, dataUrl);
    return row.id;
  }

  function tierBadgeImgMarkup(websiteFileId, width, height, fallbackClass) {
    var preview = tierBadgePreviewUrl(websiteFileId);
    var w = width != null ? width : 22;
    var h = height != null ? height : 22;
    if (preview) {
      return (
        '<img src="' +
        lib.escapeHtml(preview) +
        '" alt="" width="' +
        w +
        '" height="' +
        h +
        '" class="member-tier-badge-img" />'
      );
    }
    var cls = fallbackClass ? ' class="' + lib.escapeHtml(fallbackClass) + '"' : "";
    return (
      '<img src="' +
      TIER_BADGE_ICON +
      '" alt="" width="' +
      w +
      '" height="' +
      h +
      '"' +
      cls +
      " />"
    );
  }

  function tierBadgeUploadHtml(websiteFileId) {
    var fileId = websiteFileId != null ? String(websiteFileId) : "";
    return (
      '<div class="member-tier-badge-upload">' +
      '<label class="member-tier-badge-upload__trigger" for="mt-f-badge-file">' +
      '<span class="member-tier-badge-upload__preview" id="mt-tier-badge-preview">' +
      tierBadgeImgMarkup(websiteFileId, 72, 72, "member-tier-badge-upload__icon") +
      "</span>" +
      '<span class="member-tier-badge-upload__label" data-i18n="memberTier.uploadBadge"></span>' +
      "</label>" +
      '<input type="file" id="mt-f-badge-file" class="visually-hidden" accept="image/png,image/jpeg,image/webp,image/gif" />' +
      '<input type="hidden" id="mt-f-system_file_id" value="' +
      lib.escapeHtml(fileId) +
      '" />' +
      (fileId
        ? '<button type="button" class="btn btn--sm member-tier-badge-upload__clear" id="mt-tier-badge-clear" data-i18n="memberTier.removeBadge"></button>'
        : '<button type="button" class="btn btn--sm member-tier-badge-upload__clear" id="mt-tier-badge-clear" data-i18n="memberTier.removeBadge" hidden></button>') +
      "</div>"
    );
  }

  function parseTierBadgeFileId(form) {
    var el = form.querySelector("#mt-f-system_file_id");
    if (!el || el.value === "") return null;
    var n = Number(el.value);
    return Number.isNaN(n) ? null : n;
  }

  function updateTierBadgePreview(form, fileId) {
    var preview = form.querySelector("#mt-tier-badge-preview");
    if (!preview) return;
    preview.innerHTML = tierBadgeImgMarkup(fileId, 72, 72, "member-tier-badge-upload__icon");
    var hidden = form.querySelector("#mt-f-system_file_id");
    if (hidden) hidden.value = fileId != null ? String(fileId) : "";
    var clearBtn = form.querySelector("#mt-tier-badge-clear");
    if (clearBtn) clearBtn.hidden = fileId == null;
  }

  function bindTierBadgeUpload(form) {
    var fileInput = form.querySelector("#mt-f-badge-file");
    if (!fileInput) return;
    fileInput.addEventListener("change", function () {
      var file = fileInput.files && fileInput.files[0];
      fileInput.value = "";
      if (!file) return;
      if (!/^image\//.test(file.type || "")) {
        global.toast.show(t("memberTier.errorBadgeType"), "error");
        return;
      }
      if (file.size > TIER_BADGE_MAX_BYTES) {
        global.toast.show(t("memberTier.errorBadgeSize"), "error");
        return;
      }
      var reader = new FileReader();
      reader.onload = function () {
        var dataUrl = reader.result;
        if (typeof dataUrl !== "string") return;
        var fileId = createTierBadgeWebsiteFile(file, dataUrl);
        updateTierBadgePreview(form, fileId);
      };
      reader.readAsDataURL(file);
    });
    var clearBtn = form.querySelector("#mt-tier-badge-clear");
    if (clearBtn) {
      clearBtn.addEventListener("click", function () {
        updateTierBadgePreview(form, null);
      });
    }
  }

  function scopeNeedsAttrs(type) {
    return type !== "all";
  }

  function scopeAttrKind(type) {
    if (type === "brand" || type === "except_brand") return "brand";
    if (type === "category" || type === "except_category") return "category";
    return null;
  }

  function chipMs() {
    return global.chipMultiSelect;
  }

  function getChipIds(form, chipId) {
    if (!chipMs()) return [];
    return chipMs()
      .getSelectedIds(form, chipId)
      .map(function (id) {
        return Number(id);
      });
  }

  function profileComboOptionsList(tierId, exceptRelationId) {
    var used = {};
    relationsForTier(tierId).forEach(function (r) {
      if (r.id !== exceptRelationId) used[r.member_setting_relation_id] = true;
    });
    return lib
      .activeRows("member_setting_relation")
      .filter(function (sr) {
        return sr.is_active && !used[sr.id];
      })
      .map(function (sr) {
        return { value: sr.id, label: settingRelationLabel(sr.id) };
      });
  }

  function attrLabelKeyForScope(type) {
    return scopeAttrKind(type) === "category" ? "memberTier.categories" : "memberTier.brands";
  }

  function relationProfileChipHtml(tierId, relationId, rel) {
    if (!chipMs()) return "";
    if (relationId && rel) {
      var sid = rel.member_setting_relation_id;
      return chipMs().fieldHtml({
        id: "mt-rel-profiles",
        labelKey: "memberTier.selectProfile",
        placeholderLabelKey: "memberTier.selectProfile",
        required: true,
        selectedIds: [sid],
        options: [{ value: sid, label: settingRelationLabel(sid) }],
      });
    }
    return chipMs().fieldHtml({
      id: "mt-rel-profiles",
      labelKey: "memberTier.selectProfile",
      placeholderLabelKey: "memberTier.selectProfile",
      required: true,
      selectedIds: [],
      options: profileComboOptionsList(tierId, null),
    });
  }

  function relationAttrChipSlotHtml(scopeType, selectedIds) {
    if (!scopeNeedsAttrs(scopeType)) {
      return '<div id="mt-rel-attrs-slot" hidden></div>';
    }
    if (!chipMs()) return '<div id="mt-rel-attrs-slot" hidden></div>';
    return (
      '<div id="mt-rel-attrs-slot">' +
      chipMs().fieldHtml({
        id: "mt-rel-attrs",
        labelKey: attrLabelKeyForScope(scopeType),
        placeholderLabelKey: attrLabelKeyForScope(scopeType),
        required: false,
        selectedIds: selectedIds || [],
        options: productAttrOptions(scopeType),
      }) +
      "</div>"
    );
  }

  function modalPurchaseRangeHtml(startVal, endVal) {
    var phStart =
      global.i18n && global.i18n.fieldPlaceholder
        ? lib.escapeHtml(global.i18n.fieldPlaceholder("input", "memberTier.purchaseStart"))
        : "";
    var phEnd =
      global.i18n && global.i18n.fieldPlaceholder
        ? lib.escapeHtml(global.i18n.fieldPlaceholder("input", "memberTier.purchaseEnd"))
        : "";
    return (
      '<div class="form-field member-tier-purchase-row">' +
      '<span class="member-tier-purchase-row__label" data-i18n="memberTier.purchaseRangeCumulative"></span>' +
      '<div class="member-tier-purchase-row__inputs">' +
      '<input id="mt-rel-purchase_start" name="mt-rel-purchase_start" type="number" value="' +
      lib.escapeHtml(startVal != null ? String(startVal) : "") +
      '" placeholder="' +
      phStart +
      '" data-i18n-placeholder-input="memberTier.purchaseStart" />' +
      '<span aria-hidden="true">–</span>' +
      '<input id="mt-rel-purchase_end" name="mt-rel-purchase_end" type="number" value="' +
      lib.escapeHtml(endVal != null ? String(endVal) : "") +
      '" placeholder="' +
      phEnd +
      '" data-i18n-placeholder-input="memberTier.purchaseEnd" />' +
      "</div>" +
      '<div class="form-field__error-slot" aria-live="polite"><p class="form-field__error" hidden role="alert"></p></div></div>'
    );
  }

  function modalDiscountPercentHtml(value) {
    var ph =
      global.i18n && global.i18n.fieldPlaceholder
        ? lib.escapeHtml(global.i18n.fieldPlaceholder("input", "memberTier.tierDiscount"))
        : "";
    return (
      '<div class="form-field member-tier-discount-row">' +
      '<label for="mt-rel-discount"><span data-i18n="memberTier.tierDiscount"></span></label>' +
      '<div class="member-tier-discount-row__input">' +
      '<input id="mt-rel-discount" name="mt-rel-discount" type="number" min="0" max="100" value="' +
      lib.escapeHtml(value != null ? String(value) : "") +
      '" placeholder="' +
      ph +
      '" data-i18n-placeholder-input="memberTier.tierDiscount" />' +
      '<span class="member-tier-discount-row__suffix" aria-hidden="true">%</span></div>' +
      '<input type="hidden" id="mt-rel-discount_type" name="discount_type" value="percent" />' +
      '<div class="form-field__error-slot" aria-live="polite"><p class="form-field__error" hidden role="alert"></p></div></div>'
    );
  }

  function parentOptions(excludeId, selectedId) {
    var desc = excludeId ? descendantIds(excludeId) : {};
    var selNone = selectedId == null ? " selected" : "";
    var opts =
      '<option value=""' +
      selNone +
      ">" +
      lib.escapeHtml(t("memberTier.parentNone")) +
      "</option>";
    flattenTree(activeTiers()).forEach(function (entry) {
      var id = entry.row.id;
      if (excludeId && (id === excludeId || desc[id])) return;
      var label = tierName(id) || "#" + id;
      var sel = selectedId === id ? " selected" : "";
      opts +=
        '<option value="' +
        id +
        '"' +
        sel +
        ">" +
        lib.escapeHtml("\u2014".repeat(entry.depth) + (entry.depth ? " " : "") + label) +
        "</option>";
    });
    return opts;
  }

  function formFieldInput(id, labelKey, value, type, required) {
    var ph =
      global.i18n && global.i18n.fieldPlaceholder
        ? lib.escapeHtml(global.i18n.fieldPlaceholder("input", labelKey))
        : "";
    return (
      '<div class="form-field">' +
      '<label for="' +
      id +
      '"><span data-i18n="' +
      lib.escapeHtml(labelKey) +
      '"></span>' +
      (required ? ' <span class="form-field__required" aria-hidden="true">*</span>' : "") +
      "</label>" +
      '<input id="' +
      id +
      '" name="' +
      id +
      '" type="' +
      (type || "text") +
      '" value="' +
      lib.escapeHtml(value != null ? String(value) : "") +
      '" placeholder="' +
      ph +
      '" data-i18n-placeholder-input="' +
      lib.escapeHtml(labelKey) +
      '"' +
      (required ? " required" : "") +
      " />" +
      '<div class="form-field__error-slot" aria-live="polite"><p class="form-field__error" hidden role="alert"></p></div></div>'
    );
  }

  function scopeRadios(name, selected) {
    var types = ["all", "brand", "category", "except_brand", "except_category"];
    var keys = [
      "memberTier.scopeAll",
      "memberTier.scopeBrand",
      "memberTier.scopeCategory",
      "memberTier.scopeExceptBrand",
      "memberTier.scopeExceptCategory",
    ];
    var html = '<div class="member-tier-scope-radios" role="radiogroup">';
    types.forEach(function (type, i) {
      html +=
        '<label><input type="radio" name="' +
        name +
        '" value="' +
        type +
        '"' +
        (selected === type ? " checked" : "") +
        " /><span data-i18n=\"" +
        keys[i] +
        '"></span></label>';
    });
    html += "</div>";
    return html;
  }

  function leftFormHtml() {
    var row = state.editingTierId
      ? global.store.getById("member_tier", state.editingTierId)
      : null;
    var nameTh = row ? tierName(row.id, "th") : "";
    var nameEn = row ? tierName(row.id, "en") : "";
    var canSave = state.editingTierId ? can("update") : can("create");
    var submitLabel = state.editingTierId ? t("crud.edit") : t("crud.create");
    return (
      '<div class="member-tier-split__form">' +
      tierBadgeUploadHtml(row ? row.system_file_id : null) +
      '<h2 class="member-tier-split__section-title" data-i18n="memberTier.formTitle"></h2>' +
      '<form id="mt-tier-form" class="crud-form" novalidate>' +
      '<div class="crud-form__row">' +
      formFieldInput("mt-f-name_th", "col.nameTh", nameTh, "text", true) +
      formFieldInput("mt-f-name_en", "col.nameEn", nameEn, "text", true) +
      "</div>" +
      '<div class="form-field form-field--switch">' +
      '<label for="mt-f-is_active"><span data-i18n="col.active"></span></label>' +
      '<label class="crud-switch"><input type="checkbox" role="switch" id="mt-f-is_active" name="is_active"' +
      (!row || row.is_active ? " checked" : "") +
      ' /><span class="crud-switch__track" aria-hidden="true"><span class="crud-switch__thumb"></span></span></label></div>' +
      '<div class="crud-form__actions">' +
      (canSave
        ? '<button type="submit" class="btn btn--primary">' + lib.escapeHtml(submitLabel) + "</button>"
        : "") +
      (state.editingTierId
        ? ' <button type="button" class="btn" id="mt-form-cancel" data-i18n="crud.cancel"></button>'
        : "") +
      "</div></form></div>"
    );
  }

  function relationRowsHtml(tierId) {
    var rels = relationsForTier(tierId);
    if (rels.length === 0) {
      return '<p class="crud-empty" data-i18n="memberTier.emptyRelations"></p>';
    }
    return (
      '<div class="member-tier-rel-table">' +
      rels
        .map(function (rel) {
          var attrs = attrIdsForRelation(rel.id);
          var actions = '<div class="data-table__actions member-tier-rel-row__actions">';
          if (can("update")) {
            actions +=
              '<button type="button" class="btn btn--icon mt-rel-edit" data-tier="' +
              tierId +
              '" data-id="' +
              rel.id +
              '"><img src="../assets/icons/pencil.svg" alt="" width="16" height="16" /></button>';
          }
          if (can("delete")) {
            actions +=
              '<button type="button" class="btn btn--icon crud-delete mt-rel-delete" data-id="' +
              rel.id +
              '"><img src="../assets/icons/trash-2.svg" alt="" width="16" height="16" /></button>';
          }
          actions += "</div>";
          var promoCell = rel.is_promotion
            ? '<div class="member-tier-rel-row__cell member-tier-rel-row__cell--promo">' +
              relationCheckLine(t("memberTier.includePromotionShort")) +
              "</div>"
            : '<div class="member-tier-rel-row__cell member-tier-rel-row__cell--promo"></div>';
          return (
            '<div class="member-tier-rel-row">' +
            '<div class="member-tier-rel-row__cell member-tier-rel-row__cell--profile">' +
            relationProfileCellHtml(rel.member_setting_relation_id) +
            "</div>" +
            '<div class="member-tier-rel-row__cell member-tier-rel-row__cell--range">' +
            '<span class="member-tier-rel-row__range">' +
            lib.escapeHtml(formatPurchaseRangeLabel(rel)) +
            "</span></div>" +
            '<div class="member-tier-rel-row__cell member-tier-rel-row__cell--discount">' +
            relationDiscountCellHtml(rel) +
            "</div>" +
            '<div class="member-tier-rel-row__cell member-tier-rel-row__cell--scope">' +
            relationScopeCellHtml(rel.type, attrs) +
            "</div>" +
            promoCell +
            '<div class="member-tier-rel-row__cell member-tier-rel-row__cell--actions data-table__col-center">' +
            actions +
            "</div></div>"
          );
        })
        .join("") +
      "</div>"
    );
  }

  function tierCardHtml(entry) {
    var row = entry.row;
    var depth = entry.depth;
    var expanded = !!state.expanded[row.id];
    var relCount = relationsForTier(row.id).length;
    var actions = '<div class="member-tier-card__actions">';
    if (can("create")) {
      actions +=
        '<button type="button" class="btn btn--icon crud-add mt-rel-add" data-tier="' +
        row.id +
        '" aria-label="' +
        lib.escapeHtml(t("memberTier.addRelation")) +
        '"><img src="../assets/icons/plus.svg" alt="" width="16" height="16" /></button>';
    }
    if (can("update")) {
      actions +=
        '<button type="button" class="btn btn--icon mt-tier-edit" data-id="' +
        row.id +
        '"><img src="../assets/icons/pencil.svg" alt="" width="16" height="16" /></button>';
    }
    if (can("delete")) {
      actions +=
        '<button type="button" class="btn btn--icon crud-delete mt-tier-delete" data-id="' +
        row.id +
        '"><img src="../assets/icons/trash-2.svg" alt="" width="16" height="16" /></button>';
    }
    actions += "</div>";
    return (
      '<article class="member-tier-card" style="margin-left:' +
      depth * 1.25 +
      'rem">' +
      '<div class="member-tier-card__head">' +
      '<div class="member-tier-card__avatar">' +
      tierBadgeImgMarkup(row.system_file_id, 22, 22) +
      "</div>" +
      '<div class="member-tier-card__title">' +
      lib.escapeHtml(tierName(row.id) || "—") +
      (row.is_default
        ? ' <span class="member-tier-card__default" data-i18n="memberTier.defaultBadge"></span>'
        : "") +
      "</div>" +
      '<div class="member-tier-card__meta">' +
      "<span>" +
      lib.escapeHtml(t("memberTier.memberCount")) +
      ": " +
      memberCount(row.id) +
      "</span>" +
      "<span>" +
      lib.escapeHtml(t("memberTier.relationCount")) +
      ": " +
      relCount +
      "</span>" +
      '<span class="data-table__col-center">' +
      lib.statusSwitchHtml(row.id, row.is_active, "tier") +
      "</span></div>" +
      actions +
      "</div>" +
      '<div class="member-tier-card__body">' +
      '<button type="button" class="btn btn--primary member-tier-card__toggle mt-expand" data-id="' +
      row.id +
      '">' +
      lib.escapeHtml(expanded ? t("memberTier.hide") : t("memberTier.viewMore")) +
      "</button>" +
      (expanded
        ? '<div class="member-tier-card__relations"><h4 class="member-tier-split__section-title" data-i18n="memberTier.relationsTitle"></h4>' +
          relationRowsHtml(row.id) +
          "</div>"
        : "") +
      "</div></article>"
    );
  }

  function listHtml(meta) {
    if (meta.entries.length === 0) {
      return '<p class="crud-empty" data-i18n="crud.empty"></p>';
    }
    return (
      '<div class="member-tier-split__list">' +
      meta.entries.map(tierCardHtml).join("") +
      "</div>"
    );
  }

  function shellHtml(meta) {
    return (
      '<div class="crud-page">' +
      '<div class="crud-page-header"><div class="crud-page-header__text">' +
      '<h1 class="crud-page-header__title" data-i18n="page.memberTier"></h1>' +
      '<p class="crud-page-header__desc" data-i18n="page.memberTier.desc"></p></div></div>' +
      '<div class="crud-toolbar"><div class="crud-toolbar__row">' +
      '<input type="search" class="crud-toolbar__search" id="mt-search" data-i18n-placeholder="search.placeholder" placeholder="' +
      lib.escapeHtml(t("search.placeholder")) +
      '" /></div></div>' +
      '<div class="member-tier-split">' +
      leftFormHtml() +
      '<div class="member-tier-split__list-wrap">' +
      '<h2 class="member-tier-split__section-title" data-i18n="memberTier.listTitle"></h2>' +
      listHtml(meta) +
      "</div></div>" +
      '<nav class="crud-pagination" id="mt-pagination" aria-label="Pagination"></nav></div>'
    );
  }

  function bindTierFormInputs(form) {
    form.querySelectorAll("input").forEach(function (el) {
      if (el.id === "mt-f-badge-file" || el.id === "mt-f-system_file_id") return;
      el.addEventListener("input", function () {
        clearFieldError(el.closest(".form-field"));
      });
    });
    bindTierBadgeUpload(form);
  }

  function purchaseFields(form) {
    return {
      startEl:
        form.querySelector("#mt-f-purchase_start") ||
        form.querySelector("#mt-rel-purchase_start"),
      endEl:
        form.querySelector("#mt-f-purchase_end") || form.querySelector("#mt-rel-purchase_end"),
    };
  }

  function parsePurchaseRange(form) {
    var pf = purchaseFields(form);
    var start = Number(pf.startEl && pf.startEl.value);
    var end = Number(pf.endEl && pf.endEl.value);
    if (Number.isNaN(start)) start = 0;
    if (Number.isNaN(end)) end = 0;
    return { start: start, end: end };
  }

  function validatePurchaseRange(form, ok) {
    var pr = parsePurchaseRange(form);
    var pf = purchaseFields(form);
    if (pr.start > pr.end) {
      if (pf.startEl) {
        showFieldError(pf.startEl.closest(".form-field"), t("memberTier.errorPurchaseRange"));
      }
      return false;
    }
    return ok;
  }

  function onTierFormSubmit(e) {
    e.preventDefault();
    var form = e.target;
    var nameTh = String(form.querySelector("#mt-f-name_th").value || "").trim();
    var nameEn = String(form.querySelector("#mt-f-name_en").value || "").trim();
    var isActive = form.querySelector("#mt-f-is_active").checked;
    var ok = true;
    if (!nameTh) {
      showFieldError(form.querySelector("#mt-f-name_th").closest(".form-field"), t("error.required"));
      ok = false;
    }
    if (!nameEn) {
      showFieldError(form.querySelector("#mt-f-name_en").closest(".form-field"), t("error.required"));
      ok = false;
    }
    if (!ok) return;

    var badgeFileId = parseTierBadgeFileId(form);

    if (state.editingTierId) {
      if (!can("update")) return;
      var id = state.editingTierId;
      global.store.update("member_tier", id, {
        system_file_id: badgeFileId,
        is_active: isActive,
        updated_at: lib.now(),
      });
      lib.upsertLang("member_tier_language", "member_tier_id", id, "th", nameTh);
      lib.upsertLang("member_tier_language", "member_tier_id", id, "en", nameEn);
      global.toast.show(t("crud.updated"), "success");
    } else {
      if (!can("create")) return;
      var parentId = null;
      var newId = global.store.nextId("member_tier");
      var created = global.store.create(
        "member_tier",
        {
          id: newId,
          system_file_id: badgeFileId,
          parent_id: parentId,
          tree_path: treePathFor(newId, parentId),
          sort_order: nextSortOrder(parentId),
          is_default: false,
          is_active: isActive,
          purchase_start: 0,
          purchase_end: 0,
          discount: 0,
          discount_type: "percent",
          type: "all",
          is_promotion: false,
          created_at: lib.now(),
          updated_at: lib.now(),
          deleted_at: null,
          created_by: 1,
          updated_by: 1,
        }
      );
      lib.upsertLang("member_tier_language", "member_tier_id", created.id, "th", nameTh);
      lib.upsertLang("member_tier_language", "member_tier_id", created.id, "en", nameEn);
      global.toast.show(t("crud.created"), "success");
    }
    state.editingTierId = null;
    render();
  }

  function softDeleteTier(id) {
    var ts = lib.now();
    global.store.update("member_tier", id, { deleted_at: ts, updated_at: ts });
    relationsForTier(id).forEach(function (rel) {
      global.store.update("member_tier_relation", rel.id, { deleted_at: ts, updated_at: ts });
    });
    if (state.editingTierId === id) state.editingTierId = null;
  }

  function deleteRelationRow(id) {
    var attrTable = "member_tier_relation_attribute";
    var attrs = global.store.getAll(attrTable);
    for (var i = attrs.length - 1; i >= 0; i--) {
      if (attrs[i].member_tier_relation_id === id) global.store.deleteAt(attrTable, i);
    }
    global.store.delete("member_tier_relation", id);
  }

  var relationModalPanel = null;

  function ensureRelationModal() {
    if (relationOverlay) return;
    relationOverlay = document.createElement("div");
    relationOverlay.className = "modal-overlay";
    relationOverlay.hidden = true;
    relationOverlay.innerHTML =
      '<div class="modal crud-modal member-tier-modal" role="dialog" aria-modal="true">' +
      '<div class="modal__header"><h2 class="modal__title" id="mt-rel-title"></h2>' +
      '<button type="button" class="modal__close" id="mt-rel-close"><img src="../assets/icons/x.svg" alt="" width="18" height="18" /></button></div>' +
      '<div class="modal__content"><form id="mt-rel-form" class="crud-form" novalidate></form></div>' +
      '<div class="modal__footer">' +
      '<button type="button" class="btn" id="mt-rel-cancel" data-i18n="crud.cancel"></button>' +
      '<button type="submit" form="mt-rel-form" class="btn btn--primary" id="mt-rel-submit"></button>' +
      "</div></div>";
    document.body.appendChild(relationOverlay);
    relationModalPanel = relationOverlay.querySelector(".member-tier-modal");
    relationOverlay.querySelector("#mt-rel-close").addEventListener("click", closeRelationModal);
    relationOverlay.querySelector("#mt-rel-cancel").addEventListener("click", closeRelationModal);
    relationOverlay.addEventListener("click", function (e) {
      if (e.target === relationOverlay) closeRelationModal();
    });
    relationOverlay.querySelector("#mt-rel-form").addEventListener("submit", onRelationSubmit);
  }

  function rebuildRelationAttrSlot(form, scopeType, selectedIds) {
    var slot = form.querySelector("#mt-rel-attrs-slot");
    if (!slot) return;
    slot.outerHTML = relationAttrChipSlotHtml(scopeType, selectedIds);
    if (chipMs() && scopeNeedsAttrs(scopeType)) {
      chipMs().bind(form, "mt-rel-attrs", {
        onChange: function () {
          var el = form.querySelector("#mt-rel-attrs");
          if (el) clearFieldError(el.closest(".form-field"));
        },
      });
    }
  }

  function bindRelationModalForm(form, isEdit) {
    if (chipMs()) {
      chipMs().bind(form, "mt-rel-profiles", {
        onChange: function () {
          var el = form.querySelector("#mt-rel-profiles");
          if (el) clearFieldError(el.closest(".form-field"));
        },
      });
      var scopeChecked = form.querySelector('input[name="rel_type"]:checked');
      var scopeVal = scopeChecked ? scopeChecked.value : "all";
      if (scopeNeedsAttrs(scopeVal)) {
        chipMs().bind(form, "mt-rel-attrs", {
          onChange: function () {
            var el = form.querySelector("#mt-rel-attrs");
            if (el) clearFieldError(el.closest(".form-field"));
          },
        });
      }
    }
    form.setAttribute("data-mt-rel-scope", scopeVal);
    form.querySelectorAll('input[name="rel_type"]').forEach(function (radio) {
      radio.addEventListener("change", function () {
        var prevScope = form.getAttribute("data-mt-rel-scope") || "all";
        var newScope = radio.value;
        var prev =
          scopeNeedsAttrs(newScope) && scopeAttrKind(prevScope) === scopeAttrKind(newScope)
            ? getChipIds(form, "mt-rel-attrs")
            : [];
        form.setAttribute("data-mt-rel-scope", newScope);
        rebuildRelationAttrSlot(form, newScope, prev);
      });
    });
    form.querySelectorAll("#mt-rel-purchase_start, #mt-rel-purchase_end, #mt-rel-discount").forEach(
      function (el) {
        el.addEventListener("input", function () {
          clearFieldError(el.closest(".form-field"));
        });
      }
    );
  }

  function openRelationModal(tierId, relationId) {
    if (relationId ? !can("update") : !can("create")) return;
    ensureRelationModal();
    relationEdit = { tierId: tierId, relationId: relationId || null };
    var rel = relationId ? global.store.getById("member_tier_relation", relationId) : null;
    var isEdit = !!relationId;
    var scopeType = rel ? rel.type : "all";
    var attrs = rel ? attrIdsForRelation(rel.id) : [];

    document.getElementById("mt-rel-title").textContent = isEdit
      ? t("memberTier.editRelation")
      : t("memberTier.addRelation");
    var submitBtn = document.getElementById("mt-rel-submit");
    submitBtn.textContent = isEdit ? t("crud.save") : t("crud.create");

    if (relationModalPanel) {
      relationModalPanel.classList.toggle("member-tier-modal--edit", isEdit);
    }

    var formEl = document.getElementById("mt-rel-form");
    formEl.innerHTML =
      relationProfileChipHtml(tierId, relationId, rel) +
      modalPurchaseRangeHtml(rel ? rel.purchase_start : "", rel ? rel.purchase_end : "") +
      modalDiscountPercentHtml(rel ? rel.discount : "") +
      '<div class="form-field"><span class="member-tier-purchase-row__label" data-i18n="memberTier.participatingProducts"></span>' +
      scopeRadios("rel_type", scopeType) +
      "</div>" +
      relationAttrChipSlotHtml(scopeType, attrs) +
      '<div class="form-field form-field--switch">' +
      '<label for="mt-rel-is_promotion"><span data-i18n="memberTier.includePromotion"></span></label>' +
      '<label class="crud-switch"><input type="checkbox" role="switch" id="mt-rel-is_promotion" name="is_promotion"' +
      (rel && rel.is_promotion ? " checked" : "") +
      ' /><span class="crud-switch__track" aria-hidden="true"><span class="crud-switch__thumb"></span></span></label></div>';

    if (global.i18n) global.i18n.init();
    bindRelationModalForm(formEl, isEdit);
    relationOverlay.hidden = false;
    document.body.classList.add("modal-open");
  }

  function closeRelationModal() {
    relationEdit = { tierId: null, relationId: null };
    if (relationOverlay) relationOverlay.hidden = true;
    document.body.classList.remove("modal-open");
  }

  function onRelationSubmit(e) {
    e.preventDefault();
    var form = e.target;
    var tierId = relationEdit.tierId;
    var relationId = relationEdit.relationId;
    var comboIds = getChipIds(form, "mt-rel-profiles");
    var relTypeChecked = form.querySelector('input[name="rel_type"]:checked');
    var type = relTypeChecked ? relTypeChecked.value : "all";
    var attrIds = getChipIds(form, "mt-rel-attrs");
    var profileField = form.querySelector("#mt-rel-profiles");
    var ok = true;
    if (!comboIds.length) {
      if (profileField) {
        showFieldError(profileField.closest(".form-field"), t("error.required"));
      }
      ok = false;
    }
    ok = validatePurchaseRange(form, ok);
    if (scopeNeedsAttrs(type) && !attrIds.length) {
      var attrEl = form.querySelector("#mt-rel-attrs");
      if (attrEl) showFieldError(attrEl.closest(".form-field"), t("memberTier.errorScopeAttrs"));
      ok = false;
    }
    if (!ok) return;

    var pr = parsePurchaseRange(form);
    var discount = Number(form.querySelector("#mt-rel-discount").value);
    var discountTypeEl = form.querySelector("#mt-rel-discount_type");
    var discountType = discountTypeEl ? discountTypeEl.value : "percent";
    var isPromotion = form.querySelector("#mt-rel-is_promotion").checked;

    if (relationId) {
      if (!can("update")) return;
      var comboId = comboIds[0];
      var body = {
        member_tier_id: tierId,
        member_setting_relation_id: comboId,
        purchase_start: pr.start,
        purchase_end: pr.end,
        discount: Number.isNaN(discount) ? 0 : discount,
        discount_type: discountType,
        type: type,
        is_promotion: isPromotion,
        updated_at: lib.now(),
      };
      global.store.update("member_tier_relation", relationId, body);
      syncRelationAttributes(relationId, type, attrIds);
      global.toast.show(t("crud.updated"), "success");
    } else {
      if (!can("create")) return;
      var createdCount = 0;
      var skipped = 0;
      comboIds.forEach(function (comboId) {
        if (comboTaken(tierId, comboId, 0)) {
          skipped += 1;
          return;
        }
        var created = global.store.create("member_tier_relation", {
          member_tier_id: tierId,
          member_setting_relation_id: comboId,
          purchase_start: pr.start,
          purchase_end: pr.end,
          discount: Number.isNaN(discount) ? 0 : discount,
          discount_type: discountType,
          type: type,
          is_promotion: isPromotion,
          created_at: lib.now(),
          updated_at: lib.now(),
          deleted_at: null,
          created_by: 1,
          updated_by: 1,
        });
        syncRelationAttributes(created.id, type, attrIds);
        createdCount += 1;
      });
      if (createdCount === 0) {
        if (profileField) {
          showFieldError(profileField.closest(".form-field"), t("memberTier.errorComboTaken"));
        }
        return;
      }
      state.expanded[tierId] = true;
      global.toast.show(t("crud.created"), "success");
    }
    closeRelationModal();
    render();
  }

  function ensureConfirmModal() {
    if (confirmOverlay) return;
    confirmOverlay = document.createElement("div");
    confirmOverlay.className = "modal-overlay";
    confirmOverlay.hidden = true;
    confirmOverlay.innerHTML =
      '<div class="modal" role="dialog" aria-modal="true">' +
      '<div class="modal__header"><h2 class="modal__title" data-i18n="crud.delete"></h2>' +
      '<button type="button" class="modal__close" id="mt-confirm-close"><img src="../assets/icons/x.svg" alt="" width="18" height="18" /></button></div>' +
      '<div class="modal__content"><p class="modal__body" data-i18n="crud.confirmDelete"></p></div>' +
      '<div class="modal__footer">' +
      '<button type="button" class="btn" id="mt-confirm-cancel" data-i18n="crud.cancel"></button>' +
      '<button type="button" class="btn btn--primary" id="mt-confirm-ok" data-i18n="crud.delete"></button>' +
      "</div></div>";
    document.body.appendChild(confirmOverlay);
    confirmOverlay.querySelector("#mt-confirm-close").addEventListener("click", closeConfirm);
    confirmOverlay.querySelector("#mt-confirm-cancel").addEventListener("click", closeConfirm);
    confirmOverlay.querySelector("#mt-confirm-ok").addEventListener("click", onConfirmDelete);
    confirmOverlay.addEventListener("click", function (e) {
      if (e.target === confirmOverlay) closeConfirm();
    });
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
    if (!pendingDelete || !can("delete")) return;
    if (pendingDelete.kind === "tier") softDeleteTier(pendingDelete.id);
    else deleteRelationRow(pendingDelete.id);
    global.toast.show(t("crud.deleted"), "success");
    closeConfirm();
    render();
  }

  function bindEvents(root) {
    var search = document.getElementById("mt-search");
    if (search) {
      search.value = state.query;
      search.addEventListener("input", function () {
        state.query = search.value;
        state.page = 1;
        render();
      });
    }

    var tierForm = document.getElementById("mt-tier-form");
    if (tierForm) {
      bindTierFormInputs(tierForm);
      tierForm.addEventListener("submit", onTierFormSubmit);
    }
    var cancel = document.getElementById("mt-form-cancel");
    if (cancel) {
      cancel.addEventListener("click", function () {
        state.editingTierId = null;
        render();
      });
    }

    root.querySelectorAll(".mt-expand").forEach(function (btn) {
      btn.addEventListener("click", function () {
        var id = Number(btn.getAttribute("data-id"));
        state.expanded[id] = !state.expanded[id];
        render();
      });
    });
    root.querySelectorAll(".mt-tier-edit").forEach(function (btn) {
      btn.addEventListener("click", function () {
        state.editingTierId = Number(btn.getAttribute("data-id"));
        render();
        var form = document.getElementById("mt-tier-form");
        if (form) form.scrollIntoView({ behavior: "smooth", block: "nearest" });
      });
    });
    root.querySelectorAll(".mt-tier-delete").forEach(function (btn) {
      btn.addEventListener("click", function () {
        openDeleteConfirm("tier", Number(btn.getAttribute("data-id")));
      });
    });
    root.querySelectorAll(".mt-rel-add").forEach(function (btn) {
      btn.addEventListener("click", function (e) {
        e.stopPropagation();
        openRelationModal(Number(btn.getAttribute("data-tier")), null);
      });
    });
    root.querySelectorAll(".mt-rel-edit").forEach(function (btn) {
      btn.addEventListener("click", function () {
        openRelationModal(Number(btn.getAttribute("data-tier")), Number(btn.getAttribute("data-id")));
      });
    });
    root.querySelectorAll(".mt-rel-delete").forEach(function (btn) {
      btn.addEventListener("click", function () {
        openDeleteConfirm("relation", Number(btn.getAttribute("data-id")));
      });
    });

    root.querySelectorAll(".crud-status-switch").forEach(function (input) {
      if (!can("update")) input.disabled = true;
      input.addEventListener("change", function () {
        var id = Number(input.getAttribute("data-id"));
        var kind = input.getAttribute("data-kind");
        if (kind === "tier") {
          global.store.update("member_tier", id, {
            is_active: input.checked,
            updated_at: lib.now(),
          });
          global.toast.show(t("crud.statusChanged"), "success");
        }
      });
    });
  }

  function render() {
    var root = document.getElementById("mt-root");
    if (!root) return;
    var meta = paginate(filteredTierEntries());
    root.innerHTML = shellHtml(meta);
    global.crudList.renderPaginationBar(
      document.getElementById("mt-pagination"),
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

  function boot() {
    global.store.init();
    global.i18n.init();
    if (!global.auth.requireAuth("login.html")) return;
    if (!global.permissions.guardPage(PERM_MODULE, PERM_TYPE, "login.html")) return;

    if (global.crudList) state.pageSize = global.crudList.readStoredPageSize();

    global.layout.mount({
      pageTitle: t("page.memberTier"),
      contentHtml: '<div id="mt-root"></div>',
    });

    render();

    global.devBar.mount({
      toasts: [
        { type: "success", label: "Created", msgKey: "crud.created" },
        { type: "success", label: "Updated", msgKey: "crud.updated" },
        { type: "success", label: "Deleted", msgKey: "crud.deleted" },
        { type: "success", label: "Status", msgKey: "crud.statusChanged" },
        { type: "error", label: "Required", msgKey: "error.required" },
      ],
    });

    document.addEventListener("store:change", function () {
      setTimeout(render, 0);
    });
    document.addEventListener("i18n:change", render);
    if (global.realtime) global.realtime.onMessage(render);
  }

  global.memberTierPage = { boot: boot };
})(window);

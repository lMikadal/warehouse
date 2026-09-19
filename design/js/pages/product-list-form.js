(function (global) {
  var PERM_MODULE = "product";
  var PERM_TYPE = "product_list";
  var CAR_PAGE_SIZE = 5;
  var ITEM_TABLE_PAGE_SIZE = 10;
  var nextCarDraftId = -1;
  var nextItemDraftKey = 1;
  var nextWhPlacementKey = 1;
  var itemSubTabByKey = {};
  var itemChannelPageByKey = {};
  var itemWhPageByKey = {};
  var itemChannelEditByKey = {};
  var itemSupplierEditByKey = {};
  var channelAddModalEl = null;
  var supplierAddModalEl = null;
  var itemTableCrudBound = false;

  var listId = null;
  var isEdit = false;
  var activeTab = "data";
  var carPage = 1;
  var carSearch = "";
  var isSaving = false;

  var draft = null;
  var rootEl = null;
  var carModalEl = null;
  var noteModalEl = null;
  var whDetailOverlay = null;
  var lotStockOverlay = null;
  var lotModalItemId = null;
  var lotModalPage = 1;
  var lotModalPageSize = 10;
  var lotModalEditStockId = null;
  var lotModalEventsBound = false;
  var LOT_MODAL_PAGE_SIZE_KEY = "warehouse-design-lot-page-size";
  var LOT_MODAL_PAGE_SIZE_OPTIONS = [5, 10];
  var LOT_MODAL_COLS = 17;
  var historySubTab = "purchase";
  var historyOpenGroups = {};
  var HISTORY_PAGE_SIZE_KEY = "warehouse-design-page-size";
  var HISTORY_PAGE_SIZE_OPTIONS = [10, 25, 50, 100];
  var HISTORY_PURCHASE_COLS = 14;
  var HISTORY_SALES_COLS = 10;
  function defaultHistoryFilters() {
    return {
      viewMode: "day",
      dayFrom: "",
      dayTo: "",
      monthFrom: "",
      monthTo: "",
      yearFrom: "",
      yearTo: "",
      itemId: "all",
      partyId: "all",
      page: 1,
    };
  }
  var historyState = { purchase: defaultHistoryFilters(), sales: defaultHistoryFilters() };
  var confirmOverlay = null;
  var carEditKey = null;
  var lotAddOverlay = null;
  var lotAddItemId = null;
  var lotAddBinId = null;
  var lotAddBinLabel = "";
  var lotAddEventsBound = false;
  var storefrontLiveBound = false;
  var saleChannelChangeBound = false;

  function t(key, params) {
    if (!global.i18n) return key;
    return params ? global.i18n.format(key, params) : global.i18n.t(key);
  }

  function locale() {
    return global.i18n ? global.i18n.getLocale() : "th";
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

  function escapeAttr(s) {
    return escapeHtml(s);
  }

  function can(action) {
    return global.permissions && global.permissions.canAction(PERM_MODULE, PERM_TYPE, action);
  }

  function queryListId() {
    var params = new URLSearchParams(window.location.search);
    var raw = params.get("product_list_id");
    if (!raw) return null;
    var n = Number(raw);
    return Number.isFinite(n) && n > 0 ? n : null;
  }

  function attrName(attrId, loc) {
    loc = loc || locale();
    var rows = global.store.getAll("product_attribute_language");
    var row = rows.find(function (r) {
      return r.product_attribute_id === attrId && r.locale === loc;
    });
    if (row && row.name) return row.name;
    row = rows.find(function (r) {
      return r.product_attribute_id === attrId && r.locale === "th";
    });
    return row && row.name ? row.name : "";
  }

  function langRow(table, parentKey, parentId, loc) {
    return global.store.getAll(table).find(function (r) {
      return r[parentKey] === parentId && r.locale === loc;
    });
  }

  function newItemDraftKey() {
    return "item-" + nextItemDraftKey++;
  }

  function baseItemDraft(overrides) {
    return Object.assign(
      {
        _draftKey: newItemDraftKey(),
        id: null,
        sku: "",
        price: "",
        price_wholesale: "",
        type_price: "manual",
        unit: "piece",
        qty_per_unit: "1",
        minimum_stock: "0",
        amount_price_wholesale: "0",
        is_active: true,
        is_stopped: false,
        name_th: "",
        name_en: "",
        barcode: "",
        qrcode: "",
        weight: "",
        width: "",
        length: "",
        height: "",
        is_authentic: true,
        promotion: "",
        channelPrices: [],
        removedChannelIds: [],
        suppliers: [],
        warehousePlacements: [],
        open: false,
      },
      overrides || {}
    );
  }

  function newItemDraft(overrides) {
    var item = finalizeItemDraft(baseItemDraft(overrides));
    if (draft && draft.supplierIds) {
      mergeListPartnersIntoItem(item, draft.supplierIds);
    }
    return item;
  }

  function mapItemDraftFromStore(it) {
    var thL = langRow("product_item_language", "product_item_id", it.id, "th");
    var enL = langRow("product_item_language", "product_item_id", it.id, "en");
    var channelPrices = global.store
      .getAll("product_item_price")
      .filter(function (r) {
        return r.product_item_id === it.id;
      })
      .map(function (r) {
        return {
          setting_sale_channel_id: r.setting_sale_channel_id,
          price: Number(r.price) || 0,
        };
      });
    var suppliersDraft = global.store
      .getAll("product_item_supplier")
      .filter(function (r) {
        return r.product_item_id === it.id;
      })
      .map(function (r) {
        return {
          supplier_user_id: r.supplier_user_id,
          cost_price: Number(r.cost_price) || 0,
          discount: Number(r.discount) || 0,
          discount_type: r.discount_type === "percent" ? "percent" : "baht",
        };
      });
    return finalizeItemDraft(
      baseItemDraft({
        id: it.id,
        sku: it.sku || "",
        price: String(it.price != null ? it.price : ""),
        price_wholesale: String(it.price_wholesale != null ? it.price_wholesale : ""),
        type_price: it.type_price === "stock" ? "stock" : "manual",
        unit: it.unit || "piece",
        qty_per_unit: String(it.qty_per_unit != null ? it.qty_per_unit : 1),
        minimum_stock: String(it.minimum_stock != null ? it.minimum_stock : 0),
        amount_price_wholesale: String(
          it.amount_price_wholesale != null ? it.amount_price_wholesale : 0
        ),
        is_active: !!it.is_active,
        is_stopped: !!it.is_stopped,
        name_th: (thL && thL.name) || "",
        name_en: (enL && enL.name) || "",
        barcode: it.barcode || "",
        qrcode: it.qrcode || "",
        weight: it.weight != null && it.weight !== "" ? String(it.weight) : "",
        width: it.width != null && it.width !== "" ? String(it.width) : "",
        length: it.length != null && it.length !== "" ? String(it.length) : "",
        height: it.height != null && it.height !== "" ? String(it.height) : "",
        is_authentic:
          it.is_authentic != null
            ? !!it.is_authentic
            : it.is_fake != null
              ? !it.is_fake
              : true,
        promotion: it.promotion != null ? String(it.promotion) : "",
        channelPrices: channelPrices,
        removedChannelIds: [],
        suppliers: suppliersDraft,
        warehousePlacements: mapWarehousePlacementsFromStore(it.id),
        open: false,
      })
    );
  }

  function optionalItemNumber(raw) {
    var s = String(raw != null ? raw : "").trim();
    if (!s) return null;
    var n = Number(s);
    return Number.isFinite(n) ? n : null;
  }

  function itemFieldFromBlock(block, field) {
    if (field === "type_price") {
      var picked = block.querySelector('input[data-field="type_price"]:checked');
      return picked && picked.value === "stock" ? "stock" : "manual";
    }
    if (field === "price" || field === "price_wholesale") {
      return storefrontPriceExFromBlock(block, field);
    }
    var el = block.querySelector('[data-field="' + field + '"]');
    if (!el) {
      if (
        field === "is_authentic" ||
        field === "is_active" ||
        field === "is_stopped"
      )
        return false;
      return "";
    }
    if (el.type === "checkbox") return el.checked;
    if (el.type === "radio") return el.checked ? String(el.value) : "";
    return el.value != null ? String(el.value) : "";
  }

  function listSkuPrefix() {
    return draft ? String(draft.sku || "").trim() : "";
  }

  function itemSkuSuffix(item, prefix) {
    prefix = String(prefix || "").trim();
    var sku = String(item && item.sku != null ? item.sku : "").trim();
    if (!sku) return "";
    if (!prefix) return sku;
    if (sku === prefix) return "";
    if (sku.indexOf(prefix) === 0) {
      var rest = sku.slice(prefix.length);
      if (rest.charAt(0) === "-" || rest.charAt(0) === "_") rest = rest.slice(1);
      return rest;
    }
    return sku;
  }

  function composeItemSku(prefix, suffix) {
    prefix = String(prefix || "").trim();
    suffix = String(suffix || "").trim();
    if (!suffix) return prefix;
    if (!prefix) return suffix;
    return prefix + "-" + suffix;
  }

  // ponytail: 13-digit demo string, not GS1 check digit
  function generateMockBarcode(itemId, itemKey) {
    var n = Number(itemId) || 0;
    var seed =
      Math.abs(
        String(itemKey || "")
          .split("")
          .reduce(function (acc, ch) {
            return acc + ch.charCodeAt(0);
          }, 0)
      ) % 1e9;
    return "885" + String(1000000000 + n * 997 + seed).slice(-10);
  }

  function generateMockQrcode(fullSku, itemId) {
    return "WH:" + (fullSku || "item-" + (itemId != null ? itemId : "new"));
  }

  function nextVariantSkuSuffix(excludeKey) {
    var prefix = listSkuPrefix();
    var used = {};
    (draft.items || []).forEach(function (it) {
      if (excludeKey && it._draftKey === excludeKey) return;
      var s = String(itemSkuSuffix(it, prefix)).trim().toUpperCase();
      if (s) used[s] = true;
    });
    var i;
    for (i = 0; i < 26; i++) {
      var letter = String.fromCharCode(65 + i);
      if (!used[letter]) return letter;
    }
    for (i = 1; i < 1000; i++) {
      var num = String(i);
      if (!used[num]) return num;
    }
    return "1";
  }

  function emptyDraft() {
    return {
      sku: "",
      supplier_sku: "",
      tag: "",
      note: "",
      is_active: true,
      is_new: false,
      product_brand_id: "",
      product_category_id: "",
      name_th: "",
      name_en: "",
      sub_name_th: "",
      sub_name_en: "",
      desc_th: "",
      desc_en: "",
      factoryCodes: [""],
      otherCodes: [""],
      supplierIds: [],
      cars: [],
      items: [newItemDraft({ open: true })],
    };
  }

  function loadDraftFromStore(id) {
    var list = global.store.getById("product_list", id);
    if (!list || list.deleted_at != null) return null;
    var th = langRow("product_list_language", "product_list_id", id, "th") || {};
    var en = langRow("product_list_language", "product_list_id", id, "en") || {};
    var factory = global.store
      .getAll("product_list_code")
      .filter(function (c) {
        return c.product_list_id === id && c.deleted_at == null && c.code_type === "factory";
      })
      .map(function (c) {
        return c.sku || "";
      });
    var other = global.store
      .getAll("product_list_code")
      .filter(function (c) {
        return c.product_list_id === id && c.deleted_at == null && c.code_type === "other";
      })
      .map(function (c) {
        return c.sku || "";
      });
    var suppliers = global.store
      .getAll("product_list_supplier")
      .filter(function (r) {
        return r.product_list_id === id;
      })
      .map(function (r) {
        return String(r.supplier_user_id);
      });
    var cars = global.store
      .getAll("product_list_car")
      .filter(function (c) {
        return c.product_list_id === id && c.deleted_at == null;
      })
      .map(function (c) {
        return {
          id: c.id,
          brand_id: c.product_attribute_brand_id != null ? String(c.product_attribute_brand_id) : "",
          model_id: c.product_attribute_model_id != null ? String(c.product_attribute_model_id) : "",
          engine_id: c.product_attribute_engine_id != null ? String(c.product_attribute_engine_id) : "",
          gear: c.gear_type || "auto",
          year_start: c.year_start != null ? String(c.year_start) : "",
          year_end: c.year_end != null ? String(c.year_end) : "",
        };
      });
    var items = global.store
      .getAll("product_item")
      .filter(function (it) {
        return it.product_list_id === id && it.deleted_at == null;
      })
      .sort(function (a, b) {
        return a.id - b.id;
      })
      .map(mapItemDraftFromStore);
    items.forEach(function (it) {
      mergeListPartnersIntoItem(it, suppliers);
    });
    if (!items.length) {
      items.push(newItemDraft({ open: true }));
    }
    items.forEach(function (it) {
      (it.suppliers || []).forEach(function (r) {
        if (r.supplier_user_id == null) return;
        var sid = String(r.supplier_user_id);
        if (suppliers.indexOf(sid) < 0) suppliers.push(sid);
      });
    });
    return {
      sku: list.sku || "",
      supplier_sku: list.supplier_sku || "",
      tag: list.tag || "",
      note: list.note || "",
      is_active: !!list.is_active,
      is_new: !!list.is_new,
      product_brand_id: list.product_brand_id != null ? String(list.product_brand_id) : "",
      product_category_id: list.product_category_id != null ? String(list.product_category_id) : "",
      name_th: th.name || "",
      name_en: en.name || "",
      sub_name_th: th.sub_name || "",
      sub_name_en: en.sub_name || "",
      desc_th: th.description || "",
      desc_en: en.description || "",
      factoryCodes: factory.length ? factory : [""],
      otherCodes: other.length ? other : [""],
      supplierIds: suppliers,
      cars: cars,
      items: items,
    };
  }

  function val(id) {
    var el = document.getElementById(id);
    return el ? String(el.value || "").trim() : "";
  }

  function checked(id) {
    var el = document.getElementById(id);
    return el ? !!el.checked : false;
  }

  function collectDraftFromDom() {
    if (!draft || !rootEl) return;
    draft.name_th = val("plf-name-th");
    draft.name_en = val("plf-name-en");
    draft.sub_name_th = val("plf-sub-th");
    draft.sub_name_en = val("plf-sub-en");
    draft.desc_th = val("plf-desc-th");
    draft.desc_en = val("plf-desc-en");
    draft.product_category_id = val("plf-category");
    draft.product_brand_id = val("plf-brand");
    draft.sku = val("plf-sku");
    draft.supplier_sku = val("plf-supplier-sku");
    draft.tag = val("plf-tag");
    var activeEl = document.getElementById("plf-is-active");
    if (activeEl) draft.is_active = activeEl.checked;

    draft.factoryCodes = [];
    rootEl.querySelectorAll(".plf-factory-code").forEach(function (inp) {
      draft.factoryCodes.push(String(inp.value || ""));
    });
    if (!draft.factoryCodes.length) draft.factoryCodes = [""];

    draft.otherCodes = [];
    rootEl.querySelectorAll(".plf-other-code").forEach(function (inp) {
      draft.otherCodes.push(String(inp.value || ""));
    });
    if (!draft.otherCodes.length) draft.otherCodes = [""];

    draft.supplierIds = global.chipMultiSelect
      ? global.chipMultiSelect.getSelectedIds(rootEl, "plf-suppliers")
      : [];

    var prevByKey = {};
    (draft.items || []).forEach(function (it) {
      if (it._draftKey) prevByKey[it._draftKey] = it;
    });

    draft.items = [];
    var skuPrefix = listSkuPrefix();
    rootEl.querySelectorAll(".plf-item").forEach(function (block) {
      var key = block.getAttribute("data-item-key");
      var idRaw = block.getAttribute("data-item-id");
      var prev = prevByKey[key];
      var typePrice = itemFieldFromBlock(block, "type_price");
      var priceVal = itemFieldFromBlock(block, "price");
      var wholesaleVal = itemFieldFromBlock(block, "price_wholesale");
      priceVal = resolveStorefrontPriceWhenDomMissing(prev, idRaw, "price", priceVal);
      wholesaleVal = resolveStorefrontPriceWhenDomMissing(prev, idRaw, "price_wholesale", wholesaleVal);
      draft.items.push({
        _draftKey: key,
        id: idRaw ? Number(idRaw) : null,
        sku: composeItemSku(skuPrefix, itemFieldFromBlock(block, "sku_suffix")),
        price: priceVal,
        price_wholesale: wholesaleVal,
        type_price: typePrice,
        unit: itemFieldFromBlock(block, "unit") || "piece",
        qty_per_unit: itemFieldFromBlock(block, "qty_per_unit") || "1",
        minimum_stock: itemFieldFromBlock(block, "minimum_stock") || "0",
        amount_price_wholesale:
          itemFieldFromBlock(block, "amount_price_wholesale") || "0",
        name_th: itemFieldFromBlock(block, "name_th"),
        name_en: itemFieldFromBlock(block, "name_en"),
        barcode: itemFieldFromBlock(block, "barcode"),
        qrcode: itemFieldFromBlock(block, "qrcode"),
        weight: itemFieldFromBlock(block, "weight"),
        width: itemFieldFromBlock(block, "width"),
        length: itemFieldFromBlock(block, "length"),
        height: itemFieldFromBlock(block, "height"),
        is_authentic: !!itemFieldFromBlock(block, "is_authentic"),
        is_active: block.querySelector('[data-field="is_active"]')
          ? block.querySelector('[data-field="is_active"]').checked
          : true,
        is_stopped: prevByKey[key] ? !!prevByKey[key].is_stopped : false,
        promotion: itemFieldFromBlock(block, "promotion"),
        channelPrices:
          prev && prev.channelPrices
            ? prev.channelPrices.map(function (r) {
                return {
                  setting_sale_channel_id: r.setting_sale_channel_id,
                  price: Number(r.price) || 0,
                };
              })
            : [],
        removedChannelIds:
          prev && prev.removedChannelIds ? prev.removedChannelIds.slice() : [],
        suppliers:
          prev && prev.suppliers
            ? prev.suppliers.map(function (r) {
                return {
                  supplier_user_id: r.supplier_user_id,
                  cost_price: Number(r.cost_price) || 0,
                  discount: Number(r.discount) || 0,
                  discount_type: r.discount_type === "percent" ? "percent" : "baht",
                };
              })
            : [],
        warehousePlacements:
          prev && prev.warehousePlacements
            ? prev.warehousePlacements.map(function (r) {
                return {
                  _draftKey: r._draftKey,
                  id: r.id != null ? r.id : null,
                  warehouse_id: r.warehouse_id != null ? r.warehouse_id : null,
                  zone_id: r.zone_id != null ? r.zone_id : null,
                  shelf_id: r.shelf_id != null ? r.shelf_id : null,
                  rack_id: r.rack_id != null ? r.rack_id : null,
                  bin_id: r.bin_id != null ? r.bin_id : null,
                  quantity: r.quantity != null ? String(r.quantity) : "",
                };
              })
            : [],
        open: block.open,
      });
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

  function categoryBreadcrumbLabel(id) {
    if (!id) return "";
    if (global.categoryCascadePicker && global.categoryCascadePicker.breadcrumbLabel) {
      return global.categoryCascadePicker.breadcrumbLabel(id);
    }
    return attrName(Number(id));
  }

  function categoryFieldHtml() {
    var id = draft.product_category_id || "";
    var label = categoryBreadcrumbLabel(id);
    return (
      '<div class="form-field" data-field-wrap="plf-category">' +
      '<label for="plf-category-open"><span data-i18n="col.category"></span>' +
      '<span class="form-field__required" aria-hidden="true">*</span></label>' +
      '<input type="hidden" id="plf-category" value="' +
      escapeAttr(id) +
      '" />' +
      '<input type="text" readonly id="plf-category-open" class="product-list-form__category-input"' +
      ' value="' +
      escapeAttr(label) +
      '" data-i18n-placeholder-select="col.category" placeholder="กรุณาเลือกหมวดหมู่"' +
      ' aria-label="' +
      escapeAttr(t("productListForm.categoryOpenAria")) +
      '" />' +
      '<div class="form-field__error-slot" aria-live="polite"><p class="form-field__error" hidden role="alert"></p></div></div>'
    );
  }

  function brandOptions(selected) {
    return global.store
      .getAll("product_attribute")
      .filter(function (r) {
        return r.deleted_at == null && r.type === "brand" && r.is_active;
      })
      .sort(function (a, b) {
        return a.sort_order - b.sort_order || a.id - b.id;
      })
      .map(function (r) {
        var sel = String(selected) === String(r.id) ? " selected" : "";
        return (
          '<option value="' +
          r.id +
          '"' +
          sel +
          ">" +
          escapeHtml(attrName(r.id)) +
          "</option>"
        );
      })
      .join("");
  }

  function supplierOptionsList() {
    return global.store
      .getAll("supplier_user")
      .filter(function (s) {
        return s.deleted_at == null && s.is_active;
      })
      .sort(function (a, b) {
        return String(a.sku || "").localeCompare(String(b.sku || ""));
      })
      .map(function (s) {
        var info = global.store
          .getAll("supplier_information")
          .find(function (i) {
            return i.supplier_user_id === s.id && i.type === "contact" && i.deleted_at == null;
          });
        var name = (info && info.name) || s.sku || String(s.id);
        return {
          value: String(s.id),
          label: name + (s.sku ? " (" + s.sku + ")" : ""),
        };
      });
  }

  function supplierPartnersFieldHtml(selectedIds) {
    if (!global.chipMultiSelect) return "";
    return global.chipMultiSelect.fieldHtml({
      id: "plf-suppliers",
      labelKey: "productListForm.partners",
      placeholderLabelKey: "productListForm.partners",
      options: supplierOptionsList(),
      selectedIds: selectedIds || [],
    });
  }

  function itemVariantWrapId(itemKey, field) {
    return "plf-item-" + itemKey + "-" + field;
  }

  function itemVariantField(itemKey, field, labelKey, required, innerInputHtml) {
    return (
      '<div class="form-field" data-field-wrap="' +
      escapeAttr(itemVariantWrapId(itemKey, field)) +
      '">' +
      "<label><span data-i18n=\"" +
      escapeHtml(labelKey) +
      '"></span>' +
      (required ? '<span class="form-field__required" aria-hidden="true">*</span>' : "") +
      "</label>" +
      innerInputHtml +
      '<div class="form-field__error-slot" aria-live="polite"><p class="form-field__error" hidden role="alert"></p></div></div>'
    );
  }

  function itemPanelTitle(num, labelKey) {
    return (
      '<h4 class="product-list-form__panel-title">' +
      '<span class="product-list-form__section-num">' +
      escapeHtml(String(num)) +
      '</span> <span data-i18n="' +
      escapeHtml(labelKey) +
      '"></span></h4>'
    );
  }

  function textField(labelKey, id, value, required) {
    var ph = escapeHtml(t("form.placeholder.input", { label: t(labelKey) }));
    return (
      '<div class="form-field" data-field-wrap="' +
      escapeAttr(id) +
      '">' +
      '<label for="' +
      escapeAttr(id) +
      '"><span data-i18n="' +
      escapeHtml(labelKey) +
      '"></span>' +
      (required ? '<span class="form-field__required" aria-hidden="true">*</span>' : "") +
      "</label>" +
      '<input type="text" id="' +
      escapeAttr(id) +
      '" value="' +
      escapeAttr(value || "") +
      '" placeholder="' +
      ph +
      '"' +
      (required ? " required" : "") +
      " />" +
      '<div class="form-field__error-slot" aria-live="polite"><p class="form-field__error" hidden role="alert"></p></div></div>'
    );
  }

  function yearField(labelKey, id, value) {
    var ph = escapeHtml(t("form.placeholder.input", { label: t(labelKey) }));
    return (
      '<div class="form-field" data-field-wrap="' +
      escapeAttr(id) +
      '">' +
      '<label for="' +
      escapeAttr(id) +
      '"><span data-i18n="' +
      escapeHtml(labelKey) +
      '"></span></label>' +
      '<input type="number" inputmode="numeric" min="1900" max="2100" step="1" id="' +
      escapeAttr(id) +
      '" value="' +
      escapeAttr(value || "") +
      '" placeholder="' +
      ph +
      '" />' +
      '<div class="form-field__error-slot" aria-live="polite"><p class="form-field__error" hidden role="alert"></p></div></div>'
    );
  }

  function textareaField(labelKey, id, value) {
    var ph = escapeHtml(t("form.placeholder.input", { label: t(labelKey) }));
    return (
      '<div class="form-field">' +
      '<label for="' +
      escapeAttr(id) +
      '"><span data-i18n="' +
      escapeHtml(labelKey) +
      '"></span></label>' +
      '<textarea id="' +
      escapeAttr(id) +
      '" rows="3" placeholder="' +
      ph +
      '">' +
      escapeHtml(value || "") +
      "</textarea>" +
      '<div class="form-field__error-slot" aria-live="polite"><p class="form-field__error" hidden role="alert"></p></div></div>'
    );
  }

  function selectField(labelKey, id, optionsHtml, required) {
    var ph = escapeHtml(t("form.placeholder.select", { label: t(labelKey) }));
    var hasSel = optionsHtml.indexOf(" selected") >= 0;
    return (
      '<div class="form-field" data-field-wrap="' +
      escapeAttr(id) +
      '">' +
      '<label for="' +
      escapeAttr(id) +
      '"><span data-i18n="' +
      escapeHtml(labelKey) +
      '"></span>' +
      (required ? '<span class="form-field__required" aria-hidden="true">*</span>' : "") +
      "</label>" +
      '<select id="' +
      escapeAttr(id) +
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
      '<div class="form-field__error-slot" aria-live="polite"><p class="form-field__error" hidden role="alert"></p></div></div>'
    );
  }

  function codeListHtml(className, values, addKey) {
    var rows = values
      .map(function (v, i) {
        return (
          '<div class="product-list-form__code-row">' +
          '<input type="text" class="' +
          className +
          '" value="' +
          escapeAttr(v) +
          '" placeholder="' +
          escapeHtml(t("form.placeholder.input", { label: t("productListForm.codeValue") })) +
          '" />' +
          (values.length > 1
            ? '<button type="button" class="btn btn--icon crud-delete plf-code-remove" data-index="' +
              i +
              '" aria-label="' +
              escapeAttr(t("crud.delete")) +
              '"><img src="../assets/icons/trash-2.svg" alt="" width="16" height="16" /></button>'
            : "") +
          "</div>"
        );
      })
      .join("");
    return (
      '<div class="product-list-form__code-list">' +
      rows +
      '<button type="button" class="btn plf-code-add" data-code-kind="' +
      escapeAttr(className) +
      '"><img src="../assets/icons/plus.svg" alt="" width="16" height="16" /> <span data-i18n="' +
      escapeHtml(addKey) +
      '"></span></button></div>'
    );
  }

  function gearLabel(gear) {
    if (gear === "manual") return t("productList.gearManual");
    if (gear === "auto") return t("productList.gearAuto");
    return gear || "—";
  }

  function resolvePathFromBin(binId) {
    if (global.warehouseLib && global.warehouseLib.resolvePathFromBin) {
      return global.warehouseLib.resolvePathFromBin(binId);
    }
    return {
      warehouse_id: null,
      zone_id: null,
      shelf_id: null,
      rack_id: null,
      bin_id: binId,
    };
  }

  function newWhPlacementKey() {
    return "whp-" + nextWhPlacementKey++;
  }

  function defaultWarehousePlacementRow() {
    return {
      _draftKey: newWhPlacementKey(),
      id: null,
      warehouse_id: null,
      zone_id: null,
      shelf_id: null,
      rack_id: null,
      bin_id: null,
      quantity: "",
    };
  }

  function ensureItemWarehouseDraft(item) {
    if (!item.warehousePlacements) item.warehousePlacements = [];
  }

  function placementQtyForStore(itemId, placementId) {
    if (!itemId || !placementId) return 0;
    return global.store
      .getAll("product_item_stock")
      .filter(function (s) {
        return (
          s.product_item_id === itemId &&
          s.product_item_warehouse_id === placementId &&
          s.deleted_at == null
        );
      })
      .reduce(function (sum, s) {
        return sum + (Number(s.remain_quantity) || 0);
      }, 0);
  }

  function mapWarehousePlacementsFromStore(itemId) {
    if (!itemId) return [];
    return global.store
      .getAll("product_item_warehouse")
      .filter(function (p) {
        return p.product_item_id === itemId && p.deleted_at == null;
      })
      .map(function (p) {
        var path = resolvePathFromBin(p.bin_id);
        return {
          _draftKey: newWhPlacementKey(),
          id: p.id,
          warehouse_id: path.warehouse_id,
          zone_id: path.zone_id,
          shelf_id: path.shelf_id,
          rack_id: path.rack_id,
          bin_id: path.bin_id,
          quantity: String(placementQtyForStore(itemId, p.id)),
        };
      });
  }

  function binAvailableForItem(binId, productItemId, currentPlacementId) {
    var placement = global.store.getAll("product_item_warehouse").find(function (p) {
      return p.deleted_at == null && p.bin_id === binId;
    });
    if (!placement) return true;
    if (productItemId && placement.product_item_id === productItemId) return true;
    if (currentPlacementId && placement.id === currentPlacementId) return true;
    return false;
  }

  function clearWhCascadeFromLevel(row, level) {
    var levels = ["warehouse", "zone", "shelf", "rack", "bin"];
    var fields = ["warehouse_id", "zone_id", "shelf_id", "rack_id", "bin_id"];
    var idx = levels.indexOf(level);
    if (idx < 0) return;
    for (var i = idx + 1; i < fields.length; i++) {
      row[fields[i]] = null;
    }
  }

  function findWhPlacementRow(itemKey, rowKey) {
    var it = findItemDraftByKey(itemKey);
    if (!it) return null;
    ensureItemWarehouseDraft(it);
    return it.warehousePlacements.find(function (r) {
      return r._draftKey === rowKey;
    });
  }

  function warehouseCascadeSelectHtml(itemKey, row, level, itemId) {
    var lib = global.warehouseLib;
    if (!lib) return "";
    var loc = locale();
    var meta = {
      warehouse: { field: "warehouse_id", type: "warehouse", parentField: null, labelKey: "productList.wpLabelWarehouse" },
      zone: { field: "zone_id", type: "zone", parentField: "warehouse_id", labelKey: "productList.wpLabelZone" },
      shelf: { field: "shelf_id", type: "shelf", parentField: "zone_id", labelKey: "productList.wpLabelShelf" },
      rack: { field: "rack_id", type: "rack", parentField: "shelf_id", labelKey: "productList.wpLabelRack" },
      bin: { field: "bin_id", type: "bin", parentField: "rack_id", labelKey: "productList.wpLabelBin" },
    };
    var cfg = meta[level];
    if (!cfg) return "";
    var parentId = cfg.parentField ? row[cfg.parentField] : null;
    var disabled = level !== "warehouse" && (parentId == null || parentId === "");
    var selectClass =
      "product-list-form__lot-edit-input product-list-form__wh-cascade";
    var selectAttrs =
      ' data-i18n-placeholder-select="' +
      escapeAttr(cfg.labelKey) +
      '" data-plf-wh-cascade data-wh-level="' +
      level +
      '" data-item-key="' +
      escapeAttr(itemKey) +
      '" data-wh-row-key="' +
      escapeAttr(row._draftKey) +
      '"';
    if (disabled) {
      return (
        '<select class="' +
        selectClass +
        '" disabled' +
        selectAttrs +
        '><option value="" disabled selected></option></select>'
      );
    }
    var nodes =
      level === "warehouse"
        ? lib.childrenOf(null, "warehouse")
        : lib.childrenOf(Number(parentId), cfg.type);
    if (level === "bin" && itemId) {
      nodes = nodes.filter(function (n) {
        return binAvailableForItem(n.id, itemId, row.id);
      });
    }
    var val = row[cfg.field] != null ? String(row[cfg.field]) : "";
    var opts =
      '<option value="" disabled' +
      (!val ? " selected" : "") +
      "></option>" +
      nodes
        .map(function (n) {
          var sel = val === String(n.id) ? " selected" : "";
          return (
            '<option value="' +
            n.id +
            '"' +
            sel +
            ">" +
            escapeHtml(warehouseNodeLabel(n.id, loc)) +
            "</option>"
          );
        })
        .join("");
    return (
      '<select class="' +
      selectClass +
      '"' +
      selectAttrs +
      ">" +
      opts +
      "</select>"
    );
  }

  function syncItemWarehousePlacementsToStore(itemId, it) {
    ensureItemWarehouseDraft(it);
    var actor = global.auth && global.auth.getUser ? global.auth.getUser() : null;
    var actorId = actor && actor.id != null ? actor.id : null;
    var ts = now();
    var desiredByKey = {};
    it.warehousePlacements.forEach(function (r) {
      if (!r.bin_id) return;
      var key = r.id != null ? "id-" + r.id : "new-" + r._draftKey;
      desiredByKey[key] = r;
    });
    var existing = global.store.getAll("product_item_warehouse").filter(function (p) {
      return p.product_item_id === itemId && p.deleted_at == null;
    });
    existing.forEach(function (p) {
      var want = desiredByKey["id-" + p.id];
      if (!want) {
        global.store.update("product_item_warehouse", p.id, {
          deleted_at: ts,
          updated_at: ts,
          updated_by: actorId,
        });
        return;
      }
      if (Number(want.bin_id) !== p.bin_id) {
        if (!binAvailableForItem(Number(want.bin_id), itemId, p.id)) return;
        global.store.update("product_item_warehouse", p.id, {
          bin_id: Number(want.bin_id),
          updated_at: ts,
          updated_by: actorId,
        });
      }
      upsertPlacementStockQty(itemId, p.id, Number(want.quantity) || 0, actorId, ts);
      delete desiredByKey["id-" + p.id];
    });
    Object.keys(desiredByKey).forEach(function (k) {
      if (k.indexOf("id-") === 0) return;
      var r = desiredByKey[k];
      if (!r.bin_id || !binAvailableForItem(Number(r.bin_id), itemId, null)) return;
      var created = global.store.create("product_item_warehouse", {
        product_item_id: itemId,
        bin_id: Number(r.bin_id),
        deleted_at: null,
        created_at: ts,
        updated_at: ts,
        created_by: actorId,
        updated_by: actorId,
      });
      upsertPlacementStockQty(itemId, created.id, Number(r.quantity) || 0, actorId, ts);
    });
  }

  function upsertPlacementStockQty(itemId, placementId, qty, actorId, ts) {
    var stocks = global.store.getAll("product_item_stock").filter(function (s) {
      return (
        s.product_item_id === itemId &&
        s.product_item_warehouse_id === placementId &&
        s.deleted_at == null
      );
    });
    if (!stocks.length && qty <= 0) return;
    if (!stocks.length) {
      global.store.create("product_item_stock", {
        product_item_id: itemId,
        product_item_warehouse_id: placementId,
        order_quantity: qty,
        order_free_gift: 0,
        quantity: qty,
        remain_quantity: qty,
        cost_per_unit: 0,
        discount_per_unit: 0,
        vat_type: activeSettingVat().vat_type || "exclude",
        vat_rate: Number(activeSettingVat().rate) || 0,
        sell_price: 0,
        is_used: false,
        received_at: ts,
        created_at: ts,
        updated_at: ts,
        created_by: actorId,
        updated_by: actorId,
      });
      return;
    }
    stocks.forEach(function (s, idx) {
      if (idx === 0) {
        global.store.update("product_item_stock", s.id, {
          remain_quantity: qty,
          quantity: Math.max(Number(s.quantity) || 0, qty),
          updated_at: ts,
          updated_by: actorId,
        });
      }
    });
  }

  function warehouseNodeLabel(id, loc, opts) {
    opts = opts || {};
    if (id == null) return "—";
    var whLang = global.store.getAll("warehouse_list_language").filter(function (r) {
      return r.warehouse_list_id === id;
    });
    var th = whLang.find(function (r) {
      return r.locale === "th";
    });
    var en = whLang.find(function (r) {
      return r.locale === "en";
    });
    var wh = global.store.getById("warehouse_list", id);
    var sku = wh && wh.sku ? wh.sku : "";
    loc = loc || locale();
    var name =
      loc === "en"
        ? (en && en.name) || (th && th.name) || sku
        : (th && th.name) || (en && en.name) || sku;
    if (!name) return sku || "—";
    if (opts.includeSku === false) return name;
    return sku && name !== sku ? name + " (" + sku + ")" : name;
  }

  function itemDisplayName(itemId) {
    var loc = locale();
    var th = langRow("product_item_language", "product_item_id", itemId, "th");
    var en = langRow("product_item_language", "product_item_id", itemId, "en");
    if (loc === "en") return ((en && en.name) || (th && th.name) || "").trim();
    return ((th && th.name) || (en && en.name) || "").trim();
  }

  function totalStockForItem(itemId) {
    return global.store
      .getAll("product_item_stock")
      .filter(function (s) {
        return s.product_item_id === itemId;
      })
      .reduce(function (sum, s) {
        return sum + (Number(s.remain_quantity) || 0);
      }, 0);
  }

  function warehouseCountForItem(itemId) {
    var roots = {};
    global.store
      .getAll("product_item_warehouse")
      .filter(function (w) {
        return w.product_item_id === itemId && w.deleted_at == null;
      })
      .forEach(function (w) {
        var whId = resolvePathFromBin(w.bin_id).warehouse_id;
        if (whId != null) roots[whId] = true;
      });
    return Object.keys(roots).length;
  }

  function itemWarehouseCellHtml(itemId) {
    if (!itemId) {
      return '<span class="product-list-form__variant-dash">—</span>';
    }
    var count = warehouseCountForItem(itemId);
    return (
      '<div class="product-list__wh-cell plf-variant-no-toggle">' +
      "<span>" +
      escapeHtml(t("productList.warehouseCountLabel", { count: count })) +
      "</span>" +
      (count > 0
        ? '<button type="button" class="btn btn--sm product-list__wh-btn" data-wh-item="' +
          escapeAttr(String(itemId)) +
          '">' +
          escapeHtml(t("productList.viewMore")) +
          "</button>"
        : "") +
      "</div>"
    );
  }

  function ensureWarehouseDetailModal() {
    if (whDetailOverlay) return;
    whDetailOverlay = document.createElement("div");
    whDetailOverlay.className = "modal-overlay";
    whDetailOverlay.hidden = true;
    whDetailOverlay.innerHTML =
      '<div class="modal crud-modal crud-modal--wide" role="dialog" aria-modal="true">' +
      '<div class="modal__header"><h2 class="modal__title" id="plf-wh-detail-title"></h2>' +
      '<button type="button" class="modal__close" id="plf-wh-detail-close" aria-label="Close">' +
      '<img src="../assets/icons/x.svg" alt="" width="18" height="18" /></button></div>' +
      '<div class="modal__content" id="plf-wh-detail-content"></div>' +
      '<div class="modal__footer">' +
      '<button type="button" class="btn btn--primary" id="plf-wh-detail-ok" data-i18n="modal.ok"></button>' +
      "</div></div>";
    document.body.appendChild(whDetailOverlay);
    whDetailOverlay.querySelector("#plf-wh-detail-close").addEventListener("click", closeWarehouseDetailModal);
    whDetailOverlay.querySelector("#plf-wh-detail-ok").addEventListener("click", closeWarehouseDetailModal);
    whDetailOverlay.addEventListener("click", function (e) {
      if (e.target === whDetailOverlay) closeWarehouseDetailModal();
    });
  }

  function closeWarehouseDetailModal() {
    if (!whDetailOverlay) return;
    whDetailOverlay.hidden = true;
    document.body.classList.remove("modal-open");
  }

  function ensureItemLotStockModal() {
    if (lotStockOverlay) return;
    lotStockOverlay = document.createElement("div");
    lotStockOverlay.className = "modal-overlay";
    lotStockOverlay.hidden = true;
    lotStockOverlay.innerHTML =
      '<div class="modal crud-modal crud-modal--lot-stock" role="dialog" aria-modal="true">' +
      '<div class="product-list-form__lot-hero">' +
      '<div class="product-list-form__lot-head">' +
      '<div class="product-list-form__lot-head-main">' +
      '<span class="product-list-form__lot-head-icon" aria-hidden="true">' +
      '<img src="../assets/icons/package.svg" alt="" width="22" height="22" /></span>' +
      '<h2 class="product-list-form__lot-title" id="plf-lot-title" data-i18n="productListForm.itemLotDialogTitle"></h2>' +
      "</div>" +
      '<button type="button" class="modal__close" id="plf-lot-close" aria-label="Close">' +
      '<img src="../assets/icons/x.svg" alt="" width="18" height="18" /></button></div>' +
      '<div class="product-list-form__lot-meta">' +
      '<div class="product-list-form__lot-meta-item">' +
      '<span class="product-list-form__lot-meta-label" data-i18n="productListForm.itemLotMetaSku"></span>' +
      '<span class="product-list-form__lot-sku-badge" id="plf-lot-sku"></span></div>' +
      '<div class="product-list-form__lot-meta-item">' +
      '<span class="product-list-form__lot-meta-label" data-i18n="productListForm.itemLotMetaName"></span>' +
      '<span class="product-list-form__lot-meta-value" id="plf-lot-name"></span></div></div>' +
      '<div id="plf-lot-summary"></div></div>' +
      '<div class="modal__content product-list-form__lot-content" id="plf-lot-content"></div>' +
      '<div class="modal__footer">' +
      '<button type="button" class="btn btn--primary" id="plf-lot-ok" data-i18n="modal.ok"></button>' +
      "</div></div>";
    document.body.appendChild(lotStockOverlay);
    lotStockOverlay.querySelector("#plf-lot-close").addEventListener("click", closeItemLotStockModal);
    lotStockOverlay.querySelector("#plf-lot-ok").addEventListener("click", closeItemLotStockModal);
    lotStockOverlay.addEventListener("click", function (e) {
      if (e.target === lotStockOverlay) closeItemLotStockModal();
    });
    bindLotModalOverlayEvents();
  }

  function getLotModalPageSize() {
    try {
      var v = parseInt(sessionStorage.getItem(LOT_MODAL_PAGE_SIZE_KEY), 10);
      if (LOT_MODAL_PAGE_SIZE_OPTIONS.indexOf(v) >= 0) return v;
    } catch (err) {
      /* ponytail: sessionStorage optional */
    }
    return 10;
  }

  function bindLotModalOverlayEvents() {
    if (lotModalEventsBound || !lotStockOverlay) return;
    lotModalEventsBound = true;
    lotStockOverlay.addEventListener("click", function (e) {
      var addBtn = e.target.closest(".plf-lot-add");
      if (addBtn && !addBtn.disabled) {
        e.preventDefault();
        if (lotModalItemId != null) openAddLotModal(lotModalItemId);
        return;
      }
      var editBtn = e.target.closest(".plf-lot-edit");
      if (editBtn) {
        e.preventDefault();
        lotModalEditStockId = Number(editBtn.getAttribute("data-stock-id"));
        if (lotModalItemId != null) renderItemLotStockModalContent(lotModalItemId);
        return;
      }
      var cancelBtn = e.target.closest(".plf-lot-cancel");
      if (cancelBtn) {
        e.preventDefault();
        lotModalEditStockId = null;
        if (lotModalItemId != null) renderItemLotStockModalContent(lotModalItemId);
        return;
      }
      var saveBtn = e.target.closest(".plf-lot-save");
      if (saveBtn) {
        e.preventDefault();
        var stockId = Number(saveBtn.getAttribute("data-stock-id"));
        var row = lotStockOverlay.querySelector('tr[data-stock-id="' + stockId + '"]');
        if (!row || !global.store) return;
        var stockRow = global.store.getById("product_item_stock", stockId);
        if (!stockRow) return;
        var patch = { updated_at: new Date().toISOString() };
        row.querySelectorAll(".product-list-form__lot-edit-input").forEach(function (inp) {
          var field = inp.getAttribute("data-lot-field");
          if (!field) return;
          patch[field] = Number(inp.value);
        });
        var usedCb = row.querySelector(".product-list-form__lot-edit-used");
        var wantUsed = usedCb ? usedCb.checked : stockRow.is_used;
        patch.is_used = wantUsed;
        global.store.update("product_item_stock", stockId, patch);
        setSingleUsedLot(stockRow.product_item_id, stockId, wantUsed);
        lotModalEditStockId = null;
        global.toast.show(t("crud.saved"), "success");
        afterLotStockMutation();
        return;
      }
      var delBtn = e.target.closest(".plf-lot-delete");
      if (delBtn) {
        e.preventDefault();
        e.stopPropagation();
        var delId = Number(delBtn.getAttribute("data-stock-id"));
        confirmDestructive(function () {
          var ts = new Date().toISOString();
          global.store.update("product_item_stock", delId, { deleted_at: ts, updated_at: ts });
          if (lotModalEditStockId === delId) lotModalEditStockId = null;
          global.toast.show(t("crud.deleted"), "success");
          afterLotStockMutation();
        });
        return;
      }
      var poBtn = e.target.closest(".plf-lot-po-link");
      if (poBtn) {
        e.preventDefault();
        global.toast.show(t("page.comingSoon"), "info");
      }
    });
    lotStockOverlay.addEventListener("change", function (e) {
      if (e.target.id !== "plf-lot-page-size") return;
      var next = parseInt(e.target.value, 10);
      if (LOT_MODAL_PAGE_SIZE_OPTIONS.indexOf(next) < 0) return;
      lotModalPageSize = next;
      try {
        sessionStorage.setItem(LOT_MODAL_PAGE_SIZE_KEY, String(next));
      } catch (err2) {
        /* ignore */
      }
      lotModalPage = 1;
      if (lotModalItemId != null) renderItemLotStockModalContent(lotModalItemId);
    });
    lotStockOverlay.addEventListener("click", function (e) {
      if (!e.target.closest("#plf-lot-pager")) return;
      var prevBtn = e.target.closest("#plf-lot-page-prev");
      if (prevBtn && !prevBtn.disabled) {
        e.preventDefault();
        lotModalPage = Math.max(1, lotModalPage - 1);
        if (lotModalItemId != null) renderItemLotStockModalContent(lotModalItemId);
        return;
      }
      var nextBtn = e.target.closest("#plf-lot-page-next");
      if (nextBtn && !nextBtn.disabled) {
        e.preventDefault();
        lotModalPage += 1;
        if (lotModalItemId != null) renderItemLotStockModalContent(lotModalItemId);
        return;
      }
    });
  }

  function afterLotStockMutation() {
    var id = lotModalItemId;
    if (id == null) return;
    renderItemLotStockModalContent(id);
    if (rootEl) {
      collectDraftFromDom();
      render();
      lotStockOverlay.hidden = false;
      document.body.classList.add("modal-open");
      renderItemLotStockModalContent(id);
    }
  }

  function closeItemLotStockModal() {
    if (!lotStockOverlay) return;
    lotStockOverlay.hidden = true;
    document.body.classList.remove("modal-open");
    lotModalItemId = null;
  }

  function lotSortTier(lot) {
    var remain = Number(lot.remain_quantity) || 0;
    if (remain <= 0) return 2;
    return lot.is_used ? 0 : 1;
  }

  function itemStockLots(itemId) {
    return global.store
      .getAll("product_item_stock")
      .filter(function (s) {
        return s.product_item_id === itemId && s.deleted_at == null;
      })
      .sort(function (a, b) {
        var ta = lotSortTier(a);
        var tb = lotSortTier(b);
        if (ta !== tb) return ta - tb;
        var ca = a.created_at || "";
        var cb = b.created_at || "";
        if (ca !== cb) return ca < cb ? -1 : 1;
        return a.id - b.id;
      });
  }

  function formatBinPathLabel(binId) {
    if (binId == null) return "";
    if (global.warehouseBinCascadePicker && global.warehouseBinCascadePicker.breadcrumbForBin) {
      return global.warehouseBinCascadePicker.breadcrumbForBin(binId);
    }
    var bin = global.store.getById("warehouse_list", binId);
    return bin && bin.sku ? bin.sku : "";
  }

  function ensurePlacement(productItemId, binId) {
    var existing = global.store.getAll("product_item_warehouse").find(function (p) {
      return (
        p.deleted_at == null && p.product_item_id === productItemId && p.bin_id === binId
      );
    });
    if (existing) return existing.id;
    var actor = global.auth && global.auth.getUser ? global.auth.getUser() : null;
    var actorId = actor && actor.id != null ? actor.id : null;
    var ts = new Date().toISOString();
    var row = global.store.create("product_item_warehouse", {
      product_item_id: productItemId,
      bin_id: binId,
      created_at: ts,
      updated_at: ts,
      created_by: actorId,
      updated_by: actorId,
    });
    return row.id;
  }

  function todayDateInputValue() {
    var d = new Date();
    var m = String(d.getMonth() + 1).padStart(2, "0");
    var day = String(d.getDate()).padStart(2, "0");
    return d.getFullYear() + "-" + m + "-" + day;
  }

  function ensureLotAddModal() {
    if (lotAddOverlay) return;
    lotAddOverlay = document.createElement("div");
    lotAddOverlay.className = "modal-overlay modal-overlay--stack-1";
    lotAddOverlay.hidden = true;
    lotAddOverlay.innerHTML =
      '<div class="modal crud-modal crud-modal--wide" role="dialog" aria-modal="true">' +
      '<div class="modal__header"><h2 class="modal__title" data-i18n="productListForm.itemLotAddDialogTitle"></h2>' +
      '<button type="button" class="modal__close" id="plf-lot-add-close" aria-label="Close">' +
      '<img src="../assets/icons/x.svg" alt="" width="18" height="18" /></button></div>' +
      '<form id="plf-lot-add-form" class="modal__content crud-form product-list-form__lot-add-form" novalidate></form>' +
      '<div class="modal__footer">' +
      '<button type="button" class="btn" id="plf-lot-add-cancel" data-i18n="crud.cancel"></button>' +
      '<button type="submit" form="plf-lot-add-form" class="btn btn--primary" data-i18n="crud.save"></button>' +
      "</div></div>";
    document.body.appendChild(lotAddOverlay);
    lotAddOverlay.querySelector("#plf-lot-add-close").addEventListener("click", closeAddLotModal);
    lotAddOverlay.querySelector("#plf-lot-add-cancel").addEventListener("click", closeAddLotModal);
    lotAddOverlay.addEventListener("click", function (e) {
      if (e.target === lotAddOverlay) closeAddLotModal();
    });
    bindLotAddModalEvents();
  }

  function bindLotAddModalEvents() {
    if (lotAddEventsBound || !lotAddOverlay) return;
    lotAddEventsBound = true;
    lotAddOverlay.querySelector("#plf-lot-add-form").addEventListener("submit", function (e) {
      e.preventDefault();
      saveAddLotForm();
    });
    lotAddOverlay.addEventListener("click", function (e) {
      if (e.target.closest("#plf-lot-add-pick-bin")) {
        e.preventDefault();
        openLotAddBinPicker();
      }
    });
  }

  function lotAddFieldHtml(id, labelKey, kind, opts) {
    opts = opts || {};
    var req = opts.required ? '<span class="form-field__required" aria-hidden="true">*</span>' : "";
    var phKind = kind === "select" ? "select" : "input";
    var phAttr =
      phKind === "select"
        ? ' data-i18n-placeholder-select="' + labelKey + '"'
        : ' data-i18n-placeholder-input="' + labelKey + '"';
    var input =
      kind === "date"
        ? '<input type="date" id="' + id + '" name="' + id + '"' + (opts.required ? " required" : "") + " />"
        : '<input type="number" step="any" id="' + id + '" name="' + id + '"' +
          (opts.required ? " required" : "") +
          phAttr +
          ' placeholder="" />';
    return (
      '<div class="form-field" data-field-wrap="' +
      id +
      '"><label for="' +
      id +
      '"><span data-i18n="' +
      labelKey +
      '"></span>' +
      req +
      "</label>" +
      input +
      '<div class="form-field__error-slot" aria-live="polite"><p class="form-field__error" hidden role="alert"></p></div></div>'
    );
  }

  function lotAddSupplierSelectOptions(productItemId) {
    var allOpts = supplierOptionsList();
    var links = itemSuppliersForLot(productItemId);
    var opts;
    if (links.length) {
      var ids = {};
      links.forEach(function (row) {
        ids[String(row.supplier_user_id)] = true;
      });
      opts = allOpts.filter(function (o) {
        return ids[o.value];
      });
    } else {
      opts = allOpts;
    }
    return opts
      .map(function (o) {
        return (
          '<option value="' +
          escapeAttr(o.value) +
          '">' +
          escapeHtml(o.label) +
          "</option>"
        );
      })
      .join("");
  }

  function renderLotAddFormContent() {
    if (!lotAddOverlay) return;
    var form = lotAddOverlay.querySelector("#plf-lot-add-form");
    if (!form) return;
    var binDisplay = lotAddBinLabel || "";
    form.innerHTML =
      '<div class="form-field" data-field-wrap="plf-lot-add-bin">' +
      '<label><span data-i18n="productListForm.itemLotFieldBin"></span>' +
      '<span class="form-field__required" aria-hidden="true">*</span></label>' +
      '<input type="hidden" id="plf-lot-add-bin-id" value="' +
      escapeAttr(lotAddBinId != null ? String(lotAddBinId) : "") +
      '" />' +
      '<div class="product-list-form__bin-trigger-row">' +
      '<input type="text" readonly id="plf-lot-add-bin-display" value="' +
      escapeAttr(binDisplay) +
      '" data-i18n-placeholder-input="productListForm.itemLotFieldBin" placeholder="" />' +
      '<button type="button" class="btn" id="plf-lot-add-pick-bin" data-i18n="productListForm.itemLotPickBin"></button></div>' +
      '<div class="form-field__error-slot" aria-live="polite"><p class="form-field__error" hidden role="alert"></p></div></div>' +
      lotAddFieldHtml("plf-lot-add-received", "productListForm.itemLotColReceived", "date", {
        required: true,
      }) +
      '<div class="form-field">' +
      '<label for="plf-lot-add-supplier"><span data-i18n="productListForm.itemLotColPartner"></span></label>' +
      '<select id="plf-lot-add-supplier" data-i18n-placeholder-select="productListForm.itemLotColPartner">' +
      '<option value="" disabled selected></option>' +
      lotAddSupplierSelectOptions(lotAddItemId) +
      "</select></div>" +
      '<div class="crud-form__row">' +
      lotAddFieldHtml("plf-lot-add-order-qty", "productListForm.itemLotColOrderQty", "number", {}) +
      lotAddFieldHtml("plf-lot-add-free", "productListForm.itemLotColFreeGift", "number", {}) +
      "</div>" +
      '<div class="crud-form__row">' +
      lotAddFieldHtml("plf-lot-add-quantity", "productListForm.itemLotColReceivedQty", "number", {
        required: true,
      }) +
      lotAddFieldHtml("plf-lot-add-remain", "productListForm.itemLotColRemain", "number", {
        required: true,
      }) +
      "</div>" +
      '<div class="crud-form__row">' +
      lotAddFieldHtml("plf-lot-add-cost", "productListForm.itemLotColCost", "number", {
        required: true,
      }) +
      lotAddFieldHtml("plf-lot-add-discount", "productListForm.itemLotColDiscountUnit", "number", {}) +
      "</div>" +
      lotAddFieldHtml("plf-lot-add-sell", "productListForm.itemLotColSell", "number", {
        required: true,
      }) +
      '<div class="form-field form-field--switch">' +
      '<span data-i18n="productListForm.itemLotFieldIsUsed"></span>' +
      '<label class="crud-switch">' +
      '<input type="checkbox" id="plf-lot-add-is-used" role="switch" aria-label="' +
      escapeAttr(t("productListForm.itemLotFieldIsUsed")) +
      '" /><span class="crud-switch__track"><span class="crud-switch__thumb"></span></span></label></div>';
    var recv = form.querySelector("#plf-lot-add-received");
    if (recv && !recv.value) recv.value = todayDateInputValue();
    var disc = form.querySelector("#plf-lot-add-discount");
    if (disc && !disc.value) disc.value = "0";
    if (global.i18n) global.i18n.init();
  }

  function openLotAddBinPicker() {
    if (lotAddItemId == null || !global.warehouseBinCascadePicker) return;
    global.warehouseBinCascadePicker.open({
      productItemId: lotAddItemId,
      valueBinId: lotAddBinId,
      onConfirm: function (binId, label) {
        lotAddBinId = binId;
        lotAddBinLabel = label;
        var form = lotAddOverlay && lotAddOverlay.querySelector("#plf-lot-add-form");
        if (!form) return;
        var hid = form.querySelector("#plf-lot-add-bin-id");
        var disp = form.querySelector("#plf-lot-add-bin-display");
        if (hid) hid.value = String(binId);
        if (disp) disp.value = label;
        var wrap = lotAddOverlay.querySelector('[data-field-wrap="plf-lot-add-bin"]');
        clearFieldError(wrap);
      },
    });
  }

  function openAddLotModal(itemId) {
    if (lotModalEditStockId != null) {
      global.toast.show(t("productListForm.itemLotAddWhileEditing"), "warning");
      return;
    }
    ensureLotAddModal();
    lotAddItemId = itemId;
    lotAddBinId = null;
    lotAddBinLabel = "";
    renderLotAddFormContent();
    lotAddOverlay.hidden = false;
    document.body.classList.add("modal-open");
    if (global.i18n) global.i18n.init();
  }

  function closeAddLotModal() {
    if (!lotAddOverlay) return;
    lotAddOverlay.hidden = true;
    lotAddItemId = null;
    lotAddBinId = null;
    lotAddBinLabel = "";
    if (lotStockOverlay && !lotStockOverlay.hidden) {
      document.body.classList.add("modal-open");
    } else {
      document.body.classList.remove("modal-open");
    }
  }

  function validateAddLotForm(form) {
    var ok = true;
    form.querySelectorAll("[data-field-wrap]").forEach(function (wrap) {
      clearFieldError(wrap);
    });
    var binWrap = form.querySelector('[data-field-wrap="plf-lot-add-bin"]');
    var binId = form.querySelector("#plf-lot-add-bin-id");
    if (!binId || !binId.value.trim()) {
      showFieldError(binWrap, t("error.required"));
      ok = false;
    }
    ["plf-lot-add-received", "plf-lot-add-quantity", "plf-lot-add-remain", "plf-lot-add-cost", "plf-lot-add-sell"].forEach(
      function (fid) {
        var wrap = form.querySelector('[data-field-wrap="' + fid + '"]');
        var inp = form.querySelector("#" + fid);
        if (!inp || String(inp.value).trim() === "") {
          showFieldError(wrap, t("error.required"));
          ok = false;
        }
      }
    );
    return ok;
  }

  function saveAddLotForm() {
    if (!lotAddOverlay || lotAddItemId == null) return;
    var form = lotAddOverlay.querySelector("#plf-lot-add-form");
    if (!form || !validateAddLotForm(form)) return;
    var binId = Number(form.querySelector("#plf-lot-add-bin-id").value);
    var placementId = ensurePlacement(lotAddItemId, binId);
    var qty = Number(form.querySelector("#plf-lot-add-quantity").value) || 0;
    var remain = Number(form.querySelector("#plf-lot-add-remain").value);
    if (!Number.isFinite(remain)) remain = qty;
    var recvDate = form.querySelector("#plf-lot-add-received").value;
    var receivedAt = recvDate ? new Date(recvDate + "T12:00:00").toISOString() : new Date().toISOString();
    var actor = global.auth && global.auth.getUser ? global.auth.getUser() : null;
    var actorId = actor && actor.id != null ? actor.id : null;
    var ts = new Date().toISOString();
    var isUsed = form.querySelector("#plf-lot-add-is-used").checked;
    var supplierEl = form.querySelector("#plf-lot-add-supplier");
    var supplierUserId =
      supplierEl && supplierEl.value.trim() !== "" ? Number(supplierEl.value) : null;
    var created = global.store.create("product_item_stock", {
      product_item_id: lotAddItemId,
      product_item_warehouse_id: placementId,
      supplier_user_id: supplierUserId,
      order_quantity: Number(form.querySelector("#plf-lot-add-order-qty").value) || 0,
      order_free_gift: Number(form.querySelector("#plf-lot-add-free").value) || 0,
      quantity: qty,
      remain_quantity: remain,
      cost_per_unit: Number(form.querySelector("#plf-lot-add-cost").value) || 0,
      discount_per_unit: Number(form.querySelector("#plf-lot-add-discount").value) || 0,
      vat_type: activeSettingVat().vat_type || "exclude",
      vat_rate: Number(activeSettingVat().rate) || 0,
      sell_price: Number(form.querySelector("#plf-lot-add-sell").value) || 0,
      is_used: isUsed,
      received_at: receivedAt,
      created_at: ts,
      updated_at: ts,
      created_by: actorId,
      updated_by: actorId,
    });
    if (isUsed) setSingleUsedLot(lotAddItemId, created.id, true);
    closeAddLotModal();
    global.toast.show(t("crud.saved"), "success");
    afterLotStockMutation();
  }

  function setSingleUsedLot(productItemId, stockId, isUsed) {
    if (!global.store || productItemId == null || stockId == null) return;
    var ts = new Date().toISOString();
    if (isUsed) {
      global.store.getAll("product_item_stock").forEach(function (row) {
        if (
          row.deleted_at != null ||
          row.product_item_id !== productItemId ||
          row.id === stockId
        ) {
          return;
        }
        if (row.is_used) {
          global.store.update("product_item_stock", row.id, {
            is_used: false,
            updated_at: ts,
          });
        }
      });
      global.store.update("product_item_stock", stockId, {
        is_used: true,
        updated_at: ts,
      });
    } else {
      global.store.update("product_item_stock", stockId, {
        is_used: false,
        updated_at: ts,
      });
    }
  }

  function lotQtyNum(lot, field, fallback) {
    var n = Number(lot[field]);
    return Number.isFinite(n) ? n : fallback;
  }

  function lotQuantity(lot) {
    var q = lotQtyNum(lot, "quantity", 0);
    if (q <= 0) q = lotQtyNum(lot, "remain_quantity", 0);
    return q;
  }

  function lotRowDerived(lot) {
    var q = lotQuantity(lot);
    var cost = lotQtyNum(lot, "cost_per_unit", 0);
    var discU = lotQtyNum(lot, "discount_per_unit", 0);
    var actualU = cost - discU;
    var netTotal = q * cost;
    var discTotal = q * discU;
    var actualTotal = q * actualU;
    var sell = lotQtyNum(lot, "sell_price", 0);
    var profit = sell - cost;
    var margin = sell > 0 ? (profit / sell) * 100 : null;
    return {
      q: q,
      cost: cost,
      discU: discU,
      actualU: actualU,
      netTotal: netTotal,
      discTotal: discTotal,
      actualTotal: actualTotal,
      sell: sell,
      profit: profit,
      margin: margin,
    };
  }

  function lotBinSku(stockRow) {
    var pw = global.store.getById("product_item_warehouse", stockRow.product_item_warehouse_id);
    if (!pw || pw.bin_id == null) return "—";
    var bin = global.store.getById("warehouse_list", pw.bin_id);
    return bin && bin.sku ? bin.sku : "—";
  }

  function lotRemainStatus(remain, minStock) {
    var r = Number(remain) || 0;
    var m = Number(minStock) || 0;
    if (r <= 0) return { key: "productListForm.itemLotStatusOut", tone: "out" };
    if (m > 0 && r <= m) return { key: "productListForm.itemLotStatusLow", tone: "low" };
    return { key: "productListForm.itemLotStatusOk", tone: "ok" };
  }

  function lotModalPageSizeSelectHtml(pageSize) {
    return LOT_MODAL_PAGE_SIZE_OPTIONS.map(function (n) {
      return (
        '<option value="' +
        n +
        '"' +
        (n === pageSize ? " selected" : "") +
        ">" +
        n +
        "</option>"
      );
    }).join("");
  }

  function lotModalPaginationHtml(page, pageSize, total, totalPages) {
    if (total === 0) return "";
    var prevDisabled = page <= 1;
    var nextDisabled = page >= totalPages;
    var from = (page - 1) * pageSize + 1;
    var to = Math.min(page * pageSize, total);
    return (
      '<div class="crud-pagination__bar">' +
      '<div class="crud-pagination__size">' +
      '<select class="crud-pagination__select" id="plf-lot-page-size" aria-label="' +
      escapeAttr(t("crud.rowsPerPage")) +
      '">' +
      lotModalPageSizeSelectHtml(pageSize) +
      "</select>" +
      '<span class="crud-pagination__total">' +
      escapeHtml(t("crud.showing", { from: from, to: to, total: total })) +
      "</span></div>" +
      '<div class="crud-pagination__pages" role="group" aria-label="' +
      escapeAttr(t("crud.pageOf", { page: page, total: totalPages })) +
      '">' +
      escapeHtml(t("crud.pageOf", { page: page, total: totalPages })) +
      "</div>" +
      '<div class="crud-pagination__nav">' +
      '<button type="button" class="crud-pagination__nav-btn crud-pagination__nav-btn--text" id="plf-lot-page-prev"' +
      (prevDisabled ? " disabled" : "") +
      '><img src="../assets/icons/chevron-left.svg" alt="" width="16" height="16" /><span data-i18n="crud.prev"></span></button>' +
      '<button type="button" class="crud-pagination__nav-btn crud-pagination__nav-btn--text" id="plf-lot-page-next"' +
      (nextDisabled ? " disabled" : "") +
      '><span data-i18n="crud.next"></span><img src="../assets/icons/chevron-right.svg" alt="" width="16" height="16" /></button>' +
      "</div></div>"
    );
  }

  function lotEditInput(field, lot) {
    var val = lot[field];
    if (val == null || val === "") val = 0;
    return (
      '<input type="number" class="product-list-form__lot-edit-input" step="any" data-lot-field="' +
      escapeAttr(field) +
      '" value="' +
      escapeAttr(String(val)) +
      '" />'
    );
  }

  function renderItemLotStockModalContent(itemId) {
    if (!lotStockOverlay) return;
    var content = lotStockOverlay.querySelector("#plf-lot-content");
    var summaryEl = lotStockOverlay.querySelector("#plf-lot-summary");
    var itemRow = itemStoreRow(itemId);
    var lots = itemStockLots(itemId);
    var minStock = itemRow ? Number(itemRow.minimum_stock) || 0 : 0;
    var unitKey = unitLabelKey(itemRow && itemRow.unit ? itemRow.unit : "piece");
    var unitLabel = t(unitKey);
    var currencySuffix = t("productListForm.itemLotCurrencySuffix");

    var totalReceived = 0;
    var costWeighted = 0;
    var sellWeighted = 0;
    lots.forEach(function (lot) {
      var q = Number(lot.quantity);
      if (!Number.isFinite(q) || q <= 0) q = Number(lot.remain_quantity) || 0;
      totalReceived += q;
      costWeighted += (Number(lot.cost_per_unit) || 0) * q;
      sellWeighted += (Number(lot.sell_price) || 0) * q;
    });
    var avgCost = totalReceived > 0 ? costWeighted / totalReceived : 0;
    var avgSell = totalReceived > 0 ? sellWeighted / totalReceived : 0;
    var avgProfit = avgSell - avgCost;
    var marginPct = avgSell > 0 ? ((avgProfit / avgSell) * 100).toFixed(2) : "—";

    var summaryHtml =
      '<div class="product-list-form__lot-summary">' +
      '<div class="product-list-form__lot-stat product-list-form__lot-stat--blue">' +
      '<span class="product-list-form__lot-stat-icon" aria-hidden="true">' +
      '<img src="../assets/icons/package.svg" alt="" width="20" height="20" /></span>' +
      '<div class="product-list-form__lot-stat-body">' +
      '<span class="product-list-form__lot-stat-label" data-i18n="productListForm.itemLotSummaryReceived"></span>' +
      '<span class="product-list-form__lot-stat-value">' +
      escapeHtml(formatQty(totalReceived)) +
      ' <span class="product-list-form__lot-stat-unit">' +
      escapeHtml(unitLabel) +
      "</span></span></div></div>" +
      '<div class="product-list-form__lot-stat product-list-form__lot-stat--green">' +
      '<span class="product-list-form__lot-stat-icon" aria-hidden="true">' +
      '<img src="../assets/icons/coins.svg" alt="" width="20" height="20" /></span>' +
      '<div class="product-list-form__lot-stat-body">' +
      '<span class="product-list-form__lot-stat-label" data-i18n="productListForm.itemLotSummaryAvgCost"></span>' +
      '<span class="product-list-form__lot-stat-value">' +
      escapeHtml(formatMoney(avgCost)) +
      ' <span class="product-list-form__lot-stat-unit">' +
      escapeHtml(currencySuffix) +
      "</span></span></div></div>" +
      '<div class="product-list-form__lot-stat product-list-form__lot-stat--orange">' +
      '<span class="product-list-form__lot-stat-icon" aria-hidden="true">' +
      '<img src="../assets/icons/shopping-bag.svg" alt="" width="20" height="20" /></span>' +
      '<div class="product-list-form__lot-stat-body">' +
      '<span class="product-list-form__lot-stat-label" data-i18n="productListForm.itemLotSummaryAvgSell"></span>' +
      '<span class="product-list-form__lot-stat-value">' +
      escapeHtml(formatMoney(avgSell)) +
      ' <span class="product-list-form__lot-stat-unit">' +
      escapeHtml(currencySuffix) +
      "</span></span></div></div>" +
      '<div class="product-list-form__lot-stat product-list-form__lot-stat--profit">' +
      '<span class="product-list-form__lot-stat-icon" aria-hidden="true">' +
      '<img src="../assets/icons/chart-pie.svg" alt="" width="20" height="20" /></span>' +
      '<div class="product-list-form__lot-stat-body">' +
      '<span class="product-list-form__lot-stat-label" data-i18n="productListForm.itemLotSummaryAvgProfit"></span>' +
      '<span class="product-list-form__lot-stat-value">' +
      escapeHtml(formatMoney(avgProfit)) +
      ' <span class="product-list-form__lot-stat-unit">' +
      escapeHtml(currencySuffix) +
      "</span></span>" +
      (marginPct !== "—"
        ? '<span class="product-list-form__lot-stat-margin">' + escapeHtml(String(marginPct)) + "%</span>"
        : "") +
      "</div></div></div>";
    if (summaryEl) summaryEl.innerHTML = summaryHtml;

    lotModalPageSize = getLotModalPageSize();
    var pageSize = lotModalPageSize;
    var totalPages = Math.max(1, Math.ceil(lots.length / pageSize));
    if (lotModalPage > totalPages) lotModalPage = totalPages;
    var slice = lots.slice((lotModalPage - 1) * pageSize, lotModalPage * pageSize);

    var foot = {
      order: 0,
      free: 0,
      qty: 0,
      remain: 0,
      netTotal: 0,
      discTotal: 0,
      actualTotal: 0,
    };
    lots.forEach(function (lot) {
      var d = lotRowDerived(lot);
      foot.order += lotQtyNum(lot, "order_quantity", 0);
      foot.free += lotQtyNum(lot, "order_free_gift", 0);
      foot.qty += d.q;
      foot.remain += lotQtyNum(lot, "remain_quantity", 0);
      foot.netTotal += d.netTotal;
      foot.discTotal += d.discTotal;
      foot.actualTotal += d.actualTotal;
    });

    var tableBody = slice.length
      ? slice
          .map(function (lot, idx) {
            var lotNum = (lotModalPage - 1) * pageSize + idx + 1;
            var editing = lotModalEditStockId === lot.id;
            var recvIso = lot.received_at || lot.created_at;
            var remain = lotQtyNum(lot, "remain_quantity", 0);
            var st = lotRemainStatus(remain, minStock);
            var d = lotRowDerived(lot);
            var poInfo = lotPartnerAndPo(lot);
            var binSku = lotBinSku(lot);
            var usedStar = lot.is_used
              ? '<span class="product-list-form__lot-used" title="' +
                escapeAttr(t("productListForm.itemLotActiveLot")) +
                '">' +
                '<img src="../assets/icons/star.svg" alt="" width="14" height="14" /></span>'
              : "";
            var poLine = poInfo.poSku
              ? '<button type="button" class="product-list-form__lot-po-link plf-lot-po-link">' +
                escapeHtml(poInfo.poSku) +
                "</button>"
              : "";
            var partnerCell =
              '<td><div class="product-list-form__lot-partner">' +
              escapeHtml(poInfo.partner) +
              '</div><div class="product-list-form__lot-po-line">' +
              poLine +
              "</div></td>";
            var actions;
            if (editing) {
              actions =
                '<div class="product-list-form__lot-actions">' +
                '<label class="crud-switch product-list-form__lot-used-edit" title="' +
                escapeAttr(t("productListForm.itemLotFieldIsUsed")) +
                '">' +
                '<input type="checkbox" class="product-list-form__lot-edit-used" role="switch"' +
                (lot.is_used ? " checked" : "") +
                ' aria-label="' +
                escapeAttr(t("productListForm.itemLotFieldIsUsed")) +
                '" /><span class="crud-switch__track"><span class="crud-switch__thumb"></span></span></label>' +
                '<button type="button" class="product-list-form__lot-action product-list-form__lot-action--save plf-lot-save" data-stock-id="' +
                lot.id +
                '" aria-label="' +
                escapeAttr(t("crud.save")) +
                '"><img src="../assets/icons/check.svg" alt="" width="16" height="16" /></button>' +
                '<button type="button" class="product-list-form__lot-action product-list-form__lot-action--cancel plf-lot-cancel" aria-label="' +
                escapeAttr(t("crud.cancel")) +
                '"><img src="../assets/icons/x.svg" alt="" width="16" height="16" /></button></div>';
            } else {
              actions =
                '<div class="product-list-form__lot-actions">' +
                '<button type="button" class="product-list-form__lot-action product-list-form__lot-action--edit plf-lot-edit" data-stock-id="' +
                lot.id +
                '" aria-label="' +
                escapeAttr(t("crud.edit")) +
                '"><img src="../assets/icons/pencil.svg" alt="" width="16" height="16" /></button>' +
                '<button type="button" class="product-list-form__lot-action product-list-form__lot-action--delete plf-lot-delete" data-stock-id="' +
                lot.id +
                '" aria-label="' +
                escapeAttr(t("crud.delete")) +
                '"><img src="../assets/icons/trash-2.svg" alt="" width="16" height="16" /></button></div>';
            }
            function numCell(field, display, extraClass) {
              var cls = "data-table__col-numeric" + (extraClass ? " " + extraClass : "");
              if (editing) {
                return '<td class="' + cls + '">' + lotEditInput(field, lot) + "</td>";
              }
              return '<td class="' + cls + '">' + escapeHtml(display) + "</td>";
            }
            var marginPct =
              d.margin != null && Number.isFinite(d.margin) ? d.margin.toFixed(2) : null;
            var profitCell =
              '<td class="data-table__col-numeric product-list-form__lot-profit-col">' +
              '<span class="product-list-form__lot-profit">' +
              escapeHtml(formatMoney(d.profit)) +
              "</span>" +
              (marginPct != null
                ? '<span class="product-list-form__lot-profit-pct">' +
                  escapeHtml(t("productListForm.itemLotProfitPctLine", { pct: marginPct })) +
                  "</span>"
                : "") +
              "</td>";
            return (
              '<tr data-stock-id="' +
              lot.id +
              (editing ? '" class="product-list-form__lot-row--editing"' : '"') +
              ">" +
              "<td><div class=\"product-list-form__lot-id\">" +
              escapeHtml("#Lot " + lotNum) +
              usedStar +
              '</div><div class="product-list-form__lot-bin">' +
              escapeHtml(binSku) +
              "</div></td>" +
              "<td>" +
              escapeHtml(global.i18n ? global.i18n.formatDate(recvIso) : "—") +
              "</td>" +
              partnerCell +
              "<td>" +
              escapeHtml(unitLabel) +
              "</td>" +
              numCell("order_quantity", formatQty(lot.order_quantity)) +
              numCell("order_free_gift", formatQty(lot.order_free_gift)) +
              numCell("quantity", formatQty(d.q), "product-list-form__lot-qty-received") +
              (editing
                ? '<td class="data-table__col-numeric product-list-form__lot-remain-col">' +
                  lotEditInput("remain_quantity", lot) +
                  "</td>"
                : '<td class="data-table__col-numeric product-list-form__lot-remain-col"><div class="product-list-form__lot-remain">' +
                  '<span class="product-list-form__lot-remain-qty">' +
                  escapeHtml(formatQty(remain)) +
                  "</span>" +
                  '<span class="product-list-form__lot-status product-list-form__lot-status--' +
                  st.tone +
                  '" data-i18n="' +
                  escapeHtml(st.key) +
                  '"></span></div></td>') +
              numCell("cost_per_unit", formatMoney(d.cost)) +
              numCell("discount_per_unit", formatMoney(d.discU)) +
              '<td class="data-table__col-numeric product-list-form__lot-actual-unit">' +
              escapeHtml(formatMoney(d.actualU)) +
              "</td>" +
              '<td class="data-table__col-numeric">' +
              escapeHtml(formatMoney(d.netTotal)) +
              '</td><td class="data-table__col-numeric">' +
              escapeHtml(formatMoney(d.discTotal)) +
              '</td><td class="data-table__col-numeric product-list-form__lot-actual-total">' +
              escapeHtml(formatMoney(d.actualTotal)) +
              "</td>" +
              numCell("sell_price", formatMoney(d.sell)) +
              profitCell +
              '<td class="data-table__col-center data-table__actions-cell">' +
              actions +
              "</td></tr>"
            );
          })
          .join("")
      : '<tr><td colspan="' +
        LOT_MODAL_COLS +
        '" class="crud-empty" data-i18n="productListForm.itemLotEmpty"></td></tr>';

    var footAvgActualU = foot.qty > 0 ? foot.actualTotal / foot.qty : null;
    var lotTableClass =
      "data-table product-list-form__lot-table" +
      (lotModalEditStockId != null ? " product-list-form__lot-table--row-editing" : "");

    var thead =
      "<thead>" +
      '<tr class="product-list-form__lot-group-row">' +
      '<th colspan="4" class="product-list-form__lot-group--info">' +
      '<span class="product-list-form__lot-group-label"><img src="../assets/icons/info.svg" alt="" width="14" height="14" /><span data-i18n="productListForm.itemLotGroupLot"></span></span></th>' +
      '<th colspan="4" class="product-list-form__lot-group--qty">' +
      '<span class="product-list-form__lot-group-label"><img src="../assets/icons/package.svg" alt="" width="14" height="14" /><span data-i18n="productListForm.itemLotGroupQty"></span></span></th>' +
      '<th colspan="3" class="product-list-form__lot-group--unit">' +
      '<span class="product-list-form__lot-group-label"><img src="../assets/icons/coins.svg" alt="" width="14" height="14" /><span data-i18n="productListForm.itemLotGroupUnitCost"></span></span></th>' +
      '<th colspan="3" class="product-list-form__lot-group--total">' +
      '<span class="product-list-form__lot-group-label"><img src="../assets/icons/coins.svg" alt="" width="14" height="14" /><span data-i18n="productListForm.itemLotGroupTotalCost"></span></span></th>' +
      '<th colspan="2" class="product-list-form__lot-group--sell">' +
      '<span class="product-list-form__lot-group-label"><img src="../assets/icons/shopping-bag.svg" alt="" width="14" height="14" /><span data-i18n="productListForm.itemLotGroupSell"></span></span></th>' +
      '<th rowspan="2" class="data-table__actions-col data-table__col-center product-list-form__lot-group--actions"><span data-i18n="crud.actions"></span></th>' +
      "</tr><tr>" +
      '<th><span data-i18n="productListForm.itemLotColLot"></span></th>' +
      '<th><span data-i18n="productListForm.itemLotColReceived"></span></th>' +
      '<th><span data-i18n="productListForm.itemLotColPartnerPo"></span></th>' +
      '<th><span data-i18n="productListForm.itemUnit"></span></th>' +
      '<th class="data-table__col-numeric"><span data-i18n="productListForm.itemLotColOrderQty"></span></th>' +
      '<th class="data-table__col-numeric"><span data-i18n="productListForm.itemLotColFreeGift"></span></th>' +
      '<th class="data-table__col-numeric"><span data-i18n="productListForm.itemLotColReceivedQty"></span></th>' +
      '<th class="data-table__col-numeric"><span data-i18n="productListForm.itemLotColRemain"></span></th>' +
      '<th class="data-table__col-numeric"><span data-i18n="productListForm.itemLotColCost"></span></th>' +
      '<th class="data-table__col-numeric"><span data-i18n="productListForm.itemLotColDiscountUnit"></span></th>' +
      '<th class="data-table__col-numeric"><span data-i18n="productListForm.itemLotColActualUnit"></span></th>' +
      '<th class="data-table__col-numeric"><span data-i18n="productListForm.itemLotColNetTotal"></span></th>' +
      '<th class="data-table__col-numeric"><span data-i18n="productListForm.itemLotColDiscountTotal"></span></th>' +
      '<th class="data-table__col-numeric"><span data-i18n="productListForm.itemLotColActualTotal"></span></th>' +
      '<th class="data-table__col-numeric"><span data-i18n="productListForm.itemLotColSell"></span></th>' +
      '<th class="data-table__col-numeric"><span data-i18n="productListForm.itemLotColProfitUnit"></span></th>' +
      "</tr></thead>";

    var addFootBtn =
      lotModalEditStockId == null
        ? '<button type="button" class="btn btn--icon crud-add plf-lot-add" aria-label="' +
          escapeAttr(t("productListForm.itemLotAdd")) +
          '"><img src="../assets/icons/plus.svg" alt="" width="16" height="16" /></button>'
        : "";
    var tfoot =
      "<tfoot><tr class=\"product-list-form__lot-foot\">" +
      '<td colspan="4"><span data-i18n="productListForm.itemLotFooterTotal"></span></td>' +
      '<td class="data-table__col-numeric">' +
      escapeHtml(formatQty(foot.order)) +
      '</td><td class="data-table__col-numeric">' +
      escapeHtml(formatQty(foot.free)) +
      '</td><td class="data-table__col-numeric product-list-form__lot-qty-received">' +
      escapeHtml(formatQty(foot.qty)) +
      '</td><td class="data-table__col-numeric">' +
      escapeHtml(formatQty(foot.remain)) +
      '</td><td colspan="2"></td>' +
      '<td class="data-table__col-numeric product-list-form__lot-actual-unit">' +
      (footAvgActualU != null ? escapeHtml(formatMoney(footAvgActualU)) : "—") +
      '</td><td class="data-table__col-numeric">' +
      escapeHtml(formatMoney(foot.netTotal)) +
      '</td><td class="data-table__col-numeric">' +
      escapeHtml(formatMoney(foot.discTotal)) +
      '</td><td class="data-table__col-numeric product-list-form__lot-actual-total">' +
      escapeHtml(formatMoney(foot.actualTotal)) +
      '</td><td colspan="2"></td>' +
      '<td class="data-table__col-center data-table__actions-cell product-list-form__lot-actions-sticky">' +
      addFootBtn +
      "</td></tr></tfoot>";

    content.innerHTML =
      '<div class="crud-table-wrap"><div class="crud-table-wrap__body">' +
      "<table class=\"" +
      lotTableClass +
      '">' +
      thead +
      "<tbody>" +
      tableBody +
      "</tbody>" +
      tfoot +
      "</table></div></div>" +
      '<nav id="plf-lot-pager" class="crud-pagination" aria-label="Pagination">' +
      lotModalPaginationHtml(lotModalPage, pageSize, lots.length, totalPages) +
      "</nav>";

    if (global.i18n) global.i18n.init();
  }

  function openItemLotStockModal(itemId) {
    ensureItemLotStockModal();
    lotModalItemId = itemId;
    lotModalPage = 1;
    var itemRow = itemStoreRow(itemId);
    var sku = itemRow && itemRow.sku ? itemRow.sku : "—";
    var name = itemDisplayName(itemId) || "—";
    var skuEl = lotStockOverlay.querySelector("#plf-lot-sku");
    var nameEl = lotStockOverlay.querySelector("#plf-lot-name");
    if (skuEl) skuEl.textContent = sku;
    if (nameEl) nameEl.textContent = name;
    renderItemLotStockModalContent(itemId);
    lotStockOverlay.hidden = false;
    document.body.classList.add("modal-open");
    if (global.i18n) global.i18n.init();
  }

  function closeConfirmModal() {
    if (!confirmOverlay) return;
    confirmOverlay.hidden = true;
    document.body.classList.remove("modal-open");
  }

  function ensureConfirmModal() {
    if (confirmOverlay) return;
    confirmOverlay = document.createElement("div");
    confirmOverlay.className = "modal-overlay modal-overlay--stack-3";
    confirmOverlay.hidden = true;
    confirmOverlay.innerHTML =
      '<div class="modal crud-modal" role="dialog" aria-modal="true">' +
      '<div class="modal__header"><h2 class="modal__title" data-i18n="crud.delete"></h2>' +
      '<button type="button" class="modal__close" id="plf-confirm-close" aria-label="Close">' +
      '<img src="../assets/icons/x.svg" alt="" width="18" height="18" /></button></div>' +
      '<div class="modal__content"><p data-i18n="crud.confirmDelete"></p></div>' +
      '<div class="modal__footer">' +
      '<button type="button" class="btn" id="plf-confirm-cancel" data-i18n="crud.cancel"></button>' +
      '<button type="button" class="btn btn--primary crud-delete" id="plf-confirm-ok" data-i18n="crud.delete"></button>' +
      "</div></div>";
    document.body.appendChild(confirmOverlay);
    confirmOverlay.querySelector("#plf-confirm-cancel").addEventListener("click", closeConfirmModal);
    confirmOverlay.querySelector("#plf-confirm-close").addEventListener("click", closeConfirmModal);
    confirmOverlay.addEventListener("click", function (e) {
      if (e.target === confirmOverlay) closeConfirmModal();
    });
  }

  function confirmDestructive(fn) {
    ensureConfirmModal();
    confirmOverlay.hidden = false;
    document.body.classList.add("modal-open");
    if (global.i18n) global.i18n.init();
    confirmOverlay.querySelector("#plf-confirm-ok").onclick = function () {
      closeConfirmModal();
      fn();
    };
  }

  function openWarehouseDetailModal(itemId) {
    ensureWarehouseDetailModal();
    var loc = locale();
    var placements = global.store
      .getAll("product_item_warehouse")
      .filter(function (p) {
        return p.product_item_id === itemId && p.deleted_at == null;
      });
    var stockByWh = {};
    global.store
      .getAll("product_item_stock")
      .filter(function (s) {
        return s.product_item_id === itemId;
      })
      .forEach(function (s) {
        stockByWh[s.product_item_warehouse_id] = Number(s.remain_quantity) || 0;
      });
    var title = whDetailOverlay.querySelector("#plf-wh-detail-title");
    var content = whDetailOverlay.querySelector("#plf-wh-detail-content");
    title.setAttribute("data-i18n", "productList.wpDialogTitle");
    if (!placements.length) {
      content.innerHTML = '<p data-i18n="productList.wpEmpty"></p>';
    } else {
      content.innerHTML =
        '<table class="data-table"><thead><tr>' +
        "<th>" +
        escapeHtml(t("productList.wpLabelWarehouse")) +
        "</th><th>" +
        escapeHtml(t("productList.wpLabelZone")) +
        "</th><th>" +
        escapeHtml(t("productList.wpLabelShelf")) +
        "</th><th>" +
        escapeHtml(t("productList.wpLabelRack")) +
        "</th><th>" +
        escapeHtml(t("productList.wpLabelBin")) +
        "</th><th>" +
        escapeHtml(t("productList.wpLabelQty")) +
        "</th></tr></thead><tbody>" +
        placements
          .map(function (p) {
            var qty = stockByWh[p.id] != null ? stockByWh[p.id] : 0;
            var labelOpts = { includeSku: false };
            var path = resolvePathFromBin(p.bin_id);
            return (
              "<tr><td>" +
              escapeHtml(warehouseNodeLabel(path.warehouse_id, loc, labelOpts)) +
              "</td><td>" +
              escapeHtml(warehouseNodeLabel(path.zone_id, loc, labelOpts)) +
              "</td><td>" +
              escapeHtml(warehouseNodeLabel(path.shelf_id, loc, labelOpts)) +
              "</td><td>" +
              escapeHtml(warehouseNodeLabel(path.rack_id, loc, labelOpts)) +
              "</td><td>" +
              escapeHtml(warehouseNodeLabel(path.bin_id, loc, labelOpts)) +
              "</td><td>" +
              escapeHtml(String(qty)) +
              "</td></tr>"
            );
          })
          .join("") +
        "</tbody></table>";
    }
    whDetailOverlay.hidden = false;
    document.body.classList.add("modal-open");
    if (global.i18n) global.i18n.init();
  }

  function filteredCars() {
    var q = carSearch.trim().toLowerCase();
    return (draft.cars || []).filter(function (c) {
      if (!q) return true;
      var line =
        attrName(Number(c.brand_id)) +
        " " +
        attrName(Number(c.model_id)) +
        " " +
        attrName(Number(c.engine_id));
      return line.toLowerCase().indexOf(q) >= 0;
    });
  }

  function formatMoney(n) {
    if (n == null || Number.isNaN(Number(n))) return "—";
    return Number(n).toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 });
  }

  function formatQty(n) {
    if (n == null || Number.isNaN(Number(n))) return "—";
    return Number(n).toLocaleString(undefined, { maximumFractionDigits: 4 });
  }

  function stockTypeSellPrice(itemId) {
    if (!itemId || !global.store) return 0;
    var lots = global.store
      .getAll("product_item_stock")
      .filter(function (s) {
        return s.product_item_id === itemId && s.deleted_at == null;
      })
      .sort(function (a, b) {
        var ta = new Date(a.received_at || a.created_at).getTime();
        var tb = new Date(b.received_at || b.created_at).getTime();
        return ta - tb || a.id - b.id;
      });
    if (!lots.length) return 0;
    return Number(lots[0].sell_price) || 0;
  }

  function priceInclVat(exVat, vatRate) {
    var p = Number(exVat) || 0;
    var v = Number(vatRate) || 0;
    return p * (1 + v / 100);
  }

  function priceExFromIncl(inclVat, vatRate) {
    var incl = Number(inclVat);
    if (!Number.isFinite(incl)) return 0;
    var v = Number(vatRate) || 0;
    if (v <= -100) return incl;
    return incl / (1 + v / 100);
  }

  function activeSettingVat() {
    if (!global.store) return { vat_type: "exclude", rate: 0 };
    var rows = global.store.getAll("setting_vat").filter(function (r) {
      return r.deleted_at == null && r.is_active !== false;
    });
    if (!rows.length) return { vat_type: "exclude", rate: 0 };
    rows.sort(function (a, b) {
      return b.id - a.id;
    });
    return rows[0];
  }

  function storefrontPriceExFromBlock(block, field) {
    var kind = field === "price" ? "retail" : "wholesale";
    var editable = block.querySelector('[data-plf-storefront-editable="' + kind + '"]');
    if (!editable) return "";
    var raw = String(editable.value != null ? editable.value : "").trim();
    if (!raw) return "";
    var setting = activeSettingVat();
    var axis = editable.getAttribute("data-plf-price-axis");
    if (axis === "incl" || setting.vat_type === "include") {
      return String(priceExFromIncl(Number(raw), setting.rate));
    }
    return raw;
  }

  function resolveStorefrontPriceWhenDomMissing(prev, idRaw, storeField, currentVal) {
    if (String(currentVal).trim() !== "") return currentVal;
    if (prev && prev[storeField] != null && String(prev[storeField]).trim() !== "") {
      return String(prev[storeField]);
    }
    if (idRaw && global.store) {
      var row = global.store.getById("product_item", Number(idRaw));
      if (row && row[storeField] != null && String(row[storeField]).trim() !== "") {
        return String(row[storeField]);
      }
    }
    return currentVal;
  }

  function channelPriceExFromRow(tr) {
    if (!tr) return 0;
    var setting = activeSettingVat();
    var rate = Number(setting.rate) || 0;
    var vatType = setting.vat_type === "include" ? "include" : "exclude";
    var editable = tr.querySelector("[data-plf-channel-editable]");
    if (!editable) return 0;
    var raw = Number(editable.value);
    if (!Number.isFinite(raw)) raw = 0;
    var axis = editable.getAttribute("data-plf-price-axis");
    if (axis === "incl" || vatType === "include") {
      return priceExFromIncl(raw, rate);
    }
    return raw;
  }

  function syncChannelDerivedFromEditable(editable) {
    var tr = editable.closest("tr");
    if (!tr) return;
    var wrap = editable.closest(".product-list-form__channel-pricing");
    if (!wrap) return;
    var rate = Number(wrap.getAttribute("data-vat-rate")) || 0;
    var vatType = wrap.getAttribute("data-vat-type") || "exclude";
    var num = Number(editable.value);
    if (!Number.isFinite(num)) num = 0;
    var ex;
    var incl;
    var axis = editable.getAttribute("data-plf-price-axis");
    if (axis === "incl" || vatType === "include") {
      incl = num;
      ex = priceExFromIncl(incl, rate);
    } else {
      ex = num;
      incl = priceInclVat(ex, rate);
    }
    var exEl = tr.querySelector('[data-plf-channel-derived="ex"]');
    var inclEl = tr.querySelector('[data-plf-channel-derived="incl"]');
    if (exEl) exEl.textContent = formatMoney(ex);
    if (inclEl && inclEl.tagName !== "INPUT") inclEl.textContent = formatMoney(incl);
  }

  function channelRowPriceCells(ex, editing, vatSetting) {
    var rate =
      vatSetting.rate != null && vatSetting.rate !== ""
        ? Number(vatSetting.rate)
        : 0;
    var vatType = vatSetting.vat_type === "include" ? "include" : "exclude";
    var exNum = Number(ex) || 0;
    var incl = priceInclVat(exNum, rate);
    if (!editing) {
      return {
        ex: escapeHtml(formatMoney(exNum)),
        total: escapeHtml(formatMoney(incl)),
      };
    }
    if (vatType === "include") {
      return {
        ex:
          '<span class="product-list-form__derived" data-plf-channel-derived="ex">' +
          escapeHtml(formatMoney(exNum)) +
          "</span>",
        total:
          '<input type="number" class="product-list-form__lot-edit-input" step="0.01" min="0" data-plf-channel-editable data-plf-price-axis="incl" value="' +
          escapeAttr(String(incl)) +
          '" />',
      };
    }
    return {
      ex:
        '<input type="number" class="product-list-form__lot-edit-input" step="0.01" min="0" data-plf-channel-editable data-plf-price-axis="ex" value="' +
        escapeAttr(String(exNum)) +
        '" />',
      total:
        '<span class="product-list-form__derived" data-plf-channel-derived="incl">' +
        escapeHtml(formatMoney(incl)) +
        "</span>",
    };
  }

  function syncStorefrontDerivedFromEditable(editable) {
    var storefront = editable.closest(".product-list-form__storefront");
    if (!storefront) return;
    var rate = Number(storefront.getAttribute("data-vat-rate")) || 0;
    var vatType = storefront.getAttribute("data-vat-type") || "exclude";
    var kind = editable.getAttribute("data-plf-storefront-editable");
    if (!kind) return;
    var num = Number(editable.value);
    if (!Number.isFinite(num)) num = 0;
    var derivedKey = vatType === "include" ? kind + "-ex" : kind + "-incl";
    var derived = storefront.querySelector('[data-plf-storefront-derived="' + derivedKey + '"]');
    if (!derived) return;
    var next = vatType === "include" ? priceExFromIncl(num, rate) : priceInclVat(num, rate);
    derived.value = formatMoney(next);
  }

  function derivedStorefrontInput(value, derivedKey) {
    return (
      '<input type="text" class="product-list-form__derived" readonly tabindex="-1" data-plf-storefront-derived="' +
      derivedKey +
      '" value="' +
      escapeAttr(formatMoney(value)) +
      '" />'
    );
  }

  function storefrontPricePairHtml(kind, exValue, labelExKey, labelInclKey, dataFieldEx) {
    var vatSetting = activeSettingVat();
    var vatRate =
      vatSetting.rate != null && vatSetting.rate !== ""
        ? Number(vatSetting.rate)
        : 0;
    var vatType = vatSetting.vat_type === "include" ? "include" : "exclude";
    var ex = Number(exValue) || 0;
    var incl = priceInclVat(ex, vatRate);
    var kindClass = kind === "retail" ? " plf-storefront-retail" : "";
    var phEx = escapeHtml(t("form.placeholder.input", { label: t(labelExKey) }));
    var phIncl = escapeHtml(t("form.placeholder.input", { label: t(labelInclKey) }));
    if (vatType === "include") {
      return (
        '<div class="form-field' +
        kindClass +
        '"><label><span data-i18n="' +
        labelExKey +
        '"></span></label>' +
        '<div class="product-list-form__input-btn-row">' +
        derivedStorefrontInput(ex, kind + "-ex") +
        "</div></div>" +
        '<div class="form-field' +
        kindClass +
        '"><label><span data-i18n="' +
        labelInclKey +
        '"></span></label>' +
        '<div class="product-list-form__input-btn-row">' +
        '<input type="number" step="0.01" min="0" data-plf-storefront-editable="' +
        kind +
        '" data-plf-price-axis="incl" value="' +
        escapeAttr(String(incl)) +
        '" placeholder="' +
        phIncl +
        '" /></div></div>'
      );
    }
    return (
      '<div class="form-field' +
      kindClass +
      '"><label><span data-i18n="' +
      labelExKey +
      '"></span></label>' +
      '<div class="product-list-form__input-btn-row">' +
      '<input type="number" step="0.01" min="0" data-field="' +
      dataFieldEx +
      '" data-plf-storefront-editable="' +
      kind +
      '" data-plf-price-axis="ex" value="' +
      escapeAttr(String(ex)) +
      '" placeholder="' +
      phEx +
      '" /></div></div>' +
      '<div class="form-field' +
      kindClass +
      '"><label><span data-i18n="' +
      labelInclKey +
      '"></span></label>' +
      '<div class="product-list-form__input-btn-row">' +
      derivedStorefrontInput(incl, kind + "-incl") +
      "</div></div>"
    );
  }

  function itemStoreRow(itemId) {
    if (!itemId) return null;
    var row = global.store.getById("product_item", itemId);
    return row && row.deleted_at == null ? row : null;
  }

  function saleChannelName(channelId, loc) {
    loc = loc || locale();
    var row = langRow("setting_sale_channel_language", "setting_sale_channel_id", channelId, loc);
    if (row && row.name) return row.name;
    row = langRow("setting_sale_channel_language", "setting_sale_channel_id", channelId, "th");
    return (row && row.name) || String(channelId);
  }

  function supplierDisplayName(supplierUserId) {
    var info = global.store.getAll("supplier_information").find(function (r) {
      return r.supplier_user_id === supplierUserId && r.type === "contact";
    });
    if (info && info.name) return info.name;
    var user = global.store.getById("supplier_user", supplierUserId);
    return (user && user.sku) || "—";
  }

  function lotPartnerAndPo(stockRow) {
    if (stockRow.supplier_user_id != null) {
      return {
        partner: supplierDisplayName(stockRow.supplier_user_id),
        poSku: "",
      };
    }
    if (!stockRow.purchase_order_item_id) return { partner: "—", poSku: "" };
    var poi = global.store.getById("purchase_order_item", stockRow.purchase_order_item_id);
    if (!poi) return { partner: "—", poSku: "" };
    var po = global.store.getById("purchase_order", poi.purchase_order_id);
    if (!po) return { partner: "—", poSku: "" };
    return {
      partner: supplierDisplayName(po.supplier_user_id),
      poSku: po.sku || "",
    };
  }

  function defaultSaleChannels() {
    return activeSaleChannels()
      .filter(function (c) {
        return c.is_active && c.is_default;
      })
      .sort(function (a, b) {
        return (a.sort_order || 0) - (b.sort_order || 0);
      });
  }

  function saleChannelById(channelId) {
    return activeSaleChannels().find(function (c) {
      return c.id === channelId;
    });
  }

  function mergeDefaultChannelsIntoDraft(item) {
    if (!item.channelPrices) item.channelPrices = [];
    if (!item.removedChannelIds) item.removedChannelIds = [];
    var removed = {};
    item.removedChannelIds.forEach(function (id) {
      removed[id] = true;
    });
    var have = {};
    item.channelPrices.forEach(function (r) {
      have[r.setting_sale_channel_id] = true;
    });
    defaultSaleChannels().forEach(function (ch) {
      if (removed[ch.id] || have[ch.id]) return;
      item.channelPrices.push({ setting_sale_channel_id: ch.id, price: 0 });
      have[ch.id] = true;
    });
  }

  function finalizeItemDraft(item) {
    mergeDefaultChannelsIntoDraft(item);
    return item;
  }

  function ensureItemChannelDraft(item) {
    if (!item.channelPrices) item.channelPrices = [];
    if (!item.removedChannelIds) item.removedChannelIds = [];
    mergeDefaultChannelsIntoDraft(item);
  }

  function sortChannelPriceRows(rows) {
    var defaultIds = {};
    defaultSaleChannels().forEach(function (c) {
      defaultIds[c.id] = true;
    });
    return rows.slice().sort(function (a, b) {
      var da = defaultIds[a.setting_sale_channel_id] ? 0 : 1;
      var db = defaultIds[b.setting_sale_channel_id] ? 0 : 1;
      if (da !== db) return da - db;
      var ca = saleChannelById(a.setting_sale_channel_id);
      var cb = saleChannelById(b.setting_sale_channel_id);
      var sa = ca ? ca.sort_order || 0 : 0;
      var sb = cb ? cb.sort_order || 0 : 0;
      if (sa !== sb) return sa - sb;
      return a.setting_sale_channel_id - b.setting_sale_channel_id;
    });
  }

  function channelRowsForItem(item) {
    ensureItemChannelDraft(item);
    return sortChannelPriceRows(item.channelPrices);
  }

  function findItemDraftByKey(itemKey) {
    if (!draft || !draft.items) return null;
    return draft.items.find(function (it) {
      return it._draftKey === itemKey;
    });
  }

  function channelOptionsNotOnDraft(item) {
    ensureItemChannelDraft(item);
    var used = {};
    item.channelPrices.forEach(function (r) {
      used[r.setting_sale_channel_id] = true;
    });
    return activeSaleChannels().filter(function (c) {
      return c.is_active && !used[c.id];
    });
  }

  function setItemDraftChannelPrice(itemKey, channelId, priceEx) {
    var it = findItemDraftByKey(itemKey);
    if (!it) return;
    ensureItemChannelDraft(it);
    var found = false;
    it.channelPrices.forEach(function (r) {
      if (r.setting_sale_channel_id === channelId) {
        r.price = priceEx;
        found = true;
      }
    });
    if (!found) {
      it.channelPrices.push({ setting_sale_channel_id: channelId, price: priceEx });
    }
    it.removedChannelIds = (it.removedChannelIds || []).filter(function (id) {
      return id !== channelId;
    });
  }

  function removeItemDraftChannel(itemKey, channelId) {
    var it = findItemDraftByKey(itemKey);
    if (!it) return;
    it.channelPrices = (it.channelPrices || []).filter(function (r) {
      return r.setting_sale_channel_id !== channelId;
    });
    if (!it.removedChannelIds) it.removedChannelIds = [];
    if (
      defaultSaleChannels().some(function (c) {
        return c.id === channelId;
      }) &&
      it.removedChannelIds.indexOf(channelId) < 0
    ) {
      it.removedChannelIds.push(channelId);
    }
  }

  function syncItemChannelPricesToStore(itemId, it) {
    ensureItemChannelDraft(it);
    var rate = Number(activeSettingVat().rate) || 0;
    var desiredIds = {};
    it.channelPrices.forEach(function (r) {
      desiredIds[r.setting_sale_channel_id] = r;
    });
    Object.keys(desiredIds).forEach(function (k) {
      var chId = Number(k);
      var row = desiredIds[chId];
      upsertProductItemPrice(itemId, chId, {
        price: Number(row.price) || 0,
        vat_rate: rate,
      });
    });
    global.store
      .getAll("product_item_price")
      .filter(function (r) {
        return r.product_item_id === itemId;
      })
      .forEach(function (r) {
        if (!desiredIds[r.setting_sale_channel_id]) {
          deleteProductItemPrice(itemId, r.setting_sale_channel_id);
        }
      });
  }

  function ensureItemSuppliersDraft(item) {
    if (!item.suppliers) item.suppliers = [];
  }

  function supplierOnItem(item, supplierUserId) {
    return (item.suppliers || []).some(function (r) {
      return r.supplier_user_id === supplierUserId;
    });
  }

  function defaultSupplierRow(supplierUserId) {
    return {
      supplier_user_id: supplierUserId,
      cost_price: 0,
      discount: 0,
      discount_type: "baht",
    };
  }

  function mergeListPartnersIntoItem(item, supplierIds) {
    (supplierIds || []).forEach(function (sid) {
      var id = Number(sid);
      if (!id || supplierOnItem(item, id)) return;
      ensureItemSuppliersDraft(item);
      item.suppliers.push(defaultSupplierRow(id));
    });
  }

  function supplierRowsForItem(item) {
    ensureItemSuppliersDraft(item);
    return item.suppliers.slice().sort(function (a, b) {
      return supplierDisplayName(a.supplier_user_id).localeCompare(
        supplierDisplayName(b.supplier_user_id)
      );
    });
  }

  function setItemDraftSupplierRow(itemKey, supplierUserId, patch) {
    var it = findItemDraftByKey(itemKey);
    if (!it) return;
    ensureItemSuppliersDraft(it);
    var found = false;
    it.suppliers.forEach(function (r) {
      if (r.supplier_user_id === supplierUserId) {
        Object.assign(r, patch);
        found = true;
      }
    });
    if (!found) {
      it.suppliers.push(Object.assign(defaultSupplierRow(supplierUserId), patch));
    }
  }

  function syncItemSuppliersToStore(itemId, it) {
    ensureItemSuppliersDraft(it);
    var rate = Number(activeSettingVat().rate) || 0;
    var actor = global.auth && global.auth.getUser ? global.auth.getUser() : null;
    var actorId = actor && actor.id != null ? actor.id : null;
    var ts = now();
    var desired = {};
    it.suppliers.forEach(function (r) {
      desired[r.supplier_user_id] = r;
    });
    global.store
      .getAll("product_item_supplier")
      .filter(function (r) {
        return r.product_item_id === itemId;
      })
      .forEach(function (row) {
        var want = desired[row.supplier_user_id];
        if (!want) {
          global.store.delete("product_item_supplier", row.id);
          return;
        }
        global.store.update("product_item_supplier", row.id, {
          cost_price: Number(want.cost_price) || 0,
          discount: Number(want.discount) || 0,
          discount_type: want.discount_type === "percent" ? "percent" : "baht",
          vat_rate: rate,
          updated_at: ts,
          updated_by: actorId,
        });
        delete desired[row.supplier_user_id];
      });
    Object.keys(desired).forEach(function (k) {
      var r = desired[Number(k)];
      global.store.create("product_item_supplier", {
        product_item_id: itemId,
        supplier_user_id: Number(k),
        cost_price: Number(r.cost_price) || 0,
        discount: Number(r.discount) || 0,
        discount_type: r.discount_type === "percent" ? "percent" : "baht",
        vat_rate: rate,
        created_at: ts,
        updated_at: ts,
        created_by: actorId,
        updated_by: actorId,
      });
    });
  }

  function linkPartnerToDraft(supplierUserId) {
    collectDraftFromDom();
    var sid = Number(supplierUserId);
    if (!sid || !draft) return false;
    if (!(draft.supplierIds || []).some(function (id) { return Number(id) === sid; })) {
      draft.supplierIds.push(String(sid));
    }
    (draft.items || []).forEach(function (it) {
      if (!supplierOnItem(it, sid)) {
        ensureItemSuppliersDraft(it);
        it.suppliers.push(defaultSupplierRow(sid));
      }
    });
    return true;
  }

  function addPartnerLinked(supplierUserId) {
    if (!linkPartnerToDraft(supplierUserId)) return;
    render();
    global.toast.show(t("productListForm.toastPartnerAdded"), "success");
  }

  function removePartnerLinked(supplierUserId) {
    collectDraftFromDom();
    var sid = Number(supplierUserId);
    if (!sid || !draft) return;
    draft.supplierIds = (draft.supplierIds || []).filter(function (id) {
      return Number(id) !== sid;
    });
    (draft.items || []).forEach(function (it) {
      it.suppliers = (it.suppliers || []).filter(function (r) {
        return r.supplier_user_id !== sid;
      });
    });
    render();
    global.toast.show(t("productListForm.toastPartnerRemoved"), "success");
  }

  function itemSuppliers(itemId) {
    if (!itemId) return [];
    return global.store.getAll("product_item_supplier").filter(function (r) {
      return r.product_item_id === itemId;
    });
  }

  function itemSuppliersForLot(productItemId) {
    if (draft && draft.items && productItemId) {
      var di = draft.items.find(function (it) {
        return it.id === productItemId;
      });
      if (di && di.suppliers && di.suppliers.length) return di.suppliers;
    }
    return itemSuppliers(productItemId);
  }

  function itemIdFromBlock(block) {
    var idRaw = block && block.getAttribute("data-item-id");
    return idRaw ? Number(idRaw) : null;
  }

  function requireItemIdFromBlock(block) {
    var itemId = itemIdFromBlock(block);
    if (!itemId) {
      global.toast.show(t("productListForm.itemSaveVariantFirst"), "warning");
      return null;
    }
    return itemId;
  }

  function clearItemInlineEdits(itemKey) {
    if (itemKey) {
      delete itemChannelEditByKey[itemKey];
      delete itemSupplierEditByKey[itemKey];
      return;
    }
    itemChannelEditByKey = {};
    itemSupplierEditByKey = {};
  }

  function findProductItemPriceIndex(itemId, channelId) {
    var rows = global.store.getAll("product_item_price");
    for (var i = 0; i < rows.length; i++) {
      if (
        rows[i].product_item_id === itemId &&
        rows[i].setting_sale_channel_id === channelId
      ) {
        return i;
      }
    }
    return -1;
  }

  function upsertProductItemPrice(itemId, channelId, patch) {
    var idx = findProductItemPriceIndex(itemId, channelId);
    var ts = now();
    if (idx >= 0) {
      return global.store.updateAt(
        "product_item_price",
        idx,
        Object.assign({}, patch, { updated_at: ts })
      );
    }
    return global.store.create(
      "product_item_price",
      Object.assign(
        {
          product_item_id: itemId,
          setting_sale_channel_id: channelId,
          created_at: ts,
        },
        patch,
        { updated_at: ts }
      )
    );
  }

  function deleteProductItemPrice(itemId, channelId) {
    var idx = findProductItemPriceIndex(itemId, channelId);
    if (idx < 0) return false;
    return global.store.deleteAt("product_item_price", idx);
  }

  function activeSaleChannels() {
    return global.store.getAll("setting_sale_channel").filter(function (r) {
      return r.deleted_at == null;
    });
  }


  function supplierOptionsNotOnItem(itemKey) {
    var item = findItemDraftByKey(itemKey);
    var used = {};
    if (item) {
      supplierRowsForItem(item).forEach(function (r) {
        used[r.supplier_user_id] = true;
      });
    }
    return supplierOptionsList().filter(function (opt) {
      return !used[Number(opt.value)];
    });
  }

  function itemTableEditInput(dataPrefix, field, value) {
    var v = value != null && value !== "" ? value : 0;
    return (
      '<input type="number" class="product-list-form__lot-edit-input" step="any" data-' +
      dataPrefix +
      '-field="' +
      escapeAttr(field) +
      '" value="' +
      escapeAttr(String(v)) +
      '" />'
    );
  }

  function itemTableRowActionsHtml(editing, opts) {
    if (editing) {
      return (
        '<div class="data-table__actions">' +
        '<button type="button" class="btn btn--icon product-list-form__lot-action product-list-form__lot-action--save ' +
        opts.saveClass +
        '" ' +
        opts.idAttr +
        '="' +
        escapeAttr(String(opts.idVal)) +
        '" aria-label="' +
        escapeAttr(t("crud.save")) +
        '"><img src="../assets/icons/check.svg" alt="" width="16" height="16" /></button>' +
        '<button type="button" class="btn btn--icon product-list-form__lot-action product-list-form__lot-action--cancel ' +
        opts.cancelClass +
        '" aria-label="' +
        escapeAttr(t("crud.cancel")) +
        '"><img src="../assets/icons/x.svg" alt="" width="16" height="16" /></button></div>'
      );
    }
    return (
      '<div class="data-table__actions">' +
      '<button type="button" class="btn btn--icon ' +
      opts.editClass +
      '" ' +
      opts.idAttr +
      '="' +
      escapeAttr(String(opts.idVal)) +
      '" aria-label="' +
      escapeAttr(t("crud.edit")) +
      '"><img src="../assets/icons/pencil.svg" alt="" width="16" height="16" /></button>' +
      '<button type="button" class="btn btn--icon crud-delete ' +
      opts.deleteClass +
      '" ' +
      opts.idAttr +
      '="' +
      escapeAttr(String(opts.idVal)) +
      '" aria-label="' +
      escapeAttr(t("crud.delete")) +
      '"><img src="../assets/icons/trash-2.svg" alt="" width="16" height="16" /></button></div>'
    );
  }

  function itemGalleryFiles(itemId) {
    if (!itemId) return [];
    return global.store
      .getAll("product_item_file")
      .filter(function (r) {
        return r.product_item_id === itemId && r.deleted_at == null;
      })
      .sort(function (a, b) {
        return (a.sort_order || 0) - (b.sort_order || 0);
      });
  }

  function supplierNetPrice(row) {
    var cost = Number(row.cost_price) || 0;
    var disc = Number(row.discount) || 0;
    if (row.discount_type === "percent") return cost * (1 - disc / 100);
    return Math.max(0, cost - disc);
  }

  function firstSupplierCostForItem(item) {
    var rows = supplierRowsForItem(item);
    if (!rows.length) return 0;
    return supplierNetPrice(rows[0]);
  }

  function marginPct(sellPrice, cost) {
    var sell = Number(sellPrice) || 0;
    if (sell <= 0) return "—";
    var c = Number(cost) || 0;
    return formatMoney(((sell - c) / sell) * 100);
  }

  function unitLabelKey(unit) {
    if (unit === "box") return "productList.packUnitBox";
    if (unit === "set") return "productList.packUnitSet";
    return "productList.packUnitPiece";
  }

  function readonlyInput(value, derived) {
    var cls = derived ? "product-list-form__derived" : "product-list-form__readonly";
    return (
      '<input type="text" class="' +
      cls +
      '" readonly tabindex="-1" value="' +
      escapeAttr(value != null && value !== "" ? String(value) : "") +
      '" />'
    );
  }

  function itemMiniPagerHtml(itemKey, pagerKind, page, totalPages) {
    if (totalPages <= 1) return "";
    var start = (page - 1) * ITEM_TABLE_PAGE_SIZE + 1;
    var end = Math.min(page * ITEM_TABLE_PAGE_SIZE, totalPages * ITEM_TABLE_PAGE_SIZE);
    return (
      '<nav class="crud-pagination plf-item-pager" aria-label="Pagination" data-item-key="' +
      escapeAttr(itemKey) +
      '" data-pager-kind="' +
      escapeAttr(pagerKind) +
      '">' +
      '<span class="crud-pagination__info">' +
      escapeHtml(t("crud.pageOf", { page: page, total: totalPages })) +
      "</span>" +
      '<div class="crud-pagination__controls">' +
      '<button type="button" class="btn btn--icon plf-item-pager-btn" data-dir="prev"' +
      (page <= 1 ? " disabled" : "") +
      ' aria-label="' +
      escapeAttr(t("crud.prev")) +
      '"><img src="../assets/icons/chevron-left.svg" alt="" width="16" height="16" /></button>' +
      '<button type="button" class="btn btn--icon plf-item-pager-btn" data-dir="next"' +
      (page >= totalPages ? " disabled" : "") +
      ' aria-label="' +
      escapeAttr(t("crud.next")) +
      '"><img src="../assets/icons/chevron-right.svg" alt="" width="16" height="16" /></button>' +
      "</div></nav>"
    );
  }

  function itemExpandedSectionsHtml(item) {
    var itemKey = item._draftKey;
    var itemId = item.id != null ? Number(item.id) : null;
    var storeRow = itemStoreRow(itemId);
    var loc = locale();
    var nameTh = item.name_th != null ? item.name_th : "";
    var nameEn = item.name_en != null ? item.name_en : "";
    var barcode = item.barcode != null ? item.barcode : "";
    var qrcode = item.qrcode != null ? item.qrcode : "";
    var skuPrefix = listSkuPrefix();
    var skuSuffix = itemSkuSuffix(item, skuPrefix);
    var isAuthentic = !!item.is_authentic;
    var weight = item.weight != null ? String(item.weight) : "";
    var width = item.width != null ? String(item.width) : "";
    var length = item.length != null ? String(item.length) : "";
    var height = item.height != null ? String(item.height) : "";
    var totalStock = itemId ? totalStockForItem(itemId) : 0;
    var typePrice =
      item.type_price === "stock" || item.type_price === "manual"
        ? item.type_price
        : storeRow && storeRow.type_price
          ? storeRow.type_price
          : "manual";
    var vatSetting = activeSettingVat();
    var storefrontVatRate =
      vatSetting.rate != null && vatSetting.rate !== ""
        ? Number(vatSetting.rate)
        : storeRow && storeRow.vat_rate != null
          ? Number(storeRow.vat_rate)
          : 0;
    var storefrontVatType = vatSetting.vat_type === "include" ? "include" : "exclude";
    var priceManual = Number(item.price);
    if (!Number.isFinite(priceManual)) priceManual = storeRow ? Number(storeRow.price) : 0;
    var wholesaleRaw = item.price_wholesale;
    var wholesaleEx =
      wholesaleRaw !== "" && wholesaleRaw != null && String(wholesaleRaw).trim() !== ""
        ? Number(wholesaleRaw)
        : storeRow && storeRow.price_wholesale != null
          ? Number(storeRow.price_wholesale)
          : 0;
    var amountWholesaleRaw = item.amount_price_wholesale;
    var amountWholesale =
      amountWholesaleRaw !== "" &&
      amountWholesaleRaw != null &&
      String(amountWholesaleRaw).trim() !== ""
        ? Number(amountWholesaleRaw)
        : storeRow && storeRow.amount_price_wholesale != null
          ? Number(storeRow.amount_price_wholesale)
          : 0;
    var promotion =
      item.promotion != null && item.promotion !== ""
        ? String(item.promotion)
        : storeRow && storeRow.promotion
          ? String(storeRow.promotion)
          : "";
    var channelEditingId = itemChannelEditByKey[itemKey];
    var supplierEditingId = itemSupplierEditByKey[itemKey];
    var storefrontPricesRow =
      typePrice === "stock"
        ? ""
        : '<div class="product-list-form__row product-list-form__row--prices">' +
          storefrontPricePairHtml(
            "retail",
            priceManual,
            "productList.colNetPrice",
            "productListForm.itemPriceInclVat",
            "price"
          ) +
          storefrontPricePairHtml(
            "wholesale",
            wholesaleEx,
            "productListForm.itemWholesaleExVat",
            "productListForm.itemWholesaleInclVat",
            "price_wholesale"
          ) +
          '<div class="form-field"><label><span data-i18n="productListForm.itemWholesaleMinQty"></span></label>' +
          '<input type="number" min="0" step="1" data-field="amount_price_wholesale" data-i18n-placeholder-input="productListForm.itemWholesaleMinQty" placeholder="กรุณากรอกจำนวนขั้นต่ำสำหรับราคาส่ง" value="' +
          escapeAttr(String(amountWholesale)) +
          '" /></div>' +
          "</div>";

    var unitOpts = ["piece", "box", "set"]
      .map(function (u) {
        var sel = item.unit === u ? " selected" : "";
        var labelKey = unitLabelKey(u);
        return (
          '<option value="' +
          u +
          '"' +
          sel +
          ' data-i18n="' +
          labelKey +
          '"></option>'
        );
      })
      .join("");

    var gallery = itemGalleryFiles(itemId);
    var galleryThumbs = gallery.length
      ? gallery
          .map(function (f, idx) {
            var cover = idx === 0;
            return (
              '<div class="product-list-form__gallery-thumb' +
              (cover ? " product-list-form__gallery-thumb--cover" : "") +
              '">' +
              (cover
                ? '<span class="product-list-form__gallery-cover-badge" data-i18n="productListForm.itemCoverImage"></span>'
                : "") +
              '<img src="../assets/icons/box.svg" alt="" width="40" height="40" /></div>'
            );
          })
          .join("")
      : '<p class=""></p>';

    ensureItemChannelDraft(item);
    var channelRows = channelRowsForItem(item);
    var channelPage = itemChannelPageByKey[itemKey] || 1;
    var channelTotalPages = Math.max(1, Math.ceil(channelRows.length / ITEM_TABLE_PAGE_SIZE));
    if (channelPage > channelTotalPages) channelPage = channelTotalPages;
    itemChannelPageByKey[itemKey] = channelPage;
    var channelSlice = channelRows.slice(
      (channelPage - 1) * ITEM_TABLE_PAGE_SIZE,
      channelPage * ITEM_TABLE_PAGE_SIZE
    );
    var refCost = firstSupplierCostForItem(item);
    var channelBody = channelSlice.length
      ? channelSlice
          .map(function (row) {
            var chId = row.setting_sale_channel_id;
            var editing = channelEditingId === chId;
            var ex = Number(row.price) || 0;
            var priceCells = channelRowPriceCells(ex, editing, vatSetting);
            var actions = itemTableRowActionsHtml(editing, {
              saveClass: "plf-channel-save",
              cancelClass: "plf-channel-cancel",
              editClass: "plf-channel-edit plf-variant-no-toggle",
              deleteClass: "plf-channel-delete plf-variant-no-toggle",
              idAttr: "data-channel-id",
              idVal: chId,
            });
            return (
              "<tr" +
              (editing ? ' class="product-list-form__lot-row--editing"' : "") +
              ' data-channel-id="' +
              chId +
              '">' +
              "<td>" +
              escapeHtml(saleChannelName(chId, loc)) +
              '</td><td class="data-table__col-numeric">' +
              priceCells.ex +
              '</td><td class="data-table__col-numeric">' +
              priceCells.total +
              '</td><td class="data-table__col-numeric">' +
              escapeHtml(marginPct(ex, refCost)) +
              '</td><td class="data-table__col-center data-table__actions-cell">' +
              actions +
              "</td></tr>"
            );
          })
          .join("")
      : '<tr><td colspan="5" class="crud-empty" data-i18n="productListForm.itemChannelEmpty"></td></tr>';

    var subTab = itemSubTabByKey[itemKey] || "suppliers";
    var supplierRows = supplierRowsForItem(item);
    var supplierBody = supplierRows.length
      ? supplierRows
          .map(function (row) {
            var editing = supplierEditingId === row.supplier_user_id;
            var net = supplierNetPrice(row);
            var costCell = editing
              ? itemTableEditInput("supplier", "cost_price", row.cost_price)
              : escapeHtml(formatMoney(row.cost_price));
            var discCell = editing
              ? itemTableEditInput("supplier", "discount", row.discount)
              : escapeHtml(formatQty(row.discount));
            var typeCell;
            if (editing) {
              typeCell =
                '<select class="product-list-form__lot-edit-input" data-supplier-field="discount_type">' +
                ["baht", "percent"]
                  .map(function (dt) {
                    var sel = row.discount_type === dt ? " selected" : "";
                    return '<option value="' + dt + '"' + sel + ">" + escapeHtml(dt === "percent" ? t("productListForm.discountPercent") : t("productListForm.discountBaht")) + "</option>";
                  })
                  .join("") +
                "</select>";
            } else {
              typeCell = escapeHtml(
                row.discount_type === "percent"
                  ? t("productListForm.discountPercent")
                  : t("productListForm.discountBaht")
              );
            }
            var actions = itemTableRowActionsHtml(editing, {
              saveClass: "plf-supplier-save",
              cancelClass: "plf-supplier-cancel",
              editClass: "plf-supplier-edit plf-variant-no-toggle",
              deleteClass: "plf-supplier-delete plf-variant-no-toggle",
              idAttr: "data-supplier-row-id",
              idVal: row.supplier_user_id,
            });
            return (
              "<tr" +
              (editing ? ' class="product-list-form__lot-row--editing"' : "") +
              ' data-supplier-row-id="' +
              row.supplier_user_id +
              '">' +
              "<td>" +
              escapeHtml(supplierDisplayName(row.supplier_user_id)) +
              '</td><td class="data-table__col-numeric">' +
              costCell +
              '</td><td class="data-table__col-numeric">' +
              discCell +
              '</td><td class="data-table__col-center">' +
              typeCell +
              '</td><td class="data-table__col-numeric">' +
              escapeHtml(formatMoney(net)) +
              '</td><td class="data-table__col-center data-table__actions-cell">' +
              actions +
              "</td></tr>"
            );
          })
          .join("")
      : '<tr><td colspan="6" class="crud-empty" data-i18n="productListForm.itemSupplierEmpty"></td></tr>';

    ensureItemWarehouseDraft(item);
    var whRows = item.warehousePlacements || [];
    var whBody = whRows.length
      ? whRows
          .map(function (row) {
            var qtyVal = row.quantity != null ? String(row.quantity) : "";
            return (
              "<tr data-wh-row-key=\"" +
              escapeAttr(row._draftKey) +
              '">' +
              "<td>" +
              warehouseCascadeSelectHtml(itemKey, row, "warehouse", itemId) +
              "</td><td>" +
              warehouseCascadeSelectHtml(itemKey, row, "zone", itemId) +
              "</td><td>" +
              warehouseCascadeSelectHtml(itemKey, row, "shelf", itemId) +
              "</td><td>" +
              warehouseCascadeSelectHtml(itemKey, row, "rack", itemId) +
              "</td><td>" +
              warehouseCascadeSelectHtml(itemKey, row, "bin", itemId) +
              '</td><td class="data-table__col-numeric">' +
              '<input type="number" class="product-list-form__lot-edit-input product-list-form__wh-qty" step="any" min="0" data-plf-wh-qty data-item-key="' +
              escapeAttr(itemKey) +
              '" data-wh-row-key="' +
              escapeAttr(row._draftKey) +
              '" data-i18n-placeholder-input="productList.wpLabelQty" placeholder="" value="' +
              escapeAttr(qtyVal) +
              '" />' +
              '</td><td class="data-table__col-center data-table__actions-cell">' +
              '<div class="data-table__actions">' +
              '<button type="button" class="btn btn--icon product-list-form__lot-action product-list-form__lot-action--save plf-wh-save plf-variant-no-toggle" data-item-key="' +
              escapeAttr(itemKey) +
              '" data-wh-row-key="' +
              escapeAttr(row._draftKey) +
              '" aria-label="' +
              escapeAttr(t("crud.save")) +
              '"><img src="../assets/icons/check.svg" alt="" width="16" height="16" /></button>' +
              '<button type="button" class="btn btn--icon crud-delete plf-wh-delete plf-variant-no-toggle" data-item-key="' +
              escapeAttr(itemKey) +
              '" data-wh-row-key="' +
              escapeAttr(row._draftKey) +
              '" aria-label="' +
              escapeAttr(t("crud.delete")) +
              '"><img src="../assets/icons/trash-2.svg" alt="" width="16" height="16" /></button></div></td></tr>'
            );
          })
          .join("")
      : '<tr><td colspan="7" class="crud-empty" data-i18n="productListForm.itemWarehouseEmpty"></td></tr>';

    var typeManualChecked = typePrice === "manual" ? " checked" : "";
    var typeStockChecked = typePrice === "stock" ? " checked" : "";

    var phNameTh = escapeHtml(
      t("form.placeholder.input", { label: t("productListForm.itemOfficialNameTh") })
    );
    var phNameEn = escapeHtml(
      t("form.placeholder.input", { label: t("productListForm.itemOfficialNameEn") })
    );
    var phSkuSuffix = escapeHtml(
      t("form.placeholder.input", { label: t("productListForm.itemSkuSuffix") })
    );
    var phBarcode = escapeHtml(
      t("form.placeholder.input", { label: t("productListForm.itemBarcode") })
    );
    var phQrcode = escapeHtml(
      t("form.placeholder.input", { label: t("productListForm.itemQrcode") })
    );
    var phWeight = escapeHtml(
      t("form.placeholder.input", { label: t("productListForm.itemWeight") })
    );
    var phQtyPack = escapeHtml(
      t("form.placeholder.input", { label: t("productListForm.qtyPerPack") })
    );
    var phMinQty = escapeHtml(
      t("form.placeholder.input", { label: t("productListForm.itemMinQty") })
    );
    var phDim = escapeHtml(t("form.placeholder.input", { label: t("productListForm.itemPackageSize") }));
    var phUnit = escapeHtml(t("form.placeholder.select", { label: t("productListForm.itemUnit") }));

    var section2PanelSales =
      itemVariantField(
        itemKey,
        "name_th",
        "productListForm.itemOfficialNameTh",
        true,
        '<input type="text" data-field="name_th" required value="' +
          escapeAttr(nameTh) +
          '" placeholder="' +
          phNameTh +
          '" />'
      ) +
      itemVariantField(
        itemKey,
        "name_en",
        "productListForm.itemOfficialNameEn",
        true,
        '<input type="text" data-field="name_en" required value="' +
          escapeAttr(nameEn) +
          '" placeholder="' +
          phNameEn +
          '" />'
      ) +
      itemVariantField(
        itemKey,
        "sku_suffix",
        "productListForm.itemProductCode",
        true,
        '<div class="product-list-form__input-btn-row">' +
          '<div class="product-list-form__sku-composite">' +
          '<span class="product-list-form__sku-prefix">' +
          escapeHtml(skuPrefix || "—") +
          "</span>" +
          '<input type="text" data-field="sku_suffix" value="' +
          escapeAttr(skuSuffix) +
          '" placeholder="' +
          phSkuSuffix +
          '" /></div>' +
          '<button type="button" class="btn btn--primary btn--sm plf-item-strip-sku plf-variant-no-toggle"><span data-i18n="productListForm.itemStripCode"></span></button></div>'
      ) +
      '<div class="form-field"><label><span data-i18n="productListForm.itemBarcode"></span></label>' +
      '<div class="product-list-form__input-btn-row">' +
      '<input type="text" data-field="barcode" value="' +
      escapeAttr(barcode) +
      '" placeholder="' +
      phBarcode +
      '" />' +
      '<button type="button" class="btn btn--primary btn--sm plf-item-generate plf-variant-no-toggle" data-gen="barcode"><span data-i18n="productListForm.itemCreateBarcode"></span></button></div></div>' +
      '<div class="form-field"><label><span data-i18n="productListForm.itemQrcode"></span></label>' +
      '<div class="product-list-form__input-btn-row">' +
      '<input type="text" data-field="qrcode" value="' +
      escapeAttr(qrcode) +
      '" placeholder="' +
      phQrcode +
      '" />' +
      '<button type="button" class="btn btn--primary btn--sm plf-item-generate plf-variant-no-toggle" data-gen="qrcode"><span data-i18n="productListForm.itemGenerateQrcode"></span></button></div></div>' +
      '<div class="form-field form-field--switch"><span data-i18n="productListForm.itemAuthenticSpare"></span>' +
      '<label class="crud-switch"><input type="checkbox" data-field="is_authentic"' +
      (isAuthentic ? " checked" : "") +
      ' role="switch" aria-label="' +
      escapeAttr(t("productListForm.itemAuthenticSpare")) +
      '" /><span class="crud-switch__track"><span class="crud-switch__thumb"></span></span></label></div>';

    var dimAffix = function (field, val, dimLabelKey) {
      return (
        '<div class="product-list-form__dim-cell">' +
        '<span class="product-list-form__dim-label" data-i18n="' +
        escapeHtml(dimLabelKey) +
        '"></span>' +
        '<div class="form-field__input-affix">' +
        '<input type="number" step="0.0001" min="0" data-field="' +
        field +
        '" value="' +
        escapeAttr(val) +
        '" placeholder="' +
        phDim +
        '" aria-label="' +
        escapeAttr(t(dimLabelKey) + " " + t("productListForm.itemPackageSize")) +
        '" />' +
        '<span class="form-field__input-suffix">cm</span></div></div>'
      );
    };

    var section2PanelSpecs =
      itemPanelTitle("2.1", "productListForm.itemSpecs") +
      itemVariantField(
        itemKey,
        "weight",
        "productListForm.itemWeight",
        true,
        '<div class="form-field__input-affix">' +
          '<input type="number" step="0.0001" min="0" data-field="weight" required value="' +
          escapeAttr(weight) +
          '" placeholder="' +
          phWeight +
          '" />' +
          '<span class="form-field__input-suffix">kg</span></div>'
      ) +
      '<div class="form-field">' +
      '<label><span data-i18n="productListForm.itemPackageSize"></span></label>' +
      '<div class="product-list-form__dims-inline">' +
      dimAffix("width", width, "productListForm.dimW") +
      '<span class="product-list-form__dim-sep" aria-hidden="true">×</span>' +
      dimAffix("length", length, "productListForm.dimL") +
      '<span class="product-list-form__dim-sep" aria-hidden="true">×</span>' +
      dimAffix("height", height, "productListForm.dimH") +
      "</div></div>" +
      '<div class="product-list-form__row product-list-form__row--pack">' +
      '<div class="form-field"><label><span data-i18n="productListForm.qtyPerPack"></span></label>' +
      '<input type="number" min="1" step="1" data-field="qty_per_unit" value="' +
      escapeAttr(item.qty_per_unit) +
      '" placeholder="' +
      phQtyPack +
      '" /></div>' +
      '<div class="form-field"><label><span data-i18n="productListForm.itemUnit"></span></label>' +
      '<select data-field="unit" data-i18n-placeholder-select="productListForm.itemUnit">' +
      '<option value="" disabled' +
      (item.unit ? "" : " selected") +
      ">" +
      phUnit +
      "</option>" +
      unitOpts +
      "</select></div></div>";

    var viewStockBtn = itemId
      ? '<button type="button" class="btn btn--primary btn--sm plf-item-view-lots plf-variant-no-toggle" data-item-id="' +
        escapeAttr(String(itemId)) +
        '"><img src="../assets/icons/eye.svg" alt="" width="16" height="16" /> <span data-i18n="productListForm.itemViewStock"></span></button>'
      : "";

    var section2PanelStock =
      itemPanelTitle("2.2", "productListForm.itemTotalStock") +
      '<div class="product-list-form__stock-stack">' +
      '<div class="form-field"><label><span data-i18n="productList.colStock"></span></label>' +
      '<div class="product-list-form__stock-line">' +
      readonlyInput(String(totalStock), true) +
      viewStockBtn +
      "</div></div>" +
      '<div class="form-field"><label><span data-i18n="productListForm.itemMinQty"></span></label>' +
      '<input type="number" min="0" step="1" data-field="minimum_stock" value="' +
      escapeAttr(item.minimum_stock) +
      '" placeholder="' +
      phMinQty +
      '" /></div></div>';

    var section2Html =
      '<div class="product-list-form__item-grid product-list-form__item-grid--section2">' +
      '<div class="product-list-form__item-panel">' +
      section2PanelSales +
      "</div>" +
      '<div class="product-list-form__item-panel-stack">' +
      '<div class="product-list-form__item-panel">' +
      section2PanelSpecs +
      "</div>" +
      '<div class="product-list-form__item-panel">' +
      section2PanelStock +
      "</div></div></div>";

    return (
      '<div class="product-list-form__item-sections">' +
      '<section class="product-list-form__card product-list-form__item-section">' +
      '<h3 class="product-list-form__card-title"><span class="product-list-form__section-num">1</span> <span data-i18n="productListForm.itemSectionImages"></span></h3>' +
      '<div class="product-list-form__gallery">' +
      '<button type="button" class="product-list-form__gallery-upload plf-item-mock plf-variant-no-toggle" data-mock="upload">' +
      '<img src="../assets/icons/upload.svg" alt="" width="24" height="24" /><span data-i18n="productListForm.itemUploadImages"></span></button>' +
      '<div class="product-list-form__gallery-thumbs">' +
      galleryThumbs +
      "</div></div></section>" +
      '<section class="product-list-form__card product-list-form__item-section">' +
      '<h3 class="product-list-form__card-title"><span class="product-list-form__section-num">2</span> <span data-i18n="productListForm.itemSectionSales"></span></h3>' +
      section2Html +
      "</section>" +
      '<section class="product-list-form__card product-list-form__item-section product-list-form__storefront" data-vat-rate="' +
      escapeAttr(String(storefrontVatRate)) +
      '" data-vat-type="' +
      escapeAttr(storefrontVatType) +
      '">' +
      '<h3 class="product-list-form__card-title"><span class="product-list-form__section-num">3</span> <span data-i18n="productListForm.itemSectionStorefront"></span></h3>' +
      '<fieldset class="product-list-form__type-price">' +
      '<legend class="product-list-form__visually-hidden" data-i18n="productListForm.itemTypePrice"></legend>' +
      '<label class="product-list-form__radio"><input type="radio" name="type-price-' +
      escapeAttr(itemKey) +
      '" value="manual" data-field="type_price"' +
      typeManualChecked +
      ' /> <span data-i18n="productListForm.itemPriceManual"></span></label>' +
      '<label class="product-list-form__radio"><input type="radio" name="type-price-' +
      escapeAttr(itemKey) +
      '" value="stock" data-field="type_price"' +
      typeStockChecked +
      ' /> <span data-i18n="productListForm.itemPriceStock"></span></label></fieldset>' +
      storefrontPricesRow +
      "</section>" +
      '<section class="product-list-form__card product-list-form__item-section product-list-form__channel-pricing" data-vat-rate="' +
      escapeAttr(String(storefrontVatRate)) +
      '" data-vat-type="' +
      escapeAttr(storefrontVatType) +
      '">' +
      '<h3 class="product-list-form__card-title"><span class="product-list-form__section-num">4</span> <span data-i18n="productListForm.itemSectionChannel"></span></h3>' +
      '<div class="crud-table-wrap product-list-form__item-table-wrap"><div class="crud-table-wrap__body"><table class="data-table">' +
      "<thead><tr>" +
      '<th><span data-i18n="productListForm.itemColChannel"></span></th>' +
      '<th class="data-table__col-numeric"><span data-i18n="productListForm.itemColPriceExVat"></span></th>' +
      '<th class="data-table__col-numeric"><span data-i18n="productListForm.itemColTotal"></span></th>' +
      '<th class="data-table__col-numeric"><span data-i18n="productListForm.itemColMargin"></span></th>' +
      '<th class="data-table__actions-col"><span data-i18n="crud.actions"></span></th>' +
      "</tr></thead><tbody>" +
      channelBody +
      "</tbody></table></div></div>" +
      itemMiniPagerHtml(itemKey, "channel", channelPage, channelTotalPages) +
      '<button type="button" class="btn btn--primary product-list-form__item-add-row plf-channel-add plf-variant-no-toggle" data-item-key="' +
      escapeAttr(itemKey) +
      '"' +
      (channelEditingId != null ? " disabled" : "") +
      '><img src="../assets/icons/plus.svg" alt="" width="16" height="16" /> <span data-i18n="productListForm.itemAddChannel"></span></button>' +
      '<div class="form-field"><label><span data-i18n="productListForm.itemPromotion"></span></label>' +
      '<textarea data-field="promotion" data-i18n-placeholder-input="productListForm.itemPromotion" rows="3" placeholder="">' +
      escapeHtml(promotion) +
      "</textarea></div></section>" +
      '<section class="product-list-form__card product-list-form__item-section">' +
      '<h3 class="product-list-form__card-title"><span class="product-list-form__section-num">5</span> <span data-i18n="productListForm.itemSectionSupply"></span></h3>' +
      '<div class="product-list-form__item-tabs" role="tablist">' +
      '<button type="button" class="product-list-form__item-tab' +
      (subTab === "suppliers" ? " product-list-form__item-tab--active" : "") +
      ' plf-variant-no-toggle" role="tab" data-plf-item-tab="suppliers" data-item-key="' +
      escapeAttr(itemKey) +
      '" aria-selected="' +
      (subTab === "suppliers" ? "true" : "false") +
      '"><span data-i18n="productListForm.itemTabSupplierInfo"></span></button>' +
      '<button type="button" class="product-list-form__item-tab' +
      (subTab === "warehouse" ? " product-list-form__item-tab--active" : "") +
      ' plf-variant-no-toggle" role="tab" data-plf-item-tab="warehouse" data-item-key="' +
      escapeAttr(itemKey) +
      '" aria-selected="' +
      (subTab === "warehouse" ? "true" : "false") +
      '"><span data-i18n="productListForm.itemTabWarehouse"></span></button></div>' +
      (subTab === "suppliers"
        ? '<div class="crud-table-wrap product-list-form__item-table-wrap"><div class="crud-table-wrap__body"><table class="data-table">' +
          "<thead><tr>" +
          '<th><span data-i18n="productListForm.itemColSupplier"></span></th>' +
          '<th class="data-table__col-numeric"><span data-i18n="productListForm.itemColCost"></span></th>' +
          '<th class="data-table__col-numeric"><span data-i18n="productListForm.itemColDiscount"></span></th>' +
          '<th class="data-table__col-center"><span data-i18n="productListForm.itemColDiscountType"></span></th>' +
          '<th class="data-table__col-numeric"><span data-i18n="productListForm.itemColNetCost"></span></th>' +
          '<th class="data-table__actions-col"><span data-i18n="crud.actions"></span></th>' +
          "</tr></thead><tbody>" +
          supplierBody +
          "</tbody></table></div></div>" +
          '<button type="button" class="btn btn--primary product-list-form__item-add-row plf-supplier-add plf-variant-no-toggle" data-item-key="' +
          escapeAttr(itemKey) +
          '"' +
          (supplierEditingId != null ? " disabled" : "") +
          '><img src="../assets/icons/plus.svg" alt="" width="16" height="16" /> <span data-i18n="productListForm.itemAddSupplier"></span></button>'
        : '<p class="product-list-form__hint" data-i18n="productListForm.itemWarehouseHint"></p>' +
          '<div class="crud-table-wrap product-list-form__item-table-wrap product-list-form__wh-table-wrap"><div class="crud-table-wrap__body"><table class="data-table">' +
          "<thead><tr>" +
          '<th><span data-i18n="productList.wpLabelWarehouse"></span></th>' +
          '<th><span data-i18n="productList.wpLabelZone"></span></th>' +
          '<th><span data-i18n="productList.wpLabelShelf"></span></th>' +
          '<th><span data-i18n="productList.wpLabelRack"></span></th>' +
          '<th><span data-i18n="productList.wpLabelBin"></span></th>' +
          '<th class="data-table__col-numeric"><span data-i18n="productList.wpLabelQty"></span></th>' +
          '<th class="data-table__actions-col"><span data-i18n="crud.actions"></span></th>' +
          "</tr></thead><tbody>" +
          whBody +
          "</tbody></table></div></div>" +
          '<button type="button" class="btn btn--primary product-list-form__item-add-row plf-wh-add plf-variant-no-toggle" data-item-key="' +
          escapeAttr(itemKey) +
          '"><img src="../assets/icons/plus.svg" alt="" width="16" height="16" /> <span data-i18n="productListForm.itemAddWarehouse"></span></button>') +
      "</section></div>"
    );
  }

  function carTableHtml() {
    var rows = filteredCars();
    var totalPages = Math.max(1, Math.ceil(rows.length / CAR_PAGE_SIZE));
    if (carPage > totalPages) carPage = totalPages;
    var start = (carPage - 1) * CAR_PAGE_SIZE;
    var pageRows = rows.slice(start, start + CAR_PAGE_SIZE);
    var body = pageRows
      .map(function (c, idx) {
        var key = c.id != null ? "id-" + c.id : "d-" + c._draftId;
        var year =
          c.year_start && c.year_end
            ? escapeHtml(c.year_start + "-" + c.year_end)
            : escapeHtml(c.year_start || c.year_end || "—");
        return (
          "<tr>" +
          "<td>" +
          escapeHtml(attrName(Number(c.brand_id))) +
          "</td>" +
          "<td>" +
          escapeHtml(attrName(Number(c.model_id))) +
          "</td>" +
          "<td>" +
          escapeHtml(attrName(Number(c.engine_id))) +
          "</td>" +
          "<td>" +
          year +
          "</td>" +
          "<td>" +
          escapeHtml(gearLabel(c.gear)) +
          '</td><td class="data-table__col-center">' +
          '<div class="data-table__actions">' +
          '<button type="button" class="btn btn--icon plf-car-edit" data-car-key="' +
          escapeAttr(key) +
          '"><img src="../assets/icons/pencil.svg" alt="" width="16" height="16" /></button>' +
          '<button type="button" class="btn btn--icon crud-delete plf-car-delete" data-car-key="' +
          escapeAttr(key) +
          '"><img src="../assets/icons/trash-2.svg" alt="" width="16" height="16" /></button>' +
          "</div></td></tr>"
        );
      })
      .join("");
    if (!pageRows.length) {
      body =
        '<tr><td colspan="6" class="crud-empty" data-i18n="crud.empty"></td></tr>';
    }
    return (
      '<div class="product-list-form__car-toolbar">' +
      '<input type="search" id="plf-car-search" class="crud-toolbar__search" data-i18n-placeholder="search.placeholder" placeholder="ค้นหา" value="' +
      escapeAttr(carSearch) +
      '" />' +
      '<button type="button" class="btn btn--primary" id="plf-car-add"><img src="../assets/icons/plus.svg" alt="" width="16" height="16" /> <span data-i18n="productListForm.addCar"></span></button>' +
      "</div>" +
      '<div class="crud-table-wrap"><div class="crud-table-wrap__body"><table class="data-table">' +
      "<thead><tr>" +
      '<th><span data-i18n="productAttr.carBrand"></span></th>' +
      '<th><span data-i18n="productAttr.carModel"></span></th>' +
      '<th><span data-i18n="productAttr.carLevel.engine"></span></th>' +
      '<th><span data-i18n="productList.colYear"></span></th>' +
      '<th><span data-i18n="productList.colGear"></span></th>' +
      '<th class="data-table__actions-col"><span data-i18n="crud.actions"></span></th>' +
      "</tr></thead><tbody>" +
      body +
      "</tbody></table></div></div>" +
      '<nav class="crud-pagination" id="plf-car-pager" aria-label="Pagination"></nav>'
    );
  }

  function itemCardHtml(item) {
    var itemId = item.id != null ? Number(item.id) : null;
    var totalStock = itemId ? totalStockForItem(itemId) : 0;
    var minStock = Number(item.minimum_stock) || 0;
    var stockClass =
      itemId && totalStock < minStock ? " product-list-form__variant-stat-value--low" : "";
    var locName = locale();
    var draftName =
      (locName === "en"
        ? item.name_en || item.name_th
        : item.name_th || item.name_en) || "";
    draftName = String(draftName).trim();
    var displayName = draftName || (itemId ? itemDisplayName(itemId) : "") || "—";
    return (
      '<details class="product-list-form__variant plf-item"' +
      (item.open ? " open" : "") +
      ' data-item-key="' +
      escapeAttr(item._draftKey) +
      '"' +
      (item.id ? ' data-item-id="' + item.id + '"' : "") +
      ">" +
      '<summary class="product-list-form__variant-summary">' +
      '<div class="product-list-form__variant-row">' +
      '<div class="product-list-form__variant-thumb" aria-hidden="true">' +
      '<img src="../assets/icons/package.svg" alt="" width="24" height="24" /></div>' +
      '<div class="product-list-form__variant-stat">' +
      '<span class="product-list-form__variant-stat-label" data-i18n="col.sku"></span>' +
      '<span class="product-list-form__variant-stat-value product-list-form__variant-stat-value--sku">' +
      escapeHtml(item.sku || "—") +
      "</span></div>" +
      '<div class="product-list-form__variant-stat">' +
      '<span class="product-list-form__variant-stat-label" data-i18n="productListForm.variantName"></span>' +
      '<span class="product-list-form__variant-stat-value">' +
      escapeHtml(displayName) +
      "</span></div>" +
      '<div class="product-list-form__variant-stat">' +
      '<span class="product-list-form__variant-stat-label" data-i18n="productList.colStock"></span>' +
      '<span class="product-list-form__variant-stat-value' +
      stockClass +
      '">' +
      escapeHtml(String(totalStock)) +
      "</span></div>" +
      '<div class="product-list-form__variant-stat product-list-form__variant-stat--warehouse">' +
      '<span class="product-list-form__variant-stat-label" data-i18n="productList.colWarehouse"></span>' +
      itemWarehouseCellHtml(itemId) +
      "</div>" +
      '<div class="product-list-form__variant-stat product-list-form__variant-stat--status plf-variant-no-toggle">' +
      '<span class="product-list-form__variant-stat-label" data-i18n="col.status"></span>' +
      '<label class="crud-switch product-list__status-switch">' +
      '<input type="checkbox" data-field="is_active" role="switch"' +
      (item.is_active ? " checked" : "") +
      ' aria-label="' +
      escapeAttr(t("col.active")) +
      '" />' +
      '<span class="crud-switch__track" aria-hidden="true"><span class="crud-switch__thumb"></span></span>' +
      "</label></div>" +
      '<div class="product-list-form__variant-actions">' +
      (draft.items.length > 1
        ? '<button type="button" class="btn btn--icon crud-delete plf-item-remove plf-variant-no-toggle" data-item-key="' +
          escapeAttr(item._draftKey) +
          '" aria-label="' +
          escapeAttr(t("crud.delete")) +
          '"><img src="../assets/icons/trash-2.svg" alt="" width="16" height="16" /></button>'
        : "") +
      '<span class="product-list-form__variant-chevron" aria-hidden="true">' +
      '<img src="../assets/icons/chevron-down.svg" alt="" width="16" height="16" /></span></div></div></summary>' +
      '<div class="product-list-form__variant-body crud-form">' +
      itemExpandedSectionsHtml(item) +
      "</div></details>"
    );
  }

  function summaryHtml() {
    var cat =
      draft.product_category_id ? categoryBreadcrumbLabel(draft.product_category_id) : "—";
    var brand = draft.product_brand_id ? attrName(Number(draft.product_brand_id)) : "—";
    var name = locale() === "en" ? draft.name_en || draft.name_th : draft.name_th || draft.name_en;
    return (
      '<section class="product-list-form__card">' +
      '<h2 class="product-list-form__card-title" data-i18n="productListForm.summaryTitle"></h2>' +
      '<dl class="product-list-form__summary">' +
      "<dt>" +
      escapeHtml(t("productListForm.summaryName")) +
      "</dt><dd>" +
      escapeHtml(name || "—") +
      "</dd>" +
      "<dt>" +
      escapeHtml(t("col.sku")) +
      "</dt><dd>" +
      escapeHtml(draft.sku || "—") +
      "</dd>" +
      "<dt>" +
      escapeHtml(t("col.category")) +
      "</dt><dd>" +
      escapeHtml(cat) +
      "</dd>" +
      "<dt>" +
      escapeHtml(t("col.brand")) +
      "</dt><dd>" +
      escapeHtml(brand) +
      "</dd>" +
      "<dt>" +
      escapeHtml(t("productListForm.summaryCars")) +
      "</dt><dd>" +
      escapeHtml(String((draft.cars || []).length)) +
      "</dd></dl></section>"
    );
  }

  function sidebarHtml() {
    return (
      '<aside class="product-list-form__sidebar">' +
      '<section class="product-list-form__card">' +
      '<h2 class="product-list-form__card-title" data-i18n="productListForm.statusTitle"></h2>' +
      '<div class="product-list-form__sidebar-status">' +
      '<span class="product-list-form__sidebar-status-label" data-i18n="col.active"></span>' +
      '<label class="crud-switch"><input type="checkbox" id="plf-is-active" role="switch"' +
      (draft.is_active ? " checked" : "") +
      ' aria-label="' +
      escapeAttr(t("col.active")) +
      '" /><span class="crud-switch__track"><span class="crud-switch__thumb"></span></span></label></div></section>' +
      summaryHtml() +
      '<section class="product-list-form__card">' +
      '<div class="product-list-form__card-head">' +
      '<h2 class="product-list-form__card-title" data-i18n="productListForm.noteTitle"></h2>' +
      '<button type="button" class="btn btn--icon" id="plf-note-edit" aria-label="' +
      escapeAttr(t("crud.edit")) +
      '"><img src="../assets/icons/pencil.svg" alt="" width="16" height="16" /></button></div>' +
      '<p class="product-list-form__note-preview">' +
      escapeHtml(draft.note.trim() ? draft.note : "—") +
      "</p></section></aside>"
    );
  }

  function hasPersistedItemId(item) {
    return item.id != null && item.id !== "";
  }

  function isHistGroupOpen(key) {
    return historyOpenGroups[key] !== false;
  }

  function getHistoryPageSize() {
    try {
      var v = parseInt(sessionStorage.getItem(HISTORY_PAGE_SIZE_KEY), 10);
      if (HISTORY_PAGE_SIZE_OPTIONS.indexOf(v) >= 0) return v;
    } catch (err) {
      /* ponytail: sessionStorage optional */
    }
    return 10;
  }

  function setHistoryPageSize(next) {
    if (HISTORY_PAGE_SIZE_OPTIONS.indexOf(next) < 0) return;
    try {
      sessionStorage.setItem(HISTORY_PAGE_SIZE_KEY, String(next));
    } catch (err) {
      /* ponytail: sessionStorage optional */
    }
  }

  function historyProductItemIds() {
    if (!draft || !draft.items) return [];
    return draft.items.filter(hasPersistedItemId).map(function (it) {
      return it.id;
    });
  }

  function historyAllItemIdSet() {
    var set = {};
    historyProductItemIds().forEach(function (id) {
      set[id] = true;
    });
    return set;
  }

  function historyItemIdSet(filters) {
    var set = {};
    historyProductItemIds().forEach(function (id) {
      if (filters.itemId === "all" || String(filters.itemId) === String(id)) set[id] = true;
    });
    return set;
  }

  function historyItemVariants() {
    return historyProductItemIds().map(function (id) {
      var row = itemStoreRow(id);
      return { id: id, sku: row && row.sku ? row.sku : String(id) };
    });
  }

  function historyPeriodKey(mode, iso) {
    var s = String(iso || "");
    if (mode === "year") return s.slice(0, 4);
    if (mode === "month") return s.slice(0, 7);
    return s.slice(0, 10);
  }

  function historyPeriodLabel(mode, key) {
    if (!key) return "—";
    if (mode === "year") return key;
    if (mode === "month") {
      var parts = (global.i18n ? global.i18n.formatDate(key + "-01") : key).split(" ");
      return parts.length > 1 ? parts.slice(1).join(" ") : key;
    }
    return global.i18n ? global.i18n.formatDate(key) : key;
  }

  function historyRangeMatch(filters, iso) {
    var s = String(iso || "");
    if (filters.viewMode === "year") {
      var y = s.slice(0, 4);
      if (filters.yearFrom && y < String(filters.yearFrom)) return false;
      if (filters.yearTo && y > String(filters.yearTo)) return false;
      return true;
    }
    if (filters.viewMode === "month") {
      var m = s.slice(0, 7);
      if (filters.monthFrom && m < filters.monthFrom) return false;
      if (filters.monthTo && m > filters.monthTo) return false;
      return true;
    }
    var d = s.slice(0, 10);
    if (filters.dayFrom && d < filters.dayFrom) return false;
    if (filters.dayTo && d > filters.dayTo) return false;
    return true;
  }

  function historyItemAvgCost(itemId) {
    if (!global.store) return 0;
    var qty = 0;
    var weighted = 0;
    global.store.getAll("purchase_order_item").forEach(function (poi) {
      if (poi.deleted_at != null || poi.product_item_id !== itemId) return;
      var q = Number(poi.qty) || 0;
      qty += q;
      weighted += (Number(poi.price_per_unit) || 0) * q;
    });
    return qty > 0 ? weighted / qty : 0;
  }

  function historyPurchaseParties() {
    if (!global.store) return [];
    var idSet = historyAllItemIdSet();
    var seen = {};
    var out = [];
    global.store.getAll("purchase_order_item").forEach(function (poi) {
      if (poi.deleted_at != null || !idSet[poi.product_item_id]) return;
      var po = global.store.getById("purchase_order", poi.purchase_order_id);
      if (!po || po.deleted_at != null || po.supplier_user_id == null) return;
      var id = String(po.supplier_user_id);
      if (seen[id]) return;
      seen[id] = true;
      out.push({ id: id, name: supplierDisplayName(po.supplier_user_id) });
    });
    return out;
  }

  function historySalesParties() {
    if (!global.store) return [];
    var idSet = historyAllItemIdSet();
    var seen = {};
    var out = [];
    global.store.getAll("order_order_item").forEach(function (ooi) {
      if (ooi.deleted_at != null || !idSet[ooi.product_item_id]) return;
      var oo = global.store.getById("order_order", ooi.order_order_id);
      if (!oo || oo.deleted_at != null) return;
      var name = oo.member_name || "—";
      if (seen[name]) return;
      seen[name] = true;
      out.push({ id: name, name: name });
    });
    return out;
  }

  function historyDataYears() {
    if (!global.store) return [];
    var idSet = historyAllItemIdSet();
    var years = {};
    global.store.getAll("purchase_order_item").forEach(function (poi) {
      if (poi.deleted_at != null || !idSet[poi.product_item_id]) return;
      var po = global.store.getById("purchase_order", poi.purchase_order_id);
      if (po && po.deleted_at == null) years[String(po.ordered_at || po.created_at).slice(0, 4)] = true;
    });
    global.store.getAll("order_order_item").forEach(function (ooi) {
      if (ooi.deleted_at != null || !idSet[ooi.product_item_id]) return;
      var oo = global.store.getById("order_order", ooi.order_order_id);
      if (oo && oo.deleted_at == null) years[String(oo.ordered_at || oo.created_at).slice(0, 4)] = true;
    });
    return Object.keys(years).filter(Boolean).sort();
  }

  function historyPurchaseChild(poi, po) {
    var received = Number(poi.qty) || 0;
    var free = Number(poi.free_gift) || 0;
    var costUnit = Number(poi.price_per_unit) || 0;
    var discUnit = Number(poi.discount) || 0;
    var netPerPiece = costUnit - discUnit;
    var sellUnit = stockTypeSellPrice(poi.product_item_id);
    var profitUnit = sellUnit - netPerPiece;
    return {
      productItemId: poi.product_item_id,
      date: po.ordered_at || po.created_at,
      poSku: po.sku || "",
      supplierId: po.supplier_user_id,
      unit: poi.unit || "piece",
      ordered: received,
      free: free,
      received: received,
      costUnit: costUnit,
      discUnit: discUnit,
      netTotal: costUnit * received,
      discBaht: discUnit * received,
      netPerPiece: netPerPiece,
      sellUnit: sellUnit,
      profitUnit: profitUnit,
      profitPct: sellUnit > 0 ? (profitUnit / sellUnit) * 100 : null,
      supplier: supplierDisplayName(po.supplier_user_id),
    };
  }

  function historyPurchaseGroups(filters) {
    if (!global.store) return [];
    var idSet = historyItemIdSet(filters);
    if (!Object.keys(idSet).length) return [];
    var byKey = {};
    var order = [];
    global.store
      .getAll("purchase_order_item")
      .filter(function (poi) {
        return poi.deleted_at == null && idSet[poi.product_item_id];
      })
      .forEach(function (poi) {
        var po = global.store.getById("purchase_order", poi.purchase_order_id);
        if (!po || po.deleted_at != null) return;
        if (filters.partyId !== "all" && String(po.supplier_user_id) !== String(filters.partyId)) return;
        var iso = po.ordered_at || po.created_at;
        if (!historyRangeMatch(filters, iso)) return;
        var key = historyPeriodKey(filters.viewMode, iso);
        if (!byKey[key]) {
          byKey[key] = { key: key, children: [] };
          order.push(key);
        }
        byKey[key].children.push(historyPurchaseChild(poi, po));
      });

    var groups = order.map(function (key) {
      var g = byKey[key];
      var received = 0;
      var free = 0;
      var ordered = 0;
      var netTotal = 0;
      var discBaht = 0;
      var costWeighted = 0;
      var netPieceWeighted = 0;
      var sellWeighted = 0;
      var partySet = {};
      g.children.forEach(function (c) {
        ordered += c.ordered;
        free += c.free;
        received += c.received;
        netTotal += c.netTotal;
        discBaht += c.discBaht;
        costWeighted += c.costUnit * c.received;
        netPieceWeighted += c.netPerPiece * c.received;
        sellWeighted += c.sellUnit * c.received;
        if (c.supplierId != null) partySet[c.supplierId] = true;
      });
      var costUnit = received > 0 ? costWeighted / received : 0;
      var netPerPiece = received > 0 ? netPieceWeighted / received : 0;
      var sellUnit = received > 0 ? sellWeighted / received : 0;
      var discUnit = received > 0 ? discBaht / received : 0;
      var profitUnit = sellUnit - netPerPiece;
      return {
        key: key,
        label: historyPeriodLabel(filters.viewMode, key),
        partnerCount: Object.keys(partySet).length,
        children: g.children,
        metrics: {
          ordered: ordered,
          free: free,
          received: received,
          costUnit: costUnit,
          discUnit: discUnit,
          netTotal: netTotal,
          discBaht: discBaht,
          netPerPiece: netPerPiece,
          sellUnit: sellUnit,
          profitUnit: profitUnit,
          profitPct: sellUnit > 0 ? (profitUnit / sellUnit) * 100 : null,
        },
      };
    });
    groups.sort(function (a, b) {
      return a.key < b.key ? 1 : a.key > b.key ? -1 : 0;
    });
    return groups;
  }

  function historySalesChild(ooi, oo) {
    var qty = Number(ooi.amount) || 0;
    var sellGross = Number(ooi.price_per_unit) || 0;
    var discUnit = Number(ooi.discount) || 0;
    var netSellUnit = sellGross - discUnit;
    var netCostUnit = historyItemAvgCost(ooi.product_item_id);
    var netProfitUnit = netSellUnit - netCostUnit;
    return {
      productItemId: ooi.product_item_id,
      date: oo.ordered_at || oo.created_at,
      billNo: oo.sku || "—",
      customer: oo.member_name || "—",
      qty: qty,
      netCostUnit: netCostUnit,
      netSellUnit: netSellUnit,
      netSellTotal: netSellUnit * qty,
      netProfitUnit: netProfitUnit,
      netProfitTotal: netProfitUnit * qty,
      profitPct: netSellUnit > 0 ? (netProfitUnit / netSellUnit) * 100 : null,
    };
  }

  function historySalesGroups(filters) {
    if (!global.store) return [];
    var idSet = historyItemIdSet(filters);
    if (!Object.keys(idSet).length) return [];
    var byKey = {};
    var order = [];
    global.store
      .getAll("order_order_item")
      .filter(function (ooi) {
        return ooi.deleted_at == null && idSet[ooi.product_item_id];
      })
      .forEach(function (ooi) {
        var oo = global.store.getById("order_order", ooi.order_order_id);
        if (!oo || oo.deleted_at != null) return;
        if (filters.partyId !== "all" && (oo.member_name || "—") !== filters.partyId) return;
        var iso = oo.ordered_at || oo.created_at;
        if (!historyRangeMatch(filters, iso)) return;
        var key = historyPeriodKey(filters.viewMode, iso);
        if (!byKey[key]) {
          byKey[key] = { key: key, children: [] };
          order.push(key);
        }
        byKey[key].children.push(historySalesChild(ooi, oo));
      });

    var groups = order.map(function (key) {
      var g = byKey[key];
      var qty = 0;
      var netSellTotal = 0;
      var netProfitTotal = 0;
      var costWeighted = 0;
      var sellWeighted = 0;
      var partySet = {};
      g.children.forEach(function (c) {
        qty += c.qty;
        netSellTotal += c.netSellTotal;
        netProfitTotal += c.netProfitTotal;
        costWeighted += c.netCostUnit * c.qty;
        sellWeighted += c.netSellUnit * c.qty;
        partySet[c.customer] = true;
      });
      var netCostUnit = qty > 0 ? costWeighted / qty : 0;
      var netSellUnit = qty > 0 ? sellWeighted / qty : 0;
      var netProfitUnit = netSellUnit - netCostUnit;
      return {
        key: key,
        label: historyPeriodLabel(filters.viewMode, key),
        partnerCount: Object.keys(partySet).length,
        children: g.children,
        metrics: {
          qty: qty,
          netCostUnit: netCostUnit,
          netSellUnit: netSellUnit,
          netSellTotal: netSellTotal,
          netProfitUnit: netProfitUnit,
          netProfitTotal: netProfitTotal,
          profitPct: netSellUnit > 0 ? (netProfitUnit / netSellUnit) * 100 : null,
        },
      };
    });
    groups.sort(function (a, b) {
      return a.key < b.key ? 1 : a.key > b.key ? -1 : 0;
    });
    return groups;
  }

  function historyPurchaseSummary(groups) {
    var received = 0;
    var netTotal = 0;
    var free = 0;
    var min = null;
    var max = null;
    groups.forEach(function (g) {
      g.children.forEach(function (c) {
        received += c.received;
        netTotal += c.netTotal;
        free += c.free;
        if (c.received > 0) {
          if (min == null || c.netPerPiece < min) min = c.netPerPiece;
          if (max == null || c.netPerPiece > max) max = c.netPerPiece;
        }
      });
    });
    return {
      received: received,
      netTotal: netTotal,
      free: free,
      minCost: min || 0,
      maxCost: max || 0,
    };
  }

  function historySalesSummary(groups) {
    var qty = 0;
    var netTotal = 0;
    var min = null;
    var max = null;
    groups.forEach(function (g) {
      g.children.forEach(function (c) {
        qty += c.qty;
        netTotal += c.netSellTotal;
        if (c.qty > 0) {
          if (min == null || c.netSellUnit < min) min = c.netSellUnit;
          if (max == null || c.netSellUnit > max) max = c.netSellUnit;
        }
      });
    });
    return { qty: qty, netTotal: netTotal, minSell: min || 0, maxSell: max || 0 };
  }

  function historyStatCard(tone, icon, labelKey, valueHtml) {
    return (
      '<div class="product-list-form__lot-stat product-list-form__lot-stat--' +
      tone +
      '"><span class="product-list-form__lot-stat-icon" aria-hidden="true">' +
      '<img src="../assets/icons/' +
      icon +
      '.svg" alt="" width="20" height="20" /></span>' +
      '<div class="product-list-form__lot-stat-body">' +
      '<span class="product-list-form__lot-stat-label" data-i18n="' +
      labelKey +
      '"></span>' +
      '<span class="product-list-form__lot-stat-value">' +
      valueHtml +
      "</span></div></div>"
    );
  }

  function historyStatUnit(text) {
    return ' <span class="product-list-form__lot-stat-unit">' + escapeHtml(text) + "</span>";
  }

  function historyPurchaseSummaryHtml(summary) {
    var pcs = t("productListForm.histPiecesSuffix");
    var currency = t("productListForm.itemLotCurrencySuffix");
    return (
      '<div class="product-list-form__lot-summary product-list-form__hist-summary product-list-form__hist-summary--5">' +
      historyStatCard(
        "blue",
        "package",
        "productListForm.histSummaryReceived",
        escapeHtml(formatQty(summary.received)) + historyStatUnit(pcs)
      ) +
      historyStatCard(
        "green",
        "coins",
        "productListForm.histSummaryValue",
        escapeHtml(formatMoney(summary.netTotal)) + historyStatUnit(currency)
      ) +
      historyStatCard(
        "orange",
        "arrow-down",
        "productListForm.histSummaryMinCost",
        escapeHtml(formatMoney(summary.minCost)) + historyStatUnit(currency)
      ) +
      historyStatCard(
        "profit",
        "arrow-up",
        "productListForm.histSummaryMaxCost",
        escapeHtml(formatMoney(summary.maxCost)) + historyStatUnit(currency)
      ) +
      historyStatCard(
        "blue",
        "shopping-bag",
        "productListForm.histSummaryFreeTotal",
        escapeHtml(formatQty(summary.free)) + historyStatUnit(pcs)
      ) +
      "</div>"
    );
  }

  function historySalesSummaryHtml(summary) {
    var pcs = t("productListForm.histPiecesSuffix");
    var currency = t("productListForm.itemLotCurrencySuffix");
    return (
      '<div class="product-list-form__lot-summary product-list-form__hist-summary">' +
      historyStatCard(
        "blue",
        "package",
        "productListForm.histSalesSummarySold",
        escapeHtml(formatQty(summary.qty)) + historyStatUnit(pcs)
      ) +
      historyStatCard(
        "green",
        "coins",
        "productListForm.histSalesSummaryValue",
        escapeHtml(formatMoney(summary.netTotal)) + historyStatUnit(currency)
      ) +
      historyStatCard(
        "orange",
        "arrow-down",
        "productListForm.histSalesSummaryMin",
        escapeHtml(formatMoney(summary.minSell)) + historyStatUnit(currency)
      ) +
      historyStatCard(
        "profit",
        "arrow-up",
        "productListForm.histSalesSummaryMax",
        escapeHtml(formatMoney(summary.maxSell)) + historyStatUnit(currency)
      ) +
      "</div>"
    );
  }

  function historyFilterSelect(field, value, options) {
    var opts = options
      .map(function (o) {
        var sel = String(value) === String(o.value) ? " selected" : "";
        var i18n = o.i18n ? ' data-i18n="' + o.i18n + '"' : "";
        var text = o.i18n ? "" : escapeHtml(o.label);
        return '<option value="' + escapeAttr(String(o.value)) + '"' + sel + i18n + ">" + text + "</option>";
      })
      .join("");
    return (
      '<select class="product-list-form__hist-filter-control" data-plf-hist-filter="' +
      field +
      '">' +
      opts +
      "</select>"
    );
  }

  function historyFilterField(labelKey, controlHtml) {
    return (
      '<div class="form-field product-list-form__hist-filter">' +
      '<label><span data-i18n="' +
      labelKey +
      '"></span></label>' +
      controlHtml +
      "</div>"
    );
  }

  function historyRangeInput(field, type, value) {
    return (
      '<input type="' +
      type +
      '" class="product-list-form__hist-filter-control" data-plf-hist-filter="' +
      field +
      '" value="' +
      escapeAttr(value || "") +
      '" />'
    );
  }

  function historyFiltersHtml(tab, filters) {
    var allOpt = { value: "all", i18n: "productListForm.histFilterAll" };
    var viewSelect = historyFilterSelect("viewMode", filters.viewMode, [
      { value: "day", i18n: "productListForm.histViewModeDay" },
      { value: "month", i18n: "productListForm.histViewModeMonth" },
      { value: "year", i18n: "productListForm.histViewModeYear" },
    ]);

    var rangeHtml = "";
    if (filters.viewMode === "day") {
      rangeHtml =
        historyFilterField("productListForm.histFilterDateFrom", historyRangeInput("dayFrom", "date", filters.dayFrom)) +
        historyFilterField("productListForm.histFilterDateTo", historyRangeInput("dayTo", "date", filters.dayTo));
    } else if (filters.viewMode === "month") {
      rangeHtml =
        historyFilterField("productListForm.histFilterMonthFrom", historyRangeInput("monthFrom", "month", filters.monthFrom)) +
        historyFilterField("productListForm.histFilterMonthTo", historyRangeInput("monthTo", "month", filters.monthTo));
    } else {
      var years = historyDataYears();
      var yearOpts = [{ value: "", i18n: "productListForm.histFilterAll" }].concat(
        years.map(function (y) {
          return { value: y, label: y };
        })
      );
      rangeHtml =
        historyFilterField("productListForm.histFilterYearFrom", historyFilterSelect("yearFrom", filters.yearFrom, yearOpts)) +
        historyFilterField("productListForm.histFilterYearTo", historyFilterSelect("yearTo", filters.yearTo, yearOpts));
    }

    var itemOpts = [allOpt].concat(
      historyItemVariants().map(function (v) {
        return { value: v.id, label: v.sku };
      })
    );
    var parties = tab === "sales" ? historySalesParties() : historyPurchaseParties();
    var partyOpts = [allOpt].concat(
      parties.map(function (p) {
        return { value: p.id, label: p.name };
      })
    );
    var partyLabelKey = tab === "sales" ? "productListForm.histFilterCustomer" : "productListForm.histFilterPartner";

    return (
      '<div class="product-list-form__hist-filters">' +
      historyFilterField("productListForm.histViewModeLabel", viewSelect) +
      rangeHtml +
      historyFilterField("productListForm.histFilterProductCode", historyFilterSelect("itemId", filters.itemId, itemOpts)) +
      historyFilterField(partyLabelKey, historyFilterSelect("partyId", filters.partyId, partyOpts)) +
      '<div class="product-list-form__hist-filters-actions">' +
      '<button type="button" class="btn" data-plf-hist-export><img src="../assets/icons/download.svg" alt="" width="16" height="16" /> <span data-i18n="productListForm.histExport"></span></button>' +
      '<button type="button" class="btn" data-plf-hist-clear><span data-i18n="productListForm.histClearFilters"></span></button>' +
      "</div></div>"
    );
  }

  function historyMetricCells(m) {
    var profitPct =
      m.profitPct != null && Number.isFinite(m.profitPct) ? m.profitPct.toFixed(1) : null;
    return (
      '<td class="data-table__col-numeric">' +
      escapeHtml(formatQty(m.ordered)) +
      '</td><td class="data-table__col-numeric">' +
      escapeHtml(formatQty(m.free)) +
      '</td><td class="data-table__col-numeric product-list-form__lot-qty-received">' +
      escapeHtml(formatQty(m.received)) +
      '</td><td class="data-table__col-numeric">' +
      escapeHtml(formatMoney(m.costUnit)) +
      '</td><td class="data-table__col-numeric">' +
      escapeHtml(formatMoney(m.discUnit)) +
      '</td><td class="data-table__col-numeric">' +
      escapeHtml(formatMoney(m.netTotal)) +
      '</td><td class="data-table__col-numeric">' +
      escapeHtml(formatMoney(m.discBaht)) +
      '</td><td class="data-table__col-numeric product-list-form__lot-actual-unit">' +
      escapeHtml(formatMoney(m.netPerPiece)) +
      '</td><td class="data-table__col-numeric">' +
      escapeHtml(formatMoney(m.sellUnit)) +
      '</td><td class="data-table__col-numeric product-list-form__lot-profit-col">' +
      '<span class="product-list-form__lot-profit">' +
      escapeHtml(formatMoney(m.profitUnit)) +
      "</span>" +
      (profitPct != null
        ? '<span class="product-list-form__lot-profit-pct">' +
          escapeHtml(t("productListForm.itemLotProfitPctLine", { pct: profitPct })) +
          "</span>"
        : "") +
      "</td>"
    );
  }

  function historyGroupToggleCell(g, open) {
    return (
      '<td><button type="button" class="product-list-form__hist-toggle" data-plf-hist-group="' +
      escapeAttr(g.key) +
      '" aria-expanded="' +
      (open ? "true" : "false") +
      '"><img src="../assets/icons/' +
      (open ? "chevron-down" : "chevron-right") +
      '.svg" alt="" width="16" height="16" /><span>' +
      escapeHtml(g.label) +
      "</span></button></td>"
    );
  }

  function historyGroupRowsHtml(g) {
    var open = isHistGroupOpen(g.key);
    var head =
      '<tr class="product-list-form__hist-group-row">' +
      historyGroupToggleCell(g, open) +
      "<td>—</td>" +
      "<td>—</td>" +
      historyMetricCells(g.metrics) +
      '<td class="product-list-form__hist-partner">' +
      escapeHtml(t("productListForm.histPartnerCount", { count: g.partnerCount })) +
      "</td></tr>";
    if (!open) return head;
    var kids = g.children
      .map(function (c) {
        var name = itemDisplayName(c.productItemId);
        var itemRow = itemStoreRow(c.productItemId);
        var sku = itemRow && itemRow.sku ? itemRow.sku : "—";
        return (
          '<tr class="product-list-form__hist-child-row">' +
          '<td class="product-list-form__hist-child-date">' +
          escapeHtml(global.i18n ? global.i18n.formatDate(c.date) : "—") +
          "</td>" +
          '<td><div class="product-list-form__hist-product">' +
          escapeHtml(name || "—") +
          '</div><div class="product-list-form__hist-sku">SKU : ' +
          escapeHtml(sku) +
          "</div></td>" +
          "<td>" +
          escapeHtml(t(unitLabelKey(c.unit))) +
          "</td>" +
          historyMetricCells(c) +
          '<td class="product-list-form__hist-partner">' +
          escapeHtml(c.supplier) +
          "</td></tr>"
        );
      })
      .join("");
    return head + kids;
  }

  function historySalesMetricCells(m) {
    var profitPct =
      m.profitPct != null && Number.isFinite(m.profitPct) ? m.profitPct.toFixed(1) : null;
    return (
      '<td class="data-table__col-numeric">' +
      escapeHtml(formatQty(m.qty)) +
      '</td><td class="data-table__col-numeric">' +
      escapeHtml(formatMoney(m.netCostUnit)) +
      '</td><td class="data-table__col-numeric">' +
      escapeHtml(formatMoney(m.netSellUnit)) +
      '</td><td class="data-table__col-numeric">' +
      escapeHtml(formatMoney(m.netSellTotal)) +
      '</td><td class="data-table__col-numeric product-list-form__lot-actual-unit">' +
      escapeHtml(formatMoney(m.netProfitUnit)) +
      '</td><td class="data-table__col-numeric product-list-form__lot-profit-col">' +
      '<span class="product-list-form__lot-profit">' +
      escapeHtml(formatMoney(m.netProfitTotal)) +
      "</span>" +
      (profitPct != null
        ? '<span class="product-list-form__lot-profit-pct">' +
          escapeHtml(t("productListForm.itemLotProfitPctLine", { pct: profitPct })) +
          "</span>"
        : "") +
      '</td><td class="data-table__col-numeric">' +
      (profitPct != null ? escapeHtml(profitPct + "%") : "—") +
      "</td>"
    );
  }

  function historySalesGroupRowsHtml(g) {
    var open = isHistGroupOpen(g.key);
    var head =
      '<tr class="product-list-form__hist-group-row">' +
      historyGroupToggleCell(g, open) +
      "<td>—</td>" +
      historySalesMetricCells(g.metrics) +
      '<td class="product-list-form__hist-partner">' +
      escapeHtml(t("productListForm.histPartnerCount", { count: g.partnerCount })) +
      "</td></tr>";
    if (!open) return head;
    var kids = g.children
      .map(function (c) {
        return (
          '<tr class="product-list-form__hist-child-row">' +
          '<td class="product-list-form__hist-child-date">' +
          escapeHtml(global.i18n ? global.i18n.formatDate(c.date) : "—") +
          "</td>" +
          "<td>" +
          escapeHtml(c.billNo) +
          "</td>" +
          historySalesMetricCells(c) +
          '<td class="product-list-form__hist-partner">' +
          escapeHtml(c.customer) +
          "</td></tr>"
        );
      })
      .join("");
    return head + kids;
  }

  function historyPaginationHtml(page, pageSize, total, totalPages) {
    if (total === 0) return "";
    var prevDisabled = page <= 1;
    var nextDisabled = page >= totalPages;
    var from = (page - 1) * pageSize + 1;
    var to = Math.min(page * pageSize, total);
    var sizeOptions = HISTORY_PAGE_SIZE_OPTIONS.map(function (n) {
      return (
        '<option value="' + n + '"' + (n === pageSize ? " selected" : "") + ">" + n + "</option>"
      );
    }).join("");
    return (
      '<nav class="crud-pagination" aria-label="Pagination"><div class="crud-pagination__bar">' +
      '<div class="crud-pagination__size">' +
      '<select class="crud-pagination__select" id="plf-hist-page-size" aria-label="' +
      escapeAttr(t("crud.rowsPerPage")) +
      '">' +
      sizeOptions +
      "</select>" +
      '<span class="crud-pagination__total">' +
      escapeHtml(t("crud.showing", { from: from, to: to, total: total })) +
      "</span></div>" +
      '<div class="crud-pagination__pages">' +
      escapeHtml(t("crud.pageOf", { page: page, total: totalPages })) +
      "</div>" +
      '<div class="crud-pagination__nav">' +
      '<button type="button" class="crud-pagination__nav-btn crud-pagination__nav-btn--text" id="plf-hist-page-prev"' +
      (prevDisabled ? " disabled" : "") +
      '><img src="../assets/icons/chevron-left.svg" alt="" width="16" height="16" /><span data-i18n="crud.prev"></span></button>' +
      '<button type="button" class="crud-pagination__nav-btn crud-pagination__nav-btn--text" id="plf-hist-page-next"' +
      (nextDisabled ? " disabled" : "") +
      '><span data-i18n="crud.next"></span><img src="../assets/icons/chevron-right.svg" alt="" width="16" height="16" /></button>' +
      "</div></div></nav>"
    );
  }

  function historyPurchaseHtml() {
    var filters = historyState.purchase;
    var groups = historyPurchaseGroups(filters);
    var summaryHtml = historyPurchaseSummaryHtml(historyPurchaseSummary(groups));
    var filtersHtml = historyFiltersHtml("purchase", filters);

    var thead =
      "<thead>" +
      '<tr class="product-list-form__lot-group-row">' +
      '<th colspan="2" class="product-list-form__lot-group--info">' +
      '<span class="product-list-form__lot-group-label"><img src="../assets/icons/info.svg" alt="" width="14" height="14" /><span data-i18n="productListForm.histGroupInfo"></span></span></th>' +
      '<th colspan="4" class="product-list-form__lot-group--qty">' +
      '<span class="product-list-form__lot-group-label"><img src="../assets/icons/package.svg" alt="" width="14" height="14" /><span data-i18n="productListForm.histGroupQty"></span></span></th>' +
      '<th colspan="2" class="product-list-form__lot-group--unit">' +
      '<span class="product-list-form__lot-group-label"><img src="../assets/icons/coins.svg" alt="" width="14" height="14" /><span data-i18n="productListForm.histGroupUnitCost"></span></span></th>' +
      '<th colspan="3" class="product-list-form__lot-group--total">' +
      '<span class="product-list-form__lot-group-label"><img src="../assets/icons/coins.svg" alt="" width="14" height="14" /><span data-i18n="productListForm.histGroupCost"></span></span></th>' +
      '<th colspan="2" class="product-list-form__lot-group--sell">' +
      '<span class="product-list-form__lot-group-label"><img src="../assets/icons/shopping-bag.svg" alt="" width="14" height="14" /><span data-i18n="productListForm.histGroupSell"></span></span></th>' +
      '<th rowspan="2" class="product-list-form__hist-partner-col"><span data-i18n="productListForm.histColPartner"></span></th>' +
      "</tr><tr>" +
      '<th><span data-i18n="productListForm.histColOrderDate"></span></th>' +
      '<th><span data-i18n="productListForm.histColProduct"></span></th>' +
      '<th><span data-i18n="productListForm.histColUnit"></span></th>' +
      '<th class="data-table__col-numeric"><span data-i18n="productListForm.histColOrdered"></span></th>' +
      '<th class="data-table__col-numeric"><span data-i18n="productListForm.histColFree"></span></th>' +
      '<th class="data-table__col-numeric"><span data-i18n="productListForm.histColReceived"></span></th>' +
      '<th class="data-table__col-numeric"><span data-i18n="productListForm.histColCostPerUnit"></span></th>' +
      '<th class="data-table__col-numeric"><span data-i18n="productListForm.histColDiscountPerUnit"></span></th>' +
      '<th class="data-table__col-numeric"><span data-i18n="productListForm.histColNetCostTotal"></span></th>' +
      '<th class="data-table__col-numeric"><span data-i18n="productListForm.histColDiscountBaht"></span></th>' +
      '<th class="data-table__col-numeric"><span data-i18n="productListForm.histColNetCostPerPiece"></span></th>' +
      '<th class="data-table__col-numeric"><span data-i18n="productListForm.histColSellPerPiece"></span></th>' +
      '<th class="data-table__col-numeric"><span data-i18n="productListForm.histColProfitPerPiece"></span></th>' +
      "</tr></thead>";

    var pageSize = getHistoryPageSize();
    var totalPages = Math.max(1, Math.ceil(groups.length / pageSize));
    if (filters.page > totalPages) filters.page = totalPages;
    if (filters.page < 1) filters.page = 1;
    var slice = groups.slice((filters.page - 1) * pageSize, filters.page * pageSize);

    var body = slice.length
      ? slice.map(historyGroupRowsHtml).join("")
      : '<tr><td colspan="' +
        HISTORY_PURCHASE_COLS +
        '" class="crud-empty" data-i18n="productListForm.histPurchaseEmpty"></td></tr>';

    return (
      filtersHtml +
      summaryHtml +
      '<div class="crud-table-wrap product-list-form__hist-table-wrap"><div class="crud-table-wrap__body">' +
      '<table class="data-table product-list-form__lot-table product-list-form__hist-table">' +
      thead +
      "<tbody>" +
      body +
      "</tbody></table></div></div>" +
      historyPaginationHtml(filters.page, pageSize, groups.length, totalPages)
    );
  }

  function historySalesHtml() {
    var filters = historyState.sales;
    var groups = historySalesGroups(filters);
    var summaryHtml = historySalesSummaryHtml(historySalesSummary(groups));
    var filtersHtml = historyFiltersHtml("sales", filters);

    var thead =
      "<thead>" +
      '<tr class="product-list-form__lot-group-row">' +
      '<th colspan="3" class="product-list-form__lot-group--info">' +
      '<span class="product-list-form__lot-group-label"><img src="../assets/icons/info.svg" alt="" width="14" height="14" /><span data-i18n="productListForm.histSalesGroupProduct"></span></span></th>' +
      '<th colspan="3" class="product-list-form__lot-group--unit">' +
      '<span class="product-list-form__lot-group-label"><img src="../assets/icons/coins.svg" alt="" width="14" height="14" /><span data-i18n="productListForm.histSalesGroupCost"></span></span></th>' +
      '<th colspan="3" class="product-list-form__lot-group--qty">' +
      '<span class="product-list-form__lot-group-label"><img src="../assets/icons/chart-pie.svg" alt="" width="14" height="14" /><span data-i18n="productListForm.histSalesGroupProfit"></span></span></th>' +
      '<th rowspan="2" class="product-list-form__hist-partner-col"><span data-i18n="productListForm.histColCustomer"></span></th>' +
      "</tr><tr>" +
      '<th><span data-i18n="productListForm.histColSaleDate"></span></th>' +
      '<th><span data-i18n="productListForm.histColBillNo"></span></th>' +
      '<th class="data-table__col-numeric"><span data-i18n="productListForm.histColQty"></span></th>' +
      '<th class="data-table__col-numeric"><span data-i18n="productListForm.histColNetCostPerUnit"></span></th>' +
      '<th class="data-table__col-numeric"><span data-i18n="productListForm.histColNetSellPerUnit"></span></th>' +
      '<th class="data-table__col-numeric"><span data-i18n="productListForm.histColNetSellTotal"></span></th>' +
      '<th class="data-table__col-numeric"><span data-i18n="productListForm.histColNetProfitPerUnit"></span></th>' +
      '<th class="data-table__col-numeric"><span data-i18n="productListForm.histColNetProfitTotal"></span></th>' +
      '<th class="data-table__col-numeric"><span data-i18n="productListForm.histColProfitPct"></span></th>' +
      "</tr></thead>";

    var pageSize = getHistoryPageSize();
    var totalPages = Math.max(1, Math.ceil(groups.length / pageSize));
    if (filters.page > totalPages) filters.page = totalPages;
    if (filters.page < 1) filters.page = 1;
    var slice = groups.slice((filters.page - 1) * pageSize, filters.page * pageSize);

    var body = slice.length
      ? slice.map(historySalesGroupRowsHtml).join("")
      : '<tr><td colspan="' +
        HISTORY_SALES_COLS +
        '" class="crud-empty" data-i18n="productListForm.histSalesEmpty"></td></tr>';

    return (
      filtersHtml +
      summaryHtml +
      '<div class="crud-table-wrap product-list-form__hist-table-wrap"><div class="crud-table-wrap__body">' +
      '<table class="data-table product-list-form__lot-table product-list-form__hist-table">' +
      thead +
      "<tbody>" +
      body +
      "</tbody></table></div></div>" +
      historyPaginationHtml(filters.page, pageSize, groups.length, totalPages)
    );
  }

  function historyTabBtn(id, labelKey) {
    return (
      '<button type="button" class="product-list-form__item-tab' +
      (historySubTab === id ? " product-list-form__item-tab--active" : "") +
      '" role="tab" data-plf-hist-tab="' +
      id +
      '" aria-selected="' +
      (historySubTab === id ? "true" : "false") +
      '"><span data-i18n="' +
      labelKey +
      '"></span></button>'
    );
  }

  function historyPanelHtml() {
    return (
      '<div class="product-list-form__history">' +
      '<p class="product-list-form__muted product-list-form__history-pending" data-i18n="productListForm.histPhasePending"></p>' +
      "</div>"
    );
  }

  function tabBtn(id, labelKey) {
    return (
      '<button type="button" class="product-list-form__tab' +
      (activeTab === id ? " product-list-form__tab--active" : "") +
      '" role="tab" data-tab="' +
      id +
      '" aria-selected="' +
      (activeTab === id ? "true" : "false") +
      '"><span data-i18n="' +
      escapeHtml(labelKey) +
      '"></span></button>'
    );
  }

  function render() {
    if (!rootEl || !draft) return;
    var cancelKey = isEdit ? "crud.cancel" : "crud.back";
    var dataHidden = activeTab === "data" ? "" : " product-list-form__panel--hidden";
    var pricingHidden = activeTab === "pricing" ? "" : " product-list-form__panel--hidden";
    var historyHidden = activeTab === "history" ? "" : " product-list-form__panel--hidden";
    var layoutClass =
      activeTab === "data"
        ? " product-list-form__layout--with-sidebar"
        : " product-list-form__layout--full";
    var sidebar = activeTab === "data" ? sidebarHtml() : "";
    var savedVariantHtml = draft.items.filter(hasPersistedItemId).map(itemCardHtml).join("");
    var draftVariantHtml = draft.items
      .filter(function (it) {
        return !hasPersistedItemId(it);
      })
      .map(itemCardHtml)
      .join("");

    rootEl.innerHTML =
      '<div class="product-list-form__tabs" role="tablist">' +
      tabBtn("data", "productListForm.tabData") +
      tabBtn("pricing", "productListForm.tabPricing") +
      tabBtn("history", "productListForm.tabHistory") +
      "</div>" +
      '<div class="product-list-form__layout' +
      layoutClass +
      '">' +
      '<div class="product-list-form__main">' +
      '<div class="product-list-form__panel' +
      dataHidden +
      '" data-tab-panel="data">' +
      '<section class="product-list-form__card"><h2 class="product-list-form__card-title"><span class="product-list-form__section-num">1</span> <span data-i18n="productListForm.sectionInfo"></span></h2>' +
      '<div class="product-list-form__row">' +
      textField("productListForm.nameTh", "plf-name-th", draft.name_th, true) +
      textField("productListForm.nameEn", "plf-name-en", draft.name_en, true) +
      "</div>" +
      '<div class="product-list-form__row">' +
      categoryFieldHtml() +
      selectField("col.brand", "plf-brand", brandOptions(draft.product_brand_id), true) +
      "</div></section>" +
      '<section class="product-list-form__card"><h2 class="product-list-form__card-title"><span class="product-list-form__section-num">2</span> <span data-i18n="productListForm.sectionDetails"></span></h2>' +
      '<div class="product-list-form__row">' +
      textField("productListForm.subNameTh", "plf-sub-th", draft.sub_name_th, false) +
      textField("productListForm.subNameEn", "plf-sub-en", draft.sub_name_en, false) +
      "</div>" +
      '<div class="product-list-form__row">' +
      textareaField("productListForm.descTh", "plf-desc-th", draft.desc_th) +
      textareaField("productListForm.descEn", "plf-desc-en", draft.desc_en) +
      "</div>" +
      textField("productListForm.tag", "plf-tag", draft.tag, false) +
      "</section>" +
      '<section class="product-list-form__card"><h2 class="product-list-form__card-title"><span class="product-list-form__section-num">3</span> <span data-i18n="productListForm.sectionCodes"></span></h2>' +
      '<div class="product-list-form__row">' +
      textField("col.sku", "plf-sku", draft.sku, true) +
      textField("productListForm.supplierSku", "plf-supplier-sku", draft.supplier_sku, false) +
      "</div>" +
      '<div class="product-list-form__row product-list-form__row--codes">' +
      '<div class="form-field">' +
      '<label><span data-i18n="productListForm.factoryCodes"></span></label>' +
      codeListHtml("plf-factory-code", draft.factoryCodes, "productListForm.addFactoryCode") +
      "</div>" +
      '<div class="form-field">' +
      '<label><span data-i18n="productListForm.otherCodes"></span></label>' +
      codeListHtml("plf-other-code", draft.otherCodes, "productListForm.addOtherCode") +
      "</div></div></section>" +
      '<section class="product-list-form__card"><h2 class="product-list-form__card-title"><span class="product-list-form__section-num">4</span> <span data-i18n="productListForm.sectionPartners"></span></h2>' +
      supplierPartnersFieldHtml(draft.supplierIds) +
      "</section>" +
      '<section class="product-list-form__card"><h2 class="product-list-form__card-title"><span class="product-list-form__section-num">5</span> <span data-i18n="productListForm.sectionCars"></span></h2>' +
      carTableHtml() +
      "</section></div>" +
      '<div class="product-list-form__panel' +
      pricingHidden +
      '" data-tab-panel="pricing">' +
      '<div class="product-list-form__pricing">' +
      (savedVariantHtml
        ? '<div class="product-list-form__variant-list">' + savedVariantHtml + "</div>"
        : "") +
      '<div class="product-list-form__add-item-wrap">' +
      '<button type="button" class="btn product-list-form__add-price" id="plf-item-add"><img src="../assets/icons/plus.svg" alt="" width="16" height="16" /> <span data-i18n="productListForm.addPrice"></span></button>' +
      "</div>" +
      (draftVariantHtml
        ? '<div class="product-list-form__variant-list">' + draftVariantHtml + "</div>"
        : "") +
      "</div></div>" +
      '<div class="product-list-form__panel' +
      historyHidden +
      '" data-tab-panel="history">' +
      historyPanelHtml() +
      "</div>" +
      "</div>" +
      sidebar +
      "</div>" +
      '<div class="product-list-form__footer">' +
      '<a href="product-list.html" class="btn" data-i18n="' +
      cancelKey +
      '"></a>' +
      (can(isEdit ? "update" : "create")
        ? '<button type="button" class="btn btn--primary" id="plf-save"' +
          (isSaving ? " disabled" : "") +
          '><span data-i18n="crud.save"></span></button>'
        : "") +
      "</div>";

    if (global.i18n) global.i18n.init();
    if (global.permissions) global.permissions.applyActionButtons(rootEl);

    var pager = rootEl.querySelector("#plf-car-pager");
    var carTotal = filteredCars().length;
    var carPages = Math.max(1, Math.ceil(carTotal / CAR_PAGE_SIZE));
    if (pager && global.crudList && global.crudList.renderPaginationBar) {
      global.crudList.renderPaginationBar(
        pager,
        { page: carPage, pageSize: CAR_PAGE_SIZE },
        { total: carTotal, totalPages: carPages },
        function (patch) {
          collectDraftFromDom();
          if (patch.page != null) carPage = patch.page;
          render();
        }
      );
    }

    bindEvents();
  }

  function carBrandOptions(selected) {
    return global.store
      .getAll("product_attribute")
      .filter(function (r) {
        return r.deleted_at == null && r.type === "car" && r.type_car === "brand" && r.is_active;
      })
      .map(function (r) {
        var sel = String(selected) === String(r.id) ? " selected" : "";
        return (
          '<option value="' + r.id + '"' + sel + ">" + escapeHtml(attrName(r.id)) + "</option>"
        );
      })
      .join("");
  }

  function carModelOptions(brandId, selected) {
    if (!brandId) return "";
    return global.store
      .getAll("product_attribute")
      .filter(function (r) {
        return (
          r.deleted_at == null &&
          r.type === "car" &&
          r.type_car === "model" &&
          r.parent_id === Number(brandId) &&
          r.is_active
        );
      })
      .map(function (r) {
        var sel = String(selected) === String(r.id) ? " selected" : "";
        return (
          '<option value="' + r.id + '"' + sel + ">" + escapeHtml(attrName(r.id)) + "</option>"
        );
      })
      .join("");
  }

  function carEngineOptions(modelId, selected) {
    if (!modelId) return "";
    return global.store
      .getAll("product_attribute")
      .filter(function (r) {
        return (
          r.deleted_at == null &&
          r.type === "car" &&
          r.type_car === "engine" &&
          r.parent_id === Number(modelId) &&
          r.is_active
        );
      })
      .map(function (r) {
        var sel = String(selected) === String(r.id) ? " selected" : "";
        return (
          '<option value="' + r.id + '"' + sel + ">" + escapeHtml(attrName(r.id)) + "</option>"
        );
      })
      .join("");
  }

  function findCarByKey(key) {
    return draft.cars.find(function (c) {
      var k = c.id != null ? "id-" + c.id : "d-" + c._draftId;
      return k === key;
    });
  }

  function openCarModal(editKey) {
    carEditKey = editKey || null;
    var row = editKey ? findCarByKey(editKey) : null;
    if (!carModalEl) {
      carModalEl = document.createElement("div");
      carModalEl.className = "modal-overlay";
      carModalEl.hidden = true;
      document.body.appendChild(carModalEl);
    }
    var brand = row ? row.brand_id : "";
    var model = row ? row.model_id : "";
    carModalEl.innerHTML =
      '<div class="modal crud-modal" role="dialog" aria-modal="true">' +
      '<div class="modal__header"><h2 class="modal__title" data-i18n="productListForm.carDialogTitle"></h2>' +
      '<button type="button" class="modal__close plf-car-close"><img src="../assets/icons/x.svg" alt="" width="18" height="18" /></button></div>' +
      '<form id="plf-car-form" class="modal__content crud-form" novalidate>' +
      selectField("productAttr.carBrand", "plf-car-brand", carBrandOptions(brand), true) +
      selectField("productAttr.carModel", "plf-car-model", carModelOptions(brand, model), true) +
      selectField("productAttr.carLevel.engine", "plf-car-engine", carEngineOptions(model, row ? row.engine_id : ""), true) +
      '<div class="crud-form__row">' +
      yearField("productList.colYear", "plf-car-year-start", row ? row.year_start : "") +
      yearField("productListForm.yearEnd", "plf-car-year-end", row ? row.year_end : "") +
      "</div>" +
      '<div class="form-field"><label for="plf-car-gear"><span data-i18n="productList.colGear"></span></label>' +
      '<select id="plf-car-gear">' +
      ["auto", "manual"]
        .map(function (g) {
          var sel = (row ? row.gear : "auto") === g ? " selected" : "";
          return '<option value="' + g + '"' + sel + ">" + escapeHtml(gearLabel(g)) + "</option>";
        })
        .join("") +
      "</select></div></form>" +
      '<div class="modal__footer">' +
      '<button type="button" class="btn plf-car-close" data-i18n="crud.cancel"></button>' +
      '<button type="submit" form="plf-car-form" class="btn btn--primary" data-i18n="crud.save"></button></div></div>';
    carModalEl.hidden = false;
    document.body.classList.add("modal-open");
    if (global.i18n) global.i18n.init();

    var brandEl = carModalEl.querySelector("#plf-car-brand");
    var modelEl = carModalEl.querySelector("#plf-car-model");
    var engineEl = carModalEl.querySelector("#plf-car-engine");
    brandEl.addEventListener("change", function () {
      modelEl.innerHTML =
        '<option value="" disabled selected>' +
        escapeHtml(t("form.placeholder.select", { label: t("productAttr.carModel") })) +
        "</option>" +
        carModelOptions(brandEl.value, "");
      engineEl.innerHTML =
        '<option value="" disabled selected>' +
        escapeHtml(t("form.placeholder.select", { label: t("productAttr.carLevel.engine") })) +
        "</option>";
    });
    modelEl.addEventListener("change", function () {
      engineEl.innerHTML =
        '<option value="" disabled selected>' +
        escapeHtml(t("form.placeholder.select", { label: t("productAttr.carLevel.engine") })) +
        "</option>" +
        carEngineOptions(modelEl.value, "");
    });

    carModalEl.querySelectorAll(".plf-car-close").forEach(function (btn) {
      btn.addEventListener("click", closeCarModal);
    });
    carModalEl.addEventListener("click", function (e) {
      if (e.target === carModalEl) closeCarModal();
    });
    carModalEl.querySelector("#plf-car-form").addEventListener("submit", function (e) {
      e.preventDefault();
      var b = brandEl.value;
      var m = modelEl.value;
      var eng = engineEl.value;
      if (!b || !m || !eng) {
        global.toast.show(t("error.required"), "error");
        return;
      }
      var payload = {
        brand_id: b,
        model_id: m,
        engine_id: eng,
        gear: carModalEl.querySelector("#plf-car-gear").value || "auto",
        year_start: val("plf-car-year-start"),
        year_end: val("plf-car-year-end"),
      };
      var wasCarEdit = !!(carEditKey && findCarByKey(carEditKey));
      if (wasCarEdit) {
        Object.assign(findCarByKey(carEditKey), payload);
      } else {
        draft.cars.push(Object.assign({ _draftId: nextCarDraftId-- }, payload));
      }
      closeCarModal();
      collectDraftFromDom();
      render();
      global.toast.show(
        t(wasCarEdit ? "productListForm.toastCarUpdated" : "productListForm.toastCarAdded"),
        "success"
      );
    });
  }

  function closeCarModal() {
    if (!carModalEl) return;
    carModalEl.hidden = true;
    document.body.classList.remove("modal-open");
    carEditKey = null;
  }

  function closeChannelAddModal() {
    if (!channelAddModalEl) return;
    channelAddModalEl.hidden = true;
    document.body.classList.remove("modal-open");
  }

  function closeSupplierAddModal() {
    if (!supplierAddModalEl) return;
    supplierAddModalEl.hidden = true;
    document.body.classList.remove("modal-open");
  }

  function openChannelAddModal(itemKey) {
    collectDraftFromDom();
    var draftItem = findItemDraftByKey(itemKey);
    if (!draftItem) return;
    var opts = channelOptionsNotOnDraft(draftItem);
    if (!opts.length) {
      global.toast.show(t("productListForm.itemChannelAllAdded"), "info");
      return;
    }
    if (!channelAddModalEl) {
      channelAddModalEl = document.createElement("div");
      channelAddModalEl.className = "modal-overlay";
      channelAddModalEl.hidden = true;
      document.body.appendChild(channelAddModalEl);
      channelAddModalEl.addEventListener("click", function (e) {
        if (e.target === channelAddModalEl) closeChannelAddModal();
      });
    }
    var loc = locale();
    var channelOpts =
      '<option value="" disabled selected>' +
      escapeHtml(t("form.placeholder.select", { label: t("productListForm.itemColChannel") })) +
      "</option>" +
      opts
        .map(function (c) {
          return (
            '<option value="' +
            c.id +
            '">' +
            escapeHtml(saleChannelName(c.id, loc)) +
            "</option>"
          );
        })
        .join("");
    channelAddModalEl.innerHTML =
      '<div class="modal crud-modal" role="dialog" aria-modal="true">' +
      '<div class="modal__header"><h2 class="modal__title" data-i18n="productListForm.itemChannelAddDialogTitle"></h2>' +
      '<button type="button" class="modal__close plf-channel-add-close"><img src="../assets/icons/x.svg" alt="" width="18" height="18" /></button></div>' +
      '<form id="plf-channel-add-form" class="modal__content crud-form" novalidate>' +
      '<div class="form-field"><label for="plf-channel-add-channel"><span data-i18n="productListForm.itemColChannel"></span><span class="form-field__required" aria-hidden="true">*</span></label>' +
      '<select id="plf-channel-add-channel" required>' +
      channelOpts +
      "</select></div>" +
      '<div class="form-field"><label for="plf-channel-add-price"><span data-i18n="productListForm.itemColPriceExVat"></span><span class="form-field__required" aria-hidden="true">*</span></label>' +
      '<input type="number" id="plf-channel-add-price" step="any" min="0" required data-i18n-placeholder-input="productListForm.itemColPriceExVat" placeholder="" value="0" /></div></form>' +
      '<div class="modal__footer">' +
      '<button type="button" class="btn plf-channel-add-close" data-i18n="crud.cancel"></button>' +
      '<button type="submit" form="plf-channel-add-form" class="btn btn--primary" data-i18n="crud.save"></button></div></div>';
    channelAddModalEl.hidden = false;
    document.body.classList.add("modal-open");
    if (global.i18n) global.i18n.init();
    channelAddModalEl.querySelectorAll(".plf-channel-add-close").forEach(function (btn) {
      btn.addEventListener("click", closeChannelAddModal);
    });
    channelAddModalEl.querySelector("#plf-channel-add-form").addEventListener("submit", function (e) {
      e.preventDefault();
      collectDraftFromDom();
      var chEl = channelAddModalEl.querySelector("#plf-channel-add-channel");
      var chId = chEl && chEl.value ? Number(chEl.value) : null;
      if (!chId) {
        global.toast.show(t("error.required"), "error");
        return;
      }
      var addTarget = findItemDraftByKey(itemKey);
      if (!addTarget) return;
      var dup = (addTarget.channelPrices || []).some(function (r) {
        return r.setting_sale_channel_id === chId;
      });
      if (dup) {
        global.toast.show(t("productListForm.itemChannelDuplicate"), "error");
        return;
      }
      var price = Number(channelAddModalEl.querySelector("#plf-channel-add-price").value) || 0;
      setItemDraftChannelPrice(itemKey, chId, price);
      closeChannelAddModal();
      render();
      global.toast.show(t("crud.saved"), "success");
    });
  }

  function openSupplierAddModal(itemKey) {
    var opts = supplierOptionsNotOnItem(itemKey);
    if (!opts.length) {
      global.toast.show(t("productListForm.itemSupplierAllAdded"), "info");
      return;
    }
    if (!supplierAddModalEl) {
      supplierAddModalEl = document.createElement("div");
      supplierAddModalEl.className = "modal-overlay";
      supplierAddModalEl.hidden = true;
      document.body.appendChild(supplierAddModalEl);
      supplierAddModalEl.addEventListener("click", function (e) {
        if (e.target === supplierAddModalEl) closeSupplierAddModal();
      });
    }
    var supOpts =
      '<option value="" disabled selected>' +
      escapeHtml(t("form.placeholder.select", { label: t("productListForm.itemColSupplier") })) +
      "</option>" +
      opts
        .map(function (o) {
          return '<option value="' + escapeAttr(o.value) + '">' + escapeHtml(o.label) + "</option>";
        })
        .join("");
    supplierAddModalEl.innerHTML =
      '<div class="modal crud-modal" role="dialog" aria-modal="true">' +
      '<div class="modal__header"><h2 class="modal__title" data-i18n="productListForm.itemSupplierAddDialogTitle"></h2>' +
      '<button type="button" class="modal__close plf-supplier-add-close"><img src="../assets/icons/x.svg" alt="" width="18" height="18" /></button></div>' +
      '<form id="plf-supplier-add-form" class="modal__content crud-form" novalidate>' +
      '<div class="form-field"><label for="plf-supplier-add-user"><span data-i18n="productListForm.itemColSupplier"></span><span class="form-field__required" aria-hidden="true">*</span></label>' +
      '<select id="plf-supplier-add-user" required>' +
      supOpts +
      "</select></div>" +
      '<div class="crud-form__row">' +
      '<div class="form-field"><label for="plf-supplier-add-cost"><span data-i18n="productListForm.itemColCost"></span><span class="form-field__required" aria-hidden="true">*</span></label>' +
      '<input type="number" id="plf-supplier-add-cost" step="any" min="0" required data-i18n-placeholder-input="productListForm.itemColCost" placeholder="" value="0" /></div>' +
      '<div class="form-field"><label for="plf-supplier-add-discount"><span data-i18n="productListForm.itemColDiscount"></span></label>' +
      '<input type="number" id="plf-supplier-add-discount" step="any" min="0" data-i18n-placeholder-input="productListForm.itemColDiscount" placeholder="" value="0" /></div></div>' +
      '<div class="form-field"><label for="plf-supplier-add-discount-type"><span data-i18n="productListForm.itemColDiscountType"></span></label>' +
      '<select id="plf-supplier-add-discount-type">' +
      '<option value="baht" data-i18n="productListForm.discountBaht"></option>' +
      '<option value="percent" data-i18n="productListForm.discountPercent"></option>' +
      "</select></div></form>" +
      '<div class="modal__footer">' +
      '<button type="button" class="btn plf-supplier-add-close" data-i18n="crud.cancel"></button>' +
      '<button type="submit" form="plf-supplier-add-form" class="btn btn--primary" data-i18n="crud.save"></button></div></div>';
    supplierAddModalEl.hidden = false;
    document.body.classList.add("modal-open");
    if (global.i18n) global.i18n.init();
    supplierAddModalEl.querySelectorAll(".plf-supplier-add-close").forEach(function (btn) {
      btn.addEventListener("click", closeSupplierAddModal);
    });
    supplierAddModalEl.querySelector("#plf-supplier-add-form").addEventListener("submit", function (e) {
      e.preventDefault();
      var supEl = supplierAddModalEl.querySelector("#plf-supplier-add-user");
      var supId = supEl && supEl.value ? Number(supEl.value) : null;
      if (!supId) {
        global.toast.show(t("error.required"), "error");
        return;
      }
      collectDraftFromDom();
      var addTarget = findItemDraftByKey(itemKey);
      if (addTarget && supplierOnItem(addTarget, supId)) {
        global.toast.show(t("productListForm.itemSupplierDuplicate"), "error");
        return;
      }
      var cost =
        Number(supplierAddModalEl.querySelector("#plf-supplier-add-cost").value) || 0;
      var discount =
        Number(supplierAddModalEl.querySelector("#plf-supplier-add-discount").value) || 0;
      var discType =
        supplierAddModalEl.querySelector("#plf-supplier-add-discount-type").value || "baht";
      closeSupplierAddModal();
      linkPartnerToDraft(supId);
      setItemDraftSupplierRow(itemKey, supId, {
        cost_price: cost,
        discount: discount,
        discount_type: discType === "percent" ? "percent" : "baht",
      });
      render();
      global.toast.show(t("crud.saved"), "success");
    });
  }

  function whLevelField(level) {
    if (level === "warehouse") return "warehouse_id";
    if (level === "zone") return "zone_id";
    if (level === "shelf") return "shelf_id";
    if (level === "rack") return "rack_id";
    if (level === "bin") return "bin_id";
    return null;
  }

  function readWhRowFromDom(tr, itemKey, rowKey) {
    var row = findWhPlacementRow(itemKey, rowKey);
    if (!row || !tr) return null;
    tr.querySelectorAll("[data-plf-wh-cascade]").forEach(function (el) {
      var level = el.getAttribute("data-wh-level");
      var field = whLevelField(level);
      if (!field) return;
      row[field] = el.value ? Number(el.value) : null;
    });
    var qtyEl = tr.querySelector("[data-plf-wh-qty]");
    row.quantity = qtyEl ? String(qtyEl.value || "").trim() : "";
    return row;
  }

  function bindItemTableCrudEvents() {
    if (itemTableCrudBound || !rootEl) return;
    itemTableCrudBound = true;
    rootEl.addEventListener("change", function (e) {
      var cascade = e.target.closest("[data-plf-wh-cascade]");
      if (!cascade || cascade.disabled) return;
      var itemKey = cascade.getAttribute("data-item-key");
      var rowKey = cascade.getAttribute("data-wh-row-key");
      var level = cascade.getAttribute("data-wh-level");
      if (!itemKey || !rowKey || !level) return;
      collectDraftFromDom();
      var row = findWhPlacementRow(itemKey, rowKey);
      if (!row) return;
      var field = whLevelField(level);
      if (!field) return;
      row[field] = cascade.value ? Number(cascade.value) : null;
      clearWhCascadeFromLevel(row, level);
      render();
    });
    rootEl.addEventListener("click", function (e) {
      var addCh = e.target.closest(".plf-channel-add");
      if (addCh && !addCh.disabled) {
        e.preventDefault();
        e.stopPropagation();
        var block = addCh.closest(".plf-item");
        if (!block) return;
        var itemKey = addCh.getAttribute("data-item-key") || block.getAttribute("data-item-key");
        collectDraftFromDom();
        openChannelAddModal(itemKey);
        return;
      }
      var addSup = e.target.closest(".plf-supplier-add");
      if (addSup && !addSup.disabled) {
        e.preventDefault();
        e.stopPropagation();
        var blockSup = addSup.closest(".plf-item");
        if (!blockSup) return;
        collectDraftFromDom();
        openSupplierAddModal(blockSup.getAttribute("data-item-key"));
        return;
      }
      var chEdit = e.target.closest(".plf-channel-edit");
      if (chEdit) {
        e.preventDefault();
        e.stopPropagation();
        var blockE = chEdit.closest(".plf-item");
        if (!blockE) return;
        var keyE = blockE.getAttribute("data-item-key");
        collectDraftFromDom();
        delete itemSupplierEditByKey[keyE];
        itemChannelEditByKey[keyE] = Number(chEdit.getAttribute("data-channel-id"));
        render();
        return;
      }
      var chCancel = e.target.closest(".plf-channel-cancel");
      if (chCancel) {
        e.preventDefault();
        e.stopPropagation();
        var blockC = chCancel.closest(".plf-item");
        if (blockC) clearItemInlineEdits(blockC.getAttribute("data-item-key"));
        render();
        return;
      }
      var chSave = e.target.closest(".plf-channel-save");
      if (chSave) {
        e.preventDefault();
        e.stopPropagation();
        var blockS = chSave.closest(".plf-item");
        if (!blockS) return;
        var keyS = blockS.getAttribute("data-item-key");
        var rowS = chSave.closest("tr");
        var chIdS = Number(rowS && rowS.getAttribute("data-channel-id"));
        if (!rowS || !chIdS) return;
        collectDraftFromDom();
        setItemDraftChannelPrice(keyS, chIdS, channelPriceExFromRow(rowS));
        clearItemInlineEdits(keyS);
        render();
        global.toast.show(t("crud.saved"), "success");
        return;
      }
      var chDel = e.target.closest(".plf-channel-delete");
      if (chDel) {
        e.preventDefault();
        e.stopPropagation();
        var blockD = chDel.closest(".plf-item");
        if (!blockD) return;
        var keyD = blockD.getAttribute("data-item-key");
        var chIdD = Number(chDel.getAttribute("data-channel-id"));
        confirmDestructive(function () {
          collectDraftFromDom();
          removeItemDraftChannel(keyD, chIdD);
          clearItemInlineEdits(keyD);
          render();
          global.toast.show(t("crud.deleted"), "success");
        });
        return;
      }
      var supEdit = e.target.closest(".plf-supplier-edit");
      if (supEdit) {
        e.preventDefault();
        e.stopPropagation();
        var blockSe = supEdit.closest(".plf-item");
        if (!blockSe) return;
        var keySe = blockSe.getAttribute("data-item-key");
        collectDraftFromDom();
        delete itemChannelEditByKey[keySe];
        itemSupplierEditByKey[keySe] = Number(supEdit.getAttribute("data-supplier-row-id"));
        render();
        return;
      }
      var supCancel = e.target.closest(".plf-supplier-cancel");
      if (supCancel) {
        e.preventDefault();
        e.stopPropagation();
        var blockSc = supCancel.closest(".plf-item");
        if (blockSc) clearItemInlineEdits(blockSc.getAttribute("data-item-key"));
        render();
        return;
      }
      var supSave = e.target.closest(".plf-supplier-save");
      if (supSave) {
        e.preventDefault();
        e.stopPropagation();
        var blockSs = supSave.closest(".plf-item");
        if (!blockSs) return;
        var keySs = blockSs.getAttribute("data-item-key");
        var rowSs = supSave.closest("tr");
        var supUserId = Number(rowSs && rowSs.getAttribute("data-supplier-row-id"));
        if (!supUserId) return;
        var costInp = rowSs.querySelector('[data-supplier-field="cost_price"]');
        var discInp = rowSs.querySelector('[data-supplier-field="discount"]');
        var typeEl = rowSs.querySelector('[data-supplier-field="discount_type"]');
        collectDraftFromDom();
        setItemDraftSupplierRow(keySs, supUserId, {
          cost_price: Number(costInp && costInp.value) || 0,
          discount: Number(discInp && discInp.value) || 0,
          discount_type: typeEl && typeEl.value === "percent" ? "percent" : "baht",
        });
        clearItemInlineEdits(keySs);
        render();
        global.toast.show(t("crud.saved"), "success");
        return;
      }
      var supDel = e.target.closest(".plf-supplier-delete");
      if (supDel) {
        e.preventDefault();
        e.stopPropagation();
        var blockSd = supDel.closest(".plf-item");
        if (!blockSd) return;
        var keySd = blockSd.getAttribute("data-item-key");
        var supIdDel = Number(supDel.getAttribute("data-supplier-row-id"));
        confirmDestructive(function () {
          clearItemInlineEdits(keySd);
          removePartnerLinked(supIdDel);
        });
        return;
      }
      var whAdd = e.target.closest(".plf-wh-add");
      if (whAdd && !whAdd.disabled) {
        e.preventDefault();
        e.stopPropagation();
        var blockWa = whAdd.closest(".plf-item");
        if (!blockWa) return;
        var keyWa = whAdd.getAttribute("data-item-key") || blockWa.getAttribute("data-item-key");
        collectDraftFromDom();
        var itWa = findItemDraftByKey(keyWa);
        if (!itWa) return;
        ensureItemWarehouseDraft(itWa);
        itWa.warehousePlacements.push(defaultWarehousePlacementRow());
        render();
        return;
      }
      var whSave = e.target.closest(".plf-wh-save");
      if (whSave) {
        e.preventDefault();
        e.stopPropagation();
        var keyWs = whSave.getAttribute("data-item-key");
        var rowKeyWs = whSave.getAttribute("data-wh-row-key");
        var trWs = whSave.closest("tr");
        collectDraftFromDom();
        var rowWs = readWhRowFromDom(trWs, keyWs, rowKeyWs);
        if (!rowWs || !rowWs.bin_id) {
          global.toast.show(t("error.required"), "error");
          return;
        }
        render();
        global.toast.show(t("crud.saved"), "success");
        return;
      }
      var whDel = e.target.closest(".plf-wh-delete");
      if (whDel) {
        e.preventDefault();
        e.stopPropagation();
        var keyWd = whDel.getAttribute("data-item-key");
        var rowKeyWd = whDel.getAttribute("data-wh-row-key");
        confirmDestructive(function () {
          collectDraftFromDom();
          var itWd = findItemDraftByKey(keyWd);
          if (!itWd || !itWd.warehousePlacements) return;
          itWd.warehousePlacements = itWd.warehousePlacements.filter(function (r) {
            return r._draftKey !== rowKeyWd;
          });
          render();
          global.toast.show(t("crud.deleted"), "success");
        });
      }
    });
  }

  function openNoteModal() {
    if (!noteModalEl) {
      noteModalEl = document.createElement("div");
      noteModalEl.className = "modal-overlay";
      noteModalEl.hidden = true;
      document.body.appendChild(noteModalEl);
    }
    noteModalEl.innerHTML =
      '<div class="modal crud-modal" role="dialog" aria-modal="true">' +
      '<div class="modal__header"><h2 class="modal__title" data-i18n="productListForm.noteTitle"></h2>' +
      '<button type="button" class="modal__close plf-note-close"><img src="../assets/icons/x.svg" alt="" width="18" height="18" /></button></div>' +
      '<div class="modal__content"><textarea id="plf-note-draft" rows="8" class="product-list-form__note-area">' +
      escapeHtml(draft.note || "") +
      "</textarea></div>" +
      '<div class="modal__footer">' +
      '<button type="button" class="btn plf-note-close" data-i18n="crud.cancel"></button>' +
      '<button type="button" class="btn btn--primary" id="plf-note-save" data-i18n="crud.save"></button></div></div>';
    noteModalEl.hidden = false;
    document.body.classList.add("modal-open");
    if (global.i18n) global.i18n.init();
    noteModalEl.querySelectorAll(".plf-note-close").forEach(function (btn) {
      btn.addEventListener("click", closeNoteModal);
    });
    noteModalEl.querySelector("#plf-note-save").addEventListener("click", function () {
      draft.note = (noteModalEl.querySelector("#plf-note-draft").value || "").trim();
      closeNoteModal();
      render();
      global.toast.show(t("productListForm.toastNoteSaved"), "success");
    });
  }

  function closeNoteModal() {
    if (!noteModalEl) return;
    noteModalEl.hidden = true;
    document.body.classList.remove("modal-open");
  }

  function upsertItemLanguage(itemIdVal, loc, patch) {
    var rows = global.store.getAll("product_item_language");
    var idx = rows.findIndex(function (r) {
      return r.product_item_id === itemIdVal && r.locale === loc;
    });
    var ts = now();
    if (idx >= 0) {
      global.store.updateAt("product_item_language", idx, Object.assign({ updated_at: ts }, patch));
    } else {
      global.store.create(
        "product_item_language",
        Object.assign(
          {
            product_item_id: itemIdVal,
            locale: loc,
            created_at: ts,
            updated_at: ts,
          },
          patch
        )
      );
    }
  }

  function upsertListLanguage(listIdVal, loc, patch) {
    var rows = global.store.getAll("product_list_language");
    var idx = rows.findIndex(function (r) {
      return r.product_list_id === listIdVal && r.locale === loc;
    });
    var ts = now();
    if (idx >= 0) {
      global.store.updateAt("product_list_language", idx, Object.assign({ updated_at: ts }, patch));
    } else {
      global.store.create(
        "product_list_language",
        Object.assign(
          {
            product_list_id: listIdVal,
            locale: loc,
            created_at: ts,
            updated_at: ts,
          },
          patch
        )
      );
    }
  }

  function replaceListCodes(listIdVal, codeType, values, actorId) {
    var rows = global.store.getAll("product_list_code");
    var ts = now();
    for (var i = rows.length - 1; i >= 0; i--) {
      if (rows[i].product_list_id === listIdVal && rows[i].code_type === codeType && rows[i].deleted_at == null) {
        global.store.updateAt("product_list_code", i, { deleted_at: ts, updated_at: ts, updated_by: actorId });
      }
    }
    values
      .map(function (v) {
        return String(v || "").trim();
      })
      .filter(Boolean)
      .forEach(function (sku) {
        global.store.create("product_list_code", {
          product_list_id: listIdVal,
          code_type: codeType,
          sku: sku,
          deleted_at: null,
          created_at: ts,
          updated_at: ts,
          created_by: actorId,
          updated_by: actorId,
        });
      });
  }

  function replaceListSuppliers(listIdVal, supplierIds) {
    var rows = global.store.getAll("product_list_supplier");
    for (var i = rows.length - 1; i >= 0; i--) {
      if (rows[i].product_list_id === listIdVal) {
        global.store.deleteAt("product_list_supplier", i);
        rows = global.store.getAll("product_list_supplier");
      }
    }
    supplierIds.forEach(function (sid) {
      global.store.create("product_list_supplier", {
        product_list_id: listIdVal,
        supplier_user_id: Number(sid),
      });
    });
  }

  function syncCarsToStore(listIdVal, actorId) {
    var existing = global.store
      .getAll("product_list_car")
      .filter(function (c) {
        return c.product_list_id === listIdVal && c.deleted_at == null;
      });
    var ts = now();
    var keepIds = {};
    draft.cars.forEach(function (c) {
      var patch = {
        product_attribute_brand_id: c.brand_id ? Number(c.brand_id) : null,
        product_attribute_model_id: c.model_id ? Number(c.model_id) : null,
        product_attribute_engine_id: Number(c.engine_id),
        gear_type: c.gear || "auto",
        year_start: c.year_start ? Number(c.year_start) : null,
        year_end: c.year_end ? Number(c.year_end) : null,
        updated_at: ts,
        updated_by: actorId,
      };
      if (c.id != null) {
        global.store.update("product_list_car", c.id, patch);
        keepIds[c.id] = true;
      } else {
        var created = global.store.create(
          "product_list_car",
          Object.assign(
            {
              product_list_id: listIdVal,
              deleted_at: null,
              created_at: ts,
              created_by: actorId,
            },
            patch
          )
        );
        c.id = created.id;
        keepIds[created.id] = true;
      }
    });
    existing.forEach(function (row) {
      if (!keepIds[row.id]) {
        global.store.update("product_list_car", row.id, { deleted_at: ts, updated_at: ts, updated_by: actorId });
      }
    });
  }

  function validateSave() {
    rootEl.querySelectorAll(".form-field--invalid").forEach(function (el) {
      clearFieldError(el);
    });
    var ok = true;
    var firstFocus = null;
    var focusWrapId = null;
    var needPricingTab = false;
    function req(id) {
      var wrap = rootEl.querySelector('[data-field-wrap="' + id + '"]');
      if (!val(id)) {
        showFieldError(wrap, t("error.required"));
        if (!firstFocus) firstFocus = document.getElementById(id);
        ok = false;
      }
    }
    req("plf-name-th");
    req("plf-name-en");
    req("plf-sku");
    req("plf-category");
    req("plf-brand");

    collectDraftFromDom();

    draft.items.forEach(function (it) {
      var key = it._draftKey;
      if (!key) return;
      function reqItem(field, invalid) {
        if (!invalid()) return;
        var wrapId = itemVariantWrapId(key, field);
        var wrap = rootEl.querySelector('[data-field-wrap="' + wrapId + '"]');
        showFieldError(wrap, t("error.required"));
        if (!focusWrapId) focusWrapId = wrapId;
        needPricingTab = true;
        ok = false;
      }
      reqItem("name_th", function () {
        return !String(it.name_th || "").trim();
      });
      reqItem("name_en", function () {
        return !String(it.name_en || "").trim();
      });
      reqItem("sku_suffix", function () {
        return !String(it.sku || "").trim();
      });
      reqItem("weight", function () {
        var w = String(it.weight != null ? it.weight : "").trim();
        if (!w) return true;
        var n = Number(w);
        return !Number.isFinite(n);
      });
    });

    var hasItem = draft.items.some(function (it) {
      return String(it.price || "").trim() !== "";
    });
    if (!hasItem) {
      global.toast.show(t("productListForm.errorItemRequired"), "error");
      ok = false;
      needPricingTab = true;
    }

    if (!ok && needPricingTab && activeTab !== "pricing") {
      activeTab = "pricing";
      render();
    }

    if (!ok) {
      if (focusWrapId) {
        var variantWrap = rootEl.querySelector('[data-field-wrap="' + focusWrapId + '"]');
        var variantInput = variantWrap && variantWrap.querySelector("input, select, textarea");
        if (variantInput) variantInput.focus();
      } else if (firstFocus) {
        firstFocus.focus();
      }
      if (firstFocus || focusWrapId) {
        global.toast.show(t("error.required"), "error");
      }
    }
    return ok;
  }

  function saveForm() {
    if (isSaving) return;
    if (!can(isEdit ? "update" : "create")) {
      global.toast.show(t("error.forbidden"), "error");
      return;
    }
    collectDraftFromDom();
    if (!validateSave()) return;

    isSaving = true;
    render();

    var actor = global.auth.getUser();
    var actorId = actor ? actor.id : 1;
    var ts = now();
    var wasCreate = !isEdit;

    var dup = global.store.getAll("product_list").some(function (r) {
      return (
        r.deleted_at == null &&
        String(r.sku).toLowerCase() === String(draft.sku).toLowerCase() &&
        r.id !== listId
      );
    });
    if (dup) {
      isSaving = false;
      global.toast.show(t("error.codeTaken"), "error");
      render();
      return;
    }

    var listPatch = {
      sku: draft.sku,
      product_brand_id: draft.product_brand_id ? Number(draft.product_brand_id) : null,
      product_category_id: draft.product_category_id ? Number(draft.product_category_id) : null,
      tag: draft.tag || "",
      supplier_sku: draft.supplier_sku || "",
      note: draft.note || "",
      is_new: !!draft.is_new,
      is_active: !!draft.is_active,
      updated_at: ts,
      updated_by: actorId,
    };

    if (isEdit) {
      global.store.update("product_list", listId, listPatch);
    } else {
      var created = global.store.create(
        "product_list",
        Object.assign(listPatch, {
          deleted_at: null,
          created_at: ts,
          created_by: actorId,
        })
      );
      listId = created.id;
      isEdit = true;
      window.history.replaceState({}, "", "product-list-form.html?product_list_id=" + listId);
    }

    upsertListLanguage(listId, "th", {
      name: draft.name_th,
      sub_name: draft.sub_name_th || null,
      description: draft.desc_th || null,
    });
    upsertListLanguage(listId, "en", {
      name: draft.name_en,
      sub_name: draft.sub_name_en || null,
      description: draft.desc_en || null,
    });

    replaceListCodes(listId, "factory", draft.factoryCodes, actorId);
    replaceListCodes(listId, "other", draft.otherCodes, actorId);
    replaceListSuppliers(listId, draft.supplierIds);
    syncCarsToStore(listId, actorId);

    draft.items.forEach(function (it) {
      var itemId = it.id;
      var isStockPrice = it.type_price === "stock";
      var priceForStore = isStockPrice && itemId != null ? stockTypeSellPrice(itemId) : Number(it.price) || 0;
      if (isStockPrice && itemId != null && !priceForStore) {
        var existingItem = global.store.getById("product_item", itemId);
        if (existingItem && Number(existingItem.price)) {
          priceForStore = Number(existingItem.price);
        }
      }
      var itemPatch = {
        product_list_id: listId,
        sku: it.sku || null,
        barcode: (it.barcode && String(it.barcode).trim()) || null,
        qrcode: (it.qrcode && String(it.qrcode).trim()) || null,
        price: priceForStore,
        unit: it.unit || "piece",
        qty_per_unit: Number(it.qty_per_unit) || 1,
        weight: optionalItemNumber(it.weight),
        width: optionalItemNumber(it.width),
        length: optionalItemNumber(it.length),
        height: optionalItemNumber(it.height),
        minimum_stock: Number(it.minimum_stock) || 0,
        amount_price_wholesale: Number(it.amount_price_wholesale) || 0,
        is_active: !!it.is_active,
        is_stopped: !!it.is_stopped,
        is_authentic:
          it.is_authentic != null
            ? !!it.is_authentic
            : it.is_fake != null
              ? !it.is_fake
              : true,
        type_price: isStockPrice ? "stock" : "manual",
        price_wholesale: Number(it.price_wholesale) || 0,
        price_vat: priceInclVat(priceForStore, Number(activeSettingVat().rate) || 0),
        price_wholesale_vat: priceInclVat(
          Number(it.price_wholesale) || 0,
          Number(activeSettingVat().rate) || 0
        ),
        vat_type: activeSettingVat().vat_type === "include" ? "include" : "exclude",
        vat_rate: Number(activeSettingVat().rate) || 0,
        promotion: String(it.promotion != null ? it.promotion : ""),
        updated_at: ts,
        updated_by: actorId,
      };
      if (itemId != null) {
        global.store.update("product_item", itemId, itemPatch);
      } else {
        var createdItem = global.store.create(
          "product_item",
          Object.assign(itemPatch, {
            deleted_at: null,
            created_at: ts,
            created_by: actorId,
            promotion: "",
          })
        );
        itemId = createdItem.id;
      }
      var nameThSave = String(it.name_th || "").trim() || String(it.sku || "").trim() || "Variant";
      var nameEnSave = String(it.name_en || "").trim() || nameThSave;
      upsertItemLanguage(itemId, "th", { name: nameThSave });
      upsertItemLanguage(itemId, "en", { name: nameEnSave });
      syncItemChannelPricesToStore(itemId, it);
      syncItemSuppliersToStore(itemId, it);
      syncItemWarehousePlacementsToStore(itemId, it);
    });

    global.realtime.broadcast({ type: "update", table: "product_list" });
    global.toast.show(t(wasCreate ? "crud.created" : "crud.saved"), "success");
    isSaving = false;
    draft = loadDraftFromStore(listId);
    render();
  }

  function bindEvents() {
    if (!rootEl) return;
    bindItemTableCrudEvents();

    if (!saleChannelChangeBound) {
      saleChannelChangeBound = true;
      document.addEventListener("store:change", function (e) {
        if (!draft || !rootEl) return;
        var table = e.detail && e.detail.table;
        if (table === "setting_sale_channel" && activeTab === "pricing") {
          (draft.items || []).forEach(function (it) {
            ensureItemChannelDraft(it);
          });
          render();
        }
      });
    }

    rootEl.querySelectorAll(".product-list-form__tab").forEach(function (btn) {
      btn.addEventListener("click", function () {
        collectDraftFromDom();
        activeTab = btn.getAttribute("data-tab");
        render();
      });
    });

    rootEl.querySelectorAll("[data-plf-hist-tab]").forEach(function (btn) {
      btn.addEventListener("click", function (e) {
        e.preventDefault();
        var tab = btn.getAttribute("data-plf-hist-tab");
        if (tab && tab !== historySubTab) {
          historySubTab = tab;
          render();
        }
      });
    });

    rootEl.querySelectorAll("[data-plf-hist-group]").forEach(function (btn) {
      btn.addEventListener("click", function (e) {
        e.preventDefault();
        var key = btn.getAttribute("data-plf-hist-group");
        if (key) {
          historyOpenGroups[key] = !isHistGroupOpen(key);
          render();
        }
      });
    });

    function historyActiveFilters() {
      return historyState[historySubTab] || historyState.purchase;
    }

    rootEl.querySelectorAll("[data-plf-hist-filter]").forEach(function (el) {
      el.addEventListener("change", function () {
        var field = el.getAttribute("data-plf-hist-filter");
        if (!field) return;
        var f = historyActiveFilters();
        f[field] = el.value;
        f.page = 1;
        collectDraftFromDom();
        render();
      });
    });

    var histClear = rootEl.querySelector("[data-plf-hist-clear]");
    if (histClear) {
      histClear.addEventListener("click", function (e) {
        e.preventDefault();
        historyState[historySubTab] = defaultHistoryFilters();
        collectDraftFromDom();
        render();
      });
    }

    var histExport = rootEl.querySelector("[data-plf-hist-export]");
    if (histExport) {
      histExport.addEventListener("click", function (e) {
        e.preventDefault();
        global.toast.show(t("productListForm.histExportSoon"), "info");
      });
    }

    var histPrev = rootEl.querySelector("#plf-hist-page-prev");
    if (histPrev) {
      histPrev.addEventListener("click", function () {
        var f = historyActiveFilters();
        if (f.page > 1) {
          f.page -= 1;
          render();
        }
      });
    }
    var histNext = rootEl.querySelector("#plf-hist-page-next");
    if (histNext) {
      histNext.addEventListener("click", function () {
        historyActiveFilters().page += 1;
        render();
      });
    }
    var histSize = rootEl.querySelector("#plf-hist-page-size");
    if (histSize) {
      histSize.addEventListener("change", function () {
        setHistoryPageSize(parseInt(histSize.value, 10));
        historyActiveFilters().page = 1;
        render();
      });
    }

    rootEl.querySelectorAll(".form-field input, .form-field select, .form-field textarea").forEach(function (el) {
      el.addEventListener("input", function () {
        var wrap = el.closest(".form-field");
        if (wrap) clearFieldError(wrap);
      });
    });

    rootEl.querySelectorAll('input[data-field="type_price"]').forEach(function (el) {
      el.addEventListener("change", function () {
        collectDraftFromDom();
        render();
      });
    });

    if (!storefrontLiveBound) {
      storefrontLiveBound = true;
      rootEl.addEventListener("input", function (e) {
        var editable = e.target.closest("[data-plf-storefront-editable]");
        if (editable && rootEl.contains(editable)) {
          syncStorefrontDerivedFromEditable(editable);
          return;
        }
        var channelEditable = e.target.closest("[data-plf-channel-editable]");
        if (channelEditable && rootEl.contains(channelEditable)) {
          syncChannelDerivedFromEditable(channelEditable);
        }
      });
    }

    var saveBtn = rootEl.querySelector("#plf-save");
    if (saveBtn) saveBtn.addEventListener("click", saveForm);

    var carSearchEl = rootEl.querySelector("#plf-car-search");
    if (carSearchEl) {
      carSearchEl.addEventListener("input", function () {
        collectDraftFromDom();
        carSearch = carSearchEl.value;
        carPage = 1;
        render();
      });
    }

    var carAdd = rootEl.querySelector("#plf-car-add");
    if (carAdd) carAdd.addEventListener("click", function () { openCarModal(null); });

    rootEl.querySelectorAll(".plf-car-edit").forEach(function (btn) {
      btn.addEventListener("click", function () {
        openCarModal(btn.getAttribute("data-car-key"));
      });
    });
    rootEl.querySelectorAll(".plf-car-delete").forEach(function (btn) {
      btn.addEventListener("click", function () {
        var key = btn.getAttribute("data-car-key");
        confirmDestructive(function () {
          draft.cars = draft.cars.filter(function (c) {
            var k = c.id != null ? "id-" + c.id : "d-" + c._draftId;
            return k !== key;
          });
          render();
          global.toast.show(t("crud.deleted"), "success");
        });
      });
    });

    rootEl.querySelectorAll(".plf-code-add").forEach(function (btn) {
      btn.addEventListener("click", function () {
        collectDraftFromDom();
        var kind = btn.getAttribute("data-code-kind");
        if (kind === "plf-factory-code") draft.factoryCodes.push("");
        else draft.otherCodes.push("");
        render();
        global.toast.show(t("productListForm.toastCodeRowAdded"), "success");
      });
    });
    rootEl.querySelectorAll(".plf-code-remove").forEach(function (btn) {
      btn.addEventListener("click", function () {
        collectDraftFromDom();
        var idx = Number(btn.getAttribute("data-index"));
        var row = btn.closest(".product-list-form__code-row");
        if (row && row.querySelector(".plf-factory-code")) {
          draft.factoryCodes.splice(idx, 1);
          if (!draft.factoryCodes.length) draft.factoryCodes = [""];
        } else {
          draft.otherCodes.splice(idx, 1);
          if (!draft.otherCodes.length) draft.otherCodes = [""];
        }
        render();
        global.toast.show(t("crud.deleted"), "success");
      });
    });

    var itemAdd = rootEl.querySelector("#plf-item-add");
    if (itemAdd) {
      itemAdd.addEventListener("click", function () {
        collectDraftFromDom();
        draft.items.push(newItemDraft({ open: true }));
        render();
        global.toast.show(t("productListForm.toastVariantAdded"), "success");
      });
    }
    rootEl.querySelectorAll(".product-list-form__variant-summary").forEach(function (summary) {
      summary.addEventListener("click", function (e) {
        if (e.target.closest(".plf-variant-no-toggle")) e.preventDefault();
      });
    });
    rootEl.querySelectorAll(".product-list__wh-btn").forEach(function (btn) {
      btn.addEventListener("click", function (e) {
        e.preventDefault();
        e.stopPropagation();
        var id = Number(btn.getAttribute("data-wh-item"));
        if (Number.isFinite(id)) openWarehouseDetailModal(id);
      });
    });

    rootEl.querySelectorAll(".plf-item-view-lots").forEach(function (btn) {
      btn.addEventListener("click", function (e) {
        e.preventDefault();
        e.stopPropagation();
        var id = Number(btn.getAttribute("data-item-id"));
        if (Number.isFinite(id)) openItemLotStockModal(id);
      });
    });

    rootEl.querySelectorAll("[data-plf-item-tab]").forEach(function (btn) {
      btn.addEventListener("click", function (e) {
        e.preventDefault();
        e.stopPropagation();
        collectDraftFromDom();
        var key = btn.getAttribute("data-item-key");
        var tab = btn.getAttribute("data-plf-item-tab");
        if (key && tab) {
          clearItemInlineEdits(key);
          itemSubTabByKey[key] = tab;
          render();
        }
      });
    });

    rootEl.querySelectorAll(".plf-item-pager-btn").forEach(function (btn) {
      btn.addEventListener("click", function (e) {
        e.preventDefault();
        e.stopPropagation();
        if (btn.disabled) return;
        var nav = btn.closest(".plf-item-pager");
        if (!nav) return;
        collectDraftFromDom();
        var key = nav.getAttribute("data-item-key");
        var kind = nav.getAttribute("data-pager-kind");
        var dir = btn.getAttribute("data-dir");
        var pageMap = kind === "warehouse" ? itemWhPageByKey : itemChannelPageByKey;
        clearItemInlineEdits(key);
        var page = pageMap[key] || 1;
        pageMap[key] = dir === "next" ? page + 1 : Math.max(1, page - 1);
        render();
      });
    });

    rootEl.querySelectorAll(".plf-item-mock").forEach(function (btn) {
      btn.addEventListener("click", function (e) {
        e.preventDefault();
        e.stopPropagation();
        global.toast.show(t("page.comingSoon"), "info");
      });
    });

    rootEl.querySelectorAll(".plf-item-strip-sku").forEach(function (btn) {
      btn.addEventListener("click", function (e) {
        e.preventDefault();
        e.stopPropagation();
        var block = btn.closest(".plf-item");
        if (!block) return;
        collectDraftFromDom();
        var key = block.getAttribute("data-item-key");
        var suffix = nextVariantSkuSuffix(key);
        var inp = block.querySelector('[data-field="sku_suffix"]');
        if (inp) inp.value = suffix;
        collectDraftFromDom();
        render();
      });
    });

    rootEl.querySelectorAll(".plf-item-generate").forEach(function (btn) {
      btn.addEventListener("click", function (e) {
        e.preventDefault();
        e.stopPropagation();
        var block = btn.closest(".plf-item");
        if (!block) return;
        collectDraftFromDom();
        var gen = btn.getAttribute("data-gen");
        var key = block.getAttribute("data-item-key");
        var idRaw = block.getAttribute("data-item-id");
        var itemId = idRaw ? Number(idRaw) : null;
        if (gen === "barcode") {
          var barcodeInp = block.querySelector('[data-field="barcode"]');
          if (barcodeInp) {
            barcodeInp.value = generateMockBarcode(itemId, key);
            global.toast.show(t("productListForm.toastBarcodeGenerated"), "success");
          }
        } else if (gen === "qrcode") {
          var qrcodeInp = block.querySelector('[data-field="qrcode"]');
          var suffixVal = itemFieldFromBlock(block, "sku_suffix");
          var fullSku = composeItemSku(listSkuPrefix(), suffixVal);
          if (qrcodeInp) {
            qrcodeInp.value = generateMockQrcode(fullSku, itemId);
            global.toast.show(t("productListForm.toastQrcodeGenerated"), "success");
          }
        }
        collectDraftFromDom();
      });
    });

    rootEl.querySelectorAll(".plf-item-copy").forEach(function (btn) {
      btn.addEventListener("click", function (e) {
        e.preventDefault();
        e.stopPropagation();
        var val = btn.getAttribute("data-copy-value") || "";
        if (navigator.clipboard && navigator.clipboard.writeText) {
          navigator.clipboard
            .writeText(val)
            .then(function () {
              global.toast.show(t("productListForm.itemCopied"), "success");
            })
            .catch(function () {
              global.toast.show(t("productListForm.toastCopyFailed"), "error");
            });
        } else {
          global.toast.show(t("productListForm.toastCopyFailed"), "error");
        }
      });
    });

    rootEl.querySelectorAll(".plf-item-remove").forEach(function (btn) {
      btn.addEventListener("click", function (e) {
        e.preventDefault();
        e.stopPropagation();
        collectDraftFromDom();
        var key = btn.getAttribute("data-item-key");
        confirmDestructive(function () {
          draft.items = draft.items.filter(function (it) {
            return it._draftKey !== key;
          });
          if (!draft.items.length) {
            draft.items.push(newItemDraft({ open: true }));
          }
          render();
          global.toast.show(t("crud.deleted"), "success");
        });
      });
    });

    var activeToggle = rootEl.querySelector("#plf-is-active");
    if (activeToggle) {
      activeToggle.addEventListener("change", function () {
        global.toast.show(t("productListForm.toastStatusDraft"), "info");
      });
    }

    var noteEdit = rootEl.querySelector("#plf-note-edit");
    if (noteEdit) noteEdit.addEventListener("click", openNoteModal);

    function openCategoryPicker() {
      if (!global.categoryCascadePicker) return;
      collectDraftFromDom();
      global.categoryCascadePicker.open({
        valueId: draft.product_category_id,
        onConfirm: function (id, breadcrumb) {
          draft.product_category_id = String(id);
          var hidden = document.getElementById("plf-category");
          if (hidden) hidden.value = String(id);
          render();
          global.toast.show(t("productListForm.toastCategorySelected"), "success");
        },
      });
    }
    var catOpen = rootEl.querySelector("#plf-category-open");
    if (catOpen) catOpen.addEventListener("click", openCategoryPicker);

    if (global.chipMultiSelect) {
      global.chipMultiSelect.bind(rootEl, "plf-suppliers", {
        onChange: function (_ids, meta) {
          if (!meta || !meta.action) return;
          if (meta.action === "add") {
            addPartnerLinked(meta.value);
          } else if (meta.action === "remove") {
            removePartnerLinked(meta.value);
          }
        },
      });
    }
  }

  function boot() {
    global.store.init();
    global.i18n.init();
    if (!global.auth.requireAuth("login.html")) return;
    if (!global.permissions.guardPage(PERM_MODULE, PERM_TYPE, "login.html")) return;

    listId = queryListId();
    isEdit = listId != null;

    if (isEdit && !can("update")) {
      global.toast.show(t("error.forbidden"), "error");
      window.location.replace("product-list.html");
      return;
    }
    if (!isEdit && !can("create")) {
      global.toast.show(t("error.forbidden"), "error");
      window.location.replace("product-list.html");
      return;
    }

    if (isEdit) {
      draft = loadDraftFromStore(listId);
      if (!draft) {
        global.layout.mount({
          pageTitle: t("page.productListForm"),
          contentHtml:
            '<div class="crud-page product-list-form"><p data-i18n="error.notFound"></p><p><a class="btn" href="product-list.html" data-i18n="crud.back"></a></p></div>',
        });
        global.i18n.init();
        return;
      }
    } else {
      draft = emptyDraft();
    }

    global.layout.mount({
      pageTitle: t("page.productListForm"),
      contentHtml: '<div id="product-list-form-root" class="crud-page product-list-form"></div>',
    });
    rootEl = document.getElementById("product-list-form-root");
    if (!rootEl) return;

    render();

    global.devBar.mount({
      toasts: [
        { type: "success", label: "Created", msgKey: "crud.created" },
        { type: "success", label: "Saved", msgKey: "crud.saved" },
        { type: "success", label: "Deleted", msgKey: "crud.deleted" },
        { type: "success", label: "Copied", msgKey: "productListForm.itemCopied" },
        { type: "info", label: "Coming soon", msgKey: "page.comingSoon" },
        { type: "info", label: "Status draft", msgKey: "productListForm.toastStatusDraft" },
        { type: "error", label: "Forbidden", msgKey: "error.forbidden" },
        { type: "error", label: "Required", msgKey: "error.required" },
        { type: "error", label: "Item required", msgKey: "productListForm.errorItemRequired" },
        { type: "error", label: "Code taken", msgKey: "error.codeTaken" },
        { type: "error", label: "Copy failed", msgKey: "productListForm.toastCopyFailed" },
        { type: "error", label: "Not found", msgKey: "error.notFound" },
      ],
      actions: [{ label: "Reset store", fn: function () { global.store.reset(); location.reload(); } }],
    });

    document.addEventListener("i18n:change", function () {
      render();
    });
    if (global.realtime && global.realtime.onMessage) {
      global.realtime.onMessage(function () {
        if (isEdit && listId) {
          draft = loadDraftFromStore(listId);
          render();
        }
      });
    }
  }

  global.productListFormPage = { boot: boot };
})(window);

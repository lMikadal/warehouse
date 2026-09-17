(function (global) {
  var PERM_MODULE = "product";

  var PAGE_CONFIG = {
    category: {
      attrType: "category",
      permType: "product_category",
      pageTitleKey: "page.productCategory",
      pageDescriptionKey: "page.productCategory.desc",
      tree: true,
    },
    brand: {
      attrType: "brand",
      permType: "product_brand",
      pageTitleKey: "page.productBrand",
      pageDescriptionKey: "page.productBrand.desc",
      tree: false,
    },
    car: {
      attrType: "car",
      permType: "product_car",
      pageTitleKey: "page.productCar",
      pageDescriptionKey: "page.productCar.desc",
      tree: true,
    },
  };

  var cfg = null;
  var state = {
    query: "",
    editingId: null,
    expanded: {},
    draft: { type_car: "brand", car_brand_id: "", car_model_id: "" },
  };
  var rootEl = null;
  var confirmOverlay = null;
  var dragState = { rowId: null, fromParentKey: null, fromIdx: null };

  function t(key, params) {
    return global.i18n ? global.i18n.t(key, params) : key;
  }

  function now() {
    return new Date().toISOString();
  }

  function locale() {
    return global.i18n ? global.i18n.getLocale() : "th";
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
    return global.permissions && global.permissions.canAction(PERM_MODULE, cfg.permType, action);
  }

  function fieldPlaceholder(kind, labelKey) {
    return global.i18n && global.i18n.fieldPlaceholder
      ? global.i18n.fieldPlaceholder(kind, labelKey)
      : "";
  }

  function canDnd() {
    return can("update") && !state.query.trim();
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

  function errorSlotHtml() {
    return (
      '<div class="form-field__error-slot" aria-live="polite">' +
      '<p class="form-field__error" hidden role="alert"></p></div>'
    );
  }

  function requiredMarkHtml() {
    return '<span class="form-field__required" aria-hidden="true">*</span>';
  }

  function dragHandleHtml() {
    if (!canDnd()) return "";
    return (
      '<span class="attr-tree__drag-handle" draggable="true" aria-hidden="true">' +
      '<img src="../assets/icons/grip-vertical.svg" alt="" width="14" height="14" />' +
      "</span>"
    );
  }

  function attrName(id, loc) {
    var row = global.store.getAll("product_attribute_language").find(function (r) {
      return r.product_attribute_id === id && r.locale === (loc || locale());
    });
    if (row && row.name) return row.name;
    var alt = loc === "th" ? "en" : "th";
    var fallback = global.store.getAll("product_attribute_language").find(function (r) {
      return r.product_attribute_id === id && r.locale === alt;
    });
    return fallback ? fallback.name : String(id);
  }

  function activeRows() {
    return global.store
      .getAll("product_attribute")
      .filter(function (r) {
        return r.deleted_at == null && r.type === cfg.attrType;
      })
      .sort(function (a, b) {
        return a.sort_order - b.sort_order || a.id - b.id;
      });
  }

  function parentByIdMap() {
    var map = {};
    global.store.getAll("product_attribute").forEach(function (r) {
      map[r.id] = r.parent_id != null ? r.parent_id : null;
    });
    return map;
  }

  function treePathFor(id, parentId) {
    return global.ADMIN_SEED_SHARED.buildTreePath(id, parentId, parentByIdMap());
  }

  function categoryDepth(id) {
    var depth = 0;
    var node = global.store.getById("product_attribute", id);
    while (node && node.parent_id != null) {
      depth += 1;
      node = global.store.getById("product_attribute", node.parent_id);
    }
    return depth;
  }

  function buildCategoryTree(rows) {
    function childrenOf(parentId) {
      return rows
        .filter(function (r) {
          return (parentId == null ? r.parent_id == null : r.parent_id === parentId);
        })
        .map(function (r) {
          return { row: r, children: childrenOf(r.id) };
        });
    }
    return childrenOf(null);
  }

  function buildCarTree(rows) {
    function brands() {
      return rows
        .filter(function (r) {
          return r.type_car === "brand";
        })
        .map(function (r) {
          return {
            row: r,
            children: rows
              .filter(function (m) {
                return m.type_car === "model" && m.parent_id === r.id;
              })
              .map(function (m) {
                return {
                  row: m,
                  children: rows
                    .filter(function (e) {
                      return e.type_car === "engine" && e.parent_id === m.id;
                    })
                    .map(function (e) {
                      return { row: e, children: [] };
                    }),
                };
              }),
          };
        });
    }
    return brands();
  }

  function buildFlatTree(rows) {
    return rows.map(function (r) {
      return { row: r, children: [] };
    });
  }

  function buildTree(rows) {
    if (cfg.attrType === "category") return buildCategoryTree(rows);
    if (cfg.attrType === "car") return buildCarTree(rows);
    return buildFlatTree(rows);
  }

  function rowMatchesQuery(row, q) {
    if (!q) return true;
    return (
      attrName(row.id, "th").toLowerCase().indexOf(q) >= 0 ||
      attrName(row.id, "en").toLowerCase().indexOf(q) >= 0
    );
  }

  function filterTree(nodes, q) {
    var out = [];
    nodes.forEach(function (node) {
      var childMatches = filterTree(node.children, q);
      if (rowMatchesQuery(node.row, q) || childMatches.length) {
        out.push({ row: node.row, children: childMatches.length ? childMatches : node.children });
      }
    });
    return out;
  }

  function hasActiveDescendant(node, id) {
    if (node.row.id === id) return true;
    return node.children.some(function (c) {
      return hasActiveDescendant(c, id);
    });
  }

  function statusSwitchHtml(row) {
    var label = t("col.active");
    return (
      '<label class="crud-switch attr-tree__switch">' +
      '<input type="checkbox" class="crud-status-switch attr-tree__status" role="switch" data-id="' +
      escapeAttr(row.id) +
      '"' +
      (row.is_active ? " checked" : "") +
      (can("update") ? "" : " disabled") +
      ' aria-label="' +
      escapeAttr(label) +
      '" />' +
      '<span class="crud-switch__track" aria-hidden="true"><span class="crud-switch__thumb"></span></span>' +
      "</label>"
    );
  }

  function editBtnHtml(id) {
    return (
      '<button type="button" class="attr-tree__edit btn btn--icon" data-id="' +
      escapeAttr(id) +
      '" aria-label="' +
      escapeAttr(t("crud.edit")) +
      '">' +
      '<img src="../assets/icons/pencil.svg" alt="" width="16" height="16" />' +
      "</button>"
    );
  }

  function treeActionsHtml(row) {
    return (
      '<div class="attr-tree__actions">' +
      statusSwitchHtml(row) +
      editBtnHtml(row.id) +
      deleteBtnHtml(row.id) +
      "</div>"
    );
  }

  function deleteBtnHtml(id) {
    return (
      '<button type="button" class="attr-tree__delete btn btn--icon crud-delete" data-id="' +
      escapeAttr(id) +
      '" data-perm-module="' +
      PERM_MODULE +
      '" data-perm-type="' +
      cfg.permType +
      '" data-perm-action="delete" aria-label="' +
      escapeAttr(t("crud.delete")) +
      '">' +
      '<img src="../assets/icons/trash-2.svg" alt="" width="16" height="16" />' +
      "</button>"
    );
  }

  function renderTreeNodes(nodes, depth, parentId) {
    depth = depth || 0;
    if (parentId === undefined) parentId = null;
    var dnd = canDnd();
    var parentKey = parentId == null ? "" : String(parentId);
    return nodes
      .map(function (node, idx) {
        var row = node.row;
        var hasChildren = node.children && node.children.length > 0;
        var active = state.editingId === row.id;
        var open =
          state.expanded[row.id] ||
          active ||
          (state.editingId && hasActiveDescendant(node, state.editingId));
        var dragAttrs = dnd
          ? ' data-drag-idx="' + idx + '" data-parent-key="' + escapeAttr(parentKey) + '"' +
            (cfg.attrType === "car" && row.type_car
              ? ' data-type-car="' + escapeAttr(row.type_car) + '"'
              : "")
          : "";

        var categorySubDrop =
          cfg.attrType === "category" && dnd && cfg.tree
            ? ' data-drop-parent-key="' + escapeAttr(row.id) + '"'
            : "";

        if (hasChildren && cfg.tree) {
          return (
            '<li class="sidebar-nav__item sidebar-nav__item--group' +
            (open ? " is-open" : "") +
            '" data-tree-id="' +
            escapeAttr(row.id) +
            '"' +
            dragAttrs +
            ">" +
            '<div class="attr-tree__row' +
            (active ? " is-active" : "") +
            '">' +
            dragHandleHtml() +
            '<button type="button" class="sidebar-nav__group-btn attr-tree__toggle" aria-expanded="' +
            (open ? "true" : "false") +
            '">' +
            '<span class="sidebar-nav__label">' +
            escapeHtml(attrName(row.id)) +
            "</span>" +
            '<span class="sidebar-nav__chevron" aria-hidden="true">' +
            '<svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="m6 9 6 6 6-6"/></svg>' +
            "</span>" +
            "</button>" +
            treeActionsHtml(row) +
            "</div>" +
            '<ul class="sidebar-nav__sub"' +
            categorySubDrop +
            ">" +
            renderTreeNodes(node.children, depth + 1, row.id) +
            "</ul></li>"
          );
        }

        var emptySubDrop =
          cfg.attrType === "category" && dnd && cfg.tree && parentId == null
            ? '<ul class="sidebar-nav__sub attr-tree__sub--droppable"' +
              categorySubDrop +
              "></ul>"
            : "";

        return (
          '<li class="sidebar-nav__item' +
          (active ? " is-active-row" : "") +
          '" data-tree-id="' +
          escapeAttr(row.id) +
          '"' +
          dragAttrs +
          ">" +
          '<div class="attr-tree__row' +
          (active ? " is-active" : "") +
          '">' +
          dragHandleHtml() +
          '<button type="button" class="sidebar-nav__link attr-tree__leaf" data-id="' +
          escapeAttr(row.id) +
          '">' +
          '<span class="sidebar-nav__label">' +
          escapeHtml(attrName(row.id)) +
          "</span></button>" +
          treeActionsHtml(row) +
          "</div>" +
          emptySubDrop +
          "</li>"
        );
      })
      .join("");
  }

  function brandOptions() {
    return global.store
      .getAll("product_attribute")
      .filter(function (r) {
        return r.deleted_at == null && r.type === "brand" && r.is_active;
      })
      .sort(function (a, b) {
        return a.sort_order - b.sort_order || a.id - b.id;
      })
      .map(function (r) {
        return { value: String(r.id), label: attrName(r.id) };
      });
  }

  function categoryParentOptions(editingId) {
    return activeRows().filter(function (r) {
      if (r.id === editingId) return false;
      if (editingId != null && isDescendantOf(editingId, r.id)) return false;
      return true;
    });
  }

  function carBrandOptions() {
    return activeRows().filter(function (r) {
      return r.type_car === "brand";
    });
  }

  function carModelOptions(brandId) {
    if (!brandId) return [];
    return activeRows().filter(function (r) {
      return r.type_car === "model" && r.parent_id === brandId;
    });
  }

  function relatedBrandIds(categoryId) {
    return global.store
      .getAll("product_attribute_relation")
      .filter(function (r) {
        return r.related_id === categoryId;
      })
      .map(function (r) {
        return r.product_attribute_id;
      });
  }

  function langValues(id) {
    var th = global.store.getAll("product_attribute_language").find(function (r) {
      return r.product_attribute_id === id && r.locale === "th";
    });
    var en = global.store.getAll("product_attribute_language").find(function (r) {
      return r.product_attribute_id === id && r.locale === "en";
    });
    return { name_th: th ? th.name : "", name_en: en ? en.name : "" };
  }

  function formValues() {
    if (!state.editingId) {
      return {
        name_th: "",
        name_en: "",
        is_active: true,
        is_stopped: false,
        parent_id: "",
        brand_ids: [],
        type_car: state.draft.type_car || "brand",
        car_brand_id: state.draft.car_brand_id || "",
        car_model_id: state.draft.car_model_id || "",
      };
    }
    var row = global.store.getById("product_attribute", state.editingId);
    if (!row) return { name_th: "", name_en: "", is_active: true, is_stopped: false };
    var langs = langValues(row.id);
    var vals = {
      name_th: langs.name_th,
      name_en: langs.name_en,
      is_active: !!row.is_active,
      is_stopped: !!row.is_stopped,
      parent_id: row.parent_id != null ? String(row.parent_id) : "",
      brand_ids: relatedBrandIds(row.id),
      type_car: row.type_car || "brand",
      car_brand_id: "",
      car_model_id: "",
    };
    if (cfg.attrType === "car") {
      if (row.type_car === "model" && row.parent_id) vals.car_brand_id = String(row.parent_id);
      if (row.type_car === "engine" && row.parent_id) {
        vals.car_model_id = String(row.parent_id);
        var model = global.store.getById("product_attribute", row.parent_id);
        if (model && model.parent_id) vals.car_brand_id = String(model.parent_id);
      }
    }
    return vals;
  }

  function textInputHtml(name, labelKey, value, required, disabled) {
    var ph = escapeHtml(fieldPlaceholder("input", labelKey));
    return (
      '<div class="form-field" data-field="' +
      escapeAttr(name) +
      '">' +
      '<label for="attr-field-' +
      escapeAttr(name) +
      '"><span data-i18n="' +
      escapeAttr(labelKey) +
      '"></span>' +
      (required ? requiredMarkHtml() : "") +
      "</label>" +
      '<input type="text" id="attr-field-' +
      escapeAttr(name) +
      '" name="' +
      escapeAttr(name) +
      '" value="' +
      escapeAttr(value) +
      '" placeholder="' +
      ph +
      '" data-i18n-placeholder-input="' +
      escapeAttr(labelKey) +
      '"' +
      (required ? " required" : "") +
      (disabled ? " disabled" : "") +
      " />" +
      errorSlotHtml() +
      "</div>"
    );
  }

  function searchSelectHtml(fieldKey, labelKey, options, value, allowClear, required) {
    var selectedLabel = escapeHtml(fieldPlaceholder("select", labelKey));
    if (value) {
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
    if (allowClear) {
      optionsHtml =
        '<li class="form-search-select__option' +
        (!value ? " form-search-select__option--selected" : "") +
        '" role="option" data-value="">' +
        escapeHtml(t("productAttr.parentRoot")) +
        "</li>" +
        optionsHtml;
    }
    return (
      '<div class="form-field form-search-select" data-field="' +
      escapeAttr(fieldKey) +
      '">' +
      '<label><span data-i18n="' +
      escapeAttr(labelKey) +
      '"></span>' +
      (required ? requiredMarkHtml() : "") +
      "</label>" +
      '<input type="hidden" name="' +
      escapeAttr(fieldKey) +
      '" value="' +
      escapeAttr(value != null ? value : "") +
      '" />' +
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
      errorSlotHtml() +
      "</div>"
    );
  }

  function brandMultiSelectLabel(selectedIds) {
    var ids = selectedIds || [];
    if (!ids.length) {
      return fieldPlaceholder("select", "productAttr.categoryBrands");
    }
    var names = ids.map(function (id) {
      return attrName(Number(id));
    });
    var joined = names.join(", ");
    return joined.length > 48 ? joined.slice(0, 45) + "..." : joined;
  }

  function brandMultiSelectHtml(selectedIds) {
    var brands = brandOptions();
    var selected = {};
    (selectedIds || []).forEach(function (id) {
      selected[id] = true;
      selected[String(id)] = true;
    });
    var readOnly = state.editingId ? !can("update") : !can("create");
    var inputDisabled = readOnly ? " disabled" : "";
    var triggerDisabled = readOnly ? " disabled" : "";
    var optionsHtml;

    if (!brands.length) {
      optionsHtml =
        '<li class="form-search-select__option form-search-select__option--empty">' +
        escapeHtml(t("crud.empty")) +
        "</li>";
    } else {
      optionsHtml = brands
        .map(function (b) {
          var checked = selected[b.value] || selected[Number(b.value)];
          return (
            '<li class="form-search-select__option form-search-select__option--check" role="option">' +
            '<label class="form-search-select__check-label form-field__checkbox">' +
            '<input type="checkbox" name="brand_ids" value="' +
            escapeAttr(b.value) +
            '"' +
            (checked ? " checked" : "") +
            inputDisabled +
            " />" +
            "<span>" +
            escapeHtml(b.label) +
            "</span></label></li>"
          );
        })
        .join("");
    }

    return (
      '<div class="form-field form-search-select form-search-select--multi" data-field="brand_ids">' +
      '<label><span data-i18n="productAttr.categoryBrands"></span></label>' +
      '<div class="form-search-select__control">' +
      '<button type="button" class="form-search-select__trigger" aria-haspopup="listbox" aria-expanded="false"' +
      triggerDisabled +
      ">" +
      '<span class="form-search-select__label">' +
      escapeHtml(brandMultiSelectLabel(selectedIds)) +
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
      errorSlotHtml() +
      "</div>"
    );
  }

  function formHtml() {
    var vals = formValues();
    var readOnly = state.editingId ? !can("update") : !can("create");
    var disabled = readOnly ? " disabled" : "";

    var extra = "";
    if (cfg.attrType === "category") {
      extra +=
        searchSelectHtml(
          "parent_id",
          "productAttr.parentCategory",
          categoryParentOptions(state.editingId).map(function (r) {
            return { value: String(r.id), label: attrName(r.id) };
          }),
          vals.parent_id,
          true
        ) + brandMultiSelectHtml(vals.brand_ids);
    }

    if (cfg.attrType === "car") {
      var carLevelPh = escapeHtml(fieldPlaceholder("select", "productAttr.carLevel"));
      extra +=
        '<div class="form-field" data-field="type_car">' +
        '<label for="attr-field-type_car"><span data-i18n="productAttr.carLevel"></span>' +
        requiredMarkHtml() +
        "</label>" +
        '<select id="attr-field-type_car" name="type_car"' +
        disabled +
        " required>" +
        '<option value="" disabled>' +
        carLevelPh +
        "</option>" +
        ["brand", "model", "engine"]
          .map(function (v) {
            return (
              '<option value="' +
              v +
              '"' +
              (vals.type_car === v ? " selected" : "") +
              ">" +
              escapeHtml(t("productAttr.carLevel." + v)) +
              "</option>"
            );
          })
          .join("") +
        "</select>" +
        errorSlotHtml() +
        "</div>";

      if (vals.type_car === "model" || vals.type_car === "engine") {
        extra += searchSelectHtml(
          "car_brand_id",
          "productAttr.carBrand",
          carBrandOptions().map(function (r) {
            return { value: String(r.id), label: attrName(r.id) };
          }),
          vals.car_brand_id,
          false,
          true
        );
      }
      if (vals.type_car === "engine") {
        extra += searchSelectHtml(
          "car_model_id",
          "productAttr.carModel",
          carModelOptions(Number(vals.car_brand_id)).map(function (r) {
            return { value: String(r.id), label: attrName(r.id) };
          }),
          vals.car_model_id,
          false,
          true
        );
      }

    }

    return (
      '<div class="attr-split__form-card">' +
      '<form id="attr-form" class="crud-form" novalidate>' +
      '<div class="crud-form__row">' +
      textInputHtml("name_th", "col.nameTh", vals.name_th, true, readOnly) +
      textInputHtml("name_en", "col.nameEn", vals.name_en, true, readOnly) +
      "</div>" +
      extra +
      '<div class="form-field form-field--switch">' +
      '<label for="attr-field-is_active"><span data-i18n="col.active"></span></label>' +
      '<label class="crud-switch">' +
      '<input type="checkbox" id="attr-field-is_active" name="is_active" role="switch"' +
      (vals.is_active ? " checked" : "") +
      disabled +
      " />" +
      '<span class="crud-switch__track"><span class="crud-switch__thumb"></span></span>' +
      "</label></div>" +
      '<button type="submit" class="btn btn--primary btn--block" data-perm-module="' +
      PERM_MODULE +
      '" data-perm-type="' +
      cfg.permType +
      '" data-perm-action="' +
      (state.editingId ? "update" : "create") +
      '"' +
      disabled +
      ">" +
      escapeHtml(state.editingId ? t("crud.save") : t("crud.create")) +
      "</button>" +
      (state.editingId
        ? '<button type="button" class="btn btn--block" id="attr-form-cancel">' +
          escapeHtml(t("crud.cancel")) +
          "</button>"
        : "") +
      "</form></div>"
    );
  }

  function pageHeaderHtml() {
    return (
      '<div class="crud-page-header">' +
      '<div class="crud-page-header__text">' +
      "<h1 data-i18n=\"" +
      escapeAttr(cfg.pageTitleKey) +
      '"></h1>' +
      '<p class="crud-page-header__desc" data-i18n="' +
      escapeAttr(cfg.pageDescriptionKey) +
      '"></p></div></div>'
    );
  }

  function preserveCarDraft(form) {
    if (!form || cfg.attrType !== "car" || state.editingId) return;
    var fd = new FormData(form);
    state.draft = {
      type_car: String(fd.get("type_car") || "brand"),
      car_brand_id: String(fd.get("car_brand_id") || ""),
      car_model_id: String(fd.get("car_model_id") || ""),
    };
  }

  function render() {
    if (!rootEl) return;
    var existingForm = rootEl.querySelector("#attr-form");
    if (existingForm) preserveCarDraft(existingForm);
    var q = state.query.trim().toLowerCase();
    var rows = activeRows();
    var tree = filterTree(buildTree(rows), q);
    var treeHtml =
      tree.length === 0
        ? '<p class="attr-tree__empty">' + escapeHtml(t("crud.empty")) + "</p>"
        : '<ul class="sidebar-nav attr-tree__nav">' + renderTreeNodes(tree) + "</ul>";

    rootEl.innerHTML =
      pageHeaderHtml() +
      '<div class="attr-split">' +
      '<div class="attr-split__panel attr-split__panel--tree">' +
      '<div class="attr-split__search">' +
      '<input type="search" id="attr-tree-search" class="crud-toolbar__search" placeholder="' +
      escapeAttr(t("search.placeholder")) +
      '" value="' +
      escapeAttr(state.query) +
      '" />' +
      "</div>" +
      '<div class="attr-split__tree-scroll">' +
      treeHtml +
      "</div></div>" +
      '<div class="attr-split__panel attr-split__panel--form">' +
      formHtml() +
      "</div></div>";

    if (global.i18n) global.i18n.init();
    if (global.permissions) global.permissions.applyActionButtons(rootEl);
    bindTreeEvents();
    bindFormEvents();
  }

  function bindTreeEvents() {
    var search = rootEl.querySelector("#attr-tree-search");
    if (search) {
      search.addEventListener("input", function () {
        state.query = search.value;
        render();
        var next = rootEl.querySelector("#attr-tree-search");
        if (next) {
          next.focus();
          next.setSelectionRange(next.value.length, next.value.length);
        }
      });
    }

    rootEl.querySelectorAll(".attr-tree__toggle").forEach(function (btn) {
      btn.addEventListener("click", function (e) {
        e.stopPropagation();
        var li = btn.closest(".sidebar-nav__item--group");
        if (!li) return;
        var id = Number(li.getAttribute("data-tree-id"));
        li.classList.toggle("is-open");
        state.expanded[id] = li.classList.contains("is-open");
        btn.setAttribute("aria-expanded", li.classList.contains("is-open") ? "true" : "false");
      });
    });

    rootEl.querySelectorAll(".attr-tree__leaf, .attr-tree__edit").forEach(function (btn) {
      btn.addEventListener("click", function (e) {
        e.stopPropagation();
        var id = Number(btn.getAttribute("data-id"));
        if (!id) return;
        state.editingId = id;
        render();
      });
    });

    rootEl.querySelectorAll(".attr-tree__status").forEach(function (input) {
      input.addEventListener("change", function () {
        if (!can("update")) return;
        var id = Number(input.getAttribute("data-id"));
        global.store.update("product_attribute", id, {
          is_active: input.checked,
          updated_at: now(),
        });
        global.toast.show(t("crud.statusChanged"), "success");
        render();
      });
    });

    rootEl.querySelectorAll(".attr-tree__delete").forEach(function (btn) {
      btn.addEventListener("click", function (e) {
        e.stopPropagation();
        if (!can("delete")) return;
        openConfirm(Number(btn.getAttribute("data-id")));
      });
    });

    bindTreeDragEvents();
  }

  function siblingParentId(key) {
    return key === "" ? null : Number(key);
  }

  function siblingsUnder(parentId) {
    return activeRows()
      .filter(function (r) {
        return parentId == null ? r.parent_id == null : r.parent_id === parentId;
      })
      .sort(function (a, b) {
        return a.sort_order - b.sort_order || a.id - b.id;
      });
  }

  function hasCategoryChildren(id) {
    return activeRows().some(function (r) {
      return r.parent_id === id;
    });
  }

  function isDescendantOf(ancestorId, id) {
    var node = global.store.getById("product_attribute", id);
    while (node && node.parent_id != null) {
      if (node.parent_id === ancestorId) return true;
      node = global.store.getById("product_attribute", node.parent_id);
    }
    return false;
  }

  function validateCategoryMove(rowId, newParentId) {
    if (newParentId === rowId) return "productAttr.dragInvalidParent";
    if (newParentId != null && isDescendantOf(rowId, newParentId)) {
      return "productAttr.dragInvalidParent";
    }
    return null;
  }

  function renormalizeSortOrder(parentId) {
    var siblings = siblingsUnder(parentId);
    var ts = now();
    var changed = false;
    siblings.forEach(function (row, i) {
      var newOrder = (i + 1) * 10;
      if (row.sort_order !== newOrder) {
        global.store.update("product_attribute", row.id, {
          sort_order: newOrder,
          updated_at: ts,
        });
        changed = true;
      }
    });
    return changed;
  }

  function updateCategoryChildTreePaths(parentId) {
    var ts = now();
    siblingsUnder(parentId).forEach(function (child) {
      global.store.update("product_attribute", child.id, {
        tree_path: treePathFor(child.id, parentId),
        updated_at: ts,
      });
    });
  }

  function resolveCategoryDropTarget(el, dragRowId) {
    if (el.classList.contains("sidebar-nav__sub")) {
      var pk = el.getAttribute("data-drop-parent-key") || "";
      var dest = siblingsUnder(Number(pk)).filter(function (r) {
        return r.id !== dragRowId;
      });
      return { toParentKey: pk, toIdx: dest.length };
    }

    var dropParentKey = el.getAttribute("data-parent-key") || "";
    var toIdx = parseInt(el.getAttribute("data-drag-idx"), 10);
    var targetId = Number(el.getAttribute("data-tree-id"));

    if (dropParentKey === "" && dragRowId !== targetId) {
      var fromParentId = siblingParentId(dragState.fromParentKey);
      if (fromParentId !== targetId) {
        var children = siblingsUnder(targetId).filter(function (r) {
          return r.id !== dragRowId;
        });
        return { toParentKey: String(targetId), toIdx: children.length };
      }
    }

    return { toParentKey: dropParentKey, toIdx: toIdx };
  }

  function moveCategoryRow(rowId, fromParentKey, toParentKey, toIdx) {
    var fromParentId = siblingParentId(fromParentKey);
    var newParentId = siblingParentId(toParentKey);
    if (!global.store.getById("product_attribute", rowId)) return;

    var errKey = validateCategoryMove(rowId, newParentId);
    if (errKey) {
      global.toast.show(t(errKey), "error");
      return;
    }

    var srcSiblings = siblingsUnder(fromParentId);
    var fromIdx = srcSiblings.findIndex(function (r) {
      return r.id === rowId;
    });
    if (fromIdx < 0) return;

    var sameParent =
      (fromParentId == null && newParentId == null) || fromParentId === newParentId;
    if (sameParent && fromIdx === toIdx) return;

    var ts = now();
    if (!sameParent) {
      global.store.update("product_attribute", rowId, {
        parent_id: newParentId,
        tree_path: treePathFor(rowId, newParentId),
        updated_at: ts,
      });
      if (hasCategoryChildren(rowId)) {
        updateCategoryChildTreePaths(rowId);
      }
    }

    var destSiblings = sameParent ? srcSiblings.slice() : siblingsUnder(newParentId);
    destSiblings = destSiblings.filter(function (r) {
      return r.id !== rowId;
    });
    if (toIdx < 0) toIdx = 0;
    if (toIdx > destSiblings.length) toIdx = destSiblings.length;
    destSiblings.splice(toIdx, 0, global.store.getById("product_attribute", rowId));

    destSiblings.forEach(function (r, i) {
      global.store.update("product_attribute", r.id, {
        sort_order: (i + 1) * 10,
        updated_at: ts,
      });
    });

    if (!sameParent) {
      renormalizeSortOrder(fromParentId);
      if (newParentId != null) {
        state.expanded[newParentId] = true;
      }
    }

    global.toast.show(t("crud.reordered"), "success");
    render();
  }

  function canReorderCarSiblings(dragRowId, dropParentKey, targetRowId) {
    if (dropParentKey !== dragState.fromParentKey) return false;
    if (cfg.attrType !== "car") return true;
    var dragRow = global.store.getById("product_attribute", dragRowId);
    var targetRow = global.store.getById("product_attribute", targetRowId);
    if (!dragRow || !targetRow) return false;
    return dragRow.type_car === targetRow.type_car;
  }

  function reorderSiblings(parentKey, fromIdx, toIdx) {
    if (fromIdx === toIdx) return;
    var parentId = siblingParentId(parentKey);
    var siblings = siblingsUnder(parentId);
    if (
      fromIdx < 0 ||
      toIdx < 0 ||
      fromIdx >= siblings.length ||
      toIdx >= siblings.length
    ) {
      return;
    }
    var moved = siblings.splice(fromIdx, 1)[0];
    siblings.splice(toIdx, 0, moved);
    var changed = false;
    var ts = now();
    siblings.forEach(function (row, i) {
      var newOrder = (i + 1) * 10;
      if (row.sort_order !== newOrder) {
        global.store.update("product_attribute", row.id, {
          sort_order: newOrder,
          updated_at: ts,
        });
        changed = true;
      }
    });
    if (changed) global.toast.show(t("crud.reordered"), "success");
    render();
  }

  function bindTreeDragEvents() {
    if (!canDnd()) return;

    function clearDragOver() {
      rootEl.querySelectorAll("li.is-drag-over, ul.sidebar-nav__sub.is-drag-over").forEach(function (el) {
        el.classList.remove("is-drag-over");
      });
    }

    function handleCategoryDrop(el) {
      if (dragState.rowId == null) return;
      var resolved = resolveCategoryDropTarget(el, dragState.rowId);
      moveCategoryRow(
        dragState.rowId,
        dragState.fromParentKey,
        resolved.toParentKey,
        resolved.toIdx
      );
    }

    if (cfg.attrType === "category") {
      rootEl.querySelectorAll("ul.sidebar-nav__sub[data-drop-parent-key]").forEach(function (ul) {
        ul.addEventListener("dragover", function (e) {
          e.preventDefault();
          e.dataTransfer.dropEffect = "move";
          clearDragOver();
          ul.classList.add("is-drag-over");
        });

        ul.addEventListener("dragleave", function () {
          ul.classList.remove("is-drag-over");
        });

        ul.addEventListener("drop", function (e) {
          e.preventDefault();
          clearDragOver();
          handleCategoryDrop(ul);
        });
      });
    }

    rootEl.querySelectorAll(".attr-tree__nav, .sidebar-nav__sub").forEach(function (ul) {
      ul.querySelectorAll(":scope > li[data-drag-idx]").forEach(function (li) {
        var handle = li.querySelector(".attr-tree__drag-handle");
        if (handle) {
          handle.addEventListener("dragstart", function (e) {
            dragState.rowId = Number(li.getAttribute("data-tree-id"));
            dragState.fromParentKey = li.getAttribute("data-parent-key") || "";
            dragState.fromIdx = parseInt(li.getAttribute("data-drag-idx"), 10);
            e.dataTransfer.effectAllowed = "move";
            e.dataTransfer.setData("text/plain", String(dragState.rowId));
            li.classList.add("is-dragging");
          });

          handle.addEventListener("dragend", function () {
            li.classList.remove("is-dragging");
            clearDragOver();
            dragState.rowId = null;
            dragState.fromParentKey = null;
            dragState.fromIdx = null;
          });
        }

        li.addEventListener("dragover", function (e) {
          e.preventDefault();
          e.dataTransfer.dropEffect = "move";
          clearDragOver();
          li.classList.add("is-drag-over");
        });

        li.addEventListener("dragleave", function () {
          li.classList.remove("is-drag-over");
        });

        li.addEventListener("drop", function (e) {
          e.preventDefault();
          clearDragOver();
          if (dragState.rowId == null) return;
          if (cfg.attrType === "category") {
            handleCategoryDrop(li);
            return;
          }
          if (dragState.fromIdx == null) return;
          var toIdx = parseInt(li.getAttribute("data-drag-idx"), 10);
          var dropParentKey = li.getAttribute("data-parent-key") || "";
          var targetRowId = Number(li.getAttribute("data-tree-id"));
          if (!canReorderCarSiblings(dragState.rowId, dropParentKey, targetRowId)) {
            global.toast.show(t("crud.dragSiblingOnly"), "warning");
            return;
          }
          if (dragState.fromIdx === toIdx) return;
          reorderSiblings(dropParentKey, dragState.fromIdx, toIdx);
        });
      });
    });
  }

  function closeAllSearchPanels(form) {
    form.querySelectorAll(".form-search-select__panel").forEach(function (p) {
      p.hidden = true;
    });
    form.querySelectorAll(".form-search-select__trigger").forEach(function (tr) {
      tr.setAttribute("aria-expanded", "false");
    });
  }

  function updateBrandMultiSelectLabel(wrap) {
    var labelEl = wrap.querySelector(".form-search-select__label");
    if (!labelEl) return;
    var ids = [];
    wrap.querySelectorAll('input[name="brand_ids"]:checked').forEach(function (cb) {
      ids.push(Number(cb.value));
    });
    labelEl.textContent = brandMultiSelectLabel(ids);
  }

  function bindFormSearchSelects(form) {
    form.querySelectorAll(".form-search-select:not(.form-search-select--multi)").forEach(function (wrap) {
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
          panel.hidden = true;
          trigger.setAttribute("aria-expanded", "false");
          clearFieldError(wrap);
          if (hidden.name === "car_brand_id") {
            render();
          }
        });
      });
    });

    form.querySelectorAll(".form-search-select--multi").forEach(function (wrap) {
      var trigger = wrap.querySelector(".form-search-select__trigger");
      var panel = wrap.querySelector(".form-search-select__panel");
      var search = wrap.querySelector(".form-search-select__search");
      var list = wrap.querySelector(".form-search-select__list");
      if (!trigger || !panel || !list) return;

      trigger.addEventListener("click", function (e) {
        e.stopPropagation();
        if (trigger.disabled) return;
        var willOpen = panel.hidden;
        closeAllSearchPanels(form);
        if (willOpen) {
          panel.hidden = false;
          trigger.setAttribute("aria-expanded", "true");
          if (search) {
            search.value = "";
            list.querySelectorAll(".form-search-select__option--check").forEach(function (opt) {
              opt.hidden = false;
            });
            search.focus();
          }
        }
      });

      panel.addEventListener("click", function (e) {
        e.stopPropagation();
      });

      if (search) {
        search.addEventListener("click", function (e) {
          e.stopPropagation();
        });
        search.addEventListener("input", function () {
          var q = search.value.trim().toLowerCase();
          list.querySelectorAll(".form-search-select__option--check").forEach(function (opt) {
            opt.hidden = !!(q && (opt.textContent || "").toLowerCase().indexOf(q) < 0);
          });
        });
      }

      list.querySelectorAll(".form-search-select__option--check").forEach(function (opt) {
        var cb = opt.querySelector('input[type="checkbox"]');
        if (!cb) return;

        cb.addEventListener("click", function (e) {
          e.stopPropagation();
        });

        cb.addEventListener("change", function () {
          updateBrandMultiSelectLabel(wrap);
          clearFieldError(wrap);
        });

        opt.addEventListener("click", function (e) {
          e.stopPropagation();
          if (cb.disabled) return;
          if (e.target !== cb) {
            cb.checked = !cb.checked;
            cb.dispatchEvent(new Event("change", { bubbles: false }));
          }
        });
      });
    });

    if (!form._searchSelectCloseBound) {
      form._searchSelectCloseBound = true;
      form.addEventListener("click", function () {
        closeAllSearchPanels(form);
      });
    }
  }

  function bindFormEvents() {
    var form = rootEl.querySelector("#attr-form");
    if (!form) return;
    bindFormSearchSelects(form);

    var typeCarSelect = form.querySelector('select[name="type_car"]');
    if (typeCarSelect) {
      typeCarSelect.addEventListener("change", function () {
        render();
      });
    }

    var cancelBtn = rootEl.querySelector("#attr-form-cancel");
    if (cancelBtn) {
      cancelBtn.addEventListener("click", function () {
        state.editingId = null;
        state.draft = { type_car: "brand", car_brand_id: "", car_model_id: "" };
        render();
      });
    }

    form.querySelectorAll("input, select, textarea").forEach(function (el) {
      el.addEventListener("input", function () {
        clearFieldError(el.closest(".form-field"));
      });
      el.addEventListener("change", function () {
        clearFieldError(el.closest(".form-field"));
      });
    });

    form.addEventListener("submit", function (e) {
      e.preventDefault();
      if (state.editingId ? !can("update") : !can("create")) return;
      form.querySelectorAll(".form-field").forEach(clearFieldError);
      var fd = new FormData(form);
      var nameTh = String(fd.get("name_th") || "").trim();
      var nameEn = String(fd.get("name_en") || "").trim();
      var firstInvalid = null;
      if (!nameTh) {
        showFieldError(form.querySelector('[data-field="name_th"]'), t("error.required"));
        firstInvalid = form.querySelector('[name="name_th"]');
      }
      if (!nameEn) {
        showFieldError(form.querySelector('[data-field="name_en"]'), t("error.required"));
        if (!firstInvalid) firstInvalid = form.querySelector('[name="name_en"]');
      }
      var isActive = fd.get("is_active") === "on";

      if (cfg.attrType === "category") {
        if (firstInvalid) {
          firstInvalid.focus();
          return;
        }
        var parentIdRaw = String(fd.get("parent_id") || "").trim();
        var parentId = parentIdRaw ? Number(parentIdRaw) : null;
        if (
          state.editingId != null &&
          parentId != null &&
          isDescendantOf(state.editingId, parentId)
        ) {
          global.toast.show(t("productAttr.dragInvalidParent"), "error");
          return;
        }
        saveCategory(nameTh, nameEn, isActive, parentId, fd.getAll("brand_ids"));
        return;
      }

      if (cfg.attrType === "brand") {
        if (firstInvalid) {
          firstInvalid.focus();
          return;
        }
        saveBrand(nameTh, nameEn, isActive);
        return;
      }

      if (cfg.attrType === "car") {
        var typeCar = String(fd.get("type_car") || "brand");
        var carBrandId = String(fd.get("car_brand_id") || "").trim();
        var carModelId = String(fd.get("car_model_id") || "").trim();
        var carParent = null;
        if (typeCar === "model") {
          if (!carBrandId) {
            showFieldError(form.querySelector('[data-field="car_brand_id"]'), t("productAttr.carBrandRequired"));
            if (!firstInvalid) firstInvalid = form.querySelector('[name="car_brand_id"]');
          }
          carParent = carBrandId ? Number(carBrandId) : null;
        } else if (typeCar === "engine") {
          if (!carModelId) {
            showFieldError(form.querySelector('[data-field="car_model_id"]'), t("productAttr.carModelRequired"));
            if (!firstInvalid) firstInvalid = form.querySelector('[name="car_model_id"]');
          }
          carParent = carModelId ? Number(carModelId) : null;
        }
        if (firstInvalid) {
          firstInvalid.focus();
          return;
        }
        saveCar(nameTh, nameEn, isActive, typeCar, carParent);
      }
    });
  }

  function upsertLang(attrId, loc, name) {
    var rows = global.store.getAll("product_attribute_language");
    var idx = rows.findIndex(function (r) {
      return r.product_attribute_id === attrId && r.locale === loc;
    });
    if (idx >= 0) {
      global.store.updateAt("product_attribute_language", idx, { name: name, updated_at: now() });
    } else {
      global.store.create("product_attribute_language", {
        product_attribute_id: attrId,
        locale: loc,
        name: name,
        created_at: now(),
        updated_at: now(),
      });
    }
  }

  function syncCategoryRelations(categoryId, brandIds) {
    var rels = global.store.getAll("product_attribute_relation");
    for (var i = rels.length - 1; i >= 0; i--) {
      if (rels[i].related_id === categoryId) {
        global.store.deleteAt("product_attribute_relation", i);
      }
    }
    brandIds.forEach(function (bid) {
      var brandId = Number(bid);
      if (!brandId) return;
      global.store.create("product_attribute_relation", {
        product_attribute_id: brandId,
        related_id: categoryId,
      });
    });
  }

  function nextSortOrder(parentId) {
    var siblings = activeRows().filter(function (r) {
      return (parentId == null ? r.parent_id == null : r.parent_id === parentId);
    });
    if (siblings.length === 0) return 100;
    return Math.max.apply(
      null,
      siblings.map(function (r) {
        return r.sort_order;
      })
    ) + 100;
  }

  function saveCategory(nameTh, nameEn, isActive, parentId, brandIds) {
    var ts = now();
    if (state.editingId) {
      global.store.update("product_attribute", state.editingId, {
        parent_id: parentId,
        is_active: isActive,
        tree_path: treePathFor(state.editingId, parentId),
        updated_at: ts,
      });
      upsertLang(state.editingId, "th", nameTh);
      upsertLang(state.editingId, "en", nameEn);
      syncCategoryRelations(state.editingId, brandIds);
      global.toast.show(t("crud.updated"), "success");
    } else {
      var id = global.store.nextId("product_attribute");
      global.store.create("product_attribute", {
        id: id,
        type: "category",
        type_car: null,
        system_file_id: null,
        parent_id: parentId,
        tree_path: treePathFor(id, parentId),
        sort_order: nextSortOrder(parentId),
        is_active: isActive,
        is_stopped: false,
        deleted_at: null,
        created_at: ts,
        updated_at: ts,
        created_by: 1,
        updated_by: 1,
      });
      upsertLang(id, "th", nameTh);
      upsertLang(id, "en", nameEn);
      syncCategoryRelations(id, brandIds);
      global.toast.show(t("crud.created"), "success");
    }
    state.editingId = null;
    state.draft = { type_car: "brand", car_brand_id: "", car_model_id: "" };
    render();
  }

  function saveBrand(nameTh, nameEn, isActive) {
    var ts = now();
    if (state.editingId) {
      global.store.update("product_attribute", state.editingId, {
        is_active: isActive,
        updated_at: ts,
      });
      upsertLang(state.editingId, "th", nameTh);
      upsertLang(state.editingId, "en", nameEn);
      global.toast.show(t("crud.updated"), "success");
    } else {
      var id = global.store.nextId("product_attribute");
      global.store.create("product_attribute", {
        id: id,
        type: "brand",
        type_car: null,
        system_file_id: null,
        parent_id: null,
        tree_path: treePathFor(id, null),
        sort_order: nextSortOrder(null),
        is_active: isActive,
        is_stopped: false,
        deleted_at: null,
        created_at: ts,
        updated_at: ts,
        created_by: 1,
        updated_by: 1,
      });
      upsertLang(id, "th", nameTh);
      upsertLang(id, "en", nameEn);
      global.toast.show(t("crud.created"), "success");
    }
    state.editingId = null;
    render();
  }

  function saveCar(nameTh, nameEn, isActive, typeCar, parentId) {
    var ts = now();
    if (state.editingId) {
      global.store.update("product_attribute", state.editingId, {
        type_car: typeCar,
        parent_id: parentId,
        tree_path: treePathFor(state.editingId, parentId),
        is_active: isActive,
        updated_at: ts,
      });
      upsertLang(state.editingId, "th", nameTh);
      upsertLang(state.editingId, "en", nameEn);
      global.toast.show(t("crud.updated"), "success");
    } else {
      var id = global.store.nextId("product_attribute");
      global.store.create("product_attribute", {
        id: id,
        type: "car",
        type_car: typeCar,
        system_file_id: null,
        parent_id: parentId,
        tree_path: treePathFor(id, parentId),
        sort_order: nextSortOrder(parentId),
        is_active: isActive,
        is_stopped: false,
        deleted_at: null,
        created_at: ts,
        updated_at: ts,
        created_by: 1,
        updated_by: 1,
      });
      upsertLang(id, "th", nameTh);
      upsertLang(id, "en", nameEn);
      global.toast.show(t("crud.created"), "success");
    }
    state.editingId = null;
    state.draft = { type_car: "brand", car_brand_id: "", car_model_id: "" };
    render();
  }

  function softDelete(id) {
    global.store.update("product_attribute", id, { deleted_at: now(), updated_at: now() });
    if (cfg.attrType === "category" || cfg.attrType === "brand") {
      var rels = global.store.getAll("product_attribute_relation");
      for (var i = rels.length - 1; i >= 0; i--) {
        if (rels[i].related_id === id || rels[i].product_attribute_id === id) {
          global.store.deleteAt("product_attribute_relation", i);
        }
      }
    }
    if (state.editingId === id) state.editingId = null;
    global.toast.show(t("crud.deleted"), "success");
    render();
  }

  function ensureConfirmOverlay() {
    if (confirmOverlay) return;
    confirmOverlay = document.createElement("div");
    confirmOverlay.className = "modal-overlay";
    confirmOverlay.hidden = true;
    confirmOverlay.innerHTML =
      '<div class="modal crud-modal" role="dialog" aria-modal="true">' +
      '<div class="modal__header"><h2 class="modal__title">' +
      escapeHtml(t("crud.delete")) +
      "</h2></div>" +
      '<p class="modal__body">' +
      escapeHtml(t("crud.confirmDelete")) +
      "</p>" +
      '<div class="modal__footer">' +
      '<button type="button" class="btn" id="attr-confirm-cancel">' +
      escapeHtml(t("crud.cancel")) +
      "</button>" +
      '<button type="button" class="btn btn--primary" id="attr-confirm-ok">' +
      escapeHtml(t("crud.delete")) +
      "</button></div></div>";
    document.body.appendChild(confirmOverlay);
    confirmOverlay.querySelector("#attr-confirm-cancel").addEventListener("click", closeConfirm);
    confirmOverlay.addEventListener("click", function (e) {
      if (e.target === confirmOverlay) closeConfirm();
    });
  }

  var pendingDeleteId = null;

  function openConfirm(id) {
    ensureConfirmOverlay();
    pendingDeleteId = id;
    confirmOverlay.hidden = false;
    document.body.classList.add("modal-open");
    confirmOverlay.querySelector("#attr-confirm-ok").onclick = function () {
      if (pendingDeleteId != null) softDelete(pendingDeleteId);
      closeConfirm();
    };
  }

  function closeConfirm() {
    if (!confirmOverlay) return;
    confirmOverlay.hidden = true;
    document.body.classList.remove("modal-open");
    pendingDeleteId = null;
  }

  function boot() {
    var typeKey = document.body.getAttribute("data-attr-type");
    cfg = PAGE_CONFIG[typeKey];
    if (!cfg) {
      console.error("Unknown attr type:", typeKey);
      return;
    }

    global.store.init();
    global.i18n.init();
    if (!global.auth.requireAuth("login.html")) return;
    if (!global.permissions.guardPage(PERM_MODULE, cfg.permType, "login.html")) return;

    global.layout.mount({
      pageTitle: t(cfg.pageTitleKey),
      contentHtml: '<div id="attr-split-root"></div>',
    });

    rootEl = document.getElementById("attr-split-root");
    render();

    document.addEventListener("i18n:change", render);
    document.addEventListener("store:change", render);
    if (global.realtime) {
      global.realtime.onMessage(function () {
        render();
      });
    }

    global.devBar.mount({
      toasts: [
        { type: "success", label: "Created", msgKey: "crud.created" },
        { type: "success", label: "Updated", msgKey: "crud.updated" },
        { type: "success", label: "Reordered", msgKey: "crud.reordered" },
        { type: "success", label: "Status changed", msgKey: "crud.statusChanged" },
        { type: "success", label: "Deleted", msgKey: "crud.deleted" },
        { type: "error", label: "Required", msgKey: "error.required" },
        { type: "warning", label: "Drag scope", msgKey: "crud.dragSiblingOnly" },
      ],
    });
  }

  global.productAttributePage = { boot: boot };
})(window);

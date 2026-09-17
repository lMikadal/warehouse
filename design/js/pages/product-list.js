(function (global) {
  var PERM_MODULE = "product";
  var PERM_TYPE = "product_list";

  var state = {
    query: "",
    categoryId: "",
    brandId: "",
    statusFilter: "",
    newFilter: "",
    page: 1,
    pageSize: 10,
    sortKey: null,
    sortDir: null,
    carModalListId: null,
    whModalItemId: null,
    deleteTargets: null,
  };

  var rootEl = null;
  var confirmOverlay = null;
  var detailOverlay = null;

  function t(key, params) {
    if (!global.i18n) return key;
    return params ? global.i18n.format(key, params) : global.i18n.t(key);
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
    return global.permissions && global.permissions.canAction(PERM_MODULE, PERM_TYPE, action);
  }

  function canResource(module, type, action) {
    return global.permissions && global.permissions.canAction(module, type, action);
  }

  function setDetailModalFooter(kind) {
    if (!detailOverlay) return;
    var footer = detailOverlay.querySelector("#pl-detail-footer");
    if (!footer) return;
    var html = "";
    if (kind === "car" && canResource("product", "product_car", "view")) {
      html =
        '<a class="product-list__detail-more-link" href="' +
        escapeAttr(global.nav.resolve("pages/product-car.html")) +
        '" data-i18n="productList.viewMoreDetails"></a>';
    } else if (kind === "warehouse" && canResource("warehouse", "warehouse_list", "view")) {
      html =
        '<a class="product-list__detail-more-link" href="' +
        escapeAttr(global.nav.resolve("pages/warehouse-list.html")) +
        '" data-i18n="productList.viewMoreDetails"></a>';
    }
    footer.innerHTML = html;
    footer.hidden = !html;
  }

  function now() {
    return new Date().toISOString();
  }

  function langName(table, idField, id, loc) {
    var rows = global.store.getAll(table);
    var row = rows.find(function (r) {
      return r[idField] === id && r.locale === loc;
    });
    if (row && row.name) return row.name;
    row = rows.find(function (r) {
      return r[idField] === id && r.locale === "th";
    });
    return row && row.name ? row.name : "";
  }

  function attrName(attrId, loc) {
    loc = loc || locale();
    return langName("product_attribute_language", "product_attribute_id", attrId, loc);
  }

  function itemDisplayName(itemId, loc) {
    loc = loc || locale();
    var th = langName("product_item_language", "product_item_id", itemId, "th");
    var en = langName("product_item_language", "product_item_id", itemId, "en");
    if (loc === "en") return (en || th || "").trim();
    return (th || en || "").trim();
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
    var name =
      loc === "en"
        ? (en && en.name) || (th && th.name) || sku
        : (th && th.name) || (en && en.name) || sku;
    if (!name) return sku || "—";
    if (opts.includeSku === false) return name;
    return sku && name !== sku ? name + " (" + sku + ")" : name;
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

  function warehouseRootsForItem(itemId) {
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

  function carRowsForList(listId) {
    return global.store
      .getAll("product_list_car")
      .filter(function (c) {
        return c.product_list_id === listId && c.deleted_at == null;
      })
      .map(function (c) {
        return {
          id: c.id,
          brandName: attrName(c.product_attribute_brand_id),
          modelName: attrName(c.product_attribute_model_id),
          engineName: attrName(c.product_attribute_engine_id),
          gear: c.gear_type,
          yearStart: c.year_start,
          yearEnd: c.year_end,
          line:
            attrName(c.product_attribute_brand_id) +
            " " +
            attrName(c.product_attribute_model_id) +
            (c.year_start != null && c.year_end != null
              ? " (" + c.year_start + "-" + c.year_end + ")"
              : ""),
        };
      });
  }

  function listRows() {
    var loc = locale();
    return global.store
      .getAll("product_item")
      .filter(function (item) {
        return item.deleted_at == null;
      })
      .map(function (item) {
        var list = global.store.getById("product_list", item.product_list_id);
        if (!list || list.deleted_at != null) return null;
        var totalStock = totalStockForItem(item.id);
        var lowStock = totalStock < (item.minimum_stock || 0);
        var sku = (item.sku && String(item.sku).trim()) || list.sku;
        var brandId = list.product_brand_id;
        var categoryId = list.product_category_id;
        var name = itemDisplayName(item.id, loc) || langName("product_list_language", "product_list_id", list.id, loc);
        return {
          id: item.id,
          product_list_id: list.id,
          sku: sku,
          tag: list.tag || "",
          is_new: !!list.is_new,
          is_active: !!item.is_active,
          price: Number(item.price) || 0,
          unit: item.unit || "piece",
          qty_per_unit: item.qty_per_unit != null ? item.qty_per_unit : 1,
          minimum_stock: item.minimum_stock || 0,
          _productName: name,
          _brandName: brandId ? attrName(brandId, loc) : "—",
          _brandId: brandId != null ? String(brandId) : "",
          _categoryName: categoryId ? attrName(categoryId, loc) : "—",
          _categoryId: categoryId != null ? String(categoryId) : "",
          _totalStock: totalStock,
          _lowStock: lowStock,
          _warehouseCount: warehouseRootsForItem(item.id),
          _cars: carRowsForList(list.id),
          created_at: item.created_at,
        };
      })
      .filter(Boolean);
  }

  function filterRows(rows) {
    var q = state.query.trim().toLowerCase();
    return rows.filter(function (row) {
      if (state.categoryId && row._categoryId !== state.categoryId) return false;
      if (state.brandId && row._brandId !== state.brandId) return false;
      if (state.statusFilter === "active" && !row.is_active) return false;
      if (state.statusFilter === "inactive" && row.is_active) return false;
      if (state.newFilter === "new" && !row.is_new) return false;
      if (!q) return true;
      return (
        row._productName.toLowerCase().indexOf(q) >= 0 ||
        String(row.sku).toLowerCase().indexOf(q) >= 0 ||
        String(row.tag).toLowerCase().indexOf(q) >= 0 ||
        row._brandName.toLowerCase().indexOf(q) >= 0 ||
        row._categoryName.toLowerCase().indexOf(q) >= 0
      );
    });
  }

  function compareCreatedAt(a, b) {
    var ca = a.created_at || "";
    var cb = b.created_at || "";
    if (ca !== cb) return ca < cb ? -1 : 1;
    return (a.id || 0) - (b.id || 0);
  }

  function sortRows(rows) {
    var copy = rows.slice();
    copy.sort(compareCreatedAt);
    if (!state.sortKey || !state.sortDir) return copy;
    var dir = state.sortDir === "desc" ? -1 : 1;
    var key = state.sortKey;
    return copy.sort(function (a, b) {
      var va = a[key];
      var vb = b[key];
      var cmp = 0;
      if (typeof va === "number" && typeof vb === "number") cmp = va - vb;
      else if (typeof va === "boolean") cmp = (va ? 1 : 0) - (vb ? 1 : 0);
      else cmp = String(va || "").localeCompare(String(vb || ""), undefined, { sensitivity: "base" });
      if (cmp !== 0) return cmp * dir;
      return compareCreatedAt(a, b);
    });
  }

  function categoryOptions() {
    return global.store
      .getAll("product_attribute")
      .filter(function (r) {
        return r.deleted_at == null && r.type === "category" && r.is_active;
      })
      .sort(function (a, b) {
        return a.sort_order - b.sort_order || a.id - b.id;
      })
      .map(function (r) {
        return { value: String(r.id), label: attrName(r.id) };
      });
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

  function packUnitKey(unit) {
    var u = (unit || "piece").toLowerCase();
    if (u === "box") return "productList.packUnitBox";
    if (u === "set") return "productList.packUnitSet";
    return "productList.packUnitPiece";
  }

  function formatMoney(n) {
    if (n == null || Number.isNaN(n)) return "—";
    return Number(n).toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 });
  }

  function sortIcon(colId) {
    if (state.sortKey !== colId) return "arrow-up-down";
    return state.sortDir === "desc" ? "arrow-down" : "arrow-up";
  }

  function cycleSort(colId) {
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
    render();
  }

  function statusSwitchHtml(row) {
    var label = t("col.status");
    return (
      '<label class="crud-switch product-list__status-switch">' +
      '<input type="checkbox" class="crud-status-switch" role="switch" data-id="' +
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

  function productCellHtml(row) {
    var cars = row._cars || [];
    var first = cars[0];
    var more = cars.length > 1 ? cars.length - 1 : 0;
    var badges =
      (row.is_new
        ? '<span class="product-list__badge product-list__badge--new">' + escapeHtml(t("label.productNew")) + "</span>"
        : "") +
      (row._lowStock
        ? '<span class="product-list__badge product-list__badge--low">' +
          '<img src="../assets/icons/triangle-alert.svg" alt="" width="12" height="12" />' +
          escapeHtml(t("productList.lowStock")) +
          "</span>"
        : "");
    var carHtml = first
      ? '<button type="button" class="product-list__car-chip" data-car-list="' +
        escapeAttr(row.product_list_id) +
        '">' +
        escapeHtml(first.line.trim()) +
        (more ? ' <span class="product-list__car-more">+' + more + "</span>" : "") +
        "</button>"
      : "";
    return (
      '<div class="product-list__product-cell">' +
      '<div class="product-list__thumb" aria-hidden="true">' +
      '<img src="../assets/icons/package.svg" alt="" width="20" height="20" />' +
      "</div>" +
      '<div class="product-list__product-meta">' +
      (badges ? '<div class="product-list__badges">' + badges + "</div>" : "") +
      '<div class="product-list__name">' +
      escapeHtml(row._productName) +
      "</div>" +
      '<div class="product-list__sku">' +
      escapeHtml(row.sku) +
      "</div>" +
      carHtml +
      "</div></div>"
    );
  }

  function filterBtnHtml(activeValue, value, i18nKey) {
    var active = activeValue === value;
    return (
      '<button type="button" class="crud-status-filter__btn' +
      (active ? " crud-status-filter__btn--active" : "") +
      '" data-filter-value="' +
      escapeAttr(value) +
      '"' +
      (active ? ' aria-pressed="true"' : ' aria-pressed="false"') +
      '><span data-i18n="' +
      escapeAttr(i18nKey) +
      '"></span></button>'
    );
  }

  function pageHeaderHtml() {
    var actions = "";
    if (can("import") || can("export") || can("create")) {
      actions = '<div class="crud-page-header__actions">';
      if (can("export")) {
        actions +=
          '<button type="button" class="btn crud-page-header__export" id="product-list-export">' +
          '<img src="../assets/icons/download.svg" alt="" width="16" height="16" />' +
          '<span data-i18n="crud.export"></span></button>';
      }
      if (can("import")) {
        actions +=
          '<button type="button" class="btn crud-page-header__import" id="product-list-import">' +
          '<img src="../assets/icons/upload.svg" alt="" width="16" height="16" />' +
          '<span data-i18n="crud.import"></span></button>';
      }
      if (can("create")) {
        actions +=
          '<a class="btn btn--primary crud-page-header__create" href="product-list-form.html">' +
          '<img src="../assets/icons/plus.svg" alt="" width="16" height="16" />' +
          '<span data-i18n="productList.addProductCta"></span></a>';
      }
      actions += "</div>";
    }
    return (
      '<div class="crud-page-header">' +
      '<div class="crud-page-header__text">' +
      '<h1 class="crud-page-header__title" data-i18n="page.productList"></h1>' +
      '<p class="crud-page-header__desc" data-i18n="page.productList.desc"></p>' +
      "</div>" +
      actions +
      "</div>"
    );
  }

  function tableCellHtml(col, row) {
    if (col.id === "_productName") return productCellHtml(row);
    if (col.id === "_totalStock") return escapeHtml(String(row._totalStock));
    if (col.id === "price") return escapeHtml(formatMoney(row.price));
    if (col.id === "qty_per_unit") {
      return (
        escapeHtml(String(row.qty_per_unit)) +
        ' <span class="product-list__unit">' +
        escapeHtml(t(packUnitKey(row.unit))) +
        "</span>"
      );
    }
    if (col.id === "_categoryName") return escapeHtml(row._categoryName);
    if (col.id === "_brandName") return escapeHtml(row._brandName);
    if (col.id === "_warehouseCount") {
      return (
        '<div class="product-list__wh-cell">' +
        "<span>" +
        escapeHtml(t("productList.warehouseCountLabel", { count: row._warehouseCount })) +
        "</span>" +
        (row._warehouseCount > 0
          ? '<button type="button" class="btn btn--sm product-list__wh-btn" data-wh-item="' +
            escapeAttr(row.id) +
            '">' +
            escapeHtml(t("productList.viewMore")) +
            "</button>"
          : "") +
        "</div>"
      );
    }
    if (col.id === "is_active") return statusSwitchHtml(row);
    if (col.id === "actions") {
      return (
        '<div class="data-table__actions">' +
        (can("update")
          ? '<button type="button" class="btn btn--icon product-list__edit" data-list-id="' +
            escapeAttr(row.product_list_id) +
            '" aria-label="' +
            escapeAttr(t("crud.edit")) +
            '"><img src="../assets/icons/pencil.svg" alt="" width="16" height="16" /></button>'
          : "") +
        (can("delete")
          ? '<button type="button" class="btn btn--icon crud-delete product-list__delete" data-id="' +
            escapeAttr(row.id) +
            '" aria-label="' +
            escapeAttr(t("crud.delete")) +
            '"><img src="../assets/icons/trash-2.svg" alt="" width="16" height="16" /></button>'
          : "") +
        "</div>"
      );
    }
    return "";
  }

  function tableTdClass(col, row) {
    var cls = col.cellClass || col.class;
    if (col.id === "_totalStock" && row._lowStock) cls += " product-list__stock--low";
    return cls;
  }

  function tableHtml(pageRows) {
    var cols = [
      { id: "_productName", sort: true, labelKey: "productList.colProduct", class: "product-list__col-product" },
      { id: "_totalStock", sort: true, labelKey: "productList.colStock", class: "data-table__col-numeric" },
      { id: "price", sort: true, labelKey: "productList.colNetPrice", class: "data-table__col-numeric" },
      {
        id: "qty_per_unit",
        sort: false,
        labelKey: "productList.colPackaging",
        class: "product-list__col-pack data-table__col-center",
      },
      {
        id: "_categoryName",
        sort: true,
        labelKey: "col.category",
        class: "product-list__col-category",
      },
      { id: "_brandName", sort: true, labelKey: "col.brand", class: "product-list__col-brand" },
      { id: "_warehouseCount", sort: false, labelKey: "productList.colWarehouse", class: "product-list__col-wh data-table__col-center" },
      { id: "is_active", sort: true, labelKey: "col.status", class: "product-list__col-status data-table__col-center" },
      {
        id: "actions",
        sort: false,
        labelKey: "productList.colManageProduct",
        class: "data-table__actions-col product-list__col-actions",
        cellClass: "product-list__col-actions data-table__col-center",
      },
    ];
    var head = cols
      .map(function (col) {
        if (!col.sort) {
          return (
            '<th scope="col" class="' +
            col.class +
            '"><span data-i18n="' +
            escapeAttr(col.labelKey) +
            '"></span></th>'
          );
        }
        return (
          '<th scope="col" class="' +
          col.class +
          ' data-table__sort-col"><button type="button" class="data-table__sort-btn" data-sort-key="' +
          escapeAttr(col.id) +
          '"><span data-i18n="' +
          escapeAttr(col.labelKey) +
          '"></span><img src="../assets/icons/' +
          sortIcon(col.id) +
          '.svg" alt="" width="14" height="14" class="data-table__sort-icon" aria-hidden="true" /></button></th>'
        );
      })
      .join("");
    var body = pageRows
      .map(function (row) {
        var cells = cols
          .map(function (col) {
            return (
              '<td class="' + tableTdClass(col, row) + '">' + tableCellHtml(col, row) + "</td>"
            );
          })
          .join("");
        return '<tr data-item-id="' + escapeAttr(row.id) + '">' + cells + "</tr>";
      })
      .join("");
    if (!pageRows.length) {
      body =
        '<tr><td class="crud-empty" colspan="' +
        cols.length +
        '" data-i18n="crud.empty"></td></tr>';
    }
    return (
      '<div class="crud-table-wrap__body">' +
      '<table class="data-table product-list__table">' +
      "<thead><tr>" +
      head +
      "</tr></thead><tbody>" +
      body +
      "</tbody></table></div>"
    );
  }

  function toolbarHtml() {
    var cats = categoryOptions();
    var catOpts =
      '<option value="">' +
      escapeHtml(t("productList.filterProductCategory")) +
      "</option>" +
      cats
        .map(function (c) {
          return (
            '<option value="' +
            escapeAttr(c.value) +
            '"' +
            (state.categoryId === c.value ? " selected" : "") +
            ">" +
            escapeHtml(c.label) +
            "</option>"
          );
        })
        .join("");
    var brands = brandOptions();
    var brandOpts =
      '<option value="">' +
      escapeHtml(t("productList.filterProductBrand")) +
      "</option>" +
      brands
        .map(function (b) {
          return (
            '<option value="' +
            escapeAttr(b.value) +
            '"' +
            (state.brandId === b.value ? " selected" : "") +
            ">" +
            escapeHtml(b.label) +
            "</option>"
          );
        })
        .join("");
    var statusGroup =
      '<div class="crud-filter-btn-group" data-filter-key="status">' +
      '<span class="crud-filter-btn-group__label" data-i18n="productList.filterStatusPlaceholder"></span>' +
      '<div class="crud-status-filter" id="product-list-status-filter" role="group" aria-label="' +
      escapeAttr(t("productList.filterStatusPlaceholder")) +
      '">' +
      filterBtnHtml(state.statusFilter, "", "crud.filterAll") +
      filterBtnHtml(state.statusFilter, "active", "col.active") +
      filterBtnHtml(state.statusFilter, "inactive", "col.inactive") +
      "</div></div>";
    var newGroup =
      '<div class="crud-filter-btn-group" data-filter-key="new">' +
      '<span class="crud-filter-btn-group__label" data-i18n="productList.filterNewProductPlaceholder"></span>' +
      '<div class="crud-status-filter" id="product-list-new-filter" role="group" aria-label="' +
      escapeAttr(t("productList.filterNewProductPlaceholder")) +
      '">' +
      filterBtnHtml(state.newFilter, "", "crud.filterAll") +
      filterBtnHtml(state.newFilter, "new", "productList.newProductFilterOnly") +
      "</div></div>";
    return (
      '<div class="crud-toolbar product-list__toolbar">' +
      '<div class="crud-toolbar__row product-list__toolbar-row">' +
      '<input type="search" id="product-list-search" class="crud-toolbar__search" data-i18n-placeholder="search.placeholder" placeholder="ค้นหา" value="' +
      escapeAttr(state.query) +
      '" />' +
      '<select id="product-list-category" class="crud-toolbar__select" aria-label="' +
      escapeAttr(t("productList.filterProductCategory")) +
      '">' +
      catOpts +
      "</select>" +
      '<select id="product-list-brand" class="crud-toolbar__select" aria-label="' +
      escapeAttr(t("productList.filterProductBrand")) +
      '">' +
      brandOpts +
      "</select></div>" +
      '<div class="crud-toolbar__row crud-toolbar__row--filters">' +
      statusGroup +
      newGroup +
      "</div></div>"
    );
  }

  function render() {
    if (!rootEl) return;
    if (global.crudList && global.crudList.readStoredPageSize) {
      state.pageSize = global.crudList.readStoredPageSize();
    }
    var filtered = filterRows(listRows());
    var sorted = sortRows(filtered);
    var total = sorted.length;
    var totalPages = Math.max(1, Math.ceil(total / state.pageSize));
    if (state.page > totalPages) state.page = totalPages;
    var start = (state.page - 1) * state.pageSize;
    var pageRows = sorted.slice(start, start + state.pageSize);
    rootEl.innerHTML =
      '<div class="crud-page product-list">' +
      pageHeaderHtml() +
      toolbarHtml() +
      '<div class="crud-table-wrap">' +
      tableHtml(pageRows) +
      "</div>" +
      '<nav class="crud-pagination" id="product-list-pagination" aria-label="Pagination"></nav>' +
      "</div>";

    if (global.i18n) global.i18n.init();
    if (global.permissions) global.permissions.applyActionButtons(rootEl);

    var pager = rootEl.querySelector("#product-list-pagination");
    if (pager && global.crudList && global.crudList.renderPaginationBar) {
      global.crudList.renderPaginationBar(
        pager,
        { page: state.page, pageSize: state.pageSize },
        { total: total, totalPages: totalPages },
        function (patch) {
          if (patch.pageSize != null) state.pageSize = patch.pageSize;
          if (patch.page != null) state.page = patch.page;
          render();
        }
      );
    }

    bindEvents(pageRows);
  }

  function bindEvents(pageRows) {
    var search = rootEl.querySelector("#product-list-search");
    if (search) {
      search.addEventListener("input", function () {
        state.query = search.value;
        state.page = 1;
        render();
        var next = rootEl.querySelector("#product-list-search");
        if (next) {
          next.focus();
          next.setSelectionRange(next.value.length, next.value.length);
        }
      });
    }
    var categoryEl = rootEl.querySelector("#product-list-category");
    if (categoryEl) {
      categoryEl.addEventListener("change", function () {
        state.categoryId = categoryEl.value;
        state.page = 1;
        render();
      });
    }
    var brandEl = rootEl.querySelector("#product-list-brand");
    if (brandEl) {
      brandEl.addEventListener("change", function () {
        state.brandId = brandEl.value;
        state.page = 1;
        render();
      });
    }
    rootEl.querySelectorAll(".crud-filter-btn-group").forEach(function (group) {
      var key = group.getAttribute("data-filter-key");
      group.querySelectorAll(".crud-status-filter__btn").forEach(function (btn) {
        btn.addEventListener("click", function () {
          var next = btn.getAttribute("data-filter-value") || "";
          if (key === "status") {
            if (next === state.statusFilter) return;
            state.statusFilter = next;
          } else if (key === "new") {
            if (next === state.newFilter) return;
            state.newFilter = next;
          }
          state.page = 1;
          render();
        });
      });
    });
    rootEl.querySelectorAll(".data-table__sort-btn").forEach(function (btn) {
      btn.addEventListener("click", function () {
        cycleSort(btn.getAttribute("data-sort-key"));
      });
    });
    rootEl.querySelectorAll(".crud-status-switch").forEach(function (input) {
      input.addEventListener("change", function () {
        var itemId = Number(input.getAttribute("data-id"));
        var item = global.store.getById("product_item", itemId);
        if (!item) return;
        global.store.update("product_item", itemId, {
          is_active: input.checked,
          updated_at: now(),
        });
        global.realtime.broadcast({ type: "update", table: "product_item" });
        global.toast.show(t("crud.statusChanged"), "success");
      });
    });
    rootEl.querySelectorAll(".product-list__car-chip").forEach(function (btn) {
      btn.addEventListener("click", function () {
        state.carModalListId = Number(btn.getAttribute("data-car-list"));
        openCarModal();
      });
    });
    rootEl.querySelectorAll(".product-list__wh-btn").forEach(function (btn) {
      btn.addEventListener("click", function () {
        state.whModalItemId = Number(btn.getAttribute("data-wh-item"));
        openWarehouseModal();
      });
    });
    rootEl.querySelectorAll(".product-list__delete").forEach(function (btn) {
      btn.addEventListener("click", function () {
        var id = Number(btn.getAttribute("data-id"));
        var row = listRows().find(function (r) {
          return r.id === id;
        });
        if (row) openDeleteConfirm([row]);
      });
    });
    rootEl.querySelectorAll(".product-list__edit").forEach(function (btn) {
      btn.addEventListener("click", function () {
        location.href = "product-list-form.html?product_list_id=" + encodeURIComponent(btn.getAttribute("data-list-id"));
      });
    });
    var imp = rootEl.querySelector("#product-list-import");
    if (imp) {
      imp.addEventListener("click", function () {
        global.toast.show(t("crud.importComingSoon"), "info");
      });
    }
    var exp = rootEl.querySelector("#product-list-export");
    if (exp) {
      exp.addEventListener("click", function () {
        global.toast.show(t("crud.exportComingSoon"), "info");
      });
    }
  }

  function softDeleteItems(rows) {
    var ts = now();
    rows.forEach(function (r) {
      global.store.update("product_item", r.id, { deleted_at: ts, updated_at: ts });
    });
    global.realtime.broadcast({ type: "delete", table: "product_item" });
    global.toast.show(t("crud.deleted"), "success");
    closeConfirm();
    render();
  }

  function ensureConfirm() {
    if (confirmOverlay) return;
    confirmOverlay = document.createElement("div");
    confirmOverlay.className = "modal-overlay";
    confirmOverlay.hidden = true;
    confirmOverlay.innerHTML =
      '<div class="modal crud-modal" role="dialog" aria-modal="true">' +
      '<div class="modal__header"><h2 class="modal__title" id="pl-confirm-title"></h2>' +
      '<button type="button" class="modal__close" id="pl-confirm-close" aria-label="Close">' +
      '<img src="../assets/icons/x.svg" alt="" width="18" height="18" /></button></div>' +
      '<div class="modal__content"><p id="pl-confirm-body"></p></div>' +
      '<div class="modal__footer">' +
      '<button type="button" class="btn" id="pl-confirm-cancel" data-i18n="crud.cancel"></button>' +
      '<button type="button" class="btn btn--primary crud-delete" id="pl-confirm-ok" data-i18n="crud.delete"></button>' +
      "</div></div>";
    document.body.appendChild(confirmOverlay);
    confirmOverlay.querySelector("#pl-confirm-cancel").addEventListener("click", closeConfirm);
    confirmOverlay.querySelector("#pl-confirm-close").addEventListener("click", closeConfirm);
    confirmOverlay.addEventListener("click", function (e) {
      if (e.target === confirmOverlay) closeConfirm();
    });
  }

  function openDeleteConfirm(rows) {
    if (!rows.length) return;
    ensureConfirm();
    var title = confirmOverlay.querySelector("#pl-confirm-title");
    var body = confirmOverlay.querySelector("#pl-confirm-body");
    title.textContent = t("crud.delete");
    body.textContent =
      rows.length > 1
        ? t("productList.bulkDeleteConfirm", { count: rows.length })
        : t("productList.deleteConfirm", { name: rows[0]._productName });
    confirmOverlay.hidden = false;
    document.body.classList.add("modal-open");
    if (global.i18n) global.i18n.init();
    confirmOverlay.querySelector("#pl-confirm-ok").onclick = function () {
      softDeleteItems(rows);
    };
  }

  function closeConfirm() {
    if (!confirmOverlay) return;
    confirmOverlay.hidden = true;
    document.body.classList.remove("modal-open");
  }

  function ensureDetailModal() {
    if (detailOverlay) return;
    detailOverlay = document.createElement("div");
    detailOverlay.className = "modal-overlay";
    detailOverlay.hidden = true;
    detailOverlay.innerHTML =
      '<div class="modal crud-modal crud-modal--wide" role="dialog" aria-modal="true">' +
      '<div class="modal__header"><h2 class="modal__title" id="pl-detail-title"></h2>' +
      '<button type="button" class="modal__close" id="pl-detail-close" aria-label="Close">' +
      '<img src="../assets/icons/x.svg" alt="" width="18" height="18" /></button></div>' +
      '<div class="modal__content" id="pl-detail-content"></div>' +
      '<div class="modal__footer" id="pl-detail-footer" hidden></div>' +
      "</div></div>";
    document.body.appendChild(detailOverlay);
    detailOverlay.querySelector("#pl-detail-close").addEventListener("click", closeDetailModal);
    detailOverlay.addEventListener("click", function (e) {
      if (e.target === detailOverlay) closeDetailModal();
    });
  }

  function closeDetailModal() {
    if (!detailOverlay) return;
    detailOverlay.hidden = true;
    document.body.classList.remove("modal-open");
    state.carModalListId = null;
    state.whModalItemId = null;
  }

  function openCarModal() {
    ensureDetailModal();
    var listId = state.carModalListId;
    var cars = carRowsForList(listId);
    var title = detailOverlay.querySelector("#pl-detail-title");
    var content = detailOverlay.querySelector("#pl-detail-content");
    title.setAttribute("data-i18n", "productList.carModalTitle");
    var rows =
      cars.length === 0
        ? "<p>—</p>"
        : '<table class="data-table"><thead><tr>' +
          "<th>" +
          escapeHtml(t("productAttr.carBrand")) +
          "</th><th>" +
          escapeHtml(t("productAttr.carModel")) +
          "</th><th>" +
          escapeHtml(t("productAttr.carLevel.engine")) +
          "</th><th>" +
          escapeHtml(t("productList.colYear")) +
          "</th><th>" +
          escapeHtml(t("productList.colGear")) +
          "</th></tr></thead><tbody>" +
          cars
            .map(function (c) {
              var year =
                c.yearStart != null && c.yearEnd != null
                  ? c.yearStart + "-" + c.yearEnd
                  : c.yearStart != null
                    ? String(c.yearStart)
                    : "—";
              var gear =
                c.gear === "manual" ? t("productList.gearManual") : t("productList.gearAuto");
              return (
                "<tr><td>" +
                escapeHtml(c.brandName) +
                "</td><td>" +
                escapeHtml(c.modelName) +
                "</td><td>" +
                escapeHtml(c.engineName) +
                "</td><td>" +
                escapeHtml(year) +
                "</td><td>" +
                escapeHtml(gear) +
                "</td></tr>"
              );
            })
            .join("") +
          "</tbody></table>";
    content.innerHTML = rows;
    setDetailModalFooter("car");
    detailOverlay.hidden = false;
    document.body.classList.add("modal-open");
    if (global.i18n) global.i18n.init();
  }

  function openWarehouseModal() {
    ensureDetailModal();
    var itemId = state.whModalItemId;
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
    var title = detailOverlay.querySelector("#pl-detail-title");
    var content = detailOverlay.querySelector("#pl-detail-content");
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
    setDetailModalFooter("warehouse");
    detailOverlay.hidden = false;
    document.body.classList.add("modal-open");
    if (global.i18n) global.i18n.init();
  }

  function boot() {
    global.store.init();
    global.i18n.init();
    if (!global.auth.requireAuth("login.html")) return;
    if (!global.permissions.guardPage(PERM_MODULE, PERM_TYPE, "login.html")) return;

    global.layout.mount({
      pageTitle: t("page.productList"),
      contentHtml: '<div id="product-list-root"></div>',
    });
    rootEl = document.getElementById("product-list-root");
    if (!rootEl) return;

    document.addEventListener("i18n:change", render);
    if (global.realtime && global.realtime.onMessage) {
      global.realtime.onMessage(function () {
        render();
      });
    }

    render();

    if (global.devBar) {
      global.devBar.mount({
        toasts: [
          { type: "success", label: "Saved", msgKey: "crud.saved" },
          { type: "error", label: "Forbidden", msgKey: "error.forbidden" },
          { type: "warning", label: "Confirm delete", msgKey: "crud.confirmDelete" },
        ],
        actions: [{ label: "Reset store", fn: function () { global.store.reset(); location.reload(); } }],
      });
    }
  }

  global.productListPage = { boot: boot };
})(window);

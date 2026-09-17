/** Shared product-item browse rows + table cells (product list, order store form). */
(function (global) {
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

  function canResource(module, type, action) {
    return global.permissions && global.permissions.canAction(module, type, action);
  }

  function setDetailModalFooter(kind) {
    if (!detailOverlay) return;
    var footer = detailOverlay.querySelector("#pbl-detail-footer");
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

  function enrichProductItem(item, loc) {
    loc = loc || locale();
    if (!item || item.deleted_at != null) return null;
    var list = global.store.getById("product_list", item.product_list_id);
    if (!list || list.deleted_at != null) return null;
    var totalStock = totalStockForItem(item.id);
    var lowStock = totalStock < (item.minimum_stock || 0);
    var sku = (item.sku && String(item.sku).trim()) || list.sku;
    var brandId = list.product_brand_id;
    var categoryId = list.product_category_id;
    var name =
      itemDisplayName(item.id, loc) ||
      langName("product_list_language", "product_list_id", list.id, loc);
    return {
      id: item.id,
      product_list_id: list.id,
      sku: sku,
      tag: list.tag || "",
      promotion: item.promotion || "",
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
  }

  function listRowsFromStore(loc) {
    loc = loc || locale();
    return global.store
      .getAll("product_item")
      .filter(function (item) {
        return item.deleted_at == null;
      })
      .map(function (item) {
        return enrichProductItem(item, loc);
      })
      .filter(Boolean);
  }

  function filterBrowseRows(rows, criteria) {
    criteria = criteria || {};
    var q = String(criteria.query || "")
      .trim()
      .toLowerCase();
    var categoryId = criteria.categoryId != null ? String(criteria.categoryId) : "";
    var brandId = criteria.brandId != null ? String(criteria.brandId) : "";
    var statusFilter = criteria.statusFilter || "";
    var newFilter = criteria.newFilter || "";
    return rows.filter(function (row) {
      if (categoryId && row._categoryId !== categoryId) return false;
      if (brandId && row._brandId !== brandId) return false;
      if (statusFilter === "active" && !row.is_active) return false;
      if (statusFilter === "inactive" && row.is_active) return false;
      if (newFilter === "new" && !row.is_new) return false;
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

  function sortBrowseRows(rows, sortKey, sortDir) {
    var copy = rows.slice();
    copy.sort(compareCreatedAt);
    if (!sortKey || !sortDir) return copy;
    var dir = sortDir === "desc" ? -1 : 1;
    return copy.sort(function (a, b) {
      var va = a[sortKey];
      var vb = b[sortKey];
      var cmp = 0;
      if (typeof va === "number" && typeof vb === "number") cmp = va - vb;
      else if (typeof va === "boolean") cmp = (va ? 1 : 0) - (vb ? 1 : 0);
      else cmp = String(va || "").localeCompare(String(vb || ""), undefined, { sensitivity: "base" });
      if (cmp !== 0) return cmp * dir;
      return compareCreatedAt(a, b);
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

  function productCellHtml(row) {
    var cars = row._cars || [];
    var first = cars[0];
    var more = cars.length > 1 ? cars.length - 1 : 0;
    var badges =
      (row.is_new
        ? '<span class="product-list__badge product-list__badge--new">' +
          escapeHtml(t("label.productNew")) +
          "</span>"
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

  function packagingCellHtml(row) {
    return (
      escapeHtml(String(row.qty_per_unit)) +
      ' <span class="product-list__unit">' +
      escapeHtml(t(packUnitKey(row.unit))) +
      "</span>"
    );
  }

  function warehouseCellHtml(row) {
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

  function tableTdClass(col, row) {
    var cls = col.cellClass || col.class || "";
    if (col.id === "_totalStock" && row._lowStock) cls += " product-list__stock--low";
    return cls;
  }

  function ensureDetailModal() {
    if (detailOverlay) return;
    detailOverlay = document.createElement("div");
    detailOverlay.className = "modal-overlay";
    detailOverlay.hidden = true;
    detailOverlay.innerHTML =
      '<div class="modal crud-modal crud-modal--wide" role="dialog" aria-modal="true">' +
      '<div class="modal__header"><h2 class="modal__title" id="pbl-detail-title"></h2>' +
      '<button type="button" class="modal__close" id="pbl-detail-close" aria-label="Close">' +
      '<img src="../assets/icons/x.svg" alt="" width="18" height="18" /></button></div>' +
      '<div class="modal__content" id="pbl-detail-content"></div>' +
      '<div class="modal__footer" id="pbl-detail-footer" hidden></div>' +
      "</div></div>";
    document.body.appendChild(detailOverlay);
    detailOverlay.querySelector("#pbl-detail-close").addEventListener("click", closeDetailModal);
    detailOverlay.addEventListener("click", function (e) {
      if (e.target === detailOverlay) closeDetailModal();
    });
  }

  function closeDetailModal() {
    if (!detailOverlay) return;
    detailOverlay.hidden = true;
    document.body.classList.remove("modal-open");
  }

  function openCarModal(listId) {
    ensureDetailModal();
    var cars = carRowsForList(listId);
    var title = detailOverlay.querySelector("#pbl-detail-title");
    var content = detailOverlay.querySelector("#pbl-detail-content");
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

  function openWarehouseModal(itemId) {
    ensureDetailModal();
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
    var title = detailOverlay.querySelector("#pbl-detail-title");
    var content = detailOverlay.querySelector("#pbl-detail-content");
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

  function bindDetailTriggers(root) {
    if (!root) return;
    root.querySelectorAll("[data-car-list]").forEach(function (btn) {
      btn.addEventListener("click", function () {
        openCarModal(Number(btn.getAttribute("data-car-list")));
      });
    });
    root.querySelectorAll("[data-wh-item]").forEach(function (btn) {
      btn.addEventListener("click", function () {
        openWarehouseModal(Number(btn.getAttribute("data-wh-item")));
      });
    });
  }

  global.productBrowseLib = {
    t: t,
    locale: locale,
    escapeHtml: escapeHtml,
    escapeAttr: escapeAttr,
    attrName: attrName,
    itemDisplayName: itemDisplayName,
    enrichProductItem: enrichProductItem,
    listRowsFromStore: listRowsFromStore,
    filterBrowseRows: filterBrowseRows,
    sortBrowseRows: sortBrowseRows,
    compareCreatedAt: compareCreatedAt,
    packUnitKey: packUnitKey,
    formatMoney: formatMoney,
    productCellHtml: productCellHtml,
    packagingCellHtml: packagingCellHtml,
    warehouseCellHtml: warehouseCellHtml,
    tableTdClass: tableTdClass,
    openCarModal: openCarModal,
    openWarehouseModal: openWarehouseModal,
    closeDetailModal: closeDetailModal,
    bindDetailTriggers: bindDetailTriggers,
    carRowsForList: carRowsForList,
  };
})(window);

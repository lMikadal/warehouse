(function (global) {
  var overlayEl = null;
  var pickerPath = [];
  var productItemId = null;
  var onConfirmCb = null;

  function t(key, params) {
    if (!global.i18n) return key;
    return params ? global.i18n.format(key, params) : global.i18n.t(key);
  }

  function whLib() {
    return global.warehouseLib || {};
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

  function nodeLabel(id) {
    var lib = whLib();
    if (lib.langName) return lib.langName(id, locale()) || "—";
    var wh = global.store.getById("warehouse_list", id);
    return wh && wh.sku ? wh.sku : "—";
  }

  function getNode(id) {
    var lib = whLib();
    if (lib.getNode) return lib.getNode(id);
    var row = global.store.getById("warehouse_list", id);
    return row && row.deleted_at == null ? row : null;
  }

  function childrenOf(parentId) {
    var lib = whLib();
    if (lib.childrenOf) return lib.childrenOf(parentId);
    return global.store
      .getAll("warehouse_list")
      .filter(function (r) {
        return r.deleted_at == null && r.parent_id === parentId;
      })
      .sort(function (a, b) {
        return a.sort_order - b.sort_order || a.id - b.id;
      });
  }

  function pathFromBinId(binId) {
    if (binId == null) return [];
    var path = [];
    var n = getNode(Number(binId));
    while (n) {
      path.unshift(n.id);
      n = n.parent_id != null ? getNode(n.parent_id) : null;
    }
    return path;
  }

  function breadcrumbLabel(path) {
    if (!path || !path.length) return "";
    return path
      .map(function (id) {
        return nodeLabel(id);
      })
      .filter(Boolean)
      .join(" > ");
  }

  function placementOnBin(binId) {
    return global.store.getAll("product_item_warehouse").find(function (p) {
      return p.deleted_at == null && p.bin_id === binId;
    });
  }

  function isBinSelectable(binId) {
    var p = placementOnBin(binId);
    if (!p) return true;
    return p.product_item_id === productItemId;
  }

  function hasChildren(id) {
    return childrenOf(id).length > 0;
  }

  function columnCount() {
    if (!pickerPath.length) return 1;
    var last = pickerPath[pickerPath.length - 1];
    var node = getNode(last);
    if (node && node.type === "bin") return pickerPath.length;
    return hasChildren(last) ? pickerPath.length + 1 : pickerPath.length;
  }

  function columnsHtml() {
    var cols = [];
    var numCols = columnCount();
    for (var d = 0; d < numCols; d++) {
      var parentId = d === 0 ? null : pickerPath[d - 1];
      if (d > 0 && pickerPath[d - 1] == null) break;
      var items =
        d === 0
          ? global.store
              .getAll("warehouse_list")
              .filter(function (r) {
                return r.deleted_at == null && r.parent_id == null && r.type === "warehouse";
              })
              .sort(function (a, b) {
                return a.sort_order - b.sort_order || a.id - b.id;
              })
          : childrenOf(parentId);
      if (!items.length && d > 0) break;
      var activeId = pickerPath[d] != null ? pickerPath[d] : null;
      var rows = items
        .map(function (row) {
          var active = activeId === row.id;
          var kids = hasChildren(row.id);
          var disabled = row.type === "bin" && !isBinSelectable(row.id);
          return (
            '<button type="button" class="warehouse-bin-cascade__item' +
            (active ? " warehouse-bin-cascade__item--active" : "") +
            (kids ? " warehouse-bin-cascade__item--has-children" : "") +
            (disabled ? " warehouse-bin-cascade__item--disabled" : "") +
            '" data-id="' +
            row.id +
            '" data-depth="' +
            d +
            '"' +
            (disabled ? " disabled" : "") +
            ">" +
            '<span class="warehouse-bin-cascade__item-label">' +
            escapeHtml(nodeLabel(row.id)) +
            (row.sku && row.type === "bin" ? " (" + escapeHtml(row.sku) + ")" : "") +
            "</span>" +
            (kids
              ? '<img src="../assets/icons/chevron-right.svg" alt="" width="14" height="14" class="warehouse-bin-cascade__chevron" />'
              : "") +
            "</button>"
          );
        })
        .join("");
      cols.push('<div class="warehouse-bin-cascade__col" data-depth="' + d + '">' + rows + "</div>");
    }
    if (!cols.length) {
      cols.push(
        '<div class="warehouse-bin-cascade__col"><p class="warehouse-bin-cascade__empty" data-i18n="productListForm.itemLotBinEmpty"></p></div>'
      );
    }
    return cols.join("");
  }

  function renderModalBody() {
    if (!overlayEl) return;
    var cols = overlayEl.querySelector(".warehouse-bin-cascade__columns");
    var pathEl = overlayEl.querySelector(".warehouse-bin-cascade__footer-path-value");
    if (cols) cols.innerHTML = columnsHtml();
    if (pathEl) pathEl.textContent = breadcrumbLabel(pickerPath) || "—";
    if (global.i18n) global.i18n.init();
    bindColumnEvents();
  }

  function bindColumnEvents() {
    if (!overlayEl) return;
    overlayEl.querySelectorAll(".warehouse-bin-cascade__item:not([disabled])").forEach(function (btn) {
      btn.addEventListener("click", function () {
        var id = Number(btn.getAttribute("data-id"));
        var depth = Number(btn.getAttribute("data-depth"));
        var node = getNode(id);
        if (!node) return;
        if (node.type === "bin" && !isBinSelectable(id)) return;
        pickerPath = pickerPath.slice(0, depth);
        pickerPath[depth] = id;
        if (node.type !== "bin" && hasChildren(id)) {
          pickerPath = pickerPath.slice(0, depth + 1);
        } else {
          pickerPath = pickerPath.slice(0, depth + 1);
        }
        renderModalBody();
      });
    });
  }

  function close() {
    if (!overlayEl) return;
    overlayEl.hidden = true;
    onConfirmCb = null;
    productItemId = null;
  }

  function confirm() {
    if (!pickerPath.length) {
      if (global.toast) global.toast.show(t("error.required"), "error");
      return;
    }
    var id = pickerPath[pickerPath.length - 1];
    var node = getNode(id);
    if (!node || node.type !== "bin") {
      if (global.toast) global.toast.show(t("productListForm.itemLotBinPickBinRequired"), "error");
      return;
    }
    if (!isBinSelectable(id)) {
      if (global.toast) global.toast.show(t("productListForm.itemLotBinTaken"), "error");
      return;
    }
    var label = breadcrumbLabel(pickerPath);
    if (onConfirmCb) onConfirmCb(id, label);
    close();
  }

  function ensureOverlay() {
    if (overlayEl) return;
    overlayEl = document.createElement("div");
    overlayEl.className = "modal-overlay modal-overlay--stack-2";
    overlayEl.hidden = true;
    document.body.appendChild(overlayEl);
  }

  function open(options) {
    options = options || {};
    ensureOverlay();
    onConfirmCb = options.onConfirm || null;
    productItemId = options.productItemId != null ? Number(options.productItemId) : null;
    var startBin =
      options.valueBinId != null && options.valueBinId !== "" ? Number(options.valueBinId) : null;
    pickerPath = startBin ? pathFromBinId(startBin) : [];

    overlayEl.innerHTML =
      '<div class="modal crud-modal crud-modal--wide warehouse-bin-cascade" role="dialog" aria-modal="true">' +
      '<div class="modal__header">' +
      '<h2 class="modal__title" data-i18n="productListForm.itemLotBinDialogTitle"></h2>' +
      '<button type="button" class="modal__close warehouse-bin-cascade__close" aria-label="Close">' +
      '<img src="../assets/icons/x.svg" alt="" width="18" height="18" /></button></div>' +
      '<div class="modal__content warehouse-bin-cascade__body">' +
      '<div class="warehouse-bin-cascade__columns"></div>' +
      '<div class="warehouse-bin-cascade__footer-preview">' +
      '<span class="warehouse-bin-cascade__footer-label" data-i18n="productListForm.itemLotBinCurrentSelection"></span> ' +
      '<span class="warehouse-bin-cascade__footer-path-value"></span></div></div>' +
      '<div class="modal__footer">' +
      '<button type="button" class="btn warehouse-bin-cascade__close" data-i18n="crud.cancel"></button>' +
      '<button type="button" class="btn btn--primary" id="warehouse-bin-cascade-confirm" data-i18n="crud.save"></button>' +
      "</div></div>";

    overlayEl.hidden = false;
    if (global.i18n) global.i18n.init();
    renderModalBody();

    overlayEl.querySelectorAll(".warehouse-bin-cascade__close").forEach(function (btn) {
      btn.addEventListener("click", close);
    });
    overlayEl.addEventListener("click", function (e) {
      if (e.target === overlayEl) close();
    });
    overlayEl.querySelector("#warehouse-bin-cascade-confirm").addEventListener("click", confirm);
  }

  global.warehouseBinCascadePicker = {
    open: open,
    close: close,
    breadcrumbForBin: function (binId) {
      return breadcrumbLabel(pathFromBinId(binId));
    },
    pathFromBinId: pathFromBinId,
  };
})(window);

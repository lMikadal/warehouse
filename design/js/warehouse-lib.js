(function (global) {
  var CONDITION_TYPES = ["shelf", "rack", "bin"];

  function locale() {
    return global.i18n ? global.i18n.getLocale() : "th";
  }

  function t(key, params) {
    if (!global.i18n) return key;
    if (params) return global.i18n.format(key, params);
    return global.i18n.t(key);
  }

  function escapeHtml(s) {
    return String(s)
      .replace(/&/g, "&amp;")
      .replace(/</g, "&lt;")
      .replace(/>/g, "&gt;")
      .replace(/"/g, "&quot;");
  }

  function now() {
    return new Date().toISOString();
  }

  function activeRows(table) {
    return global.store.getAll(table).filter(function (r) {
      return r.deleted_at == null;
    });
  }

  function langName(nodeId, loc) {
    var row = global.store.getAll("warehouse_list_language").find(function (r) {
      return r.warehouse_list_id === nodeId && r.locale === (loc || locale());
    });
    if (row && row.name) return row.name;
    if (loc !== "th") {
      var th = global.store.getAll("warehouse_list_language").find(function (r) {
        return r.warehouse_list_id === nodeId && r.locale === "th";
      });
      if (th && th.name) return th.name;
    }
    var en = global.store.getAll("warehouse_list_language").find(function (r) {
      return r.warehouse_list_id === nodeId && r.locale === "en";
    });
    return en ? en.name : "";
  }

  function upsertLang(nodeId, loc, name) {
    var rows = global.store.getAll("warehouse_list_language");
    var idx = rows.findIndex(function (r) {
      return r.warehouse_list_id === nodeId && r.locale === loc;
    });
    if (idx >= 0) {
      global.store.updateAt("warehouse_list_language", idx, { name: name, updated_at: now() });
    } else {
      global.store.create("warehouse_list_language", {
        warehouse_list_id: nodeId,
        locale: loc,
        name: name,
        created_at: now(),
        updated_at: now(),
      });
    }
  }

  function getNode(id) {
    var row = global.store.getById("warehouse_list", id);
    if (!row || row.deleted_at != null) return null;
    return row;
  }

  function childrenOf(parentId, type) {
    return activeRows("warehouse_list")
      .filter(function (r) {
        if (r.parent_id !== parentId) return false;
        if (type && r.type !== type) return false;
        return true;
      })
      .sort(function (a, b) {
        if (a.sort_order !== b.sort_order) return a.sort_order - b.sort_order;
        return a.id - b.id;
      });
  }

  function descendantIds(rootId) {
    var ids = [];
    function walk(pid) {
      childrenOf(pid).forEach(function (c) {
        ids.push(c.id);
        walk(c.id);
      });
    }
    walk(rootId);
    return ids;
  }

  function warehouseStats(warehouseId) {
    var placements = activeRows("product_item_warehouse").filter(function (p) {
      return p.warehouse_id === warehouseId;
    });
    var skuIds = {};
    placements.forEach(function (p) {
      skuIds[p.product_item_id] = true;
    });
    var remain = 0;
    activeRows("product_item_stock").forEach(function (s) {
      var placement = placements.find(function (p) {
        return p.id === s.product_item_warehouse_id;
      });
      if (placement) remain += Number(s.remain_quantity) || 0;
    });
    return {
      skuCount: Object.keys(skuIds).length,
      remainQty: remain,
      zoneCount: childrenOf(warehouseId, "zone").length,
    };
  }

  function getCondition(zoneId, type) {
    var row = activeRows("warehouse_condition").find(function (c) {
      return c.warehouse_list_id === zoneId && c.type === type;
    });
    return row ? { amount: row.amount, amount_active: row.amount_active } : { amount: 0, amount_active: 0 };
  }

  function upsertCondition(zoneId, type, amount, amountActive) {
    var rows = global.store.getAll("warehouse_condition");
    var idx = rows.findIndex(function (c) {
      return c.warehouse_list_id === zoneId && c.type === type;
    });
    var active = Math.min(amountActive, amount);
    if (idx >= 0) {
      global.store.updateAt("warehouse_condition", idx, { amount: amount, amount_active: active });
    } else {
      global.store.create("warehouse_condition", {
        warehouse_list_id: zoneId,
        type: type,
        amount: amount,
        amount_active: active,
      });
    }
  }

  function ensureZoneConditions(zoneId, amounts) {
    CONDITION_TYPES.forEach(function (type) {
      var a = amounts && amounts[type] ? amounts[type] : { amount: 0, amount_active: 0 };
      upsertCondition(zoneId, type, a.amount, a.amount_active);
    });
  }

  function assignTreePath(id, parentId) {
    if (!parentId) return "n" + id;
    var parent = getNode(parentId);
    if (!parent || !parent.tree_path) return "n" + id;
    return parent.tree_path + ".n" + id;
  }

  function softDeleteSubtree(id) {
    var ts = now();
    global.store.update("warehouse_list", id, { deleted_at: ts, updated_at: ts });
    descendantIds(id).forEach(function (did) {
      global.store.update("warehouse_list", did, { deleted_at: ts, updated_at: ts });
    });
  }

  function formatQty(n) {
    return Number(n || 0).toLocaleString(locale() === "th" ? "th-TH" : "en-US");
  }

  function conditionTypeLabel(type) {
    if (type === "shelf") return t("warehouse.typeShelf");
    if (type === "rack") return t("warehouse.typeRack");
    return t("warehouse.typeBin");
  }

  function conditionTypeIcon(type) {
    if (type === "shelf") return "../assets/icons/layout-dashboard.svg";
    if (type === "rack") return "../assets/icons/box.svg";
    return "../assets/icons/package.svg";
  }

  function statusBadgeHtml(isActive) {
    var cls = isActive ? "wh-badge wh-badge--active" : "wh-badge wh-badge--inactive";
    var label = isActive ? t("col.active") : t("col.inactive");
    return '<span class="' + cls + '">' + escapeHtml(label) + "</span>";
  }

  function statusSwitchHtml(id, isActive, labelKey) {
    labelKey = labelKey || "col.status";
    return (
      '<label class="crud-switch">' +
      '<input type="checkbox" class="crud-status-switch" role="switch" data-id="' +
      escapeHtml(id) +
      '" data-switch-field="is_active"' +
      (isActive ? " checked" : "") +
      ' aria-label="' +
      escapeHtml(t(labelKey)) +
      '" />' +
      '<span class="crud-switch__track" aria-hidden="true"><span class="crud-switch__thumb"></span></span>' +
      "</label>"
    );
  }

  function stepperHtml(value, min, max, dataAttrs) {
    var attrs = dataAttrs || "";
    var decDisabled = value <= min ? " disabled" : "";
    var incDisabled = max != null && value >= max ? " disabled" : "";
    return (
      '<div class="wh-stepper"' +
      attrs +
      ">" +
      '<button type="button" class="wh-stepper__btn wh-stepper__dec"' +
      decDisabled +
      ' aria-label="-">−</button>' +
      '<span class="wh-stepper__value" aria-live="polite">' +
      escapeHtml(value) +
      "</span>" +
      '<button type="button" class="wh-stepper__btn wh-stepper__inc"' +
      incDisabled +
      ' aria-label="+">+</button>' +
      "</div>"
    );
  }

  function can(action) {
    return global.permissions && global.permissions.canAction("warehouse", "warehouse_list", action);
  }

  // ponytail: self-check — fails if ATW demo stats drift
  (function selfCheckWarehouseStats() {
    if (typeof global.store === "undefined" || !global.SEED_WAREHOUSE_LIST) return;
    global.store.init();
    var atw = global.store.getAll("warehouse_list").find(function (r) {
      return r.sku === "ATW001" && r.deleted_at == null;
    });
    if (!atw) return;
    var stats = warehouseStats(atw.id);
    if (stats.remainQty !== 25600 || stats.skuCount !== 4 || stats.zoneCount !== 6) {
      throw new Error(
        "warehouse seed stats self-check failed: remain=" +
          stats.remainQty +
          " sku=" +
          stats.skuCount +
          " zones=" +
          stats.zoneCount
      );
    }
  })();

  global.warehouseLib = {
    CONDITION_TYPES: CONDITION_TYPES,
    locale: locale,
    t: t,
    escapeHtml: escapeHtml,
    now: now,
    langName: langName,
    upsertLang: upsertLang,
    getNode: getNode,
    childrenOf: childrenOf,
    descendantIds: descendantIds,
    warehouseStats: warehouseStats,
    getCondition: getCondition,
    upsertCondition: upsertCondition,
    ensureZoneConditions: ensureZoneConditions,
    assignTreePath: assignTreePath,
    softDeleteSubtree: softDeleteSubtree,
    formatQty: formatQty,
    conditionTypeLabel: conditionTypeLabel,
    conditionTypeIcon: conditionTypeIcon,
    statusBadgeHtml: statusBadgeHtml,
    statusSwitchHtml: statusSwitchHtml,
    stepperHtml: stepperHtml,
    can: can,
  };
})(window);

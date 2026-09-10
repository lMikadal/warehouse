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
      return rootWarehouseId(p.bin_id) === warehouseId;
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

  function allowedChildTypes(parentType) {
    if (parentType === "zone") return ["shelf", "rack", "bin"];
    if (parentType === "shelf") return ["rack", "bin"];
    if (parentType === "rack") return ["bin"];
    return [];
  }

  function validParent(childType, parentNode) {
    if (!childType || !parentNode) return false;
    return allowedChildTypes(parentNode.type).indexOf(childType) >= 0;
  }

  function isDescendant(ancestorId, nodeId) {
    if (ancestorId === nodeId) return true;
    return descendantIds(ancestorId).indexOf(nodeId) >= 0;
  }

  function ancestorZone(nodeId) {
    var n = getNode(nodeId);
    while (n) {
      if (n.type === "zone") return n.id;
      n = n.parent_id ? getNode(n.parent_id) : null;
    }
    return null;
  }

  function resolvePathFromBin(binId) {
    var path = {
      warehouse_id: null,
      zone_id: null,
      shelf_id: null,
      rack_id: null,
      bin_id: binId != null ? binId : null,
    };
    if (binId == null) return path;
    var n = getNode(binId);
    if (!n) return path;
    var chain = [n];
    while (n.parent_id) {
      n = getNode(n.parent_id);
      if (!n) break;
      chain.push(n);
    }
    chain.forEach(function (node) {
      if (node.type === "warehouse") path.warehouse_id = node.id;
      else if (node.type === "zone") path.zone_id = node.id;
      else if (node.type === "shelf") path.shelf_id = node.id;
      else if (node.type === "rack") path.rack_id = node.id;
      else if (node.type === "bin") path.bin_id = node.id;
    });
    return path;
  }

  function rootWarehouseId(binId) {
    return resolvePathFromBin(binId).warehouse_id;
  }

  function countTypeInZoneSubtree(zoneId, type) {
    var total = 0;
    var active = 0;
    function walk(pid) {
      childrenOf(pid).forEach(function (c) {
        if (c.type === type) {
          total++;
          if (c.is_active) active++;
        }
        walk(c.id);
      });
    }
    walk(zoneId);
    return { total: total, active: active };
  }

  function canReparentToZone(node, destZoneId) {
    var srcZone = ancestorZone(node.id);
    if (srcZone === destZoneId) return { ok: true };
    var cond = getCondition(destZoneId, node.type);
    if (!cond || cond.amount <= 0) return { ok: false, reason: "quota_missing" };
    var counts = countTypeInZoneSubtree(destZoneId, node.type);
    if (counts.total + 1 > cond.amount) return { ok: false, reason: "quota_full" };
    if (node.is_active && counts.active + 1 > cond.amount_active) {
      return { ok: false, reason: "quota_active_full" };
    }
    return { ok: true };
  }

  function refreshTreePaths(rootId) {
    function walk(id) {
      var node = getNode(id);
      if (!node) return;
      global.store.update("warehouse_list", id, {
        tree_path: assignTreePath(id, node.parent_id),
        updated_at: now(),
      });
      childrenOf(id).forEach(function (c) {
        walk(c.id);
      });
    }
    walk(rootId);
  }

  function reparentNode(id, newParentId) {
    if (!getNode(id) || !getNode(newParentId)) return false;
    var maxSort = childrenOf(newParentId).reduce(function (m, r) {
      return Math.max(m, r.sort_order);
    }, 0);
    global.store.update("warehouse_list", id, {
      parent_id: newParentId,
      sort_order: maxSort + 100,
      updated_at: now(),
    });
    refreshTreePaths(id);
    return true;
  }

  function reorderSiblings(parentId, draggedId, targetId) {
    var dragged = getNode(draggedId);
    if (!dragged || dragged.parent_id !== parentId) return false;
    var siblings = childrenOf(parentId).filter(function (r) {
      return r.id !== draggedId;
    });
    var targetIdx = siblings.findIndex(function (r) {
      return r.id === targetId;
    });
    if (targetIdx < 0) return false;
    siblings.splice(targetIdx, 0, dragged);
    siblings.forEach(function (r, i) {
      global.store.update("warehouse_list", r.id, { sort_order: (i + 1) * 100, updated_at: now() });
    });
    return true;
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

  // ponytail: self-check — fails if flexible parent rules drift
  (function selfCheckValidParent() {
    var zone = { type: "zone" };
    var shelf = { type: "shelf" };
    if (!validParent("bin", zone) || !validParent("rack", zone)) {
      throw new Error("validParent self-check failed: zone should accept rack/bin");
    }
    if (validParent("shelf", shelf)) {
      throw new Error("validParent self-check failed: shelf should not accept shelf");
    }
    if (allowedChildTypes("zone").length !== 3 || allowedChildTypes("shelf").length !== 2) {
      throw new Error("allowedChildTypes self-check failed");
    }
  })();

  // ponytail: self-check — fails if ATW demo stats drift
  (function selfCheckWarehouseStats() {
    if (typeof global.store === "undefined" || !global.SEED_WAREHOUSE_LIST) return;
    global.store.init();
    var atw = global.store.getAll("warehouse_list").find(function (r) {
      return r.sku === "ATW001" && r.deleted_at == null;
    });
    if (!atw) return;
    var stats = warehouseStats(atw.id);
    if (stats.remainQty !== 33 || stats.skuCount !== 4 || stats.zoneCount !== 6) {
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
    allowedChildTypes: allowedChildTypes,
    validParent: validParent,
    isDescendant: isDescendant,
    ancestorZone: ancestorZone,
    resolvePathFromBin: resolvePathFromBin,
    rootWarehouseId: rootWarehouseId,
    canReparentToZone: canReparentToZone,
    reparentNode: reparentNode,
    reorderSiblings: reorderSiblings,
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

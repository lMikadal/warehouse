(function (global) {
  var wh = global.warehouseLib;
  var PERM_MODULE = "warehouse";
  var PERM_TYPE = "warehouse_list";

  var warehouseId = null;
  var openSections = {};
  var formOverlay = null;
  var confirmOverlay = null;
  var pendingDeleteId = null;
  var formState = { mode: "", parentId: null, childType: null, id: null };

  function t(key, params) {
    return wh.t(key, params);
  }

  function activeRows(table) {
    return global.store.getAll(table).filter(function (r) {
      return r.deleted_at == null;
    });
  }

  function storageUsed(node) {
    if (node.type !== "bin") return 0;
    var used = 0;
    activeRows("product_item_stock").forEach(function (s) {
      var p = activeRows("product_item_warehouse").find(function (x) {
        return x.id === s.product_item_warehouse_id && x.bin_id === node.id;
      });
      if (p) used += Number(s.remain_quantity) || 0;
    });
    return used;
  }

  function childSlotUsed(node) {
    if (node.type === "bin") return storageUsed(node);
    var types = wh.allowedChildTypes(node.type);
    return wh.childrenOf(node.id).filter(function (c) {
      return types.indexOf(c.type) >= 0;
    }).length;
  }

  function typeIcon(type) {
    if (type === "zone") return "../assets/icons/box.svg";
    if (type === "shelf") return "../assets/icons/layout-dashboard.svg";
    if (type === "rack") return "../assets/icons/layout-grid.svg";
    if (type === "bin") return "../assets/icons/package.svg";
    return "../assets/icons/box.svg";
  }

  function countByType(rootId, type) {
    return wh.descendantIds(rootId).filter(function (id) {
      var n = wh.getNode(id);
      return n && n.type === type;
    }).length;
  }

  function countDescendantsOfType(nodeId, type) {
    var count = 0;
    function walk(pid) {
      wh.childrenOf(pid).forEach(function (c) {
        if (c.type === type) count++;
        walk(c.id);
      });
    }
    walk(nodeId);
    return count;
  }

  function ancestorZone(nodeId) {
    var n = wh.getNode(nodeId);
    while (n) {
      if (n.type === "zone") return n.id;
      n = n.parent_id ? wh.getNode(n.parent_id) : null;
    }
    return null;
  }

  function warehouseViewStats(id) {
    var zones = wh.childrenOf(id, "zone").length;
    var shelves = countByType(id, "shelf");
    var racks = countByType(id, "rack");
    var bins = countByType(id, "bin");
    var usedTotal = 0;
    var capTotal = 0;
    wh.descendantIds(id).forEach(function (did) {
      var n = wh.getNode(did);
      if (n && n.type === "bin") {
        usedTotal += storageUsed(n);
        capTotal += Number(n.capacity) || 0;
      }
    });
    var capacityPct = capTotal > 0 ? Math.min(100, Math.round((usedTotal / capTotal) * 100)) : 0;
    return { zones: zones, shelves: shelves, racks: racks, bins: bins, capacityPct: capacityPct };
  }

  function nodeCapacity(node) {
    var total = Number(node.capacity) || 0;
    var used = childSlotUsed(node);
    var pct = total > 0 ? Math.round((used / total) * 100) : used > 0 ? 100 : 0;
    return { used: used, total: total, pct: Math.min(100, pct) };
  }

  function capacityModifier(pct) {
    if (pct <= 0) return "wh-view-capacity--empty";
    if (pct >= 100) return "wh-view-capacity--high";
    if (pct >= 80) return "wh-view-capacity--mid";
    return "wh-view-capacity--low";
  }

  function childCountSummary(node) {
    var parts = [];
    ["shelf", "rack", "bin"].forEach(function (type) {
      var count = countDescendantsOfType(node.id, type);
      if (count > 0) parts.push({ type: type, count: count });
    });
    return parts;
  }

  function storageChildren(nodeId) {
    return wh.childrenOf(nodeId).filter(function (c) {
      return c.type === "shelf" || c.type === "rack" || c.type === "bin";
    });
  }

  function statCard(icon, iconMod, label, value, unit, subtitle) {
    return (
      '<div class="wh-view-stat">' +
      '<div class="wh-view-stat__icon wh-view-stat__icon--' +
      iconMod +
      '">' +
      '<img src="' +
      icon +
      '" alt="" width="20" height="20" />' +
      "</div>" +
      '<div class="wh-view-stat__body">' +
      '<span class="wh-view-stat__label">' +
      wh.escapeHtml(label) +
      "</span>" +
      '<div class="wh-view-stat__line">' +
      '<span class="wh-view-stat__value">' +
      wh.escapeHtml(String(value)) +
      "</span>" +
      (unit ? '<span class="wh-view-stat__unit">' + wh.escapeHtml(unit) + "</span>" : "") +
      "</div>" +
      (subtitle ? '<span class="wh-view-stat__sub">' + wh.escapeHtml(subtitle) + "</span>" : "") +
      "</div></div>"
    );
  }

  function countChipsHtml(parts) {
    if (!parts.length) return "";
    return (
      '<div class="wh-view-row__counts">' +
      parts
        .map(function (p) {
          return (
            '<span class="wh-view-row__count">' +
            '<img src="' +
            typeIcon(p.type) +
            '" alt="" width="14" height="14" />' +
            wh.formatQty(p.count) +
            " " +
            wh.escapeHtml(wh.conditionTypeLabel(p.type)) +
            "</span>"
          );
        })
        .join("") +
      "</div>"
    );
  }

  function capacityBlockHtml(cap) {
    var mod = capacityModifier(cap.pct);
    return (
      '<div class="wh-view-capacity ' +
      mod +
      '">' +
      '<span class="wh-view-capacity__pct">' +
      cap.pct +
      "%</span>" +
      '<div class="wh-view-capacity__track"><div class="wh-view-capacity__fill" style="width:' +
      Math.min(100, cap.pct) +
      '%"></div></div>' +
      '<span class="wh-view-capacity__label">' +
      wh.escapeHtml(t("warehouse.capacityShort", { used: cap.used, total: cap.total })) +
      "</span></div>"
    );
  }

  function dragHandleHtml(node) {
    if (node.type === "zone" || !wh.can("update")) return "";
    return (
      '<button type="button" class="btn btn--icon wh-view-drag-handle" draggable="true" data-id="' +
      node.id +
      '" aria-label="' +
      wh.escapeHtml(t("warehouse.moveDrag")) +
      '"><img src="../assets/icons/grip-vertical.svg" alt="" width="16" height="16" /></button>'
    );
  }

  function rowActions(node, showAdd) {
    var html = '<div class="wh-view-actions">' + dragHandleHtml(node);
    if (showAdd && wh.can("create")) {
      html +=
        '<button type="button" class="btn btn--icon crud-add wh-node-add" data-id="' +
        node.id +
        '" aria-label="' +
        wh.escapeHtml(t("warehouse.addChild")) +
        '"><img src="../assets/icons/plus.svg" alt="" width="16" height="16" /></button>';
    }
    if (wh.can("update")) {
      html +=
        '<button type="button" class="btn btn--icon wh-node-edit" data-id="' +
        node.id +
        '" aria-label="' +
        wh.escapeHtml(t("crud.edit")) +
        '"><img src="../assets/icons/pencil.svg" alt="" width="16" height="16" /></button>';
    }
    if (wh.can("delete")) {
      html +=
        '<button type="button" class="btn btn--icon crud-delete wh-node-delete" data-id="' +
        node.id +
        '" aria-label="' +
        wh.escapeHtml(t("crud.delete")) +
        '"><img src="../assets/icons/trash-2.svg" alt="" width="16" height="16" /></button>';
    }
    html += "</div>";
    return html;
  }

  function renderTreeRow(node, depth) {
    var name = wh.langName(node.id);
    var children =
      node.type === "bin"
        ? []
        : node.type === "zone"
          ? storageChildren(node.id)
          : storageChildren(node.id);
    var hasChildren = children.length > 0;
    var open = !!openSections[node.id];
    var cap = nodeCapacity(node);
    var counts = childCountSummary(node);
    var showAdd = node.type !== "bin";
    var typeMod = node.type === "zone" ? "zone" : node.type;

    var toggleHtml = hasChildren
      ? '<button type="button" class="wh-view-row__toggle' +
        (open ? " is-open" : "") +
        '" data-id="' +
        node.id +
        '" aria-expanded="' +
        (open ? "true" : "false") +
        '" aria-label="' +
        wh.escapeHtml(t("warehouse.details")) +
        '"><img src="../assets/icons/chevron-down.svg" alt="" width="16" height="16" /></button>'
      : '<span class="wh-view-row__toggle wh-view-row__toggle--spacer" aria-hidden="true"></span>';

    var itemOpen =
      '<div class="wh-view-tree-item" data-id="' +
      node.id +
      '" data-type="' +
      node.type +
      '" data-parent-id="' +
      (node.parent_id != null ? node.parent_id : "") +
      '">' +
      '<div class="wh-view-row wh-view-row--' +
      typeMod +
      '" data-id="' +
      node.id +
      '" data-type="' +
      node.type +
      '" data-parent-id="' +
      (node.parent_id != null ? node.parent_id : "") +
      '" data-depth="' +
      depth +
      '">' +
      toggleHtml +
      '<div class="wh-view-row__icon wh-view-row__icon--' +
      typeMod +
      '">' +
      '<img src="' +
      typeIcon(node.type) +
      '" alt="" width="18" height="18" /></div>' +
      '<div class="wh-view-row__info">' +
      '<div class="wh-view-row__title">' +
      "<span class=\"wh-view-row__name\">" +
      wh.escapeHtml(name) +
      "</span>" +
      '<span class="wh-badge wh-badge--active wh-view-row__sku">' +
      wh.escapeHtml(node.sku) +
      "</span></div>" +
      countChipsHtml(counts) +
      "</div>" +
      capacityBlockHtml(cap) +
      rowActions(node, showAdd) +
      "</div>";

    if (!hasChildren || !open) return itemOpen + "</div>";

    return (
      itemOpen +
      '<div class="wh-view-tree__children" data-parent-id="' +
      node.id +
      '">' +
      children
        .map(function (c) {
          return renderTreeRow(c, depth + 1);
        })
        .join("") +
      "</div></div>"
    );
  }

  function onTreeDrop(draggedId, targetId) {
    if (!wh.can("update")) return;
    var dragged = wh.getNode(draggedId);
    var target = wh.getNode(targetId);
    if (!dragged || !target || draggedId === targetId) return;
    if (wh.isDescendant(draggedId, targetId)) {
      global.toast.show(t("warehouse.moveInvalidParent"), "error");
      return;
    }
    var canNest = wh.validParent(dragged.type, target) && dragged.parent_id !== target.id;
    if (canNest) {
      var destZone = target.type === "zone" ? target.id : wh.ancestorZone(target.id);
      var check = wh.canReparentToZone(dragged, destZone);
      if (!check.ok) {
        global.toast.show(t("warehouse.moveQuotaFull"), "error");
        return;
      }
      wh.reparentNode(draggedId, targetId);
      openSections[targetId] = true;
      global.toast.show(t("warehouse.moveSuccess"), "success");
      render();
      return;
    }
    if (dragged.parent_id === target.parent_id && dragged.parent_id != null) {
      wh.reorderSiblings(dragged.parent_id, draggedId, targetId);
      global.toast.show(t("crud.reordered"), "success");
      render();
      return;
    }
    global.toast.show(t("warehouse.moveInvalidParent"), "error");
  }

  function bindTreeDrag(root) {
    if (!wh.can("update")) return;
    var draggedId = null;

    function clearDragState() {
      root.querySelectorAll(".is-drag-over, .is-drop-target, .is-dragging").forEach(function (el) {
        el.classList.remove("is-drag-over", "is-drop-target", "is-dragging");
      });
    }

    root.querySelectorAll(".wh-view-drag-handle").forEach(function (handle) {
      handle.addEventListener("dragstart", function (e) {
        draggedId = Number(handle.getAttribute("data-id"));
        e.dataTransfer.effectAllowed = "move";
        e.dataTransfer.setData("text/plain", String(draggedId));
        var item = handle.closest(".wh-view-tree-item");
        if (item) item.classList.add("is-dragging");
      });
      handle.addEventListener("dragend", function () {
        clearDragState();
        draggedId = null;
      });
    });

    root.querySelectorAll(".wh-view-row").forEach(function (row) {
      row.addEventListener("dragover", function (e) {
        e.preventDefault();
        if (draggedId == null) return;
        var targetId = Number(row.getAttribute("data-id"));
        var dragged = wh.getNode(draggedId);
        var target = wh.getNode(targetId);
        if (!dragged || !target || draggedId === targetId) return;
        if (wh.isDescendant(draggedId, targetId)) return;

        root.querySelectorAll(".wh-view-row.is-drag-over, .wh-view-row.is-drop-target").forEach(function (el) {
          el.classList.remove("is-drag-over", "is-drop-target");
        });

        if (wh.validParent(dragged.type, target) && dragged.parent_id !== target.id) {
          row.classList.add("is-drop-target");
        } else if (dragged.parent_id === target.parent_id && dragged.parent_id != null) {
          row.classList.add("is-drag-over");
        }
      });

      row.addEventListener("dragleave", function () {
        row.classList.remove("is-drag-over", "is-drop-target");
      });

      row.addEventListener("drop", function (e) {
        e.preventDefault();
        e.stopPropagation();
        var targetId = Number(row.getAttribute("data-id"));
        if (draggedId != null) onTreeDrop(draggedId, targetId);
        clearDragState();
        draggedId = null;
      });
    });
  }

  function renderStats(stats) {
    return (
      '<div class="wh-view-stats">' +
      statCard(typeIcon("zone"), "zone", t("warehouse.statTotalZones"), stats.zones, t("warehouse.zonesUnit")) +
      statCard(
        typeIcon("shelf"),
        "shelf",
        t("warehouse.statTotalShelves"),
        stats.shelves,
        wh.conditionTypeLabel("shelf")
      ) +
      statCard(typeIcon("rack"), "rack", t("warehouse.statTotalRacks"), stats.racks, wh.conditionTypeLabel("rack")) +
      statCard(typeIcon("bin"), "bin", t("warehouse.statTotalBins"), stats.bins, wh.conditionTypeLabel("bin")) +
      statCard(
        "../assets/icons/chart-pie.svg",
        "capacity",
        t("warehouse.statCapacityUsed"),
        stats.capacityPct + "%",
        "",
        t("warehouse.statCapacityOfTotal")
      ) +
      "</div>"
    );
  }

  function render() {
    var root = document.getElementById("wh-view-root");
    if (!root) return;
    var whRow = wh.getNode(warehouseId);
    if (!whRow) {
      root.innerHTML = '<p class="text-muted">' + wh.escapeHtml(t("error.notFound")) + "</p>";
      return;
    }
    var name = wh.langName(warehouseId);
    var stats = warehouseViewStats(warehouseId);
    var zones = wh.childrenOf(warehouseId, "zone");
    var treeBody = zones.length
      ? zones.map(function (zone) { return renderTreeRow(zone, 0); }).join("")
      : '<p class="wh-view-empty">' + wh.escapeHtml(t("warehouse.noZones")) + "</p>";

    root.innerHTML =
      '<div class="wh-view-page">' +
      '<header class="wh-view-header">' +
      '<div class="wh-view-header__main">' +
      "<h1 class=\"wh-view-header__name\">" +
      wh.escapeHtml(name) +
      "</h1>" +
      '<span class="wh-badge wh-badge--active">' +
      wh.escapeHtml(whRow.sku) +
      "</span></div>" +
      '<a class="btn wh-view-header__back" href="' +
      wh.escapeHtml(global.nav.resolve("pages/warehouse-list.html")) +
      '">' +
      wh.escapeHtml(t("crud.back")) +
      "</a></header>" +
      renderStats(stats) +
      '<div class="wh-view-tree">' +
      treeBody +
      "</div></div>";

    bindEvents(root);
    bindTreeDrag(root);
  }

  function bindEvents(root) {
    root.querySelectorAll(".wh-view-row__toggle:not(.wh-view-row__toggle--spacer)").forEach(function (btn) {
      btn.addEventListener("click", function (e) {
        e.preventDefault();
        e.stopPropagation();
        var id = Number(btn.getAttribute("data-id"));
        openSections[id] = !openSections[id];
        render();
      });
    });
    root.querySelectorAll(".wh-node-edit").forEach(function (btn) {
      btn.addEventListener("click", function (e) {
        e.preventDefault();
        e.stopPropagation();
        openNodeForm(Number(btn.getAttribute("data-id")));
      });
    });
    root.querySelectorAll(".wh-node-add").forEach(function (btn) {
      btn.addEventListener("click", function (e) {
        e.preventDefault();
        e.stopPropagation();
        openAddChild(Number(btn.getAttribute("data-id")));
      });
    });
    root.querySelectorAll(".wh-node-delete").forEach(function (btn) {
      btn.addEventListener("click", function (e) {
        e.preventDefault();
        e.stopPropagation();
        openDeleteConfirm(Number(btn.getAttribute("data-id")));
      });
    });

  }

  function childTypeFieldHtml(types, selected) {
    if (!types || types.length <= 1) return "";
    var opts = types
      .map(function (type) {
        return (
          '<option value="' +
          type +
          '"' +
          (type === selected ? " selected" : "") +
          ">" +
          wh.escapeHtml(wh.conditionTypeLabel(type)) +
          "</option>"
        );
      })
      .join("");
    return (
      '<div class="form-field"><label for="wh-vf-child_type">' +
      wh.escapeHtml(t("warehouse.childType")) +
      ' <span class="form-field__required" aria-hidden="true">*</span></label>' +
      '<select id="wh-vf-child_type" name="child_type" class="form-input" required>' +
      opts +
      "</select></div>"
    );
  }

  function openAddChild(parentId) {
    var parent = wh.getNode(parentId);
    if (!parent) return;
    var types = wh.allowedChildTypes(parent.type);
    if (!types.length) return;
    openNodeForm(null, parentId, types[0], types.length > 1 ? types : null);
  }

  function ensureFormModal() {
    if (formOverlay) return;
    formOverlay = document.createElement("div");
    formOverlay.className = "modal-overlay";
    formOverlay.hidden = true;
    formOverlay.innerHTML =
      '<div class="modal crud-modal" role="dialog" aria-modal="true">' +
      '<div class="modal__header"><h2 class="modal__title" id="wh-view-form-title"></h2>' +
      '<button type="button" class="modal__close" id="wh-view-form-close"><img src="../assets/icons/x.svg" alt="" width="18" height="18" /></button></div>' +
      '<div class="modal__content"><form id="wh-view-form" class="crud-form" novalidate></form></div>' +
      '<div class="modal__footer">' +
      '<button type="button" class="btn" id="wh-view-form-cancel" data-i18n="crud.cancel"></button>' +
      '<button type="submit" form="wh-view-form" class="btn btn--primary" data-i18n="crud.save"></button>' +
      "</div></div>";
    document.body.appendChild(formOverlay);
    formOverlay.querySelector("#wh-view-form-close").addEventListener("click", closeForm);
    formOverlay.querySelector("#wh-view-form-cancel").addEventListener("click", closeForm);
    formOverlay.addEventListener("click", function (e) {
      if (e.target === formOverlay) closeForm();
    });
    formOverlay.querySelector("#wh-view-form").addEventListener("submit", onFormSubmit);
  }

  function fieldHtml(key, labelKey, type, value, required) {
    var ph =
      global.i18n && global.i18n.fieldPlaceholder
        ? wh.escapeHtml(global.i18n.fieldPlaceholder("input", labelKey))
        : "";
    return (
      '<div class="form-field"><label for="wh-vf-' +
      key +
      '">' +
      wh.escapeHtml(t(labelKey)) +
      (required ? ' <span class="form-field__required" aria-hidden="true">*</span>' : "") +
      "</label>" +
      '<input id="wh-vf-' +
      key +
      '" name="' +
      key +
      '" type="' +
      (type || "text") +
      '" class="form-input" value="' +
      wh.escapeHtml(value != null ? value : "") +
      '" placeholder="' +
      ph +
      '" data-i18n-placeholder-input="' +
      wh.escapeHtml(labelKey) +
      '"' +
      (required ? " required" : "") +
      " /></div>"
    );
  }

  function nameRowHtml(nameTh, nameEn) {
    return (
      '<div class="crud-form__row">' +
      fieldHtml("name_th", "col.nameTh", "text", nameTh, true) +
      fieldHtml("name_en", "col.nameEn", "text", nameEn, true) +
      "</div>"
    );
  }

  function switchFieldHtml(checked) {
    return (
      '<div class="form-field form-field--switch">' +
      '<label for="wh-view-f-is_active">' +
      wh.escapeHtml(t("col.active")) +
      "</label>" +
      '<label class="crud-switch">' +
      '<input type="checkbox" role="switch" name="is_active" id="wh-view-f-is_active"' +
      (checked !== false ? " checked" : "") +
      " />" +
      '<span class="crud-switch__track" aria-hidden="true"><span class="crud-switch__thumb"></span></span>' +
      "</label></div>"
    );
  }

  function openNodeForm(id, parentId, childType, allowedTypes) {
    ensureFormModal();
    var row = id ? wh.getNode(id) : null;
    var types = allowedTypes || (childType ? [childType] : null);
    formState = {
      mode: id ? "edit" : "create",
      id: id,
      parentId: parentId || (row ? row.parent_id : null),
      childType: childType || (row ? row.type : null),
      allowedTypes: types,
    };
    document.getElementById("wh-view-form-title").textContent = id
      ? t("warehouse.editNode")
      : types && types.length > 1
        ? t("warehouse.addChild")
        : t("warehouse.addChild") + " (" + wh.conditionTypeLabel(formState.childType) + ")";
    document.getElementById("wh-view-form").innerHTML =
      childTypeFieldHtml(types, formState.childType) +
      nameRowHtml(id ? wh.langName(id, "th") : "", id ? wh.langName(id, "en") : "") +
      fieldHtml("sku", "col.sku", "text", row ? row.sku : "", true) +
      fieldHtml("capacity", "warehouse.capacity", "number", row ? row.capacity : 0, false) +
      switchFieldHtml(row ? row.is_active : true);
    if (global.i18n) global.i18n.init();
    formOverlay.hidden = false;
    document.body.classList.add("modal-open");
  }

  function closeForm() {
    if (formOverlay) formOverlay.hidden = true;
    document.body.classList.remove("modal-open");
  }

  function ensureConfirmModal() {
    if (confirmOverlay) return;
    confirmOverlay = document.createElement("div");
    confirmOverlay.className = "modal-overlay";
    confirmOverlay.hidden = true;
    confirmOverlay.innerHTML =
      '<div class="modal" role="dialog" aria-modal="true">' +
      '<div class="modal__header"><h2 class="modal__title" data-i18n="crud.delete"></h2></div>' +
      '<div class="modal__content"><p class="modal__body" data-i18n="crud.confirmDelete"></p></div>' +
      '<div class="modal__footer">' +
      '<button type="button" class="btn" id="wh-view-confirm-cancel" data-i18n="crud.cancel"></button>' +
      '<button type="button" class="btn btn--primary" id="wh-view-confirm-ok" data-i18n="crud.delete"></button>' +
      "</div></div>";
    document.body.appendChild(confirmOverlay);
    confirmOverlay.querySelector("#wh-view-confirm-cancel").addEventListener("click", closeConfirm);
    confirmOverlay.querySelector("#wh-view-confirm-ok").addEventListener("click", onConfirmDelete);
  }

  function openDeleteConfirm(id) {
    ensureConfirmModal();
    pendingDeleteId = id;
    if (global.i18n) global.i18n.init();
    confirmOverlay.hidden = false;
    document.body.classList.add("modal-open");
  }

  function closeConfirm() {
    pendingDeleteId = null;
    if (confirmOverlay) confirmOverlay.hidden = true;
    document.body.classList.remove("modal-open");
  }

  function onConfirmDelete() {
    if (!pendingDeleteId || !wh.can("delete")) return;
    wh.softDeleteSubtree(pendingDeleteId);
    global.toast.show(t("crud.deleted"), "success");
    closeConfirm();
    render();
  }

  function onFormSubmit(e) {
    e.preventDefault();
    var fd = new FormData(e.target);
    var nameTh = String(fd.get("name_th") || "").trim();
    var nameEn = String(fd.get("name_en") || "").trim();
    var sku = String(fd.get("sku") || "").trim();
    var capacity = Number(fd.get("capacity")) || 0;
    var isActive = fd.get("is_active") === "on";
    if (!nameTh || !nameEn || !sku) {
      global.toast.show(t("error.required"), "error");
      return;
    }

    if (formState.mode === "create") {
      if (!wh.can("create")) return;
      if (formState.allowedTypes && formState.allowedTypes.length > 1) {
        var pickedType = String(fd.get("child_type") || "").trim();
        if (!pickedType || formState.allowedTypes.indexOf(pickedType) < 0) {
          global.toast.show(t("error.required"), "error");
          return;
        }
        formState.childType = pickedType;
      }
      var siblings = wh.childrenOf(formState.parentId);
      var sort =
        siblings.reduce(function (m, r) {
          return Math.max(m, r.sort_order);
        }, 0) + 100;
      var created = global.store.create("warehouse_list", {
        type: formState.childType,
        sku: sku,
        parent_id: formState.parentId,
        sort_order: sort,
        capacity: capacity,
        is_active: isActive,
        tree_path: "",
        created_at: wh.now(),
        updated_at: wh.now(),
        deleted_at: null,
        created_by: 1,
        updated_by: 1,
      });
      global.store.update("warehouse_list", created.id, {
        tree_path: wh.assignTreePath(created.id, formState.parentId),
      });
      wh.upsertLang(created.id, "th", nameTh);
      wh.upsertLang(created.id, "en", nameEn);
      openSections[formState.parentId] = true;
      global.toast.show(t("crud.created"), "success");
    } else if (formState.id) {
      if (!wh.can("update")) return;
      global.store.update("warehouse_list", formState.id, {
        sku: sku,
        capacity: capacity,
        is_active: isActive,
        updated_at: wh.now(),
      });
      wh.upsertLang(formState.id, "th", nameTh);
      wh.upsertLang(formState.id, "en", nameEn);
      global.toast.show(t("crud.updated"), "success");
    }
    closeForm();
    render();
  }

  function boot() {
    global.store.init();
    global.i18n.init();
    if (!global.auth.requireAuth("login.html")) return;
    if (!global.permissions.guardPage(PERM_MODULE, PERM_TYPE, "login.html")) return;

    var m = window.location.search.match(/[?&]id=(\d+)/);
    warehouseId = m ? Number(m[1]) : null;
    if (!warehouseId || !wh.getNode(warehouseId) || wh.getNode(warehouseId).type !== "warehouse") {
      global.toast.show(t("error.notFound"), "error");
      window.location.replace(global.nav.resolve("pages/warehouse-list.html"));
      return;
    }

    global.layout.mount({
      pageTitle: wh.langName(warehouseId),
      contentHtml: '<div id="wh-view-root"></div>',
    });

    render();
    document.addEventListener("store:change", render);
    document.addEventListener("i18n:change", render);
  }

  global.warehouseListViewPage = { boot: boot };
})(window);

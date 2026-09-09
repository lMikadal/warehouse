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

  function childSummary(node) {
    var parts = [];
    ["shelf", "rack", "bin"].forEach(function (type) {
      var count = wh.childrenOf(node.id, type).length;
      if (count > 0) parts.push(count + " " + wh.conditionTypeLabel(type));
    });
    return parts.length ? parts.join(", ") : t("warehouse.noChildItems");
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

  function activeRows(table) {
    return global.store.getAll(table).filter(function (r) {
      return r.deleted_at == null;
    });
  }

  function renderNodeRow(node, depth) {
    var name = wh.langName(node.id);
    var indent = depth > 0 ? ' style="padding-left:' + depth * 1.25 + 'rem"' : "";
    var isBin = node.type === "bin";
    var open = !!openSections[node.id];
    var children = wh.childrenOf(node.id).filter(function (c) {
      return c.type === "shelf" || c.type === "rack" || c.type === "bin";
    });

    if (isBin) {
      var used = storageUsed(node);
      return (
        '<div class="wh-mgmt-row"' +
        indent +
        ">" +
        '<div class="wh-mgmt-row__main">' +
        '<img src="' +
        wh.conditionTypeIcon(node.type) +
        '" alt="" width="18" height="18" />' +
        "<strong>" +
        wh.escapeHtml(name) +
        "</strong>" +
        '<span class="wh-mgmt-sku">' +
        wh.escapeHtml(node.sku) +
        "</span>" +
        wh.statusBadgeHtml(node.is_active) +
        "</div>" +
        '<div class="wh-mgmt-row__meta">' +
        "<span>" +
        wh.escapeHtml(t("warehouse.capacityLabel", { used: used, total: node.capacity })) +
        "</span>" +
        rowActions(node, false) +
        "</div></div>"
      );
    }

    var body = children.length
      ? children
          .map(function (c) {
            return renderNodeRow(c, depth + 1);
          })
          .join("")
      : '<p class="wh-mgmt-empty">' + wh.escapeHtml(t("warehouse.noChildItems")) + "</p>";

    return (
      '<details class="wh-mgmt-acc"' +
      (open ? " open" : "") +
      ' data-id="' +
      node.id +
      '">' +
      "<summary>" +
      '<div class="wh-mgmt-acc__head">' +
      '<img src="' +
      wh.conditionTypeIcon(node.type) +
      '" alt="" width="18" height="18" />' +
      "<strong>" +
      wh.escapeHtml(name) +
      "</strong>" +
      '<span class="wh-mgmt-sku">' +
      wh.escapeHtml(node.sku) +
      "</span>" +
      wh.statusBadgeHtml(node.is_active) +
      '<span class="wh-mgmt-summary">' +
      wh.escapeHtml(childSummary(node)) +
      "</span></div>" +
      rowActions(node, true) +
      "</summary>" +
      '<div class="wh-mgmt-acc__body">' +
      body +
      "</div></details>"
    );
  }

  function rowActions(node, showAdd) {
    var html = '<div class="wh-mgmt-actions">';
    if (wh.can("update")) {
      html +=
        '<button type="button" class="btn btn--icon wh-node-edit" data-id="' +
        node.id +
        '" aria-label="' +
        wh.escapeHtml(t("crud.edit")) +
        '"><img src="../assets/icons/pencil.svg" alt="" width="16" height="16" /></button>';
      html +=
        '<button type="button" class="btn btn--icon wh-node-move" data-id="' +
        node.id +
        '" aria-label="' +
        wh.escapeHtml(t("warehouse.move")) +
        '"><img src="../assets/icons/arrow-up-down.svg" alt="" width="16" height="16" /></button>';
    }
    if (showAdd && wh.can("create")) {
      html +=
        '<button type="button" class="btn btn--icon crud-add wh-node-add" data-id="' +
        node.id +
        '" aria-label="' +
        wh.escapeHtml(t("warehouse.addChild")) +
        '"><img src="../assets/icons/plus.svg" alt="" width="16" height="16" /></button>';
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

  function render() {
    var root = document.getElementById("wh-view-root");
    if (!root) return;
    var whRow = wh.getNode(warehouseId);
    if (!whRow) {
      root.innerHTML = '<p class="text-muted">' + wh.escapeHtml(t("error.notFound")) + "</p>";
      return;
    }
    var name = wh.langName(warehouseId);
    var zones = wh.childrenOf(warehouseId, "zone");
    var zoneHtml = zones.length
      ? zones
          .map(function (zone) {
            var storage = wh.childrenOf(zone.id).filter(function (c) {
              return c.type === "shelf" || c.type === "rack" || c.type === "bin";
            });
            return (
              '<section class="wh-mgmt-zone">' +
              '<header class="wh-mgmt-zone__head">' +
              "<div><h2>" +
              wh.escapeHtml(wh.langName(zone.id)) +
              "</h2>" +
              wh.statusBadgeHtml(zone.is_active) +
              "</div>" +
              rowActions(zone, true) +
              "</header>" +
              '<div class="wh-mgmt-zone__body">' +
              (storage.length
                ? storage.map(function (n) { return renderNodeRow(n, 0); }).join("")
                : '<p class="wh-mgmt-empty">' + wh.escapeHtml(t("warehouse.noChildItems")) + "</p>") +
              "</div></section>"
            );
          })
          .join("")
      : '<p class="wh-mgmt-empty">' + wh.escapeHtml(t("warehouse.noZones")) + "</p>";

    root.innerHTML =
      '<div class="wh-mgmt-page">' +
      '<div class="crud-page-header">' +
      '<div class="crud-page-header__text">' +
      "<h1>" +
      wh.escapeHtml(name) +
      "</h1>" +
      '<p class="crud-page-header__desc">' +
      wh.escapeHtml(whRow.sku) +
      "</p></div>" +
      '<div class="crud-page-header__actions">' +
      '<a class="btn" href="' +
      wh.escapeHtml(global.nav.resolve("pages/warehouse-list.html")) +
      '">' +
      wh.escapeHtml(t("crud.back")) +
      "</a></div></div>" +
      zoneHtml +
      "</div>";

    bindEvents(root);
  }

  function bindEvents(root) {
    root.querySelectorAll(".wh-mgmt-acc").forEach(function (el) {
      el.addEventListener("toggle", function () {
        openSections[Number(el.getAttribute("data-id"))] = el.open;
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
    root.querySelectorAll(".wh-node-move").forEach(function (btn) {
      btn.addEventListener("click", function (e) {
        e.preventDefault();
        e.stopPropagation();
        global.toast.show(t("warehouse.moveComingSoon"), "warning");
      });
    });
  }

  function nextChildType(parent) {
    if (parent.type === "zone") return "shelf";
    if (parent.type === "shelf") return "rack";
    if (parent.type === "rack") return "bin";
    return null;
  }

  function openAddChild(parentId) {
    var parent = wh.getNode(parentId);
    if (!parent) return;
    var childType = nextChildType(parent);
    if (!childType) return;
    openNodeForm(null, parentId, childType);
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

  function openNodeForm(id, parentId, childType) {
    ensureFormModal();
    var row = id ? wh.getNode(id) : null;
    formState = {
      mode: id ? "edit" : "create",
      id: id,
      parentId: parentId || (row ? row.parent_id : null),
      childType: childType || (row ? row.type : null),
    };
    document.getElementById("wh-view-form-title").textContent = id
      ? t("warehouse.editNode")
      : t("warehouse.addChild") + " (" + wh.conditionTypeLabel(formState.childType) + ")";
    document.getElementById("wh-view-form").innerHTML =
      nameRowHtml(id ? wh.langName(id, "th") : "", id ? wh.langName(id, "en") : "") +
      fieldHtml("sku", "col.sku", "text", row ? row.sku : "", true) +
      fieldHtml("capacity", "warehouse.capacity", "number", row ? row.capacity : 0, false) +
      '<label class="form-checkbox"><input type="checkbox" name="is_active"' +
      (row ? (row.is_active ? " checked" : "") : " checked") +
      " /> " +
      wh.escapeHtml(t("col.active")) +
      "</label>";
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
      var siblings = wh.childrenOf(formState.parentId, formState.childType);
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

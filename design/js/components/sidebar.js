(function (global) {
  function menuLabel(menuId, locale) {
    var loc = locale || (global.i18n && global.i18n.getLocale()) || "th";
    var row = global.store.getAll("admin_menu_language").find(function (r) {
      return r.admin_menu_id === menuId && r.locale === loc;
    });
    return row ? row.name : "";
  }

  var warehousePickerOverlay = null;

  function t(key) {
    return global.i18n ? global.i18n.t(key) : key;
  }

  function locationDisplayName(locId, locale) {
    var loc = locale || (global.i18n && global.i18n.getLocale()) || "th";
    var row = global.store.getAll("location_location_language").find(function (r) {
      return r.location_location_id === locId && r.locale === loc;
    });
    if (row && row.name) return row.name;
    var alt = loc === "th" ? "en" : "th";
    var fallback = global.store.getAll("location_location_language").find(function (r) {
      return r.location_location_id === locId && r.locale === alt;
    });
    return fallback ? fallback.name : String(locId);
  }

  function warehouseDisplayName(whId, locale) {
    var loc = locale || (global.i18n && global.i18n.getLocale()) || "th";
    var row = global.store.getAll("warehouse_list_language").find(function (r) {
      return r.warehouse_list_id === whId && r.locale === loc;
    });
    if (row && row.name) return row.name;
    var alt = loc === "th" ? "en" : "th";
    var fallback = global.store.getAll("warehouse_list_language").find(function (r) {
      return r.warehouse_list_id === whId && r.locale === alt;
    });
    return fallback ? fallback.name : String(whId);
  }

  function currentWarehouseViewId() {
    if (!/warehouse-list-view\.html/i.test(window.location.pathname)) return null;
    var m = window.location.search.match(/[?&]id=(\d+)/);
    return m ? m[1] : null;
  }

  function warehouseOptions() {
    return global.store
      .getAll("warehouse_list")
      .filter(function (r) {
        return r.deleted_at == null && r.type === "warehouse";
      })
      .sort(function (a, b) {
        return a.sort_order - b.sort_order || a.id - b.id;
      })
      .map(function (r) {
        var name = warehouseDisplayName(r.id);
        var label = name ? name + " (" + r.sku + ")" : r.sku;
        return { value: String(r.id), label: label };
      });
  }

  function locationSidebarItems() {
    return global.store
      .getAll("location_location")
      .filter(function (r) {
        return r.deleted_at == null && r.is_active;
      })
      .sort(function (a, b) {
        return a.sort_order - b.sort_order || a.id - b.id;
      })
      .map(function (r) {
        return {
          id: "loc:" + r.id,
          module: "location",
          path: "pages/location-location-view.html?id=" + r.id,
          icon: null,
          parent_id: 23,
          is_superadmin_only: false,
          is_dialog: false,
          label: locationDisplayName(r.id),
          children: [],
        };
      });
  }

  function injectLocationSidebarNodes(nodes) {
    return nodes.map(function (node) {
      var children = injectLocationSidebarNodes(node.children || []);
      if (node.icon === "map-pin" || node.id === 23) {
        children = children.concat(locationSidebarItems());
      }
      return Object.assign({}, node, { children: children });
    });
  }

  function buildMenuTree() {
    var menus = global.store
      .getAll("admin_menu")
      .filter(function (m) {
        return m.deleted_at == null && m.is_active;
      })
      .sort(function (a, b) {
        return a.sort_order - b.sort_order || a.id - b.id;
      });

    var byParent = {};
    menus.forEach(function (m) {
      var key = m.parent_id == null ? "root" : String(m.parent_id);
      if (!byParent[key]) byParent[key] = [];
      byParent[key].push(m);
    });

    function attach(parentKey) {
      return (byParent[parentKey] || []).map(function (m) {
        return {
          id: m.id,
          module: m.module,
          path: m.path,
          icon: m.icon,
          parent_id: m.parent_id,
          is_superadmin_only: m.is_superadmin_only,
          is_dialog: m.is_dialog,
          label: menuLabel(m.id),
          children: attach(String(m.id)),
        };
      });
    }

    return attach("root");
  }

  function parentModuleFor(node) {
    if (!node.parent_id) return node.module;
    var parent = global.store.getById("admin_menu", node.parent_id);
    if (!parent) return node.module;
    if (parent.id === 37) return "order";
    if (parent.id === 33 || parent.parent_id === 33) return "member";
    if (parent.id === 11) return "admin";
    if (parent.id === 2 || parent.parent_id === 2) return "admin";
    if (node.id === 22 || (parent.module === "supplier" && !parent.parent_id)) {
      return "supplier";
    }
    return parent.module;
  }

  function permTypeFor(node) {
    if (node.id === 22) return "supplier_user";
    return node.module;
  }

  function permissionCode(node, parentMod) {
    var pMod = parentMod || parentModuleFor(global.store.getById("admin_menu", node.id));
    var type = permTypeFor(global.store.getById("admin_menu", node.id));
    return pMod + "." + type + ".view";
  }

  function filterMenuTree(nodes, parentMod) {
    if (global.auth && global.auth.getUser() && global.auth.isSuperAdmin(global.auth.getUser())) {
      return nodes;
    }
    return nodes
      .map(function (node) {
        var storeNode = global.store.getById("admin_menu", node.id);
        var pMod = parentMod || (storeNode.parent_id ? parentModuleFor(storeNode) : storeNode.module);
        var children = filterMenuTree(node.children, storeNode.module);
        if (node.is_superadmin_only) return null;
        if (node.path && !node.is_dialog) {
          var code = permissionCode(storeNode, pMod);
          if (!global.permissions.can(code)) return null;
        }
        if (!node.path && children.length === 0) return null;
        return Object.assign({}, node, { children: children });
      })
      .filter(Boolean);
  }

  function resolvePath(path) {
    if (global.nav) return global.nav.resolve(path);
    return path;
  }

  function normalizePath(path) {
    if (!path || path === "#") return "";
    try {
      var a = document.createElement("a");
      a.href = resolvePath(path);
      return a.pathname.replace(/^\//, "");
    } catch {
      return path;
    }
  }

  function listPathFromFormPath(pathname) {
    if (!/-form\.html$/i.test(pathname)) return null;
    return pathname.replace(/-form\.html$/i, ".html");
  }

  function pathMatches(current, target) {
    return current.endsWith(target) || current === target;
  }

  function parseLocationViewIdFromHref(path) {
    if (!path || path.indexOf("location-location-view.html") < 0) return null;
    var m = String(path).match(/[?&]id=(\d+)/);
    return m ? m[1] : null;
  }

  function currentLocationViewId() {
    if (!/location-location-view\.html/i.test(window.location.pathname)) return null;
    var m = window.location.search.match(/[?&]id=(\d+)/);
    return m ? m[1] : null;
  }

  function isActive(path) {
    var current = normalizePath(window.location.pathname);
    var target = normalizePath(path);
    if (!target) return false;

    var curLocId = currentLocationViewId();
    var tarLocId = parseLocationViewIdFromHref(path);
    if (curLocId && tarLocId) return curLocId === tarLocId;

    if (pathMatches(current, target)) return true;
    var listPath = listPathFromFormPath(current);
    return listPath ? pathMatches(listPath, target) : false;
  }

  function hasActiveDescendant(node) {
    if (!node.children || !node.children.length) return false;
    return node.children.some(function (c) {
      return (c.path && isActive(c.path)) || hasActiveDescendant(c);
    });
  }

  function isNavigableLeaf(node, parentMod) {
    if (!node.path || node.path === "#" || node.is_dialog) return false;
    if (/dashboard\.html/i.test(node.path)) return false;
    var storeNode = global.store.getById("admin_menu", node.id);
    if (!storeNode) return false;
    var pMod = parentMod || (storeNode.parent_id ? parentModuleFor(storeNode) : storeNode.module);
    return global.permissions && global.permissions.can(permissionCode(storeNode, pMod));
  }

  /** DFS in sidebar order — first leaf with real path + view permission. Returns raw menu path. */
  function firstNavigablePath(nodes, parentMod) {
    for (var i = 0; i < nodes.length; i++) {
      var n = nodes[i];
      var storeNode = global.store.getById("admin_menu", n.id);
      var pMod =
        parentMod ||
        (storeNode && storeNode.parent_id ? parentModuleFor(storeNode) : storeNode ? storeNode.module : n.module);
      if (isNavigableLeaf(n, pMod)) return n.path;
      var childMod = storeNode ? storeNode.module : n.module;
      var child = firstNavigablePath(n.children || [], childMod);
      if (child) return child;
    }
    return null;
  }

  function iconHtml(name) {
    if (!name) return "";
    var file = String(name).toLowerCase().replace(/_/g, "-");
    return (
      '<span class="sidebar-nav__icon" aria-hidden="true">' +
      '<img src="../assets/icons/' +
      file +
      '.svg" alt="" width="18" height="18" />' +
      "</span>"
    );
  }

  function renderNav(nodes, depth, expandAll) {
    depth = depth || 0;
    return nodes
      .map(function (node) {
        var hasChildren = node.children && node.children.length > 0;
        var active = node.path ? isActive(node.path) : false;
        var open = expandAll ? hasChildren : active || hasActiveDescendant(node);
        if (hasChildren) {
          return (
            '<li class="sidebar-nav__item sidebar-nav__item--group' +
            (open ? " is-open" : "") +
            '">' +
            '<button type="button" class="sidebar-nav__group-btn" aria-expanded="' +
            (open ? "true" : "false") +
            '">' +
            iconHtml(node.icon) +
            '<span class="sidebar-nav__label">' +
            escapeHtml(node.label) +
            "</span>" +
            '<span class="sidebar-nav__chevron" aria-hidden="true">' +
            '<svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="m6 9 6 6 6-6"/></svg>' +
            "</span>" +
            "</button>" +
            '<ul class="sidebar-nav__sub">' +
            renderNav(node.children, depth + 1, expandAll) +
            "</ul></li>"
          );
        }
        var href = node.is_dialog ? "#" : resolvePath(node.path || "#");
        var cls =
          "sidebar-nav__link" +
          (active ? " is-active" : "") +
          (node.is_dialog ? " is-dialog" : "");
        return (
          '<li class="sidebar-nav__item">' +
          '<a class="' +
          cls +
          '" href="' +
          escapeAttr(href) +
          '" data-menu-id="' +
          node.id +
          '"' +
          (node.is_dialog ? ' data-dialog="true"' : "") +
          ">" +
          iconHtml(node.icon) +
          '<span class="sidebar-nav__label">' +
          escapeHtml(node.label) +
          "</span></a></li>"
        );
      })
      .join("");
  }

  function escapeHtml(s) {
    return String(s)
      .replace(/&/g, "&amp;")
      .replace(/</g, "&lt;")
      .replace(/>/g, "&gt;");
  }

  function escapeAttr(s) {
    return escapeHtml(s).replace(/"/g, "&quot;");
  }

  function render(container, query) {
    var tree = injectLocationSidebarNodes(filterMenuTree(buildMenuTree()));
    var q = (query || "").trim().toLowerCase();
    if (q) {
      tree = filterByQuery(tree, q);
    }
    var expandAll = !!q;
    var html =
      tree.length === 0
        ? '<p class="sidebar-nav__empty" data-i18n="nav.noMenu">ไม่มีเมนู</p>'
        : '<ul class="sidebar-nav">' + renderNav(tree, 0, expandAll) + "</ul>";
    container.innerHTML = html;
    bindGroupToggles(container);
    bindDialogLinks(container);
    if (global.i18n) {
      container.querySelectorAll("[data-i18n]").forEach(function (el) {
        el.textContent = global.i18n.t(el.getAttribute("data-i18n"));
      });
    }
  }

  function filterByQuery(nodes, q) {
    var out = [];
    nodes.forEach(function (node) {
      var label = (node.label || "").toLowerCase();
      var childMatches = filterByQuery(node.children || [], q);
      if (label.indexOf(q) >= 0 || childMatches.length) {
        out.push(Object.assign({}, node, { children: childMatches.length ? childMatches : node.children }));
      }
    });
    return out;
  }

  function bindGroupToggles(container) {
    container.querySelectorAll(".sidebar-nav__group-btn").forEach(function (btn) {
      btn.addEventListener("click", function () {
        var li = btn.closest(".sidebar-nav__item--group");
        if (!li) return;
        li.classList.toggle("is-open");
        btn.setAttribute("aria-expanded", li.classList.contains("is-open") ? "true" : "false");
      });
    });
  }

  function filterFormSearchSelectList(list, q) {
    list.querySelectorAll(".form-search-select__option").forEach(function (opt) {
      var text = (opt.textContent || "").toLowerCase();
      opt.hidden = !!(q && text.indexOf(q) < 0);
    });
  }

  function closeFormSearchSelectPanels(exceptWrap) {
    if (!warehousePickerOverlay) return;
    warehousePickerOverlay.querySelectorAll(".form-search-select").forEach(function (wrap) {
      if (exceptWrap && wrap === exceptWrap) return;
      var panel = wrap.querySelector(".form-search-select__panel");
      var trigger = wrap.querySelector(".form-search-select__trigger");
      if (panel) panel.hidden = true;
      if (trigger) trigger.setAttribute("aria-expanded", "false");
    });
  }

  function bindFormSearchableSelects(form) {
    form.querySelectorAll(".form-search-select").forEach(function (wrap) {
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
        closeFormSearchSelectPanels();
        if (willOpen) {
          panel.hidden = false;
          trigger.setAttribute("aria-expanded", "true");
          if (search) {
            search.value = "";
            filterFormSearchSelectList(list, "");
            search.focus();
          }
        }
      });

      panel.addEventListener("click", function (e) {
        e.stopPropagation();
      });

      if (search) {
        search.addEventListener("input", function () {
          filterFormSearchSelectList(list, search.value.trim().toLowerCase());
        });
      }

      list.querySelectorAll(".form-search-select__option").forEach(function (opt) {
        opt.addEventListener("click", function () {
          var value = opt.getAttribute("data-value") || "";
          hidden.value = value;
          if (labelEl) labelEl.textContent = opt.textContent || "";
          list.querySelectorAll(".form-search-select__option").forEach(function (o) {
            o.classList.toggle("form-search-select__option--selected", o === opt);
          });
          closeFormSearchSelectPanels();
        });
      });
    });

    if (!form._formSearchSelectCloseBound) {
      form._formSearchSelectCloseBound = true;
      form.addEventListener("click", function () {
        closeFormSearchSelectPanels();
      });
    }
  }

  function warehousePickerFieldHtml(options, selectedId) {
    var selectPh =
      global.i18n && global.i18n.fieldPlaceholder
        ? escapeHtml(global.i18n.fieldPlaceholder("select", "warehouse.selectWarehouse"))
        : escapeHtml(t("warehouse.selectWarehouse"));
    var selectedLabel = selectPh;
    if (selectedId) {
      var match = options.find(function (o) {
        return o.value === String(selectedId);
      });
      if (match) selectedLabel = escapeHtml(match.label);
    }
    var optionsHtml = options
      .map(function (opt) {
        var sel = String(selectedId) === String(opt.value) ? " form-search-select__option--selected" : "";
        return (
          '<li class="form-search-select__option' +
          sel +
          '" role="option" data-value="' +
          escapeAttr(opt.value) +
          '" tabindex="0">' +
          escapeHtml(opt.label) +
          "</li>"
        );
      })
      .join("");
    return (
      '<div class="form-field form-search-select">' +
      '<label><span data-i18n="warehouse.selectWarehouse"></span></label>' +
      '<input type="hidden" name="warehouse_id" value="' +
      escapeAttr(selectedId != null ? selectedId : "") +
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
      escapeHtml(t("search.placeholder")) +
      '" />' +
      '<ul class="form-search-select__list" role="listbox">' +
      optionsHtml +
      "</ul></div></div></div>"
    );
  }

  function closeWarehousePickerDialog() {
    if (!warehousePickerOverlay) return;
    warehousePickerOverlay.hidden = true;
    document.body.classList.remove("modal-open");
  }

  function openWarehousePickerDialog() {
    if (global.permissions && !global.permissions.can("warehouse.warehouse_list.view")) return;
    if (!warehousePickerOverlay) {
      warehousePickerOverlay = document.createElement("div");
      warehousePickerOverlay.className = "modal-overlay";
      warehousePickerOverlay.hidden = true;
      warehousePickerOverlay.innerHTML =
        '<div class="modal crud-modal wh-picker-modal" role="dialog" aria-modal="true" aria-labelledby="wh-picker-title">' +
        '<div class="modal__header">' +
        '<h2 class="modal__title" id="wh-picker-title" data-i18n="warehouse.managementDialogTitle"></h2>' +
        '<button type="button" class="modal__close" id="wh-picker-close" aria-label="Close">' +
        '<img src="../assets/icons/x.svg" alt="" width="18" height="18" /></button></div>' +
        '<form id="wh-picker-form" class="crud-form modal__content" novalidate></form>' +
        '<div class="modal__footer">' +
        '<button type="button" class="btn" id="wh-picker-cancel" data-i18n="crud.cancel"></button>' +
        '<button type="submit" form="wh-picker-form" class="btn btn--primary" id="wh-picker-save" data-i18n="crud.save"></button>' +
        "</div></div>";
      document.body.appendChild(warehousePickerOverlay);
      warehousePickerOverlay.querySelector("#wh-picker-close").addEventListener("click", closeWarehousePickerDialog);
      warehousePickerOverlay.querySelector("#wh-picker-cancel").addEventListener("click", closeWarehousePickerDialog);
      warehousePickerOverlay.addEventListener("click", function (e) {
        if (e.target === warehousePickerOverlay) closeWarehousePickerDialog();
      });
      warehousePickerOverlay.querySelector("#wh-picker-form").addEventListener("submit", function (e) {
        e.preventDefault();
        var fd = new FormData(e.target);
        var id = String(fd.get("warehouse_id") || "").trim();
        if (!id) {
          if (global.toast) global.toast.show(t("warehouse.selectWarehouseRequired"), "error");
          return;
        }
        closeWarehousePickerDialog();
        window.location.href = global.nav.resolve("pages/warehouse-list-view.html?id=" + id);
      });
    }

    var options = warehouseOptions();
    var preselect = currentWarehouseViewId();
    warehousePickerOverlay.querySelector("#wh-picker-form").innerHTML = warehousePickerFieldHtml(options, preselect);
    bindFormSearchableSelects(warehousePickerOverlay.querySelector("#wh-picker-form"));
    if (global.i18n) global.i18n.init();
    warehousePickerOverlay.hidden = false;
    document.body.classList.add("modal-open");
  }

  function bindDialogLinks(container) {
    container.querySelectorAll("[data-dialog='true']").forEach(function (link) {
      link.addEventListener("click", function (e) {
        e.preventDefault();
        if (link.getAttribute("data-menu-id") === "27") {
          openWarehousePickerDialog();
          return;
        }
        if (global.modal) global.modal.open("modal.title", "modal.body");
      });
    });
  }

  function getFirstPath() {
    return firstNavigablePath(filterMenuTree(buildMenuTree()));
  }

  function findMenuByCurrentPath() {
    var current = normalizePath(window.location.pathname);
    if (!current) return null;
    return (
      global.store.getAll("admin_menu").find(function (m) {
        if (m.deleted_at != null || !m.is_active || !m.path || m.path === "#" || m.is_dialog) {
          return false;
        }
        var target = normalizePath(m.path);
        return target && (current.endsWith(target) || current === target);
      }) || null
    );
  }

  function isNavigablePath(path) {
    return path && path !== "#";
  }

  function getBreadcrumb() {
    var locId = currentLocationViewId();
    if (locId) {
      return [
        { id: 23, label: menuLabel(23), path: null, isCurrent: false },
        {
          id: "loc:" + locId,
          label: locationDisplayName(Number(locId)),
          path: "pages/location-location-view.html?id=" + locId,
          isCurrent: true,
        },
      ];
    }

    var whId = currentWarehouseViewId();
    if (whId) {
      return [
        { id: 25, label: menuLabel(25), path: null, isCurrent: false },
        { id: 27, label: menuLabel(27), path: null, isCurrent: false },
        {
          id: "wh:" + whId,
          label: warehouseDisplayName(Number(whId)),
          path: "pages/warehouse-list-view.html?id=" + whId,
          isCurrent: true,
        },
      ];
    }

    var menu = findMenuByCurrentPath();
    if (!menu) return [];
    var chain = [];
    var node = menu;
    while (node) {
      chain.push({
        id: node.id,
        label: menuLabel(node.id),
        path: node.path,
      });
      node = node.parent_id ? global.store.getById("admin_menu", node.parent_id) : null;
    }
    chain.reverse();
    return chain.map(function (item, i) {
      return Object.assign({}, item, { isCurrent: i === chain.length - 1 });
    });
  }

  var BREADCRUMB_SEP =
    '<span class="admin-header__breadcrumb-sep" aria-hidden="true">&gt;</span>';

  function renderBreadcrumb(container, fallbackTitle) {
    if (!container) return;
    var items = getBreadcrumb();
    if (items.length === 0) {
      if (fallbackTitle) {
        container.hidden = false;
        if (global.i18n) {
          container.setAttribute("aria-label", global.i18n.t("nav.breadcrumb"));
        }
        container.innerHTML =
          '<ol class="admin-header__breadcrumb-list">' +
          '<li class="admin-header__breadcrumb-item">' +
          '<span class="admin-header__breadcrumb-current" aria-current="page">' +
          escapeHtml(fallbackTitle) +
          "</span></li></ol>";
      } else {
        container.innerHTML = "";
        container.hidden = true;
      }
      return;
    }
    container.hidden = false;
    if (global.i18n) {
      container.setAttribute("aria-label", global.i18n.t("nav.breadcrumb"));
    }
    var html = '<ol class="admin-header__breadcrumb-list">';
    items.forEach(function (item, index) {
      html += '<li class="admin-header__breadcrumb-item">';
      if (index > 0) html += BREADCRUMB_SEP;
      if (item.isCurrent) {
        html +=
          '<span class="admin-header__breadcrumb-current" aria-current="page">' +
          escapeHtml(item.label) +
          "</span>";
      } else if (isNavigablePath(item.path)) {
        html +=
          '<a class="admin-header__breadcrumb-link" href="' +
          escapeAttr(resolvePath(item.path)) +
          '">' +
          escapeHtml(item.label) +
          "</a>";
      } else {
        html += '<span class="admin-header__breadcrumb-text">' + escapeHtml(item.label) + "</span>";
      }
      html += "</li>";
    });
    html += "</ol>";
    container.innerHTML = html;
  }

  global.sidebar = {
    buildMenuTree: buildMenuTree,
    filterMenuTree: filterMenuTree,
    render: render,
    renderBreadcrumb: renderBreadcrumb,
    getBreadcrumb: getBreadcrumb,
    getFirstPath: getFirstPath,
  };
})(window);

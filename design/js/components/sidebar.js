(function (global) {
  function menuLabel(menuId, locale) {
    var loc = locale || (global.i18n && global.i18n.getLocale()) || "th";
    var row = global.store.getAll("admin_menu_language").find(function (r) {
      return r.admin_menu_id === menuId && r.locale === loc;
    });
    return row ? row.name : "";
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

  function isActive(path) {
    var current = normalizePath(window.location.pathname);
    var target = normalizePath(path);
    if (!target) return false;
    return current.endsWith(target) || current === target;
  }

  function firstPath(nodes) {
    for (var i = 0; i < nodes.length; i++) {
      var n = nodes[i];
      if (n.path && n.path !== "#" && !n.is_dialog) return n.path;
      var child = firstPath(n.children || []);
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

  function renderNav(nodes, depth) {
    depth = depth || 0;
    return nodes
      .map(function (node) {
        var hasChildren = node.children && node.children.length > 0;
        var active = node.path ? isActive(node.path) : false;
        var childActive = hasChildren && node.children.some(function (c) {
          return (c.path && isActive(c.path)) || (c.children && c.children.length);
        });
        var open = active || childActive;
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
            '<span class="sidebar-nav__chevron" aria-hidden="true"></span>' +
            "</button>" +
            '<ul class="sidebar-nav__sub">' +
            renderNav(node.children, depth + 1) +
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
    var tree = filterMenuTree(buildMenuTree());
    var q = (query || "").trim().toLowerCase();
    if (q) {
      tree = filterByQuery(tree, q);
    }
    var html =
      tree.length === 0
        ? '<p class="sidebar-nav__empty" data-i18n="nav.noMenu">ไม่มีเมนู</p>'
        : '<ul class="sidebar-nav">' + renderNav(tree) + "</ul>";
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

  function bindDialogLinks(container) {
    container.querySelectorAll("[data-dialog='true']").forEach(function (link) {
      link.addEventListener("click", function (e) {
        e.preventDefault();
        if (global.modal) global.modal.open("modal.title", "modal.body");
      });
    });
  }

  function getFirstPath() {
    var raw = firstPath(filterMenuTree(buildMenuTree()));
    return raw ? resolvePath(raw) : null;
  }

  global.sidebar = {
    buildMenuTree: buildMenuTree,
    filterMenuTree: filterMenuTree,
    render: render,
    getFirstPath: getFirstPath,
  };
})(window);

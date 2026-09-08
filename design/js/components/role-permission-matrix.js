(function (global) {
  var ACTIONS = ["view", "create", "update", "delete", "import", "export"];
  var SUPER_ADMIN_ROLE_ID = 1;

  function t(key) {
    return global.i18n ? global.i18n.t(key) : key;
  }

  function locale() {
    return global.i18n ? global.i18n.getLocale() : "th";
  }

  function menuLabel(menuId) {
    var row = global.store.getAll("admin_menu_language").find(function (r) {
      return r.admin_menu_id === menuId && r.locale === locale();
    });
    return row ? row.name : "";
  }

  function rootMenuId(menuId) {
    var m = global.store.getById("admin_menu", menuId);
    var seen = {};
    while (m && m.parent_id != null) {
      if (seen[m.id]) break;
      seen[m.id] = true;
      m = global.store.getById("admin_menu", m.parent_id);
    }
    return m ? m.id : menuId;
  }

  function permissionsForMenu(menuId) {
    var permById = {};
    global.store.getAll("admin_permission").forEach(function (p) {
      if (p.deleted_at == null) permById[p.id] = p;
    });
    var links = global.store.getAll("admin_menu_permission").filter(function (mp) {
      return mp.admin_menu_id === menuId;
    });
    var perms = links
      .map(function (mp) {
        return permById[mp.admin_permission_id];
      })
      .filter(Boolean);
    perms.sort(function (a, b) {
      return ACTIONS.indexOf(a.action) - ACTIONS.indexOf(b.action);
    });
    return perms;
  }

  function selectedPermIds(roleId) {
    if (!roleId) return [];
    return global.store
      .getAll("admin_role_permission")
      .filter(function (rp) {
        return rp.admin_role_id === roleId;
      })
      .map(function (rp) {
        return rp.admin_permission_id;
      });
  }

  function isMatrixMenu(menu) {
    if (!menu || menu.deleted_at != null || !menu.is_active) return false;
    if (menu.is_dialog) return false;
    if (!menu.path) return false;
    if (/dashboard\.html/i.test(menu.path)) return false;
    return permissionsForMenu(menu.id).length > 0;
  }

  function buildMenuGroups() {
    var menus = global.store
      .getAll("admin_menu")
      .filter(function (m) {
        return m.deleted_at == null && m.is_active;
      })
      .sort(function (a, b) {
        return a.sort_order - b.sort_order || a.id - b.id;
      });

    var groupsByRoot = {};
    menus.forEach(function (menu) {
      if (!isMatrixMenu(menu)) return;
      var perms = permissionsForMenu(menu.id);
      var rootId = rootMenuId(menu.id);
      if (!groupsByRoot[rootId]) {
        groupsByRoot[rootId] = { rootId: rootId, label: menuLabel(rootId), rows: [] };
      }
      groupsByRoot[rootId].rows.push({
        menuId: menu.id,
        label: menuLabel(menu.id),
        permissions: perms,
      });
    });

    var roots = menus.filter(function (m) {
      return m.parent_id == null;
    });
    return roots
      .map(function (root) {
        return groupsByRoot[root.id];
      })
      .filter(function (g) {
        return g && g.rows.length;
      });
  }

  function escapeHtml(s) {
    return String(s)
      .replace(/&/g, "&amp;")
      .replace(/</g, "&lt;")
      .replace(/>/g, "&gt;")
      .replace(/"/g, "&quot;");
  }

  function actionHeaderCells() {
    return ACTIONS.map(function (action) {
      return (
        '<th class="role-perm-matrix__action-col" scope="col" data-i18n="action.' +
        action +
        '"></th>'
      );
    }).join("");
  }

  function checkboxCell(perm, checked, locked) {
    if (!perm) {
      return '<td class="role-perm-matrix__action-col"></td>';
    }
    var disabled = locked;
    return (
      '<td class="role-perm-matrix__action-col">' +
      '<label class="role-perm-matrix__check">' +
      '<input type="checkbox" class="role-perm-matrix__perm" data-perm-id="' +
      perm.id +
      '" data-action="' +
      escapeHtml(perm.action) +
      '"' +
      (checked ? " checked" : "") +
      (disabled ? " disabled" : "") +
      " />" +
      '<span class="visually-hidden">' +
      escapeHtml(perm.action) +
      "</span>" +
      "</label></td>"
    );
  }

  function rowHtml(row, selectedSet, locked) {
    var permByAction = {};
    row.permissions.forEach(function (p) {
      permByAction[p.action] = p;
    });
    var cells = ACTIONS.map(function (action) {
      var perm = permByAction[action];
      var checked = perm && (locked || selectedSet.has(perm.id));
      return checkboxCell(perm, checked, locked);
    }).join("");
    return (
      '<tr class="role-perm-matrix__row" data-menu-id="' +
      row.menuId +
      '" data-menu-label="' +
      escapeHtml(row.label.toLowerCase()) +
      '">' +
      '<th scope="row" class="role-perm-matrix__menu-col">' +
      escapeHtml(row.label) +
      "</th>" +
      cells +
      '<td class="role-perm-matrix__row-all-col">' +
      '<label class="role-perm-matrix__check">' +
      '<input type="checkbox" class="role-perm-matrix__row-all"' +
      (locked ? " disabled" : "") +
      " />" +
      '<span class="visually-hidden" data-i18n="rolePerm.selectAll"></span>' +
      "</label></td></tr>"
    );
  }

  function groupHtml(group, selectedSet, locked) {
    var rows = group.rows
      .map(function (row) {
        return rowHtml(row, selectedSet, locked);
      })
      .join("");
    return (
      '<details class="role-perm-matrix__group" open data-group-id="' +
      group.rootId +
      '">' +
      '<summary class="role-perm-matrix__group-summary">' +
      '<span class="role-perm-matrix__group-label">' +
      escapeHtml(group.label) +
      "</span>" +
      '<button type="button" class="role-perm-matrix__group-all"' +
      (locked ? " disabled" : "") +
      ' data-i18n="rolePerm.selectGroup"></button>' +
      "</summary>" +
      '<div class="role-perm-matrix__table-wrap">' +
      '<table class="role-perm-matrix__table">' +
      "<thead><tr>" +
      '<th scope="col" class="role-perm-matrix__menu-col" data-i18n="rolePerm.menu"></th>' +
      actionHeaderCells() +
      '<th scope="col" class="role-perm-matrix__row-all-col" data-i18n="rolePerm.selectAll"></th>' +
      "</tr></thead>" +
      "<tbody>" +
      rows +
      "</tbody></table></div></details>"
    );
  }

  function render(roleId) {
    var locked = roleId === SUPER_ADMIN_ROLE_ID;
    var selected = new Set(selectedPermIds(roleId));
    if (locked) {
      global.store
        .getAll("admin_permission")
        .filter(function (p) {
          return p.deleted_at == null && p.is_active;
        })
        .forEach(function (p) {
          selected.add(p.id);
        });
    }
    var groups = buildMenuGroups();
    var groupsHtml = groups
      .map(function (g) {
        return groupHtml(g, selected, locked);
      })
      .join("");
    return (
      '<section class="role-perm-matrix" data-role-perm-matrix data-role-id="' +
      (roleId != null ? roleId : "") +
      '"' +
      (locked ? ' data-locked="true"' : "") +
      ">" +
      '<h3 class="role-perm-matrix__title" data-i18n="rolePerm.title"></h3>' +
      (locked
        ? '<p class="role-perm-matrix__hint" data-i18n="rolePerm.superAdminLocked"></p>'
        : "") +
      '<input type="search" class="role-perm-matrix__search" data-i18n-placeholder="rolePerm.search" placeholder=""' +
      (locked ? " disabled" : "") +
      " />" +
      '<div class="role-perm-matrix__groups">' +
      groupsHtml +
      "</div></section>"
    );
  }

  function activeCheckboxes(root, scope) {
    var base = scope || root;
    return Array.prototype.slice.call(
      base.querySelectorAll(".role-perm-matrix__perm:not(:disabled)")
    );
  }

  function syncRowAll(row) {
    var boxes = activeCheckboxes(row, row);
    var rowAll = row.querySelector(".role-perm-matrix__row-all");
    if (!rowAll || !boxes.length) return;
    var checked = boxes.filter(function (cb) {
      return cb.checked;
    }).length;
    rowAll.checked = checked === boxes.length;
    rowAll.indeterminate = checked > 0 && checked < boxes.length;
  }

  function syncAllRowAlls(root) {
    root.querySelectorAll(".role-perm-matrix__row").forEach(syncRowAll);
  }

  function setCheckboxes(boxes, checked) {
    boxes.forEach(function (cb) {
      cb.checked = checked;
    });
  }

  function viewCheckbox(row) {
    return row.querySelector('.role-perm-matrix__perm[data-action="view"]:not(:disabled)');
  }

  function ensureViewChecked(row) {
    var view = viewCheckbox(row);
    if (!view) return;
    var others = row.querySelectorAll(
      '.role-perm-matrix__perm:checked:not([data-action="view"])'
    );
    if (others.length) view.checked = true;
  }

  function ensureViewForRows(root, scope) {
    var base = scope || root;
    base.querySelectorAll(".role-perm-matrix__row").forEach(ensureViewChecked);
  }

  function bind(root, roleId) {
    if (!root) return;
    var locked = root.getAttribute("data-locked") === "true";

    syncAllRowAlls(root);

    root.querySelectorAll(".role-perm-matrix__perm").forEach(function (cb) {
      cb.addEventListener("change", function () {
        if (!locked) {
          var row = cb.closest(".role-perm-matrix__row");
          var action = cb.getAttribute("data-action");
          if (cb.checked && action !== "view") ensureViewChecked(row);
          else if (!cb.checked && action === "view") ensureViewChecked(row);
        }
        syncRowAll(cb.closest(".role-perm-matrix__row"));
      });
    });

    root.querySelectorAll(".role-perm-matrix__row-all").forEach(function (rowAll) {
      rowAll.addEventListener("change", function () {
        if (locked) return;
        var row = rowAll.closest(".role-perm-matrix__row");
        setCheckboxes(activeCheckboxes(root, row), rowAll.checked);
        rowAll.indeterminate = false;
        ensureViewChecked(row);
      });
    });

    root.querySelectorAll(".role-perm-matrix__group-all").forEach(function (btn) {
      btn.addEventListener("click", function (e) {
        e.preventDefault();
        e.stopPropagation();
        if (locked || btn.disabled) return;
        var group = btn.closest(".role-perm-matrix__group");
        var boxes = activeCheckboxes(root, group);
        var allChecked = boxes.every(function (cb) {
          return cb.checked;
        });
        setCheckboxes(boxes, !allChecked);
        ensureViewForRows(root, group);
        syncAllRowAlls(root);
      });
    });

    var search = root.querySelector(".role-perm-matrix__search");
    if (search) {
      search.addEventListener("input", function () {
        var q = search.value.trim().toLowerCase();
        root.querySelectorAll(".role-perm-matrix__group").forEach(function (group) {
          var visible = 0;
          group.querySelectorAll(".role-perm-matrix__row").forEach(function (row) {
            var label = row.getAttribute("data-menu-label") || "";
            var show = !q || label.indexOf(q) >= 0;
            row.hidden = !show;
            if (show) visible += 1;
          });
          group.hidden = visible === 0;
        });
      });
    }
  }

  function readSelected(root) {
    if (!root) return [];
    if (root.getAttribute("data-locked") === "true") {
      return global.store
        .getAll("admin_permission")
        .filter(function (p) {
          return p.deleted_at == null && p.is_active;
        })
        .map(function (p) {
          return p.id;
        });
    }
    var ids = [];
    root.querySelectorAll(".role-perm-matrix__perm:checked").forEach(function (cb) {
      ids.push(Number(cb.getAttribute("data-perm-id")));
    });
    return ids;
  }

  function syncRolePermissions(roleId, permIds) {
    if (roleId === SUPER_ADMIN_ROLE_ID) return;
    var table = "admin_role_permission";
    var rows = global.store.getAll(table);
    for (var i = rows.length - 1; i >= 0; i--) {
      if (rows[i].admin_role_id === roleId) global.store.deleteAt(table, i);
    }
    var ts = new Date().toISOString();
    var seen = {};
    (permIds || []).forEach(function (permId) {
      if (seen[permId]) return;
      seen[permId] = true;
      global.store.create(table, {
        admin_role_id: roleId,
        admin_permission_id: permId,
        created_at: ts,
      });
    });
  }

  global.rolePermissionMatrix = {
    ACTIONS: ACTIONS,
    buildMenuGroups: buildMenuGroups,
    render: render,
    bind: bind,
    readSelected: readSelected,
    syncRolePermissions: syncRolePermissions,
    SUPER_ADMIN_ROLE_ID: SUPER_ADMIN_ROLE_ID,
  };
})(window);

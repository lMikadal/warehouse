(function (global) {
  var ACTIONS = ["view", "create", "update", "delete", "import", "export"];

  function getUser() {
    return global.auth ? global.auth.getUser() : null;
  }

  function isSuperAdmin() {
    var user = getUser();
    return global.auth && global.auth.isSuperAdmin(user);
  }

  function getPermissionByCode(code) {
    return global.store
      .getAll("admin_permission")
      .find(function (p) {
        return p.code === code && p.deleted_at == null;
      });
  }

  function roleHasPermission(roleId, permId) {
    return global.store.getAll("admin_role_permission").some(function (rp) {
      return rp.admin_role_id === roleId && rp.admin_permission_id === permId;
    });
  }

  function can(code) {
    if (isSuperAdmin()) return true;
    var user = getUser();
    if (!user || !user.admin_role_id) return false;
    var perm = getPermissionByCode(code);
    if (!perm || !perm.is_active) return false;
    return roleHasPermission(user.admin_role_id, perm.id);
  }

  function canAction(module, type, action) {
    return can(module + "." + type + "." + action);
  }

  function codeForPage(module, type, action) {
    return module + "." + type + "." + (action || "view");
  }

  function listForPage(module, type) {
    var out = {};
    ACTIONS.forEach(function (action) {
      out[action] = canAction(module, type, action);
    });
    return out;
  }

  function activeCodes() {
    if (isSuperAdmin()) {
      return new Set(
        global.store
          .getAll("admin_permission")
          .filter(function (p) {
            return p.deleted_at == null && p.is_active;
          })
          .map(function (p) {
            return p.code;
          })
      );
    }
    var user = getUser();
    if (!user || !user.admin_role_id) return new Set();
    var permIds = global.store
      .getAll("admin_role_permission")
      .filter(function (rp) {
        return rp.admin_role_id === user.admin_role_id;
      })
      .map(function (rp) {
        return rp.admin_permission_id;
      });
    var codes = global.store
      .getAll("admin_permission")
      .filter(function (p) {
        return (
          p.deleted_at == null &&
          p.is_active &&
          permIds.indexOf(p.id) >= 0
        );
      })
      .map(function (p) {
        return p.code;
      });
    return new Set(codes);
  }

  function guardPage(module, type, redirectPath) {
    if (!global.auth || !global.auth.requireAuth()) return false;
    if (canAction(module, type, "view")) return true;
    if (global.toast) {
      global.toast.show(global.i18n.t("error.forbidden"), "error");
    }
    var firstPath = global.sidebar ? global.sidebar.getFirstPath() : null;
    var target = firstPath || redirectPath || "pages/login.html";
    var resolved = global.nav ? global.nav.resolve(target) : target;
    window.location.replace(resolved);
    return false;
  }

  function applyActionButtons(root) {
    var el = root || document;
    el.querySelectorAll("[data-perm-action]").forEach(function (node) {
      var mod = node.getAttribute("data-perm-module");
      var typ = node.getAttribute("data-perm-type");
      var act = node.getAttribute("data-perm-action");
      if (!mod || !typ || !act) return;
      var allowed = canAction(mod, typ, act);
      if (!allowed) {
        node.hidden = true;
        node.disabled = true;
        node.setAttribute("aria-hidden", "true");
      } else {
        node.hidden = false;
        node.disabled = false;
        node.removeAttribute("aria-hidden");
      }
    });
  }

  global.permissions = {
    ACTIONS: ACTIONS,
    can: can,
    canAction: canAction,
    codeForPage: codeForPage,
    listForPage: listForPage,
    activeCodes: activeCodes,
    guardPage: guardPage,
    applyActionButtons: applyActionButtons,
  };
})(window);

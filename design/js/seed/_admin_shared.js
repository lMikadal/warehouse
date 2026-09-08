/** Shared constants and helpers for admin seed tables. */
(function (global) {
  var TS = "2026-01-01T00:00:00Z";
  var ACTIONS = ["view", "create", "update", "delete", "import", "export"];
  var METHOD = {
    view: "GET",
    create: "POST",
    update: "PATCH",
    delete: "DELETE",
    import: "POST",
    export: "GET",
  };

  /** Globally inactive actions for demo (frontend checks is_active). */
  var GLOBAL_INACTIVE = { import: true, export: true };

  function audit(id) {
    return {
      created_at: TS,
      updated_at: TS,
      deleted_at: null,
      created_by: 1,
      updated_by: 1,
    };
  }

  /** LTREE segment for one row id — v2 convention: n2, n2.n3, n2.n6.n7 */
  function treePathSegment(id) {
    return "n" + id;
  }

  function buildTreePath(id, parentId, parentById) {
    var chain = [id];
    var seen = {};
    seen[id] = true;
    var p = parentId;
    while (p != null) {
      if (seen[p]) {
        throw new Error("tree_path cycle at id " + id + " (parent " + p + ")");
      }
      seen[p] = true;
      chain.unshift(p);
      p = parentById[p] != null ? parentById[p] : null;
    }
    return chain.map(treePathSegment).join(".");
  }

  function assignTreePaths(defs) {
    var parentById = {};
    defs.forEach(function (d) {
      parentById[d.id] = d.parent_id != null ? d.parent_id : null;
    });
    var out = defs.map(function (d) {
      return Object.assign({}, d, {
        tree_path: buildTreePath(d.id, d.parent_id != null ? d.parent_id : null, parentById),
      });
    });
    var paths = {};
    out.forEach(function (d) {
      if (paths[d.tree_path]) {
        throw new Error("duplicate tree_path " + d.tree_path + " (ids " + paths[d.tree_path] + ", " + d.id + ")");
      }
      paths[d.tree_path] = d.id;
    });
    return out;
  }

  global.ADMIN_SEED_SHARED = {
    TS: TS,
    ACTIONS: ACTIONS,
    METHOD: METHOD,
    GLOBAL_INACTIVE: GLOBAL_INACTIVE,
    audit: audit,
    treePathSegment: treePathSegment,
    buildTreePath: buildTreePath,
    assignTreePaths: assignTreePaths,
  };
})(window);

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

  global.ADMIN_SEED_SHARED = {
    TS: TS,
    ACTIONS: ACTIONS,
    METHOD: METHOD,
    GLOBAL_INACTIVE: GLOBAL_INACTIVE,
    audit: audit,
  };
})(window);

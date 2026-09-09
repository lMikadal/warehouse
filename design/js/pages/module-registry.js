(function (global) {
  var TS = "2026-01-01T00:00:00Z";

  function now() {
    return new Date().toISOString();
  }

  function escapeHtml(s) {
    return String(s)
      .replace(/&/g, "&amp;")
      .replace(/</g, "&lt;")
      .replace(/>/g, "&gt;")
      .replace(/"/g, "&quot;");
  }

  function locale() {
    return global.i18n ? global.i18n.getLocale() : "th";
  }

  function langName(langTable, parentKey, parentId, loc) {
    var row = global.store.getAll(langTable).find(function (r) {
      return r[parentKey] === parentId && r.locale === (loc || locale());
    });
    return row ? row.name : "";
  }

  function upsertLang(langTable, parentKey, parentId, loc, name) {
    var rows = global.store.getAll(langTable);
    var idx = rows.findIndex(function (r) {
      return r[parentKey] === parentId && r.locale === loc;
    });
    if (idx >= 0) {
      global.store.updateAt(langTable, idx, { name: name, updated_at: now() });
    } else {
      global.store.create(langTable, {
        [parentKey]: parentId,
        locale: loc,
        name: name,
        created_at: now(),
        updated_at: now(),
      });
    }
  }

  function statusSwitchHtml(row, field, labelKey) {
    field = field || "is_active";
    labelKey = labelKey || "col.status";
    var label = global.i18n ? global.i18n.t(labelKey) : labelKey;
    return (
      '<label class="crud-switch">' +
      '<input type="checkbox" class="crud-status-switch" role="switch" data-id="' +
      escapeHtml(row._id) +
      '" data-switch-field="' +
      escapeHtml(field) +
      '"' +
      (row[field] ? " checked" : "") +
      ' aria-label="' +
      escapeHtml(label) +
      '" />' +
      '<span class="crud-switch__track" aria-hidden="true"><span class="crud-switch__thumb"></span></span>' +
      "</label>"
    );
  }


  function userStatusBadgeHtml(status) {
    var label = global.i18n.t("userStatus." + status);
    return (
      '<span class="crud-badge crud-badge--' +
      escapeHtml(status) +
      '">' +
      escapeHtml(label) +
      "</span>"
    );
  }

  function treeDepth(treePath) {
    if (!treePath) return 0;
    return String(treePath).split(".").length - 1;
  }

  function requiredValidate(values, fields) {
    var errors = {};
    fields.forEach(function (f) {
      if (!f.required) return;
      var v = values[f.key];
      if (f.type === "checkbox") return;
      if (v == null || v === "") errors[f.key] = global.i18n.t("error.required");
    });
    return { ok: Object.keys(errors).length === 0, errors: errors };
  }

  var ADMIN_USER_TYPES = ["superadmin", "owner", "manager", "staff"];
  var ADMIN_USER_STATUSES = ["active", "inactive", "suspended", "locked"];

  function activeAdminRoleSelectOptions() {
    return global.store
      .getAll("admin_role")
      .filter(function (r) {
        return r.deleted_at == null && r.is_active;
      })
      .map(function (r) {
        return {
          value: r.id,
          label: langName("admin_role_language", "admin_role_id", r.id),
        };
      });
  }

  function adminRoleFilterValues() {
    return global.store
      .getAll("admin_role")
      .filter(function (r) {
        return r.deleted_at == null;
      })
      .sort(function (a, b) {
        return langName("admin_role_language", "admin_role_id", a.id).localeCompare(
          langName("admin_role_language", "admin_role_id", b.id)
        );
      })
      .map(function (r) {
        return r.id;
      });
  }

  function assignableAdminUserTypes() {
    var types = ADMIN_USER_TYPES.slice();
    if (!global.auth || !global.auth.isSuperAdmin(global.auth.getUser())) {
      types = types.filter(function (t) {
        return t !== "superadmin";
      });
    }
    return types;
  }

  function adminUserTypeSelectOptions() {
    return assignableAdminUserTypes().map(function (v) {
      return { value: v, label: global.i18n.t("userType." + v) };
    });
  }

  var updatedAtColumn = {
    id: "updated_at",
    labelKey: "col.updatedAt",
    cellClass: "data-table__cell--meta data-table__cell--datetime",
    render: function (row) {
      return escapeHtml(global.i18n.formatDateTime(row.updated_at));
    },
  };

  var REGISTRY = {
    admin_menu: {
      permModule: "admin",
      permType: "admin_menu",
      storeTable: "admin_menu",
      pageTitleKey: "page.adminMenu",
      pageDescriptionKey: "page.adminMenu.desc",
      canExport: false,
      canCreate: false,
      canDelete: false,
      sortable: true,
      statusFilter: true,
      statusSwitch: true,
      columns: [
        {
          id: "label",
          labelKey: "col.name",
          render: function (row) {
            var depth = treeDepth(row.tree_path);
            var pad = depth > 0 ? ' style="padding-left:' + depth * 1.25 + 'rem"' : "";
            return '<span class="data-table__indent"' + pad + ">" + escapeHtml(row.label) + "</span>";
          },
        },
        { id: "module", labelKey: "col.module" },
        { id: "path", labelKey: "col.path" },
        {
          id: "is_active",
          labelKey: "col.status",
          render: function (row) {
            return statusSwitchHtml(row);
          },
        },
        updatedAtColumn,
      ],
      listRows: function () {
        return global.store
          .getAll("admin_menu")
          .filter(function (m) {
            return m.deleted_at == null;
          })
          .map(function (m) {
            return Object.assign({}, m, {
              _id: m.id,
              label: langName("admin_menu_language", "admin_menu_id", m.id),
              path: m.path || "—",
            });
          });
      },
      searchFilter: function (row, q) {
        return (
          String(row.label).toLowerCase().indexOf(q) >= 0 ||
          String(row.module).toLowerCase().indexOf(q) >= 0 ||
          String(row.path).toLowerCase().indexOf(q) >= 0
        );
      },
      formFields: [
        { key: "name_th", labelKey: "col.nameTh", type: "text", required: true },
        { key: "name_en", labelKey: "col.nameEn", type: "text", required: true },
        { key: "path", labelKey: "col.path", type: "text" },
        { key: "is_active", labelKey: "col.active", type: "checkbox", defaultValue: true },
      ],
      getFormValues: function (id) {
        var m = global.store.getById("admin_menu", id);
        return {
          name_th: langName("admin_menu_language", "admin_menu_id", id, "th"),
          name_en: langName("admin_menu_language", "admin_menu_id", id, "en"),
          path: m && m.path ? m.path : "",
          is_active: m ? m.is_active : true,
        };
      },
      validate: function (values) {
        return requiredValidate(values, REGISTRY.admin_menu.formFields);
      },
      save: function (values, id) {
        var m = global.store.getById("admin_menu", id);
        global.store.update("admin_menu", id, {
          path: values.path || null,
          sort_order: m ? m.sort_order : 100,
          is_active: !!values.is_active,
          updated_at: now(),
        });
        upsertLang("admin_menu_language", "admin_menu_id", id, "th", values.name_th);
        upsertLang("admin_menu_language", "admin_menu_id", id, "en", values.name_en);
      },
      remove: function () {
        throw new Error(global.i18n.t("error.forbidden"));
      },
    },

    admin_permission: {
      permModule: "admin",
      permType: "admin_permission",
      pageTitleKey: "page.adminPermission",
      pageDescriptionKey: "page.adminPermission.desc",
      canExport: false,
      readOnly: true,
      canCreate: false,
      canEdit: false,
      canDelete: false,
      statusFilter: true,
      statusSwitch: true,
      columnFilters: [
        { key: "module", labelKey: "col.module" },
        { key: "type", labelKey: "col.type" },
        { key: "action", labelKey: "col.action", optionI18nPrefix: "action." },
      ],
      columns: [
        { id: "code", labelKey: "col.code" },
        { id: "module", labelKey: "col.module" },
        { id: "type", labelKey: "col.type" },
        { id: "action", labelKey: "col.action" },
        {
          id: "is_active",
          labelKey: "col.status",
          render: function (row) {
            return statusSwitchHtml(row);
          },
        },
      ],
      listRows: function () {
        return global.store
          .getAll("admin_permission")
          .filter(function (p) {
            return p.deleted_at == null;
          })
          .map(function (p) {
            return Object.assign({}, p, { _id: p.id });
          });
      },
      searchFilter: function (row, q) {
        return row.code.toLowerCase().indexOf(q) >= 0 || row.module.toLowerCase().indexOf(q) >= 0;
      },
    },

    admin_language: {
      permModule: "admin",
      permType: "admin_language",
      storeTable: "website_language",
      pageTitleKey: "page.adminLanguage",
      pageDescriptionKey: "page.adminLanguage.desc",
      sortable: true,
      statusSwitch: true,
      statusSwitchField: "is_default",
      statusSwitchExclusive: true,
      columns: [
        { id: "locale", labelKey: "col.locale" },
        { id: "name", labelKey: "col.name" },
        {
          id: "is_default",
          labelKey: "col.default",
          render: function (row) {
            return statusSwitchHtml(row, "is_default", "col.default");
          },
        },
        updatedAtColumn,
      ],
      listRows: function () {
        return global.store
          .getAll("website_language")
          .filter(function (r) {
            return r.deleted_at == null;
          })
          .map(function (r) {
            return Object.assign({}, r, { _id: r.id });
          });
      },
      searchFilter: function (row, q) {
        return row.locale.toLowerCase().indexOf(q) >= 0 || row.name.toLowerCase().indexOf(q) >= 0;
      },
      formFields: [
        { key: "locale", labelKey: "col.locale", type: "text", required: true },
        { key: "name", labelKey: "col.name", type: "text", required: true },
        { key: "is_default", labelKey: "col.default", type: "checkbox", defaultValue: false },
      ],
      getFormValues: function (id) {
        if (!id) return { is_default: false };
        var r = global.store.getById("website_language", id);
        return {
          locale: r.locale,
          name: r.name,
          is_default: r.is_default,
        };
      },
      validate: function (values) {
        return requiredValidate(values, REGISTRY.admin_language.formFields);
      },
      save: function (values, id) {
        if (values.is_default) {
          global.store.getAll("website_language").forEach(function (r, idx) {
            if (r.is_default && r.id !== id) {
              global.store.updateAt("website_language", idx, { is_default: false, updated_at: now() });
            }
          });
        }
        var existing = id ? global.store.getById("website_language", id) : null;
        var patch = {
          locale: values.locale,
          name: values.name,
          sort_order: existing ? existing.sort_order : (global.store.getAll("website_language").length + 1) * 10,
          is_default: !!values.is_default,
          updated_at: now(),
        };
        if (id) global.store.update("website_language", id, patch);
        else
          global.store.create("website_language", Object.assign(patch, { created_at: now(), deleted_at: null, created_by: 1, updated_by: 1 }));
      },
      remove: function (id) {
        global.store.update("website_language", id, { deleted_at: now(), updated_at: now() });
      },
    },

    admin_role: {
      permModule: "admin",
      permType: "admin_role",
      storeTable: "admin_role",
      pageTitleKey: "page.adminRole",
      pageDescriptionKey: "page.adminRole.desc",
      statusFilter: true,
      statusSwitch: true,
      permissionMatrix: true,
      columns: [
        { id: "name", labelKey: "col.name" },
        {
          id: "is_active",
          labelKey: "col.status",
          render: function (row) {
            return statusSwitchHtml(row);
          },
        },
        updatedAtColumn,
      ],
      listRows: function () {
        return global.store
          .getAll("admin_role")
          .filter(function (r) {
            return r.deleted_at == null;
          })
          .map(function (r) {
            return Object.assign({}, r, {
              _id: r.id,
              name: langName("admin_role_language", "admin_role_id", r.id),
            });
          });
      },
      searchFilter: function (row, q) {
        return String(row.name).toLowerCase().indexOf(q) >= 0;
      },
      formFields: [
        { key: "name_th", labelKey: "col.nameTh", type: "text", required: true },
        { key: "name_en", labelKey: "col.nameEn", type: "text", required: true },
        { key: "is_active", labelKey: "col.active", type: "checkbox", defaultValue: true },
      ],
      getFormValues: function (id) {
        if (!id) return { is_active: true, name_th: "", name_en: "" };
        return {
          name_th: langName("admin_role_language", "admin_role_id", id, "th"),
          name_en: langName("admin_role_language", "admin_role_id", id, "en"),
          is_active: global.store.getById("admin_role", id).is_active,
        };
      },
      validate: function (values) {
        return requiredValidate(values, REGISTRY.admin_role.formFields);
      },
      save: function (values, id) {
        var existing = id ? global.store.getById("admin_role", id) : null;
        var actor = global.auth && global.auth.getUser ? global.auth.getUser() : null;
        var actorId = actor ? actor.id : 1;
        var base = {
          is_active: !!values.is_active,
          updated_at: now(),
          updated_by: actorId,
        };
        var rowId = id;
        if (id) global.store.update("admin_role", id, base);
        else {
          var created = global.store.create(
            "admin_role",
            Object.assign(base, { created_at: now(), deleted_at: null, created_by: actorId })
          );
          rowId = created.id;
        }
        upsertLang("admin_role_language", "admin_role_id", rowId, "th", values.name_th);
        upsertLang("admin_role_language", "admin_role_id", rowId, "en", values.name_en);
        if (global.rolePermissionMatrix) {
          global.rolePermissionMatrix.syncRolePermissions(rowId, values._permissionIds || []);
        }
      },
      remove: function (id) {
        global.store.update("admin_role", id, { deleted_at: now(), updated_at: now() });
      },
    },

    admin_user: {
      permModule: "admin",
      permType: "admin_user",
      storeTable: "admin_user",
      pageTitleKey: "page.adminUser",
      pageDescriptionKey: "page.adminUser.desc",
      columnFilters: [
        {
          key: "admin_role_id",
          labelKey: "col.role",
          optionLabel: function (id) {
            return langName("admin_role_language", "admin_role_id", Number(id));
          },
          optionValues: adminRoleFilterValues,
        },
        {
          key: "type",
          labelKey: "col.type",
          ui: "buttonGroup",
          optionI18nPrefix: "userType.",
          optionValues: assignableAdminUserTypes,
        },
        {
          key: "status",
          labelKey: "col.status",
          ui: "buttonGroup",
          optionI18nPrefix: "userStatus.",
          optionValues: ADMIN_USER_STATUSES,
        },
      ],
      columns: [
        { id: "username", labelKey: "col.username" },
        { id: "email", labelKey: "col.email" },
        {
          id: "_roleLabel",
          labelKey: "col.role",
          render: function (row) {
            return escapeHtml(row._roleLabel || "—");
          },
        },
        {
          id: "type",
          labelKey: "col.type",
          render: function (row) {
            return escapeHtml(global.i18n.t("userType." + row.type));
          },
        },
        {
          id: "status",
          labelKey: "col.status",
          render: function (row) {
            return userStatusBadgeHtml(row.status);
          },
        },
        {
          id: "last_login_at",
          labelKey: "col.lastLogin",
          cellClass: "data-table__cell--meta data-table__cell--datetime",
          render: function (row) {
            return escapeHtml(row.last_login_at ? global.i18n.formatDateTime(row.last_login_at) : "—");
          },
        },
        updatedAtColumn,
      ],
      listRows: function () {
        return global.store
          .getAll("admin_user")
          .filter(function (r) {
            return r.deleted_at == null;
          })
          .map(function (r) {
            return Object.assign({}, r, {
              _id: r.id,
              _roleLabel: r.admin_role_id
                ? langName("admin_role_language", "admin_role_id", r.admin_role_id)
                : "—",
            });
          });
      },
      searchFilter: function (row, q) {
        return (
          String(row.username).toLowerCase().indexOf(q) >= 0 ||
          String(row.email || "").toLowerCase().indexOf(q) >= 0 ||
          String(row._roleLabel).toLowerCase().indexOf(q) >= 0
        );
      },
      formFields: [
        { key: "username", labelKey: "col.username", type: "text", required: true },
        { key: "email", labelKey: "col.email", type: "text" },
        { key: "password", labelKey: "col.password", type: "passwordGroup" },
        {
          key: "admin_role_id",
          labelKey: "col.role",
          type: "searchableSelect",
          required: true,
          rowWith: "type",
          options: activeAdminRoleSelectOptions,
        },
        {
          key: "type",
          labelKey: "col.type",
          type: "select",
          required: true,
          options: adminUserTypeSelectOptions,
        },
        {
          key: "status",
          labelKey: "col.status",
          type: "select",
          required: true,
          options: function () {
            return ADMIN_USER_STATUSES.map(function (v) {
              return { value: v, label: global.i18n.t("userStatus." + v) };
            });
          },
        },
      ],
      getFormValues: function (id) {
        if (!id) {
          return { username: "", email: "", password: "", admin_role_id: "", type: "staff", status: "active" };
        }
        var r = global.store.getById("admin_user", id);
        return {
          username: r.username,
          email: r.email || "",
          password: "",
          admin_role_id: r.admin_role_id || "",
          type: r.type,
          status: r.status,
        };
      },
      validate: function (values, id) {
        var fields = REGISTRY.admin_user.formFields.filter(function (f) {
          if (f.type === "passwordGroup") return false;
          return f.required;
        });
        var result = requiredValidate(values, fields);
        var errors = result.errors || {};
        if (!id || values._passwordChange) {
          if (!values.password) errors.password = global.i18n.t("error.required");
          if (!values.password_confirm) errors.password_confirm = global.i18n.t("error.required");
          if (
            values.password &&
            values.password_confirm &&
            values.password !== values.password_confirm
          ) {
            errors.password_confirm = global.i18n.t("error.passwordMismatch");
          }
        }
        var users = global.store.getAll("admin_user").filter(function (u) {
          return u.deleted_at == null;
        });
        if (
          users.some(function (u) {
            return u.id !== id && String(u.username).toLowerCase() === String(values.username).toLowerCase();
          })
        ) {
          errors.username = global.i18n.t("error.usernameTaken");
        }
        if (
          values.email &&
          users.some(function (u) {
            return (
              u.id !== id &&
              u.email &&
              String(u.email).toLowerCase() === String(values.email).toLowerCase()
            );
          })
        ) {
          errors.email = global.i18n.t("error.emailTaken");
        }
        return { ok: Object.keys(errors).length === 0, errors: errors };
      },
      save: function (values, id) {
        var actor = global.auth && global.auth.getUser ? global.auth.getUser() : null;
        var actorId = actor ? actor.id : 1;
        var patch = {
          username: values.username,
          email: values.email || null,
          status: values.status,
          type: values.type,
          admin_role_id: values.admin_role_id ? Number(values.admin_role_id) : null,
          updated_at: now(),
          updated_by: actorId,
        };
        if (id) {
          if (values._passwordChange && values.password) {
            patch._demo_password = values.password;
            patch.password_hash = "demo";
          }
          global.store.update("admin_user", id, patch);
        } else {
          Object.assign(patch, {
            password_hash: "demo",
            _demo_password: values.password,
            failed_login_attempts: 0,
            locked_until: null,
            last_login_at: null,
            created_at: now(),
            deleted_at: null,
            created_by: actorId,
          });
          global.store.create("admin_user", patch);
        }
      },
      remove: function (id) {
        var actor = global.auth && global.auth.getUser ? global.auth.getUser() : null;
        if (actor && actor.id === id) {
          throw new Error(global.i18n.t("error.cannotDeleteSelf"));
        }
        global.store.update("admin_user", id, { deleted_at: now(), updated_at: now() });
      },
    },
  };

  function geoConfig(key, opts) {
    var langTable = key + "_language";
    var parentKey = opts.parentFk;

    function enrichGeoFilterFields(row, r) {
      if (key === "website_district" && r.website_province_id) {
        var prov = global.store.getById("website_province", r.website_province_id);
        if (prov) row.website_country_id = prov.website_country_id;
      }
      if (key === "website_sub_district" && r.website_district_id) {
        var dist = global.store.getById("website_district", r.website_district_id);
        if (dist) {
          row.website_province_id = dist.website_province_id;
          var prov2 = global.store.getById("website_province", dist.website_province_id);
          if (prov2) row.website_country_id = prov2.website_country_id;
        }
      }
    }

    return {
      permModule: "admin",
      permType: key,
      storeTable: key,
      sortParentKey: parentKey || undefined,
      pageTitleKey: opts.pageTitleKey,
      pageDescriptionKey: opts.pageDescriptionKey,
      canImport: true,
      sortable: true,
      statusFilter: true,
      statusSwitch: true,
      columnFilters: opts.columnFilters,
      columns: [opts.parentCol]
        .concat([
          { id: "sku", labelKey: "col.sku" },
          { id: "name", labelKey: "col.name" },
          {
            id: "is_active",
            labelKey: "col.status",
            render: function (row) {
              return statusSwitchHtml(row);
            },
          },
          updatedAtColumn,
        ])
        .concat(opts.extraColumns || [])
        .filter(Boolean),
      parentOptions: opts.parentOptions,
      listRows: function () {
        return global.store
          .getAll(key)
          .filter(function (r) {
            return r.deleted_at == null;
          })
          .map(function (r) {
            var row = Object.assign({}, r, {
              _id: r.id,
              name: langName(langTable, key + "_id", r.id),
              sku: r.sku || "—",
            });
            if (parentKey && r[parentKey]) {
              row._parentLabel = opts.parentLabel(r[parentKey]);
            }
            enrichGeoFilterFields(row, r);
            if (opts.extraRow) opts.extraRow(row, r);
            return row;
          });
      },
      searchFilter: function (row, q) {
        return (
          String(row.name).toLowerCase().indexOf(q) >= 0 ||
          String(row.sku).toLowerCase().indexOf(q) >= 0 ||
          (row._parentLabel && row._parentLabel.toLowerCase().indexOf(q) >= 0)
        );
      },
      formFields: opts.formFields,
      getFormValues: function (id) {
        if (!id) {
          var defaults = { is_active: true, name_th: "", name_en: "", sku: "" };
          if (parentKey) defaults[parentKey] = opts.parentOptions()[0] ? opts.parentOptions()[0].value : "";
          if (opts.extraDefaults) Object.assign(defaults, opts.extraDefaults());
          return defaults;
        }
        var r = global.store.getById(key, id);
        var vals = {
          sku: r.sku || "",
          name_th: langName(langTable, key + "_id", id, "th"),
          name_en: langName(langTable, key + "_id", id, "en"),
          is_active: r.is_active,
        };
        if (parentKey) vals[parentKey] = r[parentKey];
        if (opts.extraGet) opts.extraGet(vals, r);
        return vals;
      },
      validate: function (values) {
        return requiredValidate(values, opts.formFields);
      },
      save: function (values, id) {
        var existing = id ? global.store.getById(key, id) : null;
        var base = {
          sku: values.sku || null,
          sort_order: existing ? existing.sort_order : (global.store.getAll(key).filter(function(r){return r.deleted_at==null;}).length + 1) * 10,
          is_active: !!values.is_active,
          updated_at: now(),
        };
        if (parentKey) base[parentKey] = Number(values[parentKey]);
        if (opts.extraSave) opts.extraSave(base, values);
        var rowId = id;
        if (id) global.store.update(key, id, base);
        else {
          var created = global.store.create(
            key,
            Object.assign(base, { created_at: now(), deleted_at: null, created_by: 1, updated_by: 1 })
          );
          rowId = created.id;
        }
        upsertLang(langTable, key + "_id", rowId, "th", values.name_th);
        upsertLang(langTable, key + "_id", rowId, "en", values.name_en);
      },
      remove: function (id) {
        global.store.update(key, id, { deleted_at: now(), updated_at: now() });
      },
    };
  }

  REGISTRY.website_country = geoConfig("website_country", {
    pageTitleKey: "page.websiteCountry",
    pageDescriptionKey: "page.websiteCountry.desc",
    parentFk: null,
    parentCol: null,
    formFields: [
      { key: "sku", labelKey: "col.sku", type: "text" },
      { key: "name_th", labelKey: "col.nameTh", type: "text", required: true },
      { key: "name_en", labelKey: "col.nameEn", type: "text", required: true },
      { key: "is_active", labelKey: "col.active", type: "checkbox", defaultValue: true },
    ],
    parentOptions: function () {
      return [];
    },
  });

  REGISTRY.website_province = geoConfig("website_province", {
    pageTitleKey: "page.websiteProvince",
    pageDescriptionKey: "page.websiteProvince.desc",
    parentFk: "website_country_id",
    columnFilters: [
      {
        key: "website_country_id",
        labelKey: "col.country",
        optionLabel: function (id) {
          return langName("website_country_language", "website_country_id", Number(id));
        },
      },
    ],
    parentCol: {
      id: "_parentLabel",
      labelKey: "col.country",
      render: function (row) {
        return row._parentLabel || "—";
      },
    },
    parentLabel: function (countryId) {
      return langName("website_country_language", "website_country_id", countryId);
    },
    parentOptions: function () {
      return global.store
        .getAll("website_country")
        .filter(function (c) {
          return c.deleted_at == null && c.is_active;
        })
        .map(function (c) {
          return { value: c.id, label: langName("website_country_language", "website_country_id", c.id) };
        });
    },
    formFields: [
      {
        key: "website_country_id",
        labelKey: "col.country",
        type: "select",
        required: true,
        options: [],
      },
      { key: "sku", labelKey: "col.sku", type: "text" },
      { key: "name_th", labelKey: "col.nameTh", type: "text", required: true },
      { key: "name_en", labelKey: "col.nameEn", type: "text", required: true },
      { key: "is_active", labelKey: "col.active", type: "checkbox", defaultValue: true },
    ],
  });

  REGISTRY.website_district = geoConfig("website_district", {
    pageTitleKey: "page.websiteDistrict",
    pageDescriptionKey: "page.websiteDistrict.desc",
    parentFk: "website_province_id",
    columnFilters: [
      {
        key: "website_country_id",
        labelKey: "col.country",
        optionLabel: function (id) {
          return langName("website_country_language", "website_country_id", Number(id));
        },
      },
      {
        key: "website_province_id",
        labelKey: "col.province",
        optionLabel: function (id) {
          return langName("website_province_language", "website_province_id", Number(id));
        },
      },
    ],
    parentCol: {
      id: "_parentLabel",
      labelKey: "col.province",
      render: function (row) {
        return row._parentLabel || "—";
      },
    },
    parentLabel: function (provinceId) {
      return langName("website_province_language", "website_province_id", provinceId);
    },
    parentOptions: function () {
      return global.store
        .getAll("website_province")
        .filter(function (p) {
          return p.deleted_at == null && p.is_active;
        })
        .map(function (p) {
          return { value: p.id, label: langName("website_province_language", "website_province_id", p.id) };
        });
    },
    formFields: [
      {
        key: "website_province_id",
        labelKey: "col.province",
        type: "select",
        required: true,
        options: [],
      },
      { key: "sku", labelKey: "col.sku", type: "text" },
      { key: "name_th", labelKey: "col.nameTh", type: "text", required: true },
      { key: "name_en", labelKey: "col.nameEn", type: "text", required: true },
      { key: "is_active", labelKey: "col.active", type: "checkbox", defaultValue: true },
    ],
  });

  function yesNoCell(val) {
    return escapeHtml(global.i18n.t(val ? "col.yes" : "col.no"));
  }

  function settingLangConfig(key, opts) {
    var langTable = key + "_language";
    var fk = key + "_id";

    return {
      permModule: "setting",
      permType: key,
      storeTable: key,
      pageTitleKey: opts.pageTitleKey,
      pageDescriptionKey: opts.pageDescriptionKey,
      canExport: false,
      canImport: false,
      sortable: opts.sortable !== false,
      statusFilter: opts.statusFilter !== false,
      statusSwitch: opts.statusSwitch !== false,
      statusSwitchField: opts.statusSwitchField,
      statusSwitchExclusive: opts.statusSwitchExclusive,
      columnFilters: opts.columnFilters,
      columns:
        opts.columns ||
        []
          .concat(opts.leadColumns || [])
          .concat([{ id: "name", labelKey: "col.name" }])
          .concat(opts.midColumns || [])
          .concat([
            {
              id: "is_active",
              labelKey: "col.status",
              render: function (row) {
                return statusSwitchHtml(row);
              },
            },
            updatedAtColumn,
          ]),
      listRows: function () {
        return global.store
          .getAll(key)
          .filter(function (r) {
            return r.deleted_at == null;
          })
          .map(function (r) {
            var row = Object.assign({}, r, {
              _id: r.id,
              name: langName(langTable, fk, r.id),
            });
            if (opts.extraRow) opts.extraRow(row, r);
            return row;
          });
      },
      searchFilter: function (row, q) {
        var base =
          String(row.name).toLowerCase().indexOf(q) >= 0 ||
          (row.code && String(row.code).toLowerCase().indexOf(q) >= 0);
        return opts.extraSearch ? base || opts.extraSearch(row, q) : base;
      },
      formFields: opts.formFields,
      getFormValues: function (id) {
        if (!id) {
          var defaults = { is_active: true, name_th: "", name_en: "" };
          if (opts.extraDefaults) Object.assign(defaults, opts.extraDefaults());
          return defaults;
        }
        var r = global.store.getById(key, id);
        var vals = {
          name_th: langName(langTable, fk, id, "th"),
          name_en: langName(langTable, fk, id, "en"),
          is_active: r.is_active,
        };
        if (opts.extraGet) opts.extraGet(vals, r);
        return vals;
      },
      validate: function (values, id) {
        var result = requiredValidate(values, opts.formFields);
        if (opts.extraValidate) {
          var extra = opts.extraValidate(values, id);
          if (!extra.ok) {
            return {
              ok: false,
              errors: Object.assign({}, result.errors, extra.errors),
            };
          }
        }
        return result;
      },
      save: function (values, id) {
        if (values.is_default) {
          global.store.getAll(key).forEach(function (r, idx) {
            if (r.is_default && r.id !== id) {
              global.store.updateAt(key, idx, { is_default: false, updated_at: now() });
            }
          });
        }
        var existing = id ? global.store.getById(key, id) : null;
        var base = {
          sort_order: existing
            ? existing.sort_order
            : (global.store.getAll(key).filter(function (r) {
                return r.deleted_at == null;
              }).length +
                1) *
              10,
          is_active: values.is_active !== undefined ? !!values.is_active : existing ? existing.is_active : true,
          updated_at: now(),
        };
        if (opts.extraSave) opts.extraSave(base, values, existing);
        var rowId = id;
        if (id) global.store.update(key, id, base);
        else {
          var created = global.store.create(
            key,
            Object.assign(base, {
              created_at: now(),
              deleted_at: null,
              created_by: 1,
              updated_by: 1,
            })
          );
          rowId = created.id;
        }
        upsertLang(langTable, fk, rowId, "th", values.name_th);
        upsertLang(langTable, fk, rowId, "en", values.name_en);
      },
      remove: function (id) {
        global.store.update(key, id, { deleted_at: now(), updated_at: now() });
      },
    };
  }

  REGISTRY.setting_bank = settingLangConfig("setting_bank", {
    pageTitleKey: "page.settingBank",
    pageDescriptionKey: "page.settingBank.desc",
    formFields: [
      { key: "name_th", labelKey: "col.nameTh", type: "text", required: true },
      { key: "name_en", labelKey: "col.nameEn", type: "text", required: true },
      { key: "is_active", labelKey: "col.active", type: "checkbox", defaultValue: true },
    ],
  });

  REGISTRY.location_location = Object.assign(
    settingLangConfig("location_location", {
      pageTitleKey: "page.locationLocation",
      pageDescriptionKey: "page.locationLocation.desc",
      formFields: [
        { key: "name_th", labelKey: "col.nameTh", type: "text", required: true },
        { key: "name_en", labelKey: "col.nameEn", type: "text", required: true },
        { key: "is_active", labelKey: "col.active", type: "checkbox", defaultValue: true },
      ],
    }),
    { permModule: "location" }
  );

  REGISTRY.setting_vat = {
    permModule: "setting",
    permType: "setting_vat",
    storeTable: "setting_vat",
    pageTitleKey: "page.settingVat",
    pageDescriptionKey: "page.settingVat.desc",
    canCreate: false,
    canDelete: false,
    canExport: false,
    canImport: false,
    sortable: false,
    showSearch: false,
    showPagination: false,
    columns: [
      {
        id: "vat_type",
        labelKey: "col.vatType",
        render: function (row) {
          return escapeHtml(global.i18n.t("vatType." + row.vat_type));
        },
      },
      { id: "rate", labelKey: "col.rate" },
      updatedAtColumn,
    ],
    listRows: function () {
      return global.store
        .getAll("setting_vat")
        .filter(function (r) {
          return r.deleted_at == null;
        })
        .map(function (r) {
          return Object.assign({}, r, { _id: r.id, rate: String(r.rate) });
        });
    },
    searchFilter: function (row, q) {
      return (
        String(row.rate).toLowerCase().indexOf(q) >= 0 ||
        global.i18n.t("vatType." + row.vat_type).toLowerCase().indexOf(q) >= 0
      );
    },
    formFields: [
      {
        key: "vat_type",
        labelKey: "col.vatType",
        type: "select",
        required: true,
        options: function () {
          return ["exclude", "include"].map(function (v) {
            return { value: v, label: global.i18n.t("vatType." + v) };
          });
        },
      },
      { key: "rate", labelKey: "col.rate", type: "number", required: true },
    ],
    getFormValues: function (id) {
      if (!id) return { vat_type: "exclude", rate: "7" };
      var r = global.store.getById("setting_vat", id);
      return { vat_type: r.vat_type, rate: String(r.rate) };
    },
    validate: function (values) {
      return requiredValidate(values, REGISTRY.setting_vat.formFields);
    },
    save: function (values, id) {
      if (!id) throw new Error(global.i18n.t("error.forbidden"));
      global.store.update("setting_vat", id, {
        vat_type: values.vat_type,
        rate: Number(values.rate),
        updated_at: now(),
      });
    },
    remove: function () {
      throw new Error(global.i18n.t("error.forbidden"));
    },
  };

  REGISTRY.setting_payment_method = settingLangConfig("setting_payment_method", {
    pageTitleKey: "page.settingPaymentMethod",
    pageDescriptionKey: "page.settingPaymentMethod.desc",
    midColumns: [
      {
        id: "is_sale",
        labelKey: "col.sale",
        render: function (row) {
          return statusSwitchHtml(row, "is_sale", "col.sale");
        },
      },
      {
        id: "is_purchase",
        labelKey: "col.purchase",
        render: function (row) {
          return statusSwitchHtml(row, "is_purchase", "col.purchase");
        },
      },
    ],
    columnFilters: [
      {
        key: "is_sale",
        labelKey: "col.sale",
        ui: "buttonGroup",
        optionValues: [true, false],
        optionLabel: function (val) {
          return global.i18n.t(val === true || val === "true" ? "col.yes" : "col.no");
        },
      },
      {
        key: "is_purchase",
        labelKey: "col.purchase",
        ui: "buttonGroup",
        optionValues: [true, false],
        optionLabel: function (val) {
          return global.i18n.t(val === true || val === "true" ? "col.yes" : "col.no");
        },
      },
    ],
    formFields: [
      { key: "name_th", labelKey: "col.nameTh", type: "text", required: true },
      { key: "name_en", labelKey: "col.nameEn", type: "text", required: true },
      { key: "is_sale", labelKey: "col.sale", type: "checkbox", defaultValue: true },
      { key: "is_purchase", labelKey: "col.purchase", type: "checkbox", defaultValue: false },
      { key: "is_active", labelKey: "col.active", type: "checkbox", defaultValue: true },
    ],
    extraDefaults: function () {
      return { is_sale: true, is_purchase: false };
    },
    extraGet: function (vals, r) {
      vals.is_sale = r.is_sale;
      vals.is_purchase = r.is_purchase;
    },
    extraSave: function (base, values) {
      base.is_sale = !!values.is_sale;
      base.is_purchase = !!values.is_purchase;
    },
  });

  REGISTRY.setting_sale_channel = settingLangConfig("setting_sale_channel", {
    pageTitleKey: "page.settingSaleChannel",
    pageDescriptionKey: "page.settingSaleChannel.desc",
    statusSwitchField: "is_default",
    statusSwitchExclusive: true,
    columns: [
      { id: "name", labelKey: "col.name" },
      {
        id: "is_default",
        labelKey: "col.default",
        render: function (row) {
          return statusSwitchHtml(row, "is_default", "col.default");
        },
      },
      {
        id: "is_active",
        labelKey: "col.status",
        render: function (row) {
          return statusSwitchHtml(row);
        },
      },
      updatedAtColumn,
    ],
    statusSwitch: true,
    formFields: [
      { key: "name_th", labelKey: "col.nameTh", type: "text", required: true },
      { key: "name_en", labelKey: "col.nameEn", type: "text", required: true },
      { key: "is_default", labelKey: "col.default", type: "checkbox", defaultValue: false },
      { key: "is_active", labelKey: "col.active", type: "checkbox", defaultValue: true },
    ],
    extraDefaults: function () {
      return { is_default: false };
    },
    extraGet: function (vals, r) {
      vals.is_default = r.is_default;
    },
    extraSave: function (base, values) {
      base.is_default = !!values.is_default;
    },
  });

  REGISTRY.setting_code = {
    permModule: "setting",
    permType: "setting_code",
    storeTable: "setting_code",
    pageTitleKey: "page.settingCode",
    pageDescriptionKey: "page.settingCode.desc",
    canExport: false,
    canImport: false,
    sortable: true,
    statusFilter: true,
    statusSwitch: true,
    columns: [
      { id: "code", labelKey: "col.settingCode" },
      { id: "value", labelKey: "col.value" },
      {
        id: "is_active",
        labelKey: "col.status",
        render: function (row) {
          return statusSwitchHtml(row);
        },
      },
      updatedAtColumn,
    ],
    listRows: function () {
      return global.store
        .getAll("setting_code")
        .filter(function (r) {
          return r.deleted_at == null;
        })
        .map(function (r) {
          return Object.assign({}, r, { _id: r.id });
        });
    },
    searchFilter: function (row, q) {
      return (
        String(row.code).toLowerCase().indexOf(q) >= 0 ||
        String(row.value).toLowerCase().indexOf(q) >= 0
      );
    },
    formFields: [
      { key: "code", labelKey: "col.settingCode", type: "text", required: true },
      { key: "value", labelKey: "col.value", type: "text", required: true },
      { key: "is_active", labelKey: "col.active", type: "checkbox", defaultValue: true },
    ],
    getFormValues: function (id) {
      if (!id) return { code: "", value: "", is_active: true };
      var r = global.store.getById("setting_code", id);
      return { code: r.code, value: r.value, is_active: r.is_active };
    },
    validate: function (values, id) {
      var result = requiredValidate(values, REGISTRY.setting_code.formFields);
      var errors = result.errors || {};
      var rows = global.store.getAll("setting_code").filter(function (r) {
        return r.deleted_at == null;
      });
      if (
        rows.some(function (r) {
          return r.id !== id && String(r.code).toLowerCase() === String(values.code).toLowerCase();
        })
      ) {
        errors.code = global.i18n.t("error.codeTaken");
      }
      return { ok: Object.keys(errors).length === 0, errors: errors };
    },
    save: function (values, id) {
      var existing = id ? global.store.getById("setting_code", id) : null;
      var patch = {
        code: values.code,
        value: values.value,
        sort_order: existing
          ? existing.sort_order
          : (global.store.getAll("setting_code").filter(function (r) {
              return r.deleted_at == null;
            }).length +
              1) *
            10,
        is_active: !!values.is_active,
        updated_at: now(),
      };
      if (id) global.store.update("setting_code", id, patch);
      else
        global.store.create(
          "setting_code",
          Object.assign(patch, { created_at: now(), deleted_at: null, created_by: 1, updated_by: 1 })
        );
    },
    remove: function (id) {
      global.store.update("setting_code", id, { deleted_at: now(), updated_at: now() });
    },
  };

  REGISTRY.setting_claim_reason = settingLangConfig("setting_claim_reason", {
    pageTitleKey: "page.settingClaimReason",
    pageDescriptionKey: "page.settingClaimReason.desc",
    midColumns: [
      {
        id: "is_claim",
        labelKey: "col.claim",
        render: function (row) {
          return statusSwitchHtml(row, "is_claim", "col.claim");
        },
      },
      {
        id: "is_return",
        labelKey: "col.return",
        render: function (row) {
          return statusSwitchHtml(row, "is_return", "col.return");
        },
      },
    ],
    columnFilters: [
      {
        key: "is_claim",
        labelKey: "col.claim",
        optionValues: [true, false],
        optionLabel: function (val) {
          return global.i18n.t(val === true || val === "true" ? "col.yes" : "col.no");
        },
      },
      {
        key: "is_return",
        labelKey: "col.return",
        optionValues: [true, false],
        optionLabel: function (val) {
          return global.i18n.t(val === true || val === "true" ? "col.yes" : "col.no");
        },
      },
    ],
    formFields: [
      { key: "name_th", labelKey: "col.nameTh", type: "text", required: true },
      { key: "name_en", labelKey: "col.nameEn", type: "text", required: true },
      { key: "is_claim", labelKey: "col.claim", type: "checkbox", defaultValue: false },
      { key: "is_return", labelKey: "col.return", type: "checkbox", defaultValue: false },
      { key: "is_active", labelKey: "col.active", type: "checkbox", defaultValue: true },
    ],
    extraDefaults: function () {
      return { is_claim: false, is_return: false };
    },
    extraGet: function (vals, r) {
      vals.is_claim = r.is_claim;
      vals.is_return = r.is_return;
    },
    extraSave: function (base, values) {
      base.is_claim = !!values.is_claim;
      base.is_return = !!values.is_return;
    },
    extraValidate: function (values) {
      if (!values.is_claim && !values.is_return) {
        return { ok: false, errors: { is_claim: global.i18n.t("error.claimReasonType") } };
      }
      return { ok: true, errors: {} };
    },
  });

  REGISTRY.setting_prefix = settingLangConfig("setting_prefix", {
    pageTitleKey: "page.settingPrefix",
    pageDescriptionKey: "page.settingPrefix.desc",
    leadColumns: [
      {
        id: "type",
        labelKey: "col.type",
        render: function (row) {
          return escapeHtml(global.i18n.t("prefixType." + row.type));
        },
      },
      { id: "code", labelKey: "col.settingCode" },
    ],
    columnFilters: [
      {
        key: "type",
        labelKey: "col.type",
        optionI18nPrefix: "prefixType.",
        optionValues: ["person", "company"],
      },
    ],
    formFields: [
      {
        key: "type",
        labelKey: "col.type",
        type: "select",
        required: true,
        options: function () {
          return ["person", "company"].map(function (v) {
            return { value: v, label: global.i18n.t("prefixType." + v) };
          });
        },
      },
      { key: "code", labelKey: "col.settingCode", type: "text", required: true },
      { key: "name_th", labelKey: "col.nameTh", type: "text", required: true },
      { key: "name_en", labelKey: "col.nameEn", type: "text", required: true },
      { key: "is_active", labelKey: "col.active", type: "checkbox", defaultValue: true },
    ],
    extraDefaults: function () {
      return { type: "person", code: "" };
    },
    extraGet: function (vals, r) {
      vals.type = r.type;
      vals.code = r.code;
    },
    extraSave: function (base, values) {
      base.type = values.type;
      base.code = values.code;
    },
    extraValidate: function (values, id) {
      var errors = {};
      var rows = global.store.getAll("setting_prefix").filter(function (r) {
        return r.deleted_at == null;
      });
      if (
        rows.some(function (r) {
          return r.id !== id && String(r.code).toLowerCase() === String(values.code).toLowerCase();
        })
      ) {
        errors.code = global.i18n.t("error.codeTaken");
      }
      return { ok: Object.keys(errors).length === 0, errors: errors };
    },
    extraSearch: function (row, q) {
      return (
        String(row.code).toLowerCase().indexOf(q) >= 0 ||
        global.i18n.t("prefixType." + row.type).toLowerCase().indexOf(q) >= 0
      );
    },
  });

  function supplierInformation(supplierUserId, type) {
    return global.store.getAll("supplier_information").find(function (r) {
      return r.supplier_user_id === supplierUserId && r.type === type;
    });
  }

  function prefixLabel(prefixId) {
    if (!prefixId) return "";
    return langName("setting_prefix_language", "setting_prefix_id", prefixId);
  }

  function formatCreditTerm(days) {
    if (days != null && days > 0) {
      return global.i18n.format("supplier.creditDays", { days: days });
    }
    return global.i18n.t("supplier.creditNone");
  }

  function deleteSupplierChildren(supplierUserId) {
    var ts = now();
    global.store.getAll("supplier_contact").forEach(function (r, idx) {
      if (r.supplier_user_id === supplierUserId && r.deleted_at == null) {
        global.store.updateAt("supplier_contact", idx, { deleted_at: ts, updated_at: ts });
      }
    });
    global.store.getAll("supplier_bank").forEach(function (r, idx) {
      if (r.supplier_user_id === supplierUserId && r.deleted_at == null) {
        global.store.updateAt("supplier_bank", idx, { deleted_at: ts, updated_at: ts });
      }
    });
    global.store
      .getAll("supplier_information")
      .filter(function (r) {
        return r.supplier_user_id === supplierUserId;
      })
      .slice()
      .reverse()
      .forEach(function (r) {
        global.store.delete("supplier_information", r.id);
      });
  }

  REGISTRY.supplier_user = {
    permModule: "supplier",
    permType: "supplier_user",
    storeTable: "supplier_user",
    pageTitleKey: "page.supplierUser",
    pageDescriptionKey: "page.supplierUser.desc",
    canExport: false,
    canImport: false,
    sortable: false,
    statusFilter: true,
    statusSwitch: true,
    formHref: function (id) {
      return id ? "supplier-user-form.html?id=" + id : "supplier-user-form.html";
    },
    columns: [
      {
        id: "sku",
        labelKey: "col.sku",
        render: function (row) {
          return (
            '<div class="data-table__stack">' +
            '<div class="data-table__stack-primary">' +
            escapeHtml(row.sku) +
            "</div>" +
            '<div class="data-table__stack-secondary">' +
            escapeHtml(global.i18n.t("col.taxNumber")) +
            ": " +
            escapeHtml(row._taxNumber || "—") +
            "</div></div>"
          );
        },
      },
      {
        id: "company",
        labelKey: "col.company",
        render: function (row) {
          return (
            '<div class="data-table__stack">' +
            '<div class="data-table__stack-primary">' +
            escapeHtml(row._companyName || "—") +
            "</div>" +
            '<div class="data-table__stack-secondary">' +
            escapeHtml(row._companyAddress || "—") +
            "</div></div>"
          );
        },
      },
      {
        id: "contact",
        labelKey: "col.contact",
        render: function (row) {
          return (
            '<div class="data-table__stack">' +
            '<div class="data-table__stack-primary">' +
            escapeHtml(row._contactTel || "—") +
            "</div>" +
            '<div class="data-table__stack-secondary">' +
            escapeHtml(row._contactEmail || "—") +
            "</div></div>"
          );
        },
      },
      {
        id: "credit_term",
        labelKey: "col.credit",
        cellClass: "data-table__cell--meta",
        render: function (row) {
          return escapeHtml(formatCreditTerm(row.credit_term));
        },
      },
      {
        id: "is_active",
        labelKey: "col.status",
        render: function (row) {
          return statusSwitchHtml(row);
        },
      },
      updatedAtColumn,
    ],
    listRows: function () {
      return global.store
        .getAll("supplier_user")
        .filter(function (r) {
          return r.deleted_at == null;
        })
        .map(function (r) {
          var contact = supplierInformation(r.id, "contact");
          var prefix = contact && contact.setting_prefix_id ? prefixLabel(contact.setting_prefix_id) : "";
          var companyName = contact && contact.name ? (prefix ? prefix + " " + contact.name : contact.name) : "";
          return Object.assign({}, r, {
            _id: r.id,
            _taxNumber: contact && contact.tax_number ? contact.tax_number : "",
            _companyName: companyName,
            _companyAddress: contact && contact.address ? contact.address : "",
            _contactTel: contact && contact.tel ? contact.tel : "",
            _contactEmail: contact && contact.email ? contact.email : "",
          });
        });
    },
    searchFilter: function (row, q) {
      return (
        String(row.sku).toLowerCase().indexOf(q) >= 0 ||
        String(row._taxNumber).toLowerCase().indexOf(q) >= 0 ||
        String(row._companyName).toLowerCase().indexOf(q) >= 0 ||
        String(row._companyAddress).toLowerCase().indexOf(q) >= 0 ||
        String(row._contactTel).toLowerCase().indexOf(q) >= 0 ||
        String(row._contactEmail).toLowerCase().indexOf(q) >= 0
      );
    },
    remove: function (id) {
      global.store.update("supplier_user", id, { deleted_at: now(), updated_at: now() });
      deleteSupplierChildren(id);
    },
  };

  REGISTRY.website_sub_district = geoConfig("website_sub_district", {
    pageTitleKey: "page.websiteSubDistrict",
    pageDescriptionKey: "page.websiteSubDistrict.desc",
    parentFk: "website_district_id",
    columnFilters: [
      {
        key: "website_country_id",
        labelKey: "col.country",
        optionLabel: function (id) {
          return langName("website_country_language", "website_country_id", Number(id));
        },
      },
      {
        key: "website_province_id",
        labelKey: "col.province",
        optionLabel: function (id) {
          return langName("website_province_language", "website_province_id", Number(id));
        },
      },
      {
        key: "website_district_id",
        labelKey: "col.district",
        optionLabel: function (id) {
          return langName("website_district_language", "website_district_id", Number(id));
        },
      },
    ],
    parentCol: {
      id: "_parentLabel",
      labelKey: "col.district",
      render: function (row) {
        return row._parentLabel || "—";
      },
    },
    extraColumns: [{ id: "postcode", labelKey: "col.postcode" }],
    extraRow: function (row, r) {
      row.postcode = r.postcode || "—";
    },
    extraDefaults: function () {
      return { postcode: "" };
    },
    extraGet: function (vals, r) {
      vals.postcode = r.postcode || "";
    },
    extraSave: function (base, values) {
      base.postcode = values.postcode || null;
    },
    parentLabel: function (districtId) {
      return langName("website_district_language", "website_district_id", districtId);
    },
    parentOptions: function () {
      return global.store
        .getAll("website_district")
        .filter(function (d) {
          return d.deleted_at == null && d.is_active;
        })
        .map(function (d) {
          return { value: d.id, label: langName("website_district_language", "website_district_id", d.id) };
        });
    },
    formFields: [
      {
        key: "website_district_id",
        labelKey: "col.district",
        type: "select",
        required: true,
        options: [],
      },
      { key: "sku", labelKey: "col.sku", type: "text" },
      { key: "postcode", labelKey: "col.postcode", type: "text" },
      { key: "name_th", labelKey: "col.nameTh", type: "text", required: true },
      { key: "name_en", labelKey: "col.nameEn", type: "text", required: true },
      { key: "is_active", labelKey: "col.active", type: "checkbox", defaultValue: true },
    ],
  });

  function get(moduleKey) {
    var cfg = REGISTRY[moduleKey];
    if (!cfg) return null;
    if (cfg.parentOptions && cfg.formFields && cfg.formFields[0] && cfg.formFields[0].type === "select") {
      cfg.formFields[0].options = cfg.parentOptions();
    }
    return cfg;
  }

  global.moduleRegistry = { get: get, REGISTRY: REGISTRY };
})(window);

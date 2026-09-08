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

  function statusSwitchHtml(row) {
    return (
      '<label class="crud-switch">' +
      '<input type="checkbox" class="crud-status-switch" role="switch" data-id="' +
      escapeHtml(row._id) +
      '"' +
      (row.is_active ? " checked" : "") +
      ' aria-label="' +
      escapeHtml(global.i18n ? global.i18n.t("col.status") : "Status") +
      '" />' +
      '<span class="crud-switch__track" aria-hidden="true"><span class="crud-switch__thumb"></span></span>' +
      "</label>"
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
      columns: [
        { id: "locale", labelKey: "col.locale" },
        { id: "name", labelKey: "col.name" },
        {
          id: "is_default",
          labelKey: "col.default",
          render: function (row) {
            return row.is_default
              ? '<span class="crud-badge crud-badge--active" data-i18n="col.yes"></span>'
              : '<span class="crud-badge crud-badge--inactive" data-i18n="col.no"></span>';
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

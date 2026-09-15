(function (global) {
  var PERM_MODULE = "member";
  var PERM_TYPE = "member_setting_business";

  function locale() {
    return global.i18n ? global.i18n.getLocale() : "th";
  }

  function t(key, params) {
    if (!global.i18n) return key;
    if (params) return global.i18n.format(key, params);
    return global.i18n.t(key);
  }

  function escapeHtml(s) {
    return String(s)
      .replace(/&/g, "&amp;")
      .replace(/</g, "&lt;")
      .replace(/>/g, "&gt;")
      .replace(/"/g, "&quot;");
  }

  function now() {
    return new Date().toISOString();
  }

  function can(action) {
    return global.permissions && global.permissions.canAction(PERM_MODULE, PERM_TYPE, action);
  }

  function activeRows(table) {
    return global.store.getAll(table).filter(function (r) {
      return r.deleted_at == null;
    });
  }

  function langName(langTable, fk, id, loc) {
    var want = loc || locale();
    var rows = global.store.getAll(langTable);
    var row = rows.find(function (r) {
      return r[fk] === id && r.locale === want;
    });
    if (row && row.name) return row.name;
    if (want !== "th") {
      var th = rows.find(function (r) {
        return r[fk] === id && r.locale === "th";
      });
      if (th && th.name) return th.name;
    }
    var en = rows.find(function (r) {
      return r[fk] === id && r.locale === "en";
    });
    return en && en.name ? en.name : "";
  }

  function upsertLang(langTable, fk, id, loc, name) {
    var rows = global.store.getAll(langTable);
    var idx = rows.findIndex(function (r) {
      return r[fk] === id && r.locale === loc;
    });
    var patch = { name: name, updated_at: now() };
    if (idx >= 0) {
      global.store.updateAt(langTable, idx, patch);
      return;
    }
    var row = { locale: loc, name: name, created_at: now(), updated_at: now() };
    row[fk] = id;
    global.store.create(langTable, row);
  }

  function creditName(id, loc) {
    return langName("member_setting_credit_language", "member_setting_credit_id", id, loc);
  }

  function groupName(id, loc) {
    return langName("member_setting_group_language", "member_setting_group_id", id, loc);
  }

  function businessName(id, loc) {
    return langName("member_setting_business_language", "member_setting_business_id", id, loc);
  }

  function lookupOptions(table, langTable, fk) {
    return activeRows(table)
      .filter(function (r) {
        return r.is_active;
      })
      .sort(function (a, b) {
        var ca = a.created_at || "";
        var cb = b.created_at || "";
        if (ca !== cb) return ca < cb ? -1 : 1;
        return a.id - b.id;
      })
      .map(function (r) {
        return { value: r.id, label: langName(langTable, fk, r.id) };
      });
  }

  function creditOptions() {
    return lookupOptions(
      "member_setting_credit",
      "member_setting_credit_language",
      "member_setting_credit_id"
    );
  }

  function groupOptions() {
    return lookupOptions(
      "member_setting_group",
      "member_setting_group_language",
      "member_setting_group_id"
    );
  }

  function relationsForBusiness(businessId) {
    return activeRows("member_setting_relation")
      .filter(function (r) {
        return r.business_id === businessId;
      })
      .sort(function (a, b) {
        var ca = a.created_at || "";
        var cb = b.created_at || "";
        if (ca !== cb) return ca < cb ? -1 : 1;
        return a.id - b.id;
      });
  }

  function findRelation(creditId, groupId, businessId) {
    return activeRows("member_setting_relation").find(function (r) {
      return r.credit_id === creditId && r.group_id === groupId && r.business_id === businessId;
    });
  }

  function comboLabel(businessId, creditId, groupId, loc) {
    var parts = [
      businessName(businessId, loc),
      creditName(creditId, loc),
      groupName(groupId, loc),
    ].filter(Boolean);
    return parts.join(" · ");
  }

  function nextChannelSortOrder() {
    return (
      activeRows("setting_sale_channel").reduce(function (m, r) {
        return Math.max(m, Number(r.sort_order) || 0);
      }, 0) + 10
    );
  }

  function createSaleChannelForRelation(relation) {
    var created = global.store.create("setting_sale_channel", {
      system_file_id: null,
      is_active: true,
      is_default: true,
      member_setting_relation_id: relation.id,
      sort_order: nextChannelSortOrder(),
      created_at: now(),
      updated_at: now(),
      deleted_at: null,
      created_by: 1,
      updated_by: 1,
    });
    upsertLang(
      "setting_sale_channel_language",
      "setting_sale_channel_id",
      created.id,
      "th",
      comboLabel(relation.business_id, relation.credit_id, relation.group_id, "th")
    );
    upsertLang(
      "setting_sale_channel_language",
      "setting_sale_channel_id",
      created.id,
      "en",
      comboLabel(relation.business_id, relation.credit_id, relation.group_id, "en")
    );
    return created;
  }

  function cartesianPairs(creditIds, groupIds) {
    var out = [];
    creditIds.forEach(function (cid) {
      groupIds.forEach(function (gid) {
        out.push([Number(cid), Number(gid)]);
      });
    });
    return out;
  }

  function pairKey(creditId, groupId) {
    return Number(creditId) + ":" + Number(groupId);
  }

  function relationChipPrefill(businessId) {
    var creditSet = {};
    var groupSet = {};
    relationsForBusiness(businessId).forEach(function (r) {
      creditSet[r.credit_id] = true;
      groupSet[r.group_id] = true;
    });
    var creditIds = Object.keys(creditSet)
      .map(Number)
      .sort(function (a, b) {
        return a - b;
      });
    var groupIds = Object.keys(groupSet)
      .map(Number)
      .sort(function (a, b) {
        return a - b;
      });
    return { creditIds: creditIds, groupIds: groupIds };
  }

  function targetPairKeys(creditIds, groupIds) {
    var target = {};
    cartesianPairs(creditIds, groupIds).forEach(function (pair) {
      target[pairKey(pair[0], pair[1])] = true;
    });
    return target;
  }

  function wouldRemoveRelations(businessId, creditIds, groupIds) {
    var target = targetPairKeys(creditIds, groupIds);
    return relationsForBusiness(businessId).some(function (r) {
      return !target[pairKey(r.credit_id, r.group_id)];
    });
  }

  function syncRelations(businessId, creditIds, groupIds) {
    var target = targetPairKeys(creditIds, groupIds);
    var removed = [];
    relationsForBusiness(businessId).forEach(function (r) {
      if (target[pairKey(r.credit_id, r.group_id)]) return;
      deleteRelation(r.id);
      removed.push(r);
    });
    var added = addRelations(businessId, creditIds, groupIds);
    return { removed: removed, created: added.created };
  }

  function addRelations(businessId, creditIds, groupIds) {
    // ponytail: cartesian product of selected credits × groups; upgrade to an explicit pair picker if product rejects N×M
    var created = [];
    var skipped = 0;
    cartesianPairs(creditIds, groupIds).forEach(function (pair) {
      var creditId = pair[0];
      var groupId = pair[1];
      if (findRelation(creditId, groupId, businessId)) {
        skipped += 1;
        return;
      }
      var rel = global.store.create("member_setting_relation", {
        credit_id: creditId,
        group_id: groupId,
        business_id: businessId,
        is_active: true,
        created_at: now(),
        updated_at: now(),
        deleted_at: null,
        created_by: 1,
        updated_by: 1,
      });
      createSaleChannelForRelation(rel);
      created.push(rel);
    });
    return { created: created, skipped: skipped };
  }

  function deleteRelation(id) {
    var ts = now();
    global.store.update("member_setting_relation", id, { deleted_at: ts, updated_at: ts });
    activeRows("setting_sale_channel").forEach(function (ch) {
      if (ch.member_setting_relation_id === id) {
        global.store.update("setting_sale_channel", ch.id, { deleted_at: ts, updated_at: ts });
      }
    });
  }

  function deleteBusiness(id) {
    var rels = relationsForBusiness(id);
    var ts = now();
    global.store.update("member_setting_business", id, { deleted_at: ts, updated_at: ts });
    rels.forEach(function (r) {
      deleteRelation(r.id);
    });
  }

  function skuTaken(sku, exceptId) {
    var needle = String(sku || "").trim().toLowerCase();
    if (!needle) return false;
    return activeRows("member_setting_business").some(function (r) {
      return r.id !== exceptId && r.sku && String(r.sku).toLowerCase() === needle;
    });
  }

  function statusSwitchHtml(id, isActive, kind) {
    return (
      '<label class="crud-switch">' +
      '<input type="checkbox" class="crud-status-switch" role="switch" data-id="' +
      escapeHtml(id) +
      '" data-kind="' +
      escapeHtml(kind || "business") +
      '"' +
      (isActive ? " checked" : "") +
      ' aria-label="' +
      escapeHtml(t("col.status")) +
      '" />' +
      '<span class="crud-switch__track" aria-hidden="true"><span class="crud-switch__thumb"></span></span>' +
      "</label>"
    );
  }

  (function selfCheckCartesian() {
    var pairs = cartesianPairs([1, 2], [3, 4]);
    if (pairs.length !== 4 || pairs[0][0] !== 1 || pairs[3][1] !== 4) {
      throw new Error("member-setting cartesian self-check failed");
    }
  })();

  global.memberSettingLib = {
    PERM_MODULE: PERM_MODULE,
    PERM_TYPE: PERM_TYPE,
    t: t,
    escapeHtml: escapeHtml,
    now: now,
    can: can,
    activeRows: activeRows,
    langName: langName,
    upsertLang: upsertLang,
    creditName: creditName,
    groupName: groupName,
    businessName: businessName,
    creditOptions: creditOptions,
    groupOptions: groupOptions,
    relationsForBusiness: relationsForBusiness,
    relationChipPrefill: relationChipPrefill,
    comboLabel: comboLabel,
    addRelations: addRelations,
    syncRelations: syncRelations,
    wouldRemoveRelations: wouldRemoveRelations,
    deleteRelation: deleteRelation,
    deleteBusiness: deleteBusiness,
    skuTaken: skuTaken,
    statusSwitchHtml: statusSwitchHtml,
  };
})(window);

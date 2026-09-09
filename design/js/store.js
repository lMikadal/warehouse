(function (global) {
  const STORAGE_KEY = "warehouse-design-store";
  const VERSION_KEY = "warehouse-design-seed-version";
  let data = {};

  function expectedSeedVersion() {
    return global.SEED_VERSION || null;
  }

  function storedSeedVersion() {
    return localStorage.getItem(VERSION_KEY);
  }

  function markSeedVersion() {
    const version = expectedSeedVersion();
    if (version) localStorage.setItem(VERSION_KEY, version);
  }

  function hasAdminUsers() {
    return Array.isArray(data.admin_user) && data.admin_user.length > 0;
  }

  function hasLegacyDashboardMenu() {
    return (data.admin_menu || []).some(function (m) {
      return m.path && /dashboard\.html/i.test(m.path);
    });
  }

  function hasMissingGeoSeed() {
    var seed = global.SEED && global.SEED.website_country;
    if (!Array.isArray(seed) || seed.length === 0) return false;
    var stored = data.website_country;
    return !Array.isArray(stored) || stored.length === 0;
  }

  function needsReseed() {
    const expected = expectedSeedVersion();
    if (expected && storedSeedVersion() !== expected) return true;
    if (hasLegacyDashboardMenu()) return true;
    if (!hasAdminUsers()) return true;
    if (hasMissingGeoSeed()) return true;
    return false;
  }

  function applySeed() {
    data = cloneSeed();
    persist();
    markSeedVersion();
  }

  function persist() {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(data));
  }

  function notifyChange(type, table) {
    if (global.realtime) global.realtime.broadcast(type, table);
    document.dispatchEvent(
      new CustomEvent("store:change", { detail: { type: type, table: table } })
    );
  }

  function cloneSeed() {
    return JSON.parse(JSON.stringify(global.SEED || {}));
  }

  function init() {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) {
      applySeed();
      return;
    }
    try {
      data = JSON.parse(raw);
    } catch {
      applySeed();
      return;
    }
    if (needsReseed()) applySeed();
  }

  function ensureTable(table) {
    if (!Array.isArray(data[table])) data[table] = [];
  }

  function getAll(table) {
    ensureTable(table);
    return data[table].slice();
  }

  function getById(table, id) {
    ensureTable(table);
    return data[table].find((row) => row.id === id) || null;
  }

  function nextId(table) {
    ensureTable(table);
    let max = 0;
    data[table].forEach((row) => {
      const id = Number(row.id);
      if (!Number.isNaN(id) && id > max) max = id;
    });
    return max + 1;
  }

  function create(table, row) {
    ensureTable(table);
    const next = { ...row };
    if (next.id == null) next.id = nextId(table);
    data[table].push(next);
    persist();
    notifyChange("create", table);
    return next;
  }

  function update(table, id, patch) {
    ensureTable(table);
    const idx = data[table].findIndex((row) => row.id === id);
    if (idx < 0) return null;
    data[table][idx] = { ...data[table][idx], ...patch, id };
    persist();
    notifyChange("update", table);
    return data[table][idx];
  }

  function updateAt(table, index, patch) {
    ensureTable(table);
    if (index < 0 || index >= data[table].length) return null;
    const row = data[table][index];
    data[table][index] = { ...row, ...patch };
    if (row.id != null) data[table][index].id = row.id;
    persist();
    notifyChange("update", table);
    return data[table][index];
  }

  function deleteAt(table, index) {
    ensureTable(table);
    if (index < 0 || index >= data[table].length) return false;
    data[table].splice(index, 1);
    persist();
    notifyChange("delete", table);
    return true;
  }

  function remove(table, id) {
    ensureTable(table);
    const before = data[table].length;
    data[table] = data[table].filter((row) => row.id !== id);
    if (data[table].length === before) return false;
    persist();
    notifyChange("delete", table);
    return true;
  }

  function reset() {
    localStorage.removeItem(STORAGE_KEY);
    localStorage.removeItem(VERSION_KEY);
    applySeed();
    notifyChange("reset", null);
  }

  global.store = {
    init,
    getAll,
    getById,
    create,
    update,
    updateAt,
    delete: remove,
    deleteAt,
    nextId,
    reset,
  };
})(window);

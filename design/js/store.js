(function (global) {
  const STORAGE_KEY = "warehouse-design-store";
  let data = {};

  function persist() {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(data));
  }

  function cloneSeed() {
    return JSON.parse(JSON.stringify(global.SEED || {}));
  }

  function init() {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) {
      data = cloneSeed();
      persist();
      return;
    }
    try {
      data = JSON.parse(raw);
    } catch {
      data = cloneSeed();
      persist();
    }
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

  function create(table, row) {
    ensureTable(table);
    const next = { ...row };
    if (next.id == null) next.id = crypto.randomUUID();
    data[table].push(next);
    persist();
    if (global.realtime) global.realtime.broadcast("create", table);
    return next;
  }

  function update(table, id, patch) {
    ensureTable(table);
    const idx = data[table].findIndex((row) => row.id === id);
    if (idx < 0) return null;
    data[table][idx] = { ...data[table][idx], ...patch, id };
    persist();
    if (global.realtime) global.realtime.broadcast("update", table);
    return data[table][idx];
  }

  function remove(table, id) {
    ensureTable(table);
    const before = data[table].length;
    data[table] = data[table].filter((row) => row.id !== id);
    if (data[table].length === before) return false;
    persist();
    if (global.realtime) global.realtime.broadcast("delete", table);
    return true;
  }

  function reset() {
    localStorage.removeItem(STORAGE_KEY);
    data = cloneSeed();
    persist();
    if (global.realtime) global.realtime.broadcast("reset", null);
  }

  global.store = {
    init,
    getAll,
    getById,
    create,
    update,
    delete: remove,
    reset,
  };
})(window);

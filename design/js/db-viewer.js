(function (global) {
  var ROW_LIMIT = 500;
  var MASK_KEYS = { password_hash: true, _demo_password: true };

  function escapeHtml(s) {
    return String(s)
      .replace(/&/g, "&amp;")
      .replace(/</g, "&lt;")
      .replace(/>/g, "&gt;")
      .replace(/"/g, "&quot;");
  }

  function formatCell(key, value) {
    if (MASK_KEYS[key]) return "***";
    if (value == null) return "";
    if (typeof value === "object") return JSON.stringify(value);
    return String(value);
  }

  function editValue(key, value) {
    if (value == null) return "";
    if (typeof value === "object") return JSON.stringify(value);
    return String(value);
  }

  function parseInputValue(raw, current) {
    var s = String(raw).trim();
    if (s === "") return null;
    if (s === "true") return true;
    if (s === "false") return false;
    if (/^-?\d+(\.\d+)?$/.test(s)) return Number(s);
    if (s.charAt(0) === "{" || s.charAt(0) === "[") {
      try {
        return JSON.parse(s);
      } catch {
        return s;
      }
    }
    if (typeof current === "number" && !Number.isNaN(Number(s))) return Number(s);
    if (typeof current === "boolean") return s === "true";
    return s;
  }

  function rowRef(row, index) {
    return row.id != null ? { kind: "id", value: row.id } : { kind: "index", value: index };
  }

  function refKey(ref) {
    return ref.kind + ":" + ref.value;
  }

  function savePatch(table, ref, patch) {
    if (!global.store) return null;
    if (ref.kind === "id") return global.store.update(table, ref.value, patch);
    return global.store.updateAt(table, ref.value, patch);
  }

  function deleteRow(table, ref) {
    if (!global.store) return false;
    if (ref.kind === "id") return global.store.delete(table, ref.value);
    return global.store.deleteAt(table, ref.value);
  }

  function toast(msg, type) {
    if (global.toast) global.toast.show(msg, type || "info");
  }

  function parseColumns(sql) {
    var match = sql.match(/CREATE TABLE\s+[a-z0-9_]+\s*\(([\s\S]*?)\);/i);
    if (!match) return [];
    var body = match[1];
    var cols = [];
    body.split("\n").forEach(function (line) {
      var trimmed = line.replace(/--.*$/, "").trim().replace(/,$/, "");
      if (!trimmed || /^CONSTRAINT\b/i.test(trimmed) || /^PRIMARY KEY\b/i.test(trimmed)) return;
      var parts = trimmed.split(/\s+/);
      if (!parts[0]) return;
      cols.push({ name: parts[0], type: parts.slice(1).join(" ") || "" });
    });
    return cols;
  }

  function groupTables(names) {
    var groups = {};
    names.forEach(function (name) {
      var key = name.indexOf("_") >= 0 ? name.split("_")[0] : name;
      if (!groups[key]) groups[key] = [];
      groups[key].push(name);
    });
    return Object.keys(groups)
      .sort()
      .map(function (key) {
        return { key: key, tables: groups[key].sort() };
      });
  }

  function rowCount(name) {
    if (!global.store) return 0;
    return global.store.getAll(name).length;
  }

  function mount(root) {
    var tables = global.SCHEMA_TABLES || [];
    var state = { table: null, filter: "", columns: [] };

    root.innerHTML =
      '<div class="db-browser">' +
      '  <header class="db-browser__header">' +
      '    <a href="../index.html" class="db-browser__back">← Hub</a>' +
      '    <h1 class="db-browser__title">Database Browser</h1>' +
      '    <p class="db-browser__meta" id="db-meta">เลือกตาราง</p>' +
      "  </header>" +
      '  <div class="db-browser__body">' +
      '    <aside class="db-browser__sidebar">' +
      '      <input type="search" class="db-browser__search" id="db-search" placeholder="ค้นหาตาราง…" />' +
      '      <div class="db-table-list" id="db-table-list"></div>' +
      "    </aside>" +
      '    <main class="db-browser__main" id="db-main">' +
      '      <p class="db-empty">เลือกตารางจากรายการด้านซ้าย</p>' +
      "    </main>" +
      "</div></div>";

    var listEl = root.querySelector("#db-table-list");
    var mainEl = root.querySelector("#db-main");
    var metaEl = root.querySelector("#db-meta");
    var searchEl = root.querySelector("#db-search");
    var schemaEl = null;
    var dataEl = null;

    function renderTableList() {
      var q = state.filter.trim().toLowerCase();
      var filtered = q ? tables.filter(function (n) { return n.indexOf(q) >= 0; }) : tables;
      var html = "";
      groupTables(filtered).forEach(function (group) {
        html += '<div class="db-table-list__group">' + escapeHtml(group.key) + "</div>";
        group.tables.forEach(function (name) {
          var count = rowCount(name);
          var active = state.table === name ? " is-active" : "";
          html +=
            '<button type="button" class="db-table-list__item' +
            active +
            '" data-table="' +
            escapeHtml(name) +
            '">' +
            '<span class="db-table-list__name">' +
            escapeHtml(name) +
            "</span>" +
            '<span class="db-table-list__badge">' +
            count +
            "</span></button>";
        });
      });
      if (!html) html = '<p class="db-empty">ไม่พบตาราง</p>';
      listEl.innerHTML = html;
      listEl.querySelectorAll("[data-table]").forEach(function (btn) {
        btn.addEventListener("click", function () {
          selectTable(btn.getAttribute("data-table"));
        });
      });
    }

    function renderSchemaSection(columns) {
      if (!columns.length) return '<p class="db-empty">ไม่พบ column definition</p>';
      var rows = columns
        .map(function (c) {
          return (
            "<tr><td>" +
            escapeHtml(c.name) +
            "</td><td><code>" +
            escapeHtml(c.type) +
            "</code></td></tr>"
          );
        })
        .join("");
      return (
        '<section class="db-panel" id="db-schema-panel">' +
        "<h2 class=\"db-panel__title\">Schema</h2>" +
        '<table class="db-data-table db-data-table--schema">' +
        "<thead><tr><th>Column</th><th>Type</th></tr></thead>" +
        "<tbody>" +
        rows +
        "</tbody></table></section>"
      );
    }

    function columnKeys(columns, rows) {
      if (columns.length) return columns.map(function (c) { return c.name; });
      if (rows.length) return Object.keys(rows[0]);
      return [];
    }

    function renderDataSection(rows, columns) {
      var keys = columnKeys(columns, rows);
      var limited = rows.slice(0, ROW_LIMIT);
      var head =
        keys.map(function (k) { return "<th>" + escapeHtml(k) + "</th>"; }).join("") +
        "<th class=\"db-row-actions\">Actions</th>";
      var body = limited
        .map(function (row, index) {
          var ref = rowRef(row, index);
          var rk = refKey(ref);
          return (
            "<tr data-row-ref=\"" +
            escapeHtml(rk) +
            "\">" +
            keys
              .map(function (k) {
                var readOnly = k === "id" && row.id != null;
                var cls = readOnly ? "" : " is-editable";
                return (
                  "<td class=\"db-data-cell" +
                  cls +
                  "\" data-col=\"" +
                  escapeHtml(k) +
                  "\" data-row-ref=\"" +
                  escapeHtml(rk) +
                  "\">" +
                  escapeHtml(formatCell(k, row[k])) +
                  "</td>"
                );
              })
              .join("") +
            '<td class="db-row-actions">' +
            '<button type="button" class="btn db-row-delete" data-row-ref="' +
            escapeHtml(rk) +
            '">ลบ</button></td></tr>'
          );
        })
        .join("");
      var note =
        rows.length > ROW_LIMIT
          ? '<p class="db-panel__note">แสดง ' + ROW_LIMIT + " / " + rows.length + " rows</p>"
          : rows.length === 0
            ? '<p class="db-panel__note">0 rows</p>'
            : "";
      return (
        '<section class="db-panel" id="db-data-panel">' +
        '<h2 class="db-panel__title">Data</h2>' +
        '<div class="db-panel__toolbar">' +
        '<button type="button" class="btn btn--primary" id="db-add-row">+ เพิ่มแถว</button>' +
        '<span class="db-panel__hint">คลิก cell เพื่อแก้ไข</span>' +
        "</div>" +
        note +
        (keys.length
          ? '<div class="db-data-table-wrap">' +
            '<table class="db-data-table"><thead><tr>' +
            head +
            "</tr></thead><tbody>" +
            (body || "") +
            "</tbody></table></div>"
          : '<p class="db-empty">ไม่มี column definition</p>') +
        "</section>"
      );
    }

    function resolveRef(refKeyStr) {
      var parts = refKeyStr.split(":");
      return { kind: parts[0], value: parts[0] === "id" ? Number(parts[1]) : Number(parts[1]) };
    }

    function refreshData() {
      if (!state.table || !dataEl) return;
      var rows = global.store ? global.store.getAll(state.table) : [];
      metaEl.textContent = state.table + " — " + rows.length + " row(s)";
      dataEl.outerHTML = renderDataSection(rows, state.columns);
      dataEl = mainEl.querySelector("#db-data-panel");
      bindDataEvents();
      renderTableList();
    }

    function startEdit(cell) {
      if (cell.classList.contains("is-editing")) return;
      var col = cell.getAttribute("data-col");
      var rk = cell.getAttribute("data-row-ref");
      var ref = resolveRef(rk);
      var row =
        ref.kind === "id"
          ? global.store.getById(state.table, ref.value)
          : global.store.getAll(state.table)[ref.value];
      if (!row) return;

      var current = row[col];
      cell.classList.add("is-editing");
      cell.innerHTML =
        '<input type="text" class="db-cell-input" value="' +
        escapeAttr(editValue(col, current)) +
        '" data-col="' +
        escapeHtml(col) +
        '" data-row-ref="' +
        escapeHtml(rk) +
        '" />';
      var input = cell.querySelector(".db-cell-input");
      input.focus();
      input.select();

      function cancel() {
        cell.classList.remove("is-editing");
        cell.textContent = formatCell(col, current);
      }

      function commit() {
        var next = parseInputValue(input.value, current);
        if (next === current || (next == null && current == null)) {
          cancel();
          return;
        }
        var saved = savePatch(state.table, ref, (function () {
          var p = {};
          p[col] = next;
          return p;
        })());
        if (!saved) {
          toast("บันทึกไม่สำเร็จ", "error");
          cancel();
          return;
        }
        toast("บันทึกแล้ว");
        refreshData();
      }

      input.addEventListener("blur", commit);
      input.addEventListener("keydown", function (e) {
        if (e.key === "Enter") {
          e.preventDefault();
          input.blur();
        }
        if (e.key === "Escape") {
          e.preventDefault();
          input.removeEventListener("blur", commit);
          cancel();
        }
      });
    }

    function escapeAttr(s) {
      return escapeHtml(s).replace(/"/g, "&quot;");
    }

    function bindDataEvents() {
      if (!dataEl) return;
      dataEl.querySelectorAll(".db-data-cell.is-editable").forEach(function (cell) {
        cell.addEventListener("click", function () {
          startEdit(cell);
        });
      });
      dataEl.querySelectorAll(".db-row-delete").forEach(function (btn) {
        btn.addEventListener("click", function () {
          if (!confirm("ลบแถวนี้?")) return;
          var ref = resolveRef(btn.getAttribute("data-row-ref"));
          if (!deleteRow(state.table, ref)) {
            toast("ลบไม่สำเร็จ", "error");
            return;
          }
          toast("ลบแล้ว");
          refreshData();
        });
      });
      var addBtn = dataEl.querySelector("#db-add-row");
      if (addBtn) {
        addBtn.addEventListener("click", function () {
          if (!global.store) return;
          global.store.create(state.table, {});
          toast("เพิ่มแถวแล้ว");
          refreshData();
        });
      }
    }

    function selectTable(name) {
      state.table = name;
      state.columns = [];
      renderTableList();
      metaEl.textContent = name + " — loading…";
      mainEl.innerHTML = '<p class="db-empty">Loading…</p>';
      schemaEl = null;
      dataEl = null;

      fetch("../schema/" + name + ".sql")
        .then(function (res) {
          if (!res.ok) throw new Error("schema not found");
          return res.text();
        })
        .then(function (sql) {
          state.columns = parseColumns(sql);
          var rows = global.store ? global.store.getAll(name) : [];
          metaEl.textContent = name + " — " + rows.length + " row(s)";
          mainEl.innerHTML = renderSchemaSection(state.columns) + renderDataSection(rows, state.columns);
          schemaEl = mainEl.querySelector("#db-schema-panel");
          dataEl = mainEl.querySelector("#db-data-panel");
          bindDataEvents();
        })
        .catch(function () {
          metaEl.textContent = name + " — error";
          mainEl.innerHTML = '<p class="db-empty">โหลด schema ไม่สำเร็จ</p>';
        });
    }

    searchEl.addEventListener("input", function () {
      state.filter = searchEl.value;
      renderTableList();
    });

    renderTableList();
  }

  global.dbViewer = { mount: mount, parseColumns: parseColumns, parseInputValue: parseInputValue };
})(window);

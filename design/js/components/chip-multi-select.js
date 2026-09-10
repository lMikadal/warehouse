(function (global) {
  function escapeHtml(s) {
    return String(s)
      .replace(/&/g, "&amp;")
      .replace(/</g, "&lt;")
      .replace(/>/g, "&gt;")
      .replace(/"/g, "&quot;");
  }

  function escapeAttr(s) {
    return escapeHtml(s).replace(/'/g, "&#39;");
  }

  function parseJsonAttr(el, name, fallback) {
    try {
      var raw = el.getAttribute(name);
      if (raw == null || raw === "") return fallback;
      return JSON.parse(raw);
    } catch (e) {
      return fallback;
    }
  }

  function getSelectedIds(scope, id) {
    var el = null;
    if (scope && scope.id === id) el = scope;
    else if (scope && scope.querySelector) el = scope.querySelector("#" + id);
    else el = document.getElementById(id);
    if (!el) return [];
    return parseJsonAttr(el, "data-selected", []).map(String);
  }

  function setSelected(el, ids) {
    el.setAttribute("data-selected", JSON.stringify(ids.map(String)));
  }

  function parseOptions(el) {
    return parseJsonAttr(el, "data-options", []);
  }

  function labelForOption(options, value) {
    var o = options.find(function (x) {
      return String(x.value) === String(value);
    });
    return o && o.label ? o.label : String(value);
  }

  function placeholderText(el) {
    if (global.i18n && el.getAttribute("data-placeholder-label-key")) {
      var key = el.getAttribute("data-placeholder-label-key");
      return global.i18n.format("form.placeholder.select", { label: global.i18n.t(key) });
    }
    return el.getAttribute("data-placeholder") || "";
  }

  function renderChips(el) {
    var options = parseOptions(el);
    var selected = getSelectedIds(el, el.id);
    var chipsEl = el.querySelector(".chip-multi-select__chips");
    if (!chipsEl) return;
    var removeLabel = global.i18n ? global.i18n.t("crud.delete") : "Remove";
    if (!selected.length) {
      chipsEl.innerHTML =
        '<span class="chip-multi-select__placeholder">' + escapeHtml(placeholderText(el)) + "</span>";
      return;
    }
    chipsEl.innerHTML = selected
      .map(function (id) {
        return (
          '<span class="chip-multi-select__chip" data-value="' +
          escapeAttr(id) +
          '">' +
          '<span class="chip-multi-select__chip-label">' +
          escapeHtml(labelForOption(options, id)) +
          "</span>" +
          '<button type="button" class="chip-multi-select__chip-remove" aria-label="' +
          escapeAttr(removeLabel) +
          '">' +
          '<img src="../assets/icons/x.svg" alt="" width="12" height="12" /></button></span>'
        );
      })
      .join("");
  }

  function renderDropdown(el, open) {
    var dropdown = el.querySelector(".chip-multi-select__dropdown");
    var control = el.querySelector(".chip-multi-select__control");
    if (!dropdown || !control) return;
    if (!open) {
      dropdown.hidden = true;
      control.setAttribute("aria-expanded", "false");
      return;
    }
    var options = parseOptions(el);
    var selected = getSelectedIds(el, el.id);
    var available = options.filter(function (o) {
      return selected.indexOf(String(o.value)) < 0;
    });
    control.setAttribute("aria-expanded", "true");
    dropdown.hidden = false;
    if (!available.length) {
      dropdown.innerHTML = '<p class="chip-multi-select__empty" data-i18n="crud.empty"></p>';
    } else {
      dropdown.innerHTML = available
        .map(function (o) {
          return (
            '<button type="button" class="chip-multi-select__option" data-value="' +
            escapeAttr(o.value) +
            '">' +
            escapeHtml(o.label) +
            "</button>"
          );
        })
        .join("");
    }
    if (global.i18n) global.i18n.init();
  }

  function fieldHtml(opts) {
    opts = opts || {};
    var id = opts.id || "chip-multi-select";
    var selected = (opts.selectedIds || []).map(String);
    var options = opts.options || [];
    var labelKey = opts.labelKey || "";
    var placeholderLabelKey = opts.placeholderLabelKey || labelKey;
    return (
      '<div class="form-field">' +
      '<label for="' +
      escapeAttr(id) +
      '-control"><span data-i18n="' +
      escapeHtml(labelKey) +
      '"></span></label>' +
      '<div class="chip-multi-select" id="' +
      escapeAttr(id) +
      '" data-chip-multi-select data-options="' +
      escapeAttr(JSON.stringify(options)) +
      '" data-selected="' +
      escapeAttr(JSON.stringify(selected)) +
      '" data-placeholder-label-key="' +
      escapeAttr(placeholderLabelKey) +
      '">' +
      '<div class="chip-multi-select__field">' +
      '<div id="' +
      escapeAttr(id) +
      '-control" class="chip-multi-select__control" tabindex="0" role="combobox" aria-expanded="false">' +
      '<div class="chip-multi-select__chips"></div></div>' +
      '<button type="button" class="chip-multi-select__toggle" aria-haspopup="listbox">' +
      '<img src="../assets/icons/chevron-down.svg" alt="" width="16" height="16" /></button></div>' +
      '<div class="chip-multi-select__dropdown" hidden role="listbox"></div></div></div>'
    );
  }

  function bind(scope, id, options) {
    scope = scope || document;
    options = options || {};
    var el = scope.querySelector("#" + id);
    if (!el) return;

    function notifyChange(action, value) {
      if (typeof options.onChange === "function") {
        options.onChange(getSelectedIds(el, el.id), { action: action, value: value });
      }
    }

    var dismissHandler = null;

    function unbindDismiss() {
      if (dismissHandler) {
        document.removeEventListener("mousedown", dismissHandler);
        dismissHandler = null;
      }
    }

    function closeDropdown() {
      renderDropdown(el, false);
      unbindDismiss();
    }

    function openDropdown() {
      renderDropdown(el, true);
      unbindDismiss();
      dismissHandler = function (e) {
        if (!el.contains(e.target)) closeDropdown();
      };
      document.addEventListener("mousedown", dismissHandler);
    }

    function toggleDropdown() {
      var dropdown = el.querySelector(".chip-multi-select__dropdown");
      if (dropdown && dropdown.hidden) openDropdown();
      else closeDropdown();
    }

    renderChips(el);
    renderDropdown(el, false);

    var toggle = el.querySelector(".chip-multi-select__toggle");
    if (toggle) {
      toggle.addEventListener("click", function (e) {
        e.preventDefault();
        e.stopPropagation();
        toggleDropdown();
      });
    }

    var control = el.querySelector(".chip-multi-select__control");
    if (control) {
      control.addEventListener("click", function (e) {
        if (e.target.closest(".chip-multi-select__chip-remove")) return;
        openDropdown();
      });
      control.addEventListener("keydown", function (e) {
        if (e.key === "Escape") {
          e.preventDefault();
          closeDropdown();
        }
      });
    }

    el.addEventListener("click", function (e) {
      var rem = e.target.closest(".chip-multi-select__chip-remove");
      if (rem) {
        e.preventDefault();
        e.stopPropagation();
        var chip = rem.closest(".chip-multi-select__chip");
        if (!chip) return;
        var val = chip.getAttribute("data-value");
        var selected = getSelectedIds(el, el.id).filter(function (x) {
          return x !== val;
        });
        setSelected(el, selected);
        renderChips(el);
        var dropdown = el.querySelector(".chip-multi-select__dropdown");
        renderDropdown(el, dropdown && !dropdown.hidden);
        notifyChange("remove", val);
        return;
      }
      var opt = e.target.closest(".chip-multi-select__option");
      if (opt) {
        e.preventDefault();
        var optId = opt.getAttribute("data-value");
        var selected = getSelectedIds(el, el.id);
        if (selected.indexOf(String(optId)) < 0) selected.push(String(optId));
        setSelected(el, selected);
        renderChips(el);
        renderDropdown(el, true);
        notifyChange("add", optId);
      }
    });
  }

  global.chipMultiSelect = {
    fieldHtml: fieldHtml,
    bind: bind,
    getSelectedIds: getSelectedIds,
  };
})(window);

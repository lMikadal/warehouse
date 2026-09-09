(function (global) {
  var DEFAULT_GROUPS = [1, 4, 5, 2, 1];
  var DEFAULT_MAX = 13;

  function escapeHtml(s) {
    return String(s)
      .replace(/&/g, "&amp;")
      .replace(/</g, "&lt;")
      .replace(/>/g, "&gt;")
      .replace(/"/g, "&quot;");
  }

  function digitsOnly(value) {
    // ponytail: normalize Thai digits ๐-๙ before ASCII strip
    return String(value || "")
      .replace(/[\u0E50-\u0E59]/g, function (ch) {
        return String(ch.charCodeAt(0) - 0x0e50);
      })
      .replace(/\D/g, "");
  }

  function totalLength(groups) {
    return groups.reduce(function (sum, n) {
      return sum + n;
    }, 0);
  }

  function slots(root) {
    if (!root) return [];
    return Array.prototype.slice.call(root.querySelectorAll(".otp-input__slot"));
  }

  function hiddenInput(root) {
    return root ? root.querySelector('input[type="hidden"].otp-input__value') : null;
  }

  function syncHidden(root) {
    var hidden = hiddenInput(root);
    if (!hidden) return;
    hidden.value = getValue(root);
  }

  function getValue(root) {
    return slots(root)
      .map(function (el) {
        return el.value || "";
      })
      .join("");
  }

  function setValue(root, value) {
    var max = Number(root.getAttribute("data-max-length")) || DEFAULT_MAX;
    var chars = digitsOnly(value).slice(0, max).split("");
    slots(root).forEach(function (el, i) {
      el.value = chars[i] || "";
    });
    syncHidden(root);
  }

  function focusSlot(root, index) {
    var list = slots(root);
    if (index < 0 || index >= list.length) return;
    list[index].focus();
    list[index].select();
  }

  function firstEmptyIndex(root) {
    var list = slots(root);
    for (var i = 0; i < list.length; i++) {
      if (!list[i].value) return i;
    }
    return list.length - 1;
  }

  function distributePaste(root, text) {
    setValue(root, text);
    focusSlot(root, Math.min(digitsOnly(text).length, slots(root).length - 1));
  }

  function render(opts) {
    opts = opts || {};
    var id = opts.id || "otp";
    var labelKey = opts.labelKey || "";
    var groups = opts.groups || DEFAULT_GROUPS.slice();
    var maxLength = opts.maxLength || totalLength(groups);
    var value = digitsOnly(opts.value).slice(0, maxLength);
    var chars = value.split("");
    var slotIndex = 0;
    var groupsHtml = groups
      .map(function (size, groupIdx) {
        var cells = "";
        for (var i = 0; i < size; i++) {
          var idx = slotIndex;
          var char = chars[idx] || "";
          cells +=
            '<input type="text" inputmode="numeric" pattern="[0-9]*" maxlength="1" ' +
            'class="otp-input__slot" data-otp-index="' +
            idx +
            '" id="' +
            escapeHtml(id) +
            "-slot-" +
            idx +
            '" value="' +
            escapeHtml(char) +
            '" autocomplete="off" aria-label="' +
            escapeHtml(String(idx + 1)) +
            '" />';
          slotIndex += 1;
        }
        var sep =
          groupIdx < groups.length - 1
            ? '<span class="otp-input__sep" aria-hidden="true">-</span>'
            : "";
        return '<span class="otp-input__group">' + cells + "</span>" + sep;
      })
      .join("");

    return (
      '<div class="form-field otp-input-wrap" data-otp-input data-max-length="' +
      maxLength +
      '">' +
      (labelKey
        ? '<label><span data-i18n="' + escapeHtml(labelKey) + '"></span></label>'
        : "") +
      '<div class="otp-input" role="group" aria-labelledby="' +
      escapeHtml(id) +
      '-label">' +
      groupsHtml +
      "</div>" +
      '<input type="hidden" class="otp-input__value" id="' +
      escapeHtml(id) +
      '" name="' +
      escapeHtml(id) +
      '" value="' +
      escapeHtml(value) +
      '" />' +
      '<div class="form-field__error-slot"><span class="form-field__error" hidden></span></div>' +
      "</div>"
    );
  }

  function bind(root) {
    if (!root || root.__otpBound) return;
    root.__otpBound = true;

    slots(root).forEach(function (input, index) {
      input.addEventListener("focus", function () {
        input.select();
      });

      input.addEventListener("keydown", function (e) {
        if (e.key === "ArrowLeft") {
          e.preventDefault();
          focusSlot(root, index - 1);
          return;
        }
        if (e.key === "ArrowRight") {
          e.preventDefault();
          focusSlot(root, index + 1);
          return;
        }
        if (e.key === "Backspace") {
          if (input.value) {
            input.value = "";
            syncHidden(root);
            return;
          }
          e.preventDefault();
          focusSlot(root, index - 1);
          return;
        }
        if (e.key === "Delete") {
          input.value = "";
          syncHidden(root);
        }
      });

      input.addEventListener("input", function () {
        var digit = digitsOnly(input.value).slice(-1);
        input.value = digit;
        syncHidden(root);
        if (digit && index < slots(root).length - 1) {
          focusSlot(root, index + 1);
        }
      });

      input.addEventListener("paste", function (e) {
        e.preventDefault();
        var text = (e.clipboardData || window.clipboardData).getData("text");
        distributePaste(root, text);
      });
    });

    syncHidden(root);
  }

  // ponytail: self-check — split/join 13-digit tax id groups
  (function selfCheck() {
    var sample = "0105551234567";
    if (digitsOnly(sample).length !== DEFAULT_MAX) {
      throw new Error("otp-input self-check failed: expected 13 digits");
    }
    if (totalLength(DEFAULT_GROUPS) !== DEFAULT_MAX) {
      throw new Error("otp-input self-check failed: group sum mismatch");
    }
  })();

  global.otpInput = {
    render: render,
    bind: bind,
    getValue: getValue,
    setValue: setValue,
    DEFAULT_GROUPS: DEFAULT_GROUPS,
  };
})(window);

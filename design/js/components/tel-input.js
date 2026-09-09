(function (global) {
  function sanitize(value) {
    // ponytail: normalize Thai digits ๐-๙ before ASCII strip
    return String(value || "")
      .replace(/[\u0E50-\u0E59]/g, function (ch) {
        return String(ch.charCodeAt(0) - 0x0e50);
      })
      .replace(/[^0-9-]/g, "");
  }

  function applySanitize(input) {
    var next = sanitize(input.value);
    if (next !== input.value) {
      input.value = next;
    }
  }

  function bind(root) {
    if (!root) return;
    root.querySelectorAll('input[type="tel"]').forEach(function (input) {
      if (input.__telBound) return;
      input.__telBound = true;

      input.addEventListener("input", function () {
        applySanitize(input);
      });

      input.addEventListener("paste", function (e) {
        e.preventDefault();
        var text = (e.clipboardData || window.clipboardData).getData("text");
        input.value = sanitize(input.value + text);
      });
    });
  }

  // ponytail: self-check — digits + hyphen only
  (function selfCheck() {
    if (sanitize("02-1234567") !== "02-1234567") {
      throw new Error("tel-input self-check failed: hyphenated number");
    }
    if (sanitize("asfd") !== "") {
      throw new Error("tel-input self-check failed: letters stripped");
    }
  })();

  global.telInput = { bind: bind, sanitize: sanitize };
})(window);

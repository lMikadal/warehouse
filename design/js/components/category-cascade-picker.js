(function (global) {
  var overlayEl = null;
  var pickerPath = [];
  var searchQuery = "";
  var searchHits = [];
  var onConfirmCb = null;
  var searchDismissHandler = null;

  function t(key, params) {
    if (!global.i18n) return key;
    return params ? global.i18n.format(key, params) : global.i18n.t(key);
  }

  function locale() {
    return global.i18n ? global.i18n.getLocale() : "th";
  }

  function escapeHtml(s) {
    return String(s)
      .replace(/&/g, "&amp;")
      .replace(/</g, "&lt;")
      .replace(/>/g, "&gt;")
      .replace(/"/g, "&quot;");
  }

  function attrName(attrId, loc) {
    loc = loc || locale();
    var rows = global.store.getAll("product_attribute_language");
    var row = rows.find(function (r) {
      return r.product_attribute_id === attrId && r.locale === loc;
    });
    if (row && row.name) return row.name;
    row = rows.find(function (r) {
      return r.product_attribute_id === attrId && r.locale === "th";
    });
    return row && row.name ? row.name : "";
  }

  function categoryRows() {
    return global.store
      .getAll("product_attribute")
      .filter(function (r) {
        return r.deleted_at == null && r.type === "category" && r.is_active;
      })
      .sort(function (a, b) {
        return a.sort_order - b.sort_order || a.id - b.id;
      });
  }

  function childrenOf(parentId) {
    return categoryRows().filter(function (r) {
      return parentId == null ? r.parent_id == null : r.parent_id === parentId;
    });
  }

  function hasChildren(id) {
    return childrenOf(id).length > 0;
  }

  function pathFromId(id) {
    if (id == null || id === "") return [];
    var chain = [];
    var node = global.store.getById("product_attribute", Number(id));
    while (node && node.type === "category" && node.deleted_at == null) {
      chain.unshift(node.id);
      node = node.parent_id != null ? global.store.getById("product_attribute", node.parent_id) : null;
    }
    return chain;
  }

  function breadcrumbLabel(path) {
    if (!path || !path.length) return "";
    return path
      .map(function (id) {
        return attrName(id);
      })
      .filter(Boolean)
      .join(" > ");
  }

  function rowMatchesSearch(row, q) {
    if (!q) return false;
    var th = global.store
      .getAll("product_attribute_language")
      .find(function (r) {
        return r.product_attribute_id === row.id && r.locale === "th";
      });
    var en = global.store
      .getAll("product_attribute_language")
      .find(function (r) {
        return r.product_attribute_id === row.id && r.locale === "en";
      });
    var hay = ((th && th.name) || "") + " " + ((en && en.name) || "");
    return hay.toLowerCase().indexOf(q) >= 0;
  }

  function updateSearchHits() {
    var q = searchQuery.trim().toLowerCase();
    if (q.length < 1) {
      searchHits = [];
      return;
    }
    searchHits = categoryRows().filter(function (r) {
      return rowMatchesSearch(r, q);
    });
  }

  function columnCount() {
    if (!pickerPath.length) return 1;
    var last = pickerPath[pickerPath.length - 1];
    return hasChildren(last) ? pickerPath.length + 1 : pickerPath.length;
  }

  function columnsHtml() {
    var cols = [];
    var numCols = columnCount();
    for (var d = 0; d < numCols; d++) {
      var parentId = d === 0 ? null : pickerPath[d - 1];
      if (d > 0 && pickerPath[d - 1] == null) break;
      var items = childrenOf(parentId);
      if (!items.length && d > 0) break;
      var activeId = pickerPath[d] != null ? pickerPath[d] : null;
      var rows = items
        .map(function (row) {
          var active = activeId === row.id;
          var kids = hasChildren(row.id);
          return (
            '<button type="button" class="category-cascade__item' +
            (active ? " category-cascade__item--active" : "") +
            (kids ? " category-cascade__item--has-children" : "") +
            '" data-id="' +
            row.id +
            '" data-depth="' +
            d +
            '">' +
            '<span class="category-cascade__item-label">' +
            escapeHtml(attrName(row.id)) +
            "</span>" +
            (kids
              ? '<img src="../assets/icons/chevron-right.svg" alt="" width="14" height="14" class="category-cascade__chevron" />'
              : "") +
            "</button>"
          );
        })
        .join("");
      cols.push('<div class="category-cascade__col" data-depth="' + d + '">' + rows + "</div>");
    }
    if (!cols.length) {
      cols.push('<div class="category-cascade__col"><p class="category-cascade__empty" data-i18n="crud.empty"></p></div>');
    }
    return cols.join("");
  }

  function searchResultsHtml() {
    if (!searchHits.length) {
      return '<p class="category-cascade__search-empty" data-i18n="crud.empty"></p>';
    }
    return (
      '<div class="category-cascade__search-results">' +
      searchHits
        .map(function (row) {
          var path = pathFromId(row.id);
          var name = attrName(row.id);
          var crumb = breadcrumbLabel(path);
          var pathHtml =
            crumb && crumb !== name
              ? '<span class="category-cascade__search-hit-path">' + escapeHtml(crumb) + "</span>"
              : "";
          return (
            '<button type="button" class="category-cascade__search-hit" data-id="' +
            row.id +
            '">' +
            '<span class="category-cascade__search-hit-name">' +
            escapeHtml(name) +
            "</span>" +
            pathHtml +
            "</button>"
          );
        })
        .join("") +
      "</div>"
    );
  }

  function clearSearchInput() {
    searchQuery = "";
    searchHits = [];
    if (!overlayEl) return;
    var searchInput = overlayEl.querySelector("#category-cascade-search");
    if (searchInput) searchInput.value = "";
  }

  function unbindSearchDismiss() {
    if (searchDismissHandler) {
      document.removeEventListener("mousedown", searchDismissHandler);
      searchDismissHandler = null;
    }
  }

  function bindSearchDismiss() {
    unbindSearchDismiss();
    if (!overlayEl || searchQuery.trim().length < 1) return;
    searchDismissHandler = function (e) {
      if (!overlayEl || overlayEl.hidden) return;
      var field = overlayEl.querySelector(".category-cascade__search-field");
      if (field && field.contains(e.target)) return;
      clearSearchInput();
      renderModalBody();
    };
    document.addEventListener("mousedown", searchDismissHandler);
  }

  function renderModalBody() {
    if (!overlayEl) return;
    var cols = overlayEl.querySelector(".category-cascade__columns");
    var pathEl = overlayEl.querySelector(".category-cascade__footer-path-value");
    var dropdown = overlayEl.querySelector("#category-cascade-search-dropdown");
    if (cols) {
      cols.innerHTML = columnsHtml();
      cols.hidden = false;
    }
    var searchOpen = searchQuery.trim().length >= 1;
    if (dropdown) {
      dropdown.hidden = !searchOpen;
      dropdown.innerHTML = searchOpen ? searchResultsHtml() : "";
    }
    if (pathEl) {
      pathEl.textContent = breadcrumbLabel(pickerPath) || "—";
    }
    if (global.i18n) global.i18n.init();
    bindColumnEvents();
    bindSearchHitEvents();
    if (searchOpen) bindSearchDismiss();
    else unbindSearchDismiss();
  }

  function bindColumnEvents() {
    if (!overlayEl) return;
    overlayEl.querySelectorAll(".category-cascade__item").forEach(function (btn) {
      btn.addEventListener("click", function () {
        var id = Number(btn.getAttribute("data-id"));
        var depth = Number(btn.getAttribute("data-depth"));
        pickerPath = pickerPath.slice(0, depth);
        pickerPath[depth] = id;
        if (hasChildren(id)) {
          pickerPath = pickerPath.slice(0, depth + 1);
        } else {
          pickerPath = pickerPath.slice(0, depth + 1);
        }
        clearSearchInput();
        renderModalBody();
      });
    });
  }

  function bindSearchHitEvents() {
    if (!overlayEl) return;
    overlayEl.querySelectorAll(".category-cascade__search-hit").forEach(function (btn) {
      btn.addEventListener("click", function () {
        var id = Number(btn.getAttribute("data-id"));
        pickerPath = pathFromId(id);
        clearSearchInput();
        renderModalBody();
      });
    });
  }

  function close() {
    if (!overlayEl) return;
    unbindSearchDismiss();
    overlayEl.hidden = true;
    document.body.classList.remove("modal-open");
    onConfirmCb = null;
  }

  function confirm() {
    if (!pickerPath.length) {
      if (global.toast) global.toast.show(t("error.required"), "error");
      return;
    }
    var id = pickerPath[pickerPath.length - 1];
    var label = breadcrumbLabel(pickerPath);
    if (onConfirmCb) onConfirmCb(id, label);
    close();
  }

  function ensureOverlay() {
    if (overlayEl) return;
    overlayEl = document.createElement("div");
    overlayEl.className = "modal-overlay";
    overlayEl.hidden = true;
    document.body.appendChild(overlayEl);
  }

  function open(options) {
    options = options || {};
    ensureOverlay();
    onConfirmCb = options.onConfirm || null;
    var startId = options.valueId != null && options.valueId !== "" ? Number(options.valueId) : null;
    pickerPath = startId ? pathFromId(startId) : [];
    searchQuery = "";
    searchHits = [];

    overlayEl.innerHTML =
      '<div class="modal crud-modal crud-modal--wide category-cascade" role="dialog" aria-modal="true">' +
      '<div class="modal__header">' +
      '<h2 class="modal__title" data-i18n="productListForm.categoryDialogTitle"></h2>' +
      '<button type="button" class="modal__close category-cascade__close" aria-label="Close">' +
      '<img src="../assets/icons/x.svg" alt="" width="18" height="18" /></button></div>' +
      '<div class="modal__content category-cascade__body">' +
      '<div class="category-cascade__toolbar">' +
      '<div class="category-cascade__search-wrap">' +
      '<div class="category-cascade__search-field">' +
      '<input type="search" id="category-cascade-search" class="crud-toolbar__search category-cascade__search" data-i18n-placeholder="productListForm.categorySearchPlaceholder" placeholder="ค้นหา" autocomplete="off" />' +
      '<div id="category-cascade-search-dropdown" class="category-cascade__search-dropdown" hidden></div>' +
      "</div></div>" +
      '<div class="category-cascade__settings">' +
      '<a href="product-category.html" class="category-cascade__settings-link" data-i18n="productListForm.categorySettingsLink"></a>' +
      "</div></div>" +
      '<div class="category-cascade__columns"></div>' +
      '<div class="category-cascade__footer-preview">' +
      '<span class="category-cascade__footer-label" data-i18n="productListForm.categoryCurrentSelection"></span> ' +
      '<span class="category-cascade__footer-path-value"></span></div></div>' +
      '<div class="modal__footer">' +
      '<button type="button" class="btn category-cascade__close" data-i18n="crud.cancel"></button>' +
      '<button type="button" class="btn btn--primary" id="category-cascade-confirm" data-i18n="crud.save"></button>' +
      "</div></div>";

    overlayEl.hidden = false;
    document.body.classList.add("modal-open");
    if (global.i18n) global.i18n.init();
    renderModalBody();

    overlayEl.querySelectorAll(".category-cascade__close").forEach(function (btn) {
      btn.addEventListener("click", close);
    });
    overlayEl.addEventListener("click", function (e) {
      if (e.target === overlayEl) close();
    });
    overlayEl.querySelector("#category-cascade-confirm").addEventListener("click", confirm);

    var searchInput = overlayEl.querySelector("#category-cascade-search");
    if (searchInput) {
      searchInput.addEventListener("input", function () {
        searchQuery = searchInput.value;
        updateSearchHits();
        renderModalBody();
      });
      searchInput.addEventListener("keydown", function (e) {
        if (e.key !== "Escape") return;
        e.preventDefault();
        clearSearchInput();
        renderModalBody();
      });
    }
  }

  global.categoryCascadePicker = {
    open: open,
    close: close,
    breadcrumbLabel: function (id) {
      return breadcrumbLabel(pathFromId(id));
    },
    pathFromId: pathFromId,
  };
})(window);

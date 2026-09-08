(function (global) {
  var THEME_KEY = "warehouse-design-theme";
  var sidebarOpen = false;

  var SUN_ICON =
    '<svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><circle cx="12" cy="12" r="4"/><path d="M12 2v2"/><path d="M12 20v2"/><path d="m4.93 4.93 1.41 1.41"/><path d="m17.66 17.66 1.41 1.41"/><path d="M2 12h2"/><path d="M20 12h2"/><path d="m6.34 17.66-1.41 1.41"/><path d="m19.07 4.93-1.41 1.41"/></svg>';
  var MOON_ICON =
    '<svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M12 3a6 6 0 0 0 9 9 9 9 0 1 1-9-9Z"/></svg>';
  var LANG_ICON =
    '<svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="m5 8 6 6"/><path d="m4 14 6-6 2-3"/><path d="M2 5h12"/><path d="M7 2h1"/><path d="m22 22-5-10-5 10"/><path d="M14 18h6"/></svg>';
  var LOGOUT_ICON =
    '<svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4"/><polyline points="16 17 21 12 16 7"/><line x1="21" x2="9" y1="12" y2="12"/></svg>';
  var MENU_ICON =
    '<svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><line x1="4" x2="20" y1="12" y2="12"/><line x1="4" x2="20" y1="6" y2="6"/><line x1="4" x2="20" y1="18" y2="18"/></svg>';
  var WAREHOUSE_ICON =
    '<svg xmlns="http://www.w3.org/2000/svg" width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M22 8.35V20a2 2 0 0 1-2 2H4a2 2 0 0 1-2-2V8.35A2 2 0 0 1 3.26 6.5l8-3.2a2 2 0 0 1 1.48 0l8 3.2A2 2 0 0 1 22 8.35Z"/><path d="M6 18h12"/><path d="M6 14h12"/><rect width="12" height="12" x="6" y="10"/></svg>';
  var SEARCH_ICON =
    '<svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><circle cx="11" cy="11" r="8"/><path d="m21 21-4.3-4.3"/></svg>';

  function getTheme() {
    return document.documentElement.getAttribute("data-theme") || "light";
  }

  function setTheme(theme) {
    document.documentElement.setAttribute("data-theme", theme);
    localStorage.setItem(THEME_KEY, theme);
    syncThemeIcon();
  }

  function toggleTheme() {
    setTheme(getTheme() === "dark" ? "light" : "dark");
  }

  function syncThemeIcon() {
    var btn = document.getElementById("btn-theme");
    if (!btn) return;
    btn.innerHTML = getTheme() === "dark" ? SUN_ICON : MOON_ICON;
  }

  function syncChromeLabels() {
    if (!global.i18n) return;
    var menuBtn = document.getElementById("btn-sidebar-toggle");
    var langBtn = document.getElementById("btn-lang");
    var themeBtn = document.getElementById("btn-theme");
    var logoutBtn = document.getElementById("btn-logout");
    if (menuBtn) menuBtn.setAttribute("aria-label", global.i18n.t("nav.openMenu"));
    if (langBtn) langBtn.setAttribute("aria-label", global.i18n.t("lang.toggle"));
    if (themeBtn) themeBtn.setAttribute("aria-label", global.i18n.t("theme.toggle"));
    if (logoutBtn) logoutBtn.setAttribute("aria-label", global.i18n.t("nav.logout"));
  }

  function userInitial(username) {
    var s = String(username || "").trim();
    return s ? s.charAt(0).toUpperCase() : "?";
  }

  function toggleSidebar(force) {
    sidebarOpen = typeof force === "boolean" ? force : !sidebarOpen;
    document.body.classList.toggle("sidebar-open", sidebarOpen);
    var backdrop = document.getElementById("sidebar-backdrop");
    if (backdrop) backdrop.hidden = !sidebarOpen;
  }

  function mount(options) {
    options = options || {};
    var shell = document.getElementById("app-shell");
    if (!shell) return;

    var user = global.auth.getUser();
    var pageTitle = options.pageTitle || "";
    var username = user ? user.username : "";
    var initial = userInitial(username);

    shell.innerHTML =
      '<div class="admin-layout">' +
      '  <aside class="admin-sidebar" id="admin-sidebar">' +
      '    <div class="admin-sidebar__brand">' +
      '      <span class="admin-sidebar__brand-icon">' +
      WAREHOUSE_ICON +
      "</span>" +
      '      <span class="admin-sidebar__logo" data-i18n="app.name">Warehouse</span>' +
      "    </div>" +
      '    <div class="admin-sidebar__divider" aria-hidden="true"></div>' +
      '    <div class="admin-sidebar__search">' +
      '      <label class="admin-sidebar__search-wrap" for="sidebar-search">' +
      '        <span class="admin-sidebar__search-icon">' +
      SEARCH_ICON +
      "</span>" +
      '        <input type="search" class="admin-sidebar__search-input" id="sidebar-search" data-i18n-placeholder="search.placeholder" placeholder="ค้นหา" />' +
      "      </label>" +
      "    </div>" +
      '    <nav class="admin-sidebar__nav" id="sidebar-nav" aria-label="Main"></nav>' +
      '    <div class="admin-sidebar__footer">' +
      '      <div class="admin-sidebar__user">' +
      '        <span class="admin-sidebar__avatar" aria-hidden="true">' +
      escapeHtml(initial) +
      "</span>" +
      '        <span class="admin-sidebar__username">' +
      escapeHtml(username) +
      "</span>" +
      "      </div>" +
      '      <div class="admin-sidebar__footer-actions">' +
      '        <button type="button" class="admin-sidebar__icon-btn admin-sidebar__icon-btn--logout" id="btn-logout" aria-label="Log out">' +
      LOGOUT_ICON +
      "        </button>" +
      "      </div>" +
      "    </div>" +
      "  </aside>" +
      '  <div class="admin-sidebar-backdrop" id="sidebar-backdrop" hidden></div>' +
      '  <div class="admin-main">' +
      '    <header class="admin-header">' +
      '      <button type="button" class="admin-header__icon-btn admin-header__menu-btn" id="btn-sidebar-toggle" aria-label="Menu">' +
      MENU_ICON +
      "      </button>" +
      '      <div class="admin-header__heading">' +
      '        <nav class="admin-header__breadcrumb" id="admin-breadcrumb" aria-label="Breadcrumb" hidden></nav>' +
      "      </div>" +
      '      <div class="admin-header__actions">' +
      '        <button type="button" class="admin-header__icon-btn" id="btn-lang" aria-label="Language">' +
      LANG_ICON +
      "        </button>" +
      '        <button type="button" class="admin-header__icon-btn" id="btn-theme" aria-label="Toggle theme"></button>' +
      "      </div>" +
      "    </header>" +
      '    <main class="admin-content" id="admin-content"></main>' +
      "  </div>" +
      "</div>";

    var content = shell.querySelector("#admin-content");
    if (options.contentHtml) content.innerHTML = options.contentHtml;

    var nav = document.getElementById("sidebar-nav");
    var search = document.getElementById("sidebar-search");
    var breadcrumb = document.getElementById("admin-breadcrumb");

    function refreshNav() {
      global.sidebar.render(nav, search ? search.value : "");
    }

    function refreshBreadcrumb() {
      global.sidebar.renderBreadcrumb(breadcrumb, pageTitle);
    }

    refreshNav();
    refreshBreadcrumb();
    search.addEventListener("input", refreshNav);

    syncThemeIcon();
    syncChromeLabels();

    document.getElementById("btn-theme").addEventListener("click", toggleTheme);
    document.getElementById("btn-lang").addEventListener("click", function () {
      global.i18n.setLocale(global.i18n.getLocale() === "th" ? "en" : "th");
      refreshNav();
    });
    document.getElementById("btn-logout").addEventListener("click", function () {
      global.auth.logout();
      window.location.replace("login.html");
    });
    document.getElementById("btn-sidebar-toggle").addEventListener("click", function () {
      toggleSidebar();
    });
    document.getElementById("sidebar-backdrop").addEventListener("click", function () {
      toggleSidebar(false);
    });

    document.addEventListener("i18n:change", function () {
      refreshNav();
      refreshBreadcrumb();
      syncChromeLabels();
    });
    if (global.realtime) {
      global.realtime.onMessage(function () {
        refreshNav();
      });
    }

    if (global.i18n) global.i18n.init();
    if (global.permissions) global.permissions.applyActionButtons(shell);
  }

  function escapeHtml(s) {
    return String(s)
      .replace(/&/g, "&amp;")
      .replace(/</g, "&lt;")
      .replace(/>/g, "&gt;");
  }

  global.layout = { mount: mount, toggleTheme: toggleTheme, setTheme: setTheme, getTheme: getTheme };
})(window);

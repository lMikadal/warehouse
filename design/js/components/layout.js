(function (global) {
  var THEME_KEY = "warehouse-design-theme";
  var sidebarOpen = false;

  function getTheme() {
    return document.documentElement.getAttribute("data-theme") || "light";
  }

  function setTheme(theme) {
    document.documentElement.setAttribute("data-theme", theme);
    localStorage.setItem(THEME_KEY, theme);
  }

  function toggleTheme() {
    setTheme(getTheme() === "dark" ? "light" : "dark");
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

    shell.innerHTML =
      '<div class="admin-layout">' +
      '  <aside class="admin-sidebar" id="admin-sidebar">' +
      '    <div class="admin-sidebar__brand">' +
      '      <span class="admin-sidebar__logo" data-i18n="app.name">Warehouse</span>' +
      "    </div>" +
      '    <div class="admin-sidebar__search">' +
      '      <input type="search" class="admin-sidebar__search-input" id="sidebar-search" data-i18n-placeholder="nav.search" placeholder="ค้นหาเมนู" />' +
      "    </div>" +
      '    <nav class="admin-sidebar__nav" id="sidebar-nav" aria-label="Main"></nav>' +
      "  </aside>" +
      '  <div class="admin-sidebar-backdrop" id="sidebar-backdrop" hidden></div>' +
      '  <div class="admin-main">' +
      '    <header class="admin-header">' +
      '      <button type="button" class="btn admin-header__menu-btn" id="btn-sidebar-toggle" aria-label="Menu">' +
      '        <img src="../assets/icons/menu.svg" alt="" width="20" height="20" />' +
      "      </button>" +
      '      <div class="admin-header__title">' +
      escapeHtml(pageTitle) +
      "</div>" +
      '      <div class="admin-header__actions">' +
      '        <span class="admin-header__user">' +
      escapeHtml(user ? user.username : "") +
      "</span>" +
      '        <button type="button" class="btn" id="btn-lang" data-i18n="lang.toggle">ภาษา</button>' +
      '        <button type="button" class="btn" id="btn-theme" data-i18n="theme.toggle">สลับธีม</button>' +
      '        <button type="button" class="btn" id="btn-logout" data-i18n="nav.logout">ออกจากระบบ</button>' +
      "      </div>" +
      "    </header>" +
      '    <main class="admin-content" id="admin-content"></main>' +
      "  </div>" +
      "</div>";

    var content = shell.querySelector("#admin-content");
    if (options.contentHtml) content.innerHTML = options.contentHtml;

    var nav = document.getElementById("sidebar-nav");
    var search = document.getElementById("sidebar-search");

    function refreshNav() {
      global.sidebar.render(nav, search ? search.value : "");
    }

    refreshNav();
    search.addEventListener("input", refreshNav);

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

    document.addEventListener("i18n:change", refreshNav);
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

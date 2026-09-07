(function (global) {
  var SESSION_KEY = "warehouse-design-session";

  function getSession() {
    try {
      var raw = localStorage.getItem(SESSION_KEY);
      return raw ? JSON.parse(raw) : null;
    } catch {
      return null;
    }
  }

  function setSession(session) {
    localStorage.setItem(SESSION_KEY, JSON.stringify(session));
  }

  function clearSession() {
    localStorage.removeItem(SESSION_KEY);
  }

  function getUser() {
    var session = getSession();
    if (!session || !session.userId) return null;
    return global.store.getById("admin_user", session.userId);
  }

  function isSuperAdmin(user) {
    return user && user.type === "superadmin";
  }

  function login(username, password) {
    var users = global.store.getAll("admin_user");
    var user = users.find(function (u) {
      return (
        u.deleted_at == null &&
        u.status === "active" &&
        String(u.username).toLowerCase() === String(username).toLowerCase() &&
        u._demo_password === password
      );
    });
    if (!user) return { ok: false, code: "invalid" };
    setSession({ userId: user.id, username: user.username, type: user.type });
    global.store.update("admin_user", user.id, { last_login_at: new Date().toISOString() });
    return { ok: true, user: user };
  }

  function logout() {
    clearSession();
  }

  function requireAuth(loginPath) {
    if (getSession()) return true;
    var base = loginPath || "pages/login.html";
    if (global.nav) base = global.nav.resolve(base);
    window.location.replace(base);
    return false;
  }

  function isLoginPage() {
    return /(?:^|\/)login\.html$/i.test(global.location.pathname);
  }

  function isSameResolvedPage(resolved) {
    try {
      var a = document.createElement("a");
      a.href = resolved;
      return global.location.pathname === a.pathname;
    } catch {
      return false;
    }
  }

  function resolveLandingPath() {
    var first = global.sidebar && global.sidebar.getFirstPath();
    if (first) return global.nav ? global.nav.resolve(first) : first;
    if (global.permissions && global.permissions.canAction("dashboard", "dashboard", "view")) {
      var dash = "pages/dashboard.html";
      return global.nav ? global.nav.resolve(dash) : dash;
    }
    return null;
  }

  function redirectIfAuthed(fallbackPath) {
    if (getSession()) {
      // Already on login — stay so dev bar quick-login works; avoid same-page reload loop
      if (isLoginPage()) return false;

      var target = fallbackPath;
      if (!target) {
        var landing = resolveLandingPath();
        if (!landing) return false;
        target = landing;
      } else if (global.nav) {
        target = global.nav.resolve(target);
      }

      if (isSameResolvedPage(target)) return false;

      window.location.replace(target);
      return true;
    }
    return false;
  }

  global.auth = {
    SESSION_KEY: SESSION_KEY,
    getSession: getSession,
    setSession: setSession,
    clearSession: clearSession,
    getUser: getUser,
    isSuperAdmin: isSuperAdmin,
    login: login,
    logout: logout,
    requireAuth: requireAuth,
    resolveLandingPath: resolveLandingPath,
    redirectIfAuthed: redirectIfAuthed,
  };
})(window);

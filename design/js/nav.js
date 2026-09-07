(function (global) {
  function isInPagesDir() {
    return /\/pages\/[^/]+\.html$/i.test(global.location.pathname);
  }

  function resolve(path) {
    if (!path || path === "#") return path || "#";
    if (/^https?:\/\//i.test(path)) return path;
    if (path.charAt(0) === "/") return path;
    if (isInPagesDir() && path.indexOf("pages/") === 0) {
      return path.slice("pages/".length);
    }
    return path;
  }

  global.nav = { resolve: resolve, isInPagesDir: isInPagesDir };
})(window);

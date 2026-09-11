(function (global) {
  var overlay = null;
  var onConfirmCb = null;
  var onCancelCb = null;

  function t(key) {
    return global.i18n ? global.i18n.t(key) : key;
  }

  function ensureDom() {
    if (overlay) return;
    overlay = document.createElement("div");
    overlay.className = "modal-overlay";
    overlay.hidden = true;
    overlay.innerHTML =
      '<div class="modal approval-password-modal" role="dialog" aria-modal="true">' +
      '  <div class="modal__header">' +
      '    <h2 class="modal__title" data-role="title"></h2>' +
      '    <button type="button" class="modal__close" aria-label="Close">' +
      '      <img src="../assets/icons/x.svg" alt="" width="18" height="18" />' +
      "    </button>" +
      "  </div>" +
      '  <div class="modal__content crud-form">' +
      '    <p class="approval-password-modal__desc" data-role="desc"></p>' +
      '    <div class="form-field">' +
      '      <label data-i18n="orderApproval.passwordLabel">รหัสอนุมัติ</label>' +
      '      <input type="password" autocomplete="off" data-role="password" />' +
      '    </div>' +
      "  </div>" +
      '  <div class="modal__footer">' +
      '    <button type="button" class="btn" data-role="cancel" data-i18n="button.cancel">ยกเลิก</button>' +
      '    <button type="button" class="btn btn--primary" data-role="ok" data-i18n="button.confirm">ยืนยัน</button>' +
      "  </div>" +
      "</div>";
    document.body.appendChild(overlay);
    overlay.querySelector(".modal__close").addEventListener("click", close);
    overlay.querySelector("[data-role=cancel]").addEventListener("click", function () {
      if (onCancelCb) onCancelCb();
      close();
    });
    overlay.querySelector("[data-role=ok]").addEventListener("click", submit);
    overlay.querySelector("[data-role=password]").addEventListener("keydown", function (e) {
      if (e.key === "Enter") submit();
    });
    overlay.addEventListener("click", function (e) {
      if (e.target === overlay) close();
    });
  }

  function close() {
    if (!overlay) return;
    overlay.hidden = true;
    document.body.classList.remove("modal-open");
    onConfirmCb = null;
    onCancelCb = null;
  }

  function submit() {
    var pwd = overlay.querySelector("[data-role=password]").value;
    if (!pwd.trim()) return;
    var cb = onConfirmCb;
    close();
    if (cb) cb(pwd);
  }

  function open(opts) {
    ensureDom();
    opts = opts || {};
    overlay.querySelector("[data-role=title]").textContent = opts.title || t("orderApproval.title");
    overlay.querySelector("[data-role=desc]").textContent = opts.description || t("orderApproval.description");
    overlay.querySelector("[data-role=password]").value = "";
    onConfirmCb = opts.onConfirm || null;
    onCancelCb = opts.onCancel || null;
    if (global.i18n) global.i18n.init();
    overlay.hidden = false;
    document.body.classList.add("modal-open");
    overlay.querySelector("[data-role=password]").focus();
  }

  global.approvalPasswordModal = { open: open, close: close };
})(window);

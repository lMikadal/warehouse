(function (global) {
  var overlay = null;
  var dialogEl = null;

  function ensureDom() {
    if (overlay) return;
    overlay = document.createElement("div");
    overlay.className = "modal-overlay";
    overlay.hidden = true;
    overlay.innerHTML =
      '<div class="modal" role="dialog" aria-modal="true" aria-labelledby="modal-title">' +
      '  <div class="modal__header">' +
      '    <h2 class="modal__title" id="modal-title" data-i18n="modal.title">กำลังพัฒนา</h2>' +
      '    <button type="button" class="modal__close" aria-label="Close">' +
      '      <img src="../assets/icons/x.svg" alt="" width="18" height="18" />' +
      "    </button>" +
      "  </div>" +
      '  <div class="modal__content">' +
      '    <p class="modal__body" data-i18n="modal.body">ฟีเจอร์นี้อยู่ระหว่างพัฒนา</p>' +
      "  </div>" +
      '  <div class="modal__footer">' +
      '    <button type="button" class="btn btn--primary modal__ok" data-i18n="modal.ok">ตกลง</button>' +
      "  </div>" +
      "</div>";
    document.body.appendChild(overlay);
    dialogEl = overlay.querySelector(".modal");
    overlay.querySelector(".modal__close").addEventListener("click", close);
    overlay.querySelector(".modal__ok").addEventListener("click", close);
    overlay.addEventListener("click", function (e) {
      if (e.target === overlay) close();
    });
  }

  function open(titleKey, bodyKey) {
    ensureDom();
    var title = dialogEl.querySelector(".modal__title");
    var body = dialogEl.querySelector(".modal__body");
    if (titleKey) title.setAttribute("data-i18n", titleKey);
    if (bodyKey) body.setAttribute("data-i18n", bodyKey);
    if (global.i18n) global.i18n.init();
    overlay.hidden = false;
    document.body.classList.add("modal-open");
  }

  function close() {
    if (!overlay) return;
    overlay.hidden = true;
    document.body.classList.remove("modal-open");
  }

  global.modal = { open: open, close: close };
})(window);

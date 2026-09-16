(function (global) {
  var audit = global.ADMIN_SEED_SHARED.audit;
  global.SEED_SETTING_VAT = [
    Object.assign({ id: 1, vat_type: "include", rate: 7, is_active: true }, audit(1)),
  ];
})(window);

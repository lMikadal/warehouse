(function (global) {
  var audit = global.ADMIN_SEED_SHARED.audit;
  global.SEED_SETTING_VAT = [
    Object.assign({ id: 1, vat_type: "exclude", rate: 7 }, audit(1)),
  ];
})(window);

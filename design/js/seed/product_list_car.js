(function (global) {
  var audit = global.ADMIN_SEED_SHARED.audit;
  global.SEED_PRODUCT_LIST_CAR = [
    Object.assign(
      {
        id: 1,
        product_list_id: 1,
        product_attribute_brand_id: 5,
        product_attribute_model_id: 6,
        product_attribute_engine_id: 7,
        gear_type: "auto",
        year_start: 2018,
        year_end: 2022,
      },
      audit(1)
    ),
    Object.assign(
      {
        id: 2,
        product_list_id: 1,
        product_attribute_brand_id: 8,
        product_attribute_model_id: 9,
        product_attribute_engine_id: 7,
        gear_type: "manual",
        year_start: 2016,
        year_end: 2020,
      },
      audit(1)
    ),
    Object.assign(
      {
        id: 3,
        product_list_id: 2,
        product_attribute_brand_id: 5,
        product_attribute_model_id: 6,
        product_attribute_engine_id: 7,
        gear_type: "auto",
        year_start: 2019,
        year_end: 2023,
      },
      audit(1)
    ),
  ];
})(window);

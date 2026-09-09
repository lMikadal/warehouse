(function (global) {
  var audit = global.ADMIN_SEED_SHARED.audit;
  global.SEED_PRODUCT_ITEM_WAREHOUSE = [
    Object.assign(
      {
        id: 1,
        product_item_id: 1,
        warehouse_id: 1,
        zone_id: 4,
        shelf_id: 19,
        rack_id: null,
        bin_id: null,
      },
      audit(1)
    ),
    Object.assign(
      {
        id: 2,
        product_item_id: 2,
        warehouse_id: 1,
        zone_id: 4,
        shelf_id: 20,
        rack_id: null,
        bin_id: null,
      },
      audit(1)
    ),
    Object.assign(
      {
        id: 3,
        product_item_id: 3,
        warehouse_id: 1,
        zone_id: 4,
        shelf_id: null,
        rack_id: 21,
        bin_id: null,
      },
      audit(1)
    ),
    Object.assign(
      {
        id: 4,
        product_item_id: 4,
        warehouse_id: 1,
        zone_id: 4,
        shelf_id: null,
        rack_id: null,
        bin_id: 22,
      },
      audit(1)
    ),
    Object.assign(
      {
        id: 5,
        product_item_id: 5,
        warehouse_id: 2,
        zone_id: 10,
        shelf_id: null,
        rack_id: null,
        bin_id: null,
      },
      audit(1)
    ),
    Object.assign(
      {
        id: 6,
        product_item_id: 6,
        warehouse_id: 3,
        zone_id: 15,
        shelf_id: null,
        rack_id: null,
        bin_id: null,
      },
      audit(1)
    ),
  ];
})(window);

/** node order_seed.check.js */
var fs = require("fs");
var path = require("path");
var shared = {
  audit: function () {
    return { created_at: "t", updated_at: "t", created_by: 1, updated_by: 1 };
  },
};
var g = { ADMIN_SEED_SHARED: shared };
["order_order", "order_order_item", "order_payment", "order_payment_item", "order_claim", "order_claim_item"].forEach(
  function (f) {
    var code = fs.readFileSync(path.join(__dirname, f + ".js"), "utf8");
    eval(code.replace(/}\)\(window\);/, "})(g);"));
  }
);
var orders = g.SEED_ORDER_ORDER;
var items = g.SEED_ORDER_ORDER_ITEM;
var pays = g.SEED_ORDER_PAYMENT;
var pis = g.SEED_ORDER_PAYMENT_ITEM;
var claims = g.SEED_ORDER_CLAIM;
var oids = {};
var skuRe = /^PJB-\d{6}-\d{4}-\d{2}$/;
function familyBase(sku) {
  if (sku == null || sku === "") return null;
  var m = String(sku).match(/^PJB-(\d{6})-(\d{4})-\d{2}$/);
  if (!m) return null;
  return "PJB-" + m[1] + "-" + m[2];
}
orders.forEach(function (o) {
  oids[o.id] = true;
  if (o.sku != null && o.sku !== "" && !skuRe.test(o.sku)) throw new Error("sku format " + o.id + " " + o.sku);
});
orders.forEach(function (o) {
  if (o.parent_id == null) return;
  var parent = orders.find(function (p) {
    return p.id === o.parent_id;
  });
  if (!parent) throw new Error("orphan child " + o.id);
  var base = familyBase(parent.sku);
  if (!base) {
    orders.forEach(function (s) {
      if (s.parent_id === parent.id && s.sku) base = familyBase(s.sku);
    });
  }
  if (o.sku != null && o.sku !== "" && base && familyBase(o.sku) !== base) {
    throw new Error("family sku mismatch " + o.id + " " + o.sku + " vs " + base);
  }
});
items.forEach(function (i) {
  if (!oids[i.order_order_id]) throw new Error("item " + i.id);
});
pays.forEach(function (p) {
  if (!oids[p.order_order_id]) throw new Error("pay " + p.id);
});
var pids = {};
pays.forEach(function (p) {
  pids[p.id] = true;
});
pis.forEach(function (pi) {
  if (!pids[pi.order_payment_id]) throw new Error("opi " + pi.id);
});
["draft", "pending", "success", "cancelled", "rejected"].forEach(function (s) {
  if (!orders.some(function (o) {
    return o.status === s;
  }))
    throw new Error("sale " + s);
});
["pending", "in_progress", "success", "fail"].forEach(function (s) {
  if (!orders.some(function (o) {
    return o.fulfill_status === s;
  }))
    throw new Error("fulfill " + s);
});
var claimSt = {};
claims.forEach(function (c) {
  claimSt[c.status] = true;
});
["pending", "acknowledged", "waiting_supplier", "success", "cancelled", "rejected"].forEach(function (s) {
  if (!claimSt[s]) throw new Error("claim " + s);
});
var cartCode = fs.readFileSync(path.join(__dirname, "../order-cart.js"), "utf8");
var gCart = {};
eval(cartCode.replace("(function (global)", "(function (global)").replace("})(window);", "})(gCart);"));
var cart = gCart.orderCart;
function cartHasLines(products, compares) {
  return (products && products.length > 0) || (compares && compares.length > 0);
}
if (cartHasLines([], [])) throw new Error("cartHasLines empty");
if (!cartHasLines([], [{ id: "x" }])) throw new Error("cartHasLines compare");
var sum = cart.priceSummary([], 7, 0);
if (sum.netTotal !== 0) throw new Error("priceSummary empty");
console.log("order_seed.check ok");

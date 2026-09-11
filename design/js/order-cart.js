(function (global) {
  function roundMoney2(n) {
    if (!Number.isFinite(n)) return 0;
    return Math.round(n * 100) / 100;
  }

  function availableStock(row) {
    var reserved = Number.isFinite(row.stock_order_delivery)
      ? Math.max(0, Math.trunc(row.stock_order_delivery || 0))
      : 0;
    return Math.max(0, Math.trunc(row.stock || 0) - reserved);
  }

  function extractVat(inc, pct) {
    if (!Number.isFinite(inc) || inc <= 0) return 0;
    var rate = Number.isFinite(pct) ? Math.min(100, Math.max(0, pct)) : 0;
    if (rate === 0) return 0;
    return roundMoney2((inc * rate) / (100 + rate));
  }

  function isWholesale(row, qty) {
    var q = Number.isFinite(qty) ? qty : 0;
    return (
      row.wholesale_price != null &&
      row.amount_wholesale_price != null &&
      q >= row.amount_wholesale_price
    );
  }

  function unitPrice(row, qty) {
    if (isWholesale(row, qty)) return Number(row.wholesale_price) || 0;
    return Number(row.price) || 0;
  }

  function amountFromType(type, discount, qty, unit) {
    if (type !== "percent" && type !== "baht") return 0;
    if (!Number.isFinite(discount) || discount <= 0) return 0;
    if (type === "percent") return roundMoney2((qty * unit * discount) / 100);
    return roundMoney2(qty * discount);
  }

  function hasSelfDiscount(row) {
    var type = row.member_discount_type;
    var discount = Number(row.member_discount);
    return (type === "percent" || type === "baht") && Number.isFinite(discount) && discount > 0;
  }

  function lineWholesaleDiscount(row, qty) {
    if (!isWholesale(row, qty)) return 0;
    var list = Number(row.price) || 0;
    var wh = Number(row.wholesale_price) || 0;
    var perUnit = list - wh;
    if (!Number.isFinite(perUnit) || perUnit <= 0) return 0;
    return roundMoney2((Number.isFinite(qty) ? qty : 0) * perUnit);
  }

  function lineMemberDiscount(row, qty) {
    var q = Number.isFinite(qty) ? qty : 0;
    if (isWholesale(row, q)) return 0;
    if (hasSelfDiscount(row)) {
      var min = row.member_discount_minimum_order;
      if (min != null && Number.isFinite(min) && q < min) return 0;
      return amountFromType(row.member_discount_type, Number(row.member_discount), q, unitPrice(row, q));
    }
    return amountFromType(
      row.member_discount_tier_type,
      Number(row.member_discount_tier),
      q,
      unitPrice(row, q)
    );
  }

  function lineTotalDiscount(row, qty) {
    return roundMoney2(lineWholesaleDiscount(row, qty) + lineMemberDiscount(row, qty));
  }

  function lineTotal(qty, unit, discount) {
    return roundMoney2(Math.max(0, qty * unit - discount));
  }

  function priceSummary(lines, vatPercent, shipping) {
    shipping = shipping != null ? shipping : 0;
    var itemsTotal = roundMoney2(
      lines.reduce(function (sum, line) {
        return sum + line.qty * (Number(line.price) || 0);
      }, 0)
    );
    var discountTotal = roundMoney2(lines.reduce(function (sum, line) {
      return sum + line.discount;
    }, 0));
    var ship = roundMoney2(shipping);
    var inc = roundMoney2(itemsTotal - discountTotal + ship);
    var vatAmount = extractVat(roundMoney2(itemsTotal - discountTotal), vatPercent);
    return {
      itemsTotal: itemsTotal,
      discountTotal: discountTotal,
      shipping: ship,
      grandTotal: roundMoney2(inc - vatAmount),
      vatAmount: vatAmount,
      netTotal: inc,
    };
  }

  global.orderCart = {
    roundMoney2: roundMoney2,
    availableStock: availableStock,
    extractVat: extractVat,
    isWholesale: isWholesale,
    unitPrice: unitPrice,
    lineMemberDiscount: lineMemberDiscount,
    lineWholesaleDiscount: lineWholesaleDiscount,
    lineTotalDiscount: lineTotalDiscount,
    lineTotal: lineTotal,
    priceSummary: priceSummary,
  };
})(window);

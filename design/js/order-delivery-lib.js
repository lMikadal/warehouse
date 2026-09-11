(function (global) {
  var lib = global.orderLib;
  var cart = global.orderCart;

  function flattenPaymentRows(orders, expandedIds, paymentsByOrder) {
    var out = [];
    orders.forEach(function (order, parentIndex) {
      var pays = paymentsByOrder[order.id] || lib.paymentsForOrder(order.id);
      var payment_count = pays.length;
      out.push(
        Object.assign({}, order, {
          kind: "parent",
          parentIndex: parentIndex,
          payment_count: payment_count,
          bill_sku: order.sku,
        })
      );
      if (!expandedIds[order.id] || payment_count <= 1) return;
      pays.forEach(function (p) {
        out.push({
          kind: "child",
          parentIndex: parentIndex,
          orderId: order.id,
          id: p.id,
          sku: p.sku,
          payment_category: p.payment_category,
          total_price: p.total_price,
          order_at: p.ordered_at,
        });
      });
    });
    return out;
  }

  function remainingQty(line) {
    var amount = Number(line.amount) || 0;
    var checked = Number(line.amount_checked) || 0;
    return Math.max(0, amount - checked);
  }

  function familyHasRemainingPicking(rootId) {
    var members = lib.familyMembers(rootId);
    for (var i = 0; i < members.length; i++) {
      var items = lib.orderItems(members[i].id);
      for (var j = 0; j < items.length; j++) {
        if (remainingQty(items[j]) > 0) return true;
      }
    }
    return false;
  }

  function buildPaymentOrderItems(orderId, lines) {
    return lines
      .filter(function (l) {
        return (Number(l.payQty) || 0) > 0;
      })
      .map(function (l) {
        var qty = Number(l.payQty) || 0;
        var unit = Number(l.price_per_unit) || 0;
        var disc = cart.lineMemberDiscount(l, qty);
        return {
          order_order_item_id: l.id,
          amount: qty,
          price_per_unit: unit,
          discount: disc,
          total_price: cart.lineTotal(qty, unit, disc),
        };
      });
  }

  var EXTRA_PAY_KEY = "warehouse-design-extra-pay";

  function setExtraPaySession(orderId, lines) {
    try {
      sessionStorage.setItem(
        EXTRA_PAY_KEY,
        JSON.stringify({ orderId: orderId, lines: lines, at: Date.now() })
      );
    } catch {
      /* ponytail */
    }
  }

  function getExtraPaySession() {
    try {
      var raw = sessionStorage.getItem(EXTRA_PAY_KEY);
      return raw ? JSON.parse(raw) : null;
    } catch {
      return null;
    }
  }

  function clearExtraPaySession() {
    try {
      sessionStorage.removeItem(EXTRA_PAY_KEY);
    } catch {
      /* ponytail */
    }
  }

  global.orderDeliveryLib = {
    flattenPaymentRows: flattenPaymentRows,
    remainingQty: remainingQty,
    familyHasRemainingPicking: familyHasRemainingPicking,
    buildPaymentOrderItems: buildPaymentOrderItems,
    setExtraPaySession: setExtraPaySession,
    getExtraPaySession: getExtraPaySession,
    clearExtraPaySession: clearExtraPaySession,
  };
})(window);

(function (global) {
  var lib = global.orderLib;
  var PERM = { module: "order", type: "order_store_claim" };
  var state = {
    paymentId: null,
    draftType: null,
    draftItems: [],
    paymentType: "cash",
    otherReason: "",
  };

  function t(k, params) {
    if (params && global.i18n && global.i18n.format) return global.i18n.format(k, params);
    return lib.t(k);
  }

  function fieldPh(kind, labelKey) {
    return global.i18n ? global.i18n.fieldPlaceholder(kind, labelKey) : "";
  }

  function can(action) {
    return lib.can(PERM.module, PERM.type, action);
  }

  function payment() {
    return global.store.getById("order_payment", state.paymentId);
  }

  function claimForPayment() {
    return lib.activeRows("order_claim").find(function (c) {
      return c.order_payment_id === state.paymentId;
    });
  }

  function reasonOptions(type) {
    return lib.activeRows("setting_claim_reason").filter(function (r) {
      if (!r.is_active) return false;
      if (type === "claim") return r.is_claim;
      return r.is_return;
    });
  }

  function reasonName(id) {
    var lang = global.store.getAll("setting_claim_reason_language").find(function (l) {
      return l.setting_claim_reason_id === id && l.locale === "th";
    });
    return (lang && lang.name) || "#" + id;
  }

  function render() {
    var root = document.getElementById("order-store-claim-form-root");
    if (!root) return;
    var pay = payment();
    var order = pay ? global.store.getById("order_order", pay.order_order_id) : null;
    var lines = pay ? lib.paymentItems(pay.id) : [];
    var draftTotal = state.draftItems.reduce(function (s, d) {
      return s + (Number(d.lineTotal) || 0);
    }, 0);

    var lineRows = lines
      .map(function (pi) {
        var ooi = global.store.getById("order_order_item", pi.order_order_item_id);
        return (
          "<tr><td>" +
          lib.escapeHtml(lib.productItemLabel(ooi && ooi.product_item_id)) +
          '</td><td class="data-table__col-numeric">' +
          pi.amount +
          '</td><td class="data-table__col-numeric">' +
          lib.formatMoney(pi.total_price) +
          '</td><td class="data-table__actions-cell"><button type="button" data-add-line="' +
          pi.id +
          '">+</button></td></tr>'
        );
      })
      .join("");

    var draftRows = state.draftItems
      .map(function (d, i) {
        return (
          "<tr><td>" +
          lib.escapeHtml(d.type) +
          "</td><td>" +
          lib.escapeHtml(d.reasonName) +
          '</td><td class="data-table__col-numeric">' +
          d.amount +
          '</td><td class="data-table__actions-cell"><button type="button" data-rm-draft="' +
          i +
          '">×</button></td></tr>'
        );
      })
      .join("");

    root.innerHTML =
      '<div class="order-claim-form"><div class="order-claim-form__grid">' +
      '<div><section class="crud-card"><h2>' +
      lib.escapeHtml(order && order.member_name) +
      "</h2><p>" +
      lib.escapeHtml(pay && pay.sku) +
      '</p></section><section class="crud-card"><div class="crud-table-wrap"><div class="crud-table-wrap__body"><table class="data-table crud-table"><thead><tr><th data-i18n="orderForm.colProduct"></th><th class="data-table__col-numeric" data-i18n="orderForm.colQty"></th><th class="data-table__col-numeric" data-i18n="orderForm.colPrice"></th><th class="data-table__actions-col"></th></tr></thead><tbody>' +
      lineRows +
      '</tbody></table></div></div></section><p><span data-i18n="orderClaim.paidTotal"></span> ' +
      lib.formatMoney(pay && pay.total_price) +
      "</p></div>" +
      '<div><section class="crud-card"><h2 data-i18n="orderClaim.sectionDraft"></h2>' +
      '<div class="crud-form"><div class="form-field"><label for="ocf-draft-type"><span data-i18n="orderClaim.colType"></span></label>' +
      '<select id="ocf-draft-type" data-draft-type><option value="" disabled' +
      (!state.draftType ? " selected" : "") +
      ">" +
      lib.escapeHtml(fieldPh("select", "orderClaim.colType")) +
      '</option><option value="return"' +
      (state.draftType === "return" ? " selected" : "") +
      ">" +
      lib.escapeHtml(t("orderClaim.typeReturn")) +
      '</option><option value="claim"' +
      (state.draftType === "claim" ? " selected" : "") +
      ">" +
      lib.escapeHtml(t("orderClaim.typeClaim")) +
      '</option></select><div class="form-field__error-slot" aria-live="polite"><p class="form-field__error" hidden role="alert"></p></div></div></div>' +
      '<div class="crud-table-wrap"><div class="crud-table-wrap__body"><table class="data-table crud-table"><thead><tr><th data-i18n="orderClaim.colType"></th><th data-i18n="orderClaim.colReason"></th><th class="data-table__col-numeric" data-i18n="orderForm.colQty"></th><th class="data-table__actions-col"></th></tr></thead><tbody>' +
      (draftRows || "<tr><td colspan=4>—</td></tr>") +
      "</tbody></table></div></div>" +
      '<p><span data-i18n="orderClaim.draftTotal"></span> ' +
      lib.formatMoney(draftTotal) +
      '</p><div class="form-field"><label for="ocf-pay-type"><span data-i18n="orderClaim.payType"></span></label>' +
      '<select id="ocf-pay-type" data-pay-type><option value="cash"' +
      (state.paymentType === "cash" ? " selected" : "") +
      ' data-i18n="orderClaim.payTypeCash"></option><option value="transfer"' +
      (state.paymentType === "transfer" ? " selected" : "") +
      ' data-i18n="orderClaim.payTypeTransfer"></option><option value="other"' +
      (state.paymentType === "other" ? " selected" : "") +
      ' data-i18n="orderClaim.payTypeOther"></option><option value="debt_reduction"' +
      (state.paymentType === "debt_reduction" ? " selected" : "") +
      ' data-i18n="orderClaim.payTypeDebt"></option></select><div class="form-field__error-slot" aria-live="polite"><p class="form-field__error" hidden role="alert"></p></div></div>' +
      (can("create")
        ? '<button type="button" class="btn btn--primary" data-save-claim data-i18n="crud.save"></button>'
        : "") +
      "</section></div></div></div>";
    if (global.i18n) global.i18n.init();
    bind(root);
  }

  function bind(root) {
    root.querySelector("[data-draft-type]").addEventListener("change", function (e) {
      state.draftType = e.target.value || null;
    });
    root.querySelectorAll("[data-add-line]").forEach(function (btn) {
      btn.addEventListener("click", function () {
        if (!state.draftType) {
          global.toast.error("เลือกประเภทเคลม/คืนก่อน");
          return;
        }
        var piId = Number(btn.getAttribute("data-add-line"));
        if (state.draftType === "claim" && state.draftItems.length >= 1) {
          global.toast.error("เคลมได้ 1 รายการ");
          return;
        }
        var reasons = reasonOptions(state.draftType);
        if (!reasons.length) return;
        var reasonId = reasons[0].id;
        var pi = global.store.getAll("order_payment_item").find(function (x) {
          return x.id === piId;
        });
        state.draftItems.push({
          paymentItemId: piId,
          type: state.draftType,
          reasonId: reasonId,
          reasonName: reasonName(reasonId),
          amount: pi ? pi.amount : 1,
          lineTotal: pi ? pi.total_price : 0,
        });
        render();
      });
    });
    root.querySelectorAll("[data-rm-draft]").forEach(function (btn) {
      btn.addEventListener("click", function () {
        state.draftItems.splice(Number(btn.getAttribute("data-rm-draft")), 1);
        render();
      });
    });
    var payTypeEl = root.querySelector("[data-pay-type]");
    if (payTypeEl) {
      payTypeEl.addEventListener("change", function (e) {
        state.paymentType = e.target.value;
      });
    }
    var saveClaimBtn = root.querySelector("[data-save-claim]");
    if (saveClaimBtn) saveClaimBtn.addEventListener("click", saveClaim);
  }

  function saveClaim() {
    if (!state.draftItems.length) return;
    var pay = payment();
    var actor = lib.actorId();
    var ts = lib.now();
    var total = state.draftItems.reduce(function (s, d) {
      return s + d.lineTotal;
    }, 0);
    var existing = claimForPayment();
    var claimId;
    if (existing) {
      claimId = existing.id;
      global.store.update("order_claim", claimId, {
        total_price: total,
        updated_at: ts,
        type: state.draftItems[0].type,
        payment_type: state.paymentType,
      });
      lib.activeRows("order_claim_item")
        .filter(function (i) {
          return i.order_claim_id === claimId;
        })
        .forEach(function (i) {
          global.store.delete("order_claim_item", i.id);
        });
    } else {
      var c = global.store.create("order_claim", {
        sku: "CLM" + ts.slice(2, 10).replace(/-/g, ""),
        order_payment_id: pay.id,
        type: state.draftItems[0].type,
        payment_type: state.paymentType,
        other_reason: state.otherReason,
        total_price: total,
        status: "pending",
        created_at: ts,
        updated_at: ts,
        created_by: actor,
        updated_by: actor,
      });
      claimId = c.id;
    }
    state.draftItems.forEach(function (d) {
      global.store.create("order_claim_item", {
        order_claim_id: claimId,
        order_payment_item_id: d.paymentItemId,
        setting_claim_reason_id: d.reasonId,
        type: d.type,
        amount: d.amount,
        status: "pending",
        note: "",
        created_at: ts,
        updated_at: ts,
        created_by: actor,
        updated_by: actor,
      });
    });
    global.toast.success(t("notification.success.save"));
    global.location.href = global.nav.resolve("pages/order-store-claim-list.html");
  }

  function boot() {
    global.store.init();
    if (global.i18n) global.i18n.init();
    if (!global.auth.requireAuth("login.html")) return;
    var m = /[?&]id=(\d+)/.exec(global.location.search);
    state.paymentId = m ? Number(m[1]) : null;
    if (!state.paymentId || !payment()) {
      global.location.href = global.nav.resolve("pages/order-store-claim.html");
      return;
    }
    if (!global.permissions.guardPage(PERM.module, PERM.type, "login.html")) return;
    lib.mountAdminContent("orderClaim.titlePick", "order-store-claim-form-root");
    render();
    document.addEventListener("i18n:change", render);
  }

  global.orderStoreClaimFormPage = { boot: boot };
})(window);

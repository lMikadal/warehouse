/** node order-lib.check.js */
function verify(users, field, password) {
  for (var i = 0; i < users.length; i++) {
    var u = users[i];
    if (u.status !== "active" || u.type !== "superadmin" || u.deleted_at) continue;
    var stored = u[field];
    if (stored && stored === password) return { ok: true, userId: u.id };
  }
  return { ok: false };
}
var users = [
  {
    id: 1,
    status: "active",
    type: "superadmin",
    deleted_at: null,
    password_credit_hash: "8888",
    password_discount_hash: "9999",
  },
];
if (!verify(users, "password_credit_hash", "8888").ok) throw new Error("credit");
if (!verify(users, "password_discount_hash", "9999").ok) throw new Error("discount");
if (verify(users, "password_credit_hash", "0").ok) throw new Error("reject");
console.log("order-lib.check ok");

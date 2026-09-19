(function (global) {
  function bangkokParts(at) {
    var fmt = new Intl.DateTimeFormat("en-CA", {
      timeZone: "Asia/Bangkok",
      year: "numeric",
      month: "2-digit",
    });
    var parts = fmt.formatToParts(at);
    var y = "";
    var m = "";
    parts.forEach(function (p) {
      if (p.type === "year") y = p.value;
      if (p.type === "month") m = p.value;
    });
    return { y: y, m: m, yyyymm: y + m };
  }

  function resetBucket(resetPeriod, at) {
    var p = bangkokParts(at);
    if (resetPeriod === "month") return p.yyyymm;
    if (resetPeriod === "year") return p.y;
    return "";
  }

  function formatYYYYMM(resetPeriod, periodKey, at) {
    if (resetPeriod === "month" && periodKey) return periodKey;
    return bangkokParts(at).yyyymm;
  }

  function padSeq(seq, width) {
    var s = String(seq);
    while (s.length < width) s = "0" + s;
    if (s.length > width) throw new Error("system code sequence overflow");
    return s;
  }

  function findRow(codeKey) {
    var rows = global.store.getAll("system_code_prefix");
    return (
      rows.find(function (r) {
        return r.code_key === codeKey && !r.deleted_at && r.is_active !== false;
      }) || null
    );
  }

  function nextCode(codeKey, at) {
    var row = findRow(codeKey);
    if (!row) throw new Error("system code prefix not found");
    at = at || new Date();
    var bucket = resetBucket(row.reset_period, at);
    var periodKey = row.period_key != null ? String(row.period_key) : "";
    var lastSeq = Number(row.last_seq) || 0;
    if (bucket !== periodKey) {
      periodKey = bucket;
      lastSeq = 0;
    }
    lastSeq += 1;
    var width = Number(row.seq_width) || 5;
    var max = Math.pow(10, width) - 1;
    if (lastSeq < 1 || lastSeq > max) throw new Error("system code sequence overflow");
    var yyyymm = formatYYYYMM(row.reset_period, periodKey, at);
    var code =
      row.prefix + "-" + yyyymm + "-" + padSeq(lastSeq, width);
    global.store.update("system_code_prefix", row.id, {
      period_key: periodKey,
      last_seq: lastSeq,
      updated_at: new Date().toISOString(),
    });
    return code;
  }

  global.systemCodeLib = { nextCode: nextCode };
})(window);

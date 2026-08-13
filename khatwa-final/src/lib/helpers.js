export const GRADES = ["أول متوسط", "ثاني متوسط", "ثالث متوسط"];
export const DN = ["الأحد", "الإثنين", "الثلاثاء", "الأربعاء", "الخميس", "الجمعة", "السبت"];
export const DL = ["ح", "ن", "ث", "ر", "خ", "ج", "س"];

export const iso = (d) => {
  const x = new Date(d);
  return `${x.getFullYear()}-${String(x.getMonth() + 1).padStart(2, "0")}-${String(
    x.getDate()
  ).padStart(2, "0")}`;
};

export const addDays = (d, n) => {
  const x = new Date(d);
  x.setDate(x.getDate() + n);
  return x;
};

export const today = () => {
  const t = new Date();
  t.setHours(12, 0, 0, 0);
  return t;
};

export const todayIso = () => iso(today());

export const weekDays = () => {
  const t = today();
  const start = addDays(t, -t.getDay());
  return Array.from({ length: 7 }, (_, i) => addDays(start, i));
};

export const fmtDate = (s) => {
  const d = new Date(s + "T12:00:00");
  return `${DN[d.getDay()]} ${d.getDate()}/${d.getMonth() + 1}`;
};

export const pctClass = (p) => (p < 40 ? "low" : p < 75 ? "mid" : "high");

/* الأيام المتتالية: تُحتسب على الأيام التي فيها مقررات فقط */
export const calcStreak = (assignments, doneDates) => {
  const dates = new Set(doneDates);
  const due = new Set(assignments.map((a) => a.due_date));
  let n = 0;
  for (let i = 0; i < 90; i++) {
    const k = iso(addDays(today(), -i));
    if (!due.has(k)) continue;
    if (dates.has(k)) n++;
    else if (i > 0) break;
  }
  return n;
};

/* آخر N يومًا مع عدد الإنجازات في كل يوم */
export const heatDays = (records, span = 84) => {
  const out = [];
  for (let i = span - 1; i >= 0; i--) {
    const k = iso(addDays(today(), -i));
    const n = records.filter((r) => (r.completed_at || "").slice(0, 10) === k).length;
    out.push({ k, n, lvl: n === 0 ? 0 : n === 1 ? 1 : n === 2 ? 2 : 3 });
  }
  return out;
};

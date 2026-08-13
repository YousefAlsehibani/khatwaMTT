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

/* الأيام المتتالية: يوم يُحتسب إذا أنجز الطالب *كل* مقررات ذلك اليوم.
   الأيام التي لا مقررات فيها تُتخطى (لا تكسر السلسلة).
   يوم اليوم لا يكسرها إن لم يكتمل بعد — لأنه لم ينتهِ. */
export const calcStreak = (assignments) => {
  const byDay = new Map();
  assignments.forEach((a) => {
    if (!byDay.has(a.due_date)) byDay.set(a.due_date, []);
    byDay.get(a.due_date).push(a);
  });

  const T = todayIso();
  let n = 0;
  for (let i = 0; i < 120; i++) {
    const k = iso(addDays(today(), -i));
    const items = byDay.get(k);
    if (!items || items.length === 0) continue;
    const all = items.every((a) => a.done);
    if (all) n++;
    else if (k === T) continue;
    else break;
  }
  return n;
};

/* أطول سلسلة تحققت في السجل كله */
export const bestStreak = (assignments) => {
  const byDay = new Map();
  assignments.forEach((a) => {
    if (!byDay.has(a.due_date)) byDay.set(a.due_date, []);
    byDay.get(a.due_date).push(a);
  });
  const days = [...byDay.keys()].sort();
  let best = 0, run = 0;
  days.forEach((k) => {
    if (byDay.get(k).every((a) => a.done)) { run++; best = Math.max(best, run); }
    else run = 0;
  });
  return best;
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

export const GRADES = ["أول متوسط", "ثاني متوسط", "ثالث متوسط"];
export const DN = ["الأحد", "الإثنين", "الثلاثاء", "الأربعاء", "الخميس", "الجمعة", "السبت"];
export const DL = ["ح", "ن", "ث", "ر", "خ", "ج", "س"];
const MONTHS = [
  "يناير", "فبراير", "مارس", "أبريل", "مايو", "يونيو",
  "يوليو", "أغسطس", "سبتمبر", "أكتوبر", "نوفمبر", "ديسمبر",
];

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

/* التاريخ كـ Date من نص ISO بلا انزياح المنطقة */
export const parse = (s) => new Date(s + "T12:00:00");

export const today = () => {
  const t = new Date();
  t.setHours(12, 0, 0, 0);
  return t;
};
export const todayIso = () => iso(today());

/* بداية الأسبوع = الأحد */
export const weekStartOf = (d) => addDays(d, -new Date(d).getDay());
export const thisWeekStart = () => iso(weekStartOf(today()));

export const weekDaysOf = (weekStartIso) =>
  Array.from({ length: 7 }, (_, i) => addDays(parse(weekStartIso), i));

export const fmtDate = (s) => {
  const d = parse(s);
  return `${DN[d.getDay()]} ${d.getDate()} ${MONTHS[d.getMonth()]}`;
};

export const fmtShort = (s) => {
  const d = parse(s);
  return `${d.getDate()}/${d.getMonth() + 1}`;
};

/* "٩ – ١٥ أغسطس" */
export const weekLabel = (weekStartIso) => {
  const a = parse(weekStartIso);
  const b = addDays(a, 6);
  const sameMonth = a.getMonth() === b.getMonth();
  return sameMonth
    ? `${a.getDate()} – ${b.getDate()} ${MONTHS[b.getMonth()]}`
    : `${a.getDate()} ${MONTHS[a.getMonth()]} – ${b.getDate()} ${MONTHS[b.getMonth()]}`;
};

export const relWeek = (weekStartIso) => {
  const diff = Math.round(
    (parse(weekStartIso) - parse(thisWeekStart())) / 86400000 / 7
  );
  if (diff === 0) return "هذا الأسبوع";
  if (diff === -1) return "الأسبوع الماضي";
  if (diff === 1) return "الأسبوع القادم";
  if (diff < 0) return `قبل ${Math.abs(diff)} أسابيع`;
  return `بعد ${diff} أسابيع`;
};

export const pctClass = (p) => (p < 40 ? "low" : p < 75 ? "mid" : "high");

/* ---------- السلسلة ----------
   يوم يُحتسب إذا سجّل فيه الطالب أي إنجاز (صفحات أو مقاطع).
   نعدّ رجوعًا من اليوم؛ ويوم اليوم لا يكسرها إن لم يبدأ بعد. */
export const calcStreak = (daily) => {
  const days = new Set(
    (daily || []).filter((x) => Number(x.n) > 0).map((x) => x.d)
  );
  let n = 0;
  for (let i = 0; i < 200; i++) {
    const k = iso(addDays(today(), -i));
    if (days.has(k)) n++;
    else if (i === 0) continue;
    else break;
  }
  return n;
};

/* خريطة الأيام: مجموع النشاط لكل يوم */
export const heatDays = (daily, span = 84) => {
  const map = new Map();
  (daily || []).forEach((x) => {
    map.set(x.d, (map.get(x.d) || 0) + Number(x.n || 0));
  });
  const out = [];
  for (let i = span - 1; i >= 0; i--) {
    const k = iso(addDays(today(), -i));
    const n = map.get(k) || 0;
    out.push({ k, n, lvl: n === 0 ? 0 : n <= 3 ? 1 : n <= 9 ? 2 : 3 });
  }
  return out;
};

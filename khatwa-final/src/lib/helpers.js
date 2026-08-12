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

import { createClient } from "@supabase/supabase-js";

const url = import.meta.env.VITE_SUPABASE_URL;
const key = import.meta.env.VITE_SUPABASE_KEY;

if (!url || !key) {
  throw new Error(
    "ناقص إعداد: انسخ .env.example إلى .env.local واملأ VITE_SUPABASE_URL و VITE_SUPABASE_KEY"
  );
}

export const supabase = createClient(url, key, {
  auth: { persistSession: false, autoRefreshToken: false },
});

/* ---------- الجلسة المحفوظة محليًا ---------- */
const TOKEN_KEY = "khatwa.token";
const DEVICE_KEY = "khatwa.device";

export const getToken = () => localStorage.getItem(TOKEN_KEY);
export const setToken = (t) => localStorage.setItem(TOKEN_KEY, t);
export const clearToken = () => localStorage.removeItem(TOKEN_KEY);

function deviceId() {
  let d = localStorage.getItem(DEVICE_KEY);
  if (!d) {
    d = crypto.randomUUID();
    localStorage.setItem(DEVICE_KEY, d);
  }
  return d;
}

/* ---------- نداء الدوال ---------- */
async function rpc(fn, args = {}) {
  const { data, error } = await supabase.rpc(fn, args);
  if (error) throw new Error(error.message);
  return data;
}

/* ---------- الدخول ---------- */
export const login = (code) =>
  rpc("login", { p_code: code, p_device: deviceId() });

export const whoami = (token) => rpc("whoami", { p_token: token });

export const logout = async (token) => {
  try {
    await rpc("logout", { p_token: token });
  } finally {
    clearToken();
  }
};

/* ---------- الطالب ---------- */
export const studentBoard = (token) => rpc("student_board", { p_token: token });

export const markDone = (token, assignmentId, pages = null) =>
  rpc("mark_done", {
    p_token: token,
    p_assignment: assignmentId,
    p_pages: pages,
  });

export const unmarkDone = (token, assignmentId) =>
  rpc("unmark_done", { p_token: token, p_assignment: assignmentId });

/* ---------- المشرف ---------- */
export const supervisorBoard = (token) =>
  rpc("supervisor_board", { p_token: token });

export const saveAssignment = (token, a) =>
  rpc("save_assignment", {
    p_token: token,
    p_kind: a.kind,
    p_title: a.title,
    p_url: a.url || null,
    p_amount: Number(a.amount),
    p_due: a.due_date,
    p_id: a.id || null,
  });

export const deleteAssignment = (token, id) =>
  rpc("delete_assignment", { p_token: token, p_id: id });

/* ---------- التنفيذي ---------- */
export const execBoard = (token) => rpc("exec_board", { p_token: token });

export const createAccount = (token, role, name, grade) =>
  rpc("create_account", {
    p_token: token,
    p_role: role,
    p_name: name,
    p_grade: grade,
  });

export const deactivateAccount = (token, id) =>
  rpc("deactivate_account", { p_token: token, p_id: id });

/* ---------- رسائل الأخطاء ---------- */
export const errorText = (code) =>
  ({
    bad_code: "الرمز لازم يكون ٤ أرقام.",
    not_found: "ما لقينا هذا الرمز. تأكد من الأرقام أو راجع مشرفك.",
    rate_limited: "محاولات كثيرة. انتظر شوي وحاول مرة ثانية.",
    forbidden: "ما عندك صلاحية لهذه العملية.",
    pages_required: "اكتب عدد الصفحات اللي قرأتها.",
    supervisor_exists: "فيه مشرف لهذا الصف أصلًا.",
  }[code] || "صار خطأ غير متوقع. حاول مرة ثانية.");

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

/* ---------- الجلسة ---------- */
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

async function rpc(fn, args = {}) {
  const { data, error } = await supabase.rpc(fn, args);
  if (error) throw new Error(error.message);
  return data;
}

/* ---------- الدخول ---------- */
export const login = (code) => rpc("login", { p_code: code, p_device: deviceId() });
export const whoami = (token) => rpc("whoami", { p_token: token });
export const logout = async (token) => {
  try { await rpc("logout", { p_token: token }); } finally { clearToken(); }
};

/* ---------- الطالب ---------- */
export const studentBoard = (token, week = null) =>
  rpc("student_board", { p_token: token, p_week: week });

export const toggleClip = (token, clipId, done) =>
  rpc("toggle_clip", { p_token: token, p_clip: clipId, p_done: done });

export const setPage = (token, planId, page, confirmBack = false) =>
  rpc("set_page", {
    p_token: token, p_plan: planId, p_page: page, p_confirm_back: confirmBack,
  });

export const answerWeek = (token, planId, answer) =>
  rpc("answer_week", { p_token: token, p_plan: planId, p_answer: answer });

/* ---------- المشرف ---------- */
export const supervisorBoard = (token, week = null) =>
  rpc("supervisor_board", { p_token: token, p_week: week });

export const savePlan = (token, p) =>
  rpc("save_plan", {
    p_token: token,
    p_week: p.week_start,
    p_book_title: p.book_title || null,
    p_page_from: p.page_from ?? null,
    p_page_to: p.page_to ?? null,
    p_q_text: p.q_text || null,
    p_q_kind: p.q_kind || null,
    p_q_options: p.q_options || null,
    p_clips: p.clips || [],
    p_is_makeup: !!p.is_makeup,
  });

export const deletePlan = (token, planId) =>
  rpc("delete_plan", { p_token: token, p_plan: planId });

export const markReviewed = (token, planId, studentId, val = true) =>
  rpc("mark_reviewed", {
    p_token: token, p_plan: planId, p_student: studentId, p_val: val,
  });

/* ---------- التنفيذي ---------- */
export const execBoard = (token) => rpc("exec_board", { p_token: token });

export const createAccount = (token, role, name, grade) =>
  rpc("create_account", { p_token: token, p_role: role, p_name: name, p_grade: grade });

export const deactivateAccount = (token, id) =>
  rpc("deactivate_account", { p_token: token, p_id: id });

export const updateMyAccount = (token, name, code) =>
  rpc("update_my_account", { p_token: token, p_name: name, p_code: code });

/* ---------- رسائل الأخطاء ---------- */
export const errorText = (code) =>
  ({
    bad_code: "الرمز لازم يكون ٤ أرقام.",
    not_found: "ما لقينا هذا الرمز. تأكد من الأرقام أو راجع مشرفك.",
    rate_limited: "محاولات كثيرة. انتظر شوي وحاول مرة ثانية.",
    forbidden: "ما عندك صلاحية لهذه العملية.",
    supervisor_exists: "فيه مشرف لهذا الصف أصلًا.",
    bad_name: "الاسم قصير جدًا. اكتب حرفين على الأقل.",
    code_taken: "هذا الرمز مستخدم لحساب آخر. جرّب رمزًا غيره.",
    page_out_of_range: "رقم الصفحة خارج مدى هذا الأسبوع.",
    needs_confirm: "الرقم أقل من موضعك الحالي.",
    answer_required: "اكتب إجابتك أولًا.",
    invalid_data: "فيه بيانات ناقصة أو غير صحيحة في الخطة.",
  }[code] || "صار خطأ غير متوقع. حاول مرة ثانية.");

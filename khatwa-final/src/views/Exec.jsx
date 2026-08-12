import React, { useState, useEffect, useCallback } from "react";
import { execBoard, createAccount, deactivateAccount, errorText } from "../lib/api";
import { Hero, Bar, Odometer, Loading, Failed } from "../components/UI";
import { GRADES } from "../lib/helpers";

export default function Exec({ token, toast }) {
  const [data, setData] = useState(null);
  const [err, setErr] = useState("");
  const [tab, setTab] = useState("grades");
  const [f, setF] = useState({ role: "student", name: "", grade: GRADES[0] });
  const [made, setMade] = useState(null);
  const [busy, setBusy] = useState(false);

  const load = useCallback(async () => {
    try {
      setErr("");
      const r = await execBoard(token);
      if (!r.ok) return setErr(errorText(r.error));
      setData(r);
    } catch (e) {
      setErr(e.message);
    }
  }, [token]);

  useEffect(() => {
    load();
  }, [load]);

  const submit = async () => {
    if (!f.name.trim()) return;
    setBusy(true);
    try {
      const r = await createAccount(token, f.role, f.name.trim(), f.grade);
      if (!r.ok) return toast(errorText(r.error));
      setMade({ name: f.name.trim(), code: r.code, grade: f.grade, role: f.role });
      setF({ ...f, name: "" });
      toast("انضاف الحساب");
      await load();
    } catch (e) {
      toast(e.message);
    } finally {
      setBusy(false);
    }
  };

  const remove = async (p) => {
    if (!confirm(`توقف حساب "${p.name}"؟ ما بيقدر يدخل بعدها، لكن بياناته تبقى محفوظة.`)) return;
    setBusy(true);
    try {
      await deactivateAccount(token, p.id);
      toast("أوقفنا الحساب");
      await load();
    } catch (e) {
      toast(e.message);
    } finally {
      setBusy(false);
    }
  };

  if (err) return <Failed text={err} onRetry={load} />;
  if (!data) return <Loading />;

  const grades = data.grades || [];
  const students = data.students || [];
  const sups = data.supervisors || [];

  const totalDone = grades.reduce((x, g) => x + Number(g.done || 0), 0);
  const possible = grades.reduce((x, g) => x + Number(g.students) * Number(g.assignments), 0);
  const overall = possible ? Math.round((totalDone / possible) * 100) : 0;

  return (
    <>
      <Hero
        eyebrow="مجموع الدقائق في المدرسة"
        value={Number(data.total_minutes) || 0}
        unit="دقيقة"
        pct={overall}
        foot={
          <>
            <b className="bk">
              <Odometer value={Number(data.total_pages) || 0} delay={620} />
            </b>{" "}
            صفحة
            <span className="dot" />
            <b>{students.length}</b> طالب
            <span className="dot" />
            <b>{sups.length}</b> مشرفين
            <span className="dot" />
            <b>{overall}%</b> إنجاز عام
          </>
        }
      />

      <div className="tabs en" style={{ animationDelay: "330ms" }}>
        <button className={`tab ${tab === "grades" ? "on" : ""}`} onClick={() => setTab("grades")}>
          الصفوف
        </button>
        <button className={`tab ${tab === "all" ? "on" : ""}`} onClick={() => setTab("all")}>
          كل الطلاب
        </button>
        <button className={`tab ${tab === "sups" ? "on" : ""}`} onClick={() => setTab("sups")}>
          المشرفون
        </button>
        <button className={`tab ${tab === "add" ? "on" : ""}`} onClick={() => setTab("add")}>
          إضافة حساب
        </button>
      </div>

      {tab === "grades" && (
        <div className="tablewrap en" style={{ animationDelay: "380ms" }}>
          <table>
            <thead>
              <tr>
                <th>الصف</th>
                <th>المشرف</th>
                <th>طلاب</th>
                <th>مقررات</th>
                <th style={{ width: 150 }}>الإنجاز</th>
                <th>دقائق</th>
              </tr>
            </thead>
            <tbody>
              {grades.map((g) => {
                const poss = Number(g.students) * Number(g.assignments);
                const pct = poss ? Math.round((Number(g.done) / poss) * 100) : 0;
                return (
                  <tr key={g.grade}>
                    <td style={{ fontWeight: 600 }}>{g.grade}</td>
                    <td style={{ color: "var(--muted)" }}>{g.supervisor || "بدون مشرف"}</td>
                    <td>
                      <span className="pill">{g.students}</span>
                    </td>
                    <td>
                      <span className="pill">{g.assignments}</span>
                    </td>
                    <td>
                      <div className="cellbar">
                        <Bar pct={pct} />
                        <span className="pill">{pct}%</span>
                      </div>
                    </td>
                    <td>
                      <span className="pill">{g.minutes}</span>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}

      {tab === "all" && (
        <div className="tablewrap en" style={{ animationDelay: "380ms" }}>
          <table>
            <thead>
              <tr>
                <th>الطالب</th>
                <th>الصف</th>
                <th>الرمز</th>
                <th style={{ width: 120 }}>الإنجاز</th>
                <th>دقائق</th>
                <th>صفحات</th>
                <th>متأخر</th>
                <th />
              </tr>
            </thead>
            <tbody>
              {students.length === 0 ? (
                <tr>
                  <td colSpan={8} style={{ color: "var(--muted)" }}>
                    ما فيه طلاب بعد. أضفهم من تبويب "إضافة حساب".
                  </td>
                </tr>
              ) : (
                students
                  .map((s) => ({
                    ...s,
                    pct: s.total ? Math.round((s.done / s.total) * 100) : 0,
                  }))
                  .sort((a, b) => b.pct - a.pct)
                  .map((r) => (
                    <tr key={r.id}>
                      <td>{r.name}</td>
                      <td style={{ color: "var(--muted)" }}>{r.grade}</td>
                      <td>
                        <span className="pill">{r.code}</span>
                      </td>
                      <td>
                        <Bar pct={r.pct} />
                      </td>
                      <td>
                        <span className="pill">{r.minutes}</span>
                      </td>
                      <td>
                        <span className="pill">{r.pages}</span>
                      </td>
                      <td>
                        <span
                          className="pill"
                          style={{ color: r.late ? "var(--alert)" : "var(--muted)" }}
                        >
                          {r.late}
                        </span>
                      </td>
                      <td>
                        <button className="btn sm danger" onClick={() => remove(r)} disabled={busy}>
                          أوقف
                        </button>
                      </td>
                    </tr>
                  ))
              )}
            </tbody>
          </table>
        </div>
      )}

      {tab === "sups" && (
        <div className="tablewrap en" style={{ animationDelay: "380ms" }}>
          <table>
            <thead>
              <tr>
                <th>المشرف</th>
                <th>الصف</th>
                <th>الرمز</th>
                <th>طلابه</th>
                <th>مقررات أضافها</th>
                <th />
              </tr>
            </thead>
            <tbody>
              {sups.length === 0 ? (
                <tr>
                  <td colSpan={6} style={{ color: "var(--muted)" }}>
                    ما فيه مشرفون بعد.
                  </td>
                </tr>
              ) : (
                sups.map((p) => (
                  <tr key={p.id}>
                    <td>{p.name}</td>
                    <td style={{ color: "var(--muted)" }}>{p.grade}</td>
                    <td>
                      <span className="pill">{p.code}</span>
                    </td>
                    <td>
                      <span className="pill">{p.students}</span>
                    </td>
                    <td>
                      <span className="pill">{p.assignments}</span>
                    </td>
                    <td>
                      <button className="btn sm danger" onClick={() => remove(p)} disabled={busy}>
                        أوقف
                      </button>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      )}

      {tab === "add" && (
        <div className="form en" style={{ animationDelay: "380ms" }}>
          <div className="fl">
            <label>نوع الحساب</label>
            <div className="seg">
              <button
                className={f.role === "student" ? "on" : ""}
                onClick={() => setF({ ...f, role: "student" })}
              >
                طالب
              </button>
              <button
                className={f.role === "supervisor" ? "on" : ""}
                onClick={() => setF({ ...f, role: "supervisor" })}
              >
                مشرف
              </button>
            </div>
          </div>

          <div className="fl">
            <label>الاسم الثلاثي</label>
            <input
              value={f.name}
              onChange={(e) => setF({ ...f, name: e.target.value })}
              placeholder="عبدالله سعد الحارثي"
            />
          </div>

          <div className="fl">
            <label>الصف</label>
            <select value={f.grade} onChange={(e) => setF({ ...f, grade: e.target.value })}>
              {GRADES.map((g) => (
                <option key={g}>{g}</option>
              ))}
            </select>
          </div>

          <button className="btn" onClick={submit} disabled={!f.name.trim() || busy}>
            أضف الحساب
          </button>

          {f.role === "supervisor" && (
            <p style={{ fontSize: 12, color: "var(--muted)", marginTop: 12 }}>
              كل صف له مشرف واحد فقط. لو فيه مشرف للصف، أوقف حسابه أولًا.
            </p>
          )}

          {made && (
            <div className="made">
              <p className="eyebrow">
                رمز الدخول لـ {made.name} ({made.role === "student" ? "طالب" : "مشرف"})
              </p>
              <div className="bignum" style={{ fontSize: 64, margin: "10px 0" }} key={made.code}>
                <Odometer value={Number(made.code)} delay={140} />
              </div>
              <p style={{ fontSize: 12.5, color: "var(--muted)" }}>
                {made.grade} — سلّمه الرمز، هو مفتاحه الوحيد.
              </p>
            </div>
          )}
        </div>
      )}
    </>
  );
}

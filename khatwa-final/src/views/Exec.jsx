import React, { useState, useEffect, useCallback } from "react";
import {
  execBoard, createAccount, deactivateAccount, updateMyAccount, errorText,
} from "../lib/api";
import { Odometer, Bar, Loading, Failed, buzz } from "../components/UI";
import { GRADES, weekLabel, pctClass } from "../lib/helpers";

export default function Exec({ me, token, toast, onMeChange }) {
  const [data, setData] = useState(null);
  const [err, setErr] = useState("");
  const [tab, setTab] = useState("grades");
  const [q, setQ] = useState("");
  const [f, setF] = useState({ role: "student", name: "", grade: GRADES[0] });
  const [made, setMade] = useState(null);
  const [acc, setAcc] = useState({ name: me?.name || "", code: me?.code || "" });
  const [accMsg, setAccMsg] = useState("");
  const [busy, setBusy] = useState(false);

  const load = useCallback(async () => {
    try {
      setErr("");
      const r = await execBoard(token);
      if (!r.ok) return setErr(errorText(r.error));
      setData(r);
    } catch (e) { setErr(e.message); }
  }, [token]);

  useEffect(() => { load(); }, [load]);

  const addAccount = async () => {
    if (!f.name.trim()) return;
    setBusy(true);
    try {
      const r = await createAccount(token, f.role, f.name.trim(), f.grade);
      if (!r.ok) return toast(errorText(r.error));
      setMade({ name: f.name.trim(), code: r.code, grade: f.grade, role: f.role });
      setF({ ...f, name: "" });
      buzz(16);
      toast("انضاف الحساب");
      await load();
    } catch (e) { toast(e.message); }
    finally { setBusy(false); }
  };

  const stop = async (p) => {
    if (!confirm(`توقف حساب "${p.name}"؟ ما بيقدر يدخل بعدها، لكن بياناته تبقى محفوظة.`)) return;
    setBusy(true);
    try {
      await deactivateAccount(token, p.id);
      toast("أوقفنا الحساب");
      await load();
    } catch (e) { toast(e.message); }
    finally { setBusy(false); }
  };

  const saveMe = async () => {
    setBusy(true);
    try {
      const r = await updateMyAccount(token, acc.name.trim(), acc.code);
      if (!r.ok) { setAccMsg(errorText(r.error)); return; }
      setAccMsg("");
      toast("حدّثنا حسابك");
      onMeChange?.({ ...me, name: r.name, code: r.code });
    } catch (e) { setAccMsg(e.message); }
    finally { setBusy(false); }
  };

  if (err) return <Failed text={err} onRetry={load} />;
  if (!data) return <Loading />;

  const grades = data.grades || [];
  const students = (data.students || []).filter(
    (r) => !q.trim() || r.name.includes(q.trim()) || r.code.includes(q.trim()) || r.grade.includes(q.trim())
  );
  const sups = data.supervisors || [];
  const noPlan = grades.filter((g) => !g.has_plan && g.students > 0);

  return (
    <>
      <div className="hero">
        <p className="eyebrow en" style={{ animationDelay: "40ms" }}>مجموع ما أنجزته المدرسة</p>
        <div className="duo en" style={{ animationDelay: "90ms" }}>
          <div className="duonum audio">
            <Odometer value={Number(data.total_minutes) || 0} delay={420} />
            <span className="unit">دقيقة</span>
          </div>
          <span className="duosep" />
          <div className="duonum book">
            <Odometer value={Number(data.total_pages) || 0} delay={540} />
            <span className="unit">صفحة</span>
          </div>
        </div>
        <div className="herofoot en" style={{ animationDelay: "280ms" }}>
          <b>{(data.students || []).length}</b> طالب
          <span className="dot" />
          <b>{sups.length}</b> مشرفين
          <span className="dot" />
          {weekLabel(data.week_start)}
        </div>
      </div>

      <div className="tabs en" style={{ animationDelay: "320ms" }}>
        <button className={`tab ${tab === "grades" ? "on" : ""}`} onClick={() => setTab("grades")}>الصفوف</button>
        <button className={`tab ${tab === "all" ? "on" : ""}`} onClick={() => setTab("all")}>كل الطلاب</button>
        <button className={`tab ${tab === "sups" ? "on" : ""}`} onClick={() => setTab("sups")}>المشرفون</button>
        <button className={`tab ${tab === "add" ? "on" : ""}`} onClick={() => setTab("add")}>إضافة حساب</button>
        <button className={`tab ${tab === "me" ? "on" : ""}`} onClick={() => setTab("me")}>حسابي</button>
      </div>

      {tab === "grades" && (
        <>
          {noPlan.length > 0 && (
            <div className="warn en" style={{ animationDelay: "360ms" }}>
              <h4>{noPlan.length} صف بلا خطة هذا الأسبوع</h4>
              {noPlan.map((g) => <p key={g.grade}>{g.grade} — {g.supervisor || "بدون مشرف"}</p>)}
            </div>
          )}
          <div className="tablewrap en" style={{ animationDelay: "380ms" }}>
            <table>
              <thead>
                <tr>
                  <th>الصف</th><th>المشرف</th><th>طلاب</th>
                  <th style={{ width: 130 }}>هذا الأسبوع</th><th>دقائق</th><th>صفحات</th>
                </tr>
              </thead>
              <tbody>
                {grades.map((g, i) => (
                  <tr key={g.grade} className="en" style={{ animationDelay: `${400 + i * 60}ms` }}>
                    <td>{g.grade}{!g.has_plan && <span className="mini warn" style={{ marginRight: 8 }}>بلا خطة</span>}</td>
                    <td data-l="المشرف" className="muted">{g.supervisor || "بدون مشرف"}</td>
                    <td data-l="طلاب"><span className="pill">{g.students}</span></td>
                    <td data-l="هذا الأسبوع">
                      <div className="cellbar">
                        <Bar pct={Number(g.pct) || 0} tone={pctClass(Number(g.pct) || 0)} />
                        <span className="pill">{Number(g.pct) || 0}%</span>
                      </div>
                    </td>
                    <td data-l="دقائق"><span className="pill">{g.minutes}</span></td>
                    <td data-l="صفحات"><span className="pill">{g.pages}</span></td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </>
      )}

      {tab === "all" && (
        <>
          <input className="srch en" style={{ animationDelay: "350ms" }} value={q}
            onChange={(e) => setQ(e.target.value)} placeholder="ابحث بالاسم أو الرمز أو الصف..." />
          <div className="tablewrap en" style={{ animationDelay: "380ms" }}>
            <table>
              <thead>
                <tr>
                  <th>الطالب</th><th>الصف</th><th>الرمز</th>
                  <th style={{ width: 120 }}>هذا الأسبوع</th><th>دقائق</th><th>صفحات</th><th />
                </tr>
              </thead>
              <tbody>
                {students.length === 0 ? (
                  <tr><td className="muted">ما فيه نتائج</td></tr>
                ) : students.map((r, i) => (
                  <tr key={r.id} className="en" style={{ animationDelay: `${400 + i * 35}ms` }}>
                    <td>{r.name}</td>
                    <td data-l="الصف" className="muted">{r.grade}</td>
                    <td data-l="الرمز"><span className="pill">{r.code}</span></td>
                    <td data-l="هذا الأسبوع">
                      <div className="cellbar">
                        <Bar pct={r.week_pct} tone={pctClass(r.week_pct)} />
                        <span className="pill">{r.week_pct}%</span>
                      </div>
                    </td>
                    <td data-l="دقائق"><span className="pill">{r.minutes}</span></td>
                    <td data-l="صفحات"><span className="pill">{r.pages}</span></td>
                    <td data-l="">
                      <button className="mini" onClick={() => stop(r)} disabled={busy}>أوقف</button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </>
      )}

      {tab === "sups" && (
        <div className="tablewrap en" style={{ animationDelay: "380ms" }}>
          <table>
            <thead>
              <tr><th>المشرف</th><th>الصف</th><th>الرمز</th><th>طلابه</th><th>خططه</th><th /></tr>
            </thead>
            <tbody>
              {sups.length === 0 ? (
                <tr><td className="muted">ما فيه مشرفون بعد</td></tr>
              ) : sups.map((p, i) => (
                <tr key={p.id} className="en" style={{ animationDelay: `${400 + i * 50}ms` }}>
                  <td>{p.name}</td>
                  <td data-l="الصف" className="muted">{p.grade}</td>
                  <td data-l="الرمز"><span className="pill">{p.code}</span></td>
                  <td data-l="طلابه"><span className="pill">{p.students}</span></td>
                  <td data-l="خططه"><span className="pill">{p.plans}</span></td>
                  <td data-l="">
                    <button className="mini" onClick={() => stop(p)} disabled={busy}>أوقف</button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {tab === "add" && (
        <div className="form en" style={{ animationDelay: "380ms" }}>
          <div className="fl">
            <label>نوع الحساب</label>
            <div className="seg">
              <button className={f.role === "student" ? "on" : ""}
                onClick={() => setF({ ...f, role: "student" })}>طالب</button>
              <button className={f.role === "supervisor" ? "on" : ""}
                onClick={() => setF({ ...f, role: "supervisor" })}>مشرف</button>
            </div>
          </div>
          <div className="fl">
            <label>الاسم الثلاثي</label>
            <input value={f.name} placeholder="عبدالله سعد الحارثي"
              onChange={(e) => setF({ ...f, name: e.target.value })} />
          </div>
          <div className="fl">
            <label>الصف</label>
            <select value={f.grade} onChange={(e) => setF({ ...f, grade: e.target.value })}>
              {GRADES.map((g) => <option key={g}>{g}</option>)}
            </select>
          </div>
          <button className="btn" onClick={addAccount} disabled={!f.name.trim() || busy}>
            أضف الحساب
          </button>

          {f.role === "supervisor" && (
            <p className="muted" style={{ fontSize: 12, marginTop: 12 }}>
              كل صف له مشرف واحد. لو فيه مشرف نشط للصف، أوقفه أولًا.
            </p>
          )}

          {made && (
            <div className="made">
              <p className="eyebrow">
                رمز الدخول لـ {made.name} ({made.role === "student" ? "طالب" : "مشرف"})
              </p>
              <div className="bignum" style={{ fontSize: 62, margin: "10px 0" }} key={made.code}>
                <Odometer value={Number(made.code)} delay={140} />
              </div>
              <p className="muted" style={{ fontSize: 12.5 }}>
                {made.grade} — سلّمه الرمز، هو مفتاحه الوحيد.
              </p>
            </div>
          )}
        </div>
      )}

      {tab === "me" && (
        <div className="form en" style={{ animationDelay: "380ms" }}>
          <div className="fl">
            <label>اسمك</label>
            <input value={acc.name} placeholder="اسمك الكامل"
              onChange={(e) => { setAcc({ ...acc, name: e.target.value }); setAccMsg(""); }} />
          </div>
          <div className="fl">
            <label>رمز دخولك (٤ أرقام)</label>
            <input value={acc.code} inputMode="numeric" dir="ltr"
              style={{ fontFamily: "'IBM Plex Mono', monospace", letterSpacing: ".3em" }}
              placeholder="0000"
              onChange={(e) =>
                /^\d{0,4}$/.test(e.target.value) && (setAcc({ ...acc, code: e.target.value }), setAccMsg(""))} />
          </div>
          <button className="btn" onClick={saveMe}
            disabled={busy || acc.name.trim().length < 2 || !/^\d{4}$/.test(acc.code)}>
            احفظ التغييرات
          </button>
          {accMsg && <p className="errline">{accMsg}</p>}
          <p className="muted" style={{ fontSize: 12, marginTop: 18, lineHeight: 1.9 }}>
            رمزك يفتح بيانات المدرسة كاملة — اختر رمزًا لا يسهل تخمينه، وتجنّب الأرقام
            المتسلسلة أو المكرّرة. احفظه في مكان آمن، فلا توجد طريقة لاستعادته إن نسيته.
          </p>
        </div>
      )}
    </>
  );
}

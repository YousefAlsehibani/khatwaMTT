import React, { useState, useEffect, useCallback } from "react";
import { supervisorBoard, saveAssignment, deleteAssignment, errorText } from "../lib/api";
import { Hero, Bar, Loading, Failed, fmtDate } from "../components/UI";
import { todayIso } from "../lib/helpers";

const EMPTY = { id: null, kind: "audio", title: "", url: "", amount: "", due_date: todayIso() };

export default function Supervisor({ me, token, toast }) {
  const [data, setData] = useState(null);
  const [err, setErr] = useState("");
  const [tab, setTab] = useState("class");
  const [f, setF] = useState(EMPTY);
  const [busy, setBusy] = useState(false);

  const load = useCallback(async () => {
    try {
      setErr("");
      const r = await supervisorBoard(token);
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
    if (!f.title.trim() || !f.amount) return;
    setBusy(true);
    try {
      const r = await saveAssignment(token, f);
      if (!r.ok) return toast(errorText(r.error));
      toast(f.id ? "حدّثنا المقرر" : `انضاف المقرر لطلاب ${me.grade}`);
      setF(EMPTY);
      setTab("list");
      await load();
    } catch (e) {
      toast(e.message);
    } finally {
      setBusy(false);
    }
  };

  const edit = (a) => {
    setF({
      id: a.id,
      kind: a.kind,
      title: a.title,
      url: a.url || "",
      amount: String(a.amount),
      due_date: a.due_date,
    });
    setTab("add");
  };

  const remove = async (a) => {
    if (!confirm(`تحذف "${a.title}"؟ بينحذف معه إنجاز الطلاب فيه، وما فيه رجعة.`)) return;
    setBusy(true);
    try {
      const r = await deleteAssignment(token, a.id);
      if (!r.ok) return toast("ما قدرنا نحذفه");
      toast("انحذف المقرر");
      await load();
    } catch (e) {
      toast(e.message);
    } finally {
      setBusy(false);
    }
  };

  if (err) return <Failed text={err} onRetry={load} />;
  if (!data) return <Loading />;

  const students = data.students || [];
  const assignments = data.assignments || [];
  const total = assignments.length;

  const rows = students
    .map((s) => ({
      ...s,
      pct: total ? Math.round((s.done / total) * 100) : 0,
    }))
    .sort((a, b) => b.pct - a.pct);

  const behind = rows.filter((r) => r.late > 0);
  const avg = rows.length ? Math.round(rows.reduce((x, r) => x + r.pct, 0) / rows.length) : 0;
  const classMinutes = rows.reduce((x, r) => x + Number(r.minutes || 0), 0);

  return (
    <>
      <Hero
        eyebrow={`متوسط إنجاز ${me.grade}`}
        value={avg}
        unit="٪"
        pct={avg}
        foot={
          <>
            <b>{students.length}</b> طالب
            <span className="dot" />
            <b>{total}</b> مقرر
            <span className="dot" />
            <b className="bk">{classMinutes}</b> دقيقة للصف
            {behind.length > 0 && (
              <>
                <span className="dot" />
                <span className="late">{behind.length} متأخرين</span>
              </>
            )}
          </>
        }
      />

      <div className="tabs en" style={{ animationDelay: "330ms" }}>
        <button className={`tab ${tab === "class" ? "on" : ""}`} onClick={() => setTab("class")}>
          الطلاب
        </button>
        <button
          className={`tab ${tab === "add" ? "on" : ""}`}
          onClick={() => {
            setF(EMPTY);
            setTab("add");
          }}
        >
          إضافة مقرر
        </button>
        <button className={`tab ${tab === "list" ? "on" : ""}`} onClick={() => setTab("list")}>
          المقررات
        </button>
      </div>

      {tab === "class" && (
        <>
          {behind.length > 0 && (
            <div className="warn en" style={{ animationDelay: "380ms" }}>
              <h4>{behind.length} طالب متأخرين</h4>
              {behind.map((r) => (
                <p key={r.id}>
                  {r.name} — {r.late} مقرر
                </p>
              ))}
            </div>
          )}

          <div className="tablewrap en" style={{ animationDelay: "420ms" }}>
            <table>
              <thead>
                <tr>
                  <th>الطالب</th>
                  <th>الرمز</th>
                  <th style={{ width: 150 }}>الإنجاز</th>
                  <th>دقائق</th>
                  <th>صفحات</th>
                  <th>متأخر</th>
                </tr>
              </thead>
              <tbody>
                {rows.length === 0 ? (
                  <tr>
                    <td colSpan={6} style={{ color: "var(--muted)" }}>
                      ما فيه طلاب في هذا الصف بعد. المشرف التنفيذي يضيفهم.
                    </td>
                  </tr>
                ) : (
                  rows.map((r) => (
                    <tr key={r.id}>
                      <td>{r.name}</td>
                      <td>
                        <span className="pill">{r.code}</span>
                      </td>
                      <td>
                        <div className="cellbar">
                          <Bar pct={r.pct} />
                          <span className="pill">
                            {r.done}/{total}
                          </span>
                        </div>
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
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </>
      )}

      {tab === "add" && (
        <div className="form en" style={{ animationDelay: "380ms" }}>
          <div className="fl">
            <label>نوع المقرر</label>
            <div className="seg">
              <button
                className={f.kind === "audio" ? "on" : ""}
                onClick={() => setF({ ...f, kind: "audio" })}
              >
                مقطع بالدقائق
              </button>
              <button
                className={f.kind === "book" ? "on" : ""}
                onClick={() => setF({ ...f, kind: "book" })}
              >
                كتاب بالصفحات
              </button>
            </div>
          </div>

          <div className="fl">
            <label>العنوان</label>
            <input
              value={f.title}
              onChange={(e) => setF({ ...f, title: e.target.value })}
              placeholder={f.kind === "audio" ? "شرح الكسور الاعتيادية" : "العلوم — الفصل الثالث"}
            />
          </div>

          {f.kind === "audio" && (
            <div className="fl">
              <label>رابط المقطع</label>
              <input
                value={f.url}
                onChange={(e) => setF({ ...f, url: e.target.value })}
                placeholder="https://"
                dir="ltr"
              />
            </div>
          )}

          <div className="r2">
            <div className="fl">
              <label>{f.kind === "audio" ? "الدقائق" : "الصفحات"}</label>
              <input
                value={f.amount}
                inputMode="numeric"
                placeholder="0"
                onChange={(e) =>
                  /^\d{0,3}$/.test(e.target.value) && setF({ ...f, amount: e.target.value })
                }
              />
            </div>
            <div className="fl">
              <label>تاريخ التسليم</label>
              <input
                type="date"
                value={f.due_date}
                onChange={(e) => setF({ ...f, due_date: e.target.value })}
              />
            </div>
          </div>

          <div style={{ display: "flex", gap: 10, alignItems: "center" }}>
            <button
              className="btn"
              onClick={submit}
              disabled={!f.title.trim() || !f.amount || busy || (f.kind === "audio" && !f.url.trim())}
            >
              {f.id ? "احفظ التعديل" : "أضف المقرر"}
            </button>
            {f.id && (
              <button className="undo" onClick={() => setF(EMPTY)}>
                إلغاء التعديل
              </button>
            )}
          </div>

          {f.kind === "audio" && !f.url.trim() && (
            <p style={{ fontSize: 12, color: "var(--muted)", marginTop: 10 }}>
              المقطع لازم له رابط عشان الطالب يقدر يسمعه.
            </p>
          )}
        </div>
      )}

      {tab === "list" && (
        <div className="tablewrap en" style={{ animationDelay: "380ms" }}>
          <table>
            <thead>
              <tr>
                <th>المقرر</th>
                <th>المقدار</th>
                <th>التاريخ</th>
                <th>أنجزه</th>
                <th />
              </tr>
            </thead>
            <tbody>
              {assignments.length === 0 ? (
                <tr>
                  <td colSpan={5} style={{ color: "var(--muted)" }}>
                    ما أضفت مقررات بعد.
                  </td>
                </tr>
              ) : (
                assignments.map((a) => (
                  <tr key={a.id}>
                    <td>{a.title}</td>
                    <td>
                      <span className={`tag ${a.kind}`}>
                        {a.kind === "audio" ? `${a.amount} د` : `${a.amount} ص`}
                      </span>
                    </td>
                    <td>{fmtDate(a.due_date)}</td>
                    <td>
                      <span className="pill">
                        {a.done_count}/{data.total_students}
                      </span>
                    </td>
                    <td style={{ whiteSpace: "nowrap" }}>
                      <button className="btn sm" onClick={() => edit(a)} disabled={busy}>
                        عدّل
                      </button>{" "}
                      <button className="btn sm danger" onClick={() => remove(a)} disabled={busy}>
                        احذف
                      </button>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      )}
    </>
  );
}

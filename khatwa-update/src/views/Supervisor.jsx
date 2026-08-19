import React, { useState, useEffect, useCallback } from "react";
import {
  supervisorBoard, savePlan, deletePlan, markReviewed, errorText,
} from "../lib/api";
import { Odometer, Bar, Modal, Loading, Failed, buzz, Btn } from "../components/UI";
import {
  thisWeekStart, weekLabel, relWeek, iso, addDays, parse, pctClass, fmtDate,
} from "../lib/helpers";

const EMPTY_CLIP = { title: "", url: "", minutes: "" };

/* ================= محرّر الخطة ================= */
function PlanEditor({ weekStart, plan, token, onDone, toast }) {
  const [book, setBook] = useState({
    title: plan?.book_title || "",
    from: plan?.page_from ? String(plan.page_from) : "",
    to: plan?.page_to ? String(plan.page_to) : "",
  });
  const [clips, setClips] = useState(
    plan?.clips?.length
      ? plan.clips.map((c) => ({ title: c.title, url: c.url, minutes: String(c.minutes) }))
      : []
  );
  const [q, setQ] = useState({
    text: plan?.q_text || "",
    kind: plan?.q_kind || "text",
    options: plan?.q_options?.length ? plan.q_options : ["", ""],
  });
  const [makeup, setMakeup] = useState(!!plan?.is_makeup);
  const [busy, setBusy] = useState(false);

  const setClip = (i, k, v) =>
    setClips((c) => c.map((x, j) => (j === i ? { ...x, [k]: v } : x)));

  const bookOk =
    !book.title.trim() ||
    (Number(book.from) >= 1 && Number(book.to) >= Number(book.from));

  const clipsOk = clips.every(
    (c) => c.title.trim() && /^https?:\/\//.test(c.url.trim()) && Number(c.minutes) >= 1
  );

  const qOk =
    !q.text.trim() ||
    q.kind === "text" ||
    q.options.filter((o) => o.trim()).length >= 2;

  const save = async () => {
    if (!bookOk || !clipsOk || !qOk) return;
    setBusy(true);
    try {
      const r = await savePlan(token, {
        week_start: weekStart,
        book_title: book.title.trim() || null,
        page_from: book.title.trim() ? Number(book.from) : null,
        page_to: book.title.trim() ? Number(book.to) : null,
        q_text: q.text.trim() || null,
        q_kind: q.text.trim() ? q.kind : null,
        q_options:
          q.text.trim() && q.kind === "choice"
            ? q.options.filter((o) => o.trim())
            : null,
        clips: clips.map((c) => ({
          title: c.title.trim(), url: c.url.trim(), minutes: Number(c.minutes),
        })),
        is_makeup: makeup,
      });
      if (!r.ok) return toast(errorText(r.error));
      buzz(16);
      toast("انحفظت خطة الأسبوع");
      onDone();
    } catch (e) { toast(e.message); }
    finally { setBusy(false); }
  };

  const pages =
    book.from && book.to && Number(book.to) >= Number(book.from)
      ? Number(book.to) - Number(book.from) + 1
      : 0;
  const totalMin = clips.reduce((s, c) => s + (Number(c.minutes) || 0), 0);

  return (
    <div className="editor en" style={{ animationDelay: "380ms" }}>
      {/* الكتاب */}
      <section className="esec">
        <div className="esechead">
          <span className="utag book">كتاب</span>
          <h4>مدى القراءة هذا الأسبوع</h4>
        </div>
        <div className="fl">
          <label>اسم الكتاب <em>(اتركه فاضيًا لو ما فيه قراءة)</em></label>
          <input value={book.title} placeholder="رياض الصالحين"
            onChange={(e) => setBook({ ...book, title: e.target.value })} />
        </div>
        {book.title.trim() && (
          <>
            <div className="r2">
              <div className="fl">
                <label>من صفحة</label>
                <input value={book.from} inputMode="numeric" placeholder="5"
                  onChange={(e) => /^\d{0,4}$/.test(e.target.value) && setBook({ ...book, from: e.target.value })} />
              </div>
              <div className="fl">
                <label>إلى صفحة</label>
                <input value={book.to} inputMode="numeric" placeholder="30"
                  onChange={(e) => /^\d{0,4}$/.test(e.target.value) && setBook({ ...book, to: e.target.value })} />
              </div>
            </div>
            {pages > 0 && <p className="calc">= <b>{pages}</b> صفحة على ٧ أيام ≈ <b>{Math.ceil(pages / 7)}</b> يوميًا</p>}
            {!bookOk && <p className="errline">"إلى" لازم يكون أكبر من "من".</p>}
          </>
        )}
      </section>

      {/* المقاطع */}
      <section className="esec">
        <div className="esechead">
          <span className="utag audio">مقاطع</span>
          <h4>{clips.length ? `${clips.length} مقطع · ${totalMin} دقيقة` : "لا مقاطع"}</h4>
        </div>

        {clips.map((c, i) => (
          <div key={i} className="clipedit">
            <div className="fl">
              <label>عنوان المقطع {i + 1}</label>
              <input value={c.title} placeholder="أحكام النون الساكنة"
                onChange={(e) => setClip(i, "title", e.target.value)} />
            </div>
            <div className="r2">
              <div className="fl">
                <label>الرابط</label>
                <input value={c.url} dir="ltr" placeholder="https://"
                  onChange={(e) => setClip(i, "url", e.target.value)} />
              </div>
              <div className="fl">
                <label>الدقائق</label>
                <input value={c.minutes} inputMode="numeric" placeholder="12"
                  onChange={(e) => /^\d{0,3}$/.test(e.target.value) && setClip(i, "minutes", e.target.value)} />
              </div>
            </div>
            <button className="undo" onClick={() => setClips(clips.filter((_, j) => j !== i))}>
              احذف المقطع
            </button>
          </div>
        ))}

        <Btn className="ghostbtn" onClick={() => setClips([...clips, { ...EMPTY_CLIP }])}>
          + أضف مقطعًا
        </Btn>
      </section>

      {/* السؤال */}
      <section className="esec">
        <div className="esechead">
          <span className="utag q">سؤال</span>
          <h4>يظهر للطالب بعد إتمام كل المقررات</h4>
        </div>
        <div className="fl">
          <label>نص السؤال <em>(اتركه فاضيًا لو ما تبي سؤالًا)</em></label>
          <input value={q.text} placeholder="وش أهم فائدة خرجت فيها هذا الأسبوع؟"
            onChange={(e) => setQ({ ...q, text: e.target.value })} />
        </div>

        {q.text.trim() && (
          <>
            <div className="fl">
              <label>نوع الإجابة</label>
              <div className="seg">
                <button className={q.kind === "text" ? "on" : ""}
                  onClick={() => setQ({ ...q, kind: "text" })}>نص يكتبه الطالب</button>
                <button className={q.kind === "choice" ? "on" : ""}
                  onClick={() => setQ({ ...q, kind: "choice" })}>اختيار من متعدد</button>
              </div>
            </div>

            {q.kind === "choice" && (
              <>
                {q.options.map((o, i) => (
                  <div className="fl" key={i}>
                    <label>الخيار {i + 1}</label>
                    <input value={o}
                      onChange={(e) =>
                        setQ({ ...q, options: q.options.map((x, j) => (j === i ? e.target.value : x)) })} />
                  </div>
                ))}
                <div className="modalrow" style={{ justifyContent: "flex-start" }}>
                  {q.options.length < 6 && (
                    <button className="undo" onClick={() => setQ({ ...q, options: [...q.options, ""] })}>
                      + خيار
                    </button>
                  )}
                  {q.options.length > 2 && (
                    <button className="undo" onClick={() => setQ({ ...q, options: q.options.slice(0, -1) })}>
                      − خيار
                    </button>
                  )}
                </div>
                {!qOk && <p className="errline">لازم خياران على الأقل بنص.</p>}
              </>
            )}
          </>
        )}
      </section>

      <label className="chk">
        <input type="checkbox" checked={makeup} onChange={(e) => setMakeup(e.target.checked)} />
        <span>أسبوع تعويض — لتدارك ما فات الطلاب</span>
      </label>

      <div className="modalrow" style={{ marginTop: 18 }}>
        <Btn onClick={save}
          disabled={busy || !bookOk || !clipsOk || !qOk || (!book.title.trim() && clips.length === 0)}>
          {plan ? "احفظ التعديل" : "أنشئ الخطة"}
        </Btn>
      </div>
      {!book.title.trim() && clips.length === 0 && (
        <p className="errline">أضف كتابًا أو مقطعًا واحدًا على الأقل.</p>
      )}
    </div>
  );
}

/* ================= الواجهة ================= */
export default function Supervisor({ me, token, toast }) {
  const [data, setData] = useState(null);
  const [err, setErr] = useState("");
  const [tab, setTab] = useState("week");
  const [week, setWeek] = useState(null);
  const [editing, setEditing] = useState(false);
  const [ans, setAns] = useState(null);

  const load = useCallback(async (w = null) => {
    try {
      setErr("");
      const r = await supervisorBoard(token, w);
      if (!r.ok) return setErr(errorText(r.error));
      setData(r);
    } catch (e) { setErr(e.message); }
  }, [token]);

  useEffect(() => { load(week); }, [load, week]);

  if (err) return <Failed text={err} onRetry={() => load(week)} />;
  if (!data) return <Loading />;

  const plan = data.plan;
  const students = data.students || [];
  const cur = data.week_start;
  const isThis = cur === thisWeekStart();

  const pcts = students.map((s) => s.summary?.pct || 0);
  const avg = pcts.length ? Math.round(pcts.reduce((a, b) => a + b, 0) / pcts.length) : 0;
  const completed = students.filter((s) => s.summary?.complete).length;
  const answers = students.filter((s) => s.answer);
  const unread = answers.filter((s) => !s.answer.reviewed).length;

  const review = async (s, val) => {
    try {
      await markReviewed(token, plan.id, s.id, val);
      buzz(8);
      await load(week);
    } catch (e) { toast(e.message); }
  };

  return (
    <>
      <div className="hero">
        <p className="eyebrow en" style={{ animationDelay: "40ms" }}>متوسط إنجاز {me.grade}</p>
        <div className="bignum en" style={{ animationDelay: "90ms" }}>
          <Odometer value={avg} delay={420} />
          <span className="unit">٪</span>
        </div>
        <div className="herofoot en" style={{ animationDelay: "240ms" }}>
          <b>{students.length}</b> طالب
          <span className="dot" />
          <b>{completed}</b> أكملوا الأسبوع
          {unread > 0 && (<><span className="dot" /><span className="warnc">{unread} إجابة جديدة</span></>)}
        </div>
      </div>

      <div className="tabs en" style={{ animationDelay: "320ms" }}>
        <button className={`tab ${tab === "week" ? "on" : ""}`} onClick={() => setTab("week")}>الأسبوع</button>
        <button className={`tab ${tab === "students" ? "on" : ""}`} onClick={() => setTab("students")}>الطلاب</button>
        <button className={`tab ${tab === "answers" ? "on" : ""}`} onClick={() => setTab("answers")}>
          الإجابات{unread > 0 ? ` (${unread})` : ""}
        </button>
      </div>

      {/* شريط الأسابيع */}
      {tab !== "answers" && (
        <div className="weeknav en" style={{ animationDelay: "350ms" }}>
          <button className="navb" onClick={() => setWeek(iso(addDays(parse(cur), -7)))}>‹</button>
          <div className="weektitle">
            <b>{weekLabel(cur)}</b>
            <small>{relWeek(cur)}{plan?.is_makeup ? " · تعويض" : ""}</small>
          </div>
          <button className="navb" onClick={() => setWeek(iso(addDays(parse(cur), 7)))}>›</button>
        </div>
      )}

      {/* ===== تبويب الأسبوع ===== */}
      {tab === "week" && (
        editing || !plan ? (
          <>
            {plan && (
              <button className="undo" style={{ marginBottom: 14 }} onClick={() => setEditing(false)}>
                ← رجوع بلا حفظ
              </button>
            )}
            <PlanEditor weekStart={cur} plan={plan} token={token} toast={toast}
              onDone={() => { setEditing(false); load(week); }} />
          </>
        ) : (
          <div className="en" style={{ animationDelay: "380ms" }}>
            <div className="planview">
              {plan.book_title && (
                <div className="unit book">
                  <div className="unithead">
                    <span className="utag book">كتاب</span>
                    <h3>{plan.book_title}</h3>
                  </div>
                  <p className="planline">
                    من صفحة <b>{plan.page_from}</b> إلى <b>{plan.page_to}</b>
                    <span className="dot" />
                    {plan.page_to - plan.page_from + 1} صفحة
                  </p>
                </div>
              )}

              {plan.clips?.length > 0 && (
                <div className="unit">
                  <div className="unithead">
                    <span className="utag audio">مقاطع</span>
                    <h3>{plan.clips.length} مقطع</h3>
                  </div>
                  {plan.clips.map((c) => (
                    <p className="planline" key={c.id}>
                      {c.title} <span className="pill">{c.minutes} د</span>
                    </p>
                  ))}
                </div>
              )}

              {plan.q_text && (
                <div className="unit">
                  <div className="unithead">
                    <span className="utag q">سؤال</span>
                    <h3>{plan.q_kind === "choice" ? "اختيار من متعدد" : "إجابة مكتوبة"}</h3>
                  </div>
                  <p className="planline">{plan.q_text}</p>
                </div>
              )}
            </div>

            <div className="modalrow" style={{ marginTop: 18 }}>
              <Btn onClick={() => setEditing(true)}>عدّل الخطة</Btn>
              <Btn className="danger" onClick={async () => {
                if (!confirm("تحذف خطة هذا الأسبوع؟ بينحذف معها تقدّم الطلاب فيها، وما فيه رجعة.")) return;
                const r = await deletePlan(token, plan.id);
                if (r.ok) { toast("انحذفت الخطة"); load(week); }
              }}>احذف</Btn>
            </div>
          </div>
        )
      )}

      {/* ===== تبويب الطلاب ===== */}
      {tab === "students" && (
        <div className="tablewrap en" style={{ animationDelay: "380ms" }}>
          {students.length === 0 ? (
            <div className="empty"><b>ما فيه طلاب</b>المشرف التنفيذي يضيفهم.</div>
          ) : (
            <table>
              <thead>
                <tr>
                  <th>الطالب</th><th>الرمز</th><th style={{ width: 140 }}>هذا الأسبوع</th>
                  <th>الكتاب</th><th>المقاطع</th><th>السؤال</th>
                </tr>
              </thead>
              <tbody>
                {students.map((s, i) => {
                  const u = s.summary;
                  return (
                    <tr key={s.id} className="en" style={{ animationDelay: `${400 + i * 45}ms` }}>
                      <td>{s.name}</td>
                      <td data-l="الرمز"><span className="pill">{s.code}</span></td>
                      <td data-l="هذا الأسبوع">
                        <div className="cellbar">
                          <Bar pct={u?.pct || 0} tone={u?.complete ? "high" : pctClass(u?.pct || 0)} />
                          <span className="pill">{u?.pct || 0}%</span>
                        </div>
                      </td>
                      <td data-l="الكتاب">
                        <span className="pill">
                          {u?.book ? `${u.book.current_page}/${u.book.page_to}` : "—"}
                        </span>
                      </td>
                      <td data-l="المقاطع">
                        <span className="pill">{u ? `${u.clips_done}/${u.clips_total}` : "—"}</span>
                      </td>
                      <td data-l="السؤال">
                        {s.answer ? (
                          <button className="mini ok" onClick={() => setAns(s)}>قرأ ✓</button>
                        ) : u?.needs_answer ? (
                          <span className="mini warn">منتظر</span>
                        ) : (
                          <span className="pill">—</span>
                        )}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          )}
        </div>
      )}

      {/* ===== تبويب الإجابات ===== */}
      {tab === "answers" && (
        <div className="en" style={{ animationDelay: "380ms" }}>
          {answers.length === 0 ? (
            <div className="empty"><b>ما فيه إجابات بعد</b>تظهر هنا لمّا يكمل الطلاب أسبوعهم.</div>
          ) : (
            answers.map((s, i) => (
              <div key={s.id} className={`answer en ${s.answer.reviewed ? "read" : ""}`}
                   style={{ animationDelay: `${400 + i * 60}ms` }}>
                <div className="ahead">
                  <b>{s.name}</b>
                  <span className="pill">{fmtDate(s.answer.at.slice(0, 10))}</span>
                  <button className={`mini ${s.answer.reviewed ? "ok" : ""}`}
                    onClick={() => review(s, !s.answer.reviewed)}>
                    {s.answer.reviewed ? "مراجَعة ✓" : "علّم مراجَعة"}
                  </button>
                </div>
                <p className="atext">{s.answer.text}</p>
              </div>
            ))
          )}
        </div>
      )}

      {/* نافذة إجابة طالب */}
      <Modal open={!!ans} onClose={() => setAns(null)} title={ans?.name}>
        <p className="qtext">{plan?.q_text}</p>
        <p className="atext" style={{ marginBottom: 18 }}>{ans?.answer?.text}</p>
        <div className="modalrow">
          <Btn className="ghostbtn" onClick={() => setAns(null)}>إغلاق</Btn>
          <Btn onClick={() => { review(ans, !ans.answer.reviewed); setAns(null); }}>
            {ans?.answer?.reviewed ? "ألغِ المراجعة" : "علّم مراجَعة"}
          </Btn>
        </div>
      </Modal>
    </>
  );
}

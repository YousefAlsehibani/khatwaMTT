import React, { useState, useEffect, useMemo, useCallback, useRef } from "react";
import { studentBoard, markDone, unmarkDone, errorText } from "../lib/api";
import { Hero, Rail, Odometer, Loading, Failed, fmtDate, buzz } from "../components/UI";
import { todayIso, iso, weekDays, calcStreak, bestStreak, heatDays } from "../lib/helpers";

/* ---------- سطر مقرر ---------- */
function Row({ a, i, onDone, onUndo, just, busy }) {
  const [p, setP] = useState("");
  const T = todayIso();
  const late = a.due_date < T && !a.done;
  const partial = a.done && a.kind === "book" && a.pages_read < a.amount;

  return (
    <div
      className={`row en ${a.done && !partial ? "done" : ""} ${partial ? "partial" : ""} ${just === a.id ? "just" : ""}`}
      style={{ animationDelay: `${430 + i * 70}ms` }}
    >
      <span className="sweep" />
      <span className={`tag ${a.kind}`}>
        {a.kind === "audio" ? `${a.amount} د` : `${a.amount} ص`}
      </span>

      <div className="rtitle">
        <h3>{a.title}</h3>
        <span className="strike" />
        <small className={late ? "late" : ""}>
          {fmtDate(a.due_date)}
          {late ? " · فات موعده" : ""}
        </small>
        {partial && (
          <div className="pagebar">
            <i style={{ width: `${(a.pages_read / a.amount) * 100}%` }} />
          </div>
        )}
      </div>

      <div className="ract">
        {a.url && !a.done && (
          <a className="lk" href={a.url} target="_blank" rel="noreferrer">افتح ↗</a>
        )}

        {a.done ? (
          <>
            <span className="stamp">
              {partial
                ? `${a.pages_read} من ${a.amount} صفحة`
                : `✓ ${a.kind === "audio" ? `${a.amount} دقيقة` : `${a.pages_read} صفحة`}`}
            </span>
            <button className="undo" onClick={() => { onUndo(a); buzz(8); }} disabled={busy}>
              تراجع
            </button>
          </>
        ) : a.kind === "audio" ? (
          <button className="btn audio" onClick={() => { onDone(a, null); buzz(14); }} disabled={busy}>
            سمعت
          </button>
        ) : (
          <>
            <input
              className="pin"
              value={p}
              placeholder="0"
              inputMode="numeric"
              aria-label="عدد الصفحات"
              onChange={(e) => /^\d{0,3}$/.test(e.target.value) && setP(e.target.value)}
            />
            <span style={{ fontSize: 12, color: "var(--muted)" }}>من {a.amount}</span>
            <button
              className="btn book"
              disabled={!p || Number(p) < 1 || busy}
              onClick={() => { onDone(a, Math.min(Number(p), a.amount)); setP(""); buzz(14); }}
            >
              سجّل
            </button>
          </>
        )}
      </div>
    </div>
  );
}

/* ---------- تبويب السجل ---------- */
function Record({ assignments, minutes, pages, streak, best }) {
  const [tip, setTip] = useState(null);
  const T = todayIso();

  const done = assignments.filter((a) => a.done);
  const records = done.map((a) => ({ completed_at: a.completed_at }));
  const days = useMemo(() => heatDays(records, 84), [assignments]);

  const audioCount = done.filter((a) => a.kind === "audio").length;
  const bookCount = done.filter((a) => a.kind === "book").length;
  const activeDays = new Set(done.map((a) => (a.completed_at || "").slice(0, 10))).size;
  const pct = assignments.length ? Math.round((done.length / assignments.length) * 100) : 0;

  return (
    <>
      <div className="statgrid en" style={{ animationDelay: "380ms" }}>
        <div className="stat">
          <span className="sv" style={{ color: "var(--audio)" }}>{minutes}</span>
          <span className="sl">دقيقة مسموعة</span>
          <span className="sx">{audioCount} مقطع</span>
        </div>
        <div className="stat">
          <span className="sv" style={{ color: "var(--book)" }}>{pages}</span>
          <span className="sl">صفحة مقروءة</span>
          <span className="sx">{bookCount} كتاب</span>
        </div>
        <div className="stat">
          <span className="sv">{activeDays}</span>
          <span className="sl">يوم نشِط</span>
          <span className="sx">أطول سلسلة {best} يوم</span>
        </div>
        <div className="stat">
          <span className="sv">{pct}%</span>
          <span className="sl">من كل المقررات</span>
          <span className="sx">{done.length} من {assignments.length}</span>
        </div>
      </div>

      <div className="blk en" style={{ animationDelay: "440ms", marginTop: 30 }}>
        <div style={{ display: "flex", alignItems: "baseline", gap: 10, marginBottom: 12 }}>
          <h4 style={{ margin: 0 }}>آخر ١٢ أسبوعًا</h4>
          <small className="pill">
            {tip ? `${fmtDate(tip.k)} — ${tip.n} مقرر` : "مرّر على أي مربع"}
          </small>
        </div>

        <div className="heat big">
          {days.map((d) => (
            <div
              key={d.k}
              className={`hcell ${d.lvl ? "l" + d.lvl : ""} ${d.k === T ? "now" : ""}`}
              onMouseEnter={() => setTip(d)}
              onTouchStart={() => setTip(d)}
              title={`${fmtDate(d.k)} — ${d.n} مقرر`}
            />
          ))}
        </div>

        <div className="heatkey">
          <span>أقل</span>
          <i style={{ background: "var(--hair)" }} />
          <i className="hcell l1" />
          <i className="hcell l2" />
          <i className="hcell l3" />
          <span>أكثر</span>
        </div>

        <p style={{ fontSize: 12, color: "var(--muted)", marginTop: 14, lineHeight: 1.8 }}>
          كل مربع يوم واحد، ولونه يغمق كل ما أنجزت فيه أكثر. الفراغات الطويلة تبيّن لك أيام الانقطاع.
        </p>
      </div>
    </>
  );
}

/* ---------- الواجهة ---------- */
export default function Student({ me, token, toast }) {
  const [data, setData] = useState(null);
  const [err, setErr] = useState("");
  const [tab, setTab] = useState("now");
  const [sel, setSel] = useState(todayIso());
  const [pop, setPop] = useState(null);
  const [just, setJust] = useState(null);
  const [ringKey, setRingKey] = useState(null);
  const [busy, setBusy] = useState(false);
  const touch = useRef(null);

  const load = useCallback(async () => {
    try {
      setErr("");
      const r = await studentBoard(token);
      if (!r.ok) return setErr(errorText(r.error));
      setData(r);
    } catch (e) {
      setErr(e.message);
    }
  }, [token]);

  useEffect(() => { load(); }, [load]);
  useEffect(() => { if (!pop) return; const t = setTimeout(() => setPop(null), 1600); return () => clearTimeout(t); }, [pop]);
  useEffect(() => { if (!just) return; const t = setTimeout(() => setJust(null), 900); return () => clearTimeout(t); }, [just]);
  useEffect(() => { if (!ringKey) return; const t = setTimeout(() => setRingKey(null), 1000); return () => clearTimeout(t); }, [ringKey]);

  const onDone = async (a, pages) => {
    setBusy(true);
    try {
      const r = await markDone(token, a.id, pages);
      if (!r.ok) return toast(errorText(r.error));
      setJust(a.id);
      setRingKey(Date.now());
      setPop({
        k: Date.now(),
        n: a.kind === "audio" ? a.amount : pages,
        color: a.kind === "audio" ? "var(--audio)" : "var(--book)",
      });
      await load();
    } catch (e) {
      toast(e.message);
    } finally {
      setBusy(false);
    }
  };

  const onUndo = async (a) => {
    setBusy(true);
    try {
      const r = await unmarkDone(token, a.id);
      if (!r.ok) return toast(errorText(r.error));
      toast("رجّعناه غير مكتمل");
      await load();
    } catch (e) {
      toast(e.message);
    } finally {
      setBusy(false);
    }
  };

  const wk = useMemo(() => weekDays().map(iso), []);
  const T = todayIso();

  /* تمرير بين الأيام على الجوال */
  const onTouchStart = (e) => { touch.current = e.touches[0].clientX; };
  const onTouchEnd = (e) => {
    if (touch.current === null) return;
    const dx = e.changedTouches[0].clientX - touch.current;
    touch.current = null;
    if (Math.abs(dx) < 60) return;
    const i = wk.indexOf(sel);
    const next = dx < 0 ? i - 1 : i + 1;
    if (next >= 0 && next < 7) { setSel(wk[next]); buzz(8); }
  };

  if (err) return <Failed text={err} onRetry={load} />;
  if (!data) return <Loading />;

  const all = data.assignments || [];
  const wkItems = all.filter((a) => wk.includes(a.due_date));
  const dayItems = all.filter((a) => a.due_date === sel);
  const doneCount = wkItems.filter((a) => a.done).length;
  const pct = wkItems.length ? Math.round((doneCount / wkItems.length) * 100) : 0;
  const late = all.filter((a) => a.due_date < T && !a.done);
  const board = data.board || [];

  const todayItems = all.filter((a) => a.due_date === T);
  const todayDone = todayItems.length > 0 && todayItems.every((a) => a.done);

  const streak = calcStreak(all);
  const best = bestStreak(all);

  return (
    <>
      <Hero
        eyebrow="مجموع ما أنجزته"
        value={Number(data.minutes) || 0}
        unit="دقيقة"
        value2={Number(data.pages) || 0}
        unit2="صفحة"
        pct={pct}
        pop={pop}
        ringKey={ringKey}
        streak={streak}
        foot={
          <>
            <b>{doneCount}</b> من {wkItems.length} مقرر هذا الأسبوع
            <span className="dot" />
            <b>{pct}%</b>
            {late.length > 0 && (
              <>
                <span className="dot" />
                <span className="late">{late.length} متأخر</span>
              </>
            )}
          </>
        }
      />

      {todayDone && tab === "now" && (
        <div className="cheer">
          <span className="big">{streak > 1 ? "🔥" : "✓"}</span>
          <div>
            <h4>
              {streak > 1 ? `${streak} أيام متتالية` : "أنهيت مقررات اليوم"}
            </h4>
            <p>
              خلّصت {todayItems.length} من {todayItems.length}.
              {streak > 1 ? " واصل بكرة عشان ما تنكسر السلسلة." : " تقدر تبدأ بمقررات بكرة لو حاب."}
            </p>
          </div>
        </div>
      )}

      <div className="tabs en" style={{ animationDelay: "340ms" }}>
        <button className={`tab ${tab === "now" ? "on" : ""}`} onClick={() => setTab("now")}>مقرراتي</button>
        <button className={`tab ${tab === "rec" ? "on" : ""}`} onClick={() => setTab("rec")}>سجلّي</button>
      </div>

      {tab === "rec" && (
        <Record
          assignments={all}
          minutes={Number(data.minutes) || 0}
          pages={Number(data.pages) || 0}
          streak={streak}
          best={best}
        />
      )}

      {tab === "now" && (
        <>
          <Rail items={wkItems} sel={sel} onSel={setSel} />
          <p className="swipehint">اسحب يمين أو يسار للتنقّل بين الأيام</p>

          <div className="two">
            <div onTouchStart={onTouchStart} onTouchEnd={onTouchEnd}>
              <div
                className="en"
                style={{ animationDelay: "400ms", display: "flex", alignItems: "baseline", gap: 10, margin: "20px 0 4px" }}
              >
                <h2 className="disp" style={{ fontSize: 17 }}>
                  {sel === T ? "مقررات اليوم" : `مقررات ${fmtDate(sel)}`}
                </h2>
                <small className="pill">
                  {dayItems.length ? `${dayItems.filter((a) => a.done).length}/${dayItems.length}` : ""}
                </small>
                {sel === T && dayItems.length > 0 && !todayDone && streak > 0 && (
                  <small style={{ fontSize: 12, color: "var(--book)" }}>
                    أكمل اليوم وتصير سلسلتك {streak + 1} 🔥
                  </small>
                )}
              </div>

              <div className="ledger">
                {dayItems.length === 0 ? (
                  <div className="empty en" style={{ animationDelay: "460ms" }}>
                    <b>ما فيه مقررات في هذا اليوم</b>
                    اختر يومًا من الشريط فوق.
                  </div>
                ) : (
                  dayItems.map((a, i) => (
                    <Row key={a.id} a={a} i={i} onDone={onDone} onUndo={onUndo} just={just} busy={busy} />
                  ))
                )}
              </div>
            </div>

            <aside className="en" style={{ animationDelay: "540ms" }}>
              {late.length > 0 && (
                <div className="warn">
                  <h4>{late.length} مقرر فات موعده</h4>
                  {late.slice(0, 3).map((a) => (
                    <p key={a.id}>{a.title}</p>
                  ))}
                </div>
              )}

              <div className="blk">
                <h4>متصدرو {me.grade}</h4>
                {board.map((s, i) => (
                  <div key={s.id} className={`lead ${s.id === me.id ? "me" : ""}`}>
                    <span className="rk">{i + 1}</span>
                    <span>{s.id === me.id ? "أنت" : s.name.split(" ")[0]}</span>
                    <span className="pt">{s.done}</span>
                  </div>
                ))}
              </div>
            </aside>
          </div>
        </>
      )}
    </>
  );
}

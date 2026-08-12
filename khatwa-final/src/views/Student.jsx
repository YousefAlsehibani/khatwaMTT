import React, { useState, useEffect, useMemo, useCallback } from "react";
import { studentBoard, markDone, unmarkDone, errorText } from "../lib/api";
import { Hero, Rail, Odometer, Loading, Failed, fmtDate } from "../components/UI";
import { todayIso, iso, weekDays } from "../lib/helpers";

function Row({ a, i, onDone, onUndo, just, busy }) {
  const [p, setP] = useState("");
  const T = todayIso();
  const late = a.due_date < T && !a.done;

  return (
    <div
      className={`row en ${a.done ? "done" : ""} ${just === a.id ? "just" : ""}`}
      style={{ animationDelay: `${400 + i * 70}ms` }}
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
      </div>

      <div className="ract">
        {a.url && !a.done && (
          <a className="lk" href={a.url} target="_blank" rel="noreferrer">
            افتح ↗
          </a>
        )}

        {a.done ? (
          <>
            <span className="stamp">
              ✓{" "}
              {a.kind === "audio"
                ? `${a.amount} دقيقة`
                : `${a.pages_read} من ${a.amount} صفحة`}
            </span>
            <button className="undo" onClick={() => onUndo(a)} disabled={busy}>
              تراجع
            </button>
          </>
        ) : a.kind === "audio" ? (
          <button className="btn audio" onClick={() => onDone(a, null)} disabled={busy}>
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
            <button
              className="btn book"
              disabled={!p || Number(p) < 1 || busy}
              onClick={() => {
                onDone(a, Math.min(Number(p), a.amount));
                setP("");
              }}
            >
              سجّل
            </button>
          </>
        )}
      </div>
    </div>
  );
}

export default function Student({ me, token, toast }) {
  const [data, setData] = useState(null);
  const [err, setErr] = useState("");
  const [sel, setSel] = useState(todayIso());
  const [pop, setPop] = useState(null);
  const [just, setJust] = useState(null);
  const [busy, setBusy] = useState(false);

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

  useEffect(() => {
    load();
  }, [load]);

  useEffect(() => {
    if (!pop) return;
    const t = setTimeout(() => setPop(null), 1600);
    return () => clearTimeout(t);
  }, [pop]);

  useEffect(() => {
    if (!just) return;
    const t = setTimeout(() => setJust(null), 900);
    return () => clearTimeout(t);
  }, [just]);

  const onDone = async (a, pages) => {
    setBusy(true);
    try {
      const r = await markDone(token, a.id, pages);
      if (!r.ok) return toast(errorText(r.error));
      setJust(a.id);
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

  if (err) return <Failed text={err} onRetry={load} />;
  if (!data) return <Loading />;

  const all = data.assignments || [];
  const wkItems = all.filter((a) => wk.includes(a.due_date));
  const dayItems = all.filter((a) => a.due_date === sel);
  const doneCount = wkItems.filter((a) => a.done).length;
  const pct = wkItems.length ? Math.round((doneCount / wkItems.length) * 100) : 0;
  const late = all.filter((a) => a.due_date < T && !a.done);
  const board = data.board || [];

  return (
    <>
      <Hero
        eyebrow="مجموع ما سمعته"
        value={Number(data.minutes) || 0}
        unit="دقيقة"
        pct={pct}
        pop={pop}
        foot={
          <>
            <b className="bk">
              <Odometer value={Number(data.pages) || 0} delay={620} />
            </b>{" "}
            صفحة مقروءة
            <span className="dot" />
            <b>{doneCount}</b> من {wkItems.length} مقرر هذا الأسبوع
            <span className="dot" />
            <b>{pct}%</b>
          </>
        }
      />

      <Rail items={wkItems} sel={sel} onSel={setSel} />

      <div className="two">
        <div>
          <div
            className="en"
            style={{
              animationDelay: "380ms",
              display: "flex",
              alignItems: "baseline",
              gap: 10,
              margin: "20px 0 4px",
            }}
          >
            <h2 className="disp" style={{ fontSize: 17 }}>
              {sel === T ? "مقررات اليوم" : `مقررات ${fmtDate(sel)}`}
            </h2>
            <small className="pill">
              {dayItems.length ? `${dayItems.filter((a) => a.done).length}/${dayItems.length}` : ""}
            </small>
          </div>

          <div className="ledger">
            {dayItems.length === 0 ? (
              <div className="empty en" style={{ animationDelay: "430ms" }}>
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

        <aside className="en" style={{ animationDelay: "520ms" }}>
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
  );
}

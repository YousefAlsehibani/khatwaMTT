import React, { useState, useEffect, useMemo, useCallback } from "react";
import {
  studentBoard, toggleClip, setPage, answerWeek, errorText,
} from "../lib/api";
import {
  Odometer, Ring, BookGauge, CheckMark, Modal, Seal, Loading, Failed, buzz, Btn, useReveal,
} from "../components/UI";
import {
  thisWeekStart, weekLabel, relWeek, iso, addDays, parse, todayIso,
  calcStreak, heatDays, fmtDate, DL, weekDaysOf,
} from "../lib/helpers";

/* ================= الكتاب ================= */
function BookCard({ book, planId, token, onSaved, toast }) {
  const [v, setV] = useState("");
  const [busy, setBusy] = useState(false);
  const [confirm, setConfirm] = useState(null);

  const submit = async (confirmBack = false) => {
    const page = Number(v);
    if (!page && page !== 0) return;
    setBusy(true);
    try {
      const r = await setPage(token, planId, page, confirmBack);
      if (!r.ok) {
        if (r.error === "needs_confirm") { setConfirm({ page, current: r.current }); return; }
        toast(errorText(r.error));
        return;
      }
      setV(""); setConfirm(null);
      buzz(14);
      onSaved(r.added);
    } catch (e) { toast(e.message); }
    finally { setBusy(false); }
  };

  const left = book.pages_left;

  return (
    <div className="unit book en" style={{ animationDelay: "440ms" }}>
      <div className="unithead">
        <span className="utag book">كتاب</span>
        <h3>{book.title}</h3>
      </div>

      <div className="bookbody">
        <div className="bookpos">
          <span className="bignumS book">
            <Odometer value={book.current_page} delay={520} />
          </span>
          <span className="posl">موضعك · المدى {book.page_from}–{book.page_to}</span>
        </div>

        <BookGauge from={book.page_from} to={book.page_to} current={book.current_page} />

        <div className="bookrow">
          <label className="inl">وصلت إلى صفحة</label>
          <input
            className="pin"
            value={v}
            inputMode="numeric"
            aria-label="رقم الصفحة"
            placeholder={String(book.current_page || book.page_from)}
            onChange={(e) => /^\d{0,4}$/.test(e.target.value) && setV(e.target.value)}
            onKeyDown={(e) => e.key === "Enter" && submit()}
          />
          <Btn className="book" disabled={!v || busy} onClick={() => submit()}>
            سجّل
          </Btn>
        </div>

        {left > 0 ? (
          <p className="hintline">
            باقي <b>{left}</b> صفحة
          </p>
        ) : (
          <p className="hintline ok">✓ أنهيت صفحات الأسبوع</p>
        )}
      </div>

      <Modal
        open={!!confirm}
        onClose={() => setConfirm(null)}
        title="ترجع للخلف؟"
      >
        <p style={{ fontSize: 14, lineHeight: 1.9, marginBottom: 18 }}>
          موضعك الحالي صفحة <b>{confirm?.current}</b>، وأنت تكتب <b>{confirm?.page}</b>.
          لو أكّدت، ينقص رصيدك بمقدار الفرق. أكّد فقط إن كنت تصحّح خطأ.
        </p>
        <div className="modalrow">
          <Btn className="ghostbtn" onClick={() => setConfirm(null)}>إلغاء</Btn>
          <Btn onClick={() => submit(true)} disabled={busy}>
            نعم، صحّح موضعي
          </Btn>
        </div>
      </Modal>
    </div>
  );
}

/* ================= المقاطع ================= */
function ClipsCard({ clips, token, onSaved, toast, delay }) {
  const [busy, setBusy] = useState(null);
  const done = clips.filter((c) => c.done).length;

  const flip = async (c) => {
    setBusy(c.id);
    try {
      const r = await toggleClip(token, c.id, !c.done);
      if (!r.ok) return toast(errorText(r.error));
      buzz(c.done ? 8 : 16);
      onSaved(c.done ? 0 : c.minutes);
    } catch (e) { toast(e.message); }
    finally { setBusy(null); }
  };

  return (
    <div className="unit en" style={{ animationDelay: `${delay}ms` }}>
      <div className="unithead">
        <span className="utag audio">مقاطع</span>
        <h3>{done} من {clips.length}</h3>
      </div>

      <div className="cliplist">
        {clips.map((c, i) => (
          <div key={c.id} className={`clip ${c.done ? "done" : ""}`}
               style={{ animationDelay: `${520 + i * 60}ms` }}>
            <button
              className="cbtn"
              onClick={() => flip(c)}
              disabled={busy === c.id}
              aria-label={c.done ? "إلغاء" : "سمعت"}
            >
              <CheckMark on={c.done} />
            </button>
            <div className="clipmid">
              <h4>{c.title}</h4>
              <span className="pill">{c.minutes} دقيقة</span>
            </div>
            {!c.done && (
              <a className="lk" href={c.url} target="_blank" rel="noreferrer">افتح ↗</a>
            )}
          </div>
        ))}
      </div>
    </div>
  );
}

/* ================= السجل ================= */
function Record({ daily, minutes, pages, streak, weeks }) {
  const [tip, setTip] = useState(null);
  const T = todayIso();
  const days = useMemo(() => heatDays(daily, 84), [daily]);
  const active = new Set((daily || []).filter((x) => Number(x.n) > 0).map((x) => x.d)).size;
  const doneWeeks = (weeks || []).filter((w) => w.summary?.complete).length;

  return (
    <>
      <div className="statgrid en" style={{ animationDelay: "380ms" }}>
        <div className="stat">
          <span className="sv audio"><Odometer value={minutes} delay={420} /></span>
          <span className="sl">دقيقة مسموعة</span>
        </div>
        <div className="stat">
          <span className="sv book"><Odometer value={pages} delay={500} /></span>
          <span className="sl">صفحة مقروءة</span>
        </div>
        <div className="stat">
          <span className="sv"><Odometer value={active} delay={580} /></span>
          <span className="sl">يوم نشِط</span>
        </div>
        <div className="stat">
          <span className="sv"><Odometer value={doneWeeks} delay={660} /></span>
          <span className="sl">أسبوع مكتمل</span>
        </div>
      </div>

      <div className="blk en" style={{ animationDelay: "460ms", marginTop: 30 }}>
        <div className="blkhead">
          <h4>آخر ١٢ أسبوعًا</h4>
          <small className="pill">
            {tip ? `${fmtDate(tip.k)} — ${tip.n}` : "مرّر على أي مربع"}
          </small>
        </div>
        <div className="heat big">
          {days.map((d, i) => (
            <div key={d.k}
              className={`hcell ${d.lvl ? "l" + d.lvl : ""} ${d.k === T ? "now" : ""}`}
              style={{ animationDelay: `${480 + i * 5}ms` }}
              onMouseEnter={() => setTip(d)} onTouchStart={() => setTip(d)}
              title={`${fmtDate(d.k)} — ${d.n}`} />
          ))}
        </div>
        <div className="heatkey">
          <span>أقل</span>
          <i style={{ background: "var(--hair)" }} />
          <i className="hcell l1" /><i className="hcell l2" /><i className="hcell l3" />
          <span>أكثر</span>
        </div>
      </div>

      <div className="blk en" style={{ animationDelay: "560ms" }}>
        <h4>أسابيعك</h4>
        {(weeks || []).length === 0 ? (
          <p className="muted" style={{ fontSize: 13 }}>ما فيه أسابيع بعد.</p>
        ) : (
          weeks.map((w, i) => (
            <div key={w.week_start} className="weekrow en"
                 style={{ animationDelay: `${600 + i * 45}ms` }}>
              <span className="wl">{weekLabel(w.week_start)}</span>
              {w.is_makeup && <span className="utag makeup">تعويض</span>}
              <div className="bar">
                <i className={w.summary?.complete ? "high" : (w.summary?.pct || 0) < 40 ? "low" : "mid"}
                   style={{ width: `${w.summary?.pct || 0}%` }} />
              </div>
              <span className="pill">{w.summary?.pct || 0}%</span>
            </div>
          ))
        )}
      </div>
    </>
  );
}

/* ================= الواجهة ================= */
export default function Student({ me, token, toast }) {
  const [data, setData] = useState(null);
  const [err, setErr] = useState("");
  const [tab, setTab] = useState("now");
  const [week, setWeek] = useState(null);
  const [pop, setPop] = useState(null);
  const [seal, setSeal] = useState(false);
  const [askOpen, setAskOpen] = useState(false);
  const [answer, setAnswer] = useState("");
  const [saving, setSaving] = useState(false);

  const load = useCallback(async (w = null) => {
    try {
      setErr("");
      const r = await studentBoard(token, w);
      if (!r.ok) return setErr(errorText(r.error));
      setData(r);
      return r;
    } catch (e) { setErr(e.message); }
  }, [token]);

  useEffect(() => { load(week); }, [load, week]);
  useEffect(() => { if (!pop) return; const t = setTimeout(() => setPop(null), 1500); return () => clearTimeout(t); }, [pop]);
  useEffect(() => { if (!seal) return; const t = setTimeout(() => setSeal(false), 1800); return () => clearTimeout(t); }, [seal]);

  /* بعد أي إنجاز: حدّث، وافتح السؤال إن اكتمل الأسبوع */
  const afterProgress = async (added) => {
    if (added) setPop({ k: Date.now(), n: added });
    const r = await load(week);
    const p = r?.plan;
    if (p?.needs_answer) { setSeal(true); setTimeout(() => setAskOpen(true), 900); }
    else if (p?.complete && p?.all_done) setSeal(true);
  };

  const sendAnswer = async () => {
    if (!answer.trim()) return;
    setSaving(true);
    try {
      const r = await answerWeek(token, data.plan.plan_id, answer.trim());
      if (!r.ok) return toast(errorText(r.error));
      setAskOpen(false); setAnswer(""); setSeal(true);
      toast("اكتمل أسبوعك 🎉");
      await load(week);
    } catch (e) { toast(e.message); }
    finally { setSaving(false); }
  };

  if (err) return <Failed text={err} onRetry={() => load(week)} />;
  if (!data) return <Loading />;

  const plan = data.plan;
  const clips = data.clips || [];
  const streak = calcStreak(data.daily);
  const cur = data.week_start;
  const isThis = cur === thisWeekStart();
  const q = plan?.question;

  return (
    <>
      {/* ===== الرأس ===== */}
      <div className="hero">
        {pop && <div className="pop" key={pop.k}>+{pop.n}</div>}
        <p className="eyebrow en" style={{ animationDelay: "40ms" }}>مجموع ما أنجزته</p>
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
        {streak > 1 && (
          <div className="en" style={{ animationDelay: "300ms", marginTop: 12 }}>
            <span className="streak">🔥 <b>{streak}</b> أيام متتالية</span>
          </div>
        )}
      </div>

      <div className="tabs en" style={{ animationDelay: "340ms" }}>
        <button className={`tab ${tab === "now" ? "on" : ""}`} onClick={() => setTab("now")}>أسبوعي</button>
        <button className={`tab ${tab === "rec" ? "on" : ""}`} onClick={() => setTab("rec")}>سجلّي</button>
      </div>

      {tab === "rec" && (
        <div className="swap"><Record daily={data.daily} minutes={Number(data.total_minutes) || 0}
          pages={Number(data.total_pages) || 0} streak={streak} weeks={data.weeks} /></div>
      )}

      {tab === "now" && (
        <div className="swap">
          {/* شريط التنقل بين الأسابيع */}
          <div className="weeknav en" style={{ animationDelay: "380ms" }}>
            <button className="navb" onClick={() => setWeek(iso(addDays(parse(cur), -7)))}
              aria-label="الأسبوع السابق">‹</button>
            <div className="weektitle">
              <b>{weekLabel(cur)}</b>
              <small>{relWeek(cur)}{plan?.is_makeup ? " · أسبوع تعويض" : ""}</small>
            </div>
            <button className="navb" disabled={isThis}
              onClick={() => setWeek(iso(addDays(parse(cur), 7)))}
              aria-label="الأسبوع التالي">›</button>
          </div>

          {!plan ? (
            <div className="empty en" style={{ animationDelay: "440ms" }}>
              <b>ما فيه خطة لهذا الأسبوع</b>
              مشرفك ما نزّل مقررات بعد.
            </div>
          ) : (
            <>
              {/* لوحة التقدّم */}
              <div className="progpanel en" style={{ animationDelay: "400ms" }}>
                <Ring pct={plan.pct} size={104}
                  color={plan.complete ? "var(--ok)" : "var(--audio)"}>
                  <b className="rv"><Odometer value={plan.pct} delay={420} /><i>%</i></b>
                </Ring>

                <div className="pacebox">
                  {plan.complete ? (
                    <>
                      <h4 className="ok">اكتمل أسبوعك</h4>
                      <p>أنجزت كل شيء وأجبت عن السؤال.</p>
                    </>
                  ) : plan.needs_answer ? (
                    <>
                      <h4 className="warnc">باقي السؤال</h4>
                      <p>أنهيت كل المقررات — أجب عن سؤال الأسبوع ليكتمل.</p>
                      <Btn style={{ marginTop: 10 }}
                        onClick={() => setAskOpen(true)}>أجب الآن</Btn>
                    </>
                  ) : plan.days_left > 0 ? (
                    <>
                      <h4>وتيرتك اليوم</h4>
                      <p className="pacetext">
                        {plan.book && plan.book.pages_left > 0 && (
                          <span><b>{plan.pace_pages}</b> صفحة</span>
                        )}
                        {plan.book && plan.book.pages_left > 0 && plan.clips_total - plan.clips_done > 0 && " · "}
                        {plan.clips_total - plan.clips_done > 0 && (
                          <span><b>{plan.pace_clips}</b> مقطع</span>
                        )}
                      </p>
                      <small>
                        باقي {plan.days_left} {plan.days_left === 1 ? "يوم" : "أيام"} في الأسبوع
                      </small>
                    </>
                  ) : (
                    <>
                      <h4 className="late">انتهى الأسبوع</h4>
                      <p>أُغلق ناقصًا. انتظر أسبوع تعويض من مشرفك.</p>
                    </>
                  )}
                </div>
              </div>

              {/* أيام الأسبوع */}
              <div className="rail en" style={{ animationDelay: "420ms" }}>
                {weekDaysOf(cur).map((d) => {
                  const k = iso(d);
                  const n = (data.daily || []).filter((x) => x.d === k)
                              .reduce((s, x) => s + Number(x.n), 0);
                  return (
                    <div key={k} className={`rday ${k === todayIso() ? "today" : ""} ${n > 0 ? "hit" : ""}`}>
                      <span className="dn">{DL[d.getDay()]}</span>
                      <span className="dd">{d.getDate()}</span>
                      <span className="rdot" />
                    </div>
                  );
                })}
              </div>

              {plan.book && (
                <BookCard book={plan.book} planId={plan.plan_id} token={token}
                  onSaved={afterProgress} toast={toast} />
              )}

              {clips.length > 0 && (
                <ClipsCard clips={clips} token={token} onSaved={afterProgress}
                  toast={toast} delay={plan.book ? 500 : 440} />
              )}

              {!plan.book && clips.length === 0 && (
                <div className="empty en" style={{ animationDelay: "460ms" }}>
                  <b>الخطة فاضية</b>
                  مشرفك أنشأ الأسبوع لكن ما أضاف كتابًا ولا مقاطع.
                </div>
              )}
            </>
          )}
        </div>
      )}

      {/* ===== سؤال خاتمة الأسبوع ===== */}
      <Modal open={askOpen} onClose={() => setAskOpen(false)} title="سؤال الأسبوع">
        <p className="qtext">{q?.text}</p>

        {q?.kind === "choice" ? (
          <div className="choices">
            {(q.options || []).map((o, i) => (
              <button key={i}
                className={`choice ${answer === o ? "on" : ""}`}
                onClick={() => { setAnswer(o); buzz(8); }}>
                {o}
              </button>
            ))}
          </div>
        ) : (
          <textarea className="ta" rows={5} value={answer}
            onChange={(e) => setAnswer(e.target.value)}
            placeholder="اكتب إجابتك هنا..." />
        )}

        <div className="modalrow">
          <Btn className="ghostbtn" onClick={() => setAskOpen(false)}>لاحقًا</Btn>
          <Btn disabled={!answer.trim() || saving} onClick={sendAnswer}>
            أرسل الإجابة
          </Btn>
        </div>
      </Modal>

      <Seal show={seal} label="اكتمل أسبوعك" />
    </>
  );
}

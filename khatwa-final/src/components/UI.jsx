import React, { useState, useEffect } from "react";
import { DN, DL, iso, todayIso, weekDays, fmtDate, pctClass } from "../lib/helpers";

/* اهتزاز خفيف على الجوال */
export const buzz = (ms = 12) => {
  try { navigator.vibrate?.(ms); } catch (e) { /* غير مدعوم */ }
};

/* عدّاد بكرات يلف */
export function Odometer({ value, delay = 0 }) {
  const [v, setV] = useState(0);
  useEffect(() => {
    const t = setTimeout(() => setV(value), delay);
    return () => clearTimeout(t);
  }, [value, delay]);

  const width = String(Math.max(value, 1)).length;
  const s = String(v).padStart(width, "0");

  return (
    <span className="odo" role="img" aria-label={String(value)}>
      {s.split("").map((c, i) => {
        const lead = Number(s.slice(0, i + 1)) === 0 && i < width - 1;
        return (
          <span key={i} className={`reel ${lead ? "pad" : ""}`} aria-hidden="true">
            <span
              className="col"
              style={{
                transform: `translateY(-${Number(c) * 10}%)`,
                transitionDelay: `${(width - i - 1) * 90}ms`,
              }}
            >
              {[0, 1, 2, 3, 4, 5, 6, 7, 8, 9].map((n) => (
                <span key={n}>{n}</span>
              ))}
            </span>
          </span>
        );
      })}
    </span>
  );
}

/* الرقم البطل — يقبل رقمًا واحدًا أو رقمين متساويين في الأهمية */
export function Hero({ eyebrow, value, unit, value2, unit2, pct, foot, pop, ringKey, streak }) {
  const dual = value2 !== undefined && value2 !== null;

  return (
    <div className="hero">
      {pop && (
        <div className="pop" key={pop.k} style={{ color: pop.color }}>
          +{pop.n}
        </div>
      )}
      {ringKey && <div className="ring" key={"r" + ringKey} />}

      <p className="eyebrow en" style={{ animationDelay: "40ms" }}>
        {eyebrow}
      </p>

      {dual ? (
        <div className="duo en" style={{ animationDelay: "90ms" }}>
          <div className="duonum audio">
            <Odometer value={value} delay={430} />
            <span className="unit">{unit}</span>
          </div>
          <span className="duosep" />
          <div className="duonum book">
            <Odometer value={value2} delay={560} />
            <span className="unit">{unit2}</span>
          </div>
        </div>
      ) : (
        <div className="bignum en" style={{ animationDelay: "90ms" }}>
          <Odometer value={value} delay={430} />
          <span className="unit">{unit}</span>
        </div>
      )}

      <div className={`gauge en ${pct >= 100 ? "full" : ""}`} style={{ animationDelay: "200ms" }}>
        <i style={{ width: `${pct}%` }} />
      </div>
      <div className="herofoot en" style={{ animationDelay: "260ms" }}>
        {foot}
      </div>
      {streak > 1 && (
        <div className="en" style={{ animationDelay: "320ms", marginTop: 10 }}>
          <span className="streak">🔥 <b>{streak}</b> أيام متتالية</span>
        </div>
      )}
    </div>
  );
}

/* شريط أيام الأسبوع */
export function Rail({ items, sel, onSel }) {
  const days = weekDays();
  const T = todayIso();
  return (
    <div className="rail en" style={{ animationDelay: "360ms" }}>
      {days.map((d) => {
        const k = iso(d);
        const dayItems = items.filter((a) => a.due_date === k);
        const off = d.getDay() === 5 || d.getDay() === 6;
        const allOk = dayItems.length > 0 && dayItems.every((a) => a.done);
        return (
          <button
            key={k}
            className={`rday ${sel === k ? "on" : ""} ${off ? "off" : ""} ${k === T ? "today" : ""} ${allOk ? "allok" : ""}`}
            onClick={() => { onSel(k); buzz(8); }}
            aria-label={`${DN[d.getDay()]} ${d.getDate()}`}
          >
            <span className="dn">{DL[d.getDay()]}</span>
            <span className="dd">{d.getDate()}</span>
            <span className="pips">
              {dayItems.slice(0, 4).map((a) => (
                <i key={a.id} className={`pip ${a.done ? a.kind : ""}`} />
              ))}
            </span>
          </button>
        );
      })}
    </div>
  );
}

export const Bar = ({ pct }) => (
  <div className="bar">
    <i className={pctClass(pct)} style={{ width: `${pct}%` }} />
  </div>
);

export const Loading = ({ text = "لحظة..." }) => (
  <div className="center">
    <div>
      <div className="spinner" />
      {text}
    </div>
  </div>
);

export const Failed = ({ text, onRetry }) => (
  <div className="center">
    <div className="fail">
      <b>ما قدرنا نجيب البيانات</b>
      <p style={{ marginBottom: 16 }}>{text}</p>
      {onRetry && (
        <button className="btn" onClick={onRetry}>
          حاول مرة ثانية
        </button>
      )}
    </div>
  </div>
);

export { fmtDate };

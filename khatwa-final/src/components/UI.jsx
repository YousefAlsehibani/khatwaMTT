import React, { useState, useEffect, useRef } from "react";

/* اهتزاز خفيف */
export const buzz = (ms = 12) => {
  try { navigator.vibrate?.(ms); } catch (e) { /* غير مدعوم */ }
};

const reduced = () =>
  typeof window !== "undefined" &&
  window.matchMedia?.("(prefers-reduced-motion: reduce)").matches;

/* ============ عدّاد بكرات ============ */
export function Odometer({ value, delay = 0 }) {
  const [v, setV] = useState(reduced() ? value : 0);
  useEffect(() => {
    if (reduced()) { setV(value); return; }
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
                transitionDelay: `${(width - i - 1) * 85}ms`,
              }}
            >
              {[0,1,2,3,4,5,6,7,8,9].map((n) => <span key={n}>{n}</span>)}
            </span>
          </span>
        );
      })}
    </span>
  );
}

/* ============ حلقة تقدّم ============ */
export function Ring({ pct, size = 92, stroke = 7, color = "var(--audio)", children }) {
  const r = (size - stroke) / 2;
  const c = 2 * Math.PI * r;
  const [p, setP] = useState(reduced() ? pct : 0);
  useEffect(() => {
    if (reduced()) { setP(pct); return; }
    const t = setTimeout(() => setP(pct), 260);
    return () => clearTimeout(t);
  }, [pct]);

  return (
    <div className="ringwrap" style={{ width: size, height: size }}>
      <svg width={size} height={size} className="ringsvg" aria-hidden="true">
        <circle cx={size/2} cy={size/2} r={r} fill="none"
          stroke="var(--hair)" strokeWidth={stroke} />
        <circle cx={size/2} cy={size/2} r={r} fill="none"
          stroke={color} strokeWidth={stroke} strokeLinecap="round"
          strokeDasharray={c}
          strokeDashoffset={c - (c * Math.min(p, 100)) / 100}
          className="ringbar" />
      </svg>
      <div className="ringmid">{children}</div>
    </div>
  );
}

/* ============ شريط صفحات الكتاب ============
   يُرسم كحافة كتاب: خطوط رفيعة تمتلئ بالتتابع */
export function BookGauge({ from, to, current }) {
  const total = Math.max(to - from + 1, 1);
  const done = Math.max(Math.min(current, to) - from + 1, 0);
  const n = Math.min(total, 44);
  const filled = Math.round((done / total) * n);

  return (
    <div className="bookgauge" role="img"
      aria-label={`${done} من ${total} صفحة`}>
      {Array.from({ length: n }, (_, i) => (
        <i key={i} className={i < filled ? "on" : ""}
           style={{ transitionDelay: `${i * 16}ms` }} />
      ))}
    </div>
  );
}

/* ============ علامة صح تُرسم ============ */
export function CheckMark({ on }) {
  return (
    <span className={`check ${on ? "on" : ""}`} aria-hidden="true">
      <svg viewBox="0 0 24 24">
        <circle cx="12" cy="12" r="10.5" className="cbg" />
        <path d="M7 12.4l3.4 3.3L17 8.9" className="cpath" />
      </svg>
    </span>
  );
}

/* ============ نافذة ============ */
export function Modal({ open, onClose, title, children, wide }) {
  const box = useRef(null);
  useEffect(() => {
    if (!open) return;
    const esc = (e) => e.key === "Escape" && onClose?.();
    document.addEventListener("keydown", esc);
    document.body.style.overflow = "hidden";
    return () => {
      document.removeEventListener("keydown", esc);
      document.body.style.overflow = "";
    };
  }, [open, onClose]);

  if (!open) return null;
  return (
    <div className="backdrop" onMouseDown={(e) => e.target === e.currentTarget && onClose?.()}>
      <div className={`modal ${wide ? "wide" : ""}`} ref={box} role="dialog" aria-modal="true">
        {title && <h3 className="modaltitle disp">{title}</h3>}
        {children}
      </div>
    </div>
  );
}

/* ============ احتفال بإنهاء الأسبوع ============ */
export function Seal({ show }) {
  if (!show) return null;
  return (
    <div className="seal" aria-hidden="true">
      <svg viewBox="0 0 120 120">
        <circle cx="60" cy="60" r="52" className="sealring" />
        <path d="M38 62l14 14 30-31" className="sealcheck" />
      </svg>
    </div>
  );
}

/* ============ عناصر بسيطة ============ */
export const Bar = ({ pct, tone }) => (
  <div className="bar">
    <i className={tone || ""} style={{ width: `${Math.min(pct, 100)}%` }} />
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
      {onRetry && <button className="btn" onClick={onRetry}>حاول مرة ثانية</button>}
    </div>
  </div>
);

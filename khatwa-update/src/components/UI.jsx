import React, { useState, useEffect, useRef, useCallback } from "react";

/* ============ أدوات ============ */
export const buzz = (ms = 12) => {
  try { navigator.vibrate?.(ms); } catch (e) { /* غير مدعوم */ }
};

export const reduced = () =>
  typeof window !== "undefined" &&
  window.matchMedia?.("(prefers-reduced-motion: reduce)").matches;

/* يظهر العنصر عند وصوله للشاشة */
export function useReveal() {
  const ref = useRef(null);
  const [seen, setSeen] = useState(false);
  useEffect(() => {
    if (reduced()) { setSeen(true); return; }
    const el = ref.current;
    if (!el) return;
    const io = new IntersectionObserver(
      ([e]) => e.isIntersecting && (setSeen(true), io.disconnect()),
      { threshold: 0.15 }
    );
    io.observe(el);
    return () => io.disconnect();
  }, []);
  return [ref, seen];
}

/* عدّاد يتحرك رقميًا مع تباطؤ طبيعي */
export function useCountUp(target, ms = 1100, delay = 0) {
  const [v, setV] = useState(0);
  useEffect(() => {
    if (reduced()) { setV(target); return; }
    let raf, start;
    const t = setTimeout(() => {
      const step = (now) => {
        if (!start) start = now;
        const p = Math.min((now - start) / ms, 1);
        const eased = 1 - Math.pow(1 - p, 3);
        setV(Math.round(target * eased));
        if (p < 1) raf = requestAnimationFrame(step);
      };
      raf = requestAnimationFrame(step);
    }, delay);
    return () => { clearTimeout(t); cancelAnimationFrame(raf); };
  }, [target, ms, delay]);
  return v;
}

/* ============ عدّاد البكرات ============ */
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
            <span className="col" style={{
              transform: `translateY(-${Number(c) * 10}%)`,
              transitionDelay: `${(width - i - 1) * 85}ms`,
            }}>
              {[0,1,2,3,4,5,6,7,8,9].map((n) => <span key={n}>{n}</span>)}
            </span>
          </span>
        );
      })}
    </span>
  );
}

/* ============ حلقة التقدّم ============ */
export function Ring({ pct, size = 92, stroke = 7, color = "var(--audio)", children }) {
  const r = (size - stroke) / 2;
  const c = 2 * Math.PI * r;
  const [p, setP] = useState(reduced() ? pct : 0);
  useEffect(() => {
    if (reduced()) { setP(pct); return; }
    const t = setTimeout(() => setP(pct), 240);
    return () => clearTimeout(t);
  }, [pct]);

  return (
    <div className="ringwrap" style={{ width: size, height: size }}>
      <svg width={size} height={size} className="ringsvg" aria-hidden="true">
        <circle cx={size/2} cy={size/2} r={r} fill="none" stroke="var(--hair)" strokeWidth={stroke} />
        <circle cx={size/2} cy={size/2} r={r} fill="none" stroke={color}
          strokeWidth={stroke} strokeLinecap="round" strokeDasharray={c}
          strokeDashoffset={c - (c * Math.min(p, 100)) / 100} className="ringbar" />
      </svg>
      <div className="ringmid">{children}</div>
    </div>
  );
}

/* ============ حافة الكتاب ============ */
export function BookGauge({ from, to, current }) {
  const total = Math.max(to - from + 1, 1);
  const done = Math.max(Math.min(current, to) - from + 1, 0);
  const n = Math.min(total, 46);
  const filled = Math.round((done / total) * n);
  const [ref, seen] = useReveal();

  return (
    <div className="bookgauge" ref={ref} role="img" aria-label={`${done} من ${total} صفحة`}>
      {Array.from({ length: n }, (_, i) => (
        <i key={i} className={seen && i < filled ? "on" : ""}
           style={{ transitionDelay: `${i * 18}ms` }} />
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

/* ============ زر بموجة لمس ============ */
export function Btn({ children, className = "", onClick, ...rest }) {
  const [waves, setWaves] = useState([]);
  const go = (e) => {
    if (!reduced()) {
      const r = e.currentTarget.getBoundingClientRect();
      const k = Date.now();
      setWaves((w) => [...w, { k, x: e.clientX - r.left, y: e.clientY - r.top }]);
      setTimeout(() => setWaves((w) => w.filter((v) => v.k !== k)), 620);
    }
    onClick?.(e);
  };
  return (
    <button className={`btn ${className}`} onClick={go} {...rest}>
      <span className="btnlabel">{children}</span>
      {waves.map((w) => (
        <span key={w.k} className="wave" style={{ left: w.x, top: w.y }} />
      ))}
    </button>
  );
}

/* ============ نافذة ============ */
export function Modal({ open, onClose, title, children, wide }) {
  const [closing, setClosing] = useState(false);

  const shut = useCallback(() => {
    if (reduced()) return onClose?.();
    setClosing(true);
    setTimeout(() => { setClosing(false); onClose?.(); }, 200);
  }, [onClose]);

  useEffect(() => {
    if (!open) return;
    const esc = (e) => e.key === "Escape" && shut();
    document.addEventListener("keydown", esc);
    document.body.style.overflow = "hidden";
    return () => {
      document.removeEventListener("keydown", esc);
      document.body.style.overflow = "";
    };
  }, [open, shut]);

  if (!open) return null;
  return (
    <div className={`backdrop ${closing ? "out" : ""}`}
      onMouseDown={(e) => e.target === e.currentTarget && shut()}>
      <div className={`modal ${wide ? "wide" : ""} ${closing ? "out" : ""}`}
        role="dialog" aria-modal="true">
        {title && <h3 className="modaltitle disp">{title}</h3>}
        {children}
      </div>
    </div>
  );
}

/* ============ ختم الإنجاز ============ */
export function Seal({ show, label }) {
  if (!show) return null;
  return (
    <div className="seal" aria-hidden="true">
      <div className="sealbox">
        <svg viewBox="0 0 120 120">
          <circle cx="60" cy="60" r="52" className="sealring" />
          <path d="M38 62l14 14 30-31" className="sealcheck" />
        </svg>
        {label && <span className="seallabel">{label}</span>}
      </div>
      <div className="sparks">
        {Array.from({ length: 10 }, (_, i) => (
          <i key={i} style={{ "--a": `${i * 36}deg`, animationDelay: `${480 + i * 22}ms` }} />
        ))}
      </div>
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
      <div className="loader"><i /><i /><i /></div>
      <p style={{ marginTop: 16 }}>{text}</p>
    </div>
  </div>
);

export const Failed = ({ text, onRetry }) => (
  <div className="center">
    <div className="fail">
      <b>ما قدرنا نجيب البيانات</b>
      <p style={{ marginBottom: 16 }}>{text}</p>
      {onRetry && <Btn onClick={onRetry}>حاول مرة ثانية</Btn>}
    </div>
  </div>
);

/* هيكل عظمي أثناء التحميل */
export const Skeleton = ({ h = 20, w = "100%", r = 8, style }) => (
  <div className="skel" style={{ height: h, width: w, borderRadius: r, ...style }} />
);

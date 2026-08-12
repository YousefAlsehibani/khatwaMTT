import React, { useState, useRef, useEffect } from "react";
import { login, setToken, errorText } from "../lib/api";

export default function Login({ onIn, theme, toggle }) {
  const [d, setD] = useState(["", "", "", ""]);
  const [err, setErr] = useState("");
  const [busy, setBusy] = useState(false);
  const refs = useRef([]);

  useEffect(() => {
    refs.current[0]?.focus();
  }, []);

  const go = async (code) => {
    setBusy(true);
    try {
      const r = await login(code);
      if (!r.ok) {
        setErr(errorText(r.error));
        setD(["", "", "", ""]);
        refs.current[0]?.focus();
        return;
      }
      setToken(r.token);
      onIn(r.token, r.me);
    } catch (e) {
      setErr("ما قدرنا نتصل بالخادم. تأكد من الإنترنت.");
      setD(["", "", "", ""]);
      refs.current[0]?.focus();
    } finally {
      setBusy(false);
    }
  };

  const set = (i, v) => {
    if (!/^\d?$/.test(v)) return;
    const n = [...d];
    n[i] = v;
    setD(n);
    setErr("");
    if (v && i < 3) refs.current[i + 1]?.focus();
    if (n.every(Boolean)) setTimeout(() => go(n.join("")), 160);
  };

  const paste = (e) => {
    const t = (e.clipboardData.getData("text") || "").replace(/\D/g, "").slice(0, 4);
    if (t.length === 4) {
      e.preventDefault();
      setD(t.split(""));
      setErr("");
      setTimeout(() => go(t), 200);
    }
  };

  return (
    <div className="login">
      <div className="lbox">
        <div style={{ display: "flex", alignItems: "flex-start" }}>
          <div className="en">
            <div className="lmark">خطوة</div>
            <p className="ltag">كل خطوة تُحسب — سماعًا وقراءة.</p>
          </div>
          <div className="sp" />
          <button className="ib" onClick={toggle} aria-label="تبديل المظهر">
            {theme === "dark" ? "☀" : "☾"}
          </button>
        </div>

        <div className="digits en" style={{ animationDelay: "110ms" }}>
          {d.map((v, i) => (
            <input
              key={i}
              ref={(el) => (refs.current[i] = el)}
              className={`dg ${err ? "err" : ""}`}
              value={v}
              disabled={busy}
              onChange={(e) => set(i, e.target.value)}
              onPaste={paste}
              inputMode="numeric"
              maxLength={1}
              aria-label={`الرقم ${i + 1}`}
              onKeyDown={(e) => {
                if (e.key === "Backspace" && !d[i] && i > 0) refs.current[i - 1]?.focus();
              }}
            />
          ))}
        </div>

        {err ? (
          <p className="lerr">{err}</p>
        ) : (
          <p className="lhint en" style={{ animationDelay: "180ms" }}>
            {busy ? "لحظة..." : "اكتب رمزك المكوّن من ٤ أرقام"}
          </p>
        )}
      </div>
    </div>
  );
}

import React, { useState, useEffect } from "react";
import { getToken, clearToken, whoami, logout } from "./lib/api";
import { Loading } from "./components/UI";
import Login from "./views/Login";
import Student from "./views/Student";
import Supervisor from "./views/Supervisor";
import Exec from "./views/Exec";

const ROLE_LABEL = {
  student: (me) => me.grade,
  supervisor: (me) => `مشرف ${me.grade}`,
  exec: () => "المشرف التنفيذي",
};

export default function App() {
  const [theme, setTheme] = useState(() => localStorage.getItem("khatwa.theme") || "light");
  const [token, setTok] = useState(null);
  const [me, setMe] = useState(null);
  const [checking, setChecking] = useState(true);
  const [msg, setMsg] = useState("");

  /* المظهر */
  useEffect(() => {
    document.documentElement.classList.toggle("dark", theme === "dark");
    localStorage.setItem("khatwa.theme", theme);
    document
      .querySelector('meta[name="theme-color"]')
      ?.setAttribute("content", theme === "dark" ? "#0B1F1D" : "#FBF3E3");
  }, [theme]);

  /* استعادة الجلسة */
  useEffect(() => {
    const t = getToken();
    if (!t) return setChecking(false);
    whoami(t)
      .then((r) => {
        if (r.ok) {
          setTok(t);
          setMe(r.me);
        } else {
          clearToken();
        }
      })
      .catch(() => clearToken())
      .finally(() => setChecking(false));
  }, []);

  /* التنبيهات */
  useEffect(() => {
    if (!msg) return;
    const t = setTimeout(() => setMsg(""), 2600);
    return () => clearTimeout(t);
  }, [msg]);

  const out = async () => {
    await logout(token);
    setTok(null);
    setMe(null);
  };

  const flip = () => setTheme(theme === "dark" ? "light" : "dark");

  if (checking) return <Loading text="نتحقق من جلستك..." />;

  if (!token || !me)
    return (
      <Login
        theme={theme}
        toggle={flip}
        onIn={(t, m) => {
          setTok(t);
          setMe(m);
        }}
      />
    );

  return (
    <div className="wrap">
      <header className="topbar en">
        <div className="logo">
          خطوة<em>متابعة المقررات</em>
        </div>
        <div className="sp" />
        <div className="who">
          <b>{me.name}</b>
          <small>{ROLE_LABEL[me.role]?.(me)}</small>
        </div>
        <button className="ib" onClick={flip} aria-label="تبديل المظهر">
          {theme === "dark" ? "☀" : "☾"}
        </button>
        <button className="gh" onClick={out}>
          خروج
        </button>
      </header>

      {me.role === "student" && <Student me={me} token={token} toast={setMsg} />}
      {me.role === "supervisor" && <Supervisor me={me} token={token} toast={setMsg} />}
      {me.role === "exec" && <Exec token={token} toast={setMsg} />}

      {msg && <div className="toast">{msg}</div>}
    </div>
  );
}

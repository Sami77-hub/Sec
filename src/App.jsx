import { useState, useEffect, useRef } from "react";
import { io } from "socket.io-client";

const AVATARS = ["🧳","🌍","🏄","🗺️","✈️","🏔️","🌺","🎒"];
const LIMIT   = 2;
let   socket;

function isGmail(e) {
  return /^[^\s@]+@gmail\.com$/.test(e.trim());
}

export default function App() {
  const [screen,   setScreen]   = useState("login");
  const [avatar,   setAvatar]   = useState("🧳");
  const [nameVal,  setNameVal]  = useState("");
  const [gmailVal, setGmailVal] = useState("");
  const [loading,  setLoading]  = useState(false);
  const [loginErr, setLoginErr] = useState("");

  const [me,       setMe]       = useState({ name:"", gmail:"", avatar:"", isOwner:false });
  const [msgs,     setMsgs]     = useState([]);
  const [text,     setText]     = useState("");
  const [count,    setCount]    = useState(0);
  const [online,   setOnline]   = useState([]);
  const [conn,     setConn]     = useState(false);
  const [topErr,   setTopErr]   = useState("");
  const [denied,   setDenied]   = useState("");

  const bottom  = useRef(null);
  const textRef = useRef(null);

  useEffect(() => {
    socket = io("http://localhost:4000");

    socket.on("connect",      () => setConn(true));
    socket.on("disconnect",   () => setConn(false));

    socket.on("denied", (m) => {
      setDenied(m);
      setLoading(false);
      setScreen("denied");
    });

    // ✅ isOwner state save hota hai
    socket.on("ok", ({ isOwner }) => {
      setMe(p => ({ ...p, isOwner }));
      setLoading(false);
      setScreen("chat");
      setTimeout(() => textRef.current?.focus(), 150);
    });

    socket.on("history",      (h) => setMsgs(h));
    socket.on("msg",          (m) => setMsgs(p => [...p, m]));
    socket.on("count_update", (c) => setCount(c));

    // ✅ Samia ka naam online list mein filter
    socket.on("online", (u) => setOnline(u.filter(name => name !== "Samia")));

    socket.on("limit", () => showErr("Aapki " + LIMIT + " messages ki limit khatam ho gayi 🚫"));

    return () => socket.disconnect();
  }, []);

  useEffect(() => {
    bottom.current?.scrollIntoView({ behavior: "smooth" });
  }, [msgs]);

  function showErr(msg) {
    setTopErr(msg);
    setTimeout(() => setTopErr(""), 4000);
  }

  function login() {
    setLoginErr("");
    if (!nameVal.trim())    return setLoginErr("Naam zaroor likhein.");
    if (!isGmail(gmailVal)) return setLoginErr("Sirf @gmail.com address likha ja sakta hai.");
    setLoading(true);
    const g = gmailVal.trim().toLowerCase();
    setMe({ name: nameVal.trim(), gmail: g, avatar, isOwner: false });
    socket.emit("join", { gmail: g, username: nameVal.trim(), avatar });
  }

  function send() {
    if (!text.trim() || !conn) return;
    // ✅ Owner ke liye limit check nahi
    if (!me.isOwner && count >= LIMIT) return;
    socket.emit("msg", {
      gmail:    me.gmail,
      username: me.name,
      text:     text.trim(),
      avatar:   me.avatar,
    });
    setText("");
  }

  function onKey(e) {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      send();
    }
  }

  // ✅ Owner ke liye hamesha false
  const exhausted = me.isOwner ? false : count >= LIMIT;
  const remaining = me.isOwner ? "∞" : LIMIT - count;

  /* ─── DENIED ─── */
  if (screen === "denied") return (
    <div className="screen fade-up">
      <div className="card" style={{ textAlign:"center" }}>
        <div style={{ fontSize:"4rem", marginBottom:"1rem" }}>🔒</div>
        <div className="logo">Access <span>Denied</span></div>
        <div className="sub" style={{ marginBottom:"1rem" }}>Private Chat</div>
        <p style={{ color:"rgba(245,241,235,0.5)", fontSize:"0.85rem", lineHeight:1.75 }}>
          {denied}
        </p>
        <button className="btn" onClick={() => {
          setScreen("login"); setDenied(""); setGmailVal(""); setNameVal("");
        }}>
          ← Wapas Jao
        </button>
      </div>
    </div>
  );

  /* ─── LOGIN ─── */
  if (screen === "login") return (
    <div className="screen fade-up">
      <div className="card">
        <div style={{ textAlign:"center", fontSize:"2.2rem", marginBottom:"0.4rem" }}>🔐</div>
        <div className="logo">Wander<span>.</span></div>
        <div className="sub">Private Chat Board</div>

        <label>Avatar Chunein</label>
        <div className="avatars">
          {AVATARS.map(a => (
            <button key={a} className={`av ${avatar === a ? "on" : ""}`} onClick={() => setAvatar(a)}>
              {a}
            </button>
          ))}
        </div>

        <label>Aapka Naam</label>
        <input
          placeholder="Jaise: Rania Khan"
          value={nameVal}
          onChange={e => setNameVal(e.target.value)}
          onKeyDown={e => e.key === "Enter" && login()}
        />

        <label>Gmail Address</label>
        <input
          type="email"
          placeholder="example@gmail.com"
          value={gmailVal}
          onChange={e => setGmailVal(e.target.value)}
          onKeyDown={e => e.key === "Enter" && login()}
        />
        <p className="note">🔒 Yeh private 2-person chat hai — baaki sab ko access nahi</p>

        {loginErr && <div className="err">⚠️ {loginErr}</div>}

        <button className="btn" onClick={login} disabled={loading}>
          {loading ? "Verify ho raha hai..." : `${avatar} Enter Karen →`}
        </button>
      </div>
    </div>
  );

  /* ─── CHAT ─── */
  return (
    <div className="screen">
      <div className="card wide fade-up">

        {/* Header */}
        <div className="chat-head">
          <div style={{ display:"flex", alignItems:"center", gap:"0.4rem" }}>
            <span className={`dot blink ${conn ? "g" : "r"}`} />
            <span style={{ fontSize:"0.72rem", color:"rgba(245,241,235,0.45)" }}>
              {conn ? "Live" : "Connecting..."}
            </span>
            {me.isOwner && <span className="badge b-owner">👑 Owner</span>}
            {/* ✅ Samia ka naam online pills mein nahi aayega */}
            {online.map(u => <span key={u} className="pill">{u}</span>)}
          </div>

          <div style={{ display:"flex", alignItems:"center", gap:"0.4rem" }}>
            <span style={{ fontSize:"1.15rem" }}>{me.avatar}</span>
            <span style={{ fontSize:"0.72rem", color:"rgba(245,241,235,0.55)" }}>{me.name}</span>
            {/* ✅ Owner ke liye unlimited badge */}
            <span className={`badge ${me.isOwner ? "b-owner" : exhausted ? "b-danger" : remaining === 1 ? "b-warn" : "b-ok"}`}>
              {me.isOwner ? "∞ Unlimited" : exhausted ? "❌ 0 left" : `${remaining} left`}
            </span>
          </div>
        </div>

        {/* Messages */}
        <div className="msgs">
          {msgs.length === 0
            ? (
              <div className="empty">
                <span style={{ fontSize:"2.5rem" }}>💬</span>
                Pehla message bhejein!
              </div>
            )
            : msgs.map(m => {
                const mine = m.gmail === me.gmail;
                return (
                  <div key={m.id} className={`row ${mine ? "mine" : ""}`}>
                    <span style={{ fontSize:"1.4rem", flexShrink:0 }}>{m.avatar}</span>
                    <div style={{ maxWidth:"74%" }}>
                      {/* ✅ Samia ka naam messages mein nahi dikhega */}
                      <div className={`meta ${mine ? "r" : ""}`}>
                        {mine ? "Aap" : m.username === "Samia" ? "🔒 Anonymous" : m.username} · {m.time}
                      </div>
                      <div className={`bubble ${mine ? "b-mine" : "b-them"}`}>
                        {m.text}
                      </div>
                    </div>
                  </div>
                );
              })
          }
          <div ref={bottom} />
        </div>

        {/* Footer */}
        <div className="chat-foot">
          {topErr && <div className="err" style={{ marginBottom:"0.6rem" }}>🚫 {topErr}</div>}

          {!me.isOwner && !exhausted && remaining === 1 && !topErr && (
            <div className="warn-bar">⚠️ Sirf <strong>1 message</strong> bacha hai!</div>
          )}
          {!me.isOwner && exhausted && !topErr && (
            <div className="err" style={{ marginBottom:"0.6rem" }}>
              🚫 Aapki {LIMIT} messages ki limit complete ho gayi.
            </div>
          )}

          <div className="send-row">
            <span style={{ fontSize:"1.5rem", marginBottom:"2px", flexShrink:0 }}>{me.avatar}</span>
            <textarea
              ref={textRef}
              rows={2}
              placeholder={exhausted ? "Limit khatam..." : "Kuch bhi likhein, jitna bhi lamba... (Enter = send)"}
              value={text}
              onChange={e => setText(e.target.value)}
              onKeyDown={onKey}
              disabled={exhausted}
            />
            <button
              className="send-btn"
              onClick={send}
              disabled={!text.trim() || !conn || exhausted}
            >
              ➤
            </button>
          </div>
          <div className="hint">Shift+Enter = new line &nbsp;|&nbsp; {me.isOwner ? "∞" : count}/{me.isOwner ? "∞" : LIMIT} messages sent</div>
        </div>

      </div>
    </div>
  );
}
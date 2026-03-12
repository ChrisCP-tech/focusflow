// src/components/MorePages.jsx
import { useState, useRef } from "react";
import { Card, Btn, Input, Tag } from "./UI";
import { TYPE_ICONS, TYPE_COLORS, getLevel, xpProgress, LEVEL_NAMES, MOODS } from "../utils";

/* ═══════════════════════════════ FOCUS PAGE ═══════════════════════════════ */
export function FocusPage({ onComplete }) {
  const PRESETS = [5, 10, 15, 25, 50];
  const [mins,    setMins]    = useState(25);
  const [sec,     setSec]     = useState(0);
  const [running, setRunning] = useState(false);
  const [done,    setDone]    = useState(false);
  const [sessions, setSessions] = useState([]);
  const totalRef = useRef(25 * 60);
  const leftRef  = useRef(25 * 60);
  const ivRef    = useRef(null);

  function start(m) {
    const s = (m || mins) * 60;
    totalRef.current = s; leftRef.current = s;
    setMins(Math.floor(s / 60)); setSec(s % 60);
    setRunning(true); setDone(false);
    clearInterval(ivRef.current);
    ivRef.current = setInterval(() => {
      leftRef.current--;
      setMins(Math.floor(leftRef.current / 60));
      setSec(leftRef.current % 60);
      if (leftRef.current <= 0) {
        clearInterval(ivRef.current);
        setRunning(false); setDone(true);
        setSessions(s => [{ id: Date.now(), ts: Date.now() }, ...s]);
        onComplete && onComplete();
      }
    }, 1000);
  }
  function pause()  { clearInterval(ivRef.current); setRunning(false); }
  function reset()  { clearInterval(ivRef.current); setRunning(false); setDone(false); leftRef.current = totalRef.current; setMins(Math.floor(totalRef.current / 60)); setSec(totalRef.current % 60); }

  const pct  = totalRef.current ? ((totalRef.current - leftRef.current) / totalRef.current) * 100 : 0;
  const R    = 52;
  const circ = 2 * Math.PI * R;

  return (
    <div className="fadeUp">
      <h2 style={{ fontFamily: "'Syne',sans-serif", fontWeight: 800, fontSize: 22, marginBottom: 4 }}>Focus Timer ⏱</h2>
      <p style={{ fontSize: 13, color: "rgba(255,255,255,0.4)", marginBottom: 20 }}>Complete a session to earn 40 XP 🧠</p>

      <Card style={{ marginBottom: 16, textAlign: "center" }}>
        {/* Presets */}
        <div style={{ display: "flex", gap: 8, justifyContent: "center", marginBottom: 24, flexWrap: "wrap" }}>
          {PRESETS.map(p => (
            <Btn key={p} small ghost={!(totalRef.current === p * 60)} color="#6C63FF" onClick={() => start(p)}>{p}m</Btn>
          ))}
        </div>

        {/* Ring */}
        <div style={{ position: "relative", width: 132, height: 132, margin: "0 auto 24px" }}>
          <svg width={132} height={132} style={{ transform: "rotate(-90deg)" }}>
            <circle cx={66} cy={66} r={R} fill="none" stroke="rgba(255,255,255,0.06)" strokeWidth={9} />
            <circle cx={66} cy={66} r={R} fill="none"
              stroke={done ? "#55EFC4" : running ? "#6C63FF" : "rgba(255,255,255,0.18)"} strokeWidth={9}
              strokeDasharray={circ} strokeDashoffset={circ * (1 - pct / 100)}
              strokeLinecap="round" style={{ transition: "stroke-dashoffset 1s linear" }} />
          </svg>
          <div style={{ position: "absolute", top: "50%", left: "50%", transform: "translate(-50%,-50%)", textAlign: "center" }}>
            <div style={{ fontFamily: "'Syne',sans-serif", fontWeight: 800, fontSize: 26, color: "#E8E9F3" }}>
              {String(mins).padStart(2, "0")}:{String(sec).padStart(2, "0")}
            </div>
            {done && <div style={{ fontSize: 11, color: "#55EFC4", fontWeight: 700 }}>Done! 🎉</div>}
          </div>
        </div>

        <div style={{ display: "flex", gap: 8, justifyContent: "center" }}>
          {!running && !done && <Btn color="#6C63FF" onClick={() => start()}>▶ Start</Btn>}
          {running && <Btn ghost color="#6C63FF" onClick={pause}>⏸ Pause</Btn>}
          <Btn ghost color="rgba(255,255,255,0.2)" style={{ color: "rgba(255,255,255,0.5)" }} onClick={reset}>↺ Reset</Btn>
        </div>
      </Card>

      {done && (
        <Card style={{ background: "linear-gradient(135deg,rgba(85,239,196,0.12),transparent)", border: "1px solid rgba(85,239,196,0.25)", textAlign: "center", marginBottom: 16 }}>
          <div style={{ fontSize: 32, marginBottom: 6 }}>🎉</div>
          <div style={{ fontFamily: "'Syne',sans-serif", fontWeight: 800, fontSize: 18, color: "#55EFC4" }}>Session Complete!</div>
          <div style={{ fontSize: 13, color: "rgba(255,255,255,0.5)", marginTop: 4 }}>+40 XP earned — great work!</div>
        </Card>
      )}

      <Card>
        <div style={{ fontSize: 11, color: "rgba(255,255,255,0.35)", fontWeight: 700, marginBottom: 10, letterSpacing: "0.08em" }}>SESSION HISTORY</div>
        {sessions.length === 0
          ? <div style={{ fontSize: 13, color: "rgba(255,255,255,0.2)", textAlign: "center", padding: "16px 0" }}>No sessions yet — start your first!</div>
          : sessions.slice(0, 8).map((s, i) => (
            <div key={s.id} style={{ display: "flex", justifyContent: "space-between", padding: "8px 0", borderBottom: "1px solid rgba(255,255,255,0.05)" }}>
              <div style={{ fontSize: 13, color: "rgba(255,255,255,0.55)" }}>Session {sessions.length - i}</div>
              <div style={{ display: "flex", gap: 8, alignItems: "center" }}>
                <Tag label="+40 XP" color="#FDCB6E" />
                <span style={{ fontSize: 11, color: "rgba(255,255,255,0.25)" }}>{new Date(s.ts).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}</span>
              </div>
            </div>
          ))
        }
      </Card>
    </div>
  );
}

/* ═══════════════════════════════ SOCIAL PAGE ══════════════════════════════ */
export function SocialPage({ feed, members, profile, roomId, onPost, onLike }) {
  const [text, setText] = useState("");
  const shareUrl = `${window.location.origin}${window.location.pathname}?room=${roomId}`;

  function post() {
    if (!text.trim()) return;
    onPost(text.trim(), "message");
    setText("");
  }

  return (
    <div className="fadeUp">
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 16 }}>
        <div>
          <h2 style={{ fontFamily: "'Syne',sans-serif", fontWeight: 800, fontSize: 22 }}>Squad 👥</h2>
          <div style={{ fontSize: 12, color: "rgba(255,255,255,0.4)" }}>{members.length} member{members.length !== 1 ? "s" : ""}</div>
        </div>
      </div>

      {/* Invite */}
      <Card style={{ marginBottom: 16, background: "linear-gradient(135deg,rgba(108,99,255,0.12),rgba(162,155,254,0.05))" }}>
        <div style={{ fontSize: 13, fontWeight: 600, marginBottom: 4 }}>🔗 Invite your friends</div>
        <div style={{ fontSize: 11, color: "rgba(255,255,255,0.4)", marginBottom: 10 }}>Anyone with this link joins your squad — works on any device</div>
        <div style={{
          background: "rgba(0,0,0,0.3)", border: "1px solid rgba(255,255,255,0.08)",
          borderRadius: 8, padding: "8px 10px", fontSize: 11, color: "#A29BFE",
          wordBreak: "break-all", marginBottom: 10
        }}>{shareUrl}</div>
        <Btn small color="#6C63FF" onClick={() => { navigator.clipboard?.writeText(shareUrl).then(() => alert("Link copied! 🎉")).catch(() => alert(shareUrl)); }}>
          Copy Link 📋
        </Btn>
      </Card>

      {/* Leaderboard */}
      {members.length > 0 && (
        <Card style={{ marginBottom: 16 }}>
          <div style={{ fontSize: 11, color: "rgba(255,255,255,0.35)", fontWeight: 700, marginBottom: 12, letterSpacing: "0.08em" }}>LEADERBOARD 🏆</div>
          {[...members].sort((a, b) => (b.xp || 0) - (a.xp || 0)).map((m, i) => (
            <div key={m.uid || m.id} style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 10 }}>
              <div style={{ width: 20, fontSize: 14, textAlign: "center" }}>
                {i === 0 ? "🥇" : i === 1 ? "🥈" : i === 2 ? "🥉" : <span style={{ fontSize: 11, color: "rgba(255,255,255,0.3)" }}>{i + 1}</span>}
              </div>
              <div style={{
                width: 34, height: 34, borderRadius: "50%", flexShrink: 0,
                background: "linear-gradient(135deg,#6C63FF,#A29BFE)",
                display: "flex", alignItems: "center", justifyContent: "center", fontSize: 19,
                border: `2px solid ${m.uid === profile?.uid ? "#FDCB6E" : "rgba(255,255,255,0.08)"}`
              }}>{m.avatar}</div>
              <div style={{ flex: 1 }}>
                <div style={{ fontSize: 13, fontWeight: m.uid === profile?.uid ? 700 : 500 }}>
                  {m.name}{m.uid === profile?.uid ? " (you)" : ""}
                </div>
                <div style={{ fontSize: 11, color: "rgba(255,255,255,0.35)" }}>🔥 {m.streak || 0} streak</div>
              </div>
              <div style={{ fontFamily: "'Syne',sans-serif", fontWeight: 800, fontSize: 15, color: "#FDCB6E" }}>{m.xp || 0}</div>
            </div>
          ))}
        </Card>
      )}

      {/* Post box */}
      <Card style={{ marginBottom: 16 }}>
        <div style={{ display: "flex", gap: 8 }}>
          <Input value={text} onChange={setText} placeholder="Share a win, thought, or cheer… 🎉" style={{ flex: 1 }} />
          <Btn color="#6C63FF" onClick={post}>Post</Btn>
        </div>
      </Card>

      {/* Feed */}
      {feed.length === 0 && (
        <div style={{ textAlign: "center", padding: "36px 0", color: "rgba(255,255,255,0.2)" }}>
          <div style={{ fontSize: 36, marginBottom: 8 }}>🌱</div>
          <div style={{ fontSize: 14 }}>No activity yet — be the first to share!</div>
        </div>
      )}

      {feed.map(p => (
        <div key={p.id} style={{
          display: "flex", gap: 10, padding: "12px 14px",
          background: "rgba(255,255,255,0.03)", border: "1px solid rgba(255,255,255,0.06)",
          borderRadius: 12, marginBottom: 8
        }}>
          <div style={{
            width: 36, height: 36, borderRadius: "50%", flexShrink: 0,
            background: "linear-gradient(135deg,#6C63FF,#A29BFE)",
            display: "flex", alignItems: "center", justifyContent: "center", fontSize: 20
          }}>{p.userAvatar || "🌀"}</div>
          <div style={{ flex: 1 }}>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: 3 }}>
              <span style={{ fontWeight: 600, fontSize: 13 }}>{p.userName}</span>
              <span style={{ fontSize: 10, color: "rgba(255,255,255,0.2)" }}>
                {p.ts?.toDate ? p.ts.toDate().toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" }) : ""}
              </span>
            </div>
            <div style={{ fontSize: 13, color: TYPE_COLORS[p.type] || "rgba(255,255,255,0.7)", lineHeight: 1.4 }}>
              {TYPE_ICONS[p.type] || ""} {p.text}
            </div>
            <button onClick={() => onLike(p.id, !p.likes?.includes(profile?.uid))} style={{
              background: "none", border: "none", cursor: "pointer", fontSize: 12,
              color: p.likes?.includes(profile?.uid) ? "#FF6B6B" : "rgba(255,255,255,0.3)",
              marginTop: 6, padding: 0, fontFamily: "inherit"
            }}>❤️ {p.likes?.length || 0}</button>
          </div>
        </div>
      ))}
    </div>
  );
}

/* ═══════════════════════════════ PROFILE PAGE ═════════════════════════════ */
export function ProfilePage({ profile, updateProfile, tasks, habits, moodLog, onLogout }) {
  const lvl  = getLevel(profile.xp || 0);
  const prog = xpProgress(profile.xp || 0);
  const done = tasks.filter(t => t.done).length;
  const totalLogs  = habits.reduce((a, h) => a + (h.log?.length || 0), 0);
  const bestStreak = habits.reduce((a, h) => Math.max(a, h.streak || 0), 0);

  const moodCounts = MOODS.map(m => ({
    ...m, count: moodLog.filter(e => e.mood?.l === m.l).length
  })).sort((a, b) => b.count - a.count);

  return (
    <div className="fadeUp">
      {/* Hero */}
      <Card style={{ textAlign: "center", marginBottom: 16, background: "linear-gradient(135deg,rgba(108,99,255,0.1),rgba(253,203,110,0.05))" }}>
        {profile.photoURL
          ? <img src={profile.photoURL} alt="" style={{ width: 72, height: 72, borderRadius: "50%", margin: "0 auto 12px", display: "block", border: "3px solid rgba(108,99,255,0.4)" }} />
          : <div style={{ width: 72, height: 72, borderRadius: "50%", background: "linear-gradient(135deg,#6C63FF,#A29BFE)", display: "flex", alignItems: "center", justifyContent: "center", fontSize: 40, margin: "0 auto 12px", border: "3px solid rgba(108,99,255,0.4)" }}>{profile.avatar}</div>
        }
        <div style={{ fontFamily: "'Syne',sans-serif", fontWeight: 800, fontSize: 22, marginBottom: 4 }}>{profile.name}</div>
        <div style={{ fontSize: 12, color: "rgba(255,255,255,0.4)", marginBottom: 12 }}>{profile.email}</div>
        <div style={{ display: "flex", gap: 8, justifyContent: "center", flexWrap: "wrap", marginBottom: 16 }}>
          <Tag label={`Level ${lvl}`} color="#FDCB6E" />
          <Tag label={LEVEL_NAMES[lvl - 1]} color="#6C63FF" />
          {profile.adhdMode && <Tag label="ADHD Mode 🧠" color="#A29BFE" />}
        </div>
        <div style={{ marginBottom: 2 }}>
          <div style={{ display: "flex", justifyContent: "space-between", fontSize: 11, color: "rgba(255,255,255,0.35)", marginBottom: 4 }}>
            <span>{LEVEL_NAMES[lvl - 1]}</span>
            <span>{prog.earned}/{prog.needed} XP to next level</span>
          </div>
          <div style={{ height: 8, background: "rgba(255,255,255,0.06)", borderRadius: 4, overflow: "hidden" }}>
            <div style={{ height: "100%", width: `${prog.pct}%`, background: "linear-gradient(90deg,#6C63FF,#FDCB6E)", borderRadius: 4, transition: "width 0.5s" }} />
          </div>
        </div>
      </Card>

      {/* Stats grid */}
      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 10, marginBottom: 16 }}>
        {[
          { icon: "⭐", label: "Total XP",    val: profile.xp || 0,  color: "#FDCB6E" },
          { icon: "✅", label: "Tasks Done",  val: done,              color: "#55EFC4" },
          { icon: "🔥", label: "Best Streak", val: `${bestStreak}d`,  color: "#FF6B6B" },
          { icon: "📅", label: "Habit Logs",  val: totalLogs,         color: "#A29BFE" },
        ].map(s => (
          <Card key={s.label} style={{ padding: 14, textAlign: "center" }}>
            <div style={{ fontSize: 24, marginBottom: 4 }}>{s.icon}</div>
            <div style={{ fontFamily: "'Syne',sans-serif", fontWeight: 800, fontSize: 20, color: s.color }}>{s.val}</div>
            <div style={{ fontSize: 11, color: "rgba(255,255,255,0.35)" }}>{s.label}</div>
          </Card>
        ))}
      </div>

      {/* Mood history */}
      {moodLog.length > 0 && (
        <Card style={{ marginBottom: 16 }}>
          <div style={{ fontSize: 11, color: "rgba(255,255,255,0.35)", fontWeight: 700, marginBottom: 12, letterSpacing: "0.08em" }}>MOOD PATTERNS</div>
          {moodCounts.filter(m => m.count > 0).map(m => (
            <div key={m.l} style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 8 }}>
              <div style={{ fontSize: 20, width: 28 }}>{m.e}</div>
              <div style={{ flex: 1 }}>
                <div style={{ display: "flex", justifyContent: "space-between", fontSize: 12, marginBottom: 3 }}>
                  <span style={{ color: "rgba(255,255,255,0.65)" }}>{m.l}</span>
                  <span style={{ color: "rgba(255,255,255,0.3)" }}>{m.count}×</span>
                </div>
                <div style={{ height: 4, background: "rgba(255,255,255,0.05)", borderRadius: 2, overflow: "hidden" }}>
                  <div style={{ height: "100%", width: `${(m.count / moodLog.length) * 100}%`, background: m.c, borderRadius: 2 }} />
                </div>
              </div>
            </div>
          ))}
        </Card>
      )}

      {/* ADHD toggle */}
      <Card style={{ marginBottom: 12 }}>
        <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between" }}>
          <div>
            <div style={{ fontWeight: 600, fontSize: 14 }}>ADHD Mode 🧠</div>
            <div style={{ fontSize: 12, color: "rgba(255,255,255,0.4)", marginTop: 2 }}>Simplified UI, extra encouragement</div>
          </div>
          <button onClick={() => updateProfile({ adhdMode: !profile.adhdMode })} style={{
            width: 48, height: 26, borderRadius: 13, border: "none", cursor: "pointer",
            background: profile.adhdMode ? "#6C63FF" : "rgba(255,255,255,0.15)", transition: "all 0.2s", position: "relative"
          }}>
            <div style={{ position: "absolute", top: 3, left: profile.adhdMode ? 24 : 3, width: 20, height: 20, borderRadius: "50%", background: "#fff", transition: "left 0.2s" }} />
          </button>
        </div>
      </Card>

      <Btn ghost color="#FF6B6B" style={{ width: "100%" }} onClick={onLogout}>Sign Out</Btn>
    </div>
  );
}

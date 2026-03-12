// src/components/MorePages.jsx
import { useState, useRef, useEffect } from "react";
import { Card, Btn, Input, Tag } from "./UI";
import { TYPE_ICONS, TYPE_COLORS, getLevel, xpProgress, LEVEL_NAMES, MOODS } from "../utils";
import { useFriends, useFriendContent, useGroupPomodoro } from "../hooks/useData";

/* ═══════════════════════════════ FOCUS PAGE ═══════════════════════════════ */
export function FocusPage({ onComplete, profile }) {
  const PRESETS = [5, 10, 15, 25, 50];
  const [mins,     setMins]     = useState(25);
  const [sec,      setSec]      = useState(0);
  const [running,  setRunning]  = useState(false);
  const [done,     setDone]     = useState(false);
  const [sessions, setSessions] = useState([]);
  const [tab,      setTab]      = useState("solo"); // solo | group
  const [sessionId, setSessionId] = useState(null);
  const [joinInput, setJoinInput] = useState("");
  const totalRef = useRef(25 * 60);
  const leftRef  = useRef(25 * 60);
  const ivRef    = useRef(null);

  const { session, messages, participants, createSession, joinSession, startSession, endSession, sendMessage, leaveSession } = useGroupPomodoro(sessionId);

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
        if (sessionId) endSession(sessionId);
      }
    }, 1000);
  }
  function pause()  { clearInterval(ivRef.current); setRunning(false); }
  function reset()  { clearInterval(ivRef.current); setRunning(false); setDone(false); leftRef.current = totalRef.current; setMins(Math.floor(totalRef.current / 60)); setSec(totalRef.current % 60); }

  async function handleCreateSession() {
    if (!profile) return;
    const id = await createSession(profile, mins);
    setSessionId(id);
  }

  async function handleJoinSession() {
    if (!joinInput.trim() || !profile) return;
    await joinSession(joinInput.trim(), profile);
    setSessionId(joinInput.trim());
    setJoinInput("");
  }

  async function handleStartGroupSession() {
    if (!sessionId) return;
    await startSession(sessionId, mins);
    start();
  }

  const pct  = totalRef.current ? ((totalRef.current - leftRef.current) / totalRef.current) * 100 : 0;
  const R    = 52;
  const circ = 2 * Math.PI * R;

  return (
    <div className="fadeUp">
      <h2 style={{ fontFamily: "'Syne',sans-serif", fontWeight: 800, fontSize: 22, marginBottom: 4 }}>Focus Timer ⏱</h2>
      <p style={{ fontSize: 13, color: "rgba(255,255,255,0.4)", marginBottom: 16 }}>Complete a session to earn 40 XP 🧠</p>

      {/* Tab toggle */}
      <div style={{ display: "flex", gap: 6, marginBottom: 16 }}>
        {["solo", "group"].map(t => (
          <button key={t} onClick={() => setTab(t)} style={{
            flex: 1, padding: "8px 0", borderRadius: 10, fontSize: 13, fontWeight: 600,
            background: tab === t ? "#6C63FF" : "rgba(255,255,255,0.06)",
            border: "none", color: tab === t ? "#fff" : "rgba(255,255,255,0.4)", cursor: "pointer"
          }}>{t === "solo" ? "🎯 Solo" : "👥 Group Session"}</button>
        ))}
      </div>

      <Card style={{ marginBottom: 16, textAlign: "center" }}>
        <div style={{ display: "flex", gap: 8, justifyContent: "center", marginBottom: 24, flexWrap: "wrap" }}>
          {PRESETS.map(p => (
            <Btn key={p} small ghost={!(totalRef.current === p * 60)} color="#6C63FF" onClick={() => { if (!running) { totalRef.current = p * 60; leftRef.current = p * 60; setMins(p); setSec(0); } }}>{p}m</Btn>
          ))}
        </div>

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
            {tab === "group" && participants.length > 0 && (
              <div style={{ fontSize: 11, color: "rgba(255,255,255,0.4)", marginTop: 4 }}>{participants.length} focusing</div>
            )}
          </div>
        </div>

        <div style={{ display: "flex", gap: 8, justifyContent: "center" }}>
          {tab === "solo" ? (
            <>
              {!running && !done && <Btn color="#6C63FF" onClick={() => start()}>▶ Start</Btn>}
              {running && <Btn ghost color="#6C63FF" onClick={pause}>⏸ Pause</Btn>}
              <Btn ghost color="rgba(255,255,255,0.2)" style={{ color: "rgba(255,255,255,0.5)" }} onClick={reset}>↺ Reset</Btn>
            </>
          ) : (
            <>
              {sessionId && session?.hostUid === profile?.uid && !running && !done && (
                <Btn color="#6C63FF" onClick={handleStartGroupSession}>▶ Start All</Btn>
              )}
              {running && session?.hostUid === profile?.uid && <Btn ghost color="#6C63FF" onClick={pause}>⏸ Pause</Btn>}
              <Btn ghost color="rgba(255,255,255,0.2)" style={{ color: "rgba(255,255,255,0.5)" }} onClick={reset}>↺ Reset</Btn>
            </>
          )}
        </div>
      </Card>

      {/* Group session panel */}
      {tab === "group" && (
        <>
          {!sessionId ? (
            <Card style={{ marginBottom: 16 }}>
              <div style={{ fontSize: 13, fontWeight: 600, marginBottom: 12 }}>Start or join a group session</div>
              <Btn color="#6C63FF" style={{ width: "100%", marginBottom: 10 }} onClick={handleCreateSession}>
                + Create Session
              </Btn>
              <div style={{ display: "flex", gap: 8 }}>
                <Input value={joinInput} onChange={setJoinInput} placeholder="Paste session ID to join…" style={{ flex: 1 }} />
                <Btn color="#55EFC4" style={{ color: "#0B0D17" }} onClick={handleJoinSession}>Join</Btn>
              </div>
            </Card>
          ) : (
            <>
              {/* Session info */}
              <Card style={{ marginBottom: 12 }}>
                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 10 }}>
                  <div style={{ fontSize: 13, fontWeight: 600 }}>Session ID</div>
                  <Btn small color="#6C63FF" onClick={() => navigator.clipboard?.writeText(sessionId).then(() => alert("Copied! 📋"))}>Copy ID</Btn>
                </div>
                <div style={{ fontSize: 11, color: "#A29BFE", background: "rgba(108,99,255,0.1)", borderRadius: 6, padding: "6px 10px", wordBreak: "break-all", marginBottom: 12 }}>{sessionId}</div>
                <div style={{ fontSize: 11, color: "rgba(255,255,255,0.35)", fontWeight: 700, marginBottom: 8, letterSpacing: "0.08em" }}>PARTICIPANTS ({participants.length})</div>
                <div style={{ display: "flex", gap: 6, flexWrap: "wrap" }}>
                  {participants.map(p => (
                    <div key={p.uid} style={{ display: "flex", alignItems: "center", gap: 6, background: "rgba(255,255,255,0.05)", borderRadius: 20, padding: "4px 10px" }}>
                      <span style={{ fontSize: 16 }}>{p.avatar}</span>
                      <span style={{ fontSize: 12 }}>{p.name}</span>
                      {p.uid === session?.hostUid && <span style={{ fontSize: 10, color: "#FDCB6E" }}>host</span>}
                    </div>
                  ))}
                </div>
                <button onClick={() => { leaveSession(sessionId, profile?.uid); setSessionId(null); }} style={{ marginTop: 12, background: "none", border: "none", color: "#FF6B6B", fontSize: 12, cursor: "pointer", padding: 0 }}>Leave session</button>
              </Card>

              {/* Group chat */}
              <GroupChat sessionId={sessionId} profile={profile} messages={messages} sendMessage={sendMessage} />
            </>
          )}
        </>
      )}

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

/* ─── Group Chat ─────────────────────────────────────────────────────────── */
function GroupChat({ sessionId, profile, messages, sendMessage }) {
  const [text, setText] = useState("");
  const bottomRef = useRef(null);

  useEffect(() => { bottomRef.current?.scrollIntoView({ behavior: "smooth" }); }, [messages.length]);

  function send() {
    if (!text.trim() || !profile) return;
    sendMessage(sessionId, profile, text.trim());
    setText("");
  }

  return (
    <Card style={{ marginBottom: 16 }}>
      <div style={{ fontSize: 11, color: "rgba(255,255,255,0.35)", fontWeight: 700, marginBottom: 10, letterSpacing: "0.08em" }}>SESSION CHAT 💬</div>
      <div style={{ height: 180, overflowY: "auto", marginBottom: 10, display: "flex", flexDirection: "column", gap: 6 }}>
        {messages.length === 0 && <div style={{ fontSize: 12, color: "rgba(255,255,255,0.2)", textAlign: "center", marginTop: 60 }}>Say hi to your study squad! 👋</div>}
        {messages.map(m => (
          <div key={m.id} style={{ display: "flex", gap: 8, alignItems: "flex-start" }}>
            <span style={{ fontSize: 18, flexShrink: 0 }}>{m.avatar}</span>
            <div style={{ background: m.uid === profile?.uid ? "rgba(108,99,255,0.2)" : "rgba(255,255,255,0.05)", borderRadius: 10, padding: "6px 10px", flex: 1 }}>
              <div style={{ fontSize: 10, color: "rgba(255,255,255,0.35)", marginBottom: 2 }}>{m.name}</div>
              <div style={{ fontSize: 13 }}>{m.text}</div>
            </div>
          </div>
        ))}
        <div ref={bottomRef} />
      </div>
      <div style={{ display: "flex", gap: 8 }}>
        <Input value={text} onChange={setText} placeholder="Send a message…" style={{ flex: 1 }} onKeyDown={e => e.key === "Enter" && send()} />
        <Btn small color="#6C63FF" onClick={send}>Send</Btn>
      </div>
    </Card>
  );
}

/* ═══════════════════════════════ SOCIAL PAGE ══════════════════════════════ */
export function SocialPage({ feed, members, profile, roomId, onPost, onLike, onComment, uid, addTask, addHabit }) {
  const [text, setText] = useState("");
  const [activeTab, setActiveTab] = useState("feed"); // feed | friends | explore
  const [selectedFriend, setSelectedFriend] = useState(null);
  const shareUrl = `${window.location.origin}${window.location.pathname}?room=${roomId}`;

  const { friends, requests, outgoing, sendFriendRequest, acceptFriendRequest, declineFriendRequest, removeFriend } = useFriends(uid);

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
          <div style={{ fontSize: 12, color: "rgba(255,255,255,0.4)" }}>{members.length} member{members.length !== 1 ? "s" : ""} · {friends.length} friend{friends.length !== 1 ? "s" : ""}</div>
        </div>
        {requests.length > 0 && <div style={{ background: "#FF6B6B", color: "#fff", borderRadius: "50%", width: 22, height: 22, display: "flex", alignItems: "center", justifyContent: "center", fontSize: 12, fontWeight: 700 }}>{requests.length}</div>}
      </div>

      {/* Tabs */}
      <div style={{ display: "flex", gap: 6, marginBottom: 16 }}>
        {[["feed", "📣 Feed"], ["friends", `👫 Friends${requests.length ? ` (${requests.length})` : ""}`], ["explore", "🔍 Find"]].map(([key, label]) => (
          <button key={key} onClick={() => setActiveTab(key)} style={{
            flex: 1, padding: "8px 4px", borderRadius: 10, fontSize: 12, fontWeight: 600,
            background: activeTab === key ? "#6C63FF" : "rgba(255,255,255,0.06)",
            border: "none", color: activeTab === key ? "#fff" : "rgba(255,255,255,0.4)", cursor: "pointer"
          }}>{label}</button>
        ))}
      </div>

      {/* FEED TAB */}
      {activeTab === "feed" && (
        <>
          <Card style={{ marginBottom: 16, background: "linear-gradient(135deg,rgba(108,99,255,0.12),rgba(162,155,254,0.05))" }}>
            <div style={{ fontSize: 13, fontWeight: 600, marginBottom: 4 }}>🔗 Invite your friends</div>
            <div style={{ fontSize: 11, color: "rgba(255,255,255,0.4)", marginBottom: 10 }}>Share this link to join your squad</div>
            <div style={{ background: "rgba(0,0,0,0.3)", border: "1px solid rgba(255,255,255,0.08)", borderRadius: 8, padding: "8px 10px", fontSize: 11, color: "#A29BFE", wordBreak: "break-all", marginBottom: 10 }}>{shareUrl}</div>
            <Btn small color="#6C63FF" onClick={() => { navigator.clipboard?.writeText(shareUrl).then(() => alert("Link copied! 🎉")).catch(() => alert(shareUrl)); }}>Copy Link 📋</Btn>
          </Card>

          {members.length > 0 && (
            <Card style={{ marginBottom: 16 }}>
              <div style={{ fontSize: 11, color: "rgba(255,255,255,0.35)", fontWeight: 700, marginBottom: 12, letterSpacing: "0.08em" }}>LEADERBOARD 🏆</div>
              {[...members].sort((a, b) => (b.xp || 0) - (a.xp || 0)).map((m, i) => (
                <div key={m.uid || m.id} style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 10 }}>
                  <div style={{ width: 20, fontSize: 14, textAlign: "center" }}>
                    {i === 0 ? "🥇" : i === 1 ? "🥈" : i === 2 ? "🥉" : <span style={{ fontSize: 11, color: "rgba(255,255,255,0.3)" }}>{i + 1}</span>}
                  </div>
                  <div style={{ width: 34, height: 34, borderRadius: "50%", flexShrink: 0, background: "linear-gradient(135deg,#6C63FF,#A29BFE)", display: "flex", alignItems: "center", justifyContent: "center", fontSize: 19, border: `2px solid ${m.uid === profile?.uid ? "#FDCB6E" : "rgba(255,255,255,0.08)"}` }}>{m.avatar}</div>
                  <div style={{ flex: 1 }}>
                    <div style={{ fontSize: 13, fontWeight: m.uid === profile?.uid ? 700 : 500 }}>{m.name}{m.uid === profile?.uid ? " (you)" : ""}</div>
                    <div style={{ fontSize: 11, color: "rgba(255,255,255,0.35)" }}>🔥 {m.streak || 0} streak</div>
                  </div>
                  <div style={{ fontFamily: "'Syne',sans-serif", fontWeight: 800, fontSize: 15, color: "#FDCB6E" }}>{m.xp || 0}</div>
                </div>
              ))}
            </Card>
          )}

          <Card style={{ marginBottom: 16 }}>
            <div style={{ display: "flex", gap: 8 }}>
              <Input value={text} onChange={setText} placeholder="Share a win, thought, or cheer… 🎉" style={{ flex: 1 }} />
              <Btn color="#6C63FF" onClick={post}>Post</Btn>
            </div>
          </Card>

          {feed.length === 0 && (
            <div style={{ textAlign: "center", padding: "36px 0", color: "rgba(255,255,255,0.2)" }}>
              <div style={{ fontSize: 36, marginBottom: 8 }}>🌱</div>
              <div style={{ fontSize: 14 }}>No activity yet — be the first to share!</div>
            </div>
          )}

          {feed.map(p => (
            <FeedPost key={p.id} post={p} profile={profile} roomId={roomId} onLike={onLike} onComment={onComment} />
          ))}
        </>
      )}

      {/* FRIENDS TAB */}
      {activeTab === "friends" && (
        <>
          {requests.length > 0 && (
            <Card style={{ marginBottom: 16, border: "1px solid rgba(253,203,110,0.2)" }}>
              <div style={{ fontSize: 11, color: "#FDCB6E", fontWeight: 700, marginBottom: 12, letterSpacing: "0.08em" }}>FRIEND REQUESTS 🔔</div>
              {requests.map(r => (
                <div key={r.uid} style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 10 }}>
                  <div style={{ width: 36, height: 36, borderRadius: "50%", background: "linear-gradient(135deg,#6C63FF,#A29BFE)", display: "flex", alignItems: "center", justifyContent: "center", fontSize: 20 }}>{r.avatar}</div>
                  <div style={{ flex: 1 }}>
                    <div style={{ fontSize: 13, fontWeight: 600 }}>{r.name}</div>
                    <div style={{ fontSize: 11, color: "rgba(255,255,255,0.35)" }}>wants to be friends</div>
                  </div>
                  <Btn small color="#55EFC4" style={{ color: "#0B0D17" }} onClick={() => acceptFriendRequest(uid, r.uid)}>✓</Btn>
                  <Btn small ghost color="#FF6B6B" onClick={() => declineFriendRequest(uid, r.uid)}>✕</Btn>
                </div>
              ))}
            </Card>
          )}

          {friends.length === 0 && requests.length === 0 ? (
            <div style={{ textAlign: "center", padding: "36px 0", color: "rgba(255,255,255,0.2)" }}>
              <div style={{ fontSize: 40, marginBottom: 8 }}>🤝</div>
              <div style={{ fontSize: 14 }}>No friends yet — find people in the Find tab!</div>
            </div>
          ) : (
            friends.map(f => (
              <Card key={f.uid} style={{ marginBottom: 10 }}>
                <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
                  <div style={{ width: 42, height: 42, borderRadius: "50%", background: "linear-gradient(135deg,#6C63FF,#A29BFE)", display: "flex", alignItems: "center", justifyContent: "center", fontSize: 24 }}>{f.avatar}</div>
                  <div style={{ flex: 1 }}>
                    <div style={{ fontSize: 14, fontWeight: 600 }}>{f.name}</div>
                    <div style={{ fontSize: 11, color: "#55EFC4" }}>Friend ✓</div>
                  </div>
                  <Btn small color="#6C63FF" onClick={() => setSelectedFriend(f.uid === selectedFriend ? null : f.uid)}>
                    {f.uid === selectedFriend ? "Hide" : "View"}
                  </Btn>
                  <button onClick={() => removeFriend(uid, f.uid)} style={{ background: "none", border: "none", color: "rgba(255,255,255,0.2)", cursor: "pointer", fontSize: 14 }}
                    onMouseEnter={e => e.currentTarget.style.color = "#FF6B6B"}
                    onMouseLeave={e => e.currentTarget.style.color = "rgba(255,255,255,0.2)"}>✕</button>
                </div>
                {selectedFriend === f.uid && (
                  <FriendProfile friendUid={f.uid} myUid={uid} addTask={addTask} addHabit={addHabit} />
                )}
              </Card>
            ))
          )}
        </>
      )}

      {/* FIND TAB */}
      {activeTab === "explore" && (
        <FindFriends uid={uid} profile={profile} friends={friends} outgoing={outgoing} sendFriendRequest={sendFriendRequest} members={members} />
      )}
    </div>
  );
}

/* ─── Feed Post with comments ────────────────────────────────────────────── */
function FeedPost({ post: p, profile, roomId, onLike, onComment }) {
  const [showComments, setShowComments] = useState(false);
  const [commentText, setCommentText] = useState("");

  function submitComment() {
    if (!commentText.trim() || !profile) return;
    onComment(roomId, p.id, {
      uid: profile.uid, name: profile.name, avatar: profile.avatar,
      text: commentText.trim(), ts: new Date().toISOString()
    });
    setCommentText("");
  }

  return (
    <div style={{ display: "flex", gap: 10, padding: "12px 14px", background: "rgba(255,255,255,0.03)", border: "1px solid rgba(255,255,255,0.06)", borderRadius: 12, marginBottom: 8 }}>
      <div style={{ width: 36, height: 36, borderRadius: "50%", flexShrink: 0, background: "linear-gradient(135deg,#6C63FF,#A29BFE)", display: "flex", alignItems: "center", justifyContent: "center", fontSize: 20 }}>{p.userAvatar || "🌀"}</div>
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
        <div style={{ display: "flex", gap: 12, marginTop: 8, alignItems: "center" }}>
          <button onClick={() => onLike(p.id, !p.likes?.includes(profile?.uid))} style={{ background: "none", border: "none", cursor: "pointer", fontSize: 12, color: p.likes?.includes(profile?.uid) ? "#FF6B6B" : "rgba(255,255,255,0.3)", padding: 0, fontFamily: "inherit" }}>
            ❤️ {p.likes?.length || 0}
          </button>
          <button onClick={() => setShowComments(v => !v)} style={{ background: "none", border: "none", cursor: "pointer", fontSize: 12, color: "rgba(255,255,255,0.3)", padding: 0, fontFamily: "inherit" }}>
            💬 {p.comments?.length || 0}
          </button>
        </div>
        {showComments && (
          <div style={{ marginTop: 10 }}>
            {(p.comments || []).map((c, i) => (
              <div key={i} style={{ display: "flex", gap: 6, marginBottom: 6, alignItems: "flex-start" }}>
                <span style={{ fontSize: 14 }}>{c.avatar}</span>
                <div style={{ background: "rgba(255,255,255,0.05)", borderRadius: 8, padding: "5px 8px", flex: 1 }}>
                  <div style={{ fontSize: 10, color: "rgba(255,255,255,0.35)", marginBottom: 2 }}>{c.name}</div>
                  <div style={{ fontSize: 12 }}>{c.text}</div>
                </div>
              </div>
            ))}
            <div style={{ display: "flex", gap: 6, marginTop: 6 }}>
              <Input value={commentText} onChange={setCommentText} placeholder="Add a comment…" style={{ flex: 1, fontSize: 12 }} onKeyDown={e => e.key === "Enter" && submitComment()} />
              <Btn small color="#6C63FF" onClick={submitComment}>↑</Btn>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

/* ─── Friend Profile (public content) ───────────────────────────────────── */
function FriendProfile({ friendUid, myUid, addTask, addHabit }) {
  const { tasks, habits, profile } = useFriendContent(friendUid);
  const todayStr = new Date().toISOString().slice(0, 10);
  const [copied, setCopied] = useState(null);

  async function copyTask(task) {
    await addTask({ title: task.title, desc: task.desc || "", priority: task.priority || "medium", tag: task.tag || "", xp: task.xp || 20, dueTime: "", isPublic: true });
    setCopied(`task-${task.id}`);
    setTimeout(() => setCopied(null), 2000);
  }

  async function copyHabit(habit) {
    await addHabit({ name: habit.name, icon: habit.icon, color: habit.color, freq: habit.freq || "daily", isPublic: true });
    setCopied(`habit-${habit.id}`);
    setTimeout(() => setCopied(null), 2000);
  }

  return (
    <div style={{ marginTop: 14, borderTop: "1px solid rgba(255,255,255,0.06)", paddingTop: 14 }}>
      {habits.length > 0 && (
        <>
          <div style={{ fontSize: 11, color: "rgba(255,255,255,0.35)", fontWeight: 700, marginBottom: 8, letterSpacing: "0.08em" }}>PUBLIC HABITS 🔥</div>
          {habits.map(h => (
            <div key={h.id} style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 8, background: "rgba(255,255,255,0.03)", borderRadius: 10, padding: "8px 10px" }}>
              <span style={{ fontSize: 20 }}>{h.icon}</span>
              <div style={{ flex: 1 }}>
                <div style={{ fontSize: 13, fontWeight: 500 }}>{h.name}</div>
                <div style={{ fontSize: 11, color: h.color || "#FDCB6E" }}>🔥 {h.streak || 0} streak</div>
              </div>
              <Btn small color="#6C63FF" onClick={() => copyHabit(h)}>
                {copied === `habit-${h.id}` ? "✓ Copied!" : "Copy"}
              </Btn>
            </div>
          ))}
        </>
      )}
      {tasks.length > 0 && (
        <>
          <div style={{ fontSize: 11, color: "rgba(255,255,255,0.35)", fontWeight: 700, marginBottom: 8, marginTop: 10, letterSpacing: "0.08em" }}>PUBLIC TASKS ✅</div>
          {tasks.filter(t => !t.done).map(t => (
            <div key={t.id} style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 8, background: "rgba(255,255,255,0.03)", borderRadius: 10, padding: "8px 10px" }}>
              <div style={{ flex: 1 }}>
                <div style={{ fontSize: 13, fontWeight: 500 }}>{t.title}</div>
                {t.tag && <span style={{ fontSize: 10, color: "rgba(255,255,255,0.35)" }}>#{t.tag}</span>}
              </div>
              <Btn small color="#6C63FF" onClick={() => copyTask(t)}>
                {copied === `task-${t.id}` ? "✓ Copied!" : "Copy"}
              </Btn>
            </div>
          ))}
        </>
      )}
      {tasks.length === 0 && habits.length === 0 && (
        <div style={{ fontSize: 13, color: "rgba(255,255,255,0.2)", textAlign: "center", padding: "12px 0" }}>No public content yet</div>
      )}
    </div>
  );
}

/* ─── Find Friends ───────────────────────────────────────────────────────── */
function FindFriends({ uid, profile, friends, outgoing, sendFriendRequest, members }) {
  const [targetId, setTargetId] = useState("");
  const [status, setStatus] = useState(null);

  const friendIds = new Set([...friends.map(f => f.uid), ...outgoing.map(f => f.uid), uid]);

  async function send() {
    if (!targetId.trim()) return;
    setStatus("loading");
    const res = await sendFriendRequest(uid, targetId.trim(), profile);
    if (res?.error) setStatus(`error:${res.error}`);
    else { setStatus("sent"); setTargetId(""); }
  }

  const suggestions = members.filter(m => m.uid !== uid && !friendIds.has(m.uid));

  return (
    <div>
      <Card style={{ marginBottom: 16 }}>
        <div style={{ fontSize: 13, fontWeight: 600, marginBottom: 4 }}>Add by User ID</div>
        <div style={{ fontSize: 11, color: "rgba(255,255,255,0.35)", marginBottom: 10 }}>Go to Profile → copy your UID and share it</div>
        <div style={{ display: "flex", gap: 8 }}>
          <Input value={targetId} onChange={setTargetId} placeholder="Paste friend's user ID…" style={{ flex: 1 }} />
          <Btn color="#6C63FF" onClick={send}>Add</Btn>
        </div>
        {status === "sent" && <div style={{ fontSize: 12, color: "#55EFC4", marginTop: 8 }}>Friend request sent! ✓</div>}
        {status?.startsWith("error:") && <div style={{ fontSize: 12, color: "#FF6B6B", marginTop: 8 }}>{status.replace("error:", "")}</div>}
      </Card>

      {suggestions.length > 0 && (
        <Card>
          <div style={{ fontSize: 11, color: "rgba(255,255,255,0.35)", fontWeight: 700, marginBottom: 12, letterSpacing: "0.08em" }}>PEOPLE IN YOUR SQUAD</div>
          {suggestions.map(m => {
            const isPending = outgoing.some(o => o.uid === m.uid);
            return (
              <div key={m.uid} style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 10 }}>
                <div style={{ width: 36, height: 36, borderRadius: "50%", background: "linear-gradient(135deg,#6C63FF,#A29BFE)", display: "flex", alignItems: "center", justifyContent: "center", fontSize: 20 }}>{m.avatar}</div>
                <div style={{ flex: 1 }}>
                  <div style={{ fontSize: 13, fontWeight: 600 }}>{m.name}</div>
                  <div style={{ fontSize: 11, color: "rgba(255,255,255,0.35)" }}>{m.xp || 0} XP · {m.streak || 0} streak</div>
                </div>
                {isPending
                  ? <span style={{ fontSize: 11, color: "#FDCB6E" }}>Pending…</span>
                  : <Btn small color="#6C63FF" onClick={() => sendFriendRequest(uid, m.uid, profile)}>+ Add</Btn>
                }
              </div>
            );
          })}
        </Card>
      )}
    </div>
  );
}

/* ═══════════════════════════════ PROFILE PAGE ═════════════════════════════ */
export function ProfilePage({ profile, updateProfile, tasks, habits, moodLog, onLogout, uid }) {
  const lvl  = getLevel(profile.xp || 0);
  const prog = xpProgress(profile.xp || 0);
  const done = tasks.filter(t => t.done).length;
  const totalLogs  = habits.reduce((a, h) => a + (h.log?.length || 0), 0);
  const bestStreak = habits.reduce((a, h) => Math.max(a, h.streak || 0), 0);
  const [copied, setCopied] = useState(false);
  const [editMode, setEditMode] = useState(false);
  const [editName, setEditName] = useState(profile.name || "");
  const [editAvatar, setEditAvatar] = useState(profile.avatar || "🦊");
  const AVATARS = ["🦊","🐼","🦋","🐸","🦄","🐙","🦁","🐺","🐨","🦝","🦩","🐬","🐯","🦅","🐲","🌟","🔥","⚡","🎯","🚀"];

  async function saveProfile() {
    if (!editName.trim()) return;
    await updateProfile({ name: editName.trim(), avatar: editAvatar });
    setEditMode(false);
  }

  const moodCounts = MOODS.map(m => ({
    ...m, count: moodLog.filter(e => e.mood?.l === m.l).length
  })).sort((a, b) => b.count - a.count);

  function copyUID() {
    navigator.clipboard?.writeText(uid || "").then(() => { setCopied(true); setTimeout(() => setCopied(false), 2000); });
  }

  return (
    <div className="fadeUp">
      <Card style={{ textAlign: "center", marginBottom: 16, background: "linear-gradient(135deg,rgba(108,99,255,0.1),rgba(253,203,110,0.05))" }}>
        {/* Avatar */}
        {profile.photoURL && !editMode
          ? <img src={profile.photoURL} alt="" style={{ width: 72, height: 72, borderRadius: "50%", margin: "0 auto 12px", display: "block", border: "3px solid rgba(108,99,255,0.4)" }} />
          : <div style={{ width: 72, height: 72, borderRadius: "50%", background: "linear-gradient(135deg,#6C63FF,#A29BFE)", display: "flex", alignItems: "center", justifyContent: "center", fontSize: 40, margin: "0 auto 12px", border: "3px solid rgba(108,99,255,0.4)" }}>{editMode ? editAvatar : profile.avatar}</div>
        }

        {editMode ? (
          <div style={{ marginBottom: 12 }}>
            <input value={editName} onChange={e => setEditName(e.target.value)} style={{ background: "rgba(255,255,255,0.08)", border: "1px solid rgba(255,255,255,0.15)", borderRadius: 10, padding: "8px 14px", color: "#E8E9F3", fontSize: 16, fontWeight: 700, width: "100%", textAlign: "center", fontFamily: "inherit", marginBottom: 12, outline: "none" }} placeholder="Your name" />
            <div style={{ fontSize: 11, color: "rgba(255,255,255,0.35)", marginBottom: 8 }}>PICK AN AVATAR</div>
            <div style={{ display: "flex", flexWrap: "wrap", gap: 6, justifyContent: "center", marginBottom: 14 }}>
              {AVATARS.map(av => (
                <button key={av} onClick={() => setEditAvatar(av)} style={{ width: 38, height: 38, borderRadius: 10, fontSize: 22, cursor: "pointer", border: "none", background: editAvatar === av ? "rgba(108,99,255,0.35)" : "rgba(255,255,255,0.05)", outline: editAvatar === av ? "2px solid #6C63FF" : "none" }}>{av}</button>
              ))}
            </div>
            <div style={{ display: "flex", gap: 8, justifyContent: "center" }}>
              <Btn color="#6C63FF" onClick={saveProfile}>Save Changes</Btn>
              <Btn ghost color="rgba(255,255,255,0.3)" style={{ color: "rgba(255,255,255,0.5)" }} onClick={() => { setEditMode(false); setEditName(profile.name); setEditAvatar(profile.avatar); }}>Cancel</Btn>
            </div>
          </div>
        ) : (
          <>
            <div style={{ fontFamily: "'Syne',sans-serif", fontWeight: 800, fontSize: 22, marginBottom: 4 }}>{profile.name}</div>
            <div style={{ fontSize: 12, color: "rgba(255,255,255,0.4)", marginBottom: 8 }}>{profile.email}</div>
            <button onClick={() => { setEditMode(true); setEditName(profile.name); setEditAvatar(profile.avatar); }} style={{ background: "rgba(108,99,255,0.15)", border: "1px solid rgba(108,99,255,0.3)", borderRadius: 8, padding: "5px 14px", color: "#A29BFE", fontSize: 12, cursor: "pointer", fontFamily: "inherit", marginBottom: 12 }}>✏️ Edit Profile</button>
          </>
        )}

        {/* UID copy */}
        <div style={{ background: "rgba(255,255,255,0.05)", borderRadius: 8, padding: "6px 12px", marginBottom: 12, cursor: "pointer" }} onClick={copyUID}>
          <div style={{ fontSize: 10, color: "rgba(255,255,255,0.3)", marginBottom: 2 }}>YOUR USER ID (share to add friends)</div>
          <div style={{ fontSize: 11, color: "#A29BFE", wordBreak: "break-all" }}>{uid}</div>
          <div style={{ fontSize: 11, color: copied ? "#55EFC4" : "#6C63FF", marginTop: 4 }}>{copied ? "✓ Copied!" : "Tap to copy"}</div>
        </div>

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

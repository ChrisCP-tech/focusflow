// src/components/MorePages.jsx
import { useState, useEffect, useCallback } from "react";
import { Card, Btn, Input, Tag } from "./UI";
import { getLevel, xpProgress, LEVEL_NAMES, getLevelUnlocks, getUnlockedAvatars, streakColor, today, TYPE_ICONS, TYPE_COLORS } from "../utils";
import { fetchUserProfile } from "../hooks/useData";

/* ═══════════════════════════════ FOCUS PAGE ═══════════════════════════════ */
export function FocusPage({ onComplete, profile, uid, roomMembers }) {
  const PRESETS = [{ label:"25 min",s:1500},{label:"45 min",s:2700},{label:"60 min",s:3600}];
  const [mode,     setMode]     = useState("solo");   // "solo" | "group"
  const [selected, setSelected] = useState(1500);
  const [left,     setLeft]     = useState(1500);
  const [running,  setRunning]  = useState(false);
  const [done,     setDone]     = useState(false);

  // Group focus state
  const [sessionId,    setSessionId]    = useState(null);
  const [joinCode,     setJoinCode]     = useState("");
  const [groupSession, setGroupSession] = useState(null);
  const [participants, setParticipants] = useState([]);
  const [chatMsg,      setChatMsg]      = useState("");
  const [messages,     setMessages]     = useState([]);
  const [groupError,   setGroupError]   = useState(null);

  // Solo timer
  useEffect(() => {
    if (!running || mode === "group") return;
    const t = setInterval(() => setLeft(l => {
      if (l <= 1) { setRunning(false); setDone(true); clearInterval(t); return 0; }
      return l - 1;
    }), 1000);
    return () => clearInterval(t);
  }, [running, mode]);

  // Group session listener
  useEffect(() => {
    if (!sessionId) return;
    import("../firebase/config").then(({ db }) => {
      import("firebase/firestore").then(({ doc, onSnapshot, collection }) => {
        const unsubSession = onSnapshot(doc(db, "pomodoroSessions", sessionId), snap => {
          if (snap.exists()) setGroupSession(snap.data());
        });
        const unsubParts = onSnapshot(collection(db, "pomodoroSessions", sessionId, "participants"), snap => {
          setParticipants(snap.docs.map(d => ({ id: d.id, ...d.data() })));
        });
        const unsubMsgs = onSnapshot(collection(db, "pomodoroSessions", sessionId, "messages"), snap => {
          setMessages(snap.docs.map(d => ({ id: d.id, ...d.data() })).sort((a,b) => (a.ts?.seconds||0)-(b.ts?.seconds||0)));
        });
        // Store unsubs for cleanup
        window._focusUnsubs = [unsubSession, unsubParts, unsubMsgs];
      });
    });
    return () => { (window._focusUnsubs||[]).forEach(u => u()); window._focusUnsubs = []; };
  }, [sessionId]);

  // Group timer sync
  useEffect(() => {
    if (!groupSession || !running) return;
    const endTime = groupSession.endTime?.toMillis?.() || 0;
    const tick = setInterval(() => {
      const remaining = Math.max(0, Math.round((endTime - Date.now()) / 1000));
      setLeft(remaining);
      if (remaining === 0) { setRunning(false); setDone(true); clearInterval(tick); }
    }, 1000);
    return () => clearInterval(tick);
  }, [groupSession, running]);

  function pick(s) { if (!running) { setSelected(s); setLeft(s); setDone(false); } }
  function reset()  { setRunning(false); setLeft(selected); setDone(false); }

  async function createGroupSession() {
    try {
      const { db } = await import("../firebase/config");
      const { addDoc, collection, setDoc, doc, serverTimestamp, Timestamp } = await import("firebase/firestore");
      const code = Math.random().toString(36).slice(2, 7).toUpperCase();
      const ref = await addDoc(collection(db, "pomodoroSessions"), {
        code, hostUid: uid, duration: selected,
        status: "waiting", createdAt: serverTimestamp()
      });
      await setDoc(doc(db, "pomodoroSessions", ref.id, "participants", uid), {
        uid, name: profile?.name || "You", avatar: profile?.avatar || "🦊",
        joinedAt: serverTimestamp()
      });
      setSessionId(ref.id);
      setGroupError(null);
    } catch(e) { setGroupError("Failed to create session: " + e.message); }
  }

  async function joinGroupSession() {
    if (!joinCode.trim()) return;
    try {
      const { db } = await import("../firebase/config");
      const { collection, getDocs, query, where, setDoc, doc, serverTimestamp } = await import("firebase/firestore");
      const snap = await getDocs(query(collection(db, "pomodoroSessions"), where("code", "==", joinCode.trim().toUpperCase())));
      if (snap.empty) { setGroupError("Session not found — check the code"); return; }
      const sessionDoc = snap.docs[0];
      await setDoc(doc(db, "pomodoroSessions", sessionDoc.id, "participants", uid), {
        uid, name: profile?.name || "You", avatar: profile?.avatar || "🦊",
        joinedAt: serverTimestamp()
      });
      setSessionId(sessionDoc.id);
      setGroupError(null);
    } catch(e) { setGroupError("Failed to join: " + e.message); }
  }

  async function startGroupTimer() {
    try {
      const { db } = await import("../firebase/config");
      const { updateDoc, doc, Timestamp } = await import("firebase/firestore");
      const endTime = new Date(Date.now() + selected * 1000);
      await updateDoc(doc(db, "pomodoroSessions", sessionId), {
        status: "running", endTime: Timestamp.fromDate(endTime), duration: selected
      });
      setLeft(selected);
      setRunning(true);
      setDone(false);
    } catch(e) { setGroupError("Failed to start: " + e.message); }
  }

  async function sendChat() {
    if (!chatMsg.trim() || !sessionId) return;
    const { db } = await import("../firebase/config");
    const { addDoc, collection, serverTimestamp } = await import("firebase/firestore");
    await addDoc(collection(db, "pomodoroSessions", sessionId, "messages"), {
      uid, name: profile?.name || "You", avatar: profile?.avatar || "🦊",
      text: chatMsg.trim(), ts: serverTimestamp()
    });
    setChatMsg("");
  }

  async function leaveGroup() {
    if (!sessionId) return;
    const { db } = await import("../firebase/config");
    const { deleteDoc, doc } = await import("firebase/firestore");
    await deleteDoc(doc(db, "pomodoroSessions", sessionId, "participants", uid)).catch(()=>{});
    setSessionId(null); setGroupSession(null); setParticipants([]);
    setMessages([]); setRunning(false); setDone(false); setLeft(selected);
  }

  const mins = String(Math.floor(left/60)).padStart(2,"0");
  const secs = String(left%60).padStart(2,"0");
  const pct  = ((selected - left) / selected) * 100;
  const isHost = groupSession?.hostUid === uid;

  return (
    <div className="fadeUp" style={{ display:"flex", flexDirection:"column", alignItems:"center", paddingTop:20 }}>
      <h2 style={{ fontFamily:"'Syne',sans-serif", fontWeight:800, fontSize:22, marginBottom:16 }}>Focus Mode ⏱</h2>

      {/* Mode toggle */}
      {!sessionId && (
        <div style={{ display:"flex", gap:6, marginBottom:24, background:"rgba(255,255,255,0.04)", borderRadius:20, padding:4 }}>
          {[["solo","🎧 Solo"],["group","👥 Group"]].map(([m,l]) => (
            <button key={m} onClick={() => setMode(m)} style={{
              padding:"7px 20px", borderRadius:16, fontSize:13, fontWeight:700, border:"none", cursor:"pointer",
              background: mode===m ? "#6C63FF" : "transparent",
              color: mode===m ? "#fff" : "rgba(255,255,255,0.4)"
            }}>{l}</button>
          ))}
        </div>
      )}

      {/* ── SOLO MODE ── */}
      {mode === "solo" && !sessionId && (
        <>
          <div style={{ display:"flex", gap:8, marginBottom:32 }}>
            {PRESETS.map(p => (
              <button key={p.s} onClick={() => pick(p.s)} style={{
                padding:"8px 16px", borderRadius:20, fontSize:13, fontWeight:600, cursor:"pointer", border:"none",
                background:selected===p.s?"#6C63FF":"rgba(255,255,255,0.07)",
                color:selected===p.s?"#fff":"rgba(255,255,255,0.5)"
              }}>{p.label}</button>
            ))}
          </div>
          <div style={{ position:"relative", width:200, height:200, marginBottom:32 }}>
            <svg width="200" height="200" style={{ position:"absolute", top:0, left:0, transform:"rotate(-90deg)" }}>
              <circle cx="100" cy="100" r="90" fill="none" stroke="rgba(255,255,255,0.06)" strokeWidth="8" />
              <circle cx="100" cy="100" r="90" fill="none" stroke="#6C63FF" strokeWidth="8"
                strokeDasharray={`${2*Math.PI*90}`} strokeDashoffset={`${2*Math.PI*90*(1-pct/100)}`}
                strokeLinecap="round" style={{ transition:"stroke-dashoffset 0.8s ease" }} />
            </svg>
            <div style={{ position:"absolute", inset:0, display:"flex", flexDirection:"column", alignItems:"center", justifyContent:"center" }}>
              <div style={{ fontFamily:"'Syne',sans-serif", fontWeight:800, fontSize:42 }}>{mins}:{secs}</div>
              <div style={{ fontSize:12, color:"rgba(255,255,255,0.35)" }}>{running ? "focusing…" : done ? "done! 🎉" : "ready"}</div>
            </div>
          </div>
          {done ? (
            <div style={{ textAlign:"center" }}>
              <div style={{ fontSize:16, fontWeight:700, color:"#55EFC4", marginBottom:12 }}>Session complete! +40XP +20🪙</div>
              <Btn color="#6C63FF" onClick={() => { onComplete(); reset(); }}>Claim Reward 🎉</Btn>
            </div>
          ) : (
            <div style={{ display:"flex", gap:10 }}>
              <Btn color="#6C63FF" onClick={() => setRunning(v=>!v)}>{running?"⏸ Pause":"▶ Start"}</Btn>
              {(running || left !== selected) && <Btn ghost color="#6C63FF" onClick={reset}>↺ Reset</Btn>}
            </div>
          )}
        </>
      )}

      {/* ── GROUP MODE — lobby ── */}
      {mode === "group" && !sessionId && (
        <div style={{ width:"100%", maxWidth:360 }}>
          <div style={{ display:"flex", gap:8, marginBottom:16 }}>
            {PRESETS.map(p => (
              <button key={p.s} onClick={() => pick(p.s)} style={{
                flex:1, padding:"8px 0", borderRadius:12, fontSize:12, fontWeight:600, cursor:"pointer", border:"none",
                background:selected===p.s?"#6C63FF":"rgba(255,255,255,0.07)",
                color:selected===p.s?"#fff":"rgba(255,255,255,0.5)"
              }}>{p.label}</button>
            ))}
          </div>
          <Btn color="#6C63FF" style={{ width:"100%", marginBottom:12 }} onClick={createGroupSession}>
            ✨ Create Group Session
          </Btn>
          <div style={{ textAlign:"center", fontSize:12, color:"rgba(255,255,255,0.3)", marginBottom:12 }}>— or join existing —</div>
          <div style={{ display:"flex", gap:8 }}>
            <Input value={joinCode} onChange={setJoinCode}
              onKeyDown={e => e.key==="Enter" && joinGroupSession()}
              placeholder="Enter 5-letter code…"
              style={{ flex:1, textTransform:"uppercase", letterSpacing:"0.1em" }} />
            <Btn color="#55EFC4" style={{ color:"#0B0D17" }} onClick={joinGroupSession}>Join</Btn>
          </div>
          {groupError && <div style={{ fontSize:12, color:"#FF6B6B", marginTop:8, textAlign:"center" }}>{groupError}</div>}
        </div>
      )}

      {/* ── GROUP MODE — active session ── */}
      {sessionId && (
        <div style={{ width:"100%", maxWidth:400 }}>
          {/* Session code */}
          <div style={{ textAlign:"center", marginBottom:20 }}>
            <div style={{ fontSize:11, color:"rgba(255,255,255,0.3)", marginBottom:4 }}>SESSION CODE</div>
            <div style={{ fontFamily:"'Syne',sans-serif", fontWeight:800, fontSize:28, letterSpacing:"0.15em", color:"#FDCB6E" }}>
              {groupSession?.code || "…"}
            </div>
            <div style={{ fontSize:11, color:"rgba(255,255,255,0.3)", marginTop:2 }}>Share this with friends</div>
          </div>

          {/* Timer */}
          <div style={{ position:"relative", width:160, height:160, margin:"0 auto 20px" }}>
            <svg width="160" height="160" style={{ position:"absolute", top:0, left:0, transform:"rotate(-90deg)" }}>
              <circle cx="80" cy="80" r="70" fill="none" stroke="rgba(255,255,255,0.06)" strokeWidth="7" />
              <circle cx="80" cy="80" r="70" fill="none" stroke={done?"#55EFC4":"#6C63FF"} strokeWidth="7"
                strokeDasharray={`${2*Math.PI*70}`} strokeDashoffset={`${2*Math.PI*70*(1-pct/100)}`}
                strokeLinecap="round" style={{ transition:"stroke-dashoffset 0.8s ease" }} />
            </svg>
            <div style={{ position:"absolute", inset:0, display:"flex", flexDirection:"column", alignItems:"center", justifyContent:"center" }}>
              <div style={{ fontFamily:"'Syne',sans-serif", fontWeight:800, fontSize:34 }}>{mins}:{secs}</div>
              <div style={{ fontSize:11, color:"rgba(255,255,255,0.35)" }}>
                {groupSession?.status === "waiting" ? "waiting…" : running ? "focusing…" : done ? "done! 🎉" : "paused"}
              </div>
            </div>
          </div>

          {/* Controls */}
          <div style={{ display:"flex", gap:8, justifyContent:"center", marginBottom:16 }}>
            {isHost && groupSession?.status === "waiting" && (
              <Btn color="#6C63FF" onClick={startGroupTimer}>▶ Start for Everyone</Btn>
            )}
            {done && isHost && (
              <Btn color="#55EFC4" style={{ color:"#0B0D17" }} onClick={() => { onComplete(); leaveGroup(); }}>
                Claim +40XP 🎉
              </Btn>
            )}
            <Btn ghost color="#FF6B6B" onClick={leaveGroup}>Leave</Btn>
          </div>

          {/* Participants */}
          <div style={{ marginBottom:14 }}>
            <div style={{ fontSize:11, fontWeight:700, color:"rgba(255,255,255,0.3)", letterSpacing:"0.06em", marginBottom:8 }}>
              PARTICIPANTS ({participants.length})
            </div>
            <div style={{ display:"flex", flexWrap:"wrap", gap:8 }}>
              {participants.map(p => (
                <div key={p.id} style={{ display:"flex", alignItems:"center", gap:6, background:"rgba(255,255,255,0.05)", borderRadius:20, padding:"4px 10px 4px 6px" }}>
                  <span style={{ fontSize:20 }}>{p.avatar}</span>
                  <span style={{ fontSize:12, fontWeight:600 }}>{p.uid === uid ? "You" : p.name}</span>
                </div>
              ))}
            </div>
          </div>

          {/* Chat */}
          <div style={{ background:"rgba(255,255,255,0.03)", border:"1px solid rgba(255,255,255,0.07)", borderRadius:12, padding:10 }}>
            <div style={{ fontSize:11, fontWeight:700, color:"rgba(255,255,255,0.3)", letterSpacing:"0.06em", marginBottom:8 }}>CHAT</div>
            <div style={{ maxHeight:120, overflowY:"auto", marginBottom:8 }}>
              {messages.length === 0 && <div style={{ fontSize:12, color:"rgba(255,255,255,0.2)", textAlign:"center", padding:"8px 0" }}>No messages yet…</div>}
              {messages.map(m => (
                <div key={m.id} style={{ fontSize:12, marginBottom:6 }}>
                  <span style={{ fontWeight:700, color: m.uid===uid?"#A29BFE":"#74B9FF" }}>{m.uid===uid?"You":m.name}: </span>
                  <span style={{ color:"rgba(255,255,255,0.7)" }}>{m.text}</span>
                </div>
              ))}
            </div>
            <div style={{ display:"flex", gap:6 }}>
              <Input value={chatMsg} onChange={setChatMsg}
                onKeyDown={e => e.key==="Enter" && sendChat()}
                placeholder="Say something…" style={{ flex:1, fontSize:12, padding:"6px 10px" }} />
              <Btn small color="#6C63FF" onClick={sendChat}>↑</Btn>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

/* ═══════════════════════════════ SOCIAL PAGE ══════════════════════════════ */
export function SocialPage({ feed, members, profile, roomId, onPost, onLike, onComment, onDeletePost, uid, addTask, addHabit, friends, sendFriendRequest, acceptFriend, removeFriend, onViewProfile, giftGold, updateProfile, taskInvites, onAcceptInvite, onDeclineInvite }) {
  const [tab,       setTab]       = useState("feed");
  const [text,      setText]      = useState("");
  const [targetUid, setTargetUid] = useState("");
  const [reqStatus, setReqStatus] = useState(null);

  const pending        = (friends||[]).filter(f => f.status==="pending" && f.direction==="incoming");
  const accepted       = (friends||[]).filter(f => f.status==="accepted");
  const pendingInvites = (taskInvites||[]).filter(i => i.status === "pending");

  // Online = last seen within 5 minutes
  const now = Date.now();
  const onlineMembers = (members||[]).filter(m => {
    const lastSeen = m.lastSeen?.toMillis?.() || m.lastSeen?.seconds * 1000 || 0;
    return now - lastSeen < 5 * 60 * 1000;
  }).sort((a, b) => (b.xp||0) - (a.xp||0));

  function post() {
    if (!text.trim()) return;
    onPost(text.trim(), "message");
    setText("");
  }

  async function handleSendRequest() {
    setReqStatus("loading");
    const res = await sendFriendRequest(uid, profile, targetUid.trim());
    setReqStatus(res?.error ? `error:${res.error}` : "sent");
    if (!res?.error) setTargetUid("");
  }

  const tabs = [
    ["feed",    "🌍 Global"],
    ["friends", "👥 Friends" + (pending.length ? ` (${pending.length})` : "")],
    ["invites", "📨 Invites" + (pendingInvites.length ? ` (${pendingInvites.length})` : "")],
  ];

  return (
    <div className="fadeUp">
      <div style={{ display:"flex", justifyContent:"space-between", alignItems:"center", marginBottom:14 }}>
        <h2 style={{ fontFamily:"'Syne',sans-serif", fontWeight:800, fontSize:22 }}>Social 🌍</h2>
        {onlineMembers.length > 0 && (
          <div style={{ fontSize:11, color:"#55EFC4", fontWeight:600 }}>
            {onlineMembers.length} online now
          </div>
        )}
      </div>

      {/* Tabs */}
      <div style={{ display:"flex", gap:6, marginBottom:16, overflowX:"auto", paddingBottom:2 }}>
        {tabs.map(([k, l]) => {
          const hasBadge = (k === "invites" && pendingInvites.length > 0) || (k === "friends" && pending.length > 0);
          return (
            <button key={k} onClick={() => setTab(k)} style={{
              padding:"7px 16px", borderRadius:20, fontSize:12, fontWeight:700, whiteSpace:"nowrap",
              background: tab===k ? "#6C63FF" : hasBadge ? "rgba(253,203,110,0.15)" : "rgba(255,255,255,0.06)",
              border: tab===k ? "none" : hasBadge ? "1px solid rgba(253,203,110,0.4)" : "1px solid rgba(255,255,255,0.08)",
              color: tab===k ? "#fff" : hasBadge ? "#FDCB6E" : "rgba(255,255,255,0.45)",
              cursor:"pointer", transition:"all 0.15s"
            }}>{l}</button>
          );
        })}
      </div>

      {/* Pending invites banner — shown on feed tab */}
      {tab === "feed" && pendingInvites.length > 0 && (
        <button onClick={() => setTab("invites")} style={{
          width:"100%", background:"rgba(253,203,110,0.1)", border:"1px solid rgba(253,203,110,0.3)",
          borderRadius:12, padding:"10px 14px", marginBottom:12, cursor:"pointer",
          display:"flex", alignItems:"center", gap:10, fontFamily:"inherit", textAlign:"left"
        }}>
          <span style={{ fontSize:20 }}>📨</span>
          <div>
            <div style={{ fontSize:13, fontWeight:700, color:"#FDCB6E" }}>
              {pendingInvites.length} task invite{pendingInvites.length > 1 ? "s" : ""} waiting
            </div>
            <div style={{ fontSize:11, color:"rgba(255,255,255,0.4)" }}>Tap to view and accept</div>
          </div>
          <span style={{ marginLeft:"auto", color:"rgba(255,255,255,0.3)", fontSize:14 }}>›</span>
        </button>
      )}

      {/* Pending friend requests banner — shown on feed tab */}
      {tab === "feed" && pending.length > 0 && (
        <button onClick={() => setTab("friends")} style={{
          width:"100%", background:"rgba(116,185,255,0.08)", border:"1px solid rgba(116,185,255,0.25)",
          borderRadius:12, padding:"10px 14px", marginBottom:12, cursor:"pointer",
          display:"flex", alignItems:"center", gap:10, fontFamily:"inherit", textAlign:"left"
        }}>
          <span style={{ fontSize:20 }}>👥</span>
          <div>
            <div style={{ fontSize:13, fontWeight:700, color:"#74B9FF" }}>
              {pending.length} friend request{pending.length > 1 ? "s" : ""} pending
            </div>
            <div style={{ fontSize:11, color:"rgba(255,255,255,0.4)" }}>Tap to accept</div>
          </div>
          <span style={{ marginLeft:"auto", color:"rgba(255,255,255,0.3)", fontSize:14 }}>›</span>
        </button>
      )}

      {/* ── GLOBAL FEED TAB ── */}
      {tab === "feed" && (
        <>
          {/* Who's online row */}
          {onlineMembers.length > 0 && (
            <div style={{ marginBottom:16 }}>
              <div style={{ fontSize:11, fontWeight:700, color:"rgba(255,255,255,0.35)", letterSpacing:"0.07em", marginBottom:10 }}>
                ONLINE NOW
              </div>
              <div style={{ display:"flex", gap:12, overflowX:"auto", paddingBottom:4 }}>
                {onlineMembers.map(m => {
                  const isYou = m.uid === uid;
                  return (
                    <button key={m.uid} onClick={() => !isYou && onViewProfile(m.uid)}
                      style={{ background:"none", border:"none", cursor:isYou?"default":"pointer", padding:0, flexShrink:0, textAlign:"center" }}>
                      <div style={{ position:"relative", width:48, height:48, margin:"0 auto 4px" }}>
                        <div style={{
                          width:48, height:48, borderRadius:"50%",
                          background:"linear-gradient(135deg,#6C63FF,#A29BFE)",
                          display:"flex", alignItems:"center", justifyContent:"center",
                          fontSize:26, border:`2px solid ${isYou ? "#FDCB6E" : "#55EFC4"}`
                        }}>{m.avatar}</div>
                        {/* Green online dot */}
                        <div style={{
                          position:"absolute", bottom:1, right:1,
                          width:12, height:12, borderRadius:"50%",
                          background:"#55EFC4", border:"2px solid #0B0D17"
                        }} />
                      </div>
                      <div style={{ fontSize:10, color: isYou ? "#FDCB6E" : "rgba(255,255,255,0.6)", maxWidth:52, overflow:"hidden", textOverflow:"ellipsis", whiteSpace:"nowrap" }}>
                        {isYou ? "You" : m.name?.split(" ")[0]}
                      </div>
                    </button>
                  );
                })}
              </div>
            </div>
          )}

          {/* Post box */}
          <Card style={{ marginBottom:12, background:"rgba(108,99,255,0.08)", border:"1px solid rgba(108,99,255,0.2)" }}>
            <div style={{ display:"flex", gap:8, alignItems:"center" }}>
              <div style={{ fontSize:28, flexShrink:0 }}>{profile.avatar}</div>
              <Input value={text} onChange={setText} placeholder="Share with everyone… 🎉"
                onKeyDown={e => e.key === "Enter" && post()}
                style={{ flex:1, background:"rgba(255,255,255,0.04)", fontSize:13 }} />
              <Btn color="#6C63FF" onClick={post} style={{ flexShrink:0 }}>Post</Btn>
            </div>
          </Card>

          {/* Feed */}
          {feed.length === 0 && (
            <div style={{ textAlign:"center", padding:"48px 0", color:"rgba(255,255,255,0.2)" }}>
              <div style={{ fontSize:40, marginBottom:8 }}>🌍</div>
              <div style={{ fontSize:14 }}>Nothing yet — complete a task to be the first!</div>
            </div>
          )}
          {feed.map(p => (
            <FeedCard key={p.id} post={p} uid={uid} profile={profile}
              onLike={() => onLike(p.id, !p.likes?.includes(uid))}
              onComment={(c) => onComment(roomId, p.id, c)}
              onViewProfile={() => onViewProfile(p.userId)}
              onDelete={p.userId === uid ? () => onDeletePost(p.id) : null}
              addTask={addTask} addHabit={addHabit}
            />
          ))}
        </>
      )}

      {/* ── FRIENDS TAB ── */}
      {tab === "friends" && (
        <>
          {/* Add friend input */}
          <Card style={{ marginBottom:14 }}>
            <div style={{ fontSize:12, fontWeight:600, marginBottom:8, color:"rgba(255,255,255,0.4)", letterSpacing:"0.05em" }}>ADD FRIEND BY USER ID</div>
            <div style={{ display:"flex", gap:8 }}>
              <Input value={targetUid} onChange={setTargetUid} placeholder="Paste their User ID…"
                onKeyDown={e => e.key==="Enter" && handleSendRequest()}
                style={{ flex:1, fontSize:12 }} />
              <Btn small color="#6C63FF" onClick={handleSendRequest} disabled={reqStatus==="loading"}>
                {reqStatus==="loading" ? "…" : "Add"}
              </Btn>
            </div>
            {reqStatus?.startsWith("error:") && <div style={{ fontSize:11, color:"#FF6B6B", marginTop:6 }}>{reqStatus.replace("error:","")}</div>}
            {reqStatus==="sent" && <div style={{ fontSize:11, color:"#55EFC4", marginTop:6 }}>Request sent! ✓</div>}
          </Card>

          {/* Outgoing pending — requests YOU sent waiting on them */}
          {(friends||[]).filter(f => f.status==="pending" && f.direction==="outgoing").length > 0 && (
            <div style={{ marginBottom:14 }}>
              <div style={{ fontSize:11, fontWeight:700, color:"rgba(255,255,255,0.4)", marginBottom:8, letterSpacing:"0.05em" }}>SENT — WAITING FOR REPLY</div>
              {(friends||[]).filter(f => f.status==="pending" && f.direction==="outgoing").map(f => (
                <Card key={f.uid} style={{ marginBottom:8, background:"rgba(255,255,255,0.03)", border:"1px solid rgba(255,255,255,0.07)" }}>
                  <div style={{ display:"flex", alignItems:"center", gap:10 }}>
                    <div style={{ width:38, height:38, borderRadius:"50%", background:"linear-gradient(135deg,#6C63FF,#A29BFE)", display:"flex", alignItems:"center", justifyContent:"center", fontSize:22 }}>{f.avatar}</div>
                    <div style={{ flex:1 }}>
                      <div style={{ fontWeight:600, fontSize:14 }}>{f.name}</div>
                      <div style={{ fontSize:11, color:"rgba(255,255,255,0.3)" }}>⏳ Pending their acceptance</div>
                    </div>
                    <Btn small ghost color="#FF6B6B" onClick={() => removeFriend(uid, f.uid)}>Cancel</Btn>
                  </div>
                </Card>
              ))}
            </div>
          )}

          {/* Incoming pending — requests THEY sent to you */}
          {pending.length > 0 && (
            <div style={{ marginBottom:14 }}>
              <div style={{ fontSize:11, fontWeight:700, color:"#FDCB6E", marginBottom:8, letterSpacing:"0.05em" }}>FRIEND REQUESTS</div>
              {pending.map(f => (
                <Card key={f.uid} style={{ marginBottom:8, background:"rgba(253,203,110,0.05)", border:"1px solid rgba(253,203,110,0.15)" }}>
                  <div style={{ display:"flex", alignItems:"center", gap:10 }}>
                    <div style={{ width:38, height:38, borderRadius:"50%", background:"linear-gradient(135deg,#FDCB6E,#E17055)", display:"flex", alignItems:"center", justifyContent:"center", fontSize:22 }}>{f.avatar}</div>
                    <div style={{ flex:1 }}>
                      <div style={{ fontWeight:600, fontSize:14 }}>{f.name}</div>
                      <div style={{ fontSize:11, color:"rgba(255,255,255,0.35)" }}>wants to be friends 👋</div>
                    </div>
                    <div style={{ display:"flex", gap:6 }}>
                      <Btn small color="#55EFC4" style={{ color:"#0B0D17" }} onClick={() => acceptFriend(uid, f.uid)}>Accept</Btn>
                      <Btn small ghost color="#FF6B6B" onClick={() => removeFriend(uid, f.uid)}>✕</Btn>
                    </div>
                  </div>
                </Card>
              ))}
            </div>
          )}

          {/* Empty state */}
          {accepted.length === 0 && pending.length === 0 && (friends||[]).filter(f=>f.direction==="outgoing").length === 0 && (
            <div style={{ textAlign:"center", padding:"48px 0", color:"rgba(255,255,255,0.2)" }}>
              <div style={{ fontSize:40, marginBottom:8 }}>👥</div>
              <div>No friends yet</div>
              <div style={{ fontSize:12, marginTop:6 }}>Go to 🌍 Global, tap someone's avatar to add them!</div>
            </div>
          )}

          {/* Accepted friends — rich progress cards */}
          {accepted.length > 0 && (
            <div>
              <div style={{ fontSize:11, fontWeight:700, color:"rgba(255,255,255,0.4)", marginBottom:10, letterSpacing:"0.05em" }}>
                FRIENDS ({accepted.length})
              </div>
              {accepted.map(f => (
                <FriendCard key={f.uid} friend={f} uid={uid} profile={profile}
                  onRemove={() => removeFriend(uid, f.uid)}
                  onViewProfile={() => onViewProfile(f.uid)}
                  onGift={(amount) => giftGold(profile, f.uid, amount, updateProfile)}
                />
              ))}
            </div>
          )}
        </>
      )}

      {/* ── INVITES TAB ── */}
      {tab === "invites" && (
        <TaskInvitesTab invites={taskInvites || []} onAccept={onAcceptInvite} onDecline={onDeclineInvite} />
      )}
    </div>
  );
}


function FriendCard({ friend: f, uid, profile, onRemove, onViewProfile, onGift }) {
  const [showGift,     setShowGift]     = useState(false);
  const [giftAmt,      setGiftAmt]      = useState(10);
  const [giftStatus,   setGiftStatus]   = useState(null);
  const [expanded,     setExpanded]     = useState(false);
  const [tasks,        setTasks]        = useState([]);
  const [friendData,   setFriendData]   = useState(null);
  const [tasksLoading, setTasksLoading] = useState(false);
  const [tasksError,   setTasksError]   = useState(null);

  // Load friend's full profile + public tasks when expanded
  useEffect(() => {
    if (!expanded) return;
    setTasksLoading(true);
    setTasksError(null);
    Promise.all([
      import("firebase/firestore"),
      import("../firebase/config")
    ]).then(([{ collection, query, where, limit, onSnapshot, getDoc, doc }, { db }]) => {
      // Load profile for XP/streak/level
      getDoc(doc(db, "users", f.uid)).then(snap => {
        if (snap.exists()) setFriendData(snap.data());
      }).catch(() => {});

      // Live public tasks
      const unsub = onSnapshot(
        query(collection(db, "users", f.uid, "tasks"), where("isPublic", "==", true), limit(20)),
        snap => {
          const list = snap.docs.map(d => ({ id: d.id, ...d.data() }));
          list.sort((a, b) => (b.createdAt?.seconds||0) - (a.createdAt?.seconds||0));
          setTasks(list);
          setTasksLoading(false);
        },
        err => {
          setTasksError("Could not load — check Firestore rules");
          setTasksLoading(false);
        }
      );
      return unsub;
    }).then(unsub => { if (typeof unsub === "function") return unsub; });
  }, [expanded, f.uid]);

  async function sendGift() {
    const res = await onGift(giftAmt);
    setGiftStatus(res?.error ? `error:${res.error}` : "sent");
  }

  const activeTasks = tasks.filter(t => !t.done);
  const doneTasks   = tasks.filter(t => t.done);
  const level       = friendData ? getLevel(friendData.xp || 0) : null;
  const xpPct       = friendData ? xpProgress(friendData.xp || 0) : 0;
  const streak      = friendData?.streak || f.streak || 0;

  return (
    <Card style={{ marginBottom:10, border: expanded ? "1px solid rgba(108,99,255,0.3)" : undefined }}>
      {/* Header row */}
      <div style={{ display:"flex", alignItems:"center", gap:10 }}>
        <button onClick={onViewProfile} style={{ background:"none", border:"none", cursor:"pointer", padding:0, flexShrink:0 }}>
          <div style={{ width:44, height:44, borderRadius:"50%", background:"linear-gradient(135deg,#6C63FF,#A29BFE)", display:"flex", alignItems:"center", justifyContent:"center", fontSize:24, border:"2px solid rgba(108,99,255,0.4)" }}>{f.avatar}</div>
        </button>
        <div style={{ flex:1, minWidth:0 }}>
          <div style={{ display:"flex", alignItems:"center", gap:6 }}>
            <span style={{ fontWeight:700, fontSize:14, cursor:"pointer" }} onClick={onViewProfile}>{f.name}</span>
            {streak > 0 && <span style={{ fontSize:11, color:"#FF6B6B", fontWeight:700 }}>🔥{streak}</span>}
          </div>
          {level && (
            <div style={{ fontSize:11, color:"rgba(255,255,255,0.35)" }}>
              Lv.{level} · {friendData?.xp||0} XP
            </div>
          )}
        </div>
        <button onClick={() => setExpanded(v=>!v)} style={{
          background: expanded ? "rgba(108,99,255,0.2)" : "rgba(255,255,255,0.05)",
          border: "1px solid rgba(255,255,255,0.08)", borderRadius:10,
          color:"rgba(255,255,255,0.6)", fontSize:12, fontWeight:600,
          cursor:"pointer", padding:"5px 10px", fontFamily:"inherit", flexShrink:0
        }}>
          {expanded ? "▲ Hide" : "👀 Check Up"}
        </button>
      </div>

      {/* Expanded progress view */}
      {expanded && (
        <div style={{ marginTop:14, paddingTop:14, borderTop:"1px solid rgba(255,255,255,0.06)" }}>

          {/* XP progress bar */}
          {friendData && (
            <div style={{ marginBottom:14 }}>
              <div style={{ display:"flex", justifyContent:"space-between", fontSize:11, color:"rgba(255,255,255,0.4)", marginBottom:4 }}>
                <span>Level {level} progress</span>
                <span>{xpPct}%</span>
              </div>
              <div style={{ height:6, background:"rgba(255,255,255,0.06)", borderRadius:3, overflow:"hidden" }}>
                <div style={{ height:"100%", width:`${xpPct}%`, background:"linear-gradient(90deg,#6C63FF,#A29BFE)", borderRadius:3, transition:"width 0.5s" }} />
              </div>
              <div style={{ display:"flex", gap:14, marginTop:8 }}>
                <div style={{ textAlign:"center" }}>
                  <div style={{ fontSize:16, fontWeight:800, color:"#FDCB6E" }}>{friendData.xp||0}</div>
                  <div style={{ fontSize:10, color:"rgba(255,255,255,0.3)" }}>XP</div>
                </div>
                <div style={{ textAlign:"center" }}>
                  <div style={{ fontSize:16, fontWeight:800, color:"#FF6B6B" }}>🔥{streak}</div>
                  <div style={{ fontSize:10, color:"rgba(255,255,255,0.3)" }}>Streak</div>
                </div>
                <div style={{ textAlign:"center" }}>
                  <div style={{ fontSize:16, fontWeight:800, color:"#55EFC4" }}>{doneTasks.length}</div>
                  <div style={{ fontSize:10, color:"rgba(255,255,255,0.3)" }}>Done</div>
                </div>
                <div style={{ textAlign:"center" }}>
                  <div style={{ fontSize:16, fontWeight:800, color:"#74B9FF" }}>{activeTasks.length}</div>
                  <div style={{ fontSize:10, color:"rgba(255,255,255,0.3)" }}>Active</div>
                </div>
              </div>
            </div>
          )}

          {/* Active public tasks */}
          <div style={{ fontSize:11, fontWeight:700, color:"rgba(255,255,255,0.4)", marginBottom:8, letterSpacing:"0.05em" }}>
            ACTIVE TASKS
          </div>
          {tasksLoading && <div style={{ fontSize:12, color:"rgba(255,255,255,0.2)", padding:"8px 0" }}>Loading…</div>}
          {tasksError  && <div style={{ fontSize:11, color:"#FF6B6B" }}>{tasksError}</div>}
          {!tasksLoading && !tasksError && activeTasks.length === 0 && (
            <div style={{ fontSize:12, color:"rgba(255,255,255,0.2)", padding:"8px 0" }}>No active public tasks</div>
          )}
          {activeTasks.map(t => {
            const subtasks  = t.subtasks || [];
            const subDone   = subtasks.filter(s=>s.done).length;
            const subPct    = subtasks.length ? Math.round(subDone/subtasks.length*100) : 0;
            const priorityColor = { high:"#FF6B6B", medium:"#FDCB6E", low:"#55EFC4" }[t.priority] || "#6C63FF";
            return (
              <div key={t.id} style={{ marginBottom:10, background:"rgba(255,255,255,0.03)", borderRadius:10, padding:"10px 12px", borderLeft:`3px solid ${priorityColor}` }}>
                <div style={{ display:"flex", justifyContent:"space-between", alignItems:"flex-start", gap:8 }}>
                  <div style={{ flex:1, minWidth:0 }}>
                    <div style={{ fontSize:13, fontWeight:600, color:"#E8E9F3", marginBottom:2 }}>{t.title}</div>
                    {t.desc && <div style={{ fontSize:11, color:"rgba(255,255,255,0.3)", marginBottom:4 }}>{t.desc}</div>}
                    {subtasks.length > 0 && (
                      <div style={{ marginTop:6 }}>
                        <div style={{ display:"flex", justifyContent:"space-between", fontSize:10, color:"rgba(255,255,255,0.3)", marginBottom:3 }}>
                          <span>{subDone}/{subtasks.length} subtasks</span>
                          <span>{subPct}%</span>
                        </div>
                        <div style={{ height:4, background:"rgba(255,255,255,0.06)", borderRadius:2, overflow:"hidden" }}>
                          <div style={{ height:"100%", width:`${subPct}%`, background:"linear-gradient(90deg,#6C63FF,#55EFC4)", borderRadius:2 }} />
                        </div>
                      </div>
                    )}
                  </div>
                  <div style={{ display:"flex", flexDirection:"column", alignItems:"flex-end", gap:2, flexShrink:0 }}>
                    <span style={{ fontSize:10, color:"#FDCB6E", fontWeight:700 }}>+{t.xp||20}XP</span>
                    {t.dueTime && <span style={{ fontSize:10, color:"#74B9FF" }}>⏰{t.dueTime}</span>}
                  </div>
                </div>
              </div>
            );
          })}

          {/* Recently completed */}
          {doneTasks.length > 0 && (
            <>
              <div style={{ fontSize:11, fontWeight:700, color:"rgba(255,255,255,0.4)", marginBottom:8, marginTop:4, letterSpacing:"0.05em" }}>
                RECENTLY COMPLETED
              </div>
              {doneTasks.slice(0,3).map(t => (
                <div key={t.id} style={{ display:"flex", alignItems:"center", gap:8, padding:"6px 0", borderBottom:"1px solid rgba(255,255,255,0.04)" }}>
                  <div style={{ width:16, height:16, borderRadius:4, background:"#55EFC4", display:"flex", alignItems:"center", justifyContent:"center", flexShrink:0 }}>
                    <span style={{ color:"#0B0D17", fontSize:10, fontWeight:900 }}>✓</span>
                  </div>
                  <span style={{ fontSize:12, flex:1, textDecoration:"line-through", color:"rgba(255,255,255,0.35)" }}>{t.title}</span>
                  <span style={{ fontSize:10, color:"#55EFC4" }}>+{t.xp||20}XP</span>
                </div>
              ))}
            </>
          )}

          {/* Gift + actions */}
          <div style={{ display:"flex", gap:6, marginTop:12, flexWrap:"wrap" }}>
            <Btn small ghost color="#FDCB6E" onClick={() => setShowGift(v=>!v)}>🪙 Gift Gold</Btn>
            <Btn small ghost color="#FF6B6B" onClick={onRemove}>Remove Friend</Btn>
          </div>

          {showGift && (
            <div style={{ marginTop:10, display:"flex", gap:8, alignItems:"center" }}>
              <select value={giftAmt} onChange={e => setGiftAmt(Number(e.target.value))} style={{ background:"rgba(255,255,255,0.06)", border:"1px solid rgba(255,255,255,0.1)", borderRadius:8, padding:"6px 8px", color:"#E8E9F3", fontSize:12, fontFamily:"inherit" }}>
                {[5,10,25,50,100].map(a => <option key={a} value={a}>{a}🪙</option>)}
              </select>
              <Btn small color="#FDCB6E" style={{ color:"#0B0D17" }} onClick={sendGift}>Send</Btn>
              {giftStatus==="sent" && <span style={{ fontSize:11, color:"#55EFC4" }}>Sent! 🎁</span>}
              {giftStatus?.startsWith("error:") && <span style={{ fontSize:11, color:"#FF6B6B" }}>{giftStatus.replace("error:","")}</span>}
            </div>
          )}
        </div>
      )}
    </Card>
  );
}
function TaskInvitesTab({ invites, onAccept, onDecline }) {
  if (invites.length === 0) return (
    <div style={{ textAlign:"center", padding:"36px 0", color:"rgba(255,255,255,0.2)" }}>
      <div style={{ fontSize:40, marginBottom:8 }}>📨</div>
      <div>No task invites yet</div>
      <div style={{ fontSize:12, marginTop:6 }}>Friends can invite you to tasks from their Tasks page</div>
    </div>
  );
  return (
    <>
      {invites.map(inv => (
        <Card key={inv.id} style={{ marginBottom:10, borderLeft:`3px solid ${inv.status==="accepted"?"#55EFC4":"#FDCB6E"}` }}>
          <div style={{ fontWeight:600, fontSize:14, marginBottom:4 }}>{inv.taskTitle}</div>
          <div style={{ fontSize:11, color:"rgba(255,255,255,0.4)", marginBottom:8 }}>
            From a friend · +{inv.taskXp||20}XP · +{inv.taskGold||10}🪙
          </div>
          {inv.status === "pending" ? (
            <div style={{ display:"flex", gap:8 }}>
              <Btn small color="#55EFC4" style={{ color:"#0B0D17" }} onClick={() => onAccept(inv.id)}>✓ Accept</Btn>
              <Btn small ghost color="#FF6B6B" onClick={() => onDecline(inv.id)}>Decline</Btn>
            </div>
          ) : (
            <div style={{ fontSize:12, color:"#55EFC4", fontWeight:600 }}>Accepted ✓</div>
          )}
        </Card>
      ))}
    </>
  );
}

function FeedCard({ post: p, uid, onLike, onComment, onViewProfile, onDelete }) {
  const [showComments, setShowComments] = useState(false);
  const [commentText,  setCommentText]  = useState("");
  const isOwn = p.userId === uid;

  // Per-type accent colors and icons (richer than the basic TYPE_ICONS)
  const typeStyle = {
    xp:      { bg:"rgba(253,203,110,0.07)", border:"rgba(253,203,110,0.15)", badge:"#FDCB6E",  label:"XP Earned"     },
    task:    { bg:"rgba(85,239,196,0.07)",  border:"rgba(85,239,196,0.15)",  badge:"#55EFC4",  label:"Task Done"     },
    habit:   { bg:"rgba(255,107,107,0.07)", border:"rgba(255,107,107,0.15)", badge:"#FF6B6B",  label:"Habit Streak"  },
    mood:    { bg:"rgba(162,155,254,0.07)", border:"rgba(162,155,254,0.15)", badge:"#A29BFE",  label:"Mood"          },
    join:    { bg:"rgba(116,185,255,0.07)", border:"rgba(116,185,255,0.15)", badge:"#74B9FF",  label:"Joined"        },
    message: { bg:"rgba(255,255,255,0.03)", border:"rgba(255,255,255,0.06)", badge:"#E8E9F3",  label:""              },
    gold:    { bg:"rgba(253,203,110,0.07)", border:"rgba(253,203,110,0.15)", badge:"#FDCB6E",  label:"Gold"          },
  };
  const ts = typeStyle[p.type] || typeStyle.message;
  const icon = TYPE_ICONS[p.type] || "💬";
  const timeStr = p.ts?.toDate
    ? p.ts.toDate().toLocaleTimeString([], { hour:"2-digit", minute:"2-digit" })
    : "";

  function submitComment() {
    if (!commentText.trim()) return;
    onComment({ uid, text: commentText.trim() });
    setCommentText("");
  }

  return (
    <div style={{
      padding:"12px 14px",
      background: ts.bg,
      border:`1px solid ${ts.border}`,
      borderRadius:14, marginBottom:10,
      transition:"opacity 0.2s"
    }}>
      <div style={{ display:"flex", gap:10 }}>
        {/* Avatar — tappable to view profile */}
        <button onClick={onViewProfile} style={{ background:"none", border:"none", padding:0, cursor:"pointer", flexShrink:0 }}>
          <div style={{
            width:40, height:40, borderRadius:"50%",
            background:"linear-gradient(135deg,#6C63FF,#A29BFE)",
            display:"flex", alignItems:"center", justifyContent:"center", fontSize:22,
            border:`2px solid ${ts.badge}33`
          }}>{p.userAvatar || "🌀"}</div>
        </button>

        <div style={{ flex:1, minWidth:0 }}>
          {/* Header row */}
          <div style={{ display:"flex", justifyContent:"space-between", alignItems:"center", gap:6, marginBottom:4 }}>
            <div style={{ display:"flex", alignItems:"center", gap:6, minWidth:0 }}>
              <span style={{ fontWeight:700, fontSize:13, cursor:"pointer", whiteSpace:"nowrap", overflow:"hidden", textOverflow:"ellipsis" }}
                onClick={onViewProfile}>{p.userName}</span>
              {ts.label && (
                <span style={{
                  fontSize:9, fontWeight:800, letterSpacing:"0.06em",
                  background:`${ts.badge}22`, color:ts.badge,
                  padding:"2px 6px", borderRadius:6, whiteSpace:"nowrap", flexShrink:0
                }}>{ts.label}</span>
              )}
            </div>
            <div style={{ display:"flex", gap:8, alignItems:"center", flexShrink:0 }}>
              <span style={{ fontSize:10, color:"rgba(255,255,255,0.2)" }}>{timeStr}</span>
              {isOwn && onDelete && (
                <button onClick={onDelete} style={{
                  background:"none", border:"none", color:"rgba(255,255,255,0.18)",
                  cursor:"pointer", fontSize:13, padding:0, lineHeight:1
                }} title="Delete post">✕</button>
              )}
            </div>
          </div>

          {/* Post body */}
          <div style={{ fontSize:13, color:"rgba(255,255,255,0.82)", lineHeight:1.5 }}>
            {icon} {p.text}
          </div>

          {/* Actions */}
          <div style={{ display:"flex", gap:14, marginTop:8, alignItems:"center" }}>
            <button onClick={onLike} style={{
              background:"none", border:"none", cursor:"pointer", fontSize:12, padding:0,
              color: p.likes?.includes(uid) ? "#FF6B6B" : "rgba(255,255,255,0.3)",
              fontFamily:"inherit", display:"flex", alignItems:"center", gap:4
            }}>
              ❤️ <span>{p.likes?.length || 0}</span>
            </button>
            <button onClick={() => setShowComments(v => !v)} style={{
              background:"none", border:"none", cursor:"pointer", fontSize:12, padding:0,
              color: showComments ? "#A29BFE" : "rgba(255,255,255,0.3)",
              fontFamily:"inherit", display:"flex", alignItems:"center", gap:4
            }}>
              💬 <span>{p.comments?.length || 0}</span>
            </button>
            {/* Add friend shortcut — only show for other people's posts */}
            {!isOwn && (
              <button onClick={onViewProfile} style={{
                background:"none", border:"none", cursor:"pointer", fontSize:11, padding:0,
                color:"rgba(108,99,255,0.6)", fontFamily:"inherit"
              }}>+ Add</button>
            )}
          </div>
        </div>
      </div>

      {/* Comments */}
      {showComments && (
        <div style={{ marginTop:10, paddingLeft:50 }}>
          {(p.comments || []).map((c, i) => (
            <div key={i} style={{ background:"rgba(255,255,255,0.05)", borderRadius:8, padding:"5px 10px", marginBottom:6, fontSize:12 }}>
              {c.text}
            </div>
          ))}
          <div style={{ display:"flex", gap:6 }}>
            <Input value={commentText} onChange={setCommentText}
              onKeyDown={e => e.key==="Enter" && submitComment()}
              placeholder="Comment…" style={{ flex:1, fontSize:12, padding:"6px 10px" }} />
            <Btn small color="#6C63FF" onClick={submitComment}>↑</Btn>
          </div>
        </div>
      )}
    </div>
  );
}


/* ═════════════════════════════ PROFILE PAGE ═══════════════════════════════ */
export function ProfilePage({ profile, updateProfile, tasks, habits, moodLog, onLogout, uid, rewards, addReward, redeemReward, deleteReward }) {
  const lvl     = getLevel(profile.xp || 0);
  const prog    = xpProgress(profile.xp || 0);
  const unlocks = getLevelUnlocks(lvl);
  const [tab,       setTab]       = useState("stats");
  const [editMode,  setEditMode]  = useState(false);
  const [editName,  setEditName]  = useState(profile.name || "");
  const [editAvatar,setEditAvatar]= useState(profile.avatar || "🦊");
  const [copied,    setCopied]    = useState(false);
  const unlockedAvatars = getUnlockedAvatars(lvl);

  // Reward form
  const [rewardForm, setRewardForm] = useState({ name:"", description:"", goldCost:50 });
  const [showRewardForm, setShowRewardForm] = useState(false);
  const [aiPricing, setAiPricing] = useState(null);
  const [aiPricingLoading, setAiPricingLoading] = useState(false);

  async function saveProfile() {
    if (!editName.trim()) return;
    await updateProfile({ name: editName.trim(), avatar: editAvatar });
    setEditMode(false);
  }

  async function getAiPrice() {
    if (!rewardForm.name.trim()) return;
    setAiPricingLoading(true);
    try {
      const res = await fetch("https://api.anthropic.com/v1/messages", {
        method:"POST", headers:{"Content-Type":"application/json"},
        body: JSON.stringify({
          model:"claude-sonnet-4-20250514", max_tokens:150,
          messages:[{ role:"user", content:`You are pricing personal rewards in a productivity app where gold is earned through completing real tasks. Suggest a fair gold cost for this personal reward: "${rewardForm.name}". ${rewardForm.description ? `Description: ${rewardForm.description}` : ""}. Consider real-world value, treat 100 gold as roughly equivalent to completing ~5 medium tasks. Reply ONLY with JSON: {"goldCost": 50, "reason": "brief reason"}` }]
        })
      });
      const data = await res.json();
      const text = data.content?.[0]?.text || "{}";
      const result = JSON.parse(text.replace(/```json|```/g,"").trim());
      setAiPricing(result);
      setRewardForm(f => ({ ...f, goldCost: result.goldCost }));
    } catch {}
    setAiPricingLoading(false);
  }

  async function handleAddReward() {
    if (!rewardForm.name.trim()) return;
    await addReward(uid, { ...rewardForm });
    setRewardForm({ name:"", description:"", goldCost:50 });
    setAiPricing(null);
    setShowRewardForm(false);
  }

  const done = tasks.filter(t => t.done).length;
  const bestStreak = habits.reduce((a,h) => Math.max(a, h.streak||0), 0);

  return (
    <div className="fadeUp">
      {/* Profile card */}
      <Card style={{ marginBottom:16, textAlign:"center", background:"linear-gradient(135deg,rgba(108,99,255,0.1),rgba(253,203,110,0.05))" }}>
        {editMode ? (
          <>
            <div style={{ fontSize:56, marginBottom:12 }}>{editAvatar}</div>
            <input value={editName} onChange={e => setEditName(e.target.value)} style={{ background:"rgba(255,255,255,0.08)", border:"1px solid rgba(255,255,255,0.15)", borderRadius:10, padding:"8px 14px", color:"#E8E9F3", fontSize:16, fontWeight:700, width:"100%", textAlign:"center", fontFamily:"inherit", marginBottom:14, outline:"none" }} placeholder="Your name" />
            <div style={{ fontSize:11, color:"rgba(255,255,255,0.4)", marginBottom:8, textAlign:"left" }}>PICK AVATAR {lvl < 3 && <span style={{ color:"#FDCB6E" }}>(more unlock at higher levels)</span>}</div>
            <div style={{ display:"flex", flexWrap:"wrap", gap:6, justifyContent:"center", marginBottom:14 }}>
              {unlockedAvatars.map(av => (
                <button key={av} onClick={() => setEditAvatar(av)} style={{ width:38, height:38, borderRadius:10, fontSize:22, cursor:"pointer", border:"none", background:editAvatar===av?"rgba(108,99,255,0.35)":"rgba(255,255,255,0.05)", outline:editAvatar===av?"2px solid #6C63FF":"none" }}>{av}</button>
              ))}
            </div>
            <div style={{ display:"flex", gap:8, justifyContent:"center" }}>
              <Btn color="#6C63FF" onClick={saveProfile}>Save Changes</Btn>
              <Btn ghost color="rgba(255,255,255,0.3)" style={{ color:"rgba(255,255,255,0.5)" }} onClick={() => { setEditMode(false); setEditName(profile.name); setEditAvatar(profile.avatar); }}>Cancel</Btn>
            </div>
          </>
        ) : (
          <>
            {profile.photoURL
              ? <img src={profile.photoURL} alt="" style={{ width:72, height:72, borderRadius:"50%", margin:"0 auto 8px", display:"block", border:"3px solid rgba(108,99,255,0.4)" }} />
              : <div style={{ width:72, height:72, borderRadius:"50%", background:"linear-gradient(135deg,#6C63FF,#A29BFE)", display:"flex", alignItems:"center", justifyContent:"center", fontSize:40, margin:"0 auto 8px", border:"3px solid rgba(108,99,255,0.4)" }}>{profile.avatar}</div>
            }
            <div style={{ fontFamily:"'Syne',sans-serif", fontWeight:800, fontSize:22, marginBottom:2 }}>{profile.name}</div>
            <div style={{ fontSize:11, color:"rgba(255,255,255,0.35)", marginBottom:6 }}>Level {lvl} · {LEVEL_NAMES[lvl-1]}</div>
            <div style={{ display:"flex", justifyContent:"center", gap:12, marginBottom:10, fontSize:13 }}>
              <span style={{ color:"#FDCB6E", fontWeight:700 }}>{profile.xp||0} XP</span>
              <span style={{ color:"#FDCB6E", fontWeight:700 }}>🪙 {profile.gold||0}</span>
              <span style={{ color:streakColor(lvl), fontWeight:700 }}>🔥 {profile.streak||0}</span>
            </div>
            {/* XP bar */}
            <div style={{ height:6, background:"rgba(255,255,255,0.08)", borderRadius:3, marginBottom:8, overflow:"hidden" }}>
              <div style={{ height:"100%", width:`${prog.pct}%`, background:"linear-gradient(90deg,#6C63FF,#FDCB6E)", borderRadius:3, transition:"width 0.6s" }} />
            </div>
            <div style={{ fontSize:10, color:"rgba(255,255,255,0.3)", marginBottom:10 }}>{prog.earned}/{prog.needed} XP to next level</div>
            <div style={{ display:"flex", gap:8, justifyContent:"center", marginBottom:10 }}>
              <button onClick={() => setEditMode(true)} style={{ background:"rgba(108,99,255,0.15)", border:"1px solid rgba(108,99,255,0.3)", borderRadius:8, padding:"5px 14px", color:"#A29BFE", fontSize:12, cursor:"pointer", fontFamily:"inherit" }}>✏️ Edit Profile</button>
              <button onClick={() => { navigator.clipboard?.writeText(uid).then(() => { setCopied(true); setTimeout(() => setCopied(false), 2000); }); }} style={{ background:"rgba(255,255,255,0.06)", border:"1px solid rgba(255,255,255,0.1)", borderRadius:8, padding:"5px 14px", color:"rgba(255,255,255,0.5)", fontSize:12, cursor:"pointer", fontFamily:"inherit" }}>{copied ? "Copied! ✓" : "Copy ID"}</button>
            </div>
          </>
        )}

        {/* Level unlocks */}
        {!editMode && (
          <div style={{ borderTop:"1px solid rgba(255,255,255,0.06)", paddingTop:10, display:"flex", gap:12, justifyContent:"center", flexWrap:"wrap" }}>
            {unlocks.streakShields > 0 && <div style={{ fontSize:11, color:"rgba(255,255,255,0.5)" }}>🛡️ {unlocks.streakShields} shield{unlocks.streakShields>1?"s":""}/week</div>}
            {unlocks.canCreateSquad && <div style={{ fontSize:11, color:"rgba(255,255,255,0.5)" }}>🚀 Can create squads (max {unlocks.maxSquads})</div>}
            {!unlocks.canCreateSquad && <div style={{ fontSize:11, color:"rgba(255,255,255,0.3)" }}>🚀 Squad creation unlocks at Level 5</div>}
            {!unlocks.streakShields && <div style={{ fontSize:11, color:"rgba(255,255,255,0.3)" }}>🛡️ Streak shields unlock at Level 3</div>}
          </div>
        )}
      </Card>

      {/* Tabs */}
      <div style={{ display:"flex", gap:6, marginBottom:16, overflowX:"auto" }}>
        {[["stats","📊 Stats"],["rewards","🎁 Rewards"],["shop","🛒 Shop"]].map(([k,l]) => (
          <button key={k} onClick={() => setTab(k)} style={{
            padding:"7px 14px", borderRadius:10, fontSize:12, fontWeight:600, whiteSpace:"nowrap",
            background:tab===k?"#6C63FF":"rgba(255,255,255,0.06)",
            border:"none", color:tab===k?"#fff":"rgba(255,255,255,0.4)", cursor:"pointer"
          }}>{l}</button>
        ))}
      </div>

      {tab === "stats" && (
        <div style={{ display:"grid", gridTemplateColumns:"1fr 1fr", gap:10 }}>
          {[
            { label:"Tasks Done",    val:done,            icon:"✅", color:"#55EFC4" },
            { label:"Best Streak",   val:`${bestStreak}🔥`,icon:"🔥", color:streakColor(lvl) },
            { label:"Habits Logged", val:habits.reduce((a,h)=>a+(h.log?.length||0),0), icon:"⚡", color:"#6C63FF" },
            { label:"Gold Earned",   val:`${profile.gold||0}🪙`, icon:"🪙", color:"#FDCB6E" },
          ].map(s => (
            <Card key={s.label} style={{ textAlign:"center", padding:14 }}>
              <div style={{ fontSize:24, marginBottom:4 }}>{s.icon}</div>
              <div style={{ fontFamily:"'Syne',sans-serif", fontWeight:800, fontSize:20, color:s.color }}>{s.val}</div>
              <div style={{ fontSize:11, color:"rgba(255,255,255,0.35)" }}>{s.label}</div>
            </Card>
          ))}
        </div>
      )}

      {tab === "rewards" && (
        <RewardsTab uid={uid} profile={profile} rewards={rewards||[]} addReward={addReward} redeemReward={redeemReward} deleteReward={deleteReward}
          showRewardForm={showRewardForm} setShowRewardForm={setShowRewardForm}
          rewardForm={rewardForm} setRewardForm={setRewardForm}
          aiPricing={aiPricing} aiPricingLoading={aiPricingLoading}
          getAiPrice={getAiPrice} handleAddReward={handleAddReward} />
      )}

      {tab === "shop" && <ShopTab profile={profile} updateProfile={updateProfile} lvl={lvl} />}

      <button onClick={onLogout} style={{ marginTop:20, width:"100%", background:"rgba(255,107,107,0.1)", border:"1px solid rgba(255,107,107,0.2)", color:"#FF6B6B", borderRadius:10, padding:"10px 0", fontSize:14, fontWeight:600, cursor:"pointer", fontFamily:"inherit" }}>Sign Out</button>
    </div>
  );
}

/* ─── Rewards Tab ─────────────────────────────────────────────────────────── */
function RewardsTab({ uid, profile, rewards, addReward, redeemReward, deleteReward, showRewardForm, setShowRewardForm, rewardForm, setRewardForm, aiPricing, aiPricingLoading, getAiPrice, handleAddReward }) {
  const active   = rewards.filter(r => !r.redeemed);
  const redeemed = rewards.filter(r => r.redeemed);

  return (
    <>
      <div style={{ display:"flex", justifyContent:"space-between", alignItems:"center", marginBottom:12 }}>
        <div style={{ fontSize:13, color:"rgba(255,255,255,0.4)" }}>🪙 {profile.gold||0} gold available</div>
        <Btn small color="#FDCB6E" style={{ color:"#0B0D17" }} onClick={() => setShowRewardForm(v=>!v)}>{showRewardForm?"✕":"+ New Reward"}</Btn>
      </div>

      {showRewardForm && (
        <Card style={{ marginBottom:14 }}>
          <div style={{ fontSize:13, fontWeight:600, marginBottom:10 }}>Create Personal Reward 🎁</div>
          <Input value={rewardForm.name} onChange={v => setRewardForm(f=>({...f,name:v}))} placeholder="e.g. Get boba 🧋, Buy new shoes 👟" style={{ marginBottom:8 }} />
          <Input value={rewardForm.description} onChange={v => setRewardForm(f=>({...f,description:v}))} placeholder="Optional description" style={{ marginBottom:8 }} multiline />
          {aiPricing && (
            <div style={{ background:"rgba(253,203,110,0.1)", border:"1px solid rgba(253,203,110,0.25)", borderRadius:8, padding:"8px 12px", fontSize:12, color:"#FDCB6E", marginBottom:8 }}>
              ✨ AI suggests <strong>{aiPricing.goldCost}🪙</strong> — {aiPricing.reason}
            </div>
          )}
          <div style={{ display:"flex", gap:8, marginBottom:10 }}>
            <select value={rewardForm.goldCost} onChange={e => setRewardForm(f=>({...f,goldCost:Number(e.target.value)}))} style={{ background:"rgba(255,255,255,0.06)", border:"1px solid rgba(255,255,255,0.1)", borderRadius:8, padding:"8px 10px", color:"#E8E9F3", flex:1, fontSize:13, fontFamily:"inherit" }}>
              {[10,25,50,100,200,500].map(g => <option key={g} value={g}>{g}🪙</option>)}
            </select>
            <Btn small ghost color="#FDCB6E" onClick={getAiPrice} disabled={aiPricingLoading}>{aiPricingLoading?"Thinking…":"✨ AI Price"}</Btn>
          </div>
          <Btn color="#FDCB6E" style={{ color:"#0B0D17", width:"100%" }} onClick={handleAddReward}>Add Reward 🎁</Btn>
        </Card>
      )}

      {active.length === 0 && !showRewardForm && (
        <div style={{ textAlign:"center", padding:"36px 0", color:"rgba(255,255,255,0.2)" }}>
          <div style={{ fontSize:40, marginBottom:8 }}>🎁</div>
          <div>No rewards yet — add something to work toward!</div>
        </div>
      )}

      {active.map(r => (
        <Card key={r.id} style={{ marginBottom:10, borderLeft:"3px solid #FDCB6E" }}>
          <div style={{ display:"flex", justifyContent:"space-between", alignItems:"center" }}>
            <div style={{ flex:1 }}>
              <div style={{ fontWeight:600, fontSize:14 }}>{r.name}</div>
              {r.description && <div style={{ fontSize:12, color:"rgba(255,255,255,0.35)", marginTop:2 }}>{r.description}</div>}
              <div style={{ fontSize:12, color:"#FDCB6E", marginTop:4, fontWeight:700 }}>{r.goldCost}🪙</div>
            </div>
            <div style={{ display:"flex", gap:6, flexDirection:"column", alignItems:"flex-end" }}>
              <Btn small color="#FDCB6E" style={{ color:"#0B0D17" }} disabled={(profile.gold||0) < r.goldCost} onClick={async () => {
                if ((profile.gold||0) < r.goldCost) return;
                // This needs updateProfile — handled via parent
                await redeemReward(uid, r.id);
              }}>
                {(profile.gold||0) >= r.goldCost ? "Redeem 🎉" : `Need ${r.goldCost - (profile.gold||0)} more 🪙`}
              </Btn>
              <button onClick={() => deleteReward(uid, r.id)} style={{ background:"none", border:"none", color:"rgba(255,107,107,0.5)", fontSize:11, cursor:"pointer", padding:0, fontFamily:"inherit" }}>Remove</button>
            </div>
          </div>
        </Card>
      ))}

      {redeemed.length > 0 && (
        <div style={{ marginTop:10 }}>
          <div style={{ fontSize:11, color:"rgba(255,255,255,0.3)", marginBottom:8 }}>REDEEMED</div>
          {redeemed.map(r => (
            <div key={r.id} style={{ padding:"8px 12px", background:"rgba(85,239,196,0.06)", borderRadius:10, marginBottom:6, display:"flex", justifyContent:"space-between" }}>
              <span style={{ fontSize:13, color:"rgba(255,255,255,0.5)", textDecoration:"line-through" }}>{r.name}</span>
              <span style={{ fontSize:11, color:"#55EFC4" }}>Claimed ✓</span>
            </div>
          ))}
        </div>
      )}
    </>
  );
}

/* ─── Shop Tab ────────────────────────────────────────────────────────────── */
function ShopTab({ profile, updateProfile, lvl }) {
  const COSMETICS = [
    { id:"shield_1",  name:"Streak Shield",        desc:"Protect your streak once",     cost:30,  icon:"🛡️", type:"shield"  },
    { id:"frame_1",   name:"Golden Frame",          desc:"Gold avatar border",           cost:50,  icon:"🖼️", type:"frame"   },
    { id:"frame_2",   name:"Cosmic Frame",          desc:"Animated cosmic border",       cost:120, icon:"🌌", type:"frame", minLevel:7 },
    { id:"banner_1",  name:"Flame Banner",          desc:"Red flame squad banner",       cost:75,  icon:"🔥", type:"banner"  },
    { id:"banner_2",  name:"Galaxy Banner",         desc:"Purple galaxy squad banner",   cost:150, icon:"🪐", type:"banner", minLevel:9 },
    { id:"title_1",   name:"Night Owl title",       desc:"Shown on your profile",        cost:40,  icon:"🦉", type:"title"   },
    { id:"title_2",   name:"Focus Master title",    desc:"Shown on your profile",        cost:80,  icon:"🎯", type:"title"   },
  ];

  async function buy(item) {
    if ((profile.gold||0) < item.cost) return;
    const owned = profile.ownedCosmetics || [];
    if (owned.includes(item.id)) return;
    await updateProfile({ gold: (profile.gold||0) - item.cost, ownedCosmetics: [...owned, item.id] });
  }

  return (
    <>
      <div style={{ fontSize:12, color:"rgba(255,255,255,0.35)", marginBottom:12 }}>Spend your gold on cosmetics and power-ups 🪙</div>
      {COSMETICS.map(item => {
        const owned    = (profile.ownedCosmetics||[]).includes(item.id);
        const locked   = item.minLevel && lvl < item.minLevel;
        const canAfford= (profile.gold||0) >= item.cost;
        return (
          <Card key={item.id} style={{ marginBottom:10, opacity:locked?0.5:1 }}>
            <div style={{ display:"flex", alignItems:"center", gap:12 }}>
              <div style={{ fontSize:32 }}>{item.icon}</div>
              <div style={{ flex:1 }}>
                <div style={{ fontWeight:600, fontSize:14 }}>{item.name}</div>
                <div style={{ fontSize:12, color:"rgba(255,255,255,0.35)" }}>{item.desc}</div>
                {locked && <div style={{ fontSize:11, color:"#FDCB6E", marginTop:2 }}>Unlocks at Level {item.minLevel}</div>}
              </div>
              <div style={{ textAlign:"right" }}>
                {owned
                  ? <div style={{ fontSize:13, color:"#55EFC4", fontWeight:700 }}>Owned ✓</div>
                  : locked
                  ? <div style={{ fontSize:12, color:"rgba(255,255,255,0.2)" }}>🔒</div>
                  : <Btn small color={canAfford?"#FDCB6E":"rgba(255,255,255,0.1)"} style={{ color:canAfford?"#0B0D17":"rgba(255,255,255,0.3)" }} onClick={() => buy(item)} disabled={!canAfford}>{item.cost}🪙</Btn>
                }
              </div>
            </div>
          </Card>
        );
      })}
    </>
  );
}

/* ═════════════════════════════ PROFILE VIEWER ═════════════════════════════ */
export function ProfileViewer({ targetUid, currentUid, onClose, onSendFriendRequest, onGiftGold, profile, updateProfile, friends }) {
  const [targetProfile, setTargetProfile] = useState(null);
  const [tasks,         setTasks]         = useState([]);
  const [habits,        setHabits]        = useState([]);
  const [loading,       setLoading]       = useState(true);
  const [expandTasks,   setExpandTasks]   = useState(true);
  const [expandHabits,  setExpandHabits]  = useState(false);
  const [expandedTask,  setExpandedTask]  = useState(null);

  const isFriend = (friends||[]).some(f => f.uid === targetUid && f.status === "accepted");
  const isSelf   = targetUid === currentUid;

  useEffect(() => {
    if (!targetUid) return;
    setLoading(true);
    fetchUserProfile(targetUid).then(p => { setTargetProfile(p); setLoading(false); });

    // Live public tasks
    let unsubTasks;
    import("firebase/firestore").then(({ collection, query, where, onSnapshot, limit }) => {
      import("../firebase/config").then(({ db }) => {
        unsubTasks = onSnapshot(
          query(collection(db,"users",targetUid,"tasks"), where("isPublic","==",true), limit(15)),
          snap => {
            const list = snap.docs.map(d=>({id:d.id,...d.data()}));
            list.sort((a,b)=>(b.createdAt?.seconds||0)-(a.createdAt?.seconds||0));
            setTasks(list);
          }
        );
      });
    });
    return () => { unsubTasks?.(); };
  }, [targetUid]);

  // Habits in a separate effect so it loads independently of isFriend timing
  useEffect(() => {
    if (!targetUid) return;
    let unsubHabits;
    import("firebase/firestore").then(({ collection, query, where, onSnapshot, limit }) => {
      import("../firebase/config").then(({ db }) => {
        unsubHabits = onSnapshot(
          query(collection(db,"users",targetUid,"habits"), where("isPublic","==",true), limit(15)),
          snap => setHabits(snap.docs.map(d=>({id:d.id,...d.data()}))),
          () => setHabits([])
        );
      });
    });
    return () => { unsubHabits?.(); };
  }, [targetUid]);

  if (loading || !targetProfile) return (
    <div style={{ position:"fixed", inset:0, background:"rgba(0,0,0,0.8)", zIndex:500, display:"flex", alignItems:"center", justifyContent:"center" }}>
      <div style={{ fontSize:32, animation:"spin 1s linear infinite" }}>🌀</div>
    </div>
  );

  const lvl    = getLevel(targetProfile.xp || 0);
  const sColor = streakColor(lvl);
  const todayStr = new Date().toISOString().slice(0,10);

  const activeTasks = tasks.filter(t => !t.done);
  const doneTasks   = tasks.filter(t => t.done);

  return (
    <div style={{ position:"fixed", inset:0, background:"rgba(0,0,0,0.85)", zIndex:500, display:"flex", alignItems:"flex-end", justifyContent:"center" }} onClick={onClose}>
      <div onClick={e => e.stopPropagation()} style={{ width:"100%", maxWidth:480, background:"#0F1120", borderRadius:"20px 20px 0 0", padding:"24px 20px 48px", maxHeight:"90vh", overflowY:"auto" }}>

        {/* Header */}
        <div style={{ textAlign:"center", marginBottom:20 }}>
          <div style={{ width:72, height:72, borderRadius:"50%", background:"linear-gradient(135deg,#6C63FF,#A29BFE)", display:"flex", alignItems:"center", justifyContent:"center", fontSize:40, margin:"0 auto 10px", border:"3px solid rgba(108,99,255,0.4)" }}>{targetProfile.avatar}</div>
          <div style={{ fontFamily:"'Syne',sans-serif", fontWeight:800, fontSize:22 }}>{targetProfile.name}</div>
          <div style={{ fontSize:12, color:"rgba(255,255,255,0.4)", marginTop:2 }}>Level {lvl} · {LEVEL_NAMES[lvl-1]}</div>
          <div style={{ display:"flex", justifyContent:"center", gap:16, marginTop:8, fontSize:13 }}>
            <span style={{ color:"#FDCB6E", fontWeight:700 }}>{targetProfile.xp||0} XP</span>
            <span style={{ color:sColor, fontWeight:700 }}>🔥 {targetProfile.streak||0}</span>
            <span style={{ color:"#FDCB6E", fontWeight:700 }}>🪙 {targetProfile.gold||0}</span>
          </div>
          {isFriend && <div style={{ fontSize:11, color:"#55EFC4", marginTop:6, fontWeight:600 }}>👥 Friends</div>}
          {!isSelf && !isFriend && (
            <div style={{ display:"flex", gap:8, justifyContent:"center", marginTop:12 }}>
              <Btn small color="#6C63FF" onClick={() => onSendFriendRequest(currentUid, profile, targetUid)}>+ Add Friend</Btn>
              <Btn small ghost color="#FDCB6E" onClick={() => onGiftGold(targetUid)}>🪙 Gift Gold</Btn>
            </div>
          )}
          {isFriend && !isSelf && (
            <div style={{ display:"flex", gap:8, justifyContent:"center", marginTop:12 }}>
              <Btn small ghost color="#FDCB6E" onClick={() => onGiftGold(targetUid)}>🪙 Gift Gold</Btn>
            </div>
          )}
        </div>

        {/* Public Tasks — collapsible, live */}
        {tasks.length > 0 && (
          <div style={{ marginBottom:16 }}>
            <button onClick={() => setExpandTasks(v=>!v)} style={{
              width:"100%", background:"rgba(255,255,255,0.04)", border:"1px solid rgba(255,255,255,0.08)",
              borderRadius:10, padding:"10px 14px", cursor:"pointer", color:"#E8E9F3",
              display:"flex", justifyContent:"space-between", alignItems:"center", fontFamily:"inherit"
            }}>
              <span style={{ fontSize:13, fontWeight:700 }}>✅ Tasks <span style={{ fontSize:11, color:"rgba(255,255,255,0.35)", fontWeight:400 }}>({activeTasks.length} active)</span></span>
              <span style={{ fontSize:12, color:"rgba(255,255,255,0.35)" }}>{expandTasks?"▲":"▼"}</span>
            </button>
            {expandTasks && (
              <div style={{ marginTop:8 }}>
                {activeTasks.length === 0 && <div style={{ fontSize:12, color:"rgba(255,255,255,0.25)", padding:"8px 4px" }}>No active public tasks</div>}
                {activeTasks.map(t => {
                  const subs    = t.subtasks || [];
                  const subDone = subs.filter(s=>s.done).length;
                  const subPct  = subs.length ? Math.round(subDone/subs.length*100) : 0;
                  const pc      = { high:"#FF6B6B", medium:"#FDCB6E", low:"#55EFC4" }[t.priority] || "#6C63FF";
                  const isOpen  = expandedTask === t.id;
                  return (
                    <div key={t.id} style={{ marginBottom:8, background:"rgba(255,255,255,0.03)", borderRadius:10, borderLeft:`3px solid ${pc}`, overflow:"hidden" }}>
                      <button onClick={() => setExpandedTask(isOpen ? null : t.id)} style={{
                        width:"100%", background:"none", border:"none", padding:"10px 12px",
                        cursor:"pointer", color:"#E8E9F3", fontFamily:"inherit", textAlign:"left",
                        display:"flex", justifyContent:"space-between", alignItems:"center", gap:8
                      }}>
                        <div style={{ flex:1, minWidth:0 }}>
                          <div style={{ fontWeight:600, fontSize:13 }}>{t.title}</div>
                          {subs.length > 0 && (
                            <div style={{ marginTop:5 }}>
                              <div style={{ height:3, background:"rgba(255,255,255,0.06)", borderRadius:2 }}>
                                <div style={{ height:"100%", width:`${subPct}%`, background:"linear-gradient(90deg,#6C63FF,#55EFC4)", borderRadius:2 }} />
                              </div>
                              <div style={{ fontSize:10, color:"rgba(255,255,255,0.3)", marginTop:2 }}>{subDone}/{subs.length} subtasks · {subPct}%</div>
                            </div>
                          )}
                        </div>
                        <div style={{ display:"flex", flexDirection:"column", alignItems:"flex-end", gap:2, flexShrink:0 }}>
                          <span style={{ fontSize:10, color:"#FDCB6E", fontWeight:700 }}>+{t.xp||20}XP</span>
                          {t.dueTime && <span style={{ fontSize:10, color:"#74B9FF" }}>⏰{t.dueTime}</span>}
                          <span style={{ fontSize:10, color:"rgba(255,255,255,0.25)" }}>{isOpen?"▲":"▼"}</span>
                        </div>
                      </button>
                      {isOpen && subs.length > 0 && (
                        <div style={{ padding:"0 12px 10px" }}>
                          {subs.map(s => (
                            <div key={s.id} style={{ display:"flex", alignItems:"center", gap:8, padding:"5px 0", borderTop:"1px solid rgba(255,255,255,0.04)" }}>
                              <div style={{ width:14, height:14, borderRadius:3, border:`2px solid ${s.done?"#55EFC4":"rgba(255,255,255,0.2)"}`, background:s.done?"#55EFC4":"transparent", flexShrink:0, display:"flex", alignItems:"center", justifyContent:"center" }}>
                                {s.done && <span style={{ fontSize:9, color:"#0B0D17", fontWeight:900 }}>✓</span>}
                              </div>
                              <span style={{ fontSize:12, textDecoration:s.done?"line-through":"none", color:s.done?"rgba(255,255,255,0.3)":"#E8E9F3" }}>{s.title}</span>
                            </div>
                          ))}
                        </div>
                      )}
                    </div>
                  );
                })}
                {doneTasks.length > 0 && (
                  <div style={{ marginTop:4 }}>
                    <div style={{ fontSize:10, color:"rgba(255,255,255,0.25)", fontWeight:600, letterSpacing:"0.05em", marginBottom:6 }}>RECENTLY DONE</div>
                    {doneTasks.slice(0,3).map(t => (
                      <div key={t.id} style={{ display:"flex", alignItems:"center", gap:8, padding:"5px 0", borderBottom:"1px solid rgba(255,255,255,0.04)" }}>
                        <div style={{ width:14, height:14, borderRadius:3, background:"#55EFC4", display:"flex", alignItems:"center", justifyContent:"center", flexShrink:0 }}>
                          <span style={{ color:"#0B0D17", fontSize:9, fontWeight:900 }}>✓</span>
                        </div>
                        <span style={{ fontSize:12, textDecoration:"line-through", color:"rgba(255,255,255,0.3)", flex:1 }}>{t.title}</span>
                        <span style={{ fontSize:10, color:"#55EFC4" }}>+{t.xp||20}XP</span>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            )}
          </div>
        )}

        {/* Public Habits — collapsible, only for friends */}
        {habits.length > 0 && (
          <div style={{ marginBottom:16 }}>
            <button onClick={() => setExpandHabits(v=>!v)} style={{
              width:"100%", background:"rgba(255,255,255,0.04)", border:"1px solid rgba(255,255,255,0.08)",
              borderRadius:10, padding:"10px 14px", cursor:"pointer", color:"#E8E9F3",
              display:"flex", justifyContent:"space-between", alignItems:"center", fontFamily:"inherit"
            }}>
              <span style={{ fontSize:13, fontWeight:700 }}>⚡ Habits <span style={{ fontSize:11, color:"rgba(255,255,255,0.35)", fontWeight:400 }}>({habits.length} public)</span></span>
              <span style={{ fontSize:12, color:"rgba(255,255,255,0.35)" }}>{expandHabits?"▲":"▼"}</span>
            </button>
            {expandHabits && (
              <div style={{ marginTop:8 }}>
                {habits.map(h => {
                  const log      = h.log || [];
                  const doneToday = log.includes(todayStr);
                  const streak   = (() => { let s=0,d=new Date(); while(log.includes(d.toISOString().slice(0,10))){ s++; d.setDate(d.getDate()-1); } return s; })();
                  return (
                    <div key={h.id} style={{ display:"flex", alignItems:"center", gap:10, padding:"10px 12px", background:"rgba(255,255,255,0.03)", borderRadius:10, marginBottom:6, borderLeft:`3px solid ${doneToday?"#55EFC4":"rgba(255,255,255,0.1)"}` }}>
                      <span style={{ fontSize:22 }}>{h.icon||"⚡"}</span>
                      <div style={{ flex:1 }}>
                        <div style={{ fontSize:13, fontWeight:600 }}>{h.name}</div>
                        <div style={{ fontSize:10, color:"rgba(255,255,255,0.35)", marginTop:2 }}>🔥 {streak} day streak</div>
                      </div>
                      <div style={{ fontSize:11, fontWeight:700, color:doneToday?"#55EFC4":"rgba(255,255,255,0.25)" }}>
                        {doneToday?"✓ Done":"—"}
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        )}

        <button onClick={onClose} style={{ width:"100%", marginTop:8, background:"rgba(255,255,255,0.06)", border:"none", color:"rgba(255,255,255,0.4)", borderRadius:10, padding:"10px 0", fontSize:14, cursor:"pointer", fontFamily:"inherit" }}>Close</button>
      </div>
    </div>
  );
}

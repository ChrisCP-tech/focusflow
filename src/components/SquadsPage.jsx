// src/components/SquadsPage.jsx
import { useState, useRef, useEffect } from "react";
import { Card, Btn, Input, Tag } from "./UI";
import { useSquads, useSquadFeed, useSquadChallenges } from "../hooks/useSquads";
import { useCollabTasks } from "../hooks/useCollabTasks";
import { TYPE_ICONS, TYPE_COLORS, HABIT_ICONS, HABIT_COLORS, getLevel, getLevelUnlocks } from "../utils";

const SQUAD_EMOJIS = ["👥","🔥","📚","🚀","💪","🎯","🧠","⚡","🌟","🎮","🏆","🌈"];

/* ═══════════════════════════════ SQUADS PAGE ══════════════════════════════ */
export function SquadsPage({ profile, uid }) {
  const { squads, createSquad, joinSquadByCode, leaveSquad } = useSquads(uid);
  const [activeSquadId, setActiveSquadId] = useState(null);
  const [tab, setTab] = useState("feed");
  const [showCreate, setShowCreate] = useState(false);
  const [showJoin, setShowJoin] = useState(false);
  const [newSquadName, setNewSquadName] = useState("");
  const [newSquadEmoji, setNewSquadEmoji] = useState("👥");
  const [joinCode, setJoinCode] = useState("");
  const [joinStatus, setJoinStatus] = useState(null);
  const [createError, setCreateError] = useState(null);

  const level   = getLevel(profile?.xp || 0);
  const unlocks = getLevelUnlocks(level);
  const activeSquad = squads.find(s => s.id === activeSquadId) || squads[0];

  useEffect(() => {
    if (squads.length > 0 && !activeSquadId) setActiveSquadId(squads[0].id);
  }, [squads]);

  async function handleCreate() {
    if (!newSquadName.trim()) return;
    if (!unlocks.canCreateSquad) {
      setCreateError("Squad creation unlocks at Level 5. Keep earning XP!");
      return;
    }
    if (squads.length >= unlocks.maxSquads) {
      setCreateError(`You've reached your squad limit (${unlocks.maxSquads}). Level up to unlock more squad slots!`);
      return;
    }
    setCreateError(null);
    const id = await createSquad(profile, newSquadName.trim(), newSquadEmoji);
    if (!id) { setCreateError("Failed to create squad. Check console for errors."); return; }
    setActiveSquadId(id);
    setShowCreate(false);
    setNewSquadName("");
  }

  async function handleJoin() {
    if (!joinCode.trim()) return;
    setJoinStatus("loading");
    const res = await joinSquadByCode(joinCode.trim(), profile);
    if (res?.error) { setJoinStatus(`error:${res.error}`); return; }
    setActiveSquadId(res.squadId);
    setJoinCode(""); setJoinStatus("success"); setShowJoin(false);
  }

  return (
    <div className="fadeUp">
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 16 }}>
        <h2 style={{ fontFamily: "'Syne',sans-serif", fontWeight: 800, fontSize: 22 }}>Squads 🚀</h2>
        <div style={{ display: "flex", gap: 6 }}>
          <Btn small ghost color="#6C63FF" onClick={() => { setShowJoin(v => !v); setShowCreate(false); }}>Join</Btn>
          <Btn small color="#6C63FF" onClick={() => { setShowCreate(v => !v); setShowJoin(false); }}>+ New</Btn>
        </div>
      </div>

      {/* Create squad */}
      {showCreate && (
        <Card style={{ marginBottom: 16 }}>
          <div style={{ fontSize: 13, fontWeight: 600, marginBottom: 10 }}>Create a Squad</div>
          <Input value={newSquadName} onChange={setNewSquadName} placeholder="Squad name…" style={{ marginBottom: 10 }} />
          <div style={{ display: "flex", flexWrap: "wrap", gap: 6, marginBottom: 12 }}>
            {SQUAD_EMOJIS.map(e => (
              <button key={e} onClick={() => setNewSquadEmoji(e)} style={{
                width: 36, height: 36, borderRadius: 8, fontSize: 20, cursor: "pointer", border: "none",
                background: newSquadEmoji === e ? "rgba(108,99,255,0.3)" : "rgba(255,255,255,0.05)",
                outline: newSquadEmoji === e ? "2px solid #6C63FF" : "none"
              }}>{e}</button>
            ))}
          </div>
          {createError && <div style={{ fontSize:12, color:"#FF6B6B", marginBottom:8, padding:"6px 10px", background:"rgba(255,107,107,0.1)", borderRadius:8 }}>{createError}</div>}
          {!unlocks.canCreateSquad
            ? <div style={{ textAlign:"center", padding:"10px 0", fontSize:13, color:"rgba(255,255,255,0.4)" }}>🔒 Level up to create squads</div>
            : <Btn color="#6C63FF" style={{ width: "100%" }} onClick={handleCreate}>Create Squad</Btn>
          }
        </Card>
      )}

      {/* Join squad */}
      {showJoin && (
        <Card style={{ marginBottom: 16 }}>
          <div style={{ fontSize: 13, fontWeight: 600, marginBottom: 10 }}>Join by Invite Code</div>
          <div style={{ display: "flex", gap: 8 }}>
            <Input value={joinCode} onChange={setJoinCode} placeholder="Enter 6-letter code…" style={{ flex: 1, textTransform: "uppercase" }} />
            <Btn color="#55EFC4" style={{ color: "#0B0D17" }} onClick={handleJoin}>Join</Btn>
          </div>
          {joinStatus?.startsWith("error:") && <div style={{ fontSize: 12, color: "#FF6B6B", marginTop: 8 }}>{joinStatus.replace("error:", "")}</div>}
        </Card>
      )}

      {/* Squad switcher */}
      {squads.length > 0 && (
        <div style={{ display: "flex", gap: 8, overflowX: "auto", paddingBottom: 4, marginBottom: 16 }}>
          {squads.map(s => (
            <button key={s.id} onClick={() => setActiveSquadId(s.id)} style={{
              display: "flex", alignItems: "center", gap: 6, padding: "8px 14px",
              borderRadius: 20, border: "none", cursor: "pointer", whiteSpace: "nowrap",
              background: activeSquad?.id === s.id ? "#6C63FF" : "rgba(255,255,255,0.06)",
              color: activeSquad?.id === s.id ? "#fff" : "rgba(255,255,255,0.5)",
              fontSize: 13, fontWeight: 600, fontFamily: "inherit"
            }}>
              <span>{s.emoji}</span><span>{s.name}</span>
              <span style={{ fontSize: 10, opacity: 0.6 }}>({s.memberIds?.length || 0})</span>
            </button>
          ))}
        </div>
      )}

      {squads.length === 0 ? (
        <div style={{ textAlign: "center", padding: "60px 0", color: "rgba(255,255,255,0.2)" }}>
          <div style={{ fontSize: 48, marginBottom: 12 }}>🚀</div>
          <div style={{ fontSize: 15, marginBottom: 6 }}>No squads yet</div>
          <div style={{ fontSize: 12 }}>Create one or join with an invite code</div>
        </div>
      ) : activeSquad ? (
        <>
          {/* Squad header */}
          <Card style={{ marginBottom: 16, background: "linear-gradient(135deg,rgba(108,99,255,0.12),rgba(162,155,254,0.05))" }}>
            <div style={{ display: "flex", alignItems: "center", gap: 12, marginBottom: 10 }}>
              <div style={{ fontSize: 36 }}>{activeSquad.emoji}</div>
              <div style={{ flex: 1 }}>
                <div style={{ fontFamily: "'Syne',sans-serif", fontWeight: 800, fontSize: 18 }}>{activeSquad.name}</div>
                <div style={{ fontSize: 12, color: "rgba(255,255,255,0.4)" }}>{activeSquad.memberIds?.length || 0} members</div>
              </div>
            </div>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
              <div style={{ fontSize: 11, color: "rgba(255,255,255,0.35)" }}>
                Invite code: <span style={{ color: "#FDCB6E", fontWeight: 700, letterSpacing: "0.1em" }}>{activeSquad.inviteCode}</span>
              </div>
              <Btn small ghost color="#6C63FF" onClick={() => navigator.clipboard?.writeText(activeSquad.inviteCode).then(() => alert("Code copied!"))}>Copy</Btn>
            </div>
          </Card>

          {/* Tabs */}
          <div style={{ display: "flex", gap: 6, marginBottom: 16, overflowX: "auto" }}>
            {[["feed","📣 Feed"],["tasks","✅ Tasks"],["challenges","🎯 Challenges"],["members","👥 Members"]].map(([key,label]) => (
              <button key={key} onClick={() => setTab(key)} style={{
                padding: "7px 12px", borderRadius: 10, fontSize: 12, fontWeight: 600, whiteSpace: "nowrap",
                background: tab === key ? "#6C63FF" : "rgba(255,255,255,0.06)",
                border: "none", color: tab === key ? "#fff" : "rgba(255,255,255,0.4)", cursor: "pointer"
              }}>{label}</button>
            ))}
          </div>

          {tab === "feed" && <SquadFeedTab squadId={activeSquad.id} profile={profile} uid={uid} />}
          {tab === "tasks" && <SquadTasksTab squadId={activeSquad.id} profile={profile} uid={uid} squad={activeSquad} />}
          {tab === "challenges" && <SquadChallengesTab squadId={activeSquad.id} profile={profile} uid={uid} squad={activeSquad} />}
          {tab === "members" && <SquadMembersTab squad={activeSquad} uid={uid} profile={profile} onLeave={() => leaveSquad(activeSquad.id, profile)} />}
        </>
      ) : null}
    </div>
  );
}

/* ─── Squad Feed Tab ─────────────────────────────────────────────────────── */
function SquadFeedTab({ squadId, profile, uid }) {
  const { feed, postToFeed, likePost, commentOnPost } = useSquadFeed(squadId);
  const [text, setText] = useState("");

  function post() {
    if (!text.trim()) return;
    postToFeed(squadId, { userId: uid, userName: profile.name, userAvatar: profile.avatar, text: text.trim(), type: "message" });
    setText("");
  }

  return (
    <>
      <Card style={{ marginBottom: 12 }}>
        <div style={{ display: "flex", gap: 8 }}>
          <Input value={text} onChange={setText} placeholder="Share with your squad… 🎉" style={{ flex: 1 }} onKeyDown={e => e.key === "Enter" && post()} />
          <Btn color="#6C63FF" onClick={post}>Post</Btn>
        </div>
      </Card>
      {feed.length === 0 && (
        <div style={{ textAlign: "center", padding: "36px 0", color: "rgba(255,255,255,0.2)" }}>
          <div style={{ fontSize: 32, marginBottom: 8 }}>🌱</div>
          <div>Be the first to post!</div>
        </div>
      )}
      {feed.map(p => (
        <FeedPostCard key={p.id} post={p} profile={profile} uid={uid}
          onLike={(liked) => likePost(squadId, p.id, uid, liked)}
          onComment={(comment) => commentOnPost(squadId, p.id, comment)} />
      ))}
    </>
  );
}

/* ─── Feed Post Card ─────────────────────────────────────────────────────── */
function FeedPostCard({ post: p, profile, uid, onLike, onComment }) {
  const [showComments, setShowComments] = useState(false);
  const [commentText, setCommentText] = useState("");

  function submitComment() {
    if (!commentText.trim()) return;
    onComment({ uid: profile.uid, name: profile.name, avatar: profile.avatar, text: commentText.trim() });
    setCommentText("");
  }

  return (
    <div style={{ padding: "12px 14px", background: "rgba(255,255,255,0.03)", border: "1px solid rgba(255,255,255,0.06)", borderRadius: 12, marginBottom: 8 }}>
      <div style={{ display: "flex", gap: 10 }}>
        <div style={{ width: 34, height: 34, borderRadius: "50%", background: "linear-gradient(135deg,#6C63FF,#A29BFE)", display: "flex", alignItems: "center", justifyContent: "center", fontSize: 18, flexShrink: 0 }}>{p.userAvatar || "🌀"}</div>
        <div style={{ flex: 1 }}>
          <div style={{ display: "flex", justifyContent: "space-between" }}>
            <span style={{ fontWeight: 600, fontSize: 13 }}>{p.userName}</span>
            <span style={{ fontSize: 10, color: "rgba(255,255,255,0.2)" }}>{p.ts?.toDate ? p.ts.toDate().toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" }) : ""}</span>
          </div>
          <div style={{ fontSize: 13, color: TYPE_COLORS[p.type] || "rgba(255,255,255,0.7)", marginTop: 2, lineHeight: 1.4 }}>
            {TYPE_ICONS[p.type] || ""} {p.text}
          </div>
          <div style={{ display: "flex", gap: 12, marginTop: 8 }}>
            <button onClick={() => onLike(!p.likes?.includes(uid))} style={{ background: "none", border: "none", cursor: "pointer", fontSize: 12, color: p.likes?.includes(uid) ? "#FF6B6B" : "rgba(255,255,255,0.3)", padding: 0, fontFamily: "inherit" }}>❤️ {p.likes?.length || 0}</button>
            <button onClick={() => setShowComments(v => !v)} style={{ background: "none", border: "none", cursor: "pointer", fontSize: 12, color: "rgba(255,255,255,0.3)", padding: 0, fontFamily: "inherit" }}>💬 {p.comments?.length || 0}</button>
          </div>
        </div>
      </div>
      {showComments && (
        <div style={{ marginTop: 10, paddingLeft: 44 }}>
          {(p.comments || []).map((c, i) => (
            <div key={i} style={{ display: "flex", gap: 6, marginBottom: 6 }}>
              <span style={{ fontSize: 14 }}>{c.avatar}</span>
              <div style={{ background: "rgba(255,255,255,0.05)", borderRadius: 8, padding: "5px 8px", flex: 1 }}>
                <div style={{ fontSize: 10, color: "rgba(255,255,255,0.35)" }}>{c.name}</div>
                <div style={{ fontSize: 12 }}>{c.text}</div>
              </div>
            </div>
          ))}
          <div style={{ display: "flex", gap: 6, marginTop: 6 }}>
            <Input value={commentText} onChange={setCommentText} placeholder="Comment…" style={{ flex: 1, fontSize: 12, padding: "6px 10px" }} onKeyDown={e => e.key === "Enter" && submitComment()} />
            <Btn small color="#6C63FF" onClick={submitComment}>↑</Btn>
          </div>
        </div>
      )}
    </div>
  );
}

/* ─── Squad Tasks Tab ────────────────────────────────────────────────────── */
function SquadTasksTab({ squadId, profile, uid, squad }) {
  const { tasks, createCollabTask, addSubtask, toggleSubtask, addComment, claimTask, deleteCollabTask } = useCollabTasks(squadId);
  const [showCreate, setShowCreate] = useState(false);
  const [form, setForm] = useState({ title: "", desc: "", priority: "medium", xp: 20, dueDate: "" });
  const [expandedId, setExpandedId] = useState(null);
  const [aiLoading, setAiLoading] = useState(false);

  async function handleCreate() {
    if (!form.title.trim()) return;
    await createCollabTask(squadId, profile, form);
    setForm({ title: "", desc: "", priority: "medium", xp: 20, dueDate: "" });
    setShowCreate(false);
  }

  async function handleAIBreakdown(task) {
    setAiLoading(task.id);
    try {
      const response = await fetch("https://api.anthropic.com/v1/messages", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          model: "claude-sonnet-4-20250514",
          max_tokens: 1000,
          messages: [{
            role: "user",
            content: `Break down this task into 4-6 clear, actionable subtasks. Task: "${task.title}". ${task.desc ? `Description: ${task.desc}` : ""}
            
Respond ONLY with a JSON array like: [{"title": "subtask 1"}, {"title": "subtask 2"}]
No other text, just the JSON array.`
          }]
        })
      });
      const data = await response.json();
      const text = data.content?.[0]?.text || "[]";
      const clean = text.replace(/```json|```/g, "").trim();
      const subtasks = JSON.parse(clean);
      for (const s of subtasks) {
        await addSubtask(squadId, task.id, { title: s.title, assignedTo: null });
      }
    } catch (e) {
      console.error("AI breakdown failed", e);
    }
    setAiLoading(null);
  }

  return (
    <>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 12 }}>
        <div style={{ fontSize: 13, color: "rgba(255,255,255,0.4)" }}>{tasks.filter(t => !t.done).length} open tasks</div>
        <Btn small color="#6C63FF" onClick={() => setShowCreate(v => !v)}>{showCreate ? "✕ Cancel" : "+ Add Task"}</Btn>
      </div>

      {showCreate && (
        <Card style={{ marginBottom: 14 }}>
          <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
            <Input value={form.title} onChange={v => setForm(f => ({ ...f, title: v }))} placeholder="Task title…" />
            <Input value={form.desc} onChange={v => setForm(f => ({ ...f, desc: v }))} placeholder="Description (optional)" multiline />
            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 8 }}>
              <select value={form.priority} onChange={e => setForm(f => ({ ...f, priority: e.target.value }))} style={selectStyle}>
                <option value="high">🔴 High</option>
                <option value="medium">🟡 Medium</option>
                <option value="low">🟢 Low</option>
              </select>
              <select value={form.xp} onChange={e => setForm(f => ({ ...f, xp: Number(e.target.value) }))} style={selectStyle}>
                {[10, 20, 30, 50, 100].map(x => <option key={x} value={x}>+{x} XP</option>)}
              </select>
            </div>
            <Btn color="#6C63FF" onClick={handleCreate}>Create Squad Task ✅</Btn>
          </div>
        </Card>
      )}

      {tasks.length === 0 && (
        <div style={{ textAlign: "center", padding: "40px 0", color: "rgba(255,255,255,0.2)" }}>
          <div style={{ fontSize: 40, marginBottom: 8 }}>✅</div>
          <div>No tasks yet — add one!</div>
        </div>
      )}

      {tasks.map(task => (
        <CollabTaskCard
          key={task.id}
          task={task}
          profile={profile}
          uid={uid}
          squad={squad}
          expanded={expandedId === task.id}
          onExpand={() => setExpandedId(expandedId === task.id ? null : task.id)}
          onClaim={() => claimTask(squadId, task.id, profile, task.assignees || [])}
          onToggleSubtask={(stId) => toggleSubtask(squadId, task.id, task.subtasks || [], stId)}
          onAddSubtask={(title) => addSubtask(squadId, task.id, { title, assignedTo: null })}
          onComment={(comment) => addComment(squadId, task.id, comment)}
          onDelete={() => deleteCollabTask(squadId, task.id)}
          onAIBreakdown={() => handleAIBreakdown(task)}
          aiLoading={aiLoading === task.id}
        />
      ))}
    </>
  );
}

/* ─── Collab Task Card ───────────────────────────────────────────────────── */
function CollabTaskCard({ task, profile, uid, squad, expanded, onExpand, onClaim, onToggleSubtask, onAddSubtask, onComment, onDelete, onAIBreakdown, aiLoading }) {
  const [newSubtask, setNewSubtask] = useState("");
  const [commentText, setCommentText] = useState("");
  const [showComments, setShowComments] = useState(false);
  const priorityColors = { high: "#FF6B6B", medium: "#FDCB6E", low: "#55EFC4" };
  const isClaimed = (task.assignees || []).some(a => a.uid === uid);
  const subtasks = task.subtasks || [];
  const progress = task.progress || 0;

  function submitSubtask() {
    if (!newSubtask.trim()) return;
    onAddSubtask(newSubtask.trim());
    setNewSubtask("");
  }

  function submitComment() {
    if (!commentText.trim()) return;
    onComment({ uid: profile.uid, name: profile.name, avatar: profile.avatar, text: commentText.trim() });
    setCommentText("");
  }

  return (
    <Card style={{ marginBottom: 10, opacity: task.done ? 0.6 : 1, borderLeft: `3px solid ${priorityColors[task.priority] || "#6C63FF"}` }}>
      {/* Header */}
      <div style={{ display: "flex", gap: 10, alignItems: "flex-start" }}>
        <div style={{ flex: 1, cursor: "pointer" }} onClick={onExpand}>
          <div style={{ fontWeight: 600, fontSize: 14, textDecoration: task.done ? "line-through" : "none", color: task.done ? "rgba(255,255,255,0.4)" : "#E8E9F3" }}>{task.title}</div>
          {task.desc && <div style={{ fontSize: 12, color: "rgba(255,255,255,0.35)", marginTop: 2 }}>{task.desc}</div>}
          {/* Progress bar */}
          {subtasks.length > 0 && (
            <div style={{ marginTop: 8 }}>
              <div style={{ display: "flex", justifyContent: "space-between", fontSize: 10, color: "rgba(255,255,255,0.35)", marginBottom: 3 }}>
                <span>{subtasks.filter(s => s.done).length}/{subtasks.length} subtasks</span>
                <span>{progress}%</span>
              </div>
              <div style={{ height: 4, background: "rgba(255,255,255,0.06)", borderRadius: 2, overflow: "hidden" }}>
                <div style={{ height: "100%", width: `${progress}%`, background: "linear-gradient(90deg,#6C63FF,#55EFC4)", borderRadius: 2, transition: "width 0.3s" }} />
              </div>
            </div>
          )}
          {/* Assignees */}
          {(task.assignees || []).length > 0 && (
            <div style={{ display: "flex", gap: 4, marginTop: 8, flexWrap: "wrap" }}>
              {task.assignees.map(a => (
                <div key={a.uid} style={{ display: "flex", alignItems: "center", gap: 4, background: "rgba(108,99,255,0.15)", borderRadius: 20, padding: "2px 8px", fontSize: 11 }}>
                  <span>{a.avatar}</span><span>{a.name}</span>
                </div>
              ))}
            </div>
          )}
        </div>
        <div style={{ display: "flex", flexDirection: "column", gap: 4, alignItems: "flex-end" }}>
          <Btn small color={isClaimed ? "#55EFC4" : "#6C63FF"} style={{ color: isClaimed ? "#0B0D17" : "#fff" }} onClick={onClaim}>
            {isClaimed ? "✓ Joined" : "+ Join"}
          </Btn>
          <span style={{ fontSize: 10, color: "#FDCB6E", fontWeight: 700 }}>+{task.xp || 20}XP</span>
        </div>
      </div>

      {/* Expanded */}
      {expanded && (
        <div style={{ marginTop: 14, borderTop: "1px solid rgba(255,255,255,0.06)", paddingTop: 14 }}>
          {/* AI Breakdown */}
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 10 }}>
            <div style={{ fontSize: 12, fontWeight: 600, color: "rgba(255,255,255,0.5)" }}>SUBTASKS</div>
            <Btn small ghost color="#A29BFE" onClick={onAIBreakdown} disabled={aiLoading}>
              {aiLoading ? "Thinking…" : "✨ AI Breakdown"}
            </Btn>
          </div>

          {/* Subtask list */}
          {subtasks.map(s => (
            <div key={s.id} style={{ display: "flex", alignItems: "center", gap: 8, padding: "6px 0", borderBottom: "1px solid rgba(255,255,255,0.04)" }}>
              <button onClick={() => onToggleSubtask(s.id)} style={{
                width: 18, height: 18, borderRadius: 4, border: `2px solid ${s.done ? "#55EFC4" : "rgba(255,255,255,0.25)"}`,
                background: s.done ? "#55EFC4" : "transparent", cursor: "pointer", flexShrink: 0,
                display: "flex", alignItems: "center", justifyContent: "center", padding: 0
              }}>
                {s.done && <span style={{ color: "#0B0D17", fontSize: 10, fontWeight: 900 }}>✓</span>}
              </button>
              <span style={{ fontSize: 13, flex: 1, textDecoration: s.done ? "line-through" : "none", color: s.done ? "rgba(255,255,255,0.35)" : "#E8E9F3" }}>{s.title}</span>
            </div>
          ))}

          {/* Add subtask */}
          <div style={{ display: "flex", gap: 6, marginTop: 10 }}>
            <Input value={newSubtask} onChange={setNewSubtask} placeholder="Add subtask…" style={{ flex: 1, fontSize: 12, padding: "6px 10px" }} onKeyDown={e => e.key === "Enter" && submitSubtask()} />
            <Btn small color="#6C63FF" onClick={submitSubtask}>+</Btn>
          </div>

          {/* Comments */}
          <div style={{ marginTop: 14 }}>
            <button onClick={() => setShowComments(v => !v)} style={{ background: "none", border: "none", color: "rgba(255,255,255,0.4)", fontSize: 12, cursor: "pointer", padding: 0, marginBottom: 8, fontFamily: "inherit" }}>
              💬 {task.comments?.length || 0} comments {showComments ? "▲" : "▼"}
            </button>
            {showComments && (
              <>
                {(task.comments || []).map((c, i) => (
                  <div key={i} style={{ display: "flex", gap: 6, marginBottom: 6 }}>
                    <span style={{ fontSize: 14 }}>{c.avatar}</span>
                    <div style={{ background: "rgba(255,255,255,0.05)", borderRadius: 8, padding: "5px 8px", flex: 1 }}>
                      <div style={{ fontSize: 10, color: "rgba(255,255,255,0.35)" }}>{c.name}</div>
                      <div style={{ fontSize: 12 }}>{c.text}</div>
                    </div>
                  </div>
                ))}
                <div style={{ display: "flex", gap: 6 }}>
                  <Input value={commentText} onChange={setCommentText} placeholder="Add comment…" style={{ flex: 1, fontSize: 12, padding: "6px 10px" }} onKeyDown={e => e.key === "Enter" && submitComment()} />
                  <Btn small color="#6C63FF" onClick={submitComment}>↑</Btn>
                </div>
              </>
            )}
          </div>

          {/* Delete */}
          {task.createdBy?.uid === uid && (
            <button onClick={onDelete} style={{ marginTop: 10, background: "none", border: "none", color: "#FF6B6B", fontSize: 12, cursor: "pointer", padding: 0, fontFamily: "inherit" }}>Delete task</button>
          )}
        </div>
      )}
    </Card>
  );
}

/* ─── Squad Challenges Tab ───────────────────────────────────────────────── */
function SquadChallengesTab({ squadId, profile, uid, squad }) {
  const { challenges, createChallenge, logChallengeCompletion } = useSquadChallenges(squadId);
  const [showCreate, setShowCreate] = useState(false);
  const [form, setForm] = useState({ name: "", icon: "🎯", color: "#6C63FF" });
  const todayStr = new Date().toISOString().slice(0, 10);

  async function handleCreate() {
    if (!form.name.trim()) return;
    await createChallenge(squadId, profile, form);
    setForm({ name: "", icon: "🎯", color: "#6C63FF" });
    setShowCreate(false);
  }

  return (
    <>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 12 }}>
        <div style={{ fontSize: 13, color: "rgba(255,255,255,0.4)" }}>Weekly squad challenges</div>
        <Btn small color="#6C63FF" onClick={() => setShowCreate(v => !v)}>{showCreate ? "✕" : "+ Challenge"}</Btn>
      </div>

      {showCreate && (
        <Card style={{ marginBottom: 14 }}>
          <Input value={form.name} onChange={v => setForm(f => ({ ...f, name: v }))} placeholder="Challenge name…" style={{ marginBottom: 10 }} />
          <div style={{ display: "flex", flexWrap: "wrap", gap: 6, marginBottom: 10 }}>
            {HABIT_ICONS.map(ic => (
              <button key={ic} onClick={() => setForm(f => ({ ...f, icon: ic }))} style={{
                width: 34, height: 34, borderRadius: 8, fontSize: 18, cursor: "pointer",
                border: `2px solid ${form.icon === ic ? form.color : "rgba(255,255,255,0.08)"}`,
                background: form.icon === ic ? `${form.color}22` : "rgba(255,255,255,0.04)"
              }}>{ic}</button>
            ))}
          </div>
          <div style={{ display: "flex", gap: 6, marginBottom: 10 }}>
            {HABIT_COLORS.map(c => (
              <button key={c} onClick={() => setForm(f => ({ ...f, color: c }))} style={{ width: 26, height: 26, borderRadius: "50%", background: c, cursor: "pointer", border: `3px solid ${form.color === c ? "#fff" : "transparent"}` }} />
            ))}
          </div>
          <Btn color="#6C63FF" style={{ width: "100%" }} onClick={handleCreate}>Create Challenge 🎯</Btn>
        </Card>
      )}

      {challenges.length === 0 && (
        <div style={{ textAlign: "center", padding: "40px 0", color: "rgba(255,255,255,0.2)" }}>
          <div style={{ fontSize: 40, marginBottom: 8 }}>🎯</div>
          <div>No challenges yet — start one!</div>
        </div>
      )}

      {challenges.map(ch => {
        const myCompletions = ch.completions?.[uid] || [];
        const doneTodayByMe = myCompletions.includes(todayStr);
        const totalMembers = squad.memberIds?.length || 1;
        const doneToday = Object.values(ch.completions || {}).filter(dates => dates.includes(todayStr)).length;

        return (
          <Card key={ch.id} style={{ marginBottom: 10 }}>
            <div style={{ display: "flex", alignItems: "center", gap: 12, marginBottom: 10 }}>
              <div style={{ width: 42, height: 42, borderRadius: 12, background: `${ch.color || "#6C63FF"}22`, border: `1px solid ${ch.color || "#6C63FF"}40`, display: "flex", alignItems: "center", justifyContent: "center", fontSize: 22 }}>{ch.icon}</div>
              <div style={{ flex: 1 }}>
                <div style={{ fontWeight: 600, fontSize: 14 }}>{ch.name}</div>
                <div style={{ fontSize: 11, color: "rgba(255,255,255,0.35)" }}>
                  {ch.startDate} → {ch.endDate} · {doneToday}/{totalMembers} done today
                </div>
              </div>
              {!doneTodayByMe
                ? <Btn small color={ch.color || "#6C63FF"} onClick={() => logChallengeCompletion(squadId, ch.id, uid, todayStr)}>Log ✓</Btn>
                : <div style={{ fontSize: 22 }}>✅</div>
              }
            </div>
            {/* Member completions */}
            <div style={{ display: "flex", gap: 6, flexWrap: "wrap" }}>
              {(squad.members || []).map(m => {
                const memberDates = ch.completions?.[m.uid] || [];
                const done = memberDates.includes(todayStr);
                return (
                  <div key={m.uid} style={{ display: "flex", alignItems: "center", gap: 4, background: done ? "rgba(85,239,196,0.1)" : "rgba(255,255,255,0.04)", borderRadius: 20, padding: "3px 8px", fontSize: 11, border: `1px solid ${done ? "rgba(85,239,196,0.3)" : "rgba(255,255,255,0.06)"}` }}>
                    <span>{m.avatar}</span>
                    <span style={{ color: done ? "#55EFC4" : "rgba(255,255,255,0.35)" }}>{m.name.split(" ")[0]}</span>
                    {done && <span>✓</span>}
                  </div>
                );
              })}
            </div>
          </Card>
        );
      })}
    </>
  );
}

/* ─── Squad Members Tab ──────────────────────────────────────────────────── */
function SquadMembersTab({ squad, uid, profile, onLeave }) {
  const sorted = [...(squad.members || [])].sort((a, b) => (b.xp || 0) - (a.xp || 0));
  return (
    <>
      {sorted.map((m, i) => (
        <Card key={m.uid} style={{ marginBottom: 8 }}>
          <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
            <div style={{ width: 20, fontSize: 16, textAlign: "center" }}>
              {i === 0 ? "🥇" : i === 1 ? "🥈" : i === 2 ? "🥉" : <span style={{ fontSize: 11, color: "rgba(255,255,255,0.3)" }}>{i + 1}</span>}
            </div>
            <div style={{ width: 38, height: 38, borderRadius: "50%", background: "linear-gradient(135deg,#6C63FF,#A29BFE)", display: "flex", alignItems: "center", justifyContent: "center", fontSize: 22, border: `2px solid ${m.uid === uid ? "#FDCB6E" : "rgba(255,255,255,0.08)"}` }}>{m.avatar}</div>
            <div style={{ flex: 1 }}>
              <div style={{ fontSize: 14, fontWeight: 600 }}>{m.name}{m.uid === uid ? " (you)" : ""}</div>
              <div style={{ fontSize: 11, color: "rgba(255,255,255,0.35)" }}>🔥 {m.streak || 0} streak · {m.xp || 0} XP</div>
            </div>
            {m.uid === squad.ownerId && <Tag label="Owner" color="#FDCB6E" />}
          </div>
        </Card>
      ))}
      <button onClick={onLeave} style={{ marginTop: 8, background: "none", border: "none", color: "#FF6B6B", fontSize: 13, cursor: "pointer", padding: 0, fontFamily: "inherit", width: "100%", textAlign: "center", padding: "10px 0" }}>
        Leave Squad
      </button>
    </>
  );
}

const selectStyle = {
  background: "rgba(255,255,255,0.06)", border: "1px solid rgba(255,255,255,0.1)",
  borderRadius: 8, padding: "8px 10px", color: "#E8E9F3", width: "100%", fontSize: 13, fontFamily: "inherit"
};

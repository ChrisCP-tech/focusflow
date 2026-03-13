// src/components/Pages.jsx
import { useState, useEffect, useRef } from "react";
import { Card, Btn, Input, Tag } from "./UI";
import { MOODS, TAGS, HABIT_ICONS, HABIT_COLORS, today, getLevel, getLevelUnlocks, streakColor } from "../utils";
import { aiSuggestXP, aiBreakdownTask, aiAuditTask } from "../ai";



const selectStyle = {
  background:"rgba(255,255,255,0.06)", border:"1px solid rgba(255,255,255,0.1)",
  borderRadius:8, padding:"8px 10px", color:"#E8E9F3", width:"100%", fontSize:13, fontFamily:"inherit"
};

/* ═══════════════════════════════ MOOD CHECK-IN ════════════════════════════ */
const ENERGY_DOTS  = ["💀","😴","😐","⚡","🚀"];
const ANXIETY_DOTS = ["😌","🙂","😐","😰","🤯"];
const FOCUS_DOTS   = ["🌫️","😶","🙂","🎯","⚡"];

function DotScale({ label, dots, value, onChange, color }) {
  return (
    <div style={{ marginBottom:12 }}>
      <div style={{ fontSize:11, color:"rgba(255,255,255,0.45)", fontWeight:600, marginBottom:6, textTransform:"uppercase", letterSpacing:"0.05em" }}>{label}</div>
      <div style={{ display:"flex", gap:6 }}>
        {dots.map((d, i) => (
          <button key={i} onClick={() => onChange(i+1)} style={{
            flex:1, background: value===i+1 ? `${color}30` : "rgba(255,255,255,0.04)",
            border: `1.5px solid ${value===i+1 ? color : "rgba(255,255,255,0.08)"}`,
            borderRadius:10, padding:"8px 4px", cursor:"pointer",
            display:"flex", flexDirection:"column", alignItems:"center", gap:3, transition:"all 0.15s"
          }}>
            <span style={{ fontSize:18 }}>{d}</span>
            <span style={{ fontSize:9, color: value===i+1 ? color : "rgba(255,255,255,0.3)", fontWeight:700 }}>{i+1}</span>
          </button>
        ))}
      </div>
    </div>
  );
}

function MoodCheckIn({ todayMood, onMood }) {
  const [step, setStep]       = useState(null); // null | "emotion" | "scales"
  const [picked, setPicked]   = useState(null);
  const [energy, setEnergy]   = useState(null);
  const [anxiety, setAnxiety] = useState(null);
  const [focus, setFocus]     = useState(null);

  const hasCheckedIn = !!todayMood;

  function startCheckin() {
    setPicked(todayMood?.mood || null);
    setEnergy(todayMood?.energy || null);
    setAnxiety(todayMood?.anxiety || null);
    setFocus(todayMood?.focus || null);
    setStep("emotion");
  }

  function handlePickEmotion(m) {
    setPicked(m);
    setStep("scales");
  }

  function handleSave() {
    if (!picked) return;
    onMood({ mood: picked, energy, anxiety, focus });
    setStep(null);
  }

  // Summary view when already checked in
  if (hasCheckedIn && step === null) {
    const m = todayMood.mood;
    return (
      <Card style={{ marginBottom:20 }}>
        <div style={{ display:"flex", justifyContent:"space-between", alignItems:"center", marginBottom:10 }}>
          <div style={{ fontSize:13, fontWeight:700 }}>Today's Check-In ✅</div>
          <button onClick={startCheckin} style={{ background:"none", border:"none", color:"rgba(255,255,255,0.4)", fontSize:11, cursor:"pointer", fontWeight:600 }}>Edit 💭</button>
        </div>
        <div style={{ display:"flex", alignItems:"center", gap:10, marginBottom: (todayMood.energy||todayMood.anxiety||todayMood.focus) ? 12 : 0 }}>
          <div style={{ fontSize:32 }}>{m.e}</div>
          <div>
            <div style={{ fontWeight:800, fontSize:15, color:m.c }}>{m.l}</div>
            <div style={{ fontSize:11, color:"rgba(255,255,255,0.35)" }}>Feeling today</div>
          </div>
        </div>
        {(todayMood.energy || todayMood.anxiety || todayMood.focus) && (
          <div style={{ display:"flex", gap:8 }}>
            {todayMood.energy  && <div style={{ flex:1, background:"rgba(255,255,255,0.05)", borderRadius:8, padding:"6px 8px", textAlign:"center" }}>
              <div style={{ fontSize:16 }}>{ENERGY_DOTS[todayMood.energy-1]}</div>
              <div style={{ fontSize:9, color:"rgba(255,255,255,0.35)", marginTop:2 }}>Energy {todayMood.energy}/5</div>
            </div>}
            {todayMood.anxiety && <div style={{ flex:1, background:"rgba(255,255,255,0.05)", borderRadius:8, padding:"6px 8px", textAlign:"center" }}>
              <div style={{ fontSize:16 }}>{ANXIETY_DOTS[todayMood.anxiety-1]}</div>
              <div style={{ fontSize:9, color:"rgba(255,255,255,0.35)", marginTop:2 }}>Anxiety {todayMood.anxiety}/5</div>
            </div>}
            {todayMood.focus   && <div style={{ flex:1, background:"rgba(255,255,255,0.05)", borderRadius:8, padding:"6px 8px", textAlign:"center" }}>
              <div style={{ fontSize:16 }}>{FOCUS_DOTS[todayMood.focus-1]}</div>
              <div style={{ fontSize:9, color:"rgba(255,255,255,0.35)", marginTop:2 }}>Focus {todayMood.focus}/5</div>
            </div>}
          </div>
        )}
      </Card>
    );
  }

  // Prompt to check in
  if (!hasCheckedIn && step === null) {
    return (
      <Card style={{ marginBottom:20 }}>
        <div style={{ fontSize:13, fontWeight:600, marginBottom:10 }}>How are you feeling today? 🌡</div>
        <div style={{ display:"flex", flexWrap:"wrap", gap:6 }}>
          {MOODS.slice(0,8).map(m => (
            <button key={m.l} onClick={() => { setPicked(m); setStep("scales"); }} style={{
              background:`${m.c}15`, border:`1.5px solid ${m.c}40`,
              borderRadius:10, padding:"8px 10px", cursor:"pointer",
              display:"flex", alignItems:"center", gap:5, transition:"all 0.15s"
            }}>
              <span style={{ fontSize:18 }}>{m.e}</span>
              <span style={{ fontSize:11, color:m.c, fontWeight:700 }}>{m.l}</span>
            </button>
          ))}
          <button onClick={startCheckin} style={{
            background:"rgba(255,255,255,0.05)", border:"1.5px solid rgba(255,255,255,0.1)",
            borderRadius:10, padding:"8px 12px", cursor:"pointer", color:"rgba(255,255,255,0.5)", fontSize:11, fontWeight:600
          }}>More emotions →</button>
        </div>
      </Card>
    );
  }

  // Step 1: Full emotion grid
  if (step === "emotion") {
    return (
      <Card style={{ marginBottom:20 }}>
        <div style={{ display:"flex", justifyContent:"space-between", alignItems:"center", marginBottom:12 }}>
          <div style={{ fontSize:13, fontWeight:700 }}>Pick your emotion</div>
          <button onClick={() => setStep(null)} style={{ background:"none", border:"none", color:"rgba(255,255,255,0.35)", fontSize:18, cursor:"pointer", lineHeight:1 }}>×</button>
        </div>
        <div style={{ display:"grid", gridTemplateColumns:"repeat(5, 1fr)", gap:6 }}>
          {MOODS.map(m => (
            <button key={m.l} onClick={() => handlePickEmotion(m)} style={{
              background: picked?.l===m.l ? `${m.c}35` : `${m.c}10`,
              border:`1.5px solid ${picked?.l===m.l ? m.c : `${m.c}25`}`,
              borderRadius:10, padding:"8px 4px", cursor:"pointer",
              display:"flex", flexDirection:"column", alignItems:"center", gap:3, transition:"all 0.15s"
            }}>
              <span style={{ fontSize:22 }}>{m.e}</span>
              <span style={{ fontSize:8, color:m.c, fontWeight:700, textAlign:"center", lineHeight:1.2 }}>{m.l}</span>
            </button>
          ))}
        </div>
      </Card>
    );
  }

  // Step 2: Energy/Anxiety/Focus scales
  if (step === "scales") {
    return (
      <Card style={{ marginBottom:20 }}>
        <div style={{ display:"flex", justifyContent:"space-between", alignItems:"center", marginBottom:12 }}>
          <div style={{ display:"flex", alignItems:"center", gap:8 }}>
            <span style={{ fontSize:24 }}>{picked?.e}</span>
            <div>
              <div style={{ fontSize:13, fontWeight:700, color:picked?.c }}>{picked?.l}</div>
              <button onClick={() => setStep("emotion")} style={{ background:"none", border:"none", color:"rgba(255,255,255,0.35)", fontSize:10, cursor:"pointer", padding:0 }}>← Change emotion</button>
            </div>
          </div>
          <button onClick={() => setStep(null)} style={{ background:"none", border:"none", color:"rgba(255,255,255,0.35)", fontSize:18, cursor:"pointer", lineHeight:1 }}>×</button>
        </div>
        <DotScale label="Energy Level" dots={ENERGY_DOTS}  value={energy}  onChange={setEnergy}  color="#55EFC4" />
        <DotScale label="Anxiety Level" dots={ANXIETY_DOTS} value={anxiety} onChange={setAnxiety} color="#FF7675" />
        <DotScale label="Focus Level"  dots={FOCUS_DOTS}   value={focus}   onChange={setFocus}   color="#6C63FF" />
        <button onClick={handleSave} style={{
          width:"100%", background: picked ? `${picked.c}25` : "rgba(255,255,255,0.08)",
          border:`1.5px solid ${picked ? picked.c : "rgba(255,255,255,0.1)"}`,
          borderRadius:10, padding:"10px", cursor:"pointer",
          color: picked?.c || "white", fontWeight:700, fontSize:13, marginTop:4
        }}>
          Save Check-In ✓
        </button>
      </Card>
    );
  }

  return null;
}

/* ═══════════════════════════════ HOME PAGE ════════════════════════════════ */
export function HomePage({ profile, tasks, habits, moodLog, onMood, onCheckHabit, onCompleteTask, setPage }) {
  const todayStr   = today();
  const todayMood  = moodLog.find(m => m.date === todayStr);
  const doneTasks  = tasks.filter(t => t.done).length;
  const doneHabits = habits.filter(h => h.log?.includes(todayStr)).length;
  const topTasks   = tasks.filter(t => !t.done).slice(0,3);
  const topHabits  = habits.filter(h => !h.log?.includes(todayStr)).slice(0,3);
  const level      = getLevel(profile.xp || 0);
  const sColor     = streakColor(level);
  const unlocks    = getLevelUnlocks(level);

  return (
    <div className="fadeUp">
      <div style={{ marginBottom: 20 }}>
        <h2 style={{ fontFamily:"'Syne',sans-serif", fontWeight:800, fontSize:26 }}>
          Hey {profile.name} {profile.avatar}
        </h2>
        <p style={{ color:"rgba(255,255,255,0.4)", fontSize:14, marginTop:4 }}>
          {doneTasks > 0 ? `You crushed ${doneTasks} task${doneTasks>1?"s":""} today 💪` : "Ready to have a great day?"}
        </p>
      </div>

      <div style={{ display:"grid", gridTemplateColumns:"1fr 1fr 1fr 1fr", gap:8, marginBottom:20 }}>
        {[
          { label:"Streak", val:`${profile.streak||0}`, icon:"🔥", color:sColor },
          { label:"Tasks",  val:`${doneTasks}`, icon:"✅", color:"#55EFC4" },
          { label:"Habits", val:`${doneHabits}/${habits.length}`, icon:"⚡", color:"#6C63FF" },
          { label:"Gold",   val:`${profile.gold||0}`, icon:"🪙", color:"#FDCB6E" },
        ].map(s => (
          <Card key={s.label} style={{ textAlign:"center", padding:"10px 6px" }}>
            <div style={{ fontSize:18 }}>{s.icon}</div>
            <div style={{ fontFamily:"'Syne',sans-serif", fontWeight:800, fontSize:16, color:s.color }}>{s.val}</div>
            <div style={{ fontSize:10, color:"rgba(255,255,255,0.35)", marginTop:1 }}>{s.label}</div>
          </Card>
        ))}
      </div>

      {/* Streak shield indicator */}
      {unlocks.streakShields > 0 && (
        <div style={{ marginBottom:12, fontSize:12, color:"rgba(255,255,255,0.4)", display:"flex", alignItems:"center", gap:6 }}>
          <span>🛡️</span>
          <span>{profile.shieldsUsed || 0 < unlocks.streakShields ? `${unlocks.streakShields - (profile.shieldsUsed||0)} streak shield${unlocks.streakShields>1?"s":""} available this week` : "Streak shields used this week"}</span>
        </div>
      )}

      {/* Mood Check-In */}
      <MoodCheckIn todayMood={todayMood} onMood={onMood} />

      {topTasks.length > 0 && (
        <div style={{ marginBottom:20 }}>
          <div style={{ display:"flex", justifyContent:"space-between", alignItems:"center", marginBottom:10 }}>
            <div style={{ fontFamily:"'Syne',sans-serif", fontWeight:700, fontSize:14 }}>Next Up ✅</div>
            <button onClick={() => setPage("tasks")} style={{ background:"none", border:"none", color:"#6C63FF", fontSize:12, fontWeight:600, cursor:"pointer" }}>See all →</button>
          </div>
          {topTasks.map(t => <MiniTask key={t.id} task={t} onComplete={onCompleteTask} />)}
        </div>
      )}

      {topHabits.length > 0 && (
        <div style={{ marginBottom:20 }}>
          <div style={{ display:"flex", justifyContent:"space-between", alignItems:"center", marginBottom:10 }}>
            <div style={{ fontFamily:"'Syne',sans-serif", fontWeight:700, fontSize:14 }}>Habits Today 🔥</div>
            <button onClick={() => setPage("habits")} style={{ background:"none", border:"none", color:"#6C63FF", fontSize:12, fontWeight:600, cursor:"pointer" }}>See all →</button>
          </div>
          {topHabits.map(h => <MiniHabit key={h.id} habit={h} onCheck={onCheckHabit} />)}
        </div>
      )}
    </div>
  );
}

function MiniTask({ task, onComplete }) {
  const colors = { high:"#FF6B6B", medium:"#FDCB6E", low:"#55EFC4" };
  return (
    <div onClick={() => onComplete(task)} style={{
      display:"flex", alignItems:"center", gap:12, padding:"10px 14px",
      background:"rgba(255,255,255,0.04)", border:"1px solid rgba(255,255,255,0.07)",
      borderLeft:`3px solid ${colors[task.priority]||"#6C63FF"}`,
      borderRadius:10, marginBottom:6, cursor:"pointer"
    }}>
      <div style={{ width:20, height:20, borderRadius:6, border:"2px solid rgba(255,255,255,0.2)", flexShrink:0 }} />
      <div style={{ flex:1 }}>
        <div style={{ fontSize:13, fontWeight:500 }}>{task.title}</div>
        {task.tag && <Tag label={`#${task.tag}`} color="#6C63FF" />}
      </div>
      <div style={{ display:"flex", gap:6 }}>
        <span style={{ fontSize:11, color:"#FDCB6E", fontWeight:700 }}>+{task.xp||20}XP</span>
        <span style={{ fontSize:11, color:"#FDCB6E", fontWeight:700 }}>+{task.gold||10}🪙</span>
      </div>
    </div>
  );
}

function MiniHabit({ habit, onCheck }) {
  return (
    <div style={{
      display:"flex", alignItems:"center", gap:12, padding:"10px 14px",
      background:"rgba(255,255,255,0.04)", border:`1px solid ${habit.color||"#6C63FF"}30`,
      borderRadius:10, marginBottom:6
    }}>
      <div style={{ width:34, height:34, borderRadius:10, background:`${habit.color||"#6C63FF"}22`, display:"flex", alignItems:"center", justifyContent:"center", fontSize:20 }}>{habit.icon||"🌟"}</div>
      <div style={{ flex:1 }}>
        <div style={{ fontSize:13, fontWeight:500 }}>{habit.name}</div>
        <div style={{ fontSize:11, color:"rgba(255,255,255,0.35)" }}>🔥 {habit.streak||0} day streak</div>
      </div>
      <Btn small color={habit.color||"#6C63FF"} onClick={() => onCheck(habit)}>Log ✓</Btn>
    </div>
  );
}

/* ═══════════════════════════════ TASKS PAGE ═══════════════════════════════ */
export function TasksPage({ tasks, addTask, toggleTask, deleteTask, toggleTaskPrivacy, addSubtask, setSubtasks, toggleSubtask, deleteSubtask, friends, uid, onInviteFriend, taskInvites, onAcceptInvite, onDeclineInvite, onCollabSubtaskUpdate }) {
  const [showForm,    setShowForm]    = useState(false);
  const [filter,      setFilter]      = useState("all");
  const [showInvites, setShowInvites] = useState(false);
  const [form,      setForm]      = useState({ title:"", desc:"", priority:"medium", tag:"", xp:20, gold:10, dueTime:"", isPublic:true });
  const [aiXP,      setAiXP]      = useState(null);
  const [aiLoading, setAiLoading] = useState(false);
  const [aiBreakId, setAiBreakId] = useState(null);
  const [aiCooldowns, setAiCooldowns] = useState({});
  const debounceRef = useRef(null);
  const pendingInvites = (taskInvites||[]).filter(i => i.status === "pending");

  // AI XP suggestion as user types (debounced 900ms)
  useEffect(() => {
    if (!form.title || form.title.length < 5) { setAiXP(null); return; }
    clearTimeout(debounceRef.current);
    debounceRef.current = setTimeout(async () => {
      setAiLoading(true);
      const result = await aiSuggestXP(form.title);
      if (result) {
        setAiXP(result);
        setForm(f => ({ ...f, xp: result.xp, gold: result.gold }));
      }
      setAiLoading(false);
    }, 900);
    return () => clearTimeout(debounceRef.current);
  }, [form.title]);

  async function handleAdd() {
    if (!form.title.trim()) return;
    await addTask({ ...form, createdAtMs: Date.now() });
    setForm({ title:"", desc:"", priority:"medium", tag:"", xp:20, gold:10, dueTime:"", isPublic:true });
    setAiXP(null);
    setShowForm(false);
  }

  async function handleAIBreakdown(task) {
    // If cached result already exists don't re-run API
    if (task.aiBreakdownDone && (task.subtasks || []).length > 0) return;
    // 10-second cooldown prevents accidental double-click double-spend
    const lastRun = aiCooldowns[task.id] || 0;
    if (Date.now() - lastRun < 10000) return;

    setAiBreakId(task.id);
    setAiCooldowns(prev => ({ ...prev, [task.id]: Date.now() }));
    const result = await aiBreakdownTask(task.title, task.desc);
    if (result && result.length > 0) {
      // One bulk write — no race condition from sequential getDoc/updateDoc calls
      await setSubtasks(task.id, result.map(s => s.title), true);
    }
    setAiBreakId(null);
  }

  const visible = tasks.filter(t => {
    if (filter === "active")  return !t.done;
    if (filter === "done")    return t.done;
    if (filter === "public")  return t.isPublic !== false && !t.isCollab;
    if (filter === "private") return t.isPublic === false;
    if (filter === "shared")  return t.isCollab === true;
    return true; // "all"
  });

  return (
    <div className="fadeUp">
      <div style={{ display:"flex", justifyContent:"space-between", alignItems:"center", marginBottom:16 }}>
        <h2 style={{ fontFamily:"'Syne',sans-serif", fontWeight:800, fontSize:22 }}>Tasks ✅</h2>
        <div style={{ display:"flex", gap:8, alignItems:"center" }}>
          {pendingInvites.length > 0 && (
            <button onClick={() => setShowInvites(v=>!v)} style={{
              background: showInvites ? "rgba(253,203,110,0.2)" : "rgba(253,203,110,0.1)",
              border:"1.5px solid rgba(253,203,110,0.4)", borderRadius:10,
              color:"#FDCB6E", fontSize:12, fontWeight:700, cursor:"pointer",
              padding:"5px 10px", fontFamily:"inherit", display:"flex", alignItems:"center", gap:5
            }}>
              📨 {pendingInvites.length} Invite{pendingInvites.length>1?"s":""}
              <span style={{ fontSize:10 }}>{showInvites?"▲":"▼"}</span>
            </button>
          )}
          <Btn small color="#6C63FF" onClick={() => setShowForm(v => !v)}>{showForm ? "✕ Close" : "+ Add"}</Btn>
        </div>
      </div>

      {/* Task Invites Banner */}
      {showInvites && pendingInvites.length > 0 && (
        <div style={{ marginBottom:16 }}>
          {pendingInvites.map(inv => (
            <Card key={inv.id} style={{ marginBottom:8, borderLeft:"3px solid #FDCB6E", background:"rgba(253,203,110,0.05)" }}>
              <div style={{ display:"flex", justifyContent:"space-between", alignItems:"flex-start", gap:8 }}>
                <div style={{ flex:1 }}>
                  <div style={{ fontWeight:700, fontSize:14, marginBottom:2 }}>📨 {inv.taskTitle}</div>
                  <div style={{ fontSize:11, color:"rgba(255,255,255,0.4)" }}>
                    Friend invited you · +{inv.taskXp||20}XP · +{inv.taskGold||10}🪙
                  </div>
                </div>
                <div style={{ display:"flex", gap:6, flexShrink:0 }}>
                  <Btn small color="#55EFC4" style={{ color:"#0B0D17" }} onClick={() => { onAcceptInvite(inv.id); setShowInvites(false); }}>✓ Accept</Btn>
                  <Btn small ghost color="#FF6B6B" onClick={() => onDeclineInvite(inv.id)}>✕</Btn>
                </div>
              </div>
            </Card>
          ))}
        </div>
      )}

      {showForm && (
        <Card style={{ marginBottom:16 }}>
          <div style={{ display:"flex", flexDirection:"column", gap:10 }}>
            <div style={{ position:"relative" }}>
              <Input value={form.title} onChange={v => setForm(f=>({...f,title:v}))} placeholder="What needs to be done?" />
              {aiLoading && <div style={{ position:"absolute", right:10, top:"50%", transform:"translateY(-50%)", fontSize:12, color:"#A29BFE" }}>✨ AI thinking…</div>}
            </div>
            {aiXP && (
              <div style={{ background:"rgba(108,99,255,0.1)", border:"1px solid rgba(108,99,255,0.25)", borderRadius:8, padding:"8px 12px", fontSize:12, color:"#A29BFE" }}>
                ✨ AI suggests <strong style={{color:"#FDCB6E"}}>+{aiXP.xp} XP</strong> & <strong style={{color:"#FDCB6E"}}>+{aiXP.gold}🪙</strong> — {aiXP.reason}
              </div>
            )}
            <Input value={form.desc} onChange={v => setForm(f=>({...f,desc:v}))} placeholder="Notes (optional)" multiline />
            <div style={{ display:"grid", gridTemplateColumns:"1fr 1fr", gap:8 }}>
              <select value={form.priority} onChange={e => setForm(f=>({...f,priority:e.target.value}))} style={selectStyle}>
                <option value="high">🔴 High</option>
                <option value="medium">🟡 Medium</option>
                <option value="low">🟢 Low</option>
              </select>
              <select value={form.tag} onChange={e => setForm(f=>({...f,tag:e.target.value}))} style={selectStyle}>
                <option value="">No tag</option>
                {TAGS.map(t => <option key={t} value={t}>{t}</option>)}
              </select>
              <select value={form.xp} onChange={e => setForm(f=>({...f,xp:Number(e.target.value)}))} style={selectStyle}>
                {[10,20,30,50,100].map(x => <option key={x} value={x}>+{x} XP</option>)}
              </select>
              <select value={form.gold} onChange={e => setForm(f=>({...f,gold:Number(e.target.value)}))} style={selectStyle}>
                {[5,10,15,25,50].map(g => <option key={g} value={g}>+{g} 🪙</option>)}
              </select>
              <input type="time" value={form.dueTime} onChange={e => setForm(f=>({...f,dueTime:e.target.value}))} style={selectStyle} />
              <div style={{ display:"flex", alignItems:"center", justifyContent:"space-between", background:"rgba(255,255,255,0.04)", border:"1px solid rgba(255,255,255,0.1)", borderRadius:8, padding:"6px 10px" }}>
                <span style={{ fontSize:12 }}>{form.isPublic ? "🌐" : "🔒"}</span>
                <button onClick={() => setForm(f=>({...f,isPublic:!f.isPublic}))} style={{ background:"none", border:"none", color:"#6C63FF", fontSize:12, cursor:"pointer", fontFamily:"inherit" }}>{form.isPublic ? "Public" : "Private"}</button>
              </div>
            </div>
            <Btn color="#6C63FF" onClick={handleAdd}>Add Task ✅</Btn>
            {aiXP && (
              <div style={{ fontSize:11, color:"rgba(255,255,255,0.3)", textAlign:"center" }}>
                💡 After saving, expand the task to use ✨ AI Breakdown and split it into subtasks
              </div>
            )}
          </div>
        </Card>
      )}

      <div style={{ display:"flex", gap:6, overflowX:"auto", paddingBottom:4, marginBottom:14 }}>
        {[["all","All"],["active","Active"],["done","Done"],["public","Public"],["private","Private"],["shared","👥 Shared"]].map(([f, label]) => {
          const isShared = f === "shared";
          const sharedCount = isShared ? tasks.filter(t => t.isCollab).length : 0;
          return (
            <button key={f} onClick={() => setFilter(f)} style={{
              padding:"5px 12px", borderRadius:16, fontSize:11, fontWeight:600, whiteSpace:"nowrap",
              background: filter===f ? "#6C63FF" : isShared && sharedCount > 0 ? "rgba(108,99,255,0.15)" : "rgba(255,255,255,0.06)",
              border: isShared && sharedCount > 0 ? "1px solid rgba(108,99,255,0.4)" : "none",
              color: filter===f ? "#fff" : isShared && sharedCount > 0 ? "#A29BFE" : "rgba(255,255,255,0.4)",
              cursor:"pointer"
            }}>{label}{isShared && sharedCount > 0 ? ` (${sharedCount})` : ""}</button>
          );
        })}
      </div>

      {visible.length === 0 && (
        <div style={{ textAlign:"center", padding:"48px 0", color:"rgba(255,255,255,0.2)" }}>
          <div style={{ fontSize:40, marginBottom:8 }}>✅</div>
          <div>No tasks here</div>
        </div>
      )}

      {visible.map(task => (
        <TaskCard key={task.id} task={task}
          onToggle={() => toggleTask(task.id, task.done)}
          onDelete={() => deleteTask(task.id)}
          onPrivacyToggle={() => toggleTaskPrivacy(task.id, !task.isPublic)}
          onAddSubtask={(title) => addSubtask(task.id, { title })}
          onDeleteSubtask={(stId) => deleteSubtask(task.id, stId)}
          onToggleSubtask={(stId) => toggleSubtask(task.id, stId)}
          onAIBreakdown={() => handleAIBreakdown(task)}
          aiBreaking={aiBreakId === task.id}
          friends={friends}
          uid={uid}
          onInviteFriend={onInviteFriend}
          onCollabSubtaskUpdate={onCollabSubtaskUpdate}
        />
      ))}
    </div>
  );
}

function TaskCard({ task, onToggle, onDelete, onPrivacyToggle, onAddSubtask, onDeleteSubtask, onToggleSubtask, onAIBreakdown, aiBreaking, friends, uid, onInviteFriend, onCollabSubtaskUpdate }) {
  const [expanded,   setExpanded]   = useState(false);
  const [newSub,     setNewSub]     = useState("");
  const [showInvite, setShowInvite] = useState(false);
  const priorityColors = { high:"#FF6B6B", medium:"#FDCB6E", low:"#55EFC4" };
  const subtasks = task.subtasks || [];
  const progress = task.progress || 0;
  const accepted = (friends||[]).filter(f => f.status === "accepted");
  // Collab tasks accepted by this user — they can complete but not edit/delete
  const isCollabAcceptor = task.isCollab === true;

  function handleSubtaskToggle(stId) {
    onToggleSubtask(stId);
    // If collab task, also push to owner
    if (task.isCollab && onCollabSubtaskUpdate) {
      const updated = subtasks.map(s => s.id === stId ? { ...s, done: !s.done } : s);
      const done = updated.filter(s=>s.done).length;
      const pct = updated.length ? Math.round(done/updated.length*100) : 0;
      onCollabSubtaskUpdate(task, updated, pct);
    }
  }

  function submitSub() {
    if (!newSub.trim()) return;
    onAddSubtask(newSub.trim());
    setNewSub("");
  }
  function handleSubKeyDown(e) {
    if (e.key === "Enter") submitSub();
  }

  return (
    <Card style={{
      marginBottom:10,
      opacity: task.done ? 0.7 : 1,
      borderLeft:`3px solid ${task.done ? "#55EFC4" : (priorityColors[task.priority]||"#6C63FF")}`,
      background: task.done ? "rgba(85,239,196,0.04)" : undefined
    }}>
      <div style={{ display:"flex", gap:10, alignItems:"flex-start" }}>
        {/* Checkbox / Done indicator */}
        <button onClick={onToggle} style={{
          width:22, height:22, borderRadius:6,
          border:`2px solid ${task.done ? "#55EFC4" : "rgba(255,255,255,0.2)"}`,
          background: task.done ? "#55EFC4" : "transparent",
          cursor:"pointer", flexShrink:0,
          display:"flex", alignItems:"center", justifyContent:"center", marginTop:1
        }}>
          {task.done && <span style={{ color:"#0B0D17", fontSize:12, fontWeight:900 }}>✓</span>}
        </button>

        <div style={{ flex:1, minWidth:0 }}>
          <div style={{ display:"flex", alignItems:"flex-start", justifyContent:"space-between", gap:6 }}>
            <div style={{ cursor:"pointer", flex:1 }} onClick={() => !task.done && setExpanded(v=>!v)}>
              <div style={{ display:"flex", alignItems:"center", gap:6, flexWrap:"wrap" }}>
                <div style={{ fontWeight:600, fontSize:14, textDecoration:task.done?"line-through":"none", color:task.done?"rgba(255,255,255,0.4)":"#E8E9F3" }}>{task.title}</div>
                {task.isCollab && <span style={{ fontSize:10, background:"rgba(108,99,255,0.2)", border:"1px solid rgba(108,99,255,0.4)", borderRadius:6, padding:"1px 6px", color:"#A29BFE", fontWeight:700 }}>👥 Shared</span>}
              </div>
              {task.desc && !task.done && <div style={{ fontSize:12, color:"rgba(255,255,255,0.35)", marginTop:2 }}>{task.desc}</div>}
              {task.dueTime && !task.done && <div style={{ fontSize:11, color:"#74B9FF", marginTop:2 }}>⏰ {task.dueTime}</div>}
            </div>
            {/* Undo button — visible when done */}
            {task.done && (
              <button onClick={onToggle} style={{
                background:"rgba(255,107,107,0.12)", border:"1px solid rgba(255,107,107,0.3)",
                borderRadius:8, color:"#FF6B6B", fontSize:11, fontWeight:600, cursor:"pointer",
                padding:"3px 9px", whiteSpace:"nowrap", fontFamily:"inherit", flexShrink:0
              }}>↩ Undo</button>
            )}
            {/* Expand arrow — visible when not done */}
            {!task.done && (
              <button onClick={() => setExpanded(v=>!v)} style={{
                background:"none", border:"none", color:"rgba(255,255,255,0.25)",
                cursor:"pointer", fontSize:12, padding:0, flexShrink:0
              }}>{expanded ? "▲" : "▼"}</button>
            )}
          </div>

          {/* Progress bar */}
          {subtasks.length > 0 && !task.done && (
            <div style={{ marginTop:8 }}>
              <div style={{ display:"flex", justifyContent:"space-between", fontSize:10, color:"rgba(255,255,255,0.35)", marginBottom:3 }}>
                <span>{subtasks.filter(s=>s.done).length}/{subtasks.length} subtasks</span>
                <span>{progress}%</span>
              </div>
              <div style={{ height:4, background:"rgba(255,255,255,0.06)", borderRadius:2, overflow:"hidden" }}>
                <div style={{ height:"100%", width:`${progress}%`, background:"linear-gradient(90deg,#6C63FF,#55EFC4)", borderRadius:2, transition:"width 0.3s" }} />
              </div>
            </div>
          )}

          {!task.done && (
            <div style={{ display:"flex", gap:6, marginTop:6, flexWrap:"wrap", alignItems:"center" }}>
              {task.tag && <Tag label={`#${task.tag}`} color="#6C63FF" />}
              <span style={{ fontSize:11, color:"#FDCB6E", fontWeight:700 }}>+{task.xp||20}XP</span>
              <span style={{ fontSize:11, color:"#FDCB6E", fontWeight:700 }}>+{task.gold||10}🪙</span>
              <span style={{ fontSize:11, color:task.isPublic!==false?"#55EFC4":"rgba(255,255,255,0.3)" }}>{task.isPublic!==false?"🌐":"🔒"}</span>
            </div>
          )}
        </div>
      </div>

      {/* Expanded details — only when not done */}
      {expanded && !task.done && (
        <div style={{ marginTop:12, paddingTop:12, borderTop:"1px solid rgba(255,255,255,0.06)" }}>

          {/* Collab notice for acceptors */}
          {isCollabAcceptor && (
            <div style={{ fontSize:11, color:"#A29BFE", background:"rgba(108,99,255,0.1)", borderRadius:8, padding:"6px 10px", marginBottom:10 }}>
              👥 Shared task — you can complete it and toggle subtasks. Only the owner can edit or delete.
            </div>
          )}

          <div style={{ display:"flex", justifyContent:"space-between", alignItems:"center", marginBottom:8 }}>
            <div style={{ fontSize:11, fontWeight:600, color:"rgba(255,255,255,0.4)", letterSpacing:"0.05em" }}>
              SUBTASKS {subtasks.length > 0 && `(${subtasks.filter(s=>s.done).length}/${subtasks.length})`}
            </div>
            {/* AI breakdown — owner only */}
            {!isCollabAcceptor && (
              <Btn small ghost color={task.aiBreakdownDone ? "#55EFC4" : "#A29BFE"}
                onClick={onAIBreakdown}
                disabled={aiBreaking || (task.aiBreakdownDone && subtasks.length > 0)}
                title={task.aiBreakdownDone ? "Already generated — edit manually below" : "Let AI break this into subtasks"}
              >
                {aiBreaking ? "✨ Thinking…" : task.aiBreakdownDone && subtasks.length > 0 ? "✓ AI Done" : "✨ AI Breakdown"}
              </Btn>
            )}
          </div>
          {subtasks.map(s => (
            <div key={s.id} style={{ display:"flex", alignItems:"center", gap:8, padding:"6px 0", borderBottom:"1px solid rgba(255,255,255,0.04)" }}>
              <button onClick={() => handleSubtaskToggle(s.id)} style={{
                width:18, height:18, borderRadius:4,
                border:`2px solid ${s.done?"#55EFC4":"rgba(255,255,255,0.25)"}`,
                background:s.done?"#55EFC4":"transparent", cursor:"pointer", flexShrink:0,
                display:"flex", alignItems:"center", justifyContent:"center", padding:0
              }}>
                {s.done && <span style={{ color:"#0B0D17", fontSize:10, fontWeight:900 }}>✓</span>}
              </button>
              <span style={{ fontSize:13, flex:1, textDecoration:s.done?"line-through":"none", color:s.done?"rgba(255,255,255,0.35)":"#E8E9F3" }}>{s.title}</span>
              {/* Delete subtask — owner only */}
              {!isCollabAcceptor && (
                <button onClick={() => onDeleteSubtask(s.id)} style={{
                  background:"none", border:"none", color:"rgba(255,255,255,0.15)",
                  cursor:"pointer", fontSize:14, padding:"0 2px", lineHeight:1, flexShrink:0
                }} title="Remove subtask">✕</button>
              )}
            </div>
          ))}

          {/* Manual subtask input — owner only */}
          {!isCollabAcceptor && (
            <div style={{ display:"flex", gap:6, marginTop:10 }}>
              <Input
                value={newSub}
                onChange={setNewSub}
                onKeyDown={handleSubKeyDown}
                placeholder="Add a subtask… (Enter to add)"
                style={{ flex:1, fontSize:12, padding:"7px 10px" }}
              />
              <Btn small color="#6C63FF" onClick={submitSub}>+</Btn>
            </div>
          )}

          {/* Invite friends — owner only */}
          {!isCollabAcceptor && accepted.length > 0 && (
            <div style={{ marginTop:10 }}>
              <button onClick={() => setShowInvite(v=>!v)} style={{ background:"none", border:"none", color:"rgba(255,255,255,0.4)", fontSize:12, cursor:"pointer", padding:0, fontFamily:"inherit" }}>
                👥 Invite friends {showInvite?"▲":"▼"}
              </button>
              {showInvite && (
                <div style={{ marginTop:8, display:"flex", flexWrap:"wrap", gap:6 }}>
                  {accepted.map(f => (
                    <Btn key={f.uid} small ghost color="#6C63FF" onClick={() => { onInviteFriend(f.uid, task); setShowInvite(false); }}>
                      {f.avatar} {f.name}
                    </Btn>
                  ))}
                </div>
              )}
            </div>
          )}

          <div style={{ display:"flex", justifyContent:"space-between", marginTop:12 }}>
            {/* Privacy toggle — owner only */}
            {!isCollabAcceptor ? (
              <button onClick={onPrivacyToggle} style={{ background:"none", border:"none", color:"rgba(255,255,255,0.4)", fontSize:12, cursor:"pointer", padding:0, fontFamily:"inherit" }}>
                {task.isPublic!==false ? "🌐 Make private" : "🔒 Make public"}
              </button>
            ) : <span />}
            {/* Delete — owner only; acceptors see Leave instead */}
            {isCollabAcceptor
              ? <button onClick={onDelete} style={{ background:"none", border:"none", color:"rgba(255,255,255,0.4)", fontSize:12, cursor:"pointer", padding:0, fontFamily:"inherit" }}>Leave shared task</button>
              : <button onClick={onDelete} style={{ background:"none", border:"none", color:"#FF6B6B", fontSize:12, cursor:"pointer", padding:0, fontFamily:"inherit" }}>Delete</button>
            }
          </div>

        </div>
      )}
    </Card>
  );
}

/* ═══════════════════════════════ HABITS PAGE ══════════════════════════════ */
export function HabitsPage({ habits, addHabit, checkHabit, deleteHabit, toggleHabitPrivacy }) {
  const [showForm, setShowForm] = useState(false);
  const [form, setForm] = useState({ name:"", icon:"🌟", color:"#6C63FF", freq:"daily", isPublic:true });
  const todayStr = today();

  async function handleAdd() {
    if (!form.name.trim()) return;
    await addHabit(form);
    setForm({ name:"", icon:"🌟", color:"#6C63FF", freq:"daily", isPublic:true });
    setShowForm(false);
  }

  return (
    <div className="fadeUp">
      <div style={{ display:"flex", justifyContent:"space-between", alignItems:"center", marginBottom:16 }}>
        <h2 style={{ fontFamily:"'Syne',sans-serif", fontWeight:800, fontSize:22 }}>Habits 🔥</h2>
        <Btn small color="#6C63FF" onClick={() => setShowForm(v=>!v)}>{showForm ? "✕" : "+ Add"}</Btn>
      </div>

      {showForm && (
        <Card style={{ marginBottom:16 }}>
          <Input value={form.name} onChange={v => setForm(f=>({...f,name:v}))} placeholder="Habit name" style={{ marginBottom:10 }} />
          <div style={{ display:"flex", flexWrap:"wrap", gap:6, marginBottom:10 }}>
            {HABIT_ICONS.map(ic => (
              <button key={ic} onClick={() => setForm(f=>({...f,icon:ic}))} style={{
                width:34, height:34, borderRadius:8, fontSize:18, cursor:"pointer",
                border:`2px solid ${form.icon===ic ? form.color : "rgba(255,255,255,0.08)"}`,
                background:form.icon===ic ? `${form.color}22` : "rgba(255,255,255,0.04)"
              }}>{ic}</button>
            ))}
          </div>
          <div style={{ display:"flex", gap:6, marginBottom:10, flexWrap:"wrap" }}>
            {HABIT_COLORS.map(c => (
              <button key={c} onClick={() => setForm(f=>({...f,color:c}))} style={{ width:26, height:26, borderRadius:"50%", background:c, cursor:"pointer", border:`3px solid ${form.color===c?"#fff":"transparent"}` }} />
            ))}
          </div>
          <div style={{ display:"flex", alignItems:"center", justifyContent:"space-between", marginBottom:10 }}>
            <span style={{ fontSize:12 }}>{form.isPublic ? "🌐 Public" : "🔒 Private"}</span>
            <button onClick={() => setForm(f=>({...f,isPublic:!f.isPublic}))} style={{ background:"none", border:"none", color:"#6C63FF", fontSize:12, cursor:"pointer", fontFamily:"inherit" }}>Toggle</button>
          </div>
          <Btn color="#6C63FF" style={{ width:"100%" }} onClick={handleAdd}>Add Habit 🔥</Btn>
        </Card>
      )}

      {habits.length === 0 && (
        <div style={{ textAlign:"center", padding:"48px 0", color:"rgba(255,255,255,0.2)" }}>
          <div style={{ fontSize:40, marginBottom:8 }}>🔥</div>
          <div>No habits yet — start one!</div>
        </div>
      )}

      {habits.map(h => {
        const doneToday = h.log?.includes(todayStr);
        return (
          <Card key={h.id} style={{ marginBottom:10, borderLeft:`3px solid ${h.color||"#6C63FF"}` }}>
            <div style={{ display:"flex", alignItems:"center", gap:12 }}>
              <div style={{ width:44, height:44, borderRadius:12, background:`${h.color||"#6C63FF"}22`, display:"flex", alignItems:"center", justifyContent:"center", fontSize:24 }}>{h.icon||"🌟"}</div>
              <div style={{ flex:1 }}>
                <div style={{ fontWeight:600, fontSize:14 }}>{h.name}</div>
                <div style={{ fontSize:11, color:"rgba(255,255,255,0.35)", marginTop:2 }}>
                  🔥 {h.streak||0} day streak · {h.log?.length||0} total logs
                </div>
                {/* Mini streak bar — last 7 days */}
                <div style={{ display:"flex", gap:3, marginTop:6 }}>
                  {Array.from({length:7}).map((_,i) => {
                    const d = new Date(Date.now() - (6-i)*86400000).toISOString().slice(0,10);
                    const did = h.log?.includes(d);
                    return <div key={i} style={{ width:16, height:16, borderRadius:4, background:did?h.color:"rgba(255,255,255,0.07)" }} />;
                  })}
                </div>
              </div>
              <div style={{ display:"flex", flexDirection:"column", gap:6, alignItems:"flex-end" }}>
                <Btn small color={doneToday?"rgba(255,255,255,0.1)":h.color||"#6C63FF"}
                  style={{ color:doneToday?"rgba(255,255,255,0.4)":"#fff" }}
                  onClick={() => checkHabit(h)}>
                  {doneToday ? "Undo ↩" : "Log ✓"}
                </Btn>
                <div style={{ display:"flex", gap:8, alignItems:"center" }}>
                  <button onClick={() => toggleHabitPrivacy(h.id, !h.isPublic)} style={{ background:"none", border:"none", cursor:"pointer", fontSize:11, color:h.isPublic!==false?"#55EFC4":"rgba(255,255,255,0.3)", padding:0 }}>
                    {h.isPublic!==false?"🌐":"🔒"}
                  </button>
                  <button onClick={() => { if(window.confirm(`Delete "${h.name}"?`)) deleteHabit(h.id); }} style={{ background:"none", border:"none", cursor:"pointer", fontSize:13, color:"rgba(255,107,107,0.5)", padding:0, lineHeight:1 }} title="Delete habit">✕</button>
                </div>
              </div>
            </div>
          </Card>
        );
      })}
    </div>
  );
}

export { aiAuditTask, aiSuggestXP };

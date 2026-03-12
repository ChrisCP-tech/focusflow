// src/components/Pages.jsx
import { useState } from "react";
import { Card, Btn, Input, Tag, Toggle } from "./UI";
import { MOODS, TAGS, HABIT_ICONS, HABIT_COLORS, today } from "../utils";

/* ═══════════════════════════════ HOME PAGE ════════════════════════════════ */
export function HomePage({ profile, tasks, habits, moodLog, onMood, onCheckHabit, onCompleteTask, setPage }) {
  const todayStr   = today();
  const todayMood  = moodLog.find(m => m.date === todayStr);
  const doneTasks  = tasks.filter(t => t.done).length;
  const doneHabits = habits.filter(h => h.log?.includes(todayStr)).length;
  const topTasks   = tasks.filter(t => !t.done).slice(0, 3);
  const topHabits  = habits.filter(h => !h.log?.includes(todayStr)).slice(0, 3);

  return (
    <div className="fadeUp">
      <div style={{ marginBottom: 20 }}>
        <h2 style={{ fontFamily: "'Syne',sans-serif", fontWeight: 800, fontSize: 26 }}>
          Hey {profile.name} {profile.avatar}
        </h2>
        <p style={{ color: "rgba(255,255,255,0.4)", fontSize: 14, marginTop: 4 }}>
          {doneTasks > 0 ? `You crushed ${doneTasks} task${doneTasks > 1 ? "s" : ""} today 💪` : "Ready to have a great day?"}
        </p>
      </div>

      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: 10, marginBottom: 20 }}>
        {[
          { label: "Streak",  val: `${profile.streak || 0}🔥`, color: "#FDCB6E" },
          { label: "Tasks",   val: `${doneTasks} done`,          color: "#55EFC4" },
          { label: "Habits",  val: `${doneHabits}/${habits.length}`, color: "#6C63FF" },
        ].map(s => (
          <Card key={s.label} style={{ textAlign: "center", padding: "12px 8px" }}>
            <div style={{ fontFamily: "'Syne',sans-serif", fontWeight: 800, fontSize: 18, color: s.color }}>{s.val}</div>
            <div style={{ fontSize: 11, color: "rgba(255,255,255,0.35)", marginTop: 2 }}>{s.label}</div>
          </Card>
        ))}
      </div>

      {!todayMood ? (
        <Card style={{ marginBottom: 20 }}>
          <div style={{ fontSize: 13, fontWeight: 600, marginBottom: 12 }}>How are you feeling? 🌡</div>
          <div style={{ display: "flex", gap: 6, justifyContent: "space-between" }}>
            {MOODS.map(m => (
              <button key={m.l} onClick={() => onMood(m)} style={{
                flex: 1, background: `${m.c}18`, border: `1px solid ${m.c}40`,
                borderRadius: 10, padding: "8px 4px", cursor: "pointer",
                display: "flex", flexDirection: "column", alignItems: "center", gap: 3, transition: "all 0.15s"
              }}
                onMouseEnter={e => e.currentTarget.style.background = `${m.c}30`}
                onMouseLeave={e => e.currentTarget.style.background = `${m.c}18`}
              >
                <div style={{ fontSize: 20 }}>{m.e}</div>
                <div style={{ fontSize: 9, color: m.c, fontWeight: 700, textAlign: "center", lineHeight: 1.2 }}>{m.l}</div>
              </button>
            ))}
          </div>
        </Card>
      ) : (
        <Card style={{ marginBottom: 20, display: "flex", alignItems: "center", gap: 12 }}>
          <div style={{ fontSize: 32 }}>{todayMood.mood.e}</div>
          <div>
            <div style={{ fontWeight: 600, fontSize: 14 }}>Feeling {todayMood.mood.l}</div>
            <div style={{ fontSize: 12, color: "rgba(255,255,255,0.4)" }}>Mood logged ✓</div>
          </div>
        </Card>
      )}

      {topTasks.length > 0 && (
        <div style={{ marginBottom: 20 }}>
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 10 }}>
            <div style={{ fontFamily: "'Syne',sans-serif", fontWeight: 700, fontSize: 14 }}>Next Up ✅</div>
            <button onClick={() => setPage("tasks")} style={{ background: "none", border: "none", color: "#6C63FF", fontSize: 12, fontWeight: 600, cursor: "pointer" }}>See all →</button>
          </div>
          {topTasks.map(t => <MiniTask key={t.id} task={t} onComplete={onCompleteTask} />)}
        </div>
      )}

      {topHabits.length > 0 && (
        <div style={{ marginBottom: 20 }}>
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 10 }}>
            <div style={{ fontFamily: "'Syne',sans-serif", fontWeight: 700, fontSize: 14 }}>Habits Today 🔥</div>
            <button onClick={() => setPage("habits")} style={{ background: "none", border: "none", color: "#6C63FF", fontSize: 12, fontWeight: 600, cursor: "pointer" }}>See all →</button>
          </div>
          {topHabits.map(h => <MiniHabit key={h.id} habit={h} onCheck={onCheckHabit} />)}
        </div>
      )}
    </div>
  );
}

function MiniTask({ task, onComplete }) {
  const colors = { high: "#FF6B6B", medium: "#FDCB6E", low: "#55EFC4" };
  return (
    <div onClick={() => onComplete(task)} style={{
      display: "flex", alignItems: "center", gap: 12, padding: "10px 14px",
      background: "rgba(255,255,255,0.04)", border: "1px solid rgba(255,255,255,0.07)",
      borderLeft: `3px solid ${colors[task.priority] || "#6C63FF"}`,
      borderRadius: 10, marginBottom: 6, cursor: "pointer"
    }}>
      <div style={{ width: 20, height: 20, borderRadius: 6, border: "2px solid rgba(255,255,255,0.2)", flexShrink: 0 }} />
      <div style={{ flex: 1 }}>
        <div style={{ fontSize: 13, fontWeight: 500 }}>{task.title}</div>
        {task.tag && <Tag label={`#${task.tag}`} color="#6C63FF" />}
      </div>
      <div style={{ fontSize: 11, color: "#FDCB6E", fontWeight: 700 }}>+{task.xp || 20}</div>
    </div>
  );
}

function MiniHabit({ habit, onCheck }) {
  return (
    <div style={{
      display: "flex", alignItems: "center", gap: 12, padding: "10px 14px",
      background: "rgba(255,255,255,0.04)", border: "1px solid rgba(255,255,255,0.07)",
      borderLeft: `3px solid ${habit.color || "#FDCB6E"}`,
      borderRadius: 10, marginBottom: 6
    }}>
      <div style={{ fontSize: 22 }}>{habit.icon}</div>
      <div style={{ flex: 1 }}>
        <div style={{ fontSize: 13, fontWeight: 500 }}>{habit.name}</div>
        <div style={{ fontSize: 11, color: "rgba(255,255,255,0.4)" }}>🔥 {habit.streak || 0} day streak</div>
      </div>
      <Btn small color={habit.color || "#FDCB6E"} style={{ color: habit.color === "#FDCB6E" ? "#0B0D17" : "#fff" }}
        onClick={() => onCheck(habit)}>Log it</Btn>
    </div>
  );
}

/* ═══════════════════════════════ TASKS PAGE ═══════════════════════════════ */
export function TasksPage({ tasks, addTask, toggleTask, deleteTask, toggleTaskPrivacy }) {
  const [show,   setShow]   = useState(false);
  const [filter, setFilter] = useState("all");
  const [form,   setForm]   = useState({ title: "", desc: "", priority: "medium", tag: "", xp: 20, dueTime: "", isPublic: true });

  function handleAdd() {
    if (!form.title.trim()) return;
    addTask(form);
    setForm({ title: "", desc: "", priority: "medium", tag: "", xp: 20, dueTime: "", isPublic: true });
    setShow(false);
  }

  const done    = tasks.filter(t => t.done).length;
  const visible = tasks.filter(t => {
    if (filter === "done") return t.done;
    if (filter === "todo") return !t.done;
    if (filter === "public") return t.isPublic !== false;
    if (filter === "private") return t.isPublic === false;
    if (TAGS.includes(filter)) return t.tag === filter;
    return true;
  });

  return (
    <div className="fadeUp">
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 16 }}>
        <div>
          <h2 style={{ fontFamily: "'Syne',sans-serif", fontWeight: 800, fontSize: 22 }}>Tasks ✅</h2>
          <div style={{ fontSize: 12, color: "rgba(255,255,255,0.4)" }}>{done}/{tasks.length} complete</div>
        </div>
        <Btn color="#6C63FF" onClick={() => setShow(v => !v)}>{show ? "✕ Cancel" : "+ Add Task"}</Btn>
      </div>

      {show && (
        <Card style={{ marginBottom: 16 }}>
          <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
            <Input value={form.title} onChange={v => setForm(f => ({ ...f, title: v }))} placeholder="What needs to be done?" />
            <Input value={form.desc}  onChange={v => setForm(f => ({ ...f, desc: v }))}  placeholder="Notes (optional)" multiline />
            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 8 }}>
              <div>
                <div style={{ fontSize: 11, color: "rgba(255,255,255,0.4)", marginBottom: 4 }}>PRIORITY</div>
                <select value={form.priority} onChange={e => setForm(f => ({ ...f, priority: e.target.value }))} style={selectStyle}>
                  <option value="high">🔴 High</option>
                  <option value="medium">🟡 Medium</option>
                  <option value="low">🟢 Low</option>
                </select>
              </div>
              <div>
                <div style={{ fontSize: 11, color: "rgba(255,255,255,0.4)", marginBottom: 4 }}>TAG</div>
                <select value={form.tag} onChange={e => setForm(f => ({ ...f, tag: e.target.value }))} style={selectStyle}>
                  <option value="">None</option>
                  {TAGS.map(t => <option key={t} value={t}>{t}</option>)}
                </select>
              </div>
              <div>
                <div style={{ fontSize: 11, color: "rgba(255,255,255,0.4)", marginBottom: 4 }}>XP REWARD</div>
                <select value={form.xp} onChange={e => setForm(f => ({ ...f, xp: Number(e.target.value) }))} style={selectStyle}>
                  {[10, 20, 30, 50, 100].map(x => <option key={x} value={x}>+{x} XP</option>)}
                </select>
              </div>
              <div>
                <div style={{ fontSize: 11, color: "rgba(255,255,255,0.4)", marginBottom: 4 }}>DUE TIME</div>
                <input type="time" value={form.dueTime} onChange={e => setForm(f => ({ ...f, dueTime: e.target.value }))} style={selectStyle} />
              </div>
            </div>
            {/* Privacy toggle */}
            <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", padding: "8px 0", borderTop: "1px solid rgba(255,255,255,0.06)" }}>
              <div>
                <div style={{ fontSize: 13, fontWeight: 600 }}>{form.isPublic ? "🌐 Public" : "🔒 Private"}</div>
                <div style={{ fontSize: 11, color: "rgba(255,255,255,0.35)" }}>{form.isPublic ? "Friends can see this" : "Only you can see this"}</div>
              </div>
              <PrivacyToggle isPublic={form.isPublic} onChange={v => setForm(f => ({ ...f, isPublic: v }))} />
            </div>
            <Btn color="#6C63FF" onClick={handleAdd}>Add Task ✅</Btn>
          </div>
        </Card>
      )}

      <div style={{ display: "flex", gap: 6, marginBottom: 14, overflowX: "auto", paddingBottom: 4 }}>
        {["all", "todo", "done", "public", "private", ...TAGS].map(f => (
          <button key={f} onClick={() => setFilter(f)} style={{
            padding: "5px 12px", borderRadius: 20, fontSize: 12, fontWeight: 600,
            background: filter === f ? "#6C63FF" : "rgba(255,255,255,0.06)",
            border: "none", color: filter === f ? "#fff" : "rgba(255,255,255,0.5)",
            cursor: "pointer", whiteSpace: "nowrap", transition: "all 0.15s"
          }}>{f}</button>
        ))}
      </div>

      {visible.length === 0 && (
        <div style={{ textAlign: "center", padding: "40px 0", color: "rgba(255,255,255,0.2)" }}>
          <div style={{ fontSize: 40, marginBottom: 8 }}>🎉</div>
          <div>All clear!</div>
        </div>
      )}
      {visible.map(t => <TaskCard key={t.id} task={t} onToggle={toggleTask} onDelete={deleteTask} onPrivacyToggle={toggleTaskPrivacy} />)}
    </div>
  );
}

function TaskCard({ task, onToggle, onDelete, onPrivacyToggle }) {
  const colors = { high: "#FF6B6B", medium: "#FDCB6E", low: "#55EFC4" };
  const isPublic = task.isPublic !== false;
  return (
    <div style={{
      display: "flex", alignItems: "flex-start", gap: 12, padding: "12px 14px",
      background: task.done ? "rgba(255,255,255,0.02)" : "rgba(255,255,255,0.05)",
      border: `1px solid ${task.done ? "rgba(255,255,255,0.04)" : "rgba(255,255,255,0.09)"}`,
      borderLeft: `3px solid ${task.done ? "rgba(255,255,255,0.07)" : colors[task.priority] || "#6C63FF"}`,
      borderRadius: 12, marginBottom: 8, opacity: task.done ? 0.5 : 1, transition: "all 0.2s"
    }}>
      <button onClick={() => onToggle(task.id, !task.done)} style={{
        width: 22, height: 22, borderRadius: 6, flexShrink: 0, marginTop: 1,
        border: `2px solid ${task.done ? "#55EFC4" : "rgba(255,255,255,0.25)"}`,
        background: task.done ? "#55EFC4" : "transparent", cursor: "pointer",
        display: "flex", alignItems: "center", justifyContent: "center", padding: 0, transition: "all 0.15s"
      }}>
        {task.done && <span style={{ color: "#0B0D17", fontSize: 11, fontWeight: 900 }}>✓</span>}
      </button>
      <div style={{ flex: 1 }}>
        <div style={{ fontSize: 14, fontWeight: 500, color: task.done ? "rgba(255,255,255,0.35)" : "#E8E9F3", textDecoration: task.done ? "line-through" : "none", marginBottom: 4 }}>{task.title}</div>
        {task.desc && <div style={{ fontSize: 12, color: "rgba(255,255,255,0.35)", marginBottom: 4 }}>{task.desc}</div>}
        <div style={{ display: "flex", gap: 6, flexWrap: "wrap", alignItems: "center" }}>
          <span style={{ background: "rgba(253,203,110,0.12)", color: "#FDCB6E", fontSize: 10, fontWeight: 700, padding: "2px 6px", borderRadius: 4 }}>+{task.xp || 20}XP</span>
          {task.dueTime && <span style={{ background: "rgba(108,99,255,0.15)", color: "#A29BFE", fontSize: 10, padding: "2px 6px", borderRadius: 4 }}>⏰ {task.dueTime}</span>}
          {task.tag && <span style={{ background: "rgba(255,255,255,0.06)", color: "rgba(255,255,255,0.4)", fontSize: 10, padding: "2px 6px", borderRadius: 4 }}>#{task.tag}</span>}
          <button onClick={() => onPrivacyToggle(task.id, !isPublic)} style={{ background: "none", border: "none", cursor: "pointer", fontSize: 11, color: isPublic ? "#55EFC4" : "rgba(255,255,255,0.3)", padding: 0 }}>
            {isPublic ? "🌐 public" : "🔒 private"}
          </button>
        </div>
      </div>
      <button onClick={() => onDelete(task.id)} style={{ background: "none", border: "none", color: "rgba(255,255,255,0.15)", cursor: "pointer", fontSize: 14, padding: 4, flexShrink: 0, transition: "color 0.15s" }}
        onMouseEnter={e => e.currentTarget.style.color = "#FF6B6B"}
        onMouseLeave={e => e.currentTarget.style.color = "rgba(255,255,255,0.15)"}>✕</button>
    </div>
  );
}

/* ═══════════════════════════════ HABITS PAGE ══════════════════════════════ */
export function HabitsPage({ habits, addHabit, checkHabit, deleteHabit, toggleHabitPrivacy }) {
  const [show, setShow] = useState(false);
  const [form, setForm] = useState({ name: "", icon: "🌟", color: "#6C63FF", freq: "daily", isPublic: true });
  const todayStr = today();

  function handleAdd() {
    if (!form.name.trim()) return;
    addHabit(form);
    setForm({ name: "", icon: "🌟", color: "#6C63FF", freq: "daily", isPublic: true });
    setShow(false);
  }

  const doneCount = habits.filter(h => h.log?.includes(todayStr)).length;

  return (
    <div className="fadeUp">
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 16 }}>
        <div>
          <h2 style={{ fontFamily: "'Syne',sans-serif", fontWeight: 800, fontSize: 22 }}>Habits 🔥</h2>
          <div style={{ fontSize: 12, color: "rgba(255,255,255,0.4)" }}>{doneCount}/{habits.length} done today</div>
        </div>
        <Btn color="#FDCB6E" style={{ color: "#0B0D17" }} onClick={() => setShow(v => !v)}>{show ? "✕" : "+ Add"}</Btn>
      </div>

      {show && (
        <Card style={{ marginBottom: 16 }}>
          <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
            <Input value={form.name} onChange={v => setForm(f => ({ ...f, name: v }))} placeholder="Habit name" />
            <div>
              <div style={{ fontSize: 11, color: "rgba(255,255,255,0.4)", marginBottom: 6 }}>ICON</div>
              <div style={{ display: "flex", flexWrap: "wrap", gap: 6 }}>
                {HABIT_ICONS.map(ic => (
                  <button key={ic} onClick={() => setForm(f => ({ ...f, icon: ic }))} style={{
                    width: 36, height: 36, borderRadius: 8, fontSize: 18, cursor: "pointer",
                    border: `2px solid ${form.icon === ic ? form.color : "rgba(255,255,255,0.08)"}`,
                    background: form.icon === ic ? `${form.color}22` : "rgba(255,255,255,0.04)"
                  }}>{ic}</button>
                ))}
              </div>
            </div>
            <div>
              <div style={{ fontSize: 11, color: "rgba(255,255,255,0.4)", marginBottom: 6 }}>COLOR</div>
              <div style={{ display: "flex", gap: 6, flexWrap: "wrap" }}>
                {HABIT_COLORS.map(c => (
                  <button key={c} onClick={() => setForm(f => ({ ...f, color: c }))} style={{
                    width: 28, height: 28, borderRadius: "50%", background: c, cursor: "pointer",
                    border: `3px solid ${form.color === c ? "#fff" : "transparent"}`
                  }} />
                ))}
              </div>
            </div>
            {/* Privacy toggle */}
            <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", padding: "8px 0", borderTop: "1px solid rgba(255,255,255,0.06)" }}>
              <div>
                <div style={{ fontSize: 13, fontWeight: 600 }}>{form.isPublic ? "🌐 Public" : "🔒 Private"}</div>
                <div style={{ fontSize: 11, color: "rgba(255,255,255,0.35)" }}>{form.isPublic ? "Friends can see this" : "Only you can see this"}</div>
              </div>
              <PrivacyToggle isPublic={form.isPublic} onChange={v => setForm(f => ({ ...f, isPublic: v }))} />
            </div>
            <Btn color={form.color} style={{ color: form.color === "#FDCB6E" ? "#0B0D17" : "#fff" }} onClick={handleAdd}>Add Habit</Btn>
          </div>
        </Card>
      )}

      {habits.map(h => {
        const done = h.log?.includes(todayStr);
        const isPublic = h.isPublic !== false;
        const weekDays = Array.from({ length: 7 }).map((_, i) => {
          const d = new Date(); d.setDate(d.getDate() - 6 + i);
          return d.toISOString().slice(0, 10);
        });
        return (
          <Card key={h.id} style={{ marginBottom: 10, opacity: done ? 0.65 : 1, transition: "opacity 0.2s" }}>
            <div style={{ display: "flex", alignItems: "center", gap: 12, marginBottom: 10 }}>
              <div style={{
                width: 44, height: 44, borderRadius: 12,
                background: `${h.color || "#6C63FF"}22`, border: `1px solid ${h.color || "#6C63FF"}40`,
                display: "flex", alignItems: "center", justifyContent: "center", fontSize: 22
              }}>{h.icon}</div>
              <div style={{ flex: 1 }}>
                <div style={{ fontWeight: 600, fontSize: 15 }}>{h.name}</div>
                <div style={{ display: "flex", gap: 8, alignItems: "center", marginTop: 2 }}>
                  <div style={{ fontSize: 12, color: h.color || "#FDCB6E", fontWeight: 700 }}>🔥 {h.streak || 0} day streak</div>
                  <button onClick={() => toggleHabitPrivacy(h.id, !isPublic)} style={{ background: "none", border: "none", cursor: "pointer", fontSize: 11, color: isPublic ? "#55EFC4" : "rgba(255,255,255,0.3)", padding: 0 }}>
                    {isPublic ? "🌐" : "🔒"}
                  </button>
                </div>
              </div>
              {!done
                ? <Btn small color={h.color || "#FDCB6E"} style={{ color: h.color === "#FDCB6E" ? "#0B0D17" : "#fff" }} onClick={() => checkHabit(h)}>Log it!</Btn>
                : <div style={{ fontSize: 24 }}>✅</div>
              }
              <button onClick={() => deleteHabit(h.id)} style={{ background: "none", border: "none", color: "rgba(255,255,255,0.15)", cursor: "pointer", fontSize: 14, padding: 4 }}
                onMouseEnter={e => e.currentTarget.style.color = "#FF6B6B"}
                onMouseLeave={e => e.currentTarget.style.color = "rgba(255,255,255,0.15)"}>✕</button>
            </div>
            <div style={{ display: "flex", gap: 4 }}>
              {weekDays.map((d, i) => {
                const doneDay = h.log?.includes(d);
                const label   = ["S","M","T","W","T","F","S"][new Date(d + "T12:00:00").getDay()];
                return (
                  <div key={i} style={{ flex: 1, display: "flex", flexDirection: "column", alignItems: "center", gap: 3 }}>
                    <div style={{ width: "100%", height: 6, borderRadius: 3, background: doneDay ? (h.color || "#6C63FF") : "rgba(255,255,255,0.07)" }} />
                    <div style={{ fontSize: 9, color: "rgba(255,255,255,0.22)" }}>{label}</div>
                  </div>
                );
              })}
            </div>
          </Card>
        );
      })}
    </div>
  );
}

/* ─── Privacy Toggle ─────────────────────────────────────────────────────── */
export function PrivacyToggle({ isPublic, onChange }) {
  return (
    <button onClick={() => onChange(!isPublic)} style={{
      width: 48, height: 26, borderRadius: 13, border: "none", cursor: "pointer",
      background: isPublic ? "#55EFC4" : "rgba(255,255,255,0.15)", transition: "all 0.2s", position: "relative", flexShrink: 0
    }}>
      <div style={{ position: "absolute", top: 3, left: isPublic ? 24 : 3, width: 20, height: 20, borderRadius: "50%", background: "#fff", transition: "left 0.2s" }} />
    </button>
  );
}

const selectStyle = {
  background: "rgba(255,255,255,0.06)", border: "1px solid rgba(255,255,255,0.1)",
  borderRadius: 8, padding: "8px 10px", color: "#E8E9F3", width: "100%", fontSize: 13, fontFamily: "inherit"
};

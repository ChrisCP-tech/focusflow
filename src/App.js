// src/App.js
import { useState, useEffect, useCallback } from "react";
import { doc, setDoc, serverTimestamp } from "firebase/firestore";
import { db } from "./firebase/config";
import { useAuth }         from "./hooks/useAuth";
import { useTasks, useHabits, useFeed, useSquadMembers, useMoodLog } from "./hooks/useData";
import LoginScreen         from "./components/LoginScreen";
import Onboard             from "./components/Onboard";
import { TopBar, BottomNav } from "./components/Nav";
import { XPToast, Confetti } from "./components/UI";
import { HomePage, TasksPage, HabitsPage } from "./components/Pages";
import { FocusPage, SocialPage, ProfilePage } from "./components/MorePages";

const css = `
  @import url('https://fonts.googleapis.com/css2?family=Syne:wght@400;600;700;800&family=DM+Sans:wght@300;400;500;600&display=swap');
  *, *::before, *::after { box-sizing: border-box; margin: 0; padding: 0; }
  body { background: #0B0D17; color: #E8E9F3; font-family: 'DM Sans', sans-serif; min-height: 100vh; -webkit-font-smoothing: antialiased; }
  ::-webkit-scrollbar { width: 4px; }
  ::-webkit-scrollbar-track { background: transparent; }
  ::-webkit-scrollbar-thumb { background: rgba(255,255,255,0.12); border-radius: 4px; }
  select, input, textarea, button { font-family: 'DM Sans', sans-serif; }
  @keyframes fadeUp    { from { opacity: 0; transform: translateY(14px); } to { opacity: 1; transform: translateY(0); } }
  @keyframes confetti  { 0% { transform: translateY(-10px) rotate(0deg); opacity: 1; } 100% { transform: translateY(90px) rotate(720deg); opacity: 0; } }
  @keyframes spin      { to { transform: rotate(360deg); } }
  .fadeUp { animation: fadeUp 0.35s ease both; }
`;
if (!document.getElementById("ff-styles")) {
  const el = document.createElement("style");
  el.id = "ff-styles";
  el.textContent = css;
  document.head.appendChild(el);
}

function getRoomId() {
  const url = new URLSearchParams(window.location.search).get("room");
  return url || "global_squad_v1";
}

const STARTER_HABITS = [
  { name: "Drink water",       icon: "💧", color: "#74B9FF", freq: "daily", isPublic: true },
  { name: "Move your body",    icon: "🏃", color: "#55EFC4", freq: "daily", isPublic: true },
  { name: "Wind-down routine", icon: "😴", color: "#A29BFE", freq: "daily", isPublic: true },
];

export default function App() {
  const { user, profile, login, logout, updateProfile } = useAuth();
  const uid    = user?.uid;
  const roomId = getRoomId();

  const { tasks,  addTask,   toggleTask,  deleteTask,  toggleTaskPrivacy  } = useTasks(uid);
  const { habits, addHabit,  checkHabit,  deleteHabit, toggleHabitPrivacy } = useHabits(uid);
  const { feed,   postToFeed, likePost, commentOnPost                      } = useFeed(roomId);
  const { members, joinRoom, updateMemberStats                             } = useSquadMembers(roomId);
  const { moodLog, logMood                                                 } = useMoodLog(uid);

  const [page,     setPage]    = useState("home");
  const [xpToast,  setXpToast] = useState(null);
  const [confetti, setConfetti] = useState(false);
  const [seeded,   setSeeded]  = useState(false);

  useEffect(() => {
    if (!profile || !uid || seeded) return;
    setSeeded(true);
    joinRoom(roomId, profile);
    if (habits.length === 0) {
      STARTER_HABITS.forEach(h => addHabit(h));
    }
  }, [profile, uid]);

  useEffect(() => {
    if (!profile || !uid) return;
    updateMemberStats(roomId, uid, profile.xp || 0, profile.streak || 0);
  }, [profile?.xp, profile?.streak]);

  const awardXP = useCallback(async (amount, label) => {
    if (!uid || !profile) return;
    const newXP = (profile.xp || 0) + amount;
    await updateProfile({ xp: newXP });
    setXpToast(amount);
    if (amount >= 40) setConfetti(true);
    await feedPost(`earned ${amount} XP for: ${label} ✨`, "xp");
  }, [uid, profile]);

  const feedPost = useCallback(async (text, type = "update") => {
    if (!profile) return;
    await postToFeed(roomId, {
      userId: uid, userName: profile.name, userAvatar: profile.avatar, text, type
    });
  }, [uid, profile, roomId]);

  async function handleCompleteTask(task) {
    if (task.done) { await toggleTask(task.id, false); return; }
    await toggleTask(task.id, true);
    await awardXP(task.xp || 20, task.title);
    await feedPost(`completed task: "${task.title}" ✅`, "task");
  }

  async function handleCheckHabit(habit) {
    const streak = await checkHabit(habit);
    if (streak === false) return;
    await awardXP(10 + (streak || 0) * 2, `habit: ${habit.name}`);
    await feedPost(`completed habit: "${habit.name}" 🔥 (${streak} day streak!)`, "habit");
  }

  async function handleMood(mood) {
    await logMood(uid, mood);
    await feedPost(`feeling ${mood.e} ${mood.l} today`, "mood");
  }

  async function handleLike(postId, liked) {
    await likePost(roomId, postId, uid, liked);
  }

  async function handleComment(roomId, postId, comment) {
    await commentOnPost(roomId, postId, comment);
  }

  async function handleFocusComplete() {
    await awardXP(40, "focus session");
    await feedPost("just finished a focus session 🎯", "xp");
  }

  async function handleCreate(data) {
    await updateProfile(data);
    await postToFeed(roomId, {
      userId: uid, userName: data.name,
      userAvatar: data.avatar, text: "just joined FocusFlow! 👋", type: "join"
    });
    await joinRoom(roomId, { ...profile, ...data });
  }

  if (user === undefined) {
    return (
      <div style={{ display: "flex", alignItems: "center", justifyContent: "center", height: "100vh", flexDirection: "column", gap: 16 }}>
        <div style={{ fontSize: 40, animation: "spin 1s linear infinite" }}>🌀</div>
        <div style={{ fontFamily: "'Syne',sans-serif", fontWeight: 700, color: "rgba(255,255,255,0.4)", fontSize: 14 }}>Loading…</div>
      </div>
    );
  }

  if (!user) return <LoginScreen onLogin={login} />;
  if (user && !profile?.name) return <Onboard firebaseUser={user} onCreate={handleCreate} />;

  return (
    <div style={{ maxWidth: 480, margin: "0 auto", minHeight: "100vh", display: "flex", flexDirection: "column" }}>
      {xpToast  && <XPToast xp={xpToast} onDone={() => setXpToast(null)} />}
      {confetti && <Confetti onDone={() => setConfetti(false)} />}

      <TopBar profile={profile} page={page} />

      <div style={{ flex: 1, padding: "16px 16px 90px", overflowY: "auto" }}>
        {page === "home" && (
          <HomePage
            profile={profile} tasks={tasks} habits={habits} moodLog={moodLog}
            onMood={handleMood} onCheckHabit={handleCheckHabit}
            onCompleteTask={handleCompleteTask} setPage={setPage}
          />
        )}
        {page === "tasks" && (
          <TasksPage tasks={tasks} addTask={addTask} toggleTask={async (id, done) => {
            const task = tasks.find(t => t.id === id);
            if (task) await handleCompleteTask({ ...task, done: !done });
          }} deleteTask={deleteTask} toggleTaskPrivacy={toggleTaskPrivacy} />
        )}
        {page === "habits" && (
          <HabitsPage habits={habits} addHabit={addHabit} checkHabit={handleCheckHabit} deleteHabit={deleteHabit} toggleHabitPrivacy={toggleHabitPrivacy} />
        )}
        {page === "focus"  && <FocusPage onComplete={handleFocusComplete} profile={profile} />}
        {page === "social" && (
          <SocialPage
            feed={feed} members={members} profile={profile}
            roomId={roomId} onPost={feedPost} onLike={handleLike} onComment={handleComment}
            uid={uid} addTask={addTask} addHabit={addHabit}
          />
        )}
        {page === "profile" && (
          <ProfilePage
            profile={profile} updateProfile={updateProfile}
            tasks={tasks} habits={habits} moodLog={moodLog}
            onLogout={logout} uid={uid}
          />
        )}
      </div>

      <BottomNav page={page} setPage={setPage} />
    </div>
  );
}

// src/App.js
import { useState, useEffect, useCallback } from "react";
import { useAuth }         from "./hooks/useAuth";
import { useTasks, useHabits, useFeed, useSquadMembers, useMoodLog, useFriends, useTaskInvites, useGold } from "./hooks/useData";
import LoginScreen         from "./components/LoginScreen";
import Onboard             from "./components/Onboard";
import { TopBar, BottomNav } from "./components/Nav";
import { XPToast, Confetti } from "./components/UI";
import { HomePage, TasksPage, HabitsPage, aiAuditTask } from "./components/Pages";
import { FocusPage, SocialPage, ProfilePage, ProfileViewer } from "./components/MorePages";
import { SquadsPage } from "./components/SquadsPage";
import { getLevel, getLevelUnlocks } from "./utils";

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
  const el = document.createElement("style"); el.id = "ff-styles"; el.textContent = css; document.head.appendChild(el);
}

function getRoomId() { return new URLSearchParams(window.location.search).get("room") || "global_squad_v1"; }

const STARTER_HABITS = [
  { name:"Drink water",       icon:"💧", color:"#74B9FF", freq:"daily", isPublic:true },
  { name:"Move your body",    icon:"🏃", color:"#55EFC4", freq:"daily", isPublic:true },
  { name:"Wind-down routine", icon:"😴", color:"#A29BFE", freq:"daily", isPublic:true },
];

export default function App() {
  const { user, profile, login, logout, updateProfile } = useAuth();
  const uid    = user?.uid;
  const roomId = getRoomId();

  const { tasks, addTask, toggleTask, deleteTask, toggleTaskPrivacy, addSubtask, toggleSubtask } = useTasks(uid);
  const { habits, addHabit, checkHabit, deleteHabit, toggleHabitPrivacy } = useHabits(uid);
  const { feed, postToFeed, likePost, commentOnPost }    = useFeed(roomId);
  const { members, joinRoom, updateMemberStats }         = useSquadMembers(roomId);
  const { moodLog, logMood }                             = useMoodLog(uid);
  const { friends, sendFriendRequest, acceptFriend, removeFriend, inviteFriendToTask } = useFriends(uid);
  const taskInvites = useTaskInvites(uid);
  const { rewards, addReward, redeemReward, deleteReward, giftGold } = useGold(uid);

  const [page,        setPage]        = useState("home");
  const [xpToast,     setXpToast]     = useState(null);
  const [goldToast,   setGoldToast]   = useState(null);
  const [confetti,    setConfetti]    = useState(false);
  const [seeded,      setSeeded]      = useState(false);
  const [viewProfile, setViewProfile] = useState(null); // uid to view
  const [auditMsg,    setAuditMsg]    = useState(null);

  useEffect(() => {
    if (!profile || !uid || seeded) return;
    setSeeded(true);
    joinRoom(roomId, profile);
    if (habits.length === 0) STARTER_HABITS.forEach(h => addHabit(h));
  }, [profile, uid]);

  useEffect(() => {
    if (!profile || !uid) return;
    updateMemberStats(roomId, uid, profile.xp||0, profile.streak||0, profile.gold||0);
  }, [profile?.xp, profile?.streak, profile?.gold]);

  const awardXP = useCallback(async (amount, gold, label) => {
    if (!uid || !profile) return;
    const newXP   = (profile.xp   || 0) + amount;
    const newGold = (profile.gold || 0) + gold;
    const oldLvl  = getLevel(profile.xp || 0);
    const newLvl  = getLevel(newXP);
    await updateProfile({ xp: newXP, gold: newGold });
    setXpToast({ xp: amount, gold });
    if (amount >= 40) setConfetti(true);
    if (newLvl > oldLvl) {
      setTimeout(() => setAuditMsg(`🎉 Level Up! You're now Level ${newLvl} — ${LEVEL_NAMES_LOCAL[newLvl-1]}!`), 800);
    }
    await feedPost(`earned +${amount}XP & +${gold}🪙 for: ${label} ✨`, "xp");
  }, [uid, profile]);

  const feedPost = useCallback(async (text, type = "update") => {
    if (!profile) return;
    await postToFeed(roomId, { userId: uid, userName: profile.name, userAvatar: profile.avatar, text, type });
  }, [uid, profile, roomId]);

  async function handleCompleteTask(task) {
    if (task.done) { await toggleTask(task.id, false); return; }

    // AI audit first
    const audit = await aiAuditTask({ ...task, createdAtMs: task.createdAtMs });
    const adjustedGold = Math.round((task.gold || 10) * (audit.goldMultiplier ?? 1));

    if (!audit.approved || audit.goldMultiplier === 0) {
      setAuditMsg(`⚠️ Task flagged: ${audit.reason}. No gold awarded.`);
      await toggleTask(task.id, true);
      await awardXP(task.xp || 20, 0, task.title);
      return;
    }

    if (audit.goldMultiplier < 1) {
      setAuditMsg(`⚠️ ${audit.reason}. Reduced gold: ${adjustedGold}🪙`);
    }

    await toggleTask(task.id, true);
    await awardXP(task.xp || 20, adjustedGold, task.title);
    await feedPost(`completed task: "${task.title}" ✅`, "task");
  }

  async function handleCheckHabit(habit) {
    const result = await checkHabit(habit);
    if (result === false) return;
    if (result === "undone") {
      setAuditMsg("Habit unchecked ↩");
      return;
    }
    const goldBonus = Math.min(5 + Math.floor(result * 1.5), 30);
    await awardXP(10 + (result || 0) * 2, goldBonus, `habit: ${habit.name}`);
    await feedPost(`completed habit: "${habit.name}" 🔥 (${result} day streak!)`, "habit");
  }

  async function handleMood(mood) {
    await logMood(uid, mood);
    await feedPost(`feeling ${mood.e} ${mood.l} today`, "mood");
  }

  async function handleFocusComplete() {
    await awardXP(40, 20, "focus session");
    await feedPost("just finished a focus session 🎯", "xp");
  }

  async function handleCreate(data) {
    await updateProfile(data);
    await postToFeed(roomId, { userId: uid, userName: data.name, userAvatar: data.avatar, text: "just joined FocusFlow! 👋", type: "join" });
    await joinRoom(roomId, { ...profile, ...data });
  }

  async function handleGiftGold(toUid) {
    // Simple gift flow — show prompt
    const amount = parseInt(window.prompt(`How much gold to gift? (You have ${profile.gold||0}🪙)`));
    if (!amount || isNaN(amount)) return;
    const res = await giftGold(profile, toUid, amount, updateProfile);
    if (res?.error) setAuditMsg(`Error: ${res.error}`);
    else setAuditMsg(`Gift sent! 🎁 −${amount}🪙`);
  }

  // Clear audit msg
  useEffect(() => {
    if (!auditMsg) return;
    const t = setTimeout(() => setAuditMsg(null), 4000);
    return () => clearTimeout(t);
  }, [auditMsg]);

  if (user === undefined) return (
    <div style={{ display:"flex", alignItems:"center", justifyContent:"center", height:"100vh", flexDirection:"column", gap:16 }}>
      <div style={{ fontSize:40, animation:"spin 1s linear infinite" }}>🌀</div>
      <div style={{ fontFamily:"'Syne',sans-serif", fontWeight:700, color:"rgba(255,255,255,0.4)", fontSize:14 }}>Loading…</div>
    </div>
  );

  if (!user) return <LoginScreen onLogin={login} />;
  if (user && !profile?.name) return <Onboard firebaseUser={user} onCreate={handleCreate} />;

  return (
    <div style={{ maxWidth:480, margin:"0 auto", minHeight:"100vh", display:"flex", flexDirection:"column" }}>
      {/* Toasts */}
      {xpToast && (
        <div style={{ position:"fixed", top:72, right:16, zIndex:9999, display:"flex", flexDirection:"column", gap:6 }}>
          <XPToast xp={xpToast.xp} onDone={() => setXpToast(null)} />
          {xpToast.gold > 0 && (
            <div style={{ background:"linear-gradient(135deg,#FDCB6E,#E17055)", color:"#0B0D17", padding:"8px 16px", borderRadius:10, fontWeight:800, fontSize:16, boxShadow:"0 6px 24px rgba(253,203,110,0.35)" }}>+{xpToast.gold}🪙</div>
          )}
        </div>
      )}
      {confetti && <Confetti onDone={() => setConfetti(false)} />}
      {auditMsg && (
        <div style={{ position:"fixed", top:72, left:"50%", transform:"translateX(-50%)", zIndex:9998, background:"rgba(11,13,23,0.95)", border:"1px solid rgba(255,255,255,0.12)", color:"#E8E9F3", padding:"10px 20px", borderRadius:12, fontSize:13, maxWidth:320, textAlign:"center", backdropFilter:"blur(12px)" }}>
          {auditMsg}
        </div>
      )}

      {/* Profile viewer modal */}
      {viewProfile && (
        <ProfileViewer
          targetUid={viewProfile}
          currentUid={uid}
          profile={profile}
          updateProfile={updateProfile}
          onClose={() => setViewProfile(null)}
          onSendFriendRequest={sendFriendRequest}
          onGiftGold={handleGiftGold}
        />
      )}

      <TopBar profile={profile} page={page} />
      <div style={{ flex:1, padding:"16px 16px 90px", overflowY:"auto" }}>
        {page === "home" && (
          <HomePage profile={profile} tasks={tasks} habits={habits} moodLog={moodLog}
            onMood={handleMood} onCheckHabit={handleCheckHabit}
            onCompleteTask={handleCompleteTask} setPage={setPage} />
        )}
        {page === "tasks" && (
          <TasksPage tasks={tasks} addTask={addTask}
            toggleTask={async (id, done) => {
              const task = tasks.find(t => t.id === id);
              if (task) await handleCompleteTask(task);
            }}
            deleteTask={deleteTask} toggleTaskPrivacy={toggleTaskPrivacy}
            addSubtask={addSubtask} toggleSubtask={toggleSubtask}
            friends={friends} uid={uid}
            onInviteFriend={(friendUid, task) => {
              inviteFriendToTask(uid, friendUid, task);
              setAuditMsg(`Invite sent! 📨`);
            }}
          />
        )}
        {page === "habits" && (
          <HabitsPage habits={habits} addHabit={addHabit} checkHabit={handleCheckHabit}
            deleteHabit={deleteHabit} toggleHabitPrivacy={toggleHabitPrivacy} />
        )}
        {page === "focus"   && <FocusPage onComplete={handleFocusComplete} profile={profile} />}
        {page === "squads"  && <SquadsPage profile={profile} uid={uid} />}
        {page === "social"  && (
          <SocialPage feed={feed} members={members} profile={profile}
            roomId={roomId} onPost={feedPost}
            onLike={(postId, liked) => likePost(roomId, postId, uid, liked)}
            onComment={commentOnPost} uid={uid}
            addTask={addTask} addHabit={addHabit}
            friends={friends}
            sendFriendRequest={sendFriendRequest}
            acceptFriend={acceptFriend}
            removeFriend={removeFriend}
            onViewProfile={(targetUid) => setViewProfile(targetUid)}
            giftGold={giftGold}
            updateProfile={updateProfile}
            taskInvites={taskInvites}
          />
        )}
        {page === "profile" && (
          <ProfilePage profile={profile} updateProfile={updateProfile}
            tasks={tasks} habits={habits} moodLog={moodLog}
            onLogout={logout} uid={uid}
            rewards={rewards} addReward={addReward}
            redeemReward={redeemReward} deleteReward={deleteReward}
          />
        )}
      </div>
      <BottomNav page={page} setPage={setPage} />
    </div>
  );
}

const LEVEL_NAMES_LOCAL = ["Seedling","Sprout","Bloom","Spark","Flame","Comet","Nova","Nebula","Galaxy","Cosmos","Legend","Mythic","Eternal"];

// src/App.js
import { useState, useEffect, useCallback, useRef } from "react";
import { useAuth }         from "./hooks/useAuth";
import { useTasks, useHabits, useFeed, useSquadMembers, useMoodLog, useFriends, useTaskInvites, useGold, useCollabTaskSync, pushCollabSubtaskUpdate } from "./hooks/useData";
import LoginScreen           from "./components/LoginScreen";
import Onboard               from "./components/Onboard";
import { TopBar, BottomNav } from "./components/Nav";
import { XPToast, Confetti } from "./components/UI";
import { HomePage, TasksPage, HabitsPage, aiAuditTask } from "./components/Pages";
import { FocusPage, SocialPage, ProfilePage, ProfileViewer } from "./components/MorePages";
import { ConfirmModal, AdminPanel } from "./components/Pages";
import { SquadsPage }        from "./components/SquadsPage";
import { getLevel, getLevelUnlocks, LEVEL_NAMES, today } from "./utils";

const css = `
  @import url('https://fonts.googleapis.com/css2?family=Syne:wght@400;600;700;800&family=DM+Sans:wght@300;400;500;600&display=swap');
  *, *::before, *::after { box-sizing: border-box; margin: 0; padding: 0; }
  body { background: #0B0D17; color: #E8E9F3; font-family: 'DM Sans', sans-serif; min-height: 100vh; -webkit-font-smoothing: antialiased; }
  ::-webkit-scrollbar { width: 4px; }
  ::-webkit-scrollbar-track { background: transparent; }
  ::-webkit-scrollbar-thumb { background: rgba(255,255,255,0.12); border-radius: 4px; }
  select, input, textarea, button { font-family: 'DM Sans', sans-serif; }
  @keyframes fadeUp   { from { opacity:0; transform:translateY(14px); } to { opacity:1; transform:translateY(0); } }
  @keyframes confetti { 0% { transform:translateY(-10px) rotate(0deg); opacity:1; } 100% { transform:translateY(90px) rotate(720deg); opacity:0; } }
  @keyframes spin     { to { transform:rotate(360deg); } }
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

  const { tasks, addTask, toggleTask, deleteTask, toggleTaskPrivacy, addSubtask, setSubtasks, toggleSubtask, deleteSubtask } = useTasks(uid);
  const { habits, addHabit, checkHabit, checkHabitForDate, deleteHabit, toggleHabitPrivacy }      = useHabits(uid);
  const { feed, postToFeed, likePost, commentOnPost, deletePost }                                 = useFeed(roomId);
  const { members, joinRoom, updateMemberStats, pingPresence }                                                  = useSquadMembers(roomId);
  const { moodLog, logMood }                                                                      = useMoodLog(uid);
  const { friends, sendFriendRequest, acceptFriend, removeFriend, inviteFriendToTask }            = useFriends(uid);
  const { invites: taskInvites, acceptInvite, declineInvite, removeCollabMember }                  = useTaskInvites(uid);
  const { rewards, addReward, redeemReward, deleteReward, giftGold }                              = useGold(uid);

  // Live sync collab tasks (tasks accepted from friend invites)
  useCollabTaskSync(uid, tasks);

  const [page,        setPage]        = useState("home");
  const [xpToast,     setXpToast]     = useState(null);
  const [confetti,    setConfetti]    = useState(false);
  const [seeded,      setSeeded]      = useState(false);
  const [viewProfile, setViewProfile] = useState(null);
  const [toast,       setToast]       = useState(null);
  const [confirm,     setConfirm]     = useState(null); // { type, item }
  const [showAdmin,   setShowAdmin]   = useState(false);

  // Map taskId → feedPostId so we can delete the post when task is un-completed
  const taskFeedPosts = useRef({});

  useEffect(() => {
    if (!profile || !uid || seeded) return;
    setSeeded(true);
    joinRoom(roomId, profile);
    if (habits.length === 0) STARTER_HABITS.forEach(h => addHabit(h));
    // Post a "joined" feed entry once per session so others can see you're active
    postToFeed(roomId, {
      userId: uid, userName: profile.name, userAvatar: profile.avatar,
      text: `${profile.name} is online 👋`, type: "join"
    });
  }, [profile, uid]);

  useEffect(() => {
    if (!profile || !uid) return;
    updateMemberStats(roomId, uid, profile.xp||0, profile.streak||0, profile.gold||0);
  }, [profile?.xp, profile?.streak, profile?.gold]);

  // Ping presence every 2 minutes so others can see you're online
  useEffect(() => {
    if (!uid) return;
    const interval = setInterval(() => pingPresence(roomId, uid), 2 * 60 * 1000);
    return () => clearInterval(interval);
  }, [uid]);

  function showToast(msg, duration = 3500) {
    setToast(msg);
    setTimeout(() => setToast(null), duration);
  }

  // Award XP + gold, apply active boosts, post to feed, return the feed post ID
  const awardXP = useCallback(async (amount, gold, label) => {
    if (!uid || !profile) return null;
    const now      = Date.now();
    const xpMult   = profile.xpBoostUntil  && profile.xpBoostUntil  > now ? 2 : 1;
    const goldMult = profile.goldRushUntil && profile.goldRushUntil > now ? 2 : 1;
    const finalXP   = amount * xpMult;
    const finalGold = gold   * goldMult;
    const newXP   = (profile.xp   || 0) + finalXP;
    const newGold = (profile.gold || 0) + finalGold;
    const oldLvl  = getLevel(profile.xp || 0);
    const newLvl  = getLevel(newXP);
    await updateProfile({ xp: newXP, gold: newGold });
    setXpToast({ xp: finalXP, gold: finalGold });
    if (finalXP >= 40) setConfetti(true);
    if (newLvl > oldLvl) {
      setTimeout(() => showToast(`🎉 Level Up! You're now Level ${newLvl} — ${LEVEL_NAMES[newLvl-1]}!`), 800);
    }
    const boostNote = xpMult > 1 ? " ⚡×2" : goldMult > 1 ? " 🪙×2" : "";
    const postId = await postToFeed(roomId, {
      userId: uid, userName: profile.name, userAvatar: profile.avatar,
      text: `earned +${finalXP}XP & +${finalGold}🪙 for: ${label} ✨${boostNote}`, type: "xp"
    });
    return postId;
  }, [uid, profile, roomId]);

  const feedPost = useCallback(async (text, type = "update") => {
    if (!profile) return null;
    return await postToFeed(roomId, { userId: uid, userName: profile.name, userAvatar: profile.avatar, text, type });
  }, [uid, profile, roomId]);

  // ── Task complete / undo ──────────────────────────────────────────────────
  async function handleCompleteTask(task) {
    if (task.done) {
      // UNDO completion
      await toggleTask(task.id, false, task);
      // Refund XP and gold
      const refundXP   = task.xp   || 20;
      const refundGold = task.gold  || 10;
      await updateProfile({
        xp:   Math.max(0, (profile.xp   || 0) - refundXP),
        gold: Math.max(0, (profile.gold || 0) - refundGold),
      });
      // Delete the feed post for this task if we have its ID
      const feedPostId = taskFeedPosts.current[task.id];
      if (feedPostId) {
        await deletePost(roomId, feedPostId);
        delete taskFeedPosts.current[task.id];
      }
      showToast(`↩ "${task.title}" uncompleted — XP & gold refunded`);
      return;
    }

    // AI audit
    const audit = await aiAuditTask({ ...task, createdAtMs: task.createdAtMs || Date.now() });
    const adjustedGold = Math.max(0, Math.round((task.gold || 10) * (audit.goldMultiplier ?? 1)));

    if (audit.goldMultiplier === 0) {
      showToast(`⚠️ ${audit.reason}. No gold awarded.`);
    } else if (audit.goldMultiplier < 1) {
      showToast(`⚠️ ${audit.reason}. Reduced gold: ${adjustedGold}🪙`);
    }

    await toggleTask(task.id, true, task);
    const isPrivate = task.isPublic === false;
    // Track total tasks done for title system
    await updateProfile({ totalTasksDone: (profile.totalTasksDone||0) + 1 });

    // Award XP — for private tasks use a generic label so title doesn't appear in feed
    const xpLabel   = isPrivate ? "a private task" : task.title;
    const xpPostId  = await awardXP(task.xp || 20, adjustedGold, xpLabel);

    // Only post task completion to feed if the task is public
    let taskPostId = null;
    if (!isPrivate) {
      taskPostId = await feedPost(`completed task: "${task.title}" ✅`, "task");
    }
    taskFeedPosts.current[task.id] = taskPostId || xpPostId;
  }

  // ── Habit check / undo ────────────────────────────────────────────────────
  async function handleCheckHabit(habit) {
    const result = await checkHabit(habit);
    if (result === false) return;
    if (result === "undone") {
      showToast(`↩ "${habit.name}" unchecked`);
      return;
    }
    // Track total habits logged for title system
    await updateProfile({ totalHabitsLogged: (profile.totalHabitsLogged||0) + 1 });
    const goldBonus = Math.min(5 + Math.floor(result * 1.5), 30);
    await awardXP(10 + result * 2, goldBonus, `habit: ${habit.name}`);
    await feedPost(`completed habit: "${habit.name}" 🔥 (${result} day streak!)`, "habit");
  }

  // Confirm-gate: tasks & habits require confirmation before completing
  function requestComplete(task) {
    if (task.done) { handleCompleteTask(task); return; } // undo = no confirm needed
    setConfirm({ type: "task", item: task });
  }
  function requestCheckHabit(habit) {
    const doneToday = habit.log?.includes(today());
    if (doneToday) { handleCheckHabit(habit); return; } // undo = no confirm needed
    setConfirm({ type: "habit", item: habit });
  }

  async function handleMood({ mood, energy, anxiety, focus }) {
    await logMood(uid, { mood, energy, anxiety, focus });
    const extras = [
      energy  && `energy ${energy}/5`,
      anxiety && `anxiety ${anxiety}/5`,
      focus   && `focus ${focus}/5`,
    ].filter(Boolean).join(", ");
    await feedPost(`feeling ${mood.e} ${mood.l} today${extras ? ` · ${extras}` : ""}`, "mood");
  }

  async function handleFocusComplete() {
    await awardXP(40, 20, "focus session");
    await feedPost("just finished a focus session 🎯", "xp");
  }

  async function handleCreate(data) {
    await updateProfile(data);
    await postToFeed(roomId, { userId: uid, userName: data.name, userAvatar: data.avatar, text: "just joined Temper Ascension! 👋", type: "join" });
    await joinRoom(roomId, { ...profile, ...data });
  }

  async function handleGiftGold(toUid) {
    const amountStr = window.prompt(`How much gold to gift? (You have ${profile.gold||0}🪙)`);
    const amount = parseInt(amountStr);
    if (!amount || isNaN(amount) || amount <= 0) return;
    const res = await giftGold(profile, toUid, amount, updateProfile);
    if (res?.error) showToast(`Error: ${res.error}`);
    else showToast(`Gift sent! 🎁 −${amount}🪙`);
  }

  if (user === undefined) return (
    <div style={{ display:"flex", alignItems:"center", justifyContent:"center", height:"100vh", flexDirection:"column", gap:16 }}>
      <div style={{ fontSize:40, animation:"spin 1s linear infinite" }}>🌀</div>
      <div style={{ fontFamily:"'Syne',sans-serif", fontWeight:700, color:"rgba(255,255,255,0.4)", fontSize:14 }}>Loading…</div>
    </div>
  );

  if (!user)               return <LoginScreen onLogin={login} />;
  if (!profile?.name)      return <Onboard firebaseUser={user} onCreate={handleCreate} />;

  return (
    <div style={{ maxWidth:480, margin:"0 auto", minHeight:"100vh", display:"flex", flexDirection:"column" }}>

      {/* XP + Gold toast */}
      {xpToast && (
        <div style={{ position:"fixed", top:72, right:16, zIndex:9999, display:"flex", flexDirection:"column", gap:6 }}>
          <XPToast xp={xpToast.xp} onDone={() => setXpToast(null)} />
          {xpToast.gold > 0 && (
            <div style={{ background:"linear-gradient(135deg,#FDCB6E,#E17055)", color:"#0B0D17", padding:"8px 16px", borderRadius:10, fontWeight:800, fontSize:16, boxShadow:"0 6px 24px rgba(253,203,110,0.35)" }}>+{xpToast.gold}🪙</div>
          )}
        </div>
      )}

      {confetti && <Confetti onDone={() => setConfetti(false)} />}

      {/* General toast (audit messages, level ups, undo confirmations) */}
      {toast && (
        <div style={{ position:"fixed", top:72, left:"50%", transform:"translateX(-50%)", zIndex:9998, background:"rgba(15,17,32,0.97)", border:"1px solid rgba(255,255,255,0.12)", color:"#E8E9F3", padding:"10px 20px", borderRadius:12, fontSize:13, maxWidth:340, textAlign:"center", backdropFilter:"blur(12px)", boxShadow:"0 8px 32px rgba(0,0,0,0.4)" }}>
          {toast}
        </div>
      )}

      {/* Profile viewer modal */}
      {viewProfile && (
        <ProfileViewer
          targetUid={viewProfile} currentUid={uid} profile={profile}
          updateProfile={updateProfile}
          onClose={() => setViewProfile(null)}
          onSendFriendRequest={sendFriendRequest}
          onGiftGold={handleGiftGold}
          friends={friends}
        />
      )}

      <TopBar profile={profile} page={page} onAdminTrigger={() => setShowAdmin(true)} />

      <div style={{ flex:1, padding:"16px 16px 90px", overflowY:"auto" }}>
        {page === "home" && (
          <HomePage profile={profile} tasks={tasks} habits={habits} moodLog={moodLog}
            onMood={handleMood} onCheckHabit={requestCheckHabit}
            onCheckHabitForDate={(habit, dateStr) => checkHabitForDate(habit, dateStr)}
            onCompleteTask={requestComplete} setPage={setPage} />
        )}
        {page === "tasks" && (
          <TasksPage
            tasks={tasks} addTask={addTask}
            toggleTask={(id, done) => { const t = tasks.find(t => t.id === id); if (t) requestComplete(t); }}
            deleteTask={deleteTask} toggleTaskPrivacy={toggleTaskPrivacy}
            addSubtask={addSubtask} setSubtasks={setSubtasks} toggleSubtask={toggleSubtask} deleteSubtask={deleteSubtask}
            friends={friends} uid={uid}
            onInviteFriend={(friendUid, task) => {
              inviteFriendToTask(uid, friendUid, task);
              showToast("Invite sent! 📨");
            }}
            taskInvites={taskInvites}
            onAcceptInvite={(id) => acceptInvite(uid, id)}
            onDeclineInvite={(id) => declineInvite(uid, id)}
            onCollabSubtaskUpdate={(task, subtasks, progress) => pushCollabSubtaskUpdate(uid, task, subtasks, progress)}
            onRemoveCollabMember={(ownerUid, taskId, memberUid) => removeCollabMember(ownerUid, taskId, memberUid)}
          />
        )}
        {page === "habits" && (
          <HabitsPage habits={habits} addHabit={addHabit} checkHabit={requestCheckHabit}
            deleteHabit={deleteHabit} toggleHabitPrivacy={toggleHabitPrivacy} />
        )}
        {page === "focus"   && <FocusPage onComplete={handleFocusComplete} profile={profile} uid={uid} />}
        {page === "squads"  && <SquadsPage profile={{ ...profile, uid }} uid={uid} />}
        {page === "social"  && (
          <SocialPage
            feed={feed} members={members} profile={profile} roomId={roomId}
            onPost={feedPost}
            onLike={(postId, liked) => likePost(roomId, postId, uid, liked)}
            onComment={commentOnPost}
            onDeletePost={(postId) => deletePost(roomId, postId)}
            uid={uid} addTask={addTask} addHabit={addHabit}
            friends={friends}
            sendFriendRequest={sendFriendRequest}
            acceptFriend={acceptFriend}
            removeFriend={removeFriend}
            onViewProfile={setViewProfile}
            giftGold={giftGold}
            updateProfile={updateProfile}
            taskInvites={taskInvites}
            onAcceptInvite={(id) => acceptInvite(uid, id)}
            onDeclineInvite={(id) => declineInvite(uid, id)}
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

      <BottomNav page={page} setPage={setPage} badges={{
        social:  (friends||[]).filter(f => f.status === "pending" && f.direction === "incoming").length,
        home:    (taskInvites||[]).filter(i => i.status === "pending").length,
        tasks:   (taskInvites||[]).filter(i => i.status === "pending").length,
      }} />

      {/* Confirm modal — task & habit completion */}
      <ConfirmModal
        type={confirm?.type} item={confirm?.item}
        onConfirm={() => {
          if (confirm.type === "task")  handleCompleteTask(confirm.item);
          else                          handleCheckHabit(confirm.item);
          setConfirm(null);
        }}
        onCancel={() => setConfirm(null)}
      />

      {/* Admin panel */}
      {showAdmin && (
        <AdminPanel profile={profile} uid={uid} updateProfile={updateProfile} onClose={() => setShowAdmin(false)} />
      )}
    </div>
  );
}

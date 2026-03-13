// src/hooks/useData.js
import { useState, useEffect, useCallback } from "react";
import {
  collection, doc, onSnapshot, addDoc, updateDoc, deleteDoc,
  setDoc, query, orderBy, limit, serverTimestamp,
  arrayUnion, arrayRemove, where, getDocs, getDoc
} from "firebase/firestore";
import { db } from "../firebase/config";
import { today } from "../utils";

/* ─── Tasks ──────────────────────────────────────────────────────────────── */
export function useTasks(uid) {
  const [tasks, setTasks] = useState([]);
  useEffect(() => {
    if (!uid) return;
    return onSnapshot(
      query(collection(db, "users", uid, "tasks"), orderBy("createdAt", "desc"), limit(100)),
      snap => setTasks(snap.docs.map(d => ({ id: d.id, ...d.data() }))),
      err => console.error("tasks:", err)
    );
  }, [uid]);

  const addTask = useCallback(async (task) => {
    if (!uid) return;
    await addDoc(collection(db, "users", uid, "tasks"), {
      ...task, done: false, subtasks: [], progress: 0,
      createdAt: serverTimestamp(), createdAtMs: Date.now(),
      completedAt: null, isPublic: task.isPublic !== false,
    });
  }, [uid]);

  const toggleTask = useCallback(async (id, done) => {
    if (!uid) return;
    const ref = doc(db, "users", uid, "tasks", id);
    await updateDoc(ref, { done, completedAt: done ? new Date().toISOString() : null });
    // If this is a collab task accepted by this user, also sync to the owner's copy
    const snap = await getDoc(ref).catch(() => null);
    if (snap?.exists()) {
      const data = snap.data();
      if (data.isCollab && data.collabOwnerUid && data.collabTaskId) {
        await updateDoc(
          doc(db, "users", data.collabOwnerUid, "tasks", data.collabTaskId),
          { done, completedAt: done ? new Date().toISOString() : null }
        ).catch(e => console.warn("Collab done sync failed:", e.message));
      }
    }
  }, [uid]);

  const deleteTask = useCallback(async (id) => { if (uid) await deleteDoc(doc(db, "users", uid, "tasks", id)); }, [uid]);

  const toggleTaskPrivacy = useCallback(async (id, isPublic) => {
    if (uid) await updateDoc(doc(db, "users", uid, "tasks", id), { isPublic });
  }, [uid]);

  // Add a single subtask manually — reads fresh, appends, writes back
  const addSubtask = useCallback(async (taskId, subtask) => {
    if (!uid) return;
    const ref = doc(db, "users", uid, "tasks", taskId);
    const snap = await getDoc(ref);
    const existing = snap.data()?.subtasks || [];
    const updated = [...existing, { ...subtask, id: Math.random().toString(36).slice(2), done: false }];
    const progress = updated.length ? Math.round(updated.filter(s => s.done).length / updated.length * 100) : 0;
    await updateDoc(ref, { subtasks: updated, progress });
  }, [uid]);

  // Bulk-replace subtasks — used by AI breakdown to set all at once (avoids sequential-write race)
  const setSubtasks = useCallback(async (taskId, subtaskTitles, aiGenerated = false) => {
    if (!uid) return;
    const ref = doc(db, "users", uid, "tasks", taskId);
    const snap = await getDoc(ref);
    const existing = snap.data()?.subtasks || [];
    const newOnes = subtaskTitles.map(title => ({
      title, id: Math.random().toString(36).slice(2), done: false, aiGenerated
    }));
    const merged = [...existing, ...newOnes];
    const progress = merged.length ? Math.round(merged.filter(s => s.done).length / merged.length * 100) : 0;
    // Also cache that AI breakdown was done so we never re-run it
    await updateDoc(ref, { subtasks: merged, progress, aiBreakdownDone: true });
  }, [uid]);

  const toggleSubtask = useCallback(async (taskId, subtaskId) => {
    if (!uid) return;
    const ref = doc(db, "users", uid, "tasks", taskId);
    const snap = await getDoc(ref);
    const subtasks = (snap.data()?.subtasks || []).map(s => s.id === subtaskId ? { ...s, done: !s.done } : s);
    const progress = subtasks.length ? Math.round(subtasks.filter(s => s.done).length / subtasks.length * 100) : 0;
    await updateDoc(ref, { subtasks, progress, done: subtasks.length > 0 && subtasks.every(s => s.done) });
  }, [uid]);

  const deleteSubtask = useCallback(async (taskId, subtaskId) => {
    if (!uid) return;
    const ref = doc(db, "users", uid, "tasks", taskId);
    const snap = await getDoc(ref);
    const subtasks = (snap.data()?.subtasks || []).filter(s => s.id !== subtaskId);
    const progress = subtasks.length ? Math.round(subtasks.filter(s => s.done).length / subtasks.length * 100) : 0;
    await updateDoc(ref, { subtasks, progress });
  }, [uid]);

  return { tasks, addTask, toggleTask, deleteTask, toggleTaskPrivacy, addSubtask, setSubtasks, toggleSubtask, deleteSubtask };
}

/* ─── Friend public tasks ─────────────────────────────────────────────────── */
export function useFriendTasks(friendUid) {
  const [tasks, setTasks] = useState([]);
  useEffect(() => {
    if (!friendUid) return;
    // Simple query — just filter by isPublic, no compound index needed
    return onSnapshot(
      query(collection(db, "users", friendUid, "tasks"), where("isPublic", "==", true), limit(20)),
      snap => setTasks(snap.docs.map(d => ({ id: d.id, ...d.data() }))),
      err => console.error("friendTasks:", err)
    );
  }, [friendUid]);
  return tasks;
}

/* ─── Habits ─────────────────────────────────────────────────────────────── */
export function useHabits(uid) {
  const [habits, setHabits] = useState([]);
  useEffect(() => {
    if (!uid) return;
    return onSnapshot(
      query(collection(db, "users", uid, "habits"), orderBy("createdAt", "desc"), limit(50)),
      snap => setHabits(snap.docs.map(d => ({ id: d.id, ...d.data() }))),
      err => console.error("habits:", err)
    );
  }, [uid]);

  const addHabit = useCallback(async (habit) => {
    if (!uid) return;
    await addDoc(collection(db, "users", uid, "habits"), {
      ...habit, log: [], streak: 0, createdAt: serverTimestamp(), isPublic: habit.isPublic !== false
    });
  }, [uid]);

  // Returns streak number on log, "undone" on undo, false on error
  const checkHabit = useCallback(async (habit) => {
    if (!uid) return false;
    const todayStr = today();
    const log = habit.log || [];
    if (log.includes(todayStr)) {
      // Undo today's log
      const newLog = log.filter(d => d !== todayStr);
      const newStreak = Math.max(0, (habit.streak || 1) - 1);
      await updateDoc(doc(db, "users", uid, "habits", habit.id), { log: newLog, streak: newStreak });
      return "undone";
    }
    const yesterday = new Date(Date.now() - 86400000).toISOString().slice(0, 10);
    const newStreak = log.includes(yesterday) ? (habit.streak || 0) + 1 : 1;
    await updateDoc(doc(db, "users", uid, "habits", habit.id), { log: arrayUnion(todayStr), streak: newStreak });
    return newStreak;
  }, [uid]);

  const deleteHabit = useCallback(async (id) => { if (uid) await deleteDoc(doc(db, "users", uid, "habits", id)); }, [uid]);
  const toggleHabitPrivacy = useCallback(async (id, isPublic) => { if (uid) await updateDoc(doc(db, "users", uid, "habits", id), { isPublic }); }, [uid]);

  return { habits, addHabit, checkHabit, deleteHabit, toggleHabitPrivacy };
}

/* ─── Mood ───────────────────────────────────────────────────────────────── */
export function useMoodLog(uid) {
  const [moodLog, setMoodLog] = useState([]);
  useEffect(() => {
    if (!uid) return;
    return onSnapshot(
      query(collection(db, "users", uid, "moods"), orderBy("date", "desc"), limit(30)),
      snap => setMoodLog(snap.docs.map(d => ({ id: d.id, ...d.data() })))
    );
  }, [uid]);

  const logMood = useCallback(async (uid, { mood, energy, anxiety, focus }) => {
    await setDoc(doc(db, "users", uid, "moods", today()), { mood, energy: energy||null, anxiety: anxiety||null, focus: focus||null, date: today(), ts: serverTimestamp() }, { merge: true });
  }, []);

  return { moodLog, logMood };
}

/* ─── Feed ───────────────────────────────────────────────────────────────── */
export function useFeed(roomId) {
  const [feed, setFeed] = useState([]);
  useEffect(() => {
    if (!roomId) return;
    return onSnapshot(
      query(collection(db, "rooms", roomId, "feed"), orderBy("ts", "desc"), limit(60)),
      snap => setFeed(snap.docs.map(d => ({ id: d.id, ...d.data() })))
    );
  }, [roomId]);

  const postToFeed    = useCallback(async (roomId, post) => {
    const ref = await addDoc(collection(db, "rooms", roomId, "feed"), { ...post, ts: serverTimestamp(), likes: [], comments: [] });
    return ref.id; // return post ID so callers can delete it later
  }, []);
  const likePost      = useCallback(async (roomId, postId, uid, liked) => { await updateDoc(doc(db, "rooms", roomId, "feed", postId), { likes: liked ? arrayUnion(uid) : arrayRemove(uid) }); }, []);
  const commentOnPost = useCallback(async (roomId, postId, comment) => { await updateDoc(doc(db, "rooms", roomId, "feed", postId), { comments: arrayUnion(comment) }); }, []);
  const deletePost    = useCallback(async (roomId, postId) => { if (!postId) return; await deleteDoc(doc(db, "rooms", roomId, "feed", postId)).catch(()=>{}); }, []);

  return { feed, postToFeed, likePost, commentOnPost, deletePost };
}

/* ─── Room members ───────────────────────────────────────────────────────── */
export function useSquadMembers(roomId) {
  const [members, setMembers] = useState([]);
  useEffect(() => {
    if (!roomId) return;
    return onSnapshot(collection(db, "rooms", roomId, "members"), snap => setMembers(snap.docs.map(d => ({ id: d.id, ...d.data() }))));
  }, [roomId]);

  const joinRoom = useCallback(async (roomId, profile) => {
    if (!profile?.uid) return;
    await setDoc(doc(db, "rooms", roomId, "members", profile.uid), {
      uid: profile.uid, name: profile.name, avatar: profile.avatar,
      xp: profile.xp || 0, streak: profile.streak || 0, gold: profile.gold || 0,
      joinedAt: serverTimestamp(),
      lastSeen: serverTimestamp()
    }, { merge: true });
  }, []);

  const updateMemberStats = useCallback(async (roomId, uid, xp, streak, gold = 0) => {
    await updateDoc(doc(db, "rooms", roomId, "members", uid), {
      xp, streak, gold, lastSeen: serverTimestamp()
    }).catch(() => {});
  }, []);

  // Ping presence — call periodically to stay "online"
  const pingPresence = useCallback(async (roomId, uid) => {
    if (!roomId || !uid) return;
    await updateDoc(doc(db, "rooms", roomId, "members", uid), {
      lastSeen: serverTimestamp()
    }).catch(() => {});
  }, []);

  return { members, joinRoom, updateMemberStats, pingPresence };
}

/* ─── Friends ────────────────────────────────────────────────────────────── */
export function useFriends(uid) {
  const [friends, setFriends] = useState([]);
  useEffect(() => {
    if (!uid) return;
    return onSnapshot(
      collection(db, "users", uid, "friends"),
      snap => setFriends(snap.docs.map(d => ({ id: d.id, ...d.data() }))),
      err => console.error("friends:", err)
    );
  }, [uid]);

  const sendFriendRequest = useCallback(async (myUid, myProfile, targetUid) => {
    if (!targetUid || targetUid === myUid) return { error: "Invalid user ID" };
    try {
      const targetSnap = await getDoc(doc(db, "users", targetUid));
      if (!targetSnap.exists()) return { error: "User not found — check the ID" };
      const target = targetSnap.data();
      // Check not already friends
      const existingSnap = await getDoc(doc(db, "users", myUid, "friends", targetUid));
      if (existingSnap.exists()) return { error: "Already friends or request pending" };
      await setDoc(doc(db, "users", myUid, "friends", targetUid), {
        uid: targetUid, name: target.name, avatar: target.avatar || "🦊",
        status: "pending", direction: "outgoing"
      });
      await setDoc(doc(db, "users", targetUid, "friends", myUid), {
        uid: myUid, name: myProfile.name, avatar: myProfile.avatar || "🦊",
        status: "pending", direction: "incoming"
      });
      return { success: true };
    } catch (e) {
      console.error("sendFriendRequest:", e);
      return { error: e.message };
    }
  }, []);

  const acceptFriend = useCallback(async (myUid, friendUid) => {
    await updateDoc(doc(db, "users", myUid, "friends", friendUid), { status: "accepted" });
    await updateDoc(doc(db, "users", friendUid, "friends", myUid), { status: "accepted" }).catch(() => {});
  }, []);

  const removeFriend = useCallback(async (myUid, friendUid) => {
    await deleteDoc(doc(db, "users", myUid, "friends", friendUid));
    await deleteDoc(doc(db, "users", friendUid, "friends", myUid)).catch(() => {});
  }, []);

  const inviteFriendToTask = useCallback(async (myUid, friendUid, task) => {
    await setDoc(doc(db, "users", friendUid, "taskInvites", `${myUid}_${task.id}`), {
      fromUid: myUid, taskId: task.id, taskTitle: task.title,
      taskXp: task.xp || 20, taskGold: task.gold || 10,
      // Store full task snapshot so accept works without reading owner's collection
      taskSnapshot: {
        title: task.title, desc: task.desc || "",
        priority: task.priority || "medium", tag: task.tag || "",
        xp: task.xp || 20, gold: task.gold || 10,
        dueTime: task.dueTime || "", isPublic: true,
        subtasks: task.subtasks || [], progress: task.progress || 0,
      },
      ts: serverTimestamp(), status: "pending"
    });
  }, []);

  return { friends, sendFriendRequest, acceptFriend, removeFriend, inviteFriendToTask };
}

/* ─── Task Invites ───────────────────────────────────────────────────────── */
export function useTaskInvites(uid) {
  const [invites, setInvites] = useState([]);
  useEffect(() => {
    if (!uid) return;
    return onSnapshot(
      collection(db, "users", uid, "taskInvites"),
      snap => setInvites(snap.docs.map(d => ({ id: d.id, ...d.data() }))),
      err => console.error("taskInvites:", err)
    );
  }, [uid]);

  const acceptInvite = useCallback(async (uid, inviteId) => {
    // Get invite data first
    const invSnap = await getDoc(doc(db, "users", uid, "taskInvites", inviteId));
    if (!invSnap.exists()) return;
    const inv = invSnap.data();

    // Mark accepted
    await updateDoc(doc(db, "users", uid, "taskInvites", inviteId), { status: "accepted" });

    // Use stored snapshot (no cross-user read needed)
    const taskData = inv.taskSnapshot || {
      title: inv.taskTitle, xp: inv.taskXp || 20, gold: inv.taskGold || 10,
      priority: "medium", isPublic: true, subtasks: [], progress: 0,
    };

    // Create collab copy in acceptor's tasks
    await setDoc(doc(db, "users", uid, "tasks", `collab_${inv.fromUid}_${inv.taskId}`), {
      ...taskData,
      id: `collab_${inv.fromUid}_${inv.taskId}`,
      isCollab: true,
      collabOwnerUid: inv.fromUid,
      collabTaskId: inv.taskId,
      collabInviteId: inviteId,
      done: false,
      createdAt: serverTimestamp(),
    });
  }, []);

  const declineInvite = useCallback(async (uid, inviteId) => {
    await deleteDoc(doc(db, "users", uid, "taskInvites", inviteId));
  }, []);

  return { invites, acceptInvite, declineInvite };
}

/* ─── Collab Task Live Sync ──────────────────────────────────────────────── */
// Hook that mirrors subtask/progress updates between collab task owner and acceptor
export function useCollabTaskSync(uid, tasks) {
  useEffect(() => {
    if (!uid || !tasks.length) return;
    const collabTasks = tasks.filter(t => t.isCollab && t.collabOwnerUid && t.collabTaskId);
    const unsubs = collabTasks.map(t => {
      // Listen to the owner's original task for live updates
      return onSnapshot(
        doc(db, "users", t.collabOwnerUid, "tasks", t.collabTaskId),
        snap => {
          if (!snap.exists()) return;
          const ownerData = snap.data();
          // Mirror subtasks and progress to this user's collab copy
          updateDoc(doc(db, "users", uid, "tasks", t.id), {
            subtasks: ownerData.subtasks || [],
            progress: ownerData.progress || 0,
            title: ownerData.title,
            desc: ownerData.desc,
          }).catch(() => {});
        }
      );
    });
    return () => unsubs.forEach(u => u());
  }, [uid, tasks]);
}

// When collab task member updates subtasks, write to their copy AND owner's original
export async function pushCollabSubtaskUpdate(uid, task, subtasks, progress) {
  // Write to current user's copy
  await updateDoc(doc(db, "users", uid, "tasks", task.id), { subtasks, progress }).catch(() => {});
  // Also write to owner's original (allowed by Firestore rules for public tasks)
  if (task.isCollab && task.collabOwnerUid && task.collabTaskId) {
    await updateDoc(doc(db, "users", task.collabOwnerUid, "tasks", task.collabTaskId), {
      subtasks, progress
    }).catch(e => console.warn("Collab push to owner failed:", e.message));
  }
}

/* ─── Gold & Rewards ─────────────────────────────────────────────────────── */
export function useGold(uid) {
  const [rewards, setRewards] = useState([]);
  useEffect(() => {
    if (!uid) return;
    return onSnapshot(collection(db, "users", uid, "rewards"), snap => setRewards(snap.docs.map(d => ({ id: d.id, ...d.data() }))));
  }, [uid]);

  const addReward    = useCallback(async (uid, reward) => { await addDoc(collection(db, "users", uid, "rewards"), { ...reward, redeemed: false, createdAt: serverTimestamp() }); }, []);
  const redeemReward = useCallback(async (uid, rewardId) => { await updateDoc(doc(db, "users", uid, "rewards", rewardId), { redeemed: true, redeemedAt: new Date().toISOString() }); }, []);
  const deleteReward = useCallback(async (uid, rewardId) => { await deleteDoc(doc(db, "users", uid, "rewards", rewardId)); }, []);

  const giftGold = useCallback(async (fromProfile, toUid, amount, updateProfile) => {
    if ((fromProfile.gold || 0) < amount) return { error: "Not enough gold" };
    const toSnap = await getDoc(doc(db, "users", toUid));
    if (!toSnap.exists()) return { error: "User not found" };
    await updateProfile({ gold: (fromProfile.gold || 0) - amount });
    await updateDoc(doc(db, "users", toUid), { gold: (toSnap.data().gold || 0) + amount });
    return { success: true };
  }, []);

  return { rewards, addReward, redeemReward, deleteReward, giftGold };
}

/* ─── Fetch any user's profile ───────────────────────────────────────────── */
export async function fetchUserProfile(uid) {
  const snap = await getDoc(doc(db, "users", uid));
  return snap.exists() ? { id: snap.id, ...snap.data() } : null;
}

// src/hooks/useData.js
import { useState, useEffect, useCallback } from "react";
import {
  collection, doc, onSnapshot, addDoc, updateDoc, deleteDoc,
  setDoc, query, orderBy, limit, serverTimestamp, arrayUnion, arrayRemove,
  where, getDocs, getDoc
} from "firebase/firestore";
import { db } from "../firebase/config";
import { today } from "../utils";

/* ─── Tasks ──────────────────────────────────────────────────────────────── */
export function useTasks(uid) {
  const [tasks, setTasks] = useState([]);
  useEffect(() => {
    if (!uid) return;
    const unsub = onSnapshot(
      query(collection(db, "users", uid, "tasks"), orderBy("createdAt","desc"), limit(100)),
      snap => setTasks(snap.docs.map(d => ({ id: d.id, ...d.data() })))
    );
    return unsub;
  }, [uid]);

  const addTask = useCallback(async (task) => {
    if (!uid) return;
    await addDoc(collection(db, "users", uid, "tasks"), {
      ...task, done: false, subtasks: [], progress: 0,
      createdAt: serverTimestamp(), completedAt: null,
      isPublic: task.isPublic !== false,
    });
  }, [uid]);

  const toggleTask = useCallback(async (id, done) => {
    if (!uid) return;
    await updateDoc(doc(db, "users", uid, "tasks", id), {
      done, completedAt: done ? new Date().toISOString() : null
    });
  }, [uid]);

  const updateTask = useCallback(async (id, data) => {
    if (!uid) return;
    await updateDoc(doc(db, "users", uid, "tasks", id), data);
  }, [uid]);

  const deleteTask = useCallback(async (id) => {
    if (!uid) return;
    await deleteDoc(doc(db, "users", uid, "tasks", id));
  }, [uid]);

  const toggleTaskPrivacy = useCallback(async (id, isPublic) => {
    if (!uid) return;
    await updateDoc(doc(db, "users", uid, "tasks", id), { isPublic });
  }, [uid]);

  const addSubtask = useCallback(async (taskId, subtask) => {
    if (!uid) return;
    const taskRef = doc(db, "users", uid, "tasks", taskId);
    const snap = await getDoc(taskRef);
    const existing = snap.data()?.subtasks || [];
    const updated = [...existing, { ...subtask, id: Math.random().toString(36).slice(2), done: false }];
    const progress = updated.length > 0 ? Math.round(updated.filter(s=>s.done).length / updated.length * 100) : 0;
    await updateDoc(taskRef, { subtasks: updated, progress });
  }, [uid]);

  const toggleSubtask = useCallback(async (taskId, subtaskId) => {
    if (!uid) return;
    const taskRef = doc(db, "users", uid, "tasks", taskId);
    const snap = await getDoc(taskRef);
    const subtasks = (snap.data()?.subtasks || []).map(s => s.id === subtaskId ? { ...s, done: !s.done } : s);
    const progress = subtasks.length > 0 ? Math.round(subtasks.filter(s=>s.done).length / subtasks.length * 100) : 0;
    const allDone  = subtasks.length > 0 && subtasks.every(s => s.done);
    await updateDoc(taskRef, { subtasks, progress, done: allDone });
  }, [uid]);

  return { tasks, addTask, toggleTask, updateTask, deleteTask, toggleTaskPrivacy, addSubtask, toggleSubtask };
}

/* ─── Friend public tasks ─────────────────────────────────────────────────── */
export function useFriendTasks(friendUid) {
  const [tasks, setTasks] = useState([]);
  useEffect(() => {
    if (!friendUid) return;
    const unsub = onSnapshot(
      query(collection(db, "users", friendUid, "tasks"), where("isPublic","==",true), orderBy("createdAt","desc"), limit(30)),
      snap => setTasks(snap.docs.map(d => ({ id: d.id, ...d.data() })))
    );
    return unsub;
  }, [friendUid]);
  return tasks;
}

/* ─── Habits ─────────────────────────────────────────────────────────────── */
export function useHabits(uid) {
  const [habits, setHabits] = useState([]);
  useEffect(() => {
    if (!uid) return;
    const unsub = onSnapshot(
      query(collection(db, "users", uid, "habits"), orderBy("createdAt","desc"), limit(50)),
      snap => setHabits(snap.docs.map(d => ({ id: d.id, ...d.data() })))
    );
    return unsub;
  }, [uid]);

  const addHabit = useCallback(async (habit) => {
    if (!uid) return;
    await addDoc(collection(db, "users", uid, "habits"), {
      ...habit, log: [], streak: 0, createdAt: serverTimestamp(), isPublic: habit.isPublic !== false
    });
  }, [uid]);

  const checkHabit = useCallback(async (habit) => {
    if (!uid) return false;
    const todayStr = today();
    const log  = habit.log || [];
    const alreadyDone = log.includes(todayStr);
    if (alreadyDone) {
      // Undo: remove today from log
      const newLog = log.filter(d => d !== todayStr);
      const yesterday = new Date(Date.now() - 86400000).toISOString().slice(0,10);
      const streak = newLog.includes(yesterday) ? (habit.streak || 1) - 1 : 0;
      await updateDoc(doc(db, "users", uid, "habits", habit.id), { log: newLog, streak: Math.max(0, streak) });
      return "undone";
    }
    const newLog = [...log, todayStr];
    const yesterday = new Date(Date.now() - 86400000).toISOString().slice(0,10);
    const streak = log.includes(yesterday) ? (habit.streak || 0) + 1 : 1;
    await updateDoc(doc(db, "users", uid, "habits", habit.id), { log: newLog, streak });
    return streak;
  }, [uid]);

  const deleteHabit = useCallback(async (id) => {
    if (!uid) return;
    await deleteDoc(doc(db, "users", uid, "habits", id));
  }, [uid]);

  const toggleHabitPrivacy = useCallback(async (id, isPublic) => {
    if (!uid) return;
    await updateDoc(doc(db, "users", uid, "habits", id), { isPublic });
  }, [uid]);

  return { habits, addHabit, checkHabit, deleteHabit, toggleHabitPrivacy };
}

/* ─── Mood ───────────────────────────────────────────────────────────────── */
export function useMoodLog(uid) {
  const [moodLog, setMoodLog] = useState([]);
  useEffect(() => {
    if (!uid) return;
    const unsub = onSnapshot(
      query(collection(db, "users", uid, "moods"), orderBy("date","desc"), limit(30)),
      snap => setMoodLog(snap.docs.map(d => ({ id: d.id, ...d.data() })))
    );
    return unsub;
  }, [uid]);

  const logMood = useCallback(async (uid, mood) => {
    const todayStr = today();
    const ref = doc(db, "users", uid, "moods", todayStr);
    await setDoc(ref, { mood, date: todayStr, ts: serverTimestamp() }, { merge: true });
  }, []);

  return { moodLog, logMood };
}

/* ─── Feed ───────────────────────────────────────────────────────────────── */
export function useFeed(roomId) {
  const [feed, setFeed] = useState([]);
  useEffect(() => {
    if (!roomId) return;
    const unsub = onSnapshot(
      query(collection(db, "rooms", roomId, "feed"), orderBy("ts","desc"), limit(60)),
      snap => setFeed(snap.docs.map(d => ({ id: d.id, ...d.data() })))
    );
    return unsub;
  }, [roomId]);

  const postToFeed = useCallback(async (roomId, post) => {
    await addDoc(collection(db, "rooms", roomId, "feed"), { ...post, ts: serverTimestamp(), likes: [], comments: [] });
  }, []);

  const likePost = useCallback(async (roomId, postId, uid, liked) => {
    await updateDoc(doc(db, "rooms", roomId, "feed", postId), { likes: liked ? arrayUnion(uid) : arrayRemove(uid) });
  }, []);

  const commentOnPost = useCallback(async (roomId, postId, comment) => {
    await updateDoc(doc(db, "rooms", roomId, "feed", postId), { comments: arrayUnion(comment) });
  }, []);

  return { feed, postToFeed, likePost, commentOnPost };
}

/* ─── Squad Members (global room) ────────────────────────────────────────── */
export function useSquadMembers(roomId) {
  const [members, setMembers] = useState([]);
  useEffect(() => {
    if (!roomId) return;
    const unsub = onSnapshot(collection(db, "rooms", roomId, "members"), snap => setMembers(snap.docs.map(d => ({ id: d.id, ...d.data() }))));
    return unsub;
  }, [roomId]);

  const joinRoom = useCallback(async (roomId, profile) => {
    if (!profile?.uid) return;
    await setDoc(doc(db, "rooms", roomId, "members", profile.uid), {
      uid: profile.uid, name: profile.name, avatar: profile.avatar,
      xp: profile.xp || 0, streak: profile.streak || 0, gold: profile.gold || 0,
      joinedAt: serverTimestamp()
    }, { merge: true });
  }, []);

  const updateMemberStats = useCallback(async (roomId, uid, xp, streak, gold = 0) => {
    await updateDoc(doc(db, "rooms", roomId, "members", uid), { xp, streak, gold }).catch(() => {});
  }, []);

  return { members, joinRoom, updateMemberStats };
}

/* ─── Friends ────────────────────────────────────────────────────────────── */
export function useFriends(uid) {
  const [friends, setFriends] = useState([]);
  useEffect(() => {
    if (!uid) return;
    const unsub = onSnapshot(collection(db, "users", uid, "friends"), snap => setFriends(snap.docs.map(d => ({ id: d.id, ...d.data() }))));
    return unsub;
  }, [uid]);

  const sendFriendRequest = useCallback(async (uid, myProfile, targetUid) => {
    if (!targetUid || targetUid === uid) return { error: "Invalid user" };
    const targetSnap = await getDoc(doc(db, "users", targetUid));
    if (!targetSnap.exists()) return { error: "User not found" };
    const target = targetSnap.data();
    await setDoc(doc(db, "users", uid, "friends", targetUid), {
      uid: targetUid, name: target.name, avatar: target.avatar, status: "pending", direction: "outgoing"
    });
    await setDoc(doc(db, "users", targetUid, "friends", uid), {
      uid, name: myProfile.name, avatar: myProfile.avatar, status: "pending", direction: "incoming"
    });
    return { success: true };
  }, []);

  const acceptFriend = useCallback(async (uid, friendUid) => {
    await updateDoc(doc(db, "users", uid, "friends", friendUid), { status: "accepted" });
    await updateDoc(doc(db, "users", friendUid, "friends", uid), { status: "accepted" }).catch(() => {});
  }, []);

  const removeFriend = useCallback(async (uid, friendUid) => {
    await deleteDoc(doc(db, "users", uid, "friends", friendUid));
    await deleteDoc(doc(db, "users", friendUid, "friends", uid)).catch(() => {});
  }, []);

  const inviteFriendToTask = useCallback(async (uid, friendUid, task) => {
    await setDoc(doc(db, "users", friendUid, "taskInvites", `${uid}_${task.id}`), {
      fromUid: uid, taskId: task.id, taskTitle: task.title, taskXp: task.xp || 20,
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
    const unsub = onSnapshot(collection(db, "users", uid, "taskInvites"), snap => setInvites(snap.docs.map(d => ({ id: d.id, ...d.data() }))));
    return unsub;
  }, [uid]);
  return invites;
}

/* ─── Gold & Rewards ─────────────────────────────────────────────────────── */
export function useGold(uid) {
  const [rewards, setRewards] = useState([]);
  const [shieldCount, setShieldCount] = useState(0);

  useEffect(() => {
    if (!uid) return;
    const unsub = onSnapshot(collection(db, "users", uid, "rewards"), snap => setRewards(snap.docs.map(d => ({ id: d.id, ...d.data() }))));
    return unsub;
  }, [uid]);

  const addReward = useCallback(async (uid, reward) => {
    await addDoc(collection(db, "users", uid, "rewards"), {
      ...reward, redeemed: false, createdAt: serverTimestamp()
    });
  }, []);

  const redeemReward = useCallback(async (uid, rewardId) => {
    await updateDoc(doc(db, "users", uid, "rewards", rewardId), { redeemed: true, redeemedAt: new Date().toISOString() });
  }, []);

  const deleteReward = useCallback(async (uid, rewardId) => {
    await deleteDoc(doc(db, "users", uid, "rewards", rewardId));
  }, []);

  const giftGold = useCallback(async (fromProfile, toUid, amount, updateProfile) => {
    if ((fromProfile.gold || 0) < amount) return { error: "Not enough gold" };
    // Deduct from sender
    await updateProfile({ gold: (fromProfile.gold || 0) - amount });
    // Add to receiver
    const toRef = doc(db, "users", toUid);
    const toSnap = await getDoc(toRef);
    if (!toSnap.exists()) return { error: "User not found" };
    const toData = toSnap.data();
    await updateDoc(toRef, { gold: (toData.gold || 0) + amount });
    return { success: true };
  }, []);

  return { rewards, addReward, redeemReward, deleteReward, giftGold };
}

/* ─── User Profile Lookup ─────────────────────────────────────────────────── */
export async function fetchUserProfile(uid) {
  const snap = await getDoc(doc(db, "users", uid));
  return snap.exists() ? { id: snap.id, ...snap.data() } : null;
}

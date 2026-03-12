// src/hooks/useData.js
import { useState, useEffect, useCallback } from "react";
import {
  collection, doc, onSnapshot, addDoc, updateDoc, deleteDoc,
  setDoc, query, orderBy, limit, serverTimestamp, arrayUnion, arrayRemove, where
} from "firebase/firestore";
import { db } from "../firebase/config";

/* ─── Tasks ──────────────────────────────────────────────────────────────── */
export function useTasks(uid) {
  const [tasks, setTasks] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!uid) return;
    const q = query(collection(db, "users", uid, "tasks"), orderBy("createdAt", "desc"));
    const unsub = onSnapshot(q, snap => {
      setTasks(snap.docs.map(d => ({ id: d.id, ...d.data() })));
      setLoading(false);
    });
    return unsub;
  }, [uid]);

  const addTask = useCallback(async (task) => {
    if (!uid) return;
    await addDoc(collection(db, "users", uid, "tasks"), {
      ...task, done: false, createdAt: serverTimestamp()
    });
  }, [uid]);

  const toggleTask = useCallback(async (taskId, done) => {
    if (!uid) return;
    await updateDoc(doc(db, "users", uid, "tasks", taskId), {
      done, doneAt: done ? serverTimestamp() : null
    });
  }, [uid]);

  const deleteTask = useCallback(async (taskId) => {
    if (!uid) return;
    await deleteDoc(doc(db, "users", uid, "tasks", taskId));
  }, [uid]);

  return { tasks, loading, addTask, toggleTask, deleteTask };
}

/* ─── Habits ─────────────────────────────────────────────────────────────── */
export function useHabits(uid) {
  const [habits, setHabits] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!uid) return;
    const q = query(collection(db, "users", uid, "habits"), orderBy("createdAt", "asc"));
    const unsub = onSnapshot(q, snap => {
      setHabits(snap.docs.map(d => ({ id: d.id, ...d.data() })));
      setLoading(false);
    });
    return unsub;
  }, [uid]);

  const addHabit = useCallback(async (habit) => {
    if (!uid) return;
    await addDoc(collection(db, "users", uid, "habits"), {
      ...habit, log: [], streak: 0, createdAt: serverTimestamp()
    });
  }, [uid]);

  const checkHabit = useCallback(async (habit) => {
    if (!uid) return;
    const today = new Date().toISOString().slice(0, 10);
    if (habit.log?.includes(today)) return false; // already done
    const newLog    = [...(habit.log || []), today];
    const newStreak = calcStreak(newLog);
    await updateDoc(doc(db, "users", uid, "habits", habit.id), {
      log: arrayUnion(today), streak: newStreak
    });
    return newStreak;
  }, [uid]);

  const deleteHabit = useCallback(async (habitId) => {
    if (!uid) return;
    await deleteDoc(doc(db, "users", uid, "habits", habitId));
  }, [uid]);

  return { habits, loading, addHabit, checkHabit, deleteHabit };
}

/* ─── Squad Feed ─────────────────────────────────────────────────────────── */
export function useFeed(roomId) {
  const [feed, setFeed] = useState([]);

  useEffect(() => {
    if (!roomId) return;
    const q = query(
      collection(db, "rooms", roomId, "feed"),
      orderBy("ts", "desc"),
      limit(50)
    );
    const unsub = onSnapshot(q, snap => {
      setFeed(snap.docs.map(d => ({ id: d.id, ...d.data() })));
    });
    return unsub;
  }, [roomId]);

  const postToFeed = useCallback(async (roomId, post) => {
    if (!roomId) return;
    await addDoc(collection(db, "rooms", roomId, "feed"), {
      ...post, ts: serverTimestamp(), likes: []
    });
  }, []);

  const likePost = useCallback(async (roomId, postId, uid, liked) => {
    const ref = doc(db, "rooms", roomId, "feed", postId);
    await updateDoc(ref, { likes: liked ? arrayUnion(uid) : arrayRemove(uid) });
  }, []);

  return { feed, postToFeed, likePost };
}

/* ─── Squad Members ──────────────────────────────────────────────────────── */
export function useSquadMembers(roomId) {
  const [members, setMembers] = useState([]);

  useEffect(() => {
    if (!roomId) return;
    const unsub = onSnapshot(collection(db, "rooms", roomId, "members"), snap => {
      setMembers(snap.docs.map(d => ({ id: d.id, ...d.data() })));
    });
    return unsub;
  }, [roomId]);

  const joinRoom = useCallback(async (roomId, profile) => {
    if (!roomId || !profile) return;
    await setDoc(doc(db, "rooms", roomId, "members", profile.uid), {
      uid:    profile.uid,
      name:   profile.name,
      avatar: profile.avatar,
      xp:     profile.xp || 0,
      streak: profile.streak || 0,
      updatedAt: serverTimestamp()
    }, { merge: true });
  }, []);

  const updateMemberStats = useCallback(async (roomId, uid, xp, streak) => {
    if (!roomId || !uid) return;
    await setDoc(doc(db, "rooms", roomId, "members", uid), { xp, streak, updatedAt: serverTimestamp() }, { merge: true });
  }, []);

  return { members, joinRoom, updateMemberStats };
}

/* ─── Mood Log ───────────────────────────────────────────────────────────── */
export function useMoodLog(uid) {
  const [moodLog, setMoodLog] = useState([]);

  useEffect(() => {
    if (!uid) return;
    const q = query(collection(db, "users", uid, "moods"), orderBy("ts", "desc"), limit(60));
    const unsub = onSnapshot(q, snap => {
      setMoodLog(snap.docs.map(d => ({ id: d.id, ...d.data() })));
    });
    return unsub;
  }, [uid]);

  const logMood = useCallback(async (uid, mood) => {
    await addDoc(collection(db, "users", uid, "moods"), {
      mood, date: new Date().toISOString().slice(0, 10), ts: serverTimestamp()
    });
  }, []);

  return { moodLog, logMood };
}

/* ─── Helpers ────────────────────────────────────────────────────────────── */
function calcStreak(log) {
  if (!log?.length) return 0;
  const sorted = [...new Set(log)].sort().reverse();
  let streak = 0;
  let cur = new Date(); cur.setHours(0, 0, 0, 0);
  for (const d of sorted) {
    const date = new Date(d + "T00:00:00");
    const diff = (cur - date) / (1000 * 60 * 60 * 24);
    if (diff > 1) break;
    streak++;
    cur = date;
  }
  return streak;
}

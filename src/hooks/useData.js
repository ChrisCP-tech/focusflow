// src/hooks/useData.js
import { useState, useEffect, useCallback } from "react";
import {
  collection, doc, onSnapshot, addDoc, updateDoc, deleteDoc,
  setDoc, query, orderBy, limit, serverTimestamp, arrayUnion, arrayRemove, where, getDoc
} from "firebase/firestore";
import { db } from "../firebase/config";

/* ─── Tasks ──────────────────────────────────────────────────────────────── */
export function useTasks(uid) {
  const [tasks, setTasks] = useState([]);
  const [loading, setLoading] = useState(true);
  useEffect(() => {
    if (!uid) return;
    const q = query(collection(db, "users", uid, "tasks"), orderBy("createdAt", "desc"));
    const unsub = onSnapshot(q, snap => { setTasks(snap.docs.map(d => ({ id: d.id, ...d.data() }))); setLoading(false); });
    return unsub;
  }, [uid]);
  const addTask = useCallback(async (task) => {
    if (!uid) return;
    await addDoc(collection(db, "users", uid, "tasks"), { ...task, done: false, isPublic: task.isPublic !== false, createdAt: serverTimestamp() });
  }, [uid]);
  const toggleTask = useCallback(async (taskId, done) => {
    if (!uid) return;
    await updateDoc(doc(db, "users", uid, "tasks", taskId), { done, doneAt: done ? serverTimestamp() : null });
  }, [uid]);
  const deleteTask = useCallback(async (taskId) => {
    if (!uid) return;
    await deleteDoc(doc(db, "users", uid, "tasks", taskId));
  }, [uid]);
  const toggleTaskPrivacy = useCallback(async (taskId, isPublic) => {
    if (!uid) return;
    await updateDoc(doc(db, "users", uid, "tasks", taskId), { isPublic });
  }, [uid]);
  return { tasks, loading, addTask, toggleTask, deleteTask, toggleTaskPrivacy };
}

/* ─── Habits ─────────────────────────────────────────────────────────────── */
export function useHabits(uid) {
  const [habits, setHabits] = useState([]);
  const [loading, setLoading] = useState(true);
  useEffect(() => {
    if (!uid) return;
    const q = query(collection(db, "users", uid, "habits"), orderBy("createdAt", "asc"));
    const unsub = onSnapshot(q, snap => { setHabits(snap.docs.map(d => ({ id: d.id, ...d.data() }))); setLoading(false); });
    return unsub;
  }, [uid]);
  const addHabit = useCallback(async (habit) => {
    if (!uid) return;
    await addDoc(collection(db, "users", uid, "habits"), { ...habit, log: [], streak: 0, isPublic: habit.isPublic !== false, createdAt: serverTimestamp() });
  }, [uid]);
  const checkHabit = useCallback(async (habit) => {
    if (!uid) return;
    const todayStr = new Date().toISOString().slice(0, 10);
    if (habit.log?.includes(todayStr)) return false;
    const newLog = [...(habit.log || []), todayStr];
    const newStreak = calcStreak(newLog);
    await updateDoc(doc(db, "users", uid, "habits", habit.id), { log: arrayUnion(todayStr), streak: newStreak });
    return newStreak;
  }, [uid]);
  const deleteHabit = useCallback(async (habitId) => {
    if (!uid) return;
    await deleteDoc(doc(db, "users", uid, "habits", habitId));
  }, [uid]);
  const toggleHabitPrivacy = useCallback(async (habitId, isPublic) => {
    if (!uid) return;
    await updateDoc(doc(db, "users", uid, "habits", habitId), { isPublic });
  }, [uid]);
  return { habits, loading, addHabit, checkHabit, deleteHabit, toggleHabitPrivacy };
}

/* ─── Squad Feed ─────────────────────────────────────────────────────────── */
export function useFeed(roomId) {
  const [feed, setFeed] = useState([]);
  useEffect(() => {
    if (!roomId) return;
    const q = query(collection(db, "rooms", roomId, "feed"), orderBy("ts", "desc"), limit(50));
    const unsub = onSnapshot(q, snap => { setFeed(snap.docs.map(d => ({ id: d.id, ...d.data() }))); });
    return unsub;
  }, [roomId]);
  const postToFeed = useCallback(async (roomId, post) => {
    if (!roomId) return;
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

/* ─── Squad Members ──────────────────────────────────────────────────────── */
export function useSquadMembers(roomId) {
  const [members, setMembers] = useState([]);
  useEffect(() => {
    if (!roomId) return;
    const unsub = onSnapshot(collection(db, "rooms", roomId, "members"), snap => { setMembers(snap.docs.map(d => ({ id: d.id, ...d.data() }))); });
    return unsub;
  }, [roomId]);
  const joinRoom = useCallback(async (roomId, profile) => {
    if (!roomId || !profile) return;
    await setDoc(doc(db, "rooms", roomId, "members", profile.uid), { uid: profile.uid, name: profile.name, avatar: profile.avatar, xp: profile.xp || 0, streak: profile.streak || 0, updatedAt: serverTimestamp() }, { merge: true });
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
    const unsub = onSnapshot(q, snap => { setMoodLog(snap.docs.map(d => ({ id: d.id, ...d.data() }))); });
    return unsub;
  }, [uid]);
  const logMood = useCallback(async (uid, mood) => {
    await addDoc(collection(db, "users", uid, "moods"), { mood, date: new Date().toISOString().slice(0, 10), ts: serverTimestamp() });
  }, []);
  return { moodLog, logMood };
}

/* ─── Friends ────────────────────────────────────────────────────────────── */
export function useFriends(uid) {
  const [friends, setFriends] = useState([]);
  const [requests, setRequests] = useState([]);
  const [outgoing, setOutgoing] = useState([]);

  useEffect(() => {
    if (!uid) return;
    const unsub1 = onSnapshot(query(collection(db, "users", uid, "friends"), where("status", "==", "accepted")), snap => setFriends(snap.docs.map(d => ({ id: d.id, ...d.data() }))));
    const unsub2 = onSnapshot(query(collection(db, "users", uid, "friends"), where("status", "==", "pending"), where("direction", "==", "incoming")), snap => setRequests(snap.docs.map(d => ({ id: d.id, ...d.data() }))));
    const unsub3 = onSnapshot(query(collection(db, "users", uid, "friends"), where("status", "==", "pending"), where("direction", "==", "outgoing")), snap => setOutgoing(snap.docs.map(d => ({ id: d.id, ...d.data() }))));
    return () => { unsub1(); unsub2(); unsub3(); };
  }, [uid]);

  const sendFriendRequest = useCallback(async (uid, targetUid, myProfile) => {
    if (!uid || !targetUid || uid === targetUid) return { error: "Invalid" };
    const targetSnap = await getDoc(doc(db, "users", targetUid));
    if (!targetSnap.exists()) return { error: "User not found" };
    const tp = targetSnap.data();
    await setDoc(doc(db, "users", uid, "friends", targetUid), { uid: targetUid, name: tp.name, avatar: tp.avatar, status: "pending", direction: "outgoing", ts: serverTimestamp() });
    await setDoc(doc(db, "users", targetUid, "friends", uid), { uid, name: myProfile.name, avatar: myProfile.avatar, status: "pending", direction: "incoming", ts: serverTimestamp() });
    return { success: true };
  }, []);

  const acceptFriendRequest = useCallback(async (uid, fromUid) => {
    await updateDoc(doc(db, "users", uid, "friends", fromUid), { status: "accepted" });
    await updateDoc(doc(db, "users", fromUid, "friends", uid), { status: "accepted" });
  }, []);

  const declineFriendRequest = useCallback(async (uid, fromUid) => {
    await deleteDoc(doc(db, "users", uid, "friends", fromUid));
    await deleteDoc(doc(db, "users", fromUid, "friends", uid));
  }, []);

  const removeFriend = useCallback(async (uid, friendUid) => {
    await deleteDoc(doc(db, "users", uid, "friends", friendUid));
    await deleteDoc(doc(db, "users", friendUid, "friends", uid));
  }, []);

  return { friends, requests, outgoing, sendFriendRequest, acceptFriendRequest, declineFriendRequest, removeFriend };
}

/* ─── Friend public content ──────────────────────────────────────────────── */
export function useFriendContent(friendUid) {
  const [tasks, setTasks] = useState([]);
  const [habits, setHabits] = useState([]);
  const [profile, setProfile] = useState(null);

  useEffect(() => {
    if (!friendUid) return;
    const unsub0 = onSnapshot(doc(db, "users", friendUid), snap => { if (snap.exists()) setProfile(snap.data()); });
    const q1 = query(collection(db, "users", friendUid, "tasks"), where("isPublic", "==", true), orderBy("createdAt", "desc"), limit(20));
    const unsub1 = onSnapshot(q1, snap => setTasks(snap.docs.map(d => ({ id: d.id, ...d.data() }))));
    const q2 = query(collection(db, "users", friendUid, "habits"), where("isPublic", "==", true), orderBy("createdAt", "asc"), limit(20));
    const unsub2 = onSnapshot(q2, snap => setHabits(snap.docs.map(d => ({ id: d.id, ...d.data() }))));
    return () => { unsub0(); unsub1(); unsub2(); };
  }, [friendUid]);

  return { tasks, habits, profile };
}

/* ─── Group Pomodoro ─────────────────────────────────────────────────────── */
export function useGroupPomodoro(sessionId) {
  const [session, setSession] = useState(null);
  const [messages, setMessages] = useState([]);
  const [participants, setParticipants] = useState([]);

  useEffect(() => {
    if (!sessionId) return;
    const unsub1 = onSnapshot(doc(db, "pomodoroSessions", sessionId), snap => { if (snap.exists()) setSession({ id: snap.id, ...snap.data() }); });
    const unsub2 = onSnapshot(query(collection(db, "pomodoroSessions", sessionId, "messages"), orderBy("ts", "asc"), limit(200)), snap => setMessages(snap.docs.map(d => ({ id: d.id, ...d.data() }))));
    const unsub3 = onSnapshot(collection(db, "pomodoroSessions", sessionId, "participants"), snap => setParticipants(snap.docs.map(d => ({ id: d.id, ...d.data() }))));
    return () => { unsub1(); unsub2(); unsub3(); };
  }, [sessionId]);

  const createSession = useCallback(async (hostProfile, durationMins) => {
    const ref = await addDoc(collection(db, "pomodoroSessions"), {
      hostUid: hostProfile.uid, hostName: hostProfile.name, hostAvatar: hostProfile.avatar,
      durationMins, status: "waiting", startedAt: null, endsAt: null, createdAt: serverTimestamp(),
    });
    await setDoc(doc(db, "pomodoroSessions", ref.id, "participants", hostProfile.uid), { uid: hostProfile.uid, name: hostProfile.name, avatar: hostProfile.avatar, joinedAt: serverTimestamp() });
    return ref.id;
  }, []);

  const joinSession = useCallback(async (sessionId, profile) => {
    await setDoc(doc(db, "pomodoroSessions", sessionId, "participants", profile.uid), { uid: profile.uid, name: profile.name, avatar: profile.avatar, joinedAt: serverTimestamp() });
  }, []);

  const startSession = useCallback(async (sessionId, durationMins) => {
    const endsAt = new Date(Date.now() + durationMins * 60 * 1000).toISOString();
    await updateDoc(doc(db, "pomodoroSessions", sessionId), { status: "running", startedAt: serverTimestamp(), endsAt });
  }, []);

  const endSession = useCallback(async (sessionId) => {
    await updateDoc(doc(db, "pomodoroSessions", sessionId), { status: "done" });
  }, []);

  const sendMessage = useCallback(async (sessionId, profile, text) => {
    await addDoc(collection(db, "pomodoroSessions", sessionId, "messages"), { uid: profile.uid, name: profile.name, avatar: profile.avatar, text, ts: serverTimestamp() });
  }, []);

  const leaveSession = useCallback(async (sessionId, uid) => {
    await deleteDoc(doc(db, "pomodoroSessions", sessionId, "participants", uid));
  }, []);

  return { session, messages, participants, createSession, joinSession, startSession, endSession, sendMessage, leaveSession };
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

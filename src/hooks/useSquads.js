// src/hooks/useSquads.js
import { useState, useEffect, useCallback } from "react";
import {
  collection, doc, onSnapshot, addDoc, updateDoc,
  setDoc, query, orderBy, limit, serverTimestamp,
  arrayUnion, arrayRemove, getDoc, getDocs, where
} from "firebase/firestore";
import { db } from "../firebase/config";

/* ─── Squads ─────────────────────────────────────────────────────────────── */
export function useSquads(uid) {
  const [squads, setSquads] = useState([]);

  useEffect(() => {
    if (!uid) return;
    const unsub = onSnapshot(
      query(collection(db, "squads"), where("memberIds", "array-contains", uid), orderBy("createdAt", "desc")),
      snap => setSquads(snap.docs.map(d => ({ id: d.id, ...d.data() })))
    );
    return unsub;
  }, [uid]);

  const createSquad = useCallback(async (profile, name, emoji = "👥") => {
    const ref = await addDoc(collection(db, "squads"), {
      name, emoji, ownerId: profile.uid,
      memberIds: [profile.uid],
      members: [{ uid: profile.uid, name: profile.name, avatar: profile.avatar, xp: profile.xp || 0, streak: profile.streak || 0 }],
      createdAt: serverTimestamp(),
      inviteCode: Math.random().toString(36).slice(2, 8).toUpperCase()
    });
    return ref.id;
  }, []);

  const joinSquadByCode = useCallback(async (code, profile) => {
    const snap = await getDocs(query(collection(db, "squads"), where("inviteCode", "==", code.toUpperCase())));
    if (snap.empty) return { error: "Squad not found" };
    const squadDoc = snap.docs[0];
    const squadId = squadDoc.id;
    const existing = squadDoc.data().memberIds || [];
    if (existing.includes(profile.uid)) return { error: "Already in this squad" };
    await updateDoc(doc(db, "squads", squadId), {
      memberIds: arrayUnion(profile.uid),
      members: arrayUnion({ uid: profile.uid, name: profile.name, avatar: profile.avatar, xp: profile.xp || 0, streak: profile.streak || 0 })
    });
    return { success: true, squadId };
  }, []);

  const leaveSquad = useCallback(async (squadId, profile) => {
    const squadSnap = await getDoc(doc(db, "squads", squadId));
    const squad = squadSnap.data();
    const updatedMembers = (squad.members || []).filter(m => m.uid !== profile.uid);
    await updateDoc(doc(db, "squads", squadId), {
      memberIds: arrayRemove(profile.uid),
      members: updatedMembers
    });
  }, []);

  const updateSquadMemberStats = useCallback(async (squadId, profile) => {
    if (!squadId || !profile) return;
    const squadSnap = await getDoc(doc(db, "squads", squadId));
    if (!squadSnap.exists()) return;
    const squad = squadSnap.data();
    const updatedMembers = (squad.members || []).map(m =>
      m.uid === profile.uid ? { ...m, xp: profile.xp || 0, streak: profile.streak || 0 } : m
    );
    await updateDoc(doc(db, "squads", squadId), { members: updatedMembers });
  }, []);

  return { squads, createSquad, joinSquadByCode, leaveSquad, updateSquadMemberStats };
}

/* ─── Squad Feed ─────────────────────────────────────────────────────────── */
export function useSquadFeed(squadId) {
  const [feed, setFeed] = useState([]);

  useEffect(() => {
    if (!squadId) return;
    const q = query(collection(db, "squads", squadId, "feed"), orderBy("ts", "desc"), limit(60));
    const unsub = onSnapshot(q, snap => setFeed(snap.docs.map(d => ({ id: d.id, ...d.data() }))));
    return unsub;
  }, [squadId]);

  const postToFeed = useCallback(async (squadId, post) => {
    await addDoc(collection(db, "squads", squadId, "feed"), { ...post, ts: serverTimestamp(), likes: [], comments: [] });
  }, []);

  const likePost = useCallback(async (squadId, postId, uid, liked) => {
    await updateDoc(doc(db, "squads", squadId, "feed", postId), { likes: liked ? arrayUnion(uid) : arrayRemove(uid) });
  }, []);

  const commentOnPost = useCallback(async (squadId, postId, comment) => {
    await updateDoc(doc(db, "squads", squadId, "feed", postId), { comments: arrayUnion(comment) });
  }, []);

  return { feed, postToFeed, likePost, commentOnPost };
}

/* ─── Squad Challenges ───────────────────────────────────────────────────── */
export function useSquadChallenges(squadId) {
  const [challenges, setChallenges] = useState([]);

  useEffect(() => {
    if (!squadId) return;
    const q = query(collection(db, "squads", squadId, "challenges"), orderBy("createdAt", "desc"), limit(20));
    const unsub = onSnapshot(q, snap => setChallenges(snap.docs.map(d => ({ id: d.id, ...d.data() }))));
    return unsub;
  }, [squadId]);

  const createChallenge = useCallback(async (squadId, profile, habitData) => {
    await addDoc(collection(db, "squads", squadId, "challenges"), {
      name: habitData.name, icon: habitData.icon || "🎯", color: habitData.color || "#6C63FF",
      createdBy: { uid: profile.uid, name: profile.name, avatar: profile.avatar },
      completions: {},
      startDate: new Date().toISOString().slice(0, 10),
      endDate: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString().slice(0, 10),
      createdAt: serverTimestamp()
    });
  }, []);

  const logChallengeCompletion = useCallback(async (squadId, challengeId, uid, date) => {
    await updateDoc(doc(db, "squads", squadId, "challenges", challengeId), {
      [`completions.${uid}`]: arrayUnion(date)
    });
  }, []);

  return { challenges, createChallenge, logChallengeCompletion };
}

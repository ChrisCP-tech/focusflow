// src/hooks/useSquads.js
import { useState, useEffect, useCallback } from "react";
import {
  collection, doc, onSnapshot, addDoc, updateDoc, deleteDoc,
  query, orderBy, limit, serverTimestamp,
  arrayUnion, arrayRemove, getDoc, getDocs, where
} from "firebase/firestore";
import { db } from "../firebase/config";

export function useSquads(uid) {
  const [squads, setSquads] = useState([]);

  useEffect(() => {
    if (!uid) return;
    // NOTE: no orderBy here — avoids needing a composite Firestore index
    const unsub = onSnapshot(
      query(collection(db, "squads"), where("memberIds", "array-contains", uid)),
      snap => {
        const list = snap.docs.map(d => ({ id: d.id, ...d.data() }));
        // Sort client-side instead
        list.sort((a, b) => (b.createdAt?.seconds || 0) - (a.createdAt?.seconds || 0));
        setSquads(list);
      },
      err => console.error("Squad listen error:", err)
    );
    return unsub;
  }, [uid]);

  const createSquad = useCallback(async (profile, name, emoji = "👥") => {
    if (!profile?.uid) { console.error("No profile uid"); return null; }
    try {
      const ref = await addDoc(collection(db, "squads"), {
        name: name.trim(),
        emoji,
        ownerId: profile.uid,
        memberIds: [profile.uid],
        members: [{
          uid: profile.uid,
          name: profile.name || "Unknown",
          avatar: profile.avatar || "🦊",
          xp: profile.xp || 0,
          streak: profile.streak || 0
        }],
        createdAt: serverTimestamp(),
        inviteCode: Math.random().toString(36).slice(2, 8).toUpperCase()
      });
      console.log("Squad created:", ref.id);
      return ref.id;
    } catch (e) {
      console.error("createSquad error:", e);
      return null;
    }
  }, []);

  const joinSquadByCode = useCallback(async (code, profile) => {
    try {
      const snap = await getDocs(
        query(collection(db, "squads"), where("inviteCode", "==", code.toUpperCase()))
      );
      if (snap.empty) return { error: "Squad not found — check the code" };
      const squadDoc = snap.docs[0];
      const data = squadDoc.data();
      if ((data.memberIds || []).includes(profile.uid)) return { error: "You're already in this squad" };
      const memberObj = { uid: profile.uid, name: profile.name, avatar: profile.avatar, xp: profile.xp || 0, streak: profile.streak || 0 };
      await updateDoc(doc(db, "squads", squadDoc.id), {
        memberIds: arrayUnion(profile.uid),
        members: arrayUnion(memberObj)
      });
      return { success: true, squadId: squadDoc.id };
    } catch (e) {
      console.error("joinSquad error:", e);
      return { error: e.message };
    }
  }, []);

  const leaveSquad = useCallback(async (squadId, profile) => {
    const snap = await getDoc(doc(db, "squads", squadId));
    const squad = snap.data();
    const updatedMembers = (squad.members || []).filter(m => m.uid !== profile.uid);
    await updateDoc(doc(db, "squads", squadId), {
      memberIds: arrayRemove(profile.uid),
      members: updatedMembers
    });
  }, []);

  const deleteSquad = useCallback(async (squadId) => {
    await deleteDoc(doc(db, "squads", squadId));
  }, []);

  return { squads, createSquad, joinSquadByCode, leaveSquad, deleteSquad };
}

export function useSquadFeed(squadId) {
  const [feed, setFeed] = useState([]);
  useEffect(() => {
    if (!squadId) return;
    const unsub = onSnapshot(
      query(collection(db, "squads", squadId, "feed"), orderBy("ts", "desc"), limit(60)),
      snap => setFeed(snap.docs.map(d => ({ id: d.id, ...d.data() }))),
      err => console.error("Squad feed error:", err)
    );
    return unsub;
  }, [squadId]);

  const postToFeed   = useCallback(async (sId, post) => { await addDoc(collection(db, "squads", sId, "feed"), { ...post, ts: serverTimestamp(), likes: [], comments: [] }); }, []);
  const likePost     = useCallback(async (sId, pId, uid, liked) => { await updateDoc(doc(db, "squads", sId, "feed", pId), { likes: liked ? arrayUnion(uid) : arrayRemove(uid) }); }, []);
  const commentOnPost= useCallback(async (sId, pId, comment) => { await updateDoc(doc(db, "squads", sId, "feed", pId), { comments: arrayUnion(comment) }); }, []);

  return { feed, postToFeed, likePost, commentOnPost };
}

export function useSquadChallenges(squadId) {
  const [challenges, setChallenges] = useState([]);
  useEffect(() => {
    if (!squadId) return;
    const unsub = onSnapshot(
      query(collection(db, "squads", squadId, "challenges"), orderBy("createdAt", "desc"), limit(20)),
      snap => setChallenges(snap.docs.map(d => ({ id: d.id, ...d.data() }))),
      err => console.error("Challenges error:", err)
    );
    return unsub;
  }, [squadId]);

  const createChallenge = useCallback(async (sId, profile, habitData) => {
    await addDoc(collection(db, "squads", sId, "challenges"), {
      name: habitData.name, icon: habitData.icon || "🎯", color: habitData.color || "#6C63FF",
      createdBy: { uid: profile.uid, name: profile.name, avatar: profile.avatar },
      completions: {},
      startDate: new Date().toISOString().slice(0, 10),
      endDate: new Date(Date.now() + 7 * 86400000).toISOString().slice(0, 10),
      createdAt: serverTimestamp()
    });
  }, []);

  const logChallengeCompletion = useCallback(async (sId, cId, uid, date) => {
    await updateDoc(doc(db, "squads", sId, "challenges", cId), { [`completions.${uid}`]: arrayUnion(date) });
  }, []);

  return { challenges, createChallenge, logChallengeCompletion };
}

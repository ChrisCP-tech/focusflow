// src/hooks/useAuth.js
import { useState, useEffect } from "react";
import { onAuthStateChanged, signInWithPopup, signInWithRedirect, getRedirectResult, signOut } from "firebase/auth";
import { doc, getDoc, setDoc, updateDoc, collection, getDocs, query, where, serverTimestamp } from "firebase/firestore";
import { auth, db, provider } from "../firebase/config";

export function useAuth() {
  const [user,    setUser]    = useState(undefined);
  const [profile, setProfile] = useState(null);

  useEffect(() => {
    // Handle redirect result first (fires after Google redirects back)
    getRedirectResult(auth).catch(e => console.error("redirect result", e));

    const unsub = onAuthStateChanged(auth, async (firebaseUser) => {
      if (firebaseUser) {
        setUser(firebaseUser);
        const ref  = doc(db, "users", firebaseUser.uid);
        const snap = await getDoc(ref);
        if (snap.exists()) {
          setProfile(snap.data());
        } else {
          const newProfile = {
            uid:      firebaseUser.uid,
            name:     firebaseUser.displayName || "Friend",
            email:    firebaseUser.email,
            photoURL: firebaseUser.photoURL,
            avatar:   randomAvatar(),
            xp:       0, streak: 0, adhdMode: true,
            lastDate: today(), joinedAt: serverTimestamp(),
          };
          await setDoc(ref, newProfile);
          setProfile(newProfile);
        }
      } else {
        setUser(null);
        setProfile(null);
      }
    });
    return unsub;
  }, []);

  async function login() {
    try { await signInWithRedirect(auth, provider); } catch (e) { console.error(e); }
  }

  async function logout() { await signOut(auth); }

  async function updateProfile(data) {
    if (!user) return;
    const uid = user.uid;

    // Update main profile doc
    await setDoc(doc(db, "users", uid), data, { merge: true });
    setProfile(p => ({ ...p, ...data }));

    // If name or avatar changed, sync everywhere
    const nameChanged   = data.name   !== undefined;
    const avatarChanged = data.avatar !== undefined;
    if (!nameChanged && !avatarChanged) return;

    const updatedName   = data.name   ?? profile?.name;
    const updatedAvatar = data.avatar ?? profile?.avatar;

    // Sync global squad room members
    try {
      const roomId = new URLSearchParams(window.location.search).get("room") || "global_squad_v1";
      await setDoc(doc(db, "rooms", roomId, "members", uid), { name: updatedName, avatar: updatedAvatar }, { merge: true });
    } catch (e) { console.error("room sync", e); }

    // Sync all squads this user is in
    try {
      const squadsSnap = await getDocs(query(collection(db, "squads"), where("memberIds", "array-contains", uid)));
      for (const squadDoc of squadsSnap.docs) {
        const squad = squadDoc.data();
        const updatedMembers = (squad.members || []).map(m =>
          m.uid === uid ? { ...m, name: updatedName, avatar: updatedAvatar } : m
        );
        await updateDoc(doc(db, "squads", squadDoc.id), { members: updatedMembers });
      }
    } catch (e) { console.error("squads sync", e); }
  }

  return { user, profile, login, logout, updateProfile };
}

const AVATARS = ["🦊","🐼","🦋","🐸","🦄","🐙","🦁","🐺","🐨","🦝","🦩","🐬"];
function randomAvatar() { return AVATARS[Math.floor(Math.random() * AVATARS.length)]; }
function today() { return new Date().toISOString().slice(0, 10); }

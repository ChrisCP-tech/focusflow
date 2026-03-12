// src/hooks/useAuth.js
import { useState, useEffect } from "react";
import { onAuthStateChanged, signInWithPopup, signOut } from "firebase/auth";
import { doc, getDoc, setDoc, serverTimestamp } from "firebase/firestore";
import { auth, db, provider } from "../firebase/config";

export function useAuth() {
  const [user,    setUser]    = useState(undefined);
  const [profile, setProfile] = useState(null);

  useEffect(() => {
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
            xp:       0,
            streak:   0,
            adhdMode: true,
            lastDate: today(),
            joinedAt: serverTimestamp(),
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
    try { await signInWithPopup(auth, provider); } catch (e) { console.error(e); }
  }

  async function logout() {
    await signOut(auth);
  }

  async function updateProfile(data) {
    if (!user) return;
    const ref = doc(db, "users", user.uid);
    await setDoc(ref, data, { merge: true });
    setProfile(p => ({ ...p, ...data }));
  }

  return { user, profile, login, logout, updateProfile };
}

const AVATARS = ["🦊","🐼","🦋","🐸","🦄","🐙","🦁","🐺","🐨","🦝","🦩","🐬"];
function randomAvatar() { return AVATARS[Math.floor(Math.random() * AVATARS.length)]; }
function today() { return new Date().toISOString().slice(0, 10); }
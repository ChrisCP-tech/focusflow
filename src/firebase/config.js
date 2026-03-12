// src/firebase/config.js
// ─────────────────────────────────────────────────────────────────────────────
// STEP 1: Go to https://console.firebase.google.com
// STEP 2: Create a new project called "focusflow"
// STEP 3: Click "Add app" > Web app icon (</>)
// STEP 4: Register app, copy your firebaseConfig object and paste it below
// STEP 5: In Firebase console → Authentication → Sign-in method → Enable Google
// STEP 6: In Firebase console → Firestore Database → Create database (start in test mode)
// ─────────────────────────────────────────────────────────────────────────────

import { initializeApp } from "firebase/app";
import { getAuth, GoogleAuthProvider } from "firebase/auth";
import { getFirestore } from "firebase/firestore";

const firebaseConfig = {
  apiKey: "AIzaSyDB78Mesjcd0gINo_UGiv-oP-RENebcyOU",
  authDomain: "focusflow-1b7f2.firebaseapp.com",
  projectId: "focusflow-1b7f2",
  storageBucket: "focusflow-1b7f2.firebasestorage.app",
  messagingSenderId: "884704547050",
  appId: "1:884704547050:web:c6e2a2132fabdeb1c5c793"
};

const app        = initializeApp(firebaseConfig);
export const auth     = getAuth(app);
export const db       = getFirestore(app);
export const provider = new GoogleAuthProvider();

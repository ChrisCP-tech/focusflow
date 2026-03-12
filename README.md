# 🧠 FocusFlow — ADHD Squad Planner

A gamified, cross-device ADHD planner with real-time squad sharing, built with React + Firebase.

---

## ✅ Features

- **Google Sign-In** — one account, all devices (phone, laptop, tablet)
- **Tasks** — priority levels, tags, XP rewards, due times
- **Habits** — daily tracking with streaks + 7-day visual history
- **Focus Timer** — Pomodoro-style, earn 40 XP per session
- **Mood Check-in** — 5 ADHD-aware moods logged daily
- **Squad Feed** — real-time social feed shared with friends
- **Leaderboard** — XP rankings across your squad
- **Invite Link** — share a URL, anyone who opens it joins your squad
- **XP + Levels** — 11 levels from Seedling → Legend
- **PWA** — add to home screen on iPhone/Android for app-feel

---

## 🚀 Setup (takes ~15 minutes)

### Step 1 — Firebase Project

1. Go to [https://console.firebase.google.com](https://console.firebase.google.com)
2. Click **Add project** → name it `focusflow` → Continue
3. Disable Google Analytics (optional) → **Create project**

### Step 2 — Enable Authentication

1. In Firebase Console → **Authentication** → **Get started**
2. Click **Sign-in method** tab → **Google** → Enable → Save

### Step 3 — Create Firestore Database

1. In Firebase Console → **Firestore Database** → **Create database**
2. Choose **Start in test mode** → Next → Select a region → Done

### Step 4 — Register Web App

1. In Firebase Console → Project Overview → click **</>** (Web app icon)
2. App nickname: `focusflow-web` → **Register app**
3. Copy the `firebaseConfig` object shown

### Step 5 — Paste Config

Open `src/firebase/config.js` and replace the placeholder values:

```js
const firebaseConfig = {
  apiKey:            "AIza...",
  authDomain:        "focusflow-xxxxx.firebaseapp.com",
  projectId:         "focusflow-xxxxx",
  storageBucket:     "focusflow-xxxxx.appspot.com",
  messagingSenderId: "123456789",
  appId:             "1:123456789:web:abcdef"
};
```

### Step 6 — Add Authorized Domain (for Google Sign-In)

When you deploy, you need to whitelist your domain:

1. Firebase Console → Authentication → **Settings** tab → Authorized domains
2. Add your Vercel URL: e.g. `focusflow.vercel.app`

---

## 💻 Run Locally

```bash
npm install
npm start
```

Opens at [http://localhost:3000](http://localhost:3000)

---

## 🌐 Deploy to Vercel (Free, Recommended)

1. Push this folder to a GitHub repo
2. Go to [https://vercel.com](https://vercel.com) → New Project → Import your repo
3. Framework: **Create React App** → Deploy
4. Your app is live at `https://your-app.vercel.app`
5. Add that URL to Firebase Authorized domains (Step 6 above)

---

## 🔥 Deploy to Firebase Hosting (Alternative)

```bash
npm install -g firebase-tools
firebase login
firebase init hosting   # select your project, public dir = "build", SPA = yes
npm run build
firebase deploy
```

---

## 📱 Install as App on Phone

**iPhone:** Open in Safari → Share button → **Add to Home Screen**  
**Android:** Open in Chrome → menu → **Add to Home Screen** / **Install app**

---

## 🔒 Firestore Security Rules

Deploy the included `firestore.rules`:

```bash
firebase deploy --only firestore:rules
```

Or paste the contents into Firebase Console → Firestore → **Rules** tab.

---

## 📁 Project Structure

```
focusflow/
├── public/
│   ├── index.html          # PWA-ready HTML
│   └── manifest.json       # PWA manifest
├── src/
│   ├── firebase/
│   │   └── config.js       # ← PASTE YOUR FIREBASE CONFIG HERE
│   ├── hooks/
│   │   ├── useAuth.js      # Google auth + user profile
│   │   └── useData.js      # Tasks, habits, feed, moods (Firestore)
│   ├── components/
│   │   ├── UI.jsx          # Shared UI components
│   │   ├── Nav.jsx         # TopBar + BottomNav
│   │   ├── LoginScreen.jsx # Google sign-in screen
│   │   ├── Onboard.jsx     # First-time setup
│   │   ├── Pages.jsx       # Home, Tasks, Habits pages
│   │   └── MorePages.jsx   # Focus, Social, Profile pages
│   ├── utils.js            # Constants + helpers
│   ├── App.js              # Main app + Firebase wiring
│   └── index.js            # React entry point
├── firebase.json           # Firebase hosting config
├── firestore.rules         # Security rules
└── package.json
```

---

## 🛠 Troubleshooting

**"auth/unauthorized-domain" error on login:**  
→ Add your domain to Firebase Console → Authentication → Settings → Authorized domains

**Firestore permission errors:**  
→ Deploy `firestore.rules` or set rules to test mode temporarily

**Google sign-in popup blocked:**  
→ Make sure popups aren't blocked in your browser for localhost

---

## 🔑 Key Firebase Docs

- [Firebase Auth Web](https://firebase.google.com/docs/auth/web/google-signin)
- [Firestore Web](https://firebase.google.com/docs/firestore/quickstart)
- [Firebase Hosting](https://firebase.google.com/docs/hosting/quickstart)

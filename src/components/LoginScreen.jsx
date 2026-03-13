// src/components/LoginScreen.jsx
export default function LoginScreen({ onLogin }) {
  return (
    <div style={{
      minHeight: "100vh", display: "flex", alignItems: "center",
      justifyContent: "center", padding: 24,
      background: "radial-gradient(ellipse at 30% 20%, rgba(108,99,255,0.15) 0%, transparent 60%), radial-gradient(ellipse at 80% 80%, rgba(253,203,110,0.1) 0%, transparent 60%), #0B0D17"
    }}>
      <div style={{ width: "100%", maxWidth: 380, textAlign: "center", animation: "fadeUp 0.4s ease" }}>

        {/* Logo */}
        <div style={{ fontSize: 64, marginBottom: 16, filter: "drop-shadow(0 0 24px rgba(108,99,255,0.5))" }}>🧠</div>
        <h1 style={{
          fontFamily: "'Syne', sans-serif", fontWeight: 800, fontSize: 38,
          background: "linear-gradient(135deg,#6C63FF,#FDCB6E)",
          WebkitBackgroundClip: "text", WebkitTextFillColor: "transparent",
          marginBottom: 8
        }}>Temper Ascension</h1>
        <p style={{ color: "rgba(255,255,255,0.45)", fontSize: 15, marginBottom: 48, lineHeight: 1.5 }}>
          Your ADHD-friendly squad planner.<br />One account. Every device. 🚀
        </p>

        {/* Feature pills */}
        <div style={{ display: "flex", flexWrap: "wrap", gap: 8, justifyContent: "center", marginBottom: 40 }}>
          {["✅ Tasks + XP","🔥 Habit streaks","⏱ Focus timer","👥 Squad feed","📊 Mood tracking","🏆 Leaderboard"].map(f => (
            <div key={f} style={{
              background: "rgba(255,255,255,0.05)", border: "1px solid rgba(255,255,255,0.08)",
              borderRadius: 20, padding: "5px 12px", fontSize: 12, color: "rgba(255,255,255,0.6)"
            }}>{f}</div>
          ))}
        </div>

        {/* Sign in */}
        <button onClick={onLogin} style={{
          width: "100%", padding: "14px 24px", borderRadius: 14,
          background: "#fff", border: "none", cursor: "pointer",
          display: "flex", alignItems: "center", justifyContent: "center", gap: 12,
          fontSize: 15, fontWeight: 700, color: "#1a1a2e", fontFamily: "inherit",
          boxShadow: "0 4px 24px rgba(255,255,255,0.1)", transition: "all 0.2s ease"
        }}
          onMouseEnter={e => { e.currentTarget.style.transform = "translateY(-2px)"; e.currentTarget.style.boxShadow = "0 8px 32px rgba(255,255,255,0.15)"; }}
          onMouseLeave={e => { e.currentTarget.style.transform = "translateY(0)"; e.currentTarget.style.boxShadow = "0 4px 24px rgba(255,255,255,0.1)"; }}
        >
          <svg width="20" height="20" viewBox="0 0 24 24">
            <path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"/>
            <path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"/>
            <path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"/>
            <path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"/>
          </svg>
          Continue with Google
        </button>

        <p style={{ color: "rgba(255,255,255,0.2)", fontSize: 11, marginTop: 20 }}>
          Your data syncs instantly across all your devices
        </p>
      </div>
    </div>
  );
}

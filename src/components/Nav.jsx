// src/components/Nav.jsx
import { getLevel, xpProgress, LEVEL_NAMES } from "../utils";

export function TopBar({ profile, page, onAdminTrigger }) {
  if (!profile) return null;
  const lvl  = getLevel(profile.xp || 0);
  const prog = xpProgress(profile.xp || 0);
  const labels = { home:"Home", tasks:"Tasks", habits:"Habits", social:"Friends", focus:"Focus", profile:"Profile", squads:"Squads" };

  // Triple-tap the app title to open admin panel
  const tapCount = { current: 0, timer: null };
  function handleTitleTap() {
    tapCount.current += 1;
    clearTimeout(tapCount.timer);
    tapCount.timer = setTimeout(() => { tapCount.current = 0; }, 600);
    if (tapCount.current >= 3) { tapCount.current = 0; onAdminTrigger?.(); }
  }

  return (
    <div style={{
      padding: "14px 20px 10px",
      background: "rgba(11,13,23,0.97)",
      backdropFilter: "blur(12px)",
      borderBottom: "1px solid rgba(255,255,255,0.06)",
      position: "sticky", top: 0, zIndex: 100
    }}>
      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between" }}>
        <div>
          <div style={{
            fontFamily: "'Syne',sans-serif", fontWeight: 800, fontSize: 15,
            background: "linear-gradient(135deg,#6C63FF,#FDCB6E)",
            WebkitBackgroundClip: "text", WebkitTextFillColor: "transparent",
            cursor: "default", userSelect: "none"
          }} onClick={handleTitleTap}>Temper Ascension</div>
          <div style={{ fontSize: 11, color: "rgba(255,255,255,0.3)" }}>{labels[page] || ""}</div>
        </div>
        <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
          <div style={{ textAlign: "right" }}>
            <div style={{ fontSize: 12, fontWeight: 700, color: "#FDCB6E" }}>{profile.xp || 0} XP</div>
            <div style={{ fontSize: 10, color: "rgba(255,255,255,0.35)" }}>{LEVEL_NAMES[lvl - 1]}</div>
          </div>
          <div style={{
            width: 36, height: 36, borderRadius: "50%",
            background: "linear-gradient(135deg,#6C63FF,#A29BFE)",
            display: "flex", alignItems: "center", justifyContent: "center",
            fontSize: 20, border: "2px solid rgba(108,99,255,0.4)"
          }}>{profile.avatar}</div>
        </div>
      </div>
      <div style={{ height: 3, background: "rgba(255,255,255,0.05)", borderRadius: 2, marginTop: 10, overflow: "hidden" }}>
        <div style={{
          height: "100%", width: `${prog.pct}%`,
          background: "linear-gradient(90deg,#6C63FF,#FDCB6E)",
          borderRadius: 2, transition: "width 0.6s ease"
        }} />
      </div>
    </div>
  );
}

export function BottomNav({ page, setPage }) {
  const tabs = [
    { id: "home",    icon: "🏠", label: "Home"    },
    { id: "tasks",   icon: "✅", label: "Tasks"   },
    { id: "habits",  icon: "🔥", label: "Habits"  },
    { id: "focus",   icon: "⏱",  label: "Focus"   },
    { id: "squads",  icon: "🚀", label: "Squads"  },
    { id: "social",  icon: "👥", label: "Friends" },
    { id: "profile", icon: "⚙️", label: "Me"      },
  ];
  return (
    <div style={{
      position: "fixed", bottom: 0, left: "50%", transform: "translateX(-50%)",
      width: "100%", maxWidth: 480,
      background: "rgba(11,13,23,0.98)",
      backdropFilter: "blur(16px)",
      borderTop: "1px solid rgba(255,255,255,0.07)",
      display: "flex", padding: "8px 0 env(safe-area-inset-bottom, 12px)"
    }}>
      {tabs.map(t => (
        <button key={t.id} onClick={() => setPage(t.id)} style={{
          flex: 1, background: "none", border: "none",
          display: "flex", flexDirection: "column", alignItems: "center", gap: 3,
          cursor: "pointer", padding: "6px 2px",
          opacity: page === t.id ? 1 : 0.38,
          transition: "opacity 0.15s ease"
        }}>
          <div style={{ fontSize: 18, transform: page === t.id ? "scale(1.18)" : "scale(1)", transition: "transform 0.15s ease" }}>
            {t.icon}
          </div>
          <div style={{ fontSize: 8, fontWeight: 700, color: page === t.id ? "#6C63FF" : "rgba(255,255,255,0.5)", letterSpacing: "0.04em" }}>
            {t.label}
          </div>
          {page === t.id && <div style={{ width: 4, height: 4, borderRadius: "50%", background: "#6C63FF" }} />}
        </button>
      ))}
    </div>
  );
}

// src/components/Onboard.jsx
import { useState } from "react";
import { AVATARS } from "../utils";
import { Card, Btn, Input, Toggle } from "./UI";

export default function Onboard({ firebaseUser, onCreate }) {
  const [name,     setName]     = useState(firebaseUser?.displayName?.split(" ")[0] || "");
  const [av,       setAv]       = useState(AVATARS[0]);
  const [adhdMode, setAdhdMode] = useState(true);

  return (
    <div style={{
      minHeight: "100vh", display: "flex", alignItems: "center",
      justifyContent: "center", padding: 24,
      background: "radial-gradient(ellipse at 30% 20%, rgba(108,99,255,0.12) 0%, transparent 60%), #0B0D17"
    }}>
      <div style={{ width: "100%", maxWidth: 400, animation: "fadeUp 0.4s ease" }}>
        <div style={{ textAlign: "center", marginBottom: 28 }}>
          <div style={{ fontSize: 48, marginBottom: 12 }}>👋</div>
          <h2 style={{ fontFamily: "'Syne',sans-serif", fontWeight: 800, fontSize: 26 }}>Set up your profile</h2>
          <p style={{ color: "rgba(255,255,255,0.4)", fontSize: 13, marginTop: 6 }}>Just a few things before we dive in</p>
        </div>

        <Card style={{ marginBottom: 14 }}>
          <div style={{ fontSize: 11, color: "rgba(255,255,255,0.4)", fontWeight: 700, marginBottom: 8, letterSpacing: "0.08em" }}>YOUR NAME</div>
          <Input value={name} onChange={setName} placeholder="What should we call you?" />
        </Card>

        <Card style={{ marginBottom: 14 }}>
          <div style={{ fontSize: 11, color: "rgba(255,255,255,0.4)", fontWeight: 700, marginBottom: 10, letterSpacing: "0.08em" }}>PICK YOUR AVATAR</div>
          <div style={{ display: "flex", flexWrap: "wrap", gap: 8 }}>
            {AVATARS.map(a => (
              <button key={a} onClick={() => setAv(a)} style={{
                fontSize: 24, width: 46, height: 46, borderRadius: 12,
                border: `2px solid ${av === a ? "#6C63FF" : "rgba(255,255,255,0.08)"}`,
                background: av === a ? "rgba(108,99,255,0.2)" : "rgba(255,255,255,0.04)",
                cursor: "pointer", transition: "all 0.15s ease"
              }}>{a}</button>
            ))}
          </div>
        </Card>

        <Card style={{ marginBottom: 24 }}>
          <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between" }}>
            <div>
              <div style={{ fontWeight: 600, fontSize: 14 }}>ADHD Mode 🧠</div>
              <div style={{ fontSize: 12, color: "rgba(255,255,255,0.4)", marginTop: 2 }}>Simpler layout, extra dopamine hits</div>
            </div>
            <Toggle on={adhdMode} onToggle={() => setAdhdMode(v => !v)} />
          </div>
        </Card>

        <Btn
          color="#6C63FF"
          style={{ width: "100%", padding: 14, fontSize: 15, fontWeight: 700 }}
          disabled={!name.trim()}
          onClick={() => onCreate({ name: name.trim(), avatar: av, adhdMode })}
        >
          Let's Go 🚀
        </Btn>
      </div>
    </div>
  );
}

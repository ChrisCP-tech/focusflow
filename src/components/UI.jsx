// src/components/UI.jsx
import { useState } from "react";

export const Card = ({ children, style = {}, className = "" }) => (
  <div className={className} style={{
    background: "rgba(255,255,255,0.04)",
    border: "1px solid rgba(255,255,255,0.08)",
    borderRadius: 16, padding: 20, ...style
  }}>{children}</div>
);

export const Btn = ({ children, onClick, color = "#6C63FF", small = false, ghost = false, style = {}, disabled = false }) => (
  <button onClick={onClick} disabled={disabled} style={{
    background: ghost ? "transparent" : disabled ? "rgba(255,255,255,0.08)" : color,
    border: ghost ? `1.5px solid ${color}` : "none",
    color: ghost ? color : disabled ? "rgba(255,255,255,0.3)" : "#fff",
    padding: small ? "6px 14px" : "10px 22px",
    borderRadius: 10, fontSize: small ? 12 : 14, fontWeight: 600,
    cursor: disabled ? "not-allowed" : "pointer",
    transition: "all 0.18s ease", fontFamily: "inherit", ...style
  }}
    onMouseEnter={e => { if (!disabled) { e.currentTarget.style.opacity = "0.82"; e.currentTarget.style.transform = "translateY(-1px)"; }}}
    onMouseLeave={e => { e.currentTarget.style.opacity = "1"; e.currentTarget.style.transform = "translateY(0)"; }}
  >{children}</button>
);

export const Input = ({ value, onChange, onKeyDown, placeholder, style = {}, multiline = false, type = "text" }) => {
  const props = {
    value, type,
    onChange: e => onChange(e.target.value),
    onKeyDown,
    placeholder,
    style: {
      background: "rgba(255,255,255,0.06)",
      border: "1px solid rgba(255,255,255,0.1)",
      borderRadius: 10, padding: "10px 14px",
      color: "#E8E9F3", fontSize: 14, outline: "none",
      width: "100%", resize: "vertical",
      fontFamily: "inherit", ...style
    }
  };
  return multiline ? <textarea {...props} rows={2} /> : <input {...props} />;
};

export const Tag = ({ label, color = "#6C63FF" }) => (
  <span style={{
    background: `${color}22`, color, fontSize: 11, fontWeight: 600,
    padding: "2px 8px", borderRadius: 6, letterSpacing: "0.02em"
  }}>{label}</span>
);

export const Toggle = ({ on, onToggle }) => (
  <button onClick={onToggle} style={{
    width: 48, height: 26, borderRadius: 13, border: "none", cursor: "pointer",
    background: on ? "#6C63FF" : "rgba(255,255,255,0.15)",
    transition: "all 0.2s ease", position: "relative", flexShrink: 0
  }}>
    <div style={{
      position: "absolute", top: 3, left: on ? 24 : 3,
      width: 20, height: 20, borderRadius: "50%", background: "#fff",
      transition: "left 0.2s ease"
    }} />
  </button>
);

export function XPToast({ xp, onDone }) {
  useState(() => { const t = setTimeout(onDone, 2200); return () => clearTimeout(t); });
  return (
    <div style={{
      position: "fixed", top: 72, right: 16, zIndex: 9999,
      background: "linear-gradient(135deg,#FDCB6E,#E17055)",
      color: "#fff", padding: "10px 20px", borderRadius: 12,
      fontWeight: 800, fontSize: 18, boxShadow: "0 8px 32px rgba(253,203,110,0.4)",
      animation: "fadeUp 0.3s ease", fontFamily: "'Syne',sans-serif"
    }}>+{xp} XP ✨</div>
  );
}

export function Confetti({ onDone }) {
  const colors = ["#FDCB6E", "#6C63FF", "#55EFC4", "#FF6B6B", "#A29BFE", "#74B9FF"];
  useState(() => { const t = setTimeout(onDone, 2000); return () => clearTimeout(t); });
  return (
    <div style={{ position: "fixed", top: 0, left: 0, width: "100%", height: "100%", pointerEvents: "none", zIndex: 9998 }}>
      {Array.from({ length: 28 }).map((_, i) => (
        <div key={i} style={{
          position: "absolute", width: 8, height: 8, borderRadius: 2,
          background: colors[i % colors.length],
          left: `${5 + Math.random() * 90}%`, top: "-10px",
          animation: `confetti ${0.8 + Math.random() * 0.9}s ease ${Math.random() * 0.4}s both`
        }} />
      ))}
    </div>
  );
}

export function Avatar({ avatar, xp = 0, size = 40 }) {
  const { getLevel, LEVEL_NAMES } = require("../utils");
  const lvl = getLevel(xp);
  return (
    <div style={{ position: "relative", width: size, height: size, flexShrink: 0 }}>
      <div style={{
        width: size, height: size, borderRadius: "50%",
        background: "linear-gradient(135deg,#6C63FF,#A29BFE)",
        display: "flex", alignItems: "center", justifyContent: "center",
        fontSize: size * 0.52, border: "2px solid rgba(108,99,255,0.4)"
      }}>{avatar}</div>
      <div style={{
        position: "absolute", bottom: -3, right: -4,
        background: "#FDCB6E", color: "#0B0D17", fontSize: 8,
        fontWeight: 900, padding: "1px 4px", borderRadius: 6, minWidth: 16, textAlign: "center"
      }}>L{lvl}</div>
    </div>
  );
}

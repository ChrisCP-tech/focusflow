// src/ai.js — All Claude API calls go through Firebase Cloud Function proxy
const PROXY_URL = "https://claudeproxy-t4agi5wjoq-uc.a.run.app";

// Get uid from Firebase auth
async function getUid() {
  const { auth } = await import("./firebase/config");
  return auth.currentUser?.uid || "anonymous";
}

async function callClaude(feature, prompt, maxTokens = 300) {
  try {
    const uid = await getUid();
    const res = await fetch(PROXY_URL, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        uid,
        feature,
        model: "claude-haiku-4-5-20251001",
        max_tokens: maxTokens,
        messages: [{ role: "user", content: prompt }]
      })
    });

    if (res.status === 429) {
      const data = await res.json();
      return { __rateLimited: true, message: data.message, limit: data.limit };
    }

    const data = await res.json();
    if (data.error) { console.error("Claude error:", data.error); return null; }
    return data.content?.[0]?.text || null;
  } catch (e) {
    console.error("AI call failed:", e);
    return null;
  }
}

function parseJSON(text, fallback) {
  if (text?.__rateLimited) return { __rateLimited: true, message: text.message };
  try { return JSON.parse((text||"").replace(/```json|```/g, "").trim()); }
  catch { return fallback; }
}

export async function aiSuggestXP(title) {
  if (!title || title.length < 4) return null;
  const text = await callClaude("suggestXP",
    `You are an XP and gold suggester for a productivity app. Based on this task title, suggest values.
Task: "${title}"
Rules: XP options are 10 (trivial), 20 (easy), 30 (medium), 50 (hard), 100 (major). Gold is roughly half XP.
Reply ONLY with JSON: {"xp": 20, "gold": 10, "reason": "one short sentence"}`, 150
  );
  if (text?.__rateLimited) return null;
  return text ? parseJSON(text, null) : null;
}

export async function aiBreakdownTask(title, desc) {
  const text = await callClaude("breakdownTask",
    `Break this task into 4-6 clear, specific, actionable subtasks.
Task: "${title}"${desc ? `\nDetails: ${desc}` : ""}
Reply ONLY with a JSON array: [{"title": "subtask 1"}, {"title": "subtask 2"}]
No preamble, no explanation, just the array.`, 500
  );
  if (text?.__rateLimited) return { __rateLimited: true, message: text.message };
  return text ? parseJSON(text, []) : [];
}

export async function aiAuditTask(task) {
  const ageSeconds = task.createdAtMs ? (Date.now() - task.createdAtMs) / 1000 : 999;
  if (ageSeconds < 90) {
    return { approved: false, goldMultiplier: 0, reason: "Completed too quickly — looks like a test task" };
  }
  const text = await callClaude("auditTask",
    `You are an anti-exploit auditor for a productivity app gold economy.
A user completed this task. Determine if it looks legitimate or like gold farming.
Task title: "${task.title}"
Description: "${task.desc || "none"}"
XP value: ${task.xp}
Time since creation: ${Math.round(ageSeconds / 60)} minutes
Legitimate tasks: real work, study, health, chores, projects
Suspicious: very vague titles ("task", "thing", "aaa"), single word nonsense, obvious test tasks
Reply ONLY with JSON: {"approved": true, "goldMultiplier": 1.0, "reason": "brief reason"}
goldMultiplier values: 0 = exploit/fake, 0.5 = suspicious but possible, 1.0 = normal, 1.25 = impressive/difficult`, 200
  );
  if (text?.__rateLimited) return { approved: true, goldMultiplier: 1.0, reason: "Audit unavailable" };
  return text ? parseJSON(text, { approved: true, goldMultiplier: 1.0, reason: "Audit unavailable" })
              : { approved: true, goldMultiplier: 1.0, reason: "Audit unavailable" };
}

export async function aiPriceReward(name, description) {
  const text = await callClaude("priceReward",
    `You are pricing personal rewards in a productivity app.
Gold economy: users earn ~10-30 gold per real task. 100 gold = roughly completing 5-8 tasks.
Price this personal reward fairly:
Name: "${name}"
Description: "${description || "none"}"
Examples: "Get boba" = 40-60 gold, "Buy new shoes" = 150-250 gold, "Movie night" = 60-80 gold
Reply ONLY with JSON: {"goldCost": 50, "reason": "brief reason"}`, 150
  );
  if (text?.__rateLimited) return { __rateLimited: true, message: text.message };
  return text ? parseJSON(text, null) : null;
}

export async function aiLifeCoach(profile, tasks, habits, moodLog) {
  const doneTasks   = tasks.filter(t => t.done).length;
  const bestStreak  = habits.reduce((a, h) => Math.max(a, h.streak || 0), 0);
  const recentMoods = moodLog.slice(0, 7).map(m => m.mood?.l).join(", ");
  const text = await callClaude("lifeCoach",
    `You are a supportive life coach for someone with ADHD using a productivity app.
Give them a brief, warm, personalized weekly check-in (3-4 sentences max).
Their stats: tasks completed: ${doneTasks}, best habit streak: ${bestStreak} days, recent moods: ${recentMoods || "not logged"}, XP: ${profile.xp || 0}, gold: ${profile.gold || 0}
Be encouraging, specific to their data, and give one actionable tip. Don't be generic.`, 300
  );
  if (text?.__rateLimited) return { __rateLimited: true, message: text.message };
  return text || "Keep going — every small step counts. 💜";
}

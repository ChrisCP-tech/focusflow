// functions/index.js
const functions = require("firebase-functions");
const https = require("https");
const admin = require("firebase-admin");

admin.initializeApp();
const db = admin.firestore();

// Daily limits per AI feature (free tier — no subscription yet)
const DAILY_LIMITS = {
  suggestXP:     20,
  breakdownTask:  5,
  auditTask:     10,
  priceReward:    5,
  lifeCoach:      2,
};

// Check and increment usage. Returns { allowed: bool, used: int, limit: int }
async function checkRateLimit(uid, feature) {
  const pst = new Date().toLocaleString("en-US", { timeZone: "America/Los_Angeles" });
  const today = new Date(pst).toLocaleDateString("en-CA"); // "2026-03-12" in PST
  const ref = db.collection("aiUsage").doc(`${uid}_${today}_${feature}`);

  const limit = DAILY_LIMITS[feature] || 5;

  const result = await db.runTransaction(async tx => {
    const snap = await tx.get(ref);
    const used = snap.exists ? (snap.data().count || 0) : 0;
    if (used >= limit) return { allowed: false, used, limit };
    tx.set(ref, { uid, feature, date: today, count: used + 1 }, { merge: true });
    return { allowed: true, used: used + 1, limit };
  });

  // Auto-delete old docs after 2 days (TTL via Firestore — set in console, or just let them accumulate cheaply)
  return result;
}

// Claude API proxy with rate limiting
exports.claudeProxy = functions.https.onRequest(async (req, res) => {
  // CORS
  res.set("Access-Control-Allow-Origin", "*");
  res.set("Access-Control-Allow-Methods", "POST, OPTIONS");
  res.set("Access-Control-Allow-Headers", "Content-Type");
  if (req.method === "OPTIONS") { res.status(204).send(""); return; }
  if (req.method !== "POST")    { res.status(405).send("Method Not Allowed"); return; }

  const ANTHROPIC_API_KEY = process.env.ANTHROPIC_KEY;
  if (!ANTHROPIC_API_KEY) {
    res.status(500).json({ error: "API key not configured" });
    return;
  }

  // Require uid and feature from client
  const { uid, feature, ...claudeBody } = req.body;

  if (!uid || !feature) {
    res.status(400).json({ error: "Missing uid or feature" });
    return;
  }

  if (!DAILY_LIMITS.hasOwnProperty(feature)) {
    res.status(400).json({ error: "Unknown feature: " + feature });
    return;
  }

  // Check rate limit
  let rateCheck;
  try {
    rateCheck = await checkRateLimit(uid, feature);
  } catch (e) {
    console.error("Rate limit check failed:", e);
    // Fail open — don't block users if Firestore is down
    rateCheck = { allowed: true, used: 0, limit: DAILY_LIMITS[feature] };
  }

  if (!rateCheck.allowed) {
    res.status(429).json({
      error: "rate_limited",
      message: `Daily limit reached for ${feature} (${rateCheck.limit}/day). Resets at midnight PST.`,
      used: rateCheck.used,
      limit: rateCheck.limit,
    });
    return;
  }

  // Forward to Claude
  const body = JSON.stringify(claudeBody);
  const options = {
    hostname: "api.anthropic.com",
    path: "/v1/messages",
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "x-api-key": ANTHROPIC_API_KEY,
      "anthropic-version": "2023-06-01",
      "Content-Length": Buffer.byteLength(body)
    }
  };

  const apiReq = https.request(options, (apiRes) => {
    let data = "";
    apiRes.on("data", chunk => data += chunk);
    apiRes.on("end", () => {
      try {
        const parsed = JSON.parse(data);
        // Attach rate limit info to response so client can show usage
        parsed._rateLimit = { used: rateCheck.used, limit: rateCheck.limit, feature };
        res.status(apiRes.statusCode).json(parsed);
      } catch (e) { res.status(500).json({ error: "Parse error", raw: data }); }
    });
  });

  apiReq.on("error", (e) => res.status(500).json({ error: e.message }));
  apiReq.write(body);
  apiReq.end();
});

// functions/index.js
const functions = require("firebase-functions");
const https = require("https");

// Claude API proxy — keeps your API key secret on the server
exports.claudeProxy = functions.https.onRequest((req, res) => {
  // CORS
  res.set("Access-Control-Allow-Origin", "*");
  res.set("Access-Control-Allow-Methods", "POST, OPTIONS");
  res.set("Access-Control-Allow-Headers", "Content-Type");
  if (req.method === "OPTIONS") { res.status(204).send(""); return; }
  if (req.method !== "POST")    { res.status(405).send("Method Not Allowed"); return; }

  const ANTHROPIC_API_KEY = functions.config().anthropic?.key;
  if (!ANTHROPIC_API_KEY) {
    res.status(500).json({ error: "API key not configured. Run: firebase functions:config:set anthropic.key=YOUR_KEY" });
    return;
  }

  const body = JSON.stringify(req.body);
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
      try { res.status(apiRes.statusCode).json(JSON.parse(data)); }
      catch (e) { res.status(500).json({ error: "Parse error", raw: data }); }
    });
  });

  apiReq.on("error", (e) => res.status(500).json({ error: e.message }));
  apiReq.write(body);
  apiReq.end();
});

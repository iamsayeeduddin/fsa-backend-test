require("dotenv").config();
const express = require("express");
const cors = require("cors");
const { MongoClient } = require("mongodb");

const app = express();
const PORT = process.env.PORT || 4000;
const MONGODB_URI = process.env.MONGODB_URI || "mongodb://127.0.0.1:27017";
const DB_NAME = process.env.DB_NAME || "mern_test_backend";
const COLLECTION_NAME = "submissions";
const MOBILE_PATTERN = /^[0-9+\-\s]{7,15}$/;

let submissionsCollection;

async function connectDb() {
  const client = new MongoClient(MONGODB_URI);
  await client.connect();
  submissionsCollection = client.db(DB_NAME).collection(COLLECTION_NAME);
  console.log(`Connected to MongoDB at ${MONGODB_URI}, DB "${DB_NAME}"`);
}

// --- CORS ---
// Set FRONTEND_ORIGIN in .env to lock this down to your deployed frontend,
// e.g. FRONTEND_ORIGIN=https://your-site.netlify.app
const allowedOrigin = process.env.FRONTEND_ORIGIN || "*";
app.use(cors({ origin: allowedOrigin }));
app.use(express.json({ limit: "1mb" }));

// --- storage helpers ---
// --- routes ---
app.get("/api/health", (req, res) => {
  res.json({ status: "ok" });
});

app.post("/api/submit", async (req, res) => {
  if (!submissionsCollection) {
    return res.status(500).json({ error: "Database not connected." });
  }

  const { name, mobile, submittedAt, mcqAnswers, codeAnswers, partAScore, partAMax } = req.body || {};

  if (!name || typeof name !== "string" || !name.trim()) {
    return res.status(400).json({ error: "Name is required." });
  }
  if (!mobile || !MOBILE_PATTERN.test(String(mobile).trim())) {
    return res.status(400).json({ error: "A valid mobile number is required." });
  }
  if (!Array.isArray(mcqAnswers) || !Array.isArray(codeAnswers)) {
    return res.status(400).json({ error: "Malformed submission payload." });
  }

  const submission = {
    id: `${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
    name: name.trim(),
    mobile: String(mobile).trim(),
    submittedAt: submittedAt || new Date().toISOString(),
    receivedAt: new Date().toISOString(),
    mcqAnswers,
    codeAnswers,
    partAScore: typeof partAScore === "number" ? partAScore : null,
    partAMax: typeof partAMax === "number" ? partAMax : null,
  };

  try {
    const result = await submissionsCollection.insertOne(submission);
    return res.status(201).json({ ok: true, id: result.insertedId.toString() });
  } catch (error) {
    console.error("Insert failed:", error);
    return res.status(500).json({ error: "Failed to save submission." });
  }
});

// Simple listing endpoint for reviewing results.
// In production, put this behind auth before deploying publicly.
app.get("/api/submissions", async (req, res) => {
  if (!submissionsCollection) {
    return res.status(500).json({ error: "Database not connected." });
  }

  try {
    const submissions = await submissionsCollection.find().sort({ receivedAt: -1 }).toArray();

    return res.json(submissions.map(({ _id, ...doc }) => ({ ...doc, id: doc.id || _id?.toString() })));
  } catch (error) {
    console.error("Read failed:", error);
    return res.status(500).json({ error: "Failed to read submissions." });
  }
});

async function startServer() {
  try {
    await connectDb();
    app.listen(PORT, () => {
      console.log(`MERN test backend listening on http://localhost:${PORT}`);
    });
  } catch (error) {
    console.error("Failed to start server:", error);
    process.exit(1);
  }
}

startServer();

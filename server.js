require("dotenv").config();
const express = require("express");
const cors = require("cors");
const mongoose = require("mongoose");

const app = express();
const PORT = process.env.PORT || 4000;
const MONGODB_URI = process.env.MONGODB_URI || "mongodb://127.0.0.1:27017";
const DB_NAME = process.env.DB_NAME || "mern_test_backend";
const MOBILE_PATTERN = /^[0-9+\-\s]{7,15}$/;

const submissionSchema = new mongoose.Schema({
  id: { type: String, required: true, unique: true },
  name: { type: String, required: true, trim: true },
  mobile: { type: String, required: true, trim: true },
  submittedAt: { type: Date, required: true, default: Date.now },
  receivedAt: { type: Date, required: true, default: Date.now },
  mcqAnswers: { type: [mongoose.Schema.Types.Mixed], required: true, default: [] },
  codeAnswers: { type: [mongoose.Schema.Types.Mixed], required: true, default: [] },
  partAScore: { type: Number, default: null },
  partAMax: { type: Number, default: null },
});

const Submission = mongoose.model("Submission", submissionSchema);

async function connectDb() {
  await mongoose.connect(MONGODB_URI, {
    dbName: DB_NAME,
    useNewUrlParser: true,
    useUnifiedTopology: true,
  });
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
  if (mongoose.connection.readyState !== 1) {
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

  const submission = new Submission({
    id: `${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
    name: name.trim(),
    mobile: String(mobile).trim(),
    submittedAt: submittedAt ? new Date(submittedAt) : new Date(),
    receivedAt: new Date(),
    mcqAnswers,
    codeAnswers,
    partAScore: typeof partAScore === "number" ? partAScore : null,
    partAMax: typeof partAMax === "number" ? partAMax : null,
  });

  try {
    const saved = await submission.save();
    return res.status(201).json({ ok: true, id: saved.id });
  } catch (error) {
    console.error("Insert failed:", error);
    return res.status(500).json({ error: "Failed to save submission." });
  }
});

// Simple listing endpoint for reviewing results.
// In production, put this behind auth before deploying publicly.
app.get("/api/submissions", async (req, res) => {
  if (mongoose.connection.readyState !== 1) {
    return res.status(500).json({ error: "Database not connected." });
  }

  try {
    const submissions = await Submission.find().sort({ receivedAt: -1 }).lean();
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

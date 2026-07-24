# MERN Test Backend

Small Express server that receives submissions from the MERN Backend Assessment
Test React form and stores them in `data/submissions.json`.

## Endpoints
- `POST /api/submit` — save a test submission. Body: `{ name, mobile, mcqAnswers, codeAnswers, partAScore, partAMax, submittedAt }`
- `GET /api/submissions` — list all stored submissions (put behind auth before exposing publicly)
- `GET /api/health` — health check

## Run locally
```
npm install
cp .env.example .env
npm start
```
Server runs on http://localhost:4000 by default.

## Connect the frontend
In the frontend project, set `VITE_API_URL=http://localhost:4000/api/submit` in its `.env`
(or to your deployed backend URL once hosted), then rebuild.

## Where does this run?
This is a plain Node/Express server, not a Netlify Function — it needs a host that
keeps a process running, e.g. Render, Railway, Fly.io, or a small VPS. (Netlify
itself only runs serverless functions, not long-running servers — if you'd rather
deploy the backend as a Netlify Function or wire up Netlify Database/Postgres
instead of the JSON file, say so and it can be restructured that way.)

Once deployed, set `FRONTEND_ORIGIN` in `.env` to your Netlify site URL so CORS
only allows your frontend to call it.

## Data storage note
Submissions are stored in a flat JSON file for simplicity. This is fine for a
class test with light traffic, but isn't safe for concurrent writes at scale —
swap in a real database (Postgres, MongoDB, etc.) if usage grows.

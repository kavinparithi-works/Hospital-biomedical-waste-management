# KMCH Hospital — Biomedical Waste Management System

Role-based web application for logging, assigning, collecting and auditing hospital biomedical waste under India's **Bio-Medical Waste Management Rules 2016** (colour-coded bins: Yellow / Red / White / Blue / Green).

| Role | What they do |
|------|--------------|
| **Admin** | Executive analytics (daily volume, segregation compliance, turnaround, backlog), user management, CSV audit export, settings |
| **Medical Staff** | Log waste records, assign a collection worker, send overdue reminders, cancel mistaken entries, review bin-verification results, AI waste identifier |
| **Sanitation Worker** | See assigned pickups, mark as *Collected*, verify bag-to-bin colour and mark *Disposed*, collection history |

The UI is available in **English, Tamil, Hindi, Telugu, Kannada and Malayalam** (switcher on the login page and in the sidebar).

> **New here?** Open **[`SETUP_GUIDE.html`](SETUP_GUIDE.html)** in your browser for an illustrated, step-by-step setup walkthrough (fork → clone → run → log in), including troubleshooting.
>
> **Have a question?** **[`PROJECT_KNOWLEDGE.md`](PROJECT_KNOWLEDGE.md)** is the exhaustive A-to-Z reference (architecture, every API route, data models, stats formulas, every feature, how to extend, troubleshooting). Paste it into any AI assistant (ChatGPT, Gemini, Copilot…) and ask your doubt — it has everything needed to answer.

## Project layout

```
hospital-waste-backend/    Node.js + Express + MongoDB REST API (JWT auth)
hospital-waste-frontend/   React 19 + Vite single-page app
hospital-waste-dashboard/  Legacy Flask/SQLite prototype (not required; kept for reference)
docker-compose.yml         Local MongoDB
```

## Quick start

Prerequisites: **Node.js 20+** and either **MongoDB** (local install or Docker) — or use the in-memory option below.

### 1. Database

```bash
docker compose up -d mongo          # MongoDB on mongodb://127.0.0.1:27017
```

No Docker / Mongo? Run the backend with a throwaway in-memory database instead (data is lost on restart):

```bash
cd hospital-waste-backend && npm run dev:memory
```

### 2. Backend

```bash
cd hospital-waste-backend
cp .env.example .env                # set JWT_SECRET (and GEMINI_API_KEY for image classification)
npm install
npm run dev                         # http://localhost:5000  (auto-seeds demo users + sample records)
```

### 3. Frontend

```bash
cd hospital-waste-frontend
cp .env.example .env                # optional — defaults to http://localhost:5000/api
npm install
npm run dev                         # http://localhost:5173
```

### Demo accounts (auto-seeded on first start)

| Role | Username | Password |
|------|----------|----------|
| Admin | `adminname` | `Password123` |
| Staff | `staff001` … `staff075` | `Password123` |
| Worker | `worker001` … `worker075` | `Password123` |

Every 10th staff and every 12th worker account is seeded as *inactive* to demonstrate the account-status filter (inactive accounts cannot log in).

## Backend

### Environment (`hospital-waste-backend/.env`)

| Variable | Default | Purpose |
|----------|---------|---------|
| `MONGO_URI` | `mongodb://127.0.0.1:27017/biowaste_db` | MongoDB connection string |
| `PORT` | `5000` | API port |
| `JWT_SECRET` | *(insecure dev default)* | Secret for signing login tokens — **set this in production** |
| `JWT_EXPIRES_IN` | `12h` | Token lifetime |
| `CORS_ORIGIN` | *(all)* | Comma-separated allowed frontend origins |
| `GEMINI_API_KEY` | — | Enables photo-based waste classification in the AI assistant |
| `GEMINI_MODEL` | `gemini-2.5-flash` | Gemini vision model |
| `TZ` | `Asia/Kolkata` | Hospital timezone (reporting days are IST) |

### Scripts

| Command | Description |
|---------|-------------|
| `npm run dev` | Start with file watching |
| `npm start` | Start |
| `npm run dev:memory` | Start against an in-memory MongoDB (dev only) |
| `npm run seed` | Re-seed richer sample users (`seed.js`) |
| `npm run seed:history` | Seed several weeks of historical records for the charts |
| `node smoke-test.js` | End-to-end API test against a running server (auth, role guards, full workflow) |

### API overview

All routes except `POST /api/auth/login` and `GET /api/health` require `Authorization: Bearer <token>`.

| Method & path | Who | Purpose |
|---------------|-----|---------|
| `POST /api/auth/login` | public | Login → `{ token, user }` |
| `GET /api/auth/me` | any | Current profile |
| `POST /api/auth/change-password` | any | Change own password |
| `GET /api/users` | admin (staff: active workers only) | List users |
| `POST /api/users` · `PATCH /:id/toggle-active` · `DELETE /:id` | admin | Manage users |
| `PUT /api/users/:id` | admin, or self (name/phone) | Update user |
| `GET /api/waste` · `/today` · `/pending-previous` · `/history` · `/worker-stats` | any (workers scoped to own records) | Records & worker stats |
| `GET /api/waste/stats?date=YYYY-MM-DD` | any | Daily analytics (compliance, turnaround, bin breakdown, weekly chart) |
| `POST /api/waste` · `PUT /:id/assign` · `PUT /:id/cancel` | staff, admin | Log / assign / cancel |
| `PUT /api/waste/:id/collect` · `PUT /:id/complete` | worker, admin | Collect → verify bin → dispose |
| `DELETE /api/waste/:id` | admin | Permanently delete a record |
| `GET /api/notifications` · `PATCH /:id/read` · `PATCH /read-all` | any | Own notifications |
| `POST /api/notifications/reminder` | staff, admin | Remind the assigned worker (60 s cooldown) |
| `POST /api/ai/classify-image` | any | Gemini vision classification (needs `GEMINI_API_KEY`) |

### Waste workflow

```
Pending/Assigned ──(worker: Collect)──▶ Collected ──(worker: verify bin + Dispose)──▶ Completed
        └──(staff: Cancel)──▶ Cancelled
```

Segregation compliance is computed from the statutory category→bin mapping (`utils/compliance.js`) plus the worker's bin verification result — no hard-coded figures.

## Frontend

| Command | Description |
|---------|-------------|
| `npm run dev` | Vite dev server |
| `npm run build` | Production build to `dist/` |
| `npm run preview` | Preview the production build |
| `npm run lint` | oxlint |
| `npm run test:nlp` | Chatbot classifier regression test (all languages; verifies photos are never guessed) |
| `npm run test:ui` | Headless-Chrome end-to-end test of every page, role, language and the full workflow (needs both servers running) |

### AI Waste Assistant

- **Text & voice** classification runs fully in the browser (`src/services/nlpEngine.js`) — no API key needed.
- **Photo** classification is done server-side by Gemini (`POST /api/ai/classify-image`). It requires `GEMINI_API_KEY` in the backend `.env`; without it the assistant says so and asks for a text description instead of guessing. Categories/bins returned by the model are validated against the BMW 2016 mapping on the server. **Step-by-step: [`ENABLE_PHOTO_SCAN.md`](ENABLE_PHOTO_SCAN.md).**

Translations live in `src/i18n/translations.js`; add a language by adding an entry to `LANGUAGES` and a dictionary (missing keys fall back to English).

## Production notes

- Set a strong `JWT_SECRET` and restrict `CORS_ORIGIN`.
- Serve the frontend `dist/` from any static host and point `VITE_API_URL` at the API.
- Demo credentials are hidden on the login page in production builds unless `VITE_SHOW_DEMO_CREDENTIALS=true`.

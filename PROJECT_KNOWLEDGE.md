# KMCH Hospital Biomedical Waste Management System — Complete Project Knowledge Base (A to Z)

> **Purpose of this file.** This is the single, exhaustive reference for the whole project. It is written so that a person *or an AI assistant* (ChatGPT, Gemini, Copilot, Claude, etc.) can read it and answer any question about how the system is installed, configured, structured, secured, used, tested, extended or debugged — without needing to open the source code.
>
> **How to use it with an AI:** paste this whole file (or upload it) into the AI chat and then ask your question, e.g. *"Why does my worker see no tasks?"*, *"How do I add a new waste category?"*, *"What does the compliance % mean?"*, *"Which file controls the Tamil text?"*.
>
> Companion documents: `SETUP_GUIDE.html` (illustrated step-by-step setup for beginners) and `README.md` (short technical overview).

---

## Table of contents

1. [What the project is](#1-what-the-project-is)
2. [Technology stack](#2-technology-stack)
3. [Repository layout — every important file explained](#3-repository-layout)
4. [Installation and running (summary)](#4-installation-and-running)
5. [Environment variables](#5-environment-variables)
6. [Demo accounts and seed data](#6-demo-accounts-and-seed-data)
7. [Roles and permissions matrix](#7-roles-and-permissions)
8. [Domain rules: bins, categories, compliance](#8-domain-rules)
9. [Waste record lifecycle (statuses)](#9-waste-record-lifecycle)
10. [Database models (every field)](#10-database-models)
11. [Authentication and sessions](#11-authentication-and-sessions)
12. [REST API — every endpoint, inputs, outputs, errors](#12-rest-api-reference)
13. [How statistics are calculated](#13-how-statistics-are-calculated)
14. [Notifications system](#14-notifications-system)
15. [Frontend architecture](#15-frontend-architecture)
16. [Every page and feature, role by role](#16-every-page-and-feature)
17. [Internationalisation (6 languages)](#17-internationalisation)
18. [AI Waste Assistant (chatbot): text, voice, photo](#18-ai-waste-assistant)
19. [Time zone handling (IST)](#19-time-zone-handling)
20. [Testing — what exists and how to run it](#20-testing)
21. [Scripts reference](#21-scripts-reference)
22. [Security notes](#22-security-notes)
23. [Deployment to the internet](#23-deployment)
24. [How to change / extend things (recipes)](#24-how-to-extend)
25. [Troubleshooting — symptom → cause → fix](#25-troubleshooting)
26. [FAQ](#26-faq)
27. [Legacy Flask prototype](#27-legacy-flask-prototype)
28. [Glossary](#28-glossary)

---

## 1. What the project is

A web application for a hospital (branded **KMCH — Kovai Medical Center & Hospital**) to track **biomedical waste** from generation to disposal in compliance with India's **Bio-Medical Waste Management Rules 2016 (BMW Rules 2016)** issued under the Environment (Protection) Act, with colour-coded bins (Yellow, Red, White, Blue, Green) and the **CPCB** (Central Pollution Control Board) benchmark of >90 % correct segregation.

Three kinds of users:

| Role | Who | Main job in the app |
|---|---|---|
| **Admin** | Hospital administrator / infection-control officer | Analytics dashboard, compliance monitoring, CSV audit export, manage all user accounts, delete records, settings |
| **Staff** (Medical Staff) | Doctors, nurses, ward officers | Log a waste record (room, category, weight, bin), assign a sanitation worker, send reminders, cancel mistakes, use the AI assistant, view history |
| **Worker** (Sanitation Worker) | Housekeeping / waste collection crew | See assigned pickups, mark **Collected**, verify the bag colour matches the bin, mark **Disposed**, report mismatches, view own history |

The UI is available in **English, Tamil (தமிழ்), Hindi (हिन्दी), Telugu (తెలుగు), Kannada (ಕನ್ನಡ) and Malayalam (മലയാളം)**.

---

## 2. Technology stack

| Layer | Technology | Version (package.json) |
|---|---|---|
| Backend runtime | Node.js | 20+ required (tested on 24) |
| Backend framework | Express | 4.x |
| Database | MongoDB via Mongoose | Mongoose 8.x, MongoDB 7 (Docker) |
| Auth | JSON Web Tokens (`jsonwebtoken` 9), passwords hashed with `bcryptjs` | — |
| File upload (photos) | `multer` (memory storage, 5 MB limit) | 2.x |
| AI vision | `@google/generative-ai` → Gemini (default model `gemini-2.5-flash`) | 0.24 |
| Dev database | `mongodb-memory-server` (dev dependency only) | 10.x |
| Frontend | React 19, React Router 7, Vite 8 | — |
| Charts | Recharts 3 | — |
| Icons | lucide-react | — |
| Lint | oxlint | — |
| Styling | Plain CSS (`src/index.css`) + inline styles; CSS variables; no UI framework | — |
| Speech | Browser Web Speech API (`SpeechRecognition`, `speechSynthesis`) — no server | — |

No TypeScript. No Redux. State is React `useState`/`useEffect` plus two tiny contexts (language, toasts).

---

## 3. Repository layout

```
Hospital-biomedical-waste-management/
├── README.md                     Short technical overview (routes, env, scripts)
├── SETUP_GUIDE.html              Illustrated beginner setup + user manual (open in a browser)
├── PROJECT_KNOWLEDGE.md          THIS FILE — exhaustive reference for humans and AI
├── docker-compose.yml            One-command local MongoDB (`docker compose up -d mongo`)
├── .gitignore                    Ignores .env, node_modules, dist, local SQLite db
│
├── hospital-waste-backend/       ── API SERVER (port 5000) ──
│   ├── server.js                 Express app: CORS, JSON body, routes, auth gate, 404/error handlers,
│   │                             Mongo connect, AUTO-SEED of demo users + sample records, start()
│   ├── start-memory.js           Dev helper: boots an in-memory MongoDB then calls server.start(uri)
│   ├── smoke-test.js             End-to-end API test (41 checks) against a running server
│   ├── seed.js                   Optional richer seed with real Indian names (npm run seed)
│   ├── seedPastWeeks.js          Adds ~130 historical records over 45 days (npm run seed:history)
│   ├── updateNames.js            One-off helper script (legacy)
│   ├── .env.example              Template for .env (copy it; .env itself is git-ignored)
│   ├── package.json              scripts: start, dev (node --watch), dev:memory, seed, seed:history
│   ├── middleware/auth.js        signToken(), requireAuth (Bearer JWT), requireRole(...roles)
│   ├── utils/compliance.js       CATEGORY_BIN_MAP, CATEGORIES, BINS, isCompliant(), hasMismatch()
│   ├── models/User.js            Mongoose User schema
│   ├── models/WasteRecord.js     Mongoose WasteRecord schema (uses compliance enums)
│   ├── models/Notification.js    Mongoose Notification schema
│   └── routes/
│       ├── auth.js               POST /login, GET /me, POST /change-password
│       ├── users.js              CRUD users (admin), self-update name/phone
│       ├── waste.js              Records, stats, worker-stats, history, assign/collect/complete/cancel/delete
│       ├── notifications.js      List, mark read, mark all read, send reminder
│       └── ai.js                 GET /status, POST /classify-image (Gemini vision)
│
├── hospital-waste-frontend/      ── WEBSITE (port 5173) ──
│   ├── index.html                HTML shell, Google Fonts
│   ├── vite.config.js            Vite + React plugin
│   ├── .oxlintrc.json            Lint config (no-undef = error)
│   ├── .env.example              VITE_API_URL, VITE_SHOW_DEMO_CREDENTIALS
│   ├── package.json              scripts: dev, build, preview, lint, test:nlp, test:ui
│   ├── ui-smoke.mjs              Headless-Chrome end-to-end UI test (CDP, no extra deps)
│   ├── nlp-test.mjs              Chatbot classifier regression test (43 cases, 6 languages)
│   └── src/
│       ├── main.jsx              Mounts <LanguageProvider><ToastProvider><App/>
│       ├── App.jsx               Routes, ProtectedRoute (role guard), SessionGuard (401 → login)
│       ├── index.css             All global styles, CSS variables, responsive rules, components
│       ├── services/api.js       fetch wrapper: token header, env base URL, 401 handling, every API call
│       ├── services/nlpEngine.js Rule-based multilingual NLP classifier + conversational intents
│       ├── i18n/LanguageContext.jsx  LanguageProvider, useLanguage(), useT() → t('key', vars)
│       ├── i18n/translations.js  All UI strings for en/ta/hi/te/kn/ml (+ LANGUAGES list)
│       ├── utils/waste.js        Frontend mirror of compliance rules, status helpers, CSV download
│       ├── utils/dateUtils.js    IST formatting helpers, overdue calculation
│       ├── hooks/useWorkerTasks.js  Shared data/actions for worker pages (collect, dispose)
│       ├── components/
│       │   ├── Layout.jsx        Sidebar + mobile top bar + main content
│       │   ├── Sidebar.jsx       Role menu, language selector, user card, logout
│       │   ├── LanguageSelector.jsx
│       │   ├── Toast.jsx         ToastProvider + useToast() (success/error/info)
│       │   ├── Pagination.jsx    Client-side pagination control
│       │   ├── NotificationBell.jsx  Bell + dropdown, polls every 15 s
│       │   ├── ProfilePanel.jsx  IdentityCard, EditProfileCard, SecurityCard (change password)
│       │   ├── WorkerTaskModals.jsx  TaskDetailsModal, BinVerifyModal
│       │   └── WasteChatbot.jsx  The AI assistant UI (text, voice, photo)
│       └── pages/
│           ├── Login.jsx
│           ├── AdminDashboard.jsx        Router → admin/AdminOverview | AdminUsers | AdminSettings
│           ├── admin/AdminOverview.jsx   KPIs, charts, log stream, export, delete
│           ├── admin/AdminUsers.jsx      User management (overview, staff view, worker view, modal)
│           ├── admin/AdminSettings.jsx   Admin profile, facility prefs, change password
│           ├── StaffDashboard.jsx        Dashboard, Add Waste, History (by URL path)
│           ├── StaffProfilePage.jsx
│           ├── WorkerDashboard.jsx       Router → worker/* pages by URL path
│           └── worker/WorkerDashboardPage.jsx | WorkerAssignedPage.jsx | WorkerHistoryPage.jsx | WorkerProfilePage.jsx
│
└── hospital-waste-dashboard/     ── LEGACY Flask/SQLite prototype. NOT used by the website. ──
```

---

## 4. Installation and running

Full beginner instructions are in `SETUP_GUIDE.html`. Summary:

```bash
# 0. prerequisites: Git, Node.js 20+, and Docker Desktop (or use the in-memory DB)
git clone https://github.com/<YOUR-USERNAME>/Hospital-biomedical-waste-management.git
cd Hospital-biomedical-waste-management

# 1. database (choose one)
docker compose up -d mongo            # A: Docker, data persists            OR
#   (nothing)                         # B: use `npm run dev:memory` below   OR
#   local MongoDB service             # C

# 2. backend — terminal 1
cd hospital-waste-backend
cp .env.example .env                  # Windows PowerShell: Copy-Item .env.example .env
#   edit .env → set JWT_SECRET (any long random text); optionally GEMINI_API_KEY
npm install
npm run dev                           # or: npm run dev:memory
#   → "Backend server is running on http://localhost:5000"

# 3. frontend — terminal 2
cd hospital-waste-frontend
npm install
npm run dev                           # → http://localhost:5173
```

On first start the backend **auto-seeds** 151 users and 8 sample records (see §6). Health check: `GET http://localhost:5000/api/health` → `{"status":"ok","database":"connected"}`.

---

## 5. Environment variables

### Backend (`hospital-waste-backend/.env`)

| Variable | Default | Meaning |
|---|---|---|
| `MONGO_URI` | `mongodb://127.0.0.1:27017/biowaste_db` | MongoDB connection string. For Atlas: `mongodb+srv://user:pass@cluster.mongodb.net/biowaste_db` |
| `PORT` | `5000` | API port |
| `TZ` | `Asia/Kolkata` | Process time zone (reporting is IST regardless — see §19) |
| `JWT_SECRET` | insecure dev default + console warning | Secret for signing login tokens. **Must be set in production.** Changing it invalidates all existing logins. |
| `JWT_EXPIRES_IN` | `12h` | Token lifetime (`jsonwebtoken` format: `30m`, `12h`, `7d`) |
| `CORS_ORIGIN` | empty = allow all | Comma-separated list of allowed frontend origins, e.g. `https://kmch-waste.netlify.app,http://localhost:5173` |
| `GEMINI_API_KEY` | placeholder | Google AI Studio key; enables photo classification. Free at https://aistudio.google.com/app/apikey |
| `GEMINI_MODEL` | `gemini-2.5-flash` | Vision model name. (`gemini-1.5-flash` is retired — do not use.) |

### Frontend (`hospital-waste-frontend/.env`, optional)

| Variable | Default | Meaning |
|---|---|---|
| `VITE_API_URL` | `http://localhost:5000/api` | Base URL of the backend API |
| `VITE_SHOW_DEMO_CREDENTIALS` | `false` | Show the demo-credentials hint box on the login page in **production builds** (always shown in `npm run dev`) |

Vite only reads variables prefixed `VITE_`, and only at build/start time — restart `npm run dev` after editing.

---

## 6. Demo accounts and seed data

Created automatically by `server.js → seedDatabase()` when the users collection has fewer than 100 documents.

| Role | Username | Email | Password | Department | Active? |
|---|---|---|---|---|---|
| admin | `adminname` | `admin@hospital.com` | `Password123` | Administration | yes |
| staff | `staff001` … `staff075` | `staffNNN@hospital.com` | `Password123` | cycles through Emergency, ICU, Pediatrics, Surgery, General Ward, Oncology, Cardiology, Radiology | every 10th (`staff010, 020 … 070`) is **inactive** |
| worker | `worker001` … `worker075` | `workerNNN@hospital.com` | `Password123` | cycles through Logistics, Sanitation, Waste Mgt, Environmental Care | every 12th (`worker012, 024, 036, 048, 060, 072`) is **inactive** |

Display names are `Staff Member N` and `Sanitation Worker N`. Phones are `9800000NNN` / `9700000NNN`. Inactive accounts **cannot log in** (HTTP 403 "This account has been deactivated") until an admin activates them.

Sample waste records seeded (if fewer than 10 exist): `WR-101` … `WR-108` spread over the last 7 days — a mix of Completed, Collected, Assigned and Pending, created by "Staff Member 1–7", some collected by "Sanitation Worker 1–4". Note `WR-107` is deliberately **Sharps in a Blue bin** (non-compliant) so compliance < 100 % is visible.

Optional extra seeds:
- `npm run seed` — replaces the generic names with realistic Indian names (`Dr. Rajesh Sharma`, `Ramesh Kumar`, …) for users that don't exist yet; same usernames/passwords.
- `npm run seed:history` — adds ~130 records across the previous 45 days (`WR-HIST-…`) with realistic collect/complete timestamps, so admin charts and trends have data.

---

## 7. Roles and permissions

| Action | Admin | Staff | Worker |
|---|---|---|---|
| Log in / change own password / edit own name & phone | ✅ | ✅ | ✅ |
| View analytics dashboard (`/api/waste/stats`) | ✅ | ✅ (used for own KPIs) | ✅ |
| List all users | ✅ | ❌ (403) — may list **active workers** only (for the assign dropdown) | ❌ |
| Create / edit / activate / deactivate / delete users | ✅ | ❌ | ❌ |
| Create waste record, assign worker, send reminder, **cancel** record | ✅ | ✅ | ❌ |
| **Collect** / **complete (dispose)** a record | ✅ | ❌ | ✅ (own records) |
| View all waste records | ✅ | ✅ | ❌ — automatically **scoped to own** assigned/collected records |
| Permanently delete a waste record | ✅ | ❌ | ❌ |
| Notifications | own + role broadcasts | own + role broadcasts | own + role broadcasts |
| AI photo classification | ✅ | ✅ | ✅ |

Enforced server-side in `middleware/auth.js` (`requireAuth`, `requireRole`) and inside route handlers (`scopeWorker()` in `waste.js`, self-vs-admin check in `users.js`). The frontend additionally hides routes per role (`ProtectedRoute` in `App.jsx`).

The admin account cannot be deactivated, deleted, or have its role changed.

---

## 8. Domain rules

### 8.1 Categories → statutory bin (BMW Rules 2016)

Defined once in `backend/utils/compliance.js` and mirrored in `frontend/src/utils/waste.js`:

| Category (exact string stored in DB) | Bin | Typical items |
|---|---|---|
| `Infectious Waste` | **Yellow** | blood/body-fluid-soaked cotton, gauze, swabs, dressings, bandages, soiled linen, plaster casts, human/animal tissue, placenta, lab cultures |
| `Chemical Waste` | **Yellow** | expired/discarded medicines, tablets, chemical liquids, disinfectants, cytotoxic drugs |
| `Sharps` | **White** | needles, syringes *with* needle, scalpels, blades, lancets, suture needles (puncture-proof container) |
| `Contaminated Recyclable` | **Red** | gloves, IV sets & bottles, catheters, urine bags, syringes *without* needle, tubing, plastic containers |
| `Glassware & Metallic Implants` | **Blue** | glass vials, ampoules, slides, broken glass, orthopaedic implants/screws (cardboard box with blue marking) |
| `General Waste` | **Green** | food packaging, paper, uncontaminated wrappers (municipal) |

Bins: `['Yellow','Red','White','Blue','Green']`. Both arrays are Mongoose enums, so the API rejects anything else with HTTP 400.

### 8.2 Compliance

- A record is **compliant** when `CATEGORY_BIN_MAP[category] === assignedBin` **and** the worker did not report a bin mismatch (`hasMismatch(record) === false`).
- `hasMismatch(record)` = `binMismatchNote` is non-empty **or** (`binVerified === false` **and** status is Completed/Disposed). The second clause exists because `binVerified` defaults to `false` before verification, so only completed records can be counted as mismatches.
- **Compliance rate** (admin KPI) = compliant records ÷ non-cancelled records for the selected day × 100 (100 % when there are no records). CPCB benchmark: > 90 %.
- Staff form: choosing a category auto-selects the correct bin; choosing a different bin shows a warning but still allows saving (the record is then flagged **"Review Required"** in history and lowers compliance). This is intentional — real-world mis-segregation must be recordable to be audited.

### 8.3 Overdue

A Pending/Assigned record is **overdue** when 120 minutes have passed since `assignedTime || createdAt`, or it was created on a previous IST day. Shown with ⚠ and elapsed time on staff and worker tables; counted in staff "Pending (n overdue)" and in worker-stats `overdueCount`; admin "Backlog / Overdue Lots" counts Pending/Assigned created before the selected day.

---

## 9. Waste record lifecycle

```
            staff creates (with worker)          worker                worker (after bin verification)
   ┌────────┐ ───────────────────────▶ ┌──────────┐ ──────▶ ┌───────────┐ ─────────────────────────────▶ ┌───────────┐
   │Pending │   (no worker → Pending)  │ Assigned │ Collect │ Collected │  Complete / Dispose           │ Completed │
   └────────┘                          └──────────┘         └───────────┘                               └───────────┘
        │  staff/admin Cancel                 │
        └─────────────────────────────────────┴──────────▶ Cancelled   (only from Pending/Assigned)
```

| Status | Set by | Meaning | Allowed next |
|---|---|---|---|
| `Pending` | create without worker | logged, nobody assigned | Assigned (assign), Collected (collect), Cancelled |
| `Assigned` | create with worker / assign | worker notified | Collected, Cancelled, re-assign |
| `Collected` | worker `collect` | physically picked up; `collectedBy/At` set | Completed |
| `Completed` | worker `complete` | disposed; `completedAt`, `disposedAt`, `binVerified`, optional `binMismatchNote` set | — (terminal) |
| `Disposed` | legacy alias of Completed (kept in enum; treated identically) | | — |
| `Cancelled` | staff/admin `cancel` | `cancelledAt/By/Reason` set; worker notified; excluded from weights/compliance | — (terminal) |

Record IDs are `WR-001`, `WR-002`… generated from `countDocuments()+1` with a collision loop (`generateRecordId()`), so IDs stay unique even after deletions.

---

## 10. Database models

### 10.1 `User` (`models/User.js`) — collection `users`

| Field | Type | Notes |
|---|---|---|
| `name` | String, required | display name |
| `email` | String, required, **unique**, lowercased | login identifier |
| `username` | String, lowercased | login identifier (seed: `staff001`; admin-created users: same as email) |
| `password` | String | **bcrypt hash** (10 rounds); never returned by the API |
| `phone` | String | |
| `role` | `'admin' \| 'staff' \| 'worker'`, required | |
| `department` | String, default `'General'` | |
| `isActive` | Boolean, default `true` | `false` blocks login |
| `createdAt`, `updatedAt` | Date | Mongoose timestamps |

### 10.2 `WasteRecord` (`models/WasteRecord.js`) — collection `wasterecords`

| Field | Type | Notes |
|---|---|---|
| `recordId` | String, required, unique | `WR-###` |
| `description` | String | optional free text |
| `room` | String, required | free text, e.g. `ICU Bed 4` |
| `category` | enum CATEGORIES, required | see §8.1 |
| `weight` | Number, required, min 0.01 | kilograms |
| `assignedBin` | enum BINS, required | |
| `status` | enum (§9), default `Pending` | |
| `createdBy` | String | **name** of the staff user (from JWT) |
| `assignedTo` / `assignedToUserId` | String / String | worker name / Mongo id as string |
| `assignedTime` | Date | when assigned |
| `collectedBy` / `collectedByUserId` | String / String | set on collect (from JWT) |
| `collectedAt`, `completedAt`, `disposedAt` | Date | |
| `binVerified` | Boolean, default `false` | set at completion |
| `binMismatchNote` | String | worker's description of the mismatch |
| `lastReminderSentAt` | Date | for the 60 s cooldown |
| `reminderCount` | Number | |
| `cancelledAt`, `cancelledBy`, `cancelReason` | Date, String, String | |
| `createdAt`, `updatedAt` | Date | timestamps; `createdAt` defines the record's "day" |

Worker matching is by **id or name** (`assignedToUserId`/`collectedByUserId` or `assignedTo`/`collectedBy`) because seeded sample records only have names.

### 10.3 `Notification` (`models/Notification.js`) — collection `notifications`

| Field | Notes |
|---|---|
| `recipientUserId` | specific user (string id) or `''` for a role broadcast |
| `recipientRole` | `'admin' \| 'staff' \| 'worker' \| 'all'` |
| `senderUserId`, `senderName` | |
| `recordId`, `wasteRecordId` | human id and ObjectId ref |
| `type` | `'assignment' \| 'reminder' \| 'collection' \| 'disposal' \| 'status_update'` (status_update = cancellation) |
| `title`, `message` | shown in the bell |
| `room`, `category`, `weight`, `assignedBin` | denormalised for display |
| `isRead` | Boolean |

---

## 11. Authentication and sessions

1. `POST /api/auth/login` with `{ username, password, role? }`. `username` may be the username **or** email (case-insensitive). If `role` is sent (the login page always sends the chosen role card) it must match the account, otherwise 401 *"Access denied. Account role is 'worker', not 'admin'"*.
2. Password compared with bcrypt. Inactive account → 403.
3. Server returns `{ token, user }`. Token = JWT `{ id, role, name }` signed with `JWT_SECRET`, expiring after `JWT_EXPIRES_IN` (12 h).
4. Frontend stores `authToken` and `currentUser` (JSON) in `localStorage` (`services/api.js → session`). Every request sends `Authorization: Bearer <token>`.
5. All `/api/*` routes except `/api/health` and `/api/auth/login` require the token (`requireAuth` in `server.js`). Invalid/expired → 401 *"Session expired or invalid"*.
6. On any 401 the frontend clears the session and `SessionGuard` (App.jsx) redirects to `/` with a toast *"Your session has expired"*.
7. Logout = clear localStorage (Sidebar). There is no server-side token revocation (stateless JWT) — changing `JWT_SECRET` or waiting for expiry invalidates tokens.
8. Passwords: min 6 characters everywhere (create user, admin reset, self change). Self change requires the current password.

---

## 12. REST API reference

Base URL `http://localhost:5000/api`. All responses are JSON. Errors are `{ "message": "..." }` (AI route also includes `"error": "CODE"`). Unknown routes → 404 JSON. Malformed Mongo ids → 400. Dates are ISO strings (UTC).

### 12.1 Health & Auth

| Method & path | Auth | Body / query | Success response | Errors |
|---|---|---|---|---|
| `GET /health` | none | — | `{status:'ok', message, database:'connected'\|'disconnected'}` | |
| `POST /auth/login` | none | `{username, password, role?}` | `{message, token, user:{id,name,email,username,role,department,phone,isActive,createdAt}}` | 400 missing fields; 401 bad credentials / role mismatch; 403 inactive |
| `GET /auth/me` | any | — | `{user}` fresh from DB | 403 if deactivated since login |
| `POST /auth/change-password` | any | `{currentPassword, newPassword}` | `{message}` | 400 (<6 chars), 401 wrong current |

### 12.2 Users

| Method & path | Who | Body / query | Response | Notes |
|---|---|---|---|---|
| `GET /users` | admin; staff only with `role=worker` | `?role=all\|admin\|staff\|worker&status=active\|inactive&search=text` | array of users (no password), newest first | staff get only **active workers**; search matches name/email/username/department/phone (regex-escaped) |
| `POST /users` | admin | `{name, email, username?, password, phone?, role:'staff'\|'worker', department?}` | 201 `{message, user}` | 400 duplicate email/username, password < 6, role not staff/worker |
| `PUT /users/:id` | admin, or the user themself | `{name?, phone?, department?, role?, isActive?, password?}` | `{message, user}` | non-admins can change only own `name` and `phone`; admin cannot change admin role/isActive |
| `PATCH /users/:id/toggle-active` | admin | — | `{message, isActive}` | 400 for admin account |
| `DELETE /users/:id` | admin | — | `{message}` | 400 for admin account |

### 12.3 Waste records

Query helpers: `date=today` or `date=YYYY-MM-DD` filters by **IST calendar day of `createdAt`**; `status=`; `workerName=`/`workerId=` (ignored for workers — they are always scoped to themselves).

| Method & path | Who | Body / query | Response |
|---|---|---|---|
| `GET /waste` | any | `?date&status&workerName&workerId` | array, newest first |
| `GET /waste/today` | any | — | today's (IST) records |
| `GET /waste/pending-previous` | any | — | Pending/Assigned created before today |
| `GET /waste/worker-stats` | any (worker scoped) | `?workerName&workerId` | `{todayAssignedPickups, pendingCollections, collectedCollections, inTransitCollections(0), completedDisposals, overdueCount, todayCollections, userTotalCollections, todayWeightCollected, roomWisePending:[{room,count}], recentNotifications:[5 latest pending records]}` |
| `GET /waste/history` | any (worker scoped) | `?search&category&room` | **Completed** records, newest first; search matches recordId/room/description |
| `GET /waste/stats` | any | `?date=YYYY-MM-DD` (default today) | see §13 |
| `POST /waste` | staff, admin | `{room, category, weight, assignedBin, description?, assignedTo?, assignedToUserId?}` | 201 `{message, record}`; status Assigned if a worker given else Pending; `createdBy` = caller's name; notifies worker |
| `PUT /waste/:id/assign` | staff, admin | `{assignedTo, assignedToUserId}` | `{message, record}`; Pending→Assigned; notifies worker; 400 if Completed/Cancelled |
| `PUT /waste/:id/collect` | worker, admin | `{}` | `{message, record}`; →Collected; `collectedBy/ById` from JWT; notifies staff role; 400 if already collected/completed/cancelled |
| `PUT /waste/:id/complete` | worker, admin | `{binVerified:boolean, binMismatchNote?}` | `{message, record}`; **must be Collected first** (400 otherwise); →Completed; sets completedAt/disposedAt; notifies staff role |
| `PUT /waste/:id/cancel` | staff, admin | `{reason?}` | `{message, record}`; only from Pending/Assigned (400 otherwise); notifies assigned worker (`status_update`) |
| `DELETE /waste/:id` | admin | — | `{message}`; also deletes its notifications |

Validation on create: category ∈ CATEGORIES, bin ∈ BINS, weight > 0, room non-empty.

### 12.4 Notifications

| Method & path | Who | Body | Response |
|---|---|---|---|
| `GET /notifications` | any | — | `{notifications:[…max 100, newest first], unreadCount}` — items addressed to the caller's id **or** broadcast to their role / `all` |
| `PATCH /notifications/:id/read` | any | — | `{message, notification}` |
| `PATCH /notifications/read-all` | any | `{}` | marks all of the caller's unread as read |
| `POST /notifications/reminder` | staff, admin | `{wasteRecordId \| recordId, cooldownSeconds?=60}` | `{message, lastReminderSentAt, reminderCount, notificationId}`; creates a `reminder` for the worker **and** a confirmation for the staff; 400 if no worker assigned / already completed or cancelled; **429** with `remainingSeconds` during cooldown |

### 12.5 AI

| Method & path | Who | Body | Response |
|---|---|---|---|
| `GET /ai/status` | any | — | `{configured: boolean, model}` — whether `GEMINI_API_KEY` is set |
| `POST /ai/classify-image` | any | `multipart/form-data`: `image` (jpeg/png/webp ≤ 5 MB), optional `hint` text | `{uncertain, reason, items:[{name, category, bin, confidence 0–1, disposal, hazard_warning, ppe, binCorrected?, binCorrectionReason?, categoryCorrected?}], model}` |

Error codes for classify-image: `MISSING_API_KEY` (503), `NO_IMAGE` (400), `FILE_TOO_LARGE` (400), `INVALID_MIME` (400), `RATE_LIMIT` (429), `INVALID_API_KEY` (503), `INVALID_MODEL` (503), `AI_ERROR` (502), `PARSE_ERROR` (502). The server **normalises** the model's category to one of the six canonical categories and **forces the bin** to the statutory one for that category (adding `binCorrected`/`binCorrectionReason` when it changed). If every item's confidence < 0.6 the result is marked `uncertain`.

---

## 13. How statistics are calculated

`GET /api/waste/stats?date=YYYY-MM-DD` (admin dashboard). "Day" = IST calendar day of `createdAt` (see §19). Cancelled records are excluded from all weights/compliance.

| Field | Formula |
|---|---|
| `totalWeight` | Σ weight of the day's live records |
| `pendingCount` / `todayPending` | records with status Pending or Assigned |
| `collectedCount` / `todayCompleted` | status Collected, Completed or Disposed |
| `todayTotalRecords` | number of live records that day |
| `complianceRate` | compliant ÷ total × 100 (see §8.2); 100 if no records |
| `weightChangePct` | (today − previous day) ÷ previous day × 100, 1 decimal; `null` if previous day had no weight |
| `complianceChangePct` | today's rate − previous day's rate (percentage points); `null` if no previous data |
| `avgTurnaroundMinutes` | mean of (`collectedAt` − `createdAt`) over the day's collected records; `null` if none |
| `previousDaysPending` | Pending/Assigned records created **before** the selected day (backlog) |
| `cancelledCount`, `mismatchCount` | counts for the day |
| `binBreakdown` | `{Yellow, Red, White, Blue, Green}` → kg per **assignedBin** (exhaustive, no double counting) |
| `categoryWeights` | kg per category |
| `categoryBreakdown` | legacy `{infectious: Yellow kg, sharps: White kg, general: Green+Red+Blue kg}` |
| `weeklyChartData` | 7 objects Sun→Sat for the week containing the selected date: `{name, infectious, sharps, general, records}` (kg per bin group per day) |
| `weekRangeLabel` | e.g. `"Oct 11 – Oct 17, 2026"` |
| `recentActivity` | the day's records with an `action` string |

Staff dashboard KPIs are computed **client-side** from `GET /waste` (records created today in IST, pending across all days, collected awaiting disposal, disposed today, today's compliance by category→bin mapping). Worker KPIs come from `/waste/worker-stats`.

---

## 14. Notifications system

| Event | Trigger | Recipient | Type |
|---|---|---|---|
| New task assigned | staff creates record with worker / re-assigns | that worker (by id) | `assignment` |
| Reminder | staff clicks **Send Reminder** | worker (by id; falls back to lookup by name) **and** a confirmation to the staff member | `reminder` |
| Collected | worker collects | all staff (role broadcast) | `collection` |
| Disposed | worker completes | all staff (role broadcast), message includes "Bag Matched Bin" or "Mismatch Reported" | `disposal` |
| Cancelled | staff/admin cancels | the assigned worker | `status_update` |

The bell component polls `GET /notifications` every 15 s and on open. Clicking an item marks it read; for workers it also opens that task (searches by record id). Reminder cooldown is 60 s per record (HTTP 429 otherwise) and `reminderCount` increments.

---

## 15. Frontend architecture

- **Entry:** `main.jsx` wraps `<App/>` in `LanguageProvider` (i18n) and `ToastProvider` (notifications).
- **Routing (`App.jsx`):** `/` Login; `/admin/*`, `/staff/*`, `/worker/*` wrapped in `ProtectedRoute` (needs token + matching role, otherwise redirects to `/` or to the user's own dashboard). Sub-pages are chosen by URL path inside each role's page component (`/staff/add-waste`, `/staff/history`, `/staff/profile`, `/worker/assigned`, `/worker/history`, `/worker/profile`, `/admin/users`, `/admin/users?view=staff|worker`, `/admin/settings`).
- **Layout:** fixed 260 px sidebar; on ≤ 768 px it becomes an off-canvas drawer opened by the ☰ Menu button in a sticky top bar (`.mobile-topbar`, `.app-sidebar.open`, `.sidebar-backdrop`).
- **API client (`services/api.js`):** single `request()` helper; adds JSON header and Bearer token; parses JSON; throws `Error` with `.status` and `.code`; network failure → *"Cannot reach the server…"*; 401 → clears session and calls the registered `onUnauthorized` handler. `session` object manages `localStorage` (`authToken`, `currentUser`).
- **Shared helpers:** `utils/waste.js` (CATEGORY_BIN_MAP, BINS, isActive/isDone/isCancelled, isCompliant, hasMismatch, statusBadgeClass, binClass, downloadCsv, formatMinutes), `utils/dateUtils.js` (IST formatters, `calculateOverdueInfo(date, 120)`), `hooks/useWorkerTasks.js` (loads records + worker-stats, `handleCollect`, `handleStartDispose`, `confirmDisposal`).
- **Styling:** `index.css` defines CSS variables (`--primary-blue`, bin colours…), `.card`, `.btn*`, `.badge*`, `.bin-tag.bin-yellow…`, `.stat-card`, `.kpi-grid`, `.two-col`, `.form-with-aside`, `.profile-grid`, `.worker-main-grid`, `.pagination`, `.modal-overlay`, `.toast`, `.lang-select`, focus-visible rings, reduced-motion and print rules.
- **Pagination:** client-side everywhere (10–15 rows per page) via `components/Pagination.jsx`.
- **Toasts:** `useToast().success/error/info(message)`; replaces all `alert()`s.
- **Build:** `npm run build` → `dist/` (single JS bundle ~1.1 MB minified, ~300 KB gzipped).

---

## 16. Every page and feature

### 16.1 Login (`/`)
Language selector (top-right). Three role cards → form with username/email, password (👁 toggle), **Login to Dashboard**. In dev builds a blue box shows the demo credentials for the chosen role. Already-logged-in users are redirected to their dashboard. Error messages come straight from the API (bad credentials, role mismatch, deactivated).

### 16.2 Shared: Sidebar, Notification bell, Profile
Described in §15, §14. **My Profile** (staff & worker): identity card (email, phone, department, member since), activity stats, account info, **Edit Profile** (name, phone → `PUT /users/:id`), role permissions list (staff), **Security Settings → Change Password**.

### 16.3 Admin

**Dashboard (`/admin`)** — date picker (max today) + **Today** + **Sync** + **Export Audit CSV**; four KPI cards (Total BioWaste Volume with vs-previous-day %, Segregation Compliance with pts change and >90 % benchmark bar, Day's Clearance `completed / total` with avg turnaround, Backlog / Overdue Lots red when > 0); weekly Area chart Sun–Sat per bin group; donut by bin colour with kg; **Operational Waste Log Stream** table (tabs All/Pending/Completed/Cancelled with counts, search, category filter, 15/page, 🗑 delete with confirm, non-compliant rows flagged "Review Required", mismatch flag).

**User Management (`/admin/users`)** — overview with two cards to **Medical Staff Details** (`?view=staff`) and **Sanitation Worker Details** (`?view=worker`); All Users table (search, role filter, status filter, 10/page); **+ Add New User** modal (name, email, password ≥ 6, phone, department optgroups, role); per row **Edit** (name, phone, department, role, optional password reset), **Activate/Deactivate**, **Delete** (confirm). Detail views add KPI cards (totals, active on duty, departments/zones, logged today / inactive).

**Settings (`/admin/settings`)** — admin name & phone (saved to DB), email read-only, facility name & licence number and notification toggles (saved in browser `localStorage` key `adminSettings`), **Change Admin Password**.

### 16.4 Staff

**Dashboard (`/staff`)** — bell + today's date; 5 KPI cards; **Hospital Waste Collections** table with tabs Today / Overdue & Outstanding / All (15/page); per pending row **Send Reminder** (60 s cooldown, shows last sent time) and **Cancel** (modal with optional reason); completed rows show "Collected by …"; **Worker Verification & Bin Audit** section with three counters and a 10-row table of verification results (Bag Matched Bin / Mismatch Reported with note / Awaiting Verification / Pending Pickup).

**Add Waste Record (`/staff/add-waste`)** — form: description (optional, ≤ 300), room (free text with suggestions), category (6), weight kg (0.1–500), assigned bin (auto-set from category; warning if changed to a wrong colour), **Assign Collection Worker** (active workers; required), submit → toast + inline success with record id. Right column: **AI Waste Assistant** with **Apply Category & Bin to Form**.

**Waste History (`/staff/history`)** — all records, search (id/room/worker/description/staff), category + status filters, compliance column, cancel reason, 15/page, **Export CSV**.

### 16.5 Worker

**Dashboard (`/worker`)** — bell (clicking a notification opens that task), alert banner for pending pickups with **View Request**; 4 KPI cards; task table with tabs All / Today's / Overdue / Pending / Collected / Completed, date/room/category filters + search, 10/page; room name opens **Task Details** modal (status flow Pending→Collected→Disposed, all fields, description, mismatch note); **Collect** / **Dispose** / **View** buttons; **AI Waste Assistant** on the right; collapsible **Verification Protocol** (what goes in each bin).

**Bin verification modal (Dispose)** — shows the bin colour circle; radio **Yes — bag matches** or **No — report colour mismatch** (requires a note); **Confirm & Complete Disposal**.

**Assigned Collections (`/worker/assigned`)** — only active tasks (Pending/Assigned/Collected) with status/room/category filters, 12/page, same actions.

**Collection History (`/worker/history`)** — completed records with collected/disposed times and verification result; search/category/room filters; 15/page; **Export CSV**.

---

## 17. Internationalisation

- Files: `src/i18n/translations.js` (dictionaries `en, ta, hi, te, kn, ml` + `LANGUAGES` list) and `src/i18n/LanguageContext.jsx`.
- API: `const { t, lang, setLang, languages } = useLanguage()` or `const t = useT()`. `t('staff.addTitle')`, `t('common.showing', {from, to, total})` — `{var}` placeholders are interpolated; a few values are functions (e.g. `worker.alertBody({count, room, cat})`).
- **Fallback:** missing key in the selected language → English → the key string itself. So partial translations never crash.
- Selected language is saved in `localStorage.appLanguage` and applied to `<html lang>`.
- Dictionary groups: `common`, `statuses`, `roles`, `categories`, `bins`, `binHints`, `nav`, `login`, `notifications`, `chatbot`, `staff`, `worker`, `admin` (+ `admin.users`, `admin.settings`), `profile`.
- Database values (category, bin, status) are always stored in English; the UI translates them for display via `t('categories.<value>')`, `t('bins.<value>')`, `t('statuses.<value>')`.
- The chatbot has its **own** language handling (speech language dropdown + text detection) but defaults to the app language.

---

## 18. AI Waste Assistant

Component `components/WasteChatbot.jsx`; brain `services/nlpEngine.js`; vision `backend/routes/ai.js`.

### 18.1 Text (works offline, no key)
`processChatMessage(text, hasImage, lang)`:
1. **Language detection** by Unicode range or transliterated keywords (`ratham`, `khoon`, `oosi`, …).
2. **Intents:** greeting, doubt/help, thanks, needle-stick injury protocol, PPE questions, "what goes in the yellow/red/white bin" inquiries — each answered in the user's language.
3. **Classification** (`analyzeWordsWithNLP`): tokenises, strips suffixes for Indian languages (morphological stemmer), detects modifiers (blood-soaked, without needle, broken, expired), scores each token against a multilingual `SEMANTIC_LEXICON` into five buckets (infectious, sharps, plastics, glassware, general), applies phrase rules (e.g. *syringe + without needle → Red*), picks the top bucket and returns category, bin, confidence, disposal guidance, safety warning and a word-by-word explanation.
4. If nothing matched → guided fallback listing the five bins. **It never invents a classification from a photo alone.**

### 18.2 Voice
Browser `SpeechRecognition` (Chrome/Edge) with the selected `xx-IN` locale fills the input; `speechSynthesis` reads replies when **Voice On**. No audio is sent to any server.

### 18.3 Photo
Enabling it (get a free key, edit `.env`, restart) is documented step by step in **`ENABLE_PHOTO_SCAN.md`**.
1. Frontend calls `GET /ai/status`; if not configured a yellow banner says photo scanning is off.
2. On send with an image: `POST /ai/classify-image` (image + typed text as `hint`).
3. Backend (Gemini, JSON mode, temperature 0.1) is prompted with the BMW rules, explicitly: *soft absorbent material stained with blood (cotton, gauze, swabs) is ALWAYS Infectious Waste — never Sharps*; sharps only for rigid puncturing objects; syringe with needle → White, without → Red; return one item per object; set `uncertain` when unsure.
4. Server normalises categories and forces statutory bins; frontend lists every item with confidence and offers **Apply to form** (top item).
5. On any failure the assistant explains *why* (missing key / rate limit / model unavailable) and classifies the typed text instead, labelled *"Based on your description (the photo could not be analysed)"*.

**Known history:** the original code fell back to a hard-coded "Sharps 94 %" for any photo when vision failed (and the model name `gemini-1.5-flash` was retired), which is why blood-cotton photos were reported as sharps. This is fixed; `npm run test:nlp` guards against regressions.

---

## 19. Time zone handling

The hospital is in India; all "today" logic uses **IST (UTC+5:30)** regardless of server time zone:
- Backend `getISTDayBounds(dateStr)` converts an IST calendar day to UTC `[start, end)` bounds for Mongo queries (`waste.js`).
- Frontend `dateUtils.js` formats with `Intl.DateTimeFormat(..., {timeZone:'Asia/Kolkata'})` and `getTodayISTDateString()` returns `YYYY-MM-DD` in IST.
- Dates are stored in UTC in MongoDB (Mongoose default).

---

## 20. Testing

| Test | Command | What it checks |
|---|---|---|
| Backend API smoke | `cd hospital-waste-backend && node smoke-test.js [baseUrl]` (server must be running) | 41 checks: health, unauthenticated rejection, logins for 3 roles, role mismatch, inactive block, `/me`, stats shape, staff/worker permission denials, validation, create→notify→collect→complete (with mismatch)→history, cancel rules, reminder + 429 cooldown, invalid ids, 404 JSON, self-update restrictions, user CRUD, AI status + missing-key behaviour |
| Chatbot classifier | `cd hospital-waste-frontend && npm run test:nlp` | 38 phrases across 6 languages map to the correct bin; 5 photo-without-description cases produce **no** guess |
| UI end-to-end | `npm run test:ui` (both servers running; needs Chrome or Edge installed) | Launches headless Chrome via DevTools protocol: login page, every route for every role, 6 languages, untranslated-key scan, zero console errors/exceptions, real staff→worker workflow through the UI, chatbot text + photo scenarios, role-guard redirect, expired-token redirect |
| Lint | `npm run lint` | oxlint on `src/` (no-undef is an error) |
| Build | `npm run build` | production bundle compiles |

---

## 21. Scripts reference

**Backend** (`hospital-waste-backend/package.json`)
- `npm start` — `node server.js`
- `npm run dev` — `node --watch server.js` (auto-restart on change)
- `npm run dev:memory` — in-memory MongoDB + server (data not persisted)
- `npm run seed` — richer named users (`seed.js`)
- `npm run seed:history` — 45 days of sample records
- `node smoke-test.js` — API tests

**Frontend** (`hospital-waste-frontend/package.json`)
- `npm run dev` — Vite dev server on 5173 (add `-- --host` to expose on the LAN)
- `npm run build` / `npm run preview`
- `npm run lint`, `npm run test:nlp`, `npm run test:ui`

**Root**
- `docker compose up -d mongo` / `docker compose down` / `docker compose down -v` (also deletes data)

---

## 22. Security notes

- Passwords bcrypt-hashed; never returned by any endpoint.
- JWT in `Authorization` header; stored in `localStorage` (acceptable for an internal tool; for higher assurance use httpOnly cookies).
- Every mutation is authorised by role **on the server**; worker data is server-scoped; admin account is protected from deactivation/deletion.
- User-supplied search strings are regex-escaped (no ReDoS/injection).
- Mongo ids are validated before queries (400 instead of 500).
- Upload: MIME whitelist, 5 MB cap, memory storage (nothing written to disk); Gemini key never leaves the server.
- `.env` files are git-ignored; `JWT_SECRET` prints a warning if left at the dev default; set `CORS_ORIGIN` in production.
- Demo credentials are shown on the login page only in dev builds (or with `VITE_SHOW_DEMO_CREDENTIALS=true`).
- No rate limiting on login (add `express-rate-limit` if exposing publicly).

---

## 23. Deployment

1. **MongoDB Atlas** (free M0): create cluster → Database Access user → Network Access `0.0.0.0/0` (or your host IP) → Connect → copy URI into `MONGO_URI`.
2. **Backend** on Render/Railway/Fly: root directory `hospital-waste-backend`, build `npm install`, start `npm start`, env vars `MONGO_URI`, `JWT_SECRET`, `CORS_ORIGIN=https://<frontend-domain>`, optional `GEMINI_API_KEY`. The service auto-seeds demo users on first boot (remove/alter `seedDatabase()` in `server.js` for a clean production DB).
3. **Frontend** on Netlify/Vercel: root `hospital-waste-frontend`, build `npm run build`, publish `dist`, env `VITE_API_URL=https://<backend-domain>/api`. Add an SPA redirect rule (`/* → /index.html 200`) so deep links like `/staff/history` work.

---

## 24. How to extend

**Add a waste category** — edit `backend/utils/compliance.js` `CATEGORY_BIN_MAP` **and** `frontend/src/utils/waste.js`; add the display string to `categories` in every language in `translations.js`; optionally add lexicon words in `nlpEngine.js` and an alias regex in `routes/ai.js` `CATEGORY_ALIASES`. Forms, filters, stats and validation pick it up automatically.

**Add a language** — in `translations.js` add `{code, label, native}` to `LANGUAGES` and a dictionary `const xx = {...}`; include it in `export const translations`. Untranslated keys fall back to English. For chatbot voice add the locale to `SUPPORTED_LANGUAGES` in `nlpEngine.js`.

**Change hospital name/branding** — `common.appName`, `common.brandTag`, `common.hospital`, `common.hospitalFull` in each language; colours in `:root` of `index.css`; login icon in `Login.jsx`.

**Change overdue threshold (2 h)** — the `120` passed to `calculateOverdueInfo` in staff/worker pages and `2 * 60 * 60 * 1000` in `waste.js` worker-stats.

**Change reminder cooldown** — `cooldownSeconds` sent by `StaffDashboard.jsx` (60) / default in `notifications.js`.

**Change rooms suggestions** — `roomOptions` array in `StaffDashboard.jsx` (free text is always allowed).

**Change departments list** — `MEDICAL_DEPTS` / `SANITATION_DEPTS` in `admin/AdminUsers.jsx`.

**Add a new page** — create the component, add a sidebar link in `Sidebar.jsx` (with a `nav.*` translation) and a path check in the role's page router (`StaffDashboard.jsx`, `WorkerDashboard.jsx` or `AdminDashboard.jsx`).

**Add an API endpoint** — add a handler in the relevant `routes/*.js` (use `requireRole` for authorisation), then a method in `services/api.js`, then call it from a page; add a check in `smoke-test.js`.

**Disable auto-seeding** — remove the `await seedDatabase()` call in `server.js` `start()`.

---

## 25. Troubleshooting

| Symptom | Cause | Fix |
|---|---|---|
| Backend: `MongoDB connection error … Could not reach MongoDB` and exits | DB not running | `docker compose up -d mongo`, or use `npm run dev:memory` |
| Backend: `Port 5000 is already in use` | old process | Stop it (Win: `Get-NetTCPConnection -LocalPort 5000 \| % { Stop-Process -Id $_.OwningProcess -Force }`; Mac: `lsof -ti:5000 \| xargs kill -9`) or change `PORT` |
| Website toast: "Cannot reach the server" | backend down / wrong `VITE_API_URL` | check `localhost:5000/api/health`; restart backend; check frontend `.env` |
| "Invalid username or password" | wrong role card, wrong case in password, or inactive account | pick matching role; `Password123`; avoid `staff010…`, `worker012…` |
| "Access denied. Account role is 'X', not 'Y'" | role card ≠ account | choose the correct card |
| "This account has been deactivated" | `isActive=false` | admin → User Management → Activate |
| "Your session has expired" | 12 h passed, JWT_SECRET changed, or in-memory DB restarted (new user ids) | log in again |
| Worker sees no tasks | nothing assigned to that worker; or logged in as a different worker than the one chosen by staff | staff must select that worker in **Assign Collection Worker**; check the 🔔 bell |
| "Waste must be collected before it can be disposed of" | tried to complete a Pending record | click **Collect** first |
| "Cannot cancel after collection" / "Only Pending/Assigned records can be cancelled" | record already collected | cannot cancel; it must be completed |
| Reminder button → "Please wait Ns" | 60 s cooldown | wait |
| Chatbot banner "Photo scanning is off" | no `GEMINI_API_KEY` | add key to backend `.env`, restart backend; text/voice still work |
| Photo → "Gemini model … is unavailable" | retired/unknown model name | set `GEMINI_MODEL=gemini-2.5-flash` |
| Photo → rate limit | free-tier quota | wait a minute |
| Mic does nothing / "not supported" | Firefox/Safari or mic permission denied | use Chrome/Edge; allow microphone in the address-bar lock icon |
| Admin compliance shows < 100 % on a fresh DB | seeded `WR-107` is Sharps in Blue bin (intentional demo of mis-segregation) | expected |
| Charts empty | no records that week | `npm run seed:history` or create records |
| `npm` / `node` / `git` not recognized | not installed or terminal opened before install | install, reopen terminal; Node ≥ 20 |
| PowerShell "running scripts is disabled" | execution policy | `Set-ExecutionPolicy -Scope CurrentUser RemoteSigned` |
| `npm install` EACCES on Mac | npm cache permissions | `sudo chown -R $(whoami) ~/.npm` |
| Docker "Cannot connect to the Docker daemon" | Docker Desktop not open | open it, wait for "Engine running" |
| Deep link 404 after deploying frontend | host lacks SPA fallback | add `/* /index.html 200` redirect |
| Login page shows no demo credentials | production build | expected; set `VITE_SHOW_DEMO_CREDENTIALS=true` if wanted |
| `git push` → 403 | token lacks `Contents: write` or wrong account | create a fine-grained PAT with Contents read/write for the fork, or sign in via browser prompt |

Reset all data: `docker compose down -v && docker compose up -d mongo`, restart backend (re-seeds). In-memory: just restart.

---

## 26. FAQ

**Is internet required?** Only for installs, Google Fonts and the optional photo AI. Everything else is local.
**Can many people use it simultaneously?** Yes; run the frontend with `npm run dev -- --host` and point `VITE_API_URL` to the host machine's IP, or deploy (§23).
**Where is data stored?** MongoDB only (Docker volume `biowaste-mongo-data` or your Mongo). Photos go to Google only when you use photo scanning with your own key.
**Why "KMCH"?** The branding of the original author's hospital. Change via translations (§24).
**Why can staff pick a wrong bin?** To record real mis-segregation for auditing; it is flagged and lowers compliance.
**Why does `binVerified` default to false?** Historical schema; `hasMismatch()` handles it (§8.2).
**Can workers see other workers' tasks?** No — the server scopes by their id/name.
**What is `Disposed` vs `Completed`?** Same meaning; `Completed` is what the app writes, `Disposed` is kept for legacy records.
**How long is a login valid?** 12 hours (`JWT_EXPIRES_IN`).
**Does the chatbot use OpenAI?** No. Text/voice is a local rule engine; photos use Google Gemini via your key.
**Is the Flask folder needed?** No (§27).

---

## 27. Legacy Flask prototype

`hospital-waste-dashboard/` is an earlier Python/Flask + SQLite prototype (its own login, templates, SQLAlchemy models). It is **not connected** to the React/Node application, shares no data with it, and is kept only for reference. Running it: `pip install -r requirements.txt && python app.py` (self-seeds a SQLite DB on first run). You may delete the folder without affecting the main system.

---

## 28. Glossary

| Term | Meaning |
|---|---|
| **BMW Rules 2016** | India's Bio-Medical Waste Management Rules — define the colour-coded bins and treatment methods |
| **CPCB** | Central Pollution Control Board — regulator; > 90 % segregation benchmark |
| **Segregation** | Putting each waste item in its correct colour bin at the point of generation |
| **Compliance rate** | % of records correctly segregated and verified (§8.2) |
| **Bin verification** | Worker confirms at disposal that the bag colour matches the assigned bin |
| **Mismatch** | Worker reports the bag/bin colour did not match |
| **Turnaround** | Time from logging to collection |
| **Backlog / overdue lots** | Pending records from previous days |
| **JWT** | JSON Web Token — signed login token sent as `Authorization: Bearer …` |
| **bcrypt** | One-way password hashing algorithm |
| **IST** | Indian Standard Time, UTC+5:30 |
| **Seed** | Automatically created demo data |
| **In-memory MongoDB** | Temporary database for development (`npm run dev:memory`) |
| **Vite** | Frontend dev server / bundler |
| **Express** | Node.js web framework used by the backend |
| **Mongoose** | MongoDB object modelling library (schemas, enums, validation) |
| **CORS** | Browser rule controlling which websites may call the API |
| **Gemini** | Google's multimodal AI model used for photo classification |
| **NLP engine** | The local rule-based text classifier in `nlpEngine.js` |
| **Fork / clone / commit / push** | GitHub copy of a repo / download it / save a change / upload changes |

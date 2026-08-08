# 🎓 BJ-SCHOOL_MANAGEMENT_SYSTEM — AI-Powered School Management System

A modern, full-stack school management platform rebuilt from a legacy PHP system into a production-grade monorepo with **AI-powered insights**, **Google Calendar integration**, real-time notifications, and role-based dashboards for **admins, teachers, students, and parents**.

---

## 📸 Screenshots

<img width="1467" height="831" alt="image" src="https://github.com/user-attachments/assets/984f2e4f-c74c-4d4f-85ac-d497a2a3809d" />
(<img width="1917" height="927" alt="image" src="https://github.com/user-attachments/assets/d209844b-021c-4ce3-b5bc-d3e3adb2f373" />

| **Login** | **Main Page / Dashboard** |


(<img width="1917" height="927" alt="image" src="https://github.com/user-attachments/assets/d700dc1e-f2d9-4346-bfd6-b9dadedeb819" />
(<img width="1917" height="928" alt="image" src="https://github.com/user-attachments/assets/1685732e-e4cc-48be-87ce-f1873eb0fa29" />

| **AI Assistant** | **Academics** |

---

## ✨ Features

### 📊 Dashboard & Communication
| Area | Highlights |
|------|-----------|
| **Role-aware Dashboard** | Live stats cards + charts for admin, teacher, student, and parent views |
| **AI Assistant** | Conversational chatbot, performance prediction, attendance-risk analysis, smart timetable scheduling (genetic algorithm), NLP auto-grading, anomaly detection, study recommendations |
| **Announcements** | Real-time notifications pushed over Socket.io to authenticated rooms; mark read / read-all, unread badge |
| **Google Calendar** | OAuth2 connect, two-way event sync, schedule display |

### 📚 Academics
| Area | Highlights |
|------|-----------|
| **Classes** | Manage classes, assign teachers, list class students & subjects |
| **Students (SIS)** | Full student information system with records |
| **Gradebook** | Grades, bulk entry, per-student transcripts & summaries |
| **Attendance** | Single/bulk marking, today's view, stats |
| **Timetable** | Per-student & per-class schedules, conflict management |
| **Assignments (LMS)** | Create assignments, student submissions, AI-assisted grading |
| **Exams** | Exam scheduling, results, publishing |
| **Admissions** | Application intake with status + accept workflow |

### 🏢 Operations
| Area | Highlights |
|------|-----------|
| **Room & Hall Booking** | Book rooms/halls with conflict checks |
| **Events** | School events, upcoming list, registration |
| **Health Center** | Student health records |
| **Fees & Billing** | Invoices, payment recording, fee stats |
| **Library** | Book catalog, checkouts/loans, returns |
| **Transport** | Buses, routes, driver assignment |
| **HR & Payroll** | Staff records, leave requests + approval, payroll + paid status |

### ⚙️ Administration
| Area | Highlights |
|------|-----------|
| **Users & Staff** | User CRUD, activity log |
| **Roles & Permissions** | RBAC — granular permission options, per-role assignment |
| **Settings** | System-wide configuration |

### 🛡️ Platform
- **Security** — JWT access/refresh tokens, RBAC permission checks, rate limiting, helmet, CORS
- **Real-time** — Socket.io notifications to authenticated rooms
- **Observability** — Winston logging, request IDs, Swagger/OpenAPI docs, Redis caching
- **Mobile** — Capacitor Android APK build (`EduCore-Nexus.apk` at repo root)

---

## 🧱 Architecture

```
BJ-School_Management_system/
├── frontend/      Next.js 14 (App Router) + Tailwind + shadcn-style UI
├── backend/       Express + TypeScript + Prisma + PostgreSQL + Socket.io
├── ai-service/    FastAPI + scikit-learn / NLP ML models + chatbot
├── shared/        Shared TypeScript types, enums, zod validators
├── docs/          Architecture & API documentation
│   └── screenshots/   Add your README screenshots here
├── scripts/       Automation & helper scripts
└── docker-compose.yml
```

```
Browser ──▶ Next.js (3100)
             │  REST + WebSocket
             ▼
          Express API (4000) ──▶ PostgreSQL + Redis
             │  internal HTTP + API key
             ▼
          FastAPI AI Service (8000)
```

---

## 🚀 Quick Start (local dev)

> Requires Node.js ≥ 20, Python ≥ 3.11, and a running PostgreSQL instance.
> See **`how-to-run.txt`** for a copy-paste step-by-step guide.

```bash
# 1. Install dependencies (from repo root)
npm install

# 2. Build the shared package (needed by backend)
npm run build --workspace=@school-mgmt/shared

# 3. Configure environment
cp backend/.env.example backend/.env          # edit secrets
cp ai-service/.env.example ai-service/.env    # AI_API_KEY must match backend
cp frontend/.env.example frontend/.env.local

# 4. Start PostgreSQL (Docker) or point DATABASE_URL to an existing DB
docker compose up -d postgres redis

# 5. Generate Prisma client + push schema + seed demo data
npm run db:generate
npm run db:push
npm run db:seed

# 6. Run everything (backend + frontend + AI service)
npm run dev
```

Then open:
- **Frontend:** http://localhost:3100
- **API + Swagger:** http://localhost:4000/api-docs
- **Health check:** http://localhost:4000/health
- **AI service docs:** http://localhost:8000/docs

> Note: The frontend dev/start scripts use port **3100** to keep port 3000 free.

### Demo accounts

| Role | Email | Password |
|------|-------|----------|
| Principal (Super Admin) | `admin@educore.dev` | `Admin@123` |
| Teacher | `teacher1@educore.dev` | `Admin@123` |
| Student | `student1@educore.dev` | `Admin@123` |
| Parent | `parent1@educore.dev` | `Admin@123` |

---

## 🐳 Docker Compose (full stack)

```bash
docker compose up -d --build
```

Services: `postgres` (5432), `redis` (6379), `backend` (4000), `ai-service` (8000), `frontend` (3000).

> Note: For Google Calendar, fill `GOOGLE_CLIENT_ID`, `GOOGLE_CLIENT_SECRET`, and the private-key fields in `backend/.env` with credentials from the [Google Cloud Console](https://console.cloud.google.com/apis/credentials) (enable the Google Calendar API). Without them, event CRUD works, but Google sync requires configuration.

---

## 🧪 Testing

```bash
# AI service unit tests
cd ai-service && pytest

# Backend typecheck
npm run build --workspace=@school-mgmt/backend

# Frontend typecheck + build
npm run typecheck --workspace=@school-mgmt/frontend
npm run build --workspace=@school-mgmt/frontend
```

CI runs all three jobs automatically on push/PR (see `.github/workflows/ci.yml`).

---

## 🔌 API Overview

Base URL: `http://localhost:4000/api/v1`

| Resource | Routes |
|----------|--------|
| Auth | `POST /auth/login`, `POST /auth/register`, `POST /auth/refresh`, `GET /auth/me`, `PATCH /auth/me`, `POST /auth/google` |
| Users | `GET/POST /users`, `GET/PATCH/DELETE /users/:id`, `GET /users/:id/activity` |
| Events | `GET /events`, `GET /events/upcoming`, `POST /events`, `POST /events/:id/register` |
| Calendar | `GET /calendar/events`, `POST /calendar/events`, `GET /calendar/auth-url`, `POST /calendar/connect`, `POST /calendar/sync/:eventId` |
| AI | `POST /ai/chat`, `POST /ai/predict/performance`, `POST /ai/predict/attendance-risk`, `GET /ai/history` |
| Dashboard | `GET /dashboard` (role-aware) |
| Attendance | `POST /attendance` (single/bulk), `GET /attendance/stats`, `GET /attendance/today` |
| Grades | `GET/POST /grades`, `POST /grades/bulk`, `GET /grades/student/:id/transcript`, `GET /grades/student/:id/summary` |
| Academic | `GET /academic/years`, `/academic/terms`, `/academic/subjects`, `/academic/classes/:id/students`, `/academic/classes/:id/subjects`, `/academic/classes/:id/assign-teacher` |
| Fees | `GET/POST /fees`, `POST /fees/:id/pay`, `GET /fees/stats` |
| Health | `GET/POST /health-records` |
| Timetable | `GET /timetable/student`, `GET /timetable/class/:classId`, `POST /timetable`, `GET /timetable/conflicts` |
| Assignments | `GET/POST /assignments`, `POST /assignments/:id/submit`, `POST /assignments/:id/grade`, `GET /assignments/my-submissions` |
| Library | `GET/POST /library/books`, `GET/POST /library/loans`, `POST /library/loans/:id/return`, `GET /library/stats` |
| Transport | `GET /transport/buses`, `GET /transport/routes`, `GET /transport/stats` |
| HR | `GET/POST /hr/staff`, `GET /hr/leaves`, `PATCH /hr/leaves/:id/decide`, `GET /hr/payroll`, `PATCH /hr/payroll/:id/paid`, `GET /hr/stats` |
| Admissions | `GET /admissions`, `POST /admissions`, `PATCH /admissions/:id/accept`, `GET /admissions/stats` |
| Exams | `GET/POST /exams`, `GET /exams/:id/results`, `POST /exams/:id/publish` |
| Bookings | `GET/POST /bookings`, `GET /bookings/rooms`, `PATCH/DELETE /bookings/:id`, `GET /bookings/stats` |
| Notifications | `GET /notifications`, `GET /notifications/unread-count`, `POST /notifications`, `PATCH /notifications/:id/read`, `PATCH /notifications/read-all` |
| Permissions | `GET /permissions/roles`, `GET /permissions/options`, `PATCH /permissions/roles/:role` |

Interactive Swagger UI is available at `http://localhost:4000/api-docs`.

---

## 🤖 AI Service Endpoints

Base URL: `http://localhost:8000` — use header `X-API-Key: dev-key-change-me`

- `GET /health`
- `POST /predict/performance` — predict student grade from history
- `POST /predict/attendance-risk` — risk-level classification from attendance
- `POST /schedule/generate` — genetic-algorithm timetable optimization
- `POST /grade/auto` — NLP-based assignment auto-grading feedback
- `POST /recommend/generate` — personalized study recommendations
- `POST /detect/anomalies` — IQR outlier detection on scores
- `POST /chat/message` — conversational assistant (rule-based; optionally LLM via Jina)

Each endpoint returns `{ success, data, meta }` with confidence scores.

---

## 🛠️ Configuration

See [`.env.example`](./.env.example) for the full variable reference. Key ones:

| Variable | Purpose |
|----------|---------|
| `DATABASE_URL` | PostgreSQL connection string |
| `JWT_ACCESS_SECRET` / `JWT_REFRESH_SECRET` | Token signing keys (change in prod!) |
| `REDIS_URL` | Caching & permission caching (optional) |
| `GOOGLE_CLIENT_ID` / `GOOGLE_CLIENT_SECRET` | Google Calendar OAuth |
| `AI_SERVICE_URL` | Backend → AI service URL |
| `AI_API_KEY` | Shared key between backend and AI service |
| `NEXT_PUBLIC_API_URL` / `NEXT_PUBLIC_SOCKET_URL` | Frontend API & socket URLs |

---

## 🧰 Tech Stack

- **Frontend:** Next.js 14, React 18, Tailwind CSS, Radix UI, recharts, SWR, socket.io-client, Capacitor (Android)
- **Backend:** Node.js, Express, Prisma ORM, Socket.io, Google APIs, ioredis
- **AI:** Python 3.11, FastAPI, scikit-learn, pandas, numpy, TextBlob, jina
- **DevOps:** Docker Compose, GitHub Actions CI

---

## 📄 License

MIT — built for demonstration and educational purposes.

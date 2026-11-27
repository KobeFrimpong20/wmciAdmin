# Digital Binder (WMCI Admin)

A digital replacement for physical church membership binders, built for congregation directory management and new-member intake workflows.

---

## Tech Stack

### Backend (`backend/`)
- **Language:** Go 1.24
- **HTTP Framework:** Gin (`github.com/gin-gonic/gin`)
- **Database:** SQLite (`github.com/mattn/go-sqlite3`) in WAL mode with `PRAGMA foreign_keys = ON`
- **Testing:** Go `testing` + `httptest` + `testify`

### Frontend (`frontend/`)
- **Framework:** React 19 + TypeScript
- **Build Tool:** Vite 7
- **Styling:** Tailwind CSS v4 (`@tailwindcss/vite`)
- **Routing:** React Router DOM v7
- **Icons:** Lucide React
- **Design System:** "The Editorial Desk" (documented in `frontend/DESIGN.md`), featuring Lora / Work Sans / IBM Plex Mono typography, semantic design tokens, and automatic system dark mode (`@media (prefers-color-scheme: dark)`)

---

## Project Structure

```text
.
├── backend/
│   ├── .env.example                  # Required auth & DB environment variables
│   ├── cmd/api/main.go               # Server entrypoint (:8080), env validation, CORS setup
│   ├── internal/binder/
│   │   ├── schema.sql                # Embedded SQLite schema (members & applications)
│   │   ├── sqlite.go                 # DB initialization, WAL pragmas, schema apply
│   │   ├── models.go                 # Member, Application, and IntakeForm structs
│   │   ├── auth.go                   # Single-password admin login, HS256 JWT, RequireRole RBAC middleware
│   │   ├── auth_test.go              # Auth & RBAC enforcement tests (401/403/200)
│   │   ├── handlers.go               # REST handlers, normalization, idempotency checks
│   │   └── handlers_test.go          # API lifecycle, validation, idempotency, and ordering tests
│   └── go.mod
└── frontend/
    ├── DESIGN.md                     # Visual design system specification
    ├── index.html                    # Google Fonts (Lora, Work Sans, IBM Plex Mono)
    └── src/
        ├── api/
        │   ├── client.ts             # Fetch wrapper, Bearer JWT attachment, 401 handling
        │   ├── auth.ts               # Login & session verification API methods
        │   └── members.ts            # Members & applications API methods
        ├── context/
        │   ├── authContext.ts        # Auth context definition & useAuth hook
        │   └── AuthProvider.tsx      # AuthProvider (localStorage token + /auth/me check)
        ├── components/
        │   ├── Button.tsx            # Primary & secondary editorial button component
        │   ├── buttonStyles.ts       # Shared button class generator
        │   ├── PageShell.tsx         # Role-aware masthead navigation, layout container, footer
        │   ├── ProtectedRoute.tsx    # Admin route guard redirecting unauthenticated users to /
        │   └── MemberCard.tsx        # Directory card with actionable mailto:/tel: links
        ├── pages/
        │   ├── Home.tsx              # Split landing page (Left: Admin Sign In, Right: New Application)
        │   ├── Dashboard.tsx         # Admin-only tabbed Applications & Members directory
        │   ├── MemberDetail.tsx      # Admin-only member profile & linked application snapshots
        │   ├── ApplicationDetail.tsx # Admin-only read-only dossier view of an application snapshot
        │   └── IntakePage.tsx        # Public 4-step intake form with sessionStorage UUID idempotency
        └── types/
            └── member.ts             # TypeScript API models
```

---

## Key Features

### Multi-Step Membership Intake (`/intake`)
Collects applicant data across four validated steps:
1. **Personal Info** — First Name, Last Name, Phone Number (all required), Email, Residential Address
2. **Demographics** — Date of Birth (required, `YYYY-MM-DD`), Marital Status, Spouse Name (conditional), Number of Children
3. **Spiritual Background** — Born Again, Water Baptized, Speaks in Tongues, Previous Church
4. **Commitments** — Six membership commitment affirmations and Signature Date

### Two-Layer Duplicate Protection & Idempotency
To prevent duplicate member or application rows from double-clicks, flaky networks, retries, or page refreshes:

1. **Client-Side UUID (`sessionStorage`):**
   - `/intake` generates a client UUID stored in `sessionStorage` (`binder-intake-id`) and sends it as `id` in the `POST /applications` JSON payload.
   - `id` is required on the backend (missing or invalid UUID returns `400 Bad Request`; no server fallback).
   - Submitting an `id` that already exists in `applications` returns `409 Conflict`, and the frontend displays an **"This Application Was Already Received"** confirmation with a **Start New Application** button.
   - The key is cleared on `201` or `409` and rotated when starting a new application.

2. **Server-Side Normalization & Compound Key (`members`):**
   - `first_name` and `last_name` are trimmed, whitespace-collapsed, lowercased, ProperCased, and stored together as `full_name` in `"Last, First"` format (e.g., `"Mensah, Grace"`).
   - `phone` is normalized to digits only (e.g., `"(555) 234-5678"` -> `"5552345678"`).
   - `date_of_birth` is strictly validated as `YYYY-MM-DD`.
   - `members` enforces `UNIQUE(full_name, date_of_birth, phone)` (`COLLATE NOCASE` on `full_name`) with `NOT NULL` and non-empty `CHECK` constraints. Submitting a duplicate person with a different client UUID returns `409 Conflict` with full transaction rollback.

### Directory & Immutable Snapshots
- `GET /members` lists members ordered alphabetically by `full_name` (`"Last, First"`).
- Each submission creates both a `members` row and an immutable `applications` snapshot linked via `member_id` (`ON DELETE CASCADE`).
- Contact details render as clickable `mailto:` and `tel:` links across the directory and detail pages.

---

## API Reference

Base URL: `http://localhost:8080`

| Method | Endpoint | Access | Description | Status Codes |
|---|---|---|---|---|
| `POST` | `/login` | Public | Verify shared `ADMIN_PASSWORD` and issue an HS256 JWT (`role: "admin"`) | `200`, `400`, `401` |
| `POST` | `/applications` | Public | Create a member and immutable application snapshot (idempotent) | `201`, `400`, `409` |
| `GET` | `/auth/me` | Admin JWT | Verify active session and return `{ "role": "admin" }` | `200`, `401`, `403` |
| `GET` | `/members` | Admin JWT | List all members ordered by `full_name` (hydrated with `tags`) | `200`, `401`, `403` |
| `GET` | `/members/:id` | Admin JWT | Get a single member by UUID (hydrated with `tags`) | `200`, `401`, `403`, `404` |
| `PATCH` | `/members/:id/tags` | Admin JWT | Incrementally `add` / `remove` fixed member tags | `200`, `400`, `401`, `403`, `404` |
| `GET` | `/applications` | Admin JWT | List all applications (newest first); optional `?member_id=<uuid>` filter | `200`, `401`, `403` |
| `GET` | `/applications/:id` | Admin JWT | Get a single application snapshot by UUID | `200`, `401`, `403`, `404` |

### Example `POST /applications` Payload

```json
{
  "id": "550e8400-e29b-41d4-a716-446655440000",
  "first_name": "Grace",
  "last_name": "Mensah",
  "email": "grace.mensah@example.com",
  "phone": "(555) 234-5678",
  "address": "123 Main St, City, State",
  "date_of_birth": "1990-12-09",
  "marital_status": "single",
  "spouse_name": "",
  "num_children": 0,
  "born_again": true,
  "water_baptized": true,
  "speak_tongues": false,
  "prev_church": "First Grace",
  "attendance_commitment": true,
  "tithe_commitment": true,
  "prayer_commitment": true,
  "sober_commitment": true,
  "respect_commitment": true,
  "faith_commitment": true,
  "member_signature_date": "2026-11-24"
}
```

---

## Local Development

### Prerequisites
- Go 1.24+ (with CGo enabled for `go-sqlite3`)
- Node.js 20+ and npm

### 1. Run the Backend

Configure `backend/.env` (see `backend/.env.example`):
- `ADMIN_PASSWORD` (required) — shared administrator password for `POST /login`
- `JWT_SECRET` (required) — HS256 signing secret
- `JWT_TTL_HOURS` (optional, defaults to `24`)
- `DB_PATH` (optional, defaults to `binder.db` in `backend/`)

```bash
cd backend
go run ./cmd/api
```

- Starts on `http://localhost:8080`.
- Automatically initializes the SQLite schema in WAL mode on startup.

### 2. Run the Frontend

```bash
cd frontend
npm install
npm run dev
```

- Starts on `http://localhost:5173`.
- Optional environment variable: `VITE_API_URL` (defaults to `http://localhost:8080`).

### Frontend Routes
- `/` — Split landing page (Left: Admin Sign In, Right: Start New Application); redirects signed-in admins to `/dashboard`
- `/intake` — Public 4-step Membership Application form
- `/dashboard` — *(Admin only)* Congregation Binder (Applications & Members directory)
- `/members/:id` — *(Admin only)* Member profile and linked application snapshots
- `/applications/:id` — *(Admin only)* Immutable application snapshot dossier

---

## Testing & Verification

### Backend Tests
```bash
cd backend
go test -v ./...
```

### Frontend Lint & Production Build
```bash
cd frontend
npm run lint
npm run build
```

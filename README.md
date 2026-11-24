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
│   ├── cmd/api/main.go               # Server entrypoint (:8080) and CORS setup
│   ├── internal/binder/
│   │   ├── schema.sql                # Embedded SQLite schema (members & applications)
│   │   ├── sqlite.go                 # DB initialization, WAL pragmas, schema apply
│   │   ├── models.go                 # Member, Application, and IntakeForm structs
│   │   ├── handlers.go               # REST handlers, normalization, idempotency checks
│   │   └── handlers_test.go          # API lifecycle, validation, idempotency, and ordering tests
│   └── go.mod
└── frontend/
    ├── DESIGN.md                     # Visual design system specification
    ├── index.html                    # Google Fonts (Lora, Work Sans, IBM Plex Mono)
    └── src/
        ├── api/
        │   ├── client.ts             # Fetch wrapper + ApiError with HTTP status
        │   └── members.ts            # Members & applications API methods
        ├── components/
        │   ├── Button.tsx            # Primary & secondary editorial button component
        │   ├── buttonStyles.ts       # Shared button class generator
        │   ├── PageShell.tsx         # Masthead navigation, layout container, footer
        │   └── MemberCard.tsx        # Directory card with actionable mailto:/tel: links
        ├── pages/
        │   ├── Dashboard.tsx         # Tabbed Applications & Members directory with live filter
        │   ├── MemberDetail.tsx      # Member profile & linked application snapshots
        │   ├── ApplicationDetail.tsx # Read-only dossier view of an application snapshot
        │   └── IntakePage.tsx        # 4-step intake form with sessionStorage UUID idempotency
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

| Method | Endpoint | Description | Status Codes |
|---|---|---|---|
| `GET` | `/members` | List all members ordered by `full_name` | `200` |
| `GET` | `/members/:id` | Get a single member by UUID | `200`, `404` |
| `POST` | `/applications` | Create a member and immutable application snapshot | `201`, `400`, `409` |
| `GET` | `/applications` | List all applications (newest first); optional `?member_id=<uuid>` filter | `200` |
| `GET` | `/applications/:id` | Get a single application snapshot by UUID | `200`, `404` |

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

```bash
cd backend
go run ./cmd/api
```

- Starts on `http://localhost:8080`.
- Uses `DB_PATH` from `backend/.env` or environment variables (defaults to `binder.db` in `backend/`).
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
- `/` or `/dashboard` — Congregation Binder (Applications & Members directory)
- `/intake` — Public 4-step Membership Application form
- `/members/:id` — Member profile and linked application snapshots
- `/applications/:id` — Immutable application snapshot dossier

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

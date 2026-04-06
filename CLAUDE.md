# Project Brief: Church "Digital Binder" (TSS)

## 1. Project Overview
**Goal:** Create a "Digital Binder" for church Department Leads to manage members and process new membership applications.
**Core Philosophy:** A replacement for physical paper binders. Focus on "Roster Management" and "Intake Workflows."
**Constraints:**
* **No Finance/Transactions:** Scope is strictly membership data.
* **Role-Based Access:** Standard members (public) cannot log in. Only "Users" (Leads/Admins) can log in.

---

## 2. Technical Stack

### Backend 
* **Language:** Go (Golang)
* **Framework:** Gin Gonic
* **Database:** PostgreSQL
* **Auth:** JWT (JSON Web Tokens) with `bcrypt`
* **Architecture:** Clean Architecture (Handler -> Repository -> Database)
* **Base URL:** `http://localhost:8080`

### Frontend 
* **Build Tool:** Vite
* **Framework:** React
* **Styling:** Tailwind CSS
* **Routing:** React Router DOM
* **State Management:** React Context (for Auth) or TanStack Query (for API data)

---

## 3. Database Schema & Data Models

### A. Users (Authentication)
* **Role:** Strictly for Admins and Department Leads.
* **Schema:** `id`, `email`, `password_hash`, `role` ('admin', 'lead').

### B. Members (Core Entity)
* **Schema:** `id`, `first_name`, `last_name`, `email`, `phone`, `address`, `status` ('active', 'inactive'), `joined_at`.
* **Relationships:** A member can belong to multiple Departments.

### C. Departments (Groups)
* **Schema:** `id`, `name`.
* **Link Table:** `member_departments` (Many-to-Many).

### D. Applications (Intake Workflow)
* **Schema:** `id`, `member_id` (FK), `status` ('pending', 'approved'), `date_of_birth`, `marital_status`, `spiritual_history_fields...`, `member_signature_date`, `pastor_signature_date`.
* **Workflow:**
    1.  Public User submits form -> Writes to `members` AND `applications`.
    2.  Admin reviews -> Clicks Approve -> Updates `status` & sets `pastor_signature_date`.

---

## 4. Backend API Contract

### Authentication
* `POST /login` — **PUBLIC**
    * **Body:** `{ "email": "...", "password": "..." }`
    * **Response:** `{ "token": "eyJ...", "user": { "id": 1, "role": "admin" } }`
    * **Note:** Frontend stores `token` in LocalStorage and sends `Authorization: Bearer <token>` on all protected requests.

### Members (Protected — requires JWT)
* `GET /members` — Returns `[]Member`
* `GET /members/:id` — Returns `Member` (hydrated with `departments: []Department`)
* `GET /members/:id/application` — Returns `Application` for that member
* `PUT /members/:id/application` — Updates an existing application record
* `POST /members` — Body: `Member` (create single)
* `PUT /members/:id` — Body: `Member` (update profile)
* `DELETE /members/:id` — Hard deletes member and all associations
* `POST /members/import` — Bulk JSON import (processed concurrently)

### Departments (Protected)
* `GET /departments` — Returns `[]Department`
* `GET /members/departments/:id` — Returns `[]Member` filtered by department ID

### Applications (Workflow)
* `POST /applications` — **PROTECTED** — Submit a new intake application
* `PUT /applications/:id/approve` — **PUBLIC** — Approve an application, sets `pastor_signature_date`

### Users (Protected)
* `GET /users/:email` — Lookup a user account by email

### Debug (Development only)
* `GET /debug/hash/:password` — Returns bcrypt hash of a plaintext password

---

## 5. Frontend Structure (Current Implementation)

**Stack:** React + Vite + TypeScript, Tailwind CSS, React Router DOM, React Context for auth.

### Routes (`src/App.tsx`)
| Path | Component | Auth Required |
|---|---|---|
| `/` | `Home` (Login page) | No |
| `/dashboard` | `Dashboard` | Yes (`ProtectedRoute`) |
| `/members/:id` | `MemberDetail` | Yes (`ProtectedRoute`) |
| `/intake` | *(linked from Home, not yet routed)* | No |

### Pages
* **`Home.tsx`** — Login form. Calls `POST /login`, stores JWT via `AuthContext`, redirects to `/dashboard`. Has a link to `/intake` for non-admins.
* **`Dashboard.tsx`** — Fetches and displays all members as a grid of `MemberCard` components. Shows member count, logout button, loading/error states.
* **`MemberDetail.tsx`** — Full member profile page. Fetches member + application in parallel. Supports inline editing of member fields and full application data (demographics, spiritual context, commitments, signature dates). Saves via `PUT /members/:id` and `PUT /members/:id/application` in parallel.

### Components
* **`MemberCard.tsx`** — Card used in the Dashboard grid; links to `/members/:id`.
* **`ProtectedRoute.tsx`** — Outlet wrapper that redirects to `/` if unauthenticated.

### API Layer (`src/api/`)
* **`client.ts`** — Base `apiClient` fetch wrapper; attaches JWT from localStorage, handles `401` auto-redirect.
* **`auth.ts`** — `POST /login`.
* **`members.ts`** — `getAllMembers`, `getMemberById`, `getMemberApplication`, `updateMember`, `updateMemberApplication`.

### State Management
* **`AuthContext.tsx`** — Stores `user` + `token` in React Context; persists token to localStorage.

### UX Patterns Implemented
* Spinner loading states (`Loader2` icon, `animate-spin`)
* Inline error banners with `AlertCircle`
* Glassmorphism card styling (backdrop-blur, dark/light mode)
* Inline edit mode on `MemberDetail` (toggle between view and edit without a separate page)

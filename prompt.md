# Testing Prompts — Member Binder (TSS)

Reusable prompts for generating tests at each level. Paste the relevant prompt into Claude Code with the target file open.

---

## UNIT TESTS

### Backend — New Handler Test (Go)

```
Write a Go unit test for the `[HandlerName]` handler in `backend/internal/handlers/handlers.go`.

Follow the exact pattern used in `backend/internal/handlers/handlers_test.go`:
- Use `repository.NewMockDB()` for the repo, inject with `handlers.NewHandler(mockRepo, "secret")`
- Set `gin.SetMode(gin.TestMode)` and use `httptest.NewRecorder()`
- Test at minimum: happy path (valid input → expected status + response body), error path (set `mockRepo.ForceError = true` → expected error status)
- Use `github.com/stretchr/testify/assert` for assertions
- Unmarshal the response body and assert on specific fields, not just status code

Handler to test: `[HandlerName]`
Route: `[METHOD] [/path]`
Expected happy-path status: [e.g. 200, 201]
Expected error status: [e.g. 500, 404]
Key field to assert on response body: [e.g. response.ID == 67]
```

---

### Backend — New Repository Method Test (Go)

```
Write a Go unit test for the `[MethodName]` method in `backend/internal/repository/postgres.go`.

Use the mock implementation in `backend/internal/repository/mock_repo.go` as the baseline for what the method should return.
- Test the happy path: method returns the expected value with no error
- Test the error path: method returns a meaningful error when the DB call fails
- Do not use a real database; use the mock repo or table-driven tests with `database/sql` stubbing if needed

Method: `[MethodName]`
Signature: `[e.g. GetMemberByID(id int) (models.Member, error)]`
Expected return on success: [describe fixture data, e.g. Member with ID=67, FirstName="Dummy"]
```

---

### Frontend — React Component Test

```
Write a React Testing Library unit test for `frontend/src/[path/to/Component.tsx]`.

Setup requirements:
- Mock `frontend/src/api/members.ts` (or `auth.ts`) using `vi.mock()`
- Mock `react-router-dom` hooks (`useParams`, `useNavigate`, `useAuth`) as needed
- Render the component in isolation with `render(<Component />)`

Test cases to cover:
1. **Loading state** — assert the spinner / loading text is visible before the API resolves
2. **Success state** — mock the API to resolve with fixture data; assert key text/elements are rendered
3. **Error state** — mock the API to reject; assert the error message/banner is shown
4. **[Any interaction]** — e.g. clicking "Edit Details" toggles inputs into view

Component: `[ComponentName]`
API calls it makes: [e.g. membersApi.getMemberById, membersApi.getMemberApplication]
Key rendered text to assert: [e.g. member's first name, "No Intake Record Found"]
```

---

### Frontend — API Client Test

```
Write a Vitest unit test for `frontend/src/api/members.ts`.

- Mock the global `fetch` using `vi.fn()`
- For each function, test: correct URL is called, correct HTTP method is used, Authorization header is attached from localStorage, and the parsed response is returned
- Test the 401 path: mock fetch to return status 401, assert that `window.location` is redirected to `/`

Functions to test: [e.g. getAllMembers, getMemberById, updateMember]
```

---

## INTEGRATION TESTS

### Backend — Handler + Real Repository (Go)

```
Write a Go integration test for `[HandlerName]` that hits a real PostgreSQL database.

Setup:
- Load the `.env` file with `godotenv.Load()`
- Open a real `*sql.DB` connection using the `DB_DSN` env var
- Use `repository.NewPostgresDB(conn)` — do NOT use the mock
- Wrap each test in a transaction and call `tx.Rollback()` in `t.Cleanup()` so the DB is left clean

Test cases:
1. Seed the required row(s) directly via SQL, call the handler, assert the response matches the seeded data
2. Call the handler with an ID that does not exist, assert 404 or 500 as appropriate

Handler: `[HandlerName]`
Tables touched: [e.g. members, member_departments]
Seed SQL: [describe or paste the INSERT needed]
```

---

### Backend — Full Route Stack Test (Go)

```
Write a Go integration test that exercises the full Gin router stack including the JWT auth middleware.

Setup:
- Build the router exactly as in `backend/cmd/api/main.go` (CORS, middleware, all routes)
- Use `repository.NewMockDB()` to avoid a real DB
- For protected routes, generate a valid JWT signed with `"secret"` and attach it as `Authorization: Bearer <token>`

Test the following flow end-to-end:
1. `POST /login` → capture the token from the response
2. Use that token to call `[PROTECTED_ROUTE]` → assert correct status and body
3. Call the same protected route WITHOUT a token → assert 401

Protected route under test: `[METHOD /path]`
```

---

### Frontend — Page Integration Test (React Testing Library)

```
Write a React Testing Library integration test for `frontend/src/pages/[PageName].tsx`.

This test should render the full page (not just subcomponents) and drive it like a user would.

Setup:
- Wrap with `MemoryRouter` and `AuthProvider` (or mock `useAuth`)
- Mock only the API module (`vi.mock('../api/members')`), not internal components
- Use `userEvent` for interactions

Scenarios to cover:
1. Page loads → API is called → data renders in the DOM
2. User clicks [action, e.g. "Edit Details"] → input fields appear → user types → user clicks Save → `updateMember` is called with correct payload → success state shown
3. API returns an error → error banner is displayed

Page: `[PageName]`
Route params needed: [e.g. id = "67"]
Fixture data to mock: [describe the Member / Application shape to return]
```

---

## ACCEPTANCE TESTS

### Full Intake-to-Approval Workflow (Playwright)

```
Write a Playwright end-to-end test for the new member intake and admin approval workflow.

Preconditions:
- Backend is running at `http://localhost:8080`
- Frontend is running at `http://localhost:5173`
- A valid admin account exists: email `admin@tss.com`, password `password`

Steps:
1. Navigate to `/intake`
2. Fill out the full intake form:
   - Personal Info: first_name="E2E", last_name="Test", email="e2e@test.com", phone="0000000000", address="1 Test St"
   - Demographics: date_of_birth="1990-01-01", marital_status="Single"
   - Spiritual: check born_again, water_baptized
   - Commitments: check all six commitment checkboxes
   - Sign: fill member_signature_date with today's date
3. Submit the form — assert a success message appears
4. Navigate to `/` and log in as the admin
5. Navigate to the Applications Inbox — assert the new applicant "E2E Test" appears
6. Click "Approve" on that application — assert it disappears from the inbox
7. Navigate to the Member Directory — assert "E2E Test" appears with status "active"

Cleanup: DELETE the created member via the API after the test.
```

---

### Protected Route Access Control (Playwright)

```
Write Playwright tests that verify the authentication guard on protected routes.

Test cases:
1. **Unauthenticated access** — navigate directly to `/dashboard` without logging in; assert redirect to `/`
2. **Authenticated access** — log in as admin, navigate to `/dashboard`; assert the Member Directory heading is visible
3. **Token expiry** — manually set an expired JWT in localStorage, navigate to `/dashboard`; assert redirect to `/`
4. **Logout** — log in, click "Sign Out", attempt to navigate to `/dashboard`; assert redirect to `/`

Admin credentials: email=`admin@tss.com`, password=`password`
```

---

### Member CRUD Workflow (Playwright)

```
Write a Playwright end-to-end test covering the full member management lifecycle.

Preconditions: logged in as admin.

Steps:
1. **Create** — navigate to Dashboard, open the "Add Member" flow, fill in required fields, submit; assert the new member card appears in the directory
2. **Read** — click the new member's card; assert the MemberDetail page loads with correct name and status
3. **Update** — click "Edit Details", change the phone number, click "Save Details"; assert the updated phone is shown in view mode
4. **Delete** — navigate back to Dashboard, click "Delete" on the member card, confirm the dialog; assert the card is removed from the directory

Use a unique email like `playwright-crud-[timestamp]@test.com` to avoid collisions with real data.
```

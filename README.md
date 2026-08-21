# OpsPortal — Frontend

A responsive React SPA for the OpsPortal operations management platform. Supports admin and staff roles with real-time task updates, document vault, team management, analytics, and full authentication flows.

---

## Live App

**URL:** `https://opsportal-ten.vercel.app`

---

## Tech Stack

| Layer | Technology |
|---|---|
| Framework | React 19 (Vite) |
| Routing | React Router DOM v7 |
| UI / Styling | Bootstrap 5, inline styles |
| Icons | Lucide React |
| Charts | Recharts |
| Real-time | Native WebSocket API |
| HTTP | Native `fetch` with JWT refresh interceptor |
| Hosting | Vercel |

---

## Features

- JWT authentication with auto token refresh and persistent sessions
- Admin and staff role-based UI — different views, actions, and permissions per role
- Staff invite flow — email verification → profile completion form (name, email, password) → dashboard
- Forgot password → email link → reset password form
- Real-time task and activity updates via WebSocket (no page refresh needed)
- Kanban-style task board with multi-assignee support and stacked avatars
- Task attachments — upload files directly or attach existing vault documents
- Document vault with category filtering and per-staff assignment
- Team management — invite staff, view members, remove accounts
- Analytics page with charts and metrics
- Platform settings (admin only) — workspace config, environment stage, secret key rotation
- Dark mode across all pages
- Fully responsive — mobile, tablet, and desktop

---

## Project Structure

```
frontend/
├── public/
│   └── favicon.svg
└── src/
    ├── components/
    │   ├── Sidebar.jsx           # Collapsible nav sidebar (all pages)
    │   ├── ProtectedRoute.jsx    # Redirects unauthenticated users to /signin
    │   └── GuestRoute.jsx        # Redirects authenticated users away from auth pages
    ├── context/
    │   └── AuthContext.jsx       # Auth state, login, logout, loginWithTokens
    ├── pages/
    │   ├── SignInPage.jsx         # Email + password sign in
    │   ├── SignUpPage.jsx         # Admin company registration
    │   ├── VerifyEmailPage.jsx    # Email verification + staff profile completion form
    │   ├── ForgotPasswordPage.jsx # Request password reset email
    │   ├── ResetPasswordPage.jsx  # Set new password via reset link
    │   ├── OperationsDashboard.jsx # KPI cards, high priority queue, activity feed
    │   ├── TaskPage.jsx           # Kanban board, create/edit tasks, attachments
    │   ├── DocsPage.jsx           # Document vault, upload, assign to staff
    │   ├── TeamPage.jsx           # Team members list, invite staff, remove members
    │   ├── AnalyticsPage.jsx      # Charts and performance metrics
    │   └── SettingsPage.jsx       # Platform settings, change password
    └── services/
        └── api.js                 # All API calls, token management, WebSocket URL
```

---

## Routes

| Path | Component | Protected | Description |
|------|-----------|-----------|-------------|
| `/` | `SignInPage` | No | Redirects to sign in |
| `/signin` | `SignInPage` | No | Sign in form |
| `/signup` | `SignUpPage` | No | Admin company registration |
| `/verify-email` | `VerifyEmailPage` | No | Email verification + profile setup |
| `/forgot-password` | `ForgotPasswordPage` | No | Request password reset |
| `/reset-password` | `ResetPasswordPage` | No | Set new password via link |
| `/dashboard` | `OperationsDashboard` | Yes | Main dashboard |
| `/task` | `TaskPage` | Yes | Task board |
| `/documents` | `DocsPage` | Yes | Document vault |
| `/team` | `TeamPage` | Yes | Team management |
| `/analytics` | `AnalyticsPage` | Yes | Analytics |
| `/settings` | `SettingsPage` | Yes | Settings |

---

## Auth Flow

### Admin registration
`/signup` → fills company details → account created → sign in at `/signin`

### Staff invite
Admin invites staff from Team page → Brevo sends email with verification link → staff clicks link → `/verify-email` verifies token → **profile completion form** (full name, email, new password, confirm password) → on submit → auto-logged in → `/dashboard`

### Forgot password
`/signin` → "Forgot password?" → `/forgot-password` → enter email → reset link sent → click link in email → `/reset-password` → enter new password + confirm → success → redirect to `/signin`

---

## API Service (`src/services/api.js`)

All backend communication goes through `api.js`. It handles:

- **Token management** — reads/writes `accessToken` and `refreshToken` from `localStorage` / `sessionStorage`
- **Auto refresh** — on 401 response, automatically refreshes the access token and retries the request
- **WebSocket URL** — builds the WS URL with the access token as a query param

### Services exported

| Export | Methods |
|--------|---------|
| `authService` | `signIn`, `signUp`, `verifyEmail`, `resendVerification`, `forgotPassword`, `resetPassword`, `completeProfile`, `changePassword` |
| `tasksService` | `getAll`, `create`, `update`, `delete`, `requestCompletion`, `uploadAttachment`, `deleteAttachment` |
| `documentsService` | `getAll`, `create`, `delete` |
| `activityService` | `getAll`, `markAllRead` |
| `usersService` | `getAll`, `remove` |
| `settingsService` | `get`, `update`, `rotateSecret` |
| `getWebSocketUrl` | Returns `wss://...?token=<access_token>` |

---

## Real-time Updates

The dashboard and task board maintain a persistent WebSocket connection to the backend. Events received:

| Event | Effect |
|-------|--------|
| `task_created` | Adds new task to board (deduped by id) |
| `task_updated` | Updates existing task in place |
| `activity_created` | Prepends new activity to the feed |

The connection auto-reconnects every 3 seconds if dropped.

---

## Local Setup

### Prerequisites
- Node.js 18+

### Installation

```bash
git clone <repo-url>
cd frontend

npm install
```

### Environment Variables

Create a `.env` file in `frontend/`:

```env
VITE_API_BASE_URL=http://127.0.0.1:8000/api
```

If `VITE_API_BASE_URL` is not set, it defaults to the production Render URL.

### Run

```bash
npm run dev
```

App runs at `http://localhost:5173`

### Build

```bash
npm run build
```

---

## Deployment (Vercel)

- Framework preset: Vite
- Build command: `npm run build`
- Output directory: `dist`
- `vercel.json` rewrites all routes to `index.html` for client-side routing:

```json
{
  "rewrites": [{ "source": "/(.*)", "destination": "/index.html" }]
}
```

Set `VITE_API_BASE_URL` in Vercel environment variables to point to the production backend.

---

## License

MIT

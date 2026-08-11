# OpsPortal — Frontend

React + Vite client for OpsPortal, an internal ops/client portal with
role-based (staff/admin) task management, document storage, bookings,
invoicing, analytics, and live updates over WebSockets.

## Stack

- React 19 + Vite
- React Router v6
- Bootstrap 5 (utility classes + custom inline styling, no Bootstrap JS)
- Recharts (Analytics page charts)
- lucide-react (icons)

## Project layout

```
src/
  pages/
    OperationsDashboard.jsx   # KPIs, task queue, activity feed, real-time WS
    TaskPage.jsx               # Kanban board: create/edit/delete, priority, request-completion
    DocsPage.jsx                # document upload/browse (Cloudinary-backed)
    AnalyticsPage.jsx           # usage metrics, trend chart, CSV export
    SettingsPage.jsx            # platform settings (admin-editable, read-only for staff)
    TeamPage.jsx
    SignInPage.jsx / SignUpPage.jsx
  components/
    Sidebar.jsx                 # nav + dark mode toggle, collapsible
    ProtectedRoute.jsx          # redirects unauthenticated users to /signin
    GuestRoute.jsx               # redirects authenticated users away from sign-in/up
  context/
    AuthContext.jsx              # current user, sign in/out, token state
  services/
    api.js                       # all backend calls — see below
```

## API layer (`src/services/api.js`)

Every backend call goes through `customFetch`, which:
- attaches the JWT access token from `localStorage`/`sessionStorage`
- on a 401, silently refreshes the token once and retries; if refresh fails,
  clears tokens and redirects to `/signin`

Exported services: `authService`, `tasksService`, `documentsService`,
`activityService`, `usersService`, `settingsService`. Each method throws an
`Error` with a message from the API's `detail` field on failure — pages catch
these and show them inline rather than letting them bubble to a blank screen.

`getWebSocketUrl()` builds the WebSocket URL (token passed as a query param,
since browsers can't set custom headers on a WS handshake) — used by
`OperationsDashboard` and `TaskPage` for real-time task/activity updates.

## Role-based UI

`AuthContext`'s `user.role` (`staff` or `admin`) drives what's editable, not
just what's visible — the backend enforces the same rules server-side, so a
staff user hitting a disabled control isn't a security boundary, it's just
UX:
- Staff see only tasks/documents assigned to or created by them.
- Only admins can create/edit/delete tasks, and only admins can save changes
  on the Settings page (staff get a read-only view with a banner).
- Staff flag a task done via "Request completion"; only an admin can mark it
  actually complete.

## Environment variables

| Variable | Default | Notes |
|---|---|---|
| `VITE_API_BASE_URL` | `https://opsportal-backend-n1jf.onrender.com/api` | REST API base; the WS URL is derived from this (swaps `http`→`ws`, strips `/api`) |

Create a `.env` (or `.env.local`) in the project root:

```
VITE_API_BASE_URL=https://opsportal-backend-n1jf.onrender.com/api
```

## Local setup

```bash
npm install
npm run dev        # http://localhost:5173
```

```bash
npm run build       # production build to dist/
npm run lint         # eslint
npm run preview       # serve the production build locally
```

## Notes for future work

- `npm run build` currently warns about a >500kB main chunk — worth revisiting
  with route-based `import()` code-splitting if load time becomes a concern.
- Several pages (`OperationsDashboard`, `TaskPage`) each maintain their own
  WebSocket connection independently; if more pages need real-time data,
  consider lifting the connection into a shared context instead of
  duplicating the connect/reconnect logic per page.
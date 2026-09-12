# The-Verity — Claude Code Project Context

This file is read automatically by Claude Code on every session. Keep it up to date as the project evolves.

---

## 1. Project Overview

**The-Verity** is a full-stack Learning Management System (LMS) with three user roles:
- **Admin** — manages users, approves instructors, oversees classrooms
- **Teacher (Instructor)** — creates classrooms, posts assignments, grades students
- **Student** — joins classrooms, submits work, views grades

The app runs as an Electron desktop app and can also be served as a standard web app via Vite.

---

## 2. Tech Stack

| Layer | Technology |
|---|---|
| Frontend | React 18, JSX |
| Styling | Tailwind CSS (utility classes in JSX) + `src/index.css` for global tokens |
| Animations | `framer-motion` — preserve all `motion.*` and `AnimatePresence` usage |
| Icons | `lucide-react` |
| Backend | Node.js / Express (in `server/`) |
| Desktop shell | Electron (entry: `electron/`, preload: `preload.js`) |
| Build tool | Vite |
| API base | `import.meta.env.VITE_API_URL` — falls back to `http://localhost:3001` |

---

## 3. File & Path Rules

- **Always use forward slashes** (`/`) in all file paths and imports, even on Windows.
- Import aliases: use relative paths (e.g. `../components/Foo`). There are no configured `@` aliases.
- Source lives in `src/`. Never write runtime code outside `src/`, `server/`, or `electron/`.

---

## 4. Project Structure

```
src/
  pages/
    AdminDashboard.jsx      ← Multi-tab admin SPA (>1500 lines — prime refactor candidate)
    TeacherDashboard.jsx    ← Teacher home
    StudentDashboard.jsx    ← Student home
    Login.jsx / Register.jsx
    ClassroomView.jsx / ClassroomSettings.jsx
    TeacherClasswork.jsx / TeacherGrading.jsx / TeacherView.jsx
    StudentView.jsx / StudentCalendar.jsx / TeacherCalendar.jsx
    SettingsPanel.jsx / ProfileMenu.jsx / NotFound.jsx
  components/
    PendingInstructorApproval.jsx   ← Standalone approval-queue card
    UITransitionsShowcase.jsx
    MicroInteractionsShowcase.jsx
    FilterChip.jsx
    ProtectedRoute.jsx
  App.jsx       ← Top-level router
  index.css     ← Global Neumorphism design tokens
server/         ← Express API
electron/       ← Electron main process
```

---

## 5. Architecture Principles

- **Modular, never monolithic.** Pages above ~200 lines should extract sub-sections into components.
- **Layout pattern** — persistent shell (sidebar/header) lives in a Layout component; sub-views are injected via tab state or React Router.
- **AdminDashboard.jsx** currently manages 4+ tabs with inline `const sh = { ... }` style objects. New sections should be extracted to their own components and imported.
- **Data flow chain** for any new feature: `DB Schema → Backend Route → Frontend API call → UI (empty state + populated state)`.

---

## 6. Design System — Neumorphism (Soft UI)

The global background color is `#e0e5ec`. All UI elements must match this background and use dual `box-shadow` to create depth — **no hard borders for structural elements**.

### Neumorphic Shadow Tokens (from `src/index.css`)
```css
--neu-bg:       #e0e5ec;
--neu-raised:   6px 6px 12px #a3aebb, -6px -6px 12px #ffffff;   /* cards, buttons */
--neu-inset:    inset 4px 4px 8px #a3aebb, inset -4px -4px 8px #ffffff; /* inputs, active states */
--neu-subtle:   3px 3px 6px #a3aebb, -3px -3px 6px #ffffff;     /* small elements */
```

### Flex Layout Rules (CRITICAL — prevents overlapping list items)
Every list-item row **must** follow this pattern:

```jsx
{/* Parent Row */}
<div className="flex w-full items-center justify-between p-4 border-b last:border-0">

  {/* Left: Avatar + Text — flex-1 min-w-0 allows truncation */}
  <div className="flex items-center gap-3 overflow-hidden">
    <div className="flex-shrink-0">{/* Avatar */}</div>
    <div className="flex flex-col min-w-0">
      <span className="truncate font-medium">{item.name}</span>
      <span className="truncate text-sm text-gray-500">{item.email}</span>
    </div>
  </div>

  {/* Right: Actions — flex-shrink-0 ml-4 keeps buttons visible */}
  <div className="flex items-center gap-2 flex-shrink-0 ml-4">
    {/* Buttons here */}
  </div>

</div>
```

**Rules:**
- `overflow-hidden` on the left group enables `truncate` to work on children.
- `flex-shrink-0` on the right group keeps action buttons from being squeezed out.
- `ml-4` on the right group provides minimum spacing from text.
- **Never** use `position: absolute` for action buttons inside list rows.

### Typography
- Font: `Inter` (loaded via Google Fonts in `index.html`)
- Scale: `text-sm` (0.875rem) for body, `text-xs` for metadata, `text-base`/`text-lg` for headings

### Button Styles
| Variant | Classes |
|---|---|
| Primary (Blue) | `rounded-full bg-blue-600 text-white px-5 py-2 font-semibold shadow-md hover:bg-blue-700` |
| Approve (outline) | `rounded-full border border-green-500 text-green-600 bg-transparent px-3 py-1 text-sm font-semibold hover:bg-green-50` |
| Reject (outline) | `rounded-full border border-red-400 text-red-500 bg-transparent px-3 py-1 text-sm font-semibold hover:bg-red-50` |
| Ghost | `rounded-full bg-transparent text-slate-600 px-3 py-1 text-sm font-semibold hover:bg-slate-100` |

---

## 7. Styling Approach

The project uses **Tailwind CSS utility classes** directly in JSX. Inline `style={{ }}` objects exist in legacy sections (especially the `const sh = { ... }` block in `AdminDashboard.jsx`) but should be migrated to Tailwind classes in new or refactored code.

**Do not mix** Tailwind and inline styles on the same element unless necessary for dynamic values.

---

## 8. Key Components to Know

### `PendingInstructorApproval.jsx`
- Fetches pending teachers from the API.
- Calls `onUpdateUser(email, { status: 'Active' })` to approve.
- Calls `onActionLogged(action)` to push to the audit log in `AdminDashboard`.
- List items **must** use the strict flex row pattern from §6 above.

### `AdminDashboard.jsx` — Tab Map
| Tab index | Component / Section |
|---|---|
| 0 | `DashboardOverview` — stats, user table, diagnostic modal |
| 1 | `UserManagementTab` — CRUD table, bulk actions, `PendingInstructorApproval`, action history log |
| 2 | `GlobalClassesTab` — classroom directory |
| 3 | Security / Settings tab |

### `App.jsx`
- Manages top-level auth state (`user` object with `role`).
- Routes: `/` → role-based redirect, `/admin`, `/teacher`, `/student`, `/login`, `/register`.

---

## 9. API Conventions

```js
const API = import.meta.env.VITE_API_URL || 'http://localhost:3001';

// Pattern for all fetches:
const res = await fetch(`${API}/endpoint`, {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify(payload),
});
const data = await res.json();
if (!res.ok) { /* handle error via data.message */ }
```

---

## 10. Workflow Rules

1. **Rewrite over patch** — if a JSX diff is complex or risky, rewrite the full component/block.
2. **Preserve animations** — never remove `motion.*` wrappers or `AnimatePresence` groups.
3. **No absolute positioning for inline elements** — action buttons must flow naturally in flex rows.
4. **Text truncation is mandatory** for emails and long strings in list rows.
5. **Component size limit** — suggest extraction when a file exceeds 200 lines.
6. **Empty + populated states** — always implement both; never leave a list that can only render one state.
7. **Run `npm run dev`** is already running on port 5173. No need to restart unless config files change.

---

## 11. Environment

- Dev server: `npm run dev` → http://localhost:5173
- API server: runs on port 3001 (started separately or via Electron)
- Node: check `package.json` for exact version requirements
- Windows environment — use PowerShell-compatible commands; use `/` for all JS/JSX paths

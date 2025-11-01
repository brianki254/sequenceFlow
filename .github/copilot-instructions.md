# Copilot Instructions for sequenceFlow

## Project Overview
- Framework: React (functional components, hooks) with Vite for fast development/build.
- UI: Custom CSS in `src/index.css` (no Tailwind). Use the provided utility classes and CSS variables. Inline styles are acceptable for one-off layout tweaks.
- Pages: Three main pages: Task Scheduler, Clock, Calendar. Navigation is managed via local React state in `App.jsx`.
- Icons: Uses `lucide-react` for icons.

## File Structure
- `src/App.jsx`: Main entry, handles navigation and layout.
- `src/components/Button.jsx`: Custom button component with variants (`default`, `ghost`, `outline`, `danger`).
- `src/pages/TaskSchedulerPage.jsx`: Task CRUD, local state only, no backend.
- `src/pages/ClockPage.jsx`: Live clock, local time, timezone display.
- `src/pages/CalendarPage.jsx`: Monthly calendar, highlights today, local state only.

## Developer Workflows
- Start Dev Server: `npm run dev` (Vite HMR)
- Build: `npm run build`
- Preview Build: `npm run preview`
- Lint: `npm run lint` (uses ESLint, config in `eslint.config.js`)

## Patterns & Conventions
- State: All state is local to components; no global state management.
- Navigation: Controlled by `activePage` state in `App.jsx`.
- Styling: Use classes and variables from `src/index.css`:
	- Buttons: `.btn`, `.btn-outline`, `.nav-btn`
	- Surfaces: `.card`, `.shadow-sm`, `.shadow-md`
	- Layout: `.container`, `.flex`, `.grid`, helper gaps like `.gap-2`
	- Sticky nav: `.sticky-nav`
	- Gantt: `.gantt`, `.gantt-header`, `.gantt-rows`, `.gantt-row`, `.gantt-bar`, `.gantt-group-header`
- No TypeScript: JavaScript-only project.
- No API/Backend: All data is in-memory; no persistence or external API calls.
- No Routing Library: Navigation is manual, not via React Router.

## Integration Points
- External: Only `lucide-react` for icons, no other major integrations.
- Build Tools: Vite for dev/build, ESLint for linting.

## Examples
- Add a new page: create `src/pages/MyPage.jsx`, import it in `App.jsx`, and add a nav button. Follow existing layout and `card`/`btn` patterns.
- Add a new button variant: extend styles in `src/index.css` or map a new variant in `src/components/Button.jsx`.
- Gantt additions: prefer extending existing classes (`.gantt-*`) and computed layout in `TaskSchedulerPage.jsx`.

## Key Files
- `src/App.jsx`, `src/components/Button.jsx`, `src/pages/*`
- `src/index.css` (theme variables, utilities, Gantt styles)
- `package.json` (scripts, dependencies)
- `eslint.config.js` (lint rules)

---
**For AI agents:**
- Follow the local state and manual navigation pattern.
- Use `src/index.css` utilities and variables for styling; avoid Tailwind.
- Keep the navigation sticky by default (`.sticky-nav`) and maintain the minimal gradient aesthetic.
- The Task Scheduler supports:
	- Continuous tasks (start datetime + duration in minutes/hours/days)
	- Daily time windows across multiple days (e.g., 14:00–16:00 for 3 days)
	- Dependency enforcement (cannot complete until dependencies are done)
	- Gantt chart with hour-based scaling and optional group headers
- Do not introduce routing, global state, or backend logic unless explicitly requested.
- Keep new components and pages consistent with existing structure and style.

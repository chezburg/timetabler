# Drafting Table — Class Schedule Planner

An interactive scheduling tool for planning course timetables from a registrar-style
spreadsheet export. Upload a `.xlsx`/`.csv`, add courses, drag section options onto a
weekly calendar, and it auto-picks any component that only has one possible section
while flagging real time conflicts as you build the plan.

## Features

- **Spreadsheet import** — parses `Course Name`, `Component`, `Section`, `Class Nbr`,
  `Instructor`, `Requisites`, `Days/Times/Location`, `Credit Units`, `Status`,
  `Waitlist`, `Campus`, and `Delivery Type` columns (header matching is fuzzy, so minor
  naming/spacing differences are fine). Handles multiple meeting patterns in one cell
  (e.g. `Tu | 1:30 PM - 3:30 PM | MC-110; Th | 1:30 PM - 2:30 PM | MC-110`) and TBA/blank
  times.
- **Drag-and-drop scheduling** — drag a section chip from the sidebar onto the calendar
  to schedule it (or just click it — both work). Dragging a new option onto an
  already-scheduled component swaps it.
- **Auto-populate single choice** — if a course component (e.g. a TUT) only has one
  section available, it's selected automatically the moment you add the course.
- **Automatic color coding** — every course gets a consistent color across its sidebar
  chips and calendar blocks.
- **Conflict detection** — overlapping time slots are outlined and hatched in red on
  the calendar, listed in a banner above it, and previewed live (green/red ghost
  blocks) while you're dragging a chip around, before you drop it.
- **Saved plans** — multiple named schedules per uploaded catalog, persisted in
  SQLite so they survive a restart.

Rate My Professor integration was intentionally left out — there's no official public
API for it, so a reliable version would mean depending on an unofficial/community
scraper likely to break without notice. Everything else above works standalone.

## Project structure

```
class-scheduler/
├── docker-compose.yml
├── backend/            Express API + SQLite storage + spreadsheet parser
└── frontend/            React (Vite) app served via Nginx in production
```

## Running it (Docker Compose)

```bash
docker compose up --build
```

Then open **http://localhost:8080**. The frontend container proxies `/api` requests
to the backend container internally, so nothing else needs configuring.

Data (uploaded catalogs and saved schedules) is stored in a Docker named volume
(`scheduler-data`) mounted at `/app/data` in the backend container, so it survives
`docker compose down` / restarts. To wipe everything and start fresh:

```bash
docker compose down -v
```

To change the port the app is served on, edit the `ports` mapping under `frontend`
in `docker-compose.yml` (the left-hand number, e.g. `"8080:80"` → `"3000:80"`).

## Running it locally without Docker (development)

Requires **Node.js 22.5+** (the backend uses Node's built-in `node:sqlite`, so no
native module compilation is needed — just a recent enough Node).

```bash
# Terminal 1
cd backend
npm install
npm run dev        # http://localhost:4000

# Terminal 2
cd frontend
npm install
npm run dev         # http://localhost:5173, proxies /api to :4000
```

## Spreadsheet format notes

The parser expects one row per section (so a course with a lecture and 3 possible
tutorial sections is 4 rows, all sharing the same `Course Name`). Day codes in the
`Days/Times/Location` column are tokenized generously — both `MWF`/`TuTh` and
`M T W R F` style conventions are recognized. If your file's headers don't match
closely enough, the upload will fail with a message telling you so rather than
silently importing garbage.

## Known limitations

- No user accounts/authentication — this is meant for a single person (or a small
  trusted group) running their own instance, not a public multi-tenant deployment.
- `node:sqlite` is still an experimental Node API. It's been reliable in testing here,
  but if you'd rather use a more battle-tested driver, swapping in `better-sqlite3` is
  a small, contained change (it only touches `backend/src/db.js`).
- The credit-unit total shown in the sidebar is a best-effort estimate (it takes the
  largest credit-unit value found across a course's sections), since registrar exports
  often only populate that field on one component row.

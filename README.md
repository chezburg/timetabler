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
- **Two always-visible calendars** — a Fall Term and a Winter Term calendar sit
  side by side at all times, even before you've uploaded anything.
- **Fall/Winter course matching** — courses that share a base code but differ only
  by their trailing letter (e.g. `NMM 2270A` vs `NMM 2270B`, `WRITING 2130F` vs
  `WRITING 2130G`) are treated as **one requirement** offered in two terms, not two
  separate courses. Adding either variant satisfies the requirement and hides both
  from the course pool; a "Switch to Winter/Fall instead" button lets you swap which
  one you've picked. Term is inferred from the alphabetical order of the letters
  (earlier = Fall, e.g. A/F before B/G) — including for courses that only appear
  once in your file, by learning the letter's meaning from other paired courses
  in the same catalog. This is a heuristic, not a guarantee — see Known limitations.
- **Drag-and-drop scheduling** — drag a section chip from the sidebar onto the
  matching term's calendar to schedule it (or just click it — both work). A chip
  only reacts to whichever calendar matches its term. Dragging a new option onto
  an already-scheduled component swaps it.
- **Auto-populate single choice** — if a course component (e.g. a TUT) only has one
  section available, it's selected automatically the moment you add the course.
- **Automatic color coding** — every course gets a consistent color across its sidebar
  chips and calendar blocks.
- **Conflict detection** — overlapping time slots are outlined and hatched in red on
  the calendar, listed in a banner above it, and previewed live (green/red ghost
  blocks) while you're dragging a chip around, before you drop it. Conflicts are
  checked separately per term.
- **Requisites detection** — the messy "Requisites and Constraints" column is parsed
  into distinct badges on each section chip: **Restricted**, **Prereq**, **Coreq**,
  **Antireq**, **Cross-listed**, and **Overflow** (sections that only open once
  regular sections fill up), each with a "Show details" toggle for the exact text.
- **Online course detection** — sections with a Distance Studies/Online delivery
  type get an **Online** badge.
- **Full vs. Overflow** — currently-full sections get a **Full** badge; overflow
  sections (opened only once everything else is full) get a separate **Overflow**
  badge — a section can be both at once.
- **Optional stream/program input** — type your engineering stream (or program) once
  in the sidebar and section chips with a restriction get a rough "matches" /
  "likely excludes you" / "unclear" hint based on the restriction text. This is a
  best-effort text match, not a guarantee — the exact restriction text is always
  shown alongside it.
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

Then open **http://localhost:2982**. The frontend container proxies `/api` requests
to the backend container internally, so nothing else needs configuring.

Data (uploaded catalogs and saved schedules) is stored in a Docker named volume
(`scheduler-data`) mounted at `/app/data` in the backend container, so it survives
`docker compose down` / restarts. To wipe everything and start fresh:

```bash
docker compose down -v
```

To change the port the app is served on, edit the `ports` mapping under `frontend`
in `docker-compose.yml` (the left-hand number, e.g. `"8080:80"` → `"3000:80"`).

### Running as a specific user (PUID/PGID)

The backend container supports the common `PUID`/`PGID` pattern: at startup it remaps
its internal `app` user to the UID/GID you provide (default `1000:1000`) and `chown`s
its data directory before dropping root and starting Node. This matters most if you
switch the `scheduler-data` volume to a bind mount (see the commented-out line in
`docker-compose.yml`) so the SQLite file on your host is owned by you, not some
arbitrary container UID.

```bash
cp .env.example .env
# edit .env — find your own IDs with `id -u` and `id -g`
docker compose up --build
```

Compose reads `.env` automatically, so no extra flags are needed. If you don't set
`PUID`/`PGID` at all, it just defaults to `1000:1000`.

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
- **Fall/Winter inference is a heuristic.** It assumes the trailing letter on a
  course code determines its term, and that alphabetically-earlier letters mean
  Fall. It cross-checks letters against every paired course in your file (e.g. if
  `NMM 2270A/B` establishes that "B" means Winter, a lone `ECE 2231B` gets read as
  Winter too), but a letter that never appears in a confirmed pair anywhere in your
  file falls back to a plain guess. It also can't detect the case explicitly
  mentioned as tricky — two different letters that are actually the *same* term,
  just different slots. If it guesses wrong, click the small "fix" button next to
  a course's term tag in the sidebar to flip it — this is a frontend-only
  preference, though, so it resets on page reload.
- **The stream/restriction match hint is a rough text comparison**, not a real
  eligibility check — always read the actual restriction text shown alongside it.
- **The Fall/Winter mutual-exclusion (picking one variant hides the other) is
  enforced in the UI only**, not the API — someone scripting direct API calls
  against their own instance could still add both. Fine for personal use, worth
  knowing if you ever expose this beyond yourself.
- `node:sqlite` is still an experimental Node API. It's been reliable in testing here,
  but if you'd rather use a more battle-tested driver, swapping in `better-sqlite3` is
  a small, contained change (it only touches `backend/src/db.js`).
- The credit-unit total shown in the sidebar is a best-effort estimate (it takes the
  largest credit-unit value found across a course's sections), since registrar exports
  often only populate that field on one component row.

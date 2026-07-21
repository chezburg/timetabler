import { DatabaseSync } from 'node:sqlite';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const DATA_DIR = process.env.DATA_DIR || path.join(__dirname, '..', 'data');
fs.mkdirSync(DATA_DIR, { recursive: true });
const DB_PATH = path.join(DATA_DIR, 'scheduler.db');

export const db = new DatabaseSync(DB_PATH);

// Pragmas for a small single-file app: WAL improves concurrent read/write safety.
db.exec('PRAGMA journal_mode = WAL;');
db.exec('PRAGMA foreign_keys = ON;');

db.exec(`
CREATE TABLE IF NOT EXISTS catalogs (
  id TEXT PRIMARY KEY,
  filename TEXT NOT NULL,
  label TEXT NOT NULL,
  uploaded_at TEXT NOT NULL,
  row_count INTEGER NOT NULL DEFAULT 0
);

CREATE TABLE IF NOT EXISTS courses (
  id TEXT PRIMARY KEY,
  catalog_id TEXT NOT NULL REFERENCES catalogs(id) ON DELETE CASCADE,
  code TEXT NOT NULL,
  title TEXT NOT NULL,
  full_name TEXT NOT NULL
);

CREATE TABLE IF NOT EXISTS sections (
  id TEXT PRIMARY KEY,
  course_id TEXT NOT NULL REFERENCES courses(id) ON DELETE CASCADE,
  component TEXT NOT NULL,
  section_number TEXT,
  class_nbr TEXT,
  instructor TEXT,
  requisites TEXT,
  credit_units TEXT,
  status TEXT,
  waitlist TEXT,
  campus TEXT,
  delivery_type TEXT
);

CREATE TABLE IF NOT EXISTS meetings (
  id TEXT PRIMARY KEY,
  section_id TEXT NOT NULL REFERENCES sections(id) ON DELETE CASCADE,
  day TEXT,
  start_minutes INTEGER,
  end_minutes INTEGER,
  start_label TEXT,
  end_label TEXT,
  location TEXT,
  is_tba INTEGER NOT NULL DEFAULT 0
);

CREATE TABLE IF NOT EXISTS schedules (
  id TEXT PRIMARY KEY,
  catalog_id TEXT NOT NULL REFERENCES catalogs(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  created_at TEXT NOT NULL,
  updated_at TEXT NOT NULL
);

CREATE TABLE IF NOT EXISTS schedule_courses (
  schedule_id TEXT NOT NULL REFERENCES schedules(id) ON DELETE CASCADE,
  course_id TEXT NOT NULL REFERENCES courses(id) ON DELETE CASCADE,
  color TEXT NOT NULL,
  PRIMARY KEY (schedule_id, course_id)
);

CREATE TABLE IF NOT EXISTS schedule_selections (
  schedule_id TEXT NOT NULL REFERENCES schedules(id) ON DELETE CASCADE,
  course_id TEXT NOT NULL REFERENCES courses(id) ON DELETE CASCADE,
  component TEXT NOT NULL,
  section_id TEXT REFERENCES sections(id) ON DELETE CASCADE,
  PRIMARY KEY (schedule_id, course_id, component)
);

CREATE INDEX IF NOT EXISTS idx_courses_catalog ON courses(catalog_id);
CREATE INDEX IF NOT EXISTS idx_sections_course ON sections(course_id);
CREATE INDEX IF NOT EXISTS idx_meetings_section ON meetings(section_id);
CREATE INDEX IF NOT EXISTS idx_schedules_catalog ON schedules(catalog_id);
`);

export default db;

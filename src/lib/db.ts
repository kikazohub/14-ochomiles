import Database from "better-sqlite3";
import fs from "node:fs";
import path from "node:path";

const dataDir = path.join(process.cwd(), "data");
if (!fs.existsSync(dataDir)) fs.mkdirSync(dataDir, { recursive: true });

export const db = new Database(path.join(dataDir, "ochomiles.db"));
db.pragma("busy_timeout = 8000");
db.pragma("foreign_keys = ON");

db.exec(`
CREATE TABLE IF NOT EXISTS users (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  username TEXT UNIQUE NOT NULL,
  password_hash TEXT NOT NULL,
  language TEXT NOT NULL DEFAULT 'es',
  avatar_gender TEXT NOT NULL DEFAULT 'male',
  avatar_name TEXT NOT NULL DEFAULT 'Alpinista',
  created_at TEXT NOT NULL DEFAULT (datetime('now'))
);

CREATE TABLE IF NOT EXISTS progress (
  user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  mountain_id INTEGER NOT NULL,
  camp INTEGER NOT NULL DEFAULT 0,
  run_seed TEXT NOT NULL DEFAULT '',
  pending INTEGER NOT NULL DEFAULT 0,
  status TEXT NOT NULL DEFAULT 'in_progress',
  summited_at TEXT,
  PRIMARY KEY (user_id, mountain_id)
);

CREATE TABLE IF NOT EXISTS inventory (
  user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  item TEXT NOT NULL,
  qty INTEGER NOT NULL DEFAULT 0,
  PRIMARY KEY (user_id, item)
);

CREATE TABLE IF NOT EXISTS equipped (
  user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  item TEXT NOT NULL,
  PRIMARY KEY (user_id, item)
);

CREATE TABLE IF NOT EXISTS wiki_unlocks (
  user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  mountain_id INTEGER NOT NULL,
  section TEXT NOT NULL,
  unlocked_at TEXT NOT NULL DEFAULT (datetime('now')),
  PRIMARY KEY (user_id, mountain_id, section)
);

CREATE TABLE IF NOT EXISTS seen_funfacts (
  user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  fact_id INTEGER NOT NULL,
  PRIMARY KEY (user_id, fact_id)
);

CREATE INDEX IF NOT EXISTS idx_progress_user ON progress(user_id);
CREATE INDEX IF NOT EXISTS idx_inventory_user ON inventory(user_id);
`);

export interface UserRow {
  id: number;
  username: string;
  password_hash: string;
  language: string;
  avatar_gender: string;
  avatar_name: string;
  created_at: string;
}

export interface ProgressRow {
  user_id: number;
  mountain_id: number;
  camp: number;
  run_seed: string;
  status: string;
  summited_at: string | null;
}

export type Language = "es" | "en";

export function getLang(userId: number): Language {
  const row = db.prepare("SELECT language FROM users WHERE id = ?").get(userId) as
    | { language: string }
    | undefined;
  return row?.language === "en" ? "en" : "es";
}
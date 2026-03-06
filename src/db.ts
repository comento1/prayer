import Database from "better-sqlite3";
import path from "path";
import fs from "fs";

const dbPath = path.resolve(process.cwd(), "prayers.db");
console.log("Initializing database at:", dbPath);
const db = new Database(dbPath);

db.pragma("journal_mode = WAL");
db.pragma("foreign_keys = ON");

// Initialize tables
db.exec(`
  CREATE TABLE IF NOT EXISTS users (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    nickname TEXT NOT NULL UNIQUE,
    pin TEXT NOT NULL,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP
  );

  CREATE TABLE IF NOT EXISTS groups (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    name TEXT NOT NULL UNIQUE
  );

  CREATE TABLE IF NOT EXISTS user_groups (
    user_id INTEGER,
    group_id INTEGER,
    PRIMARY KEY (user_id, group_id),
    FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
    FOREIGN KEY (group_id) REFERENCES groups(id) ON DELETE CASCADE
  );

  CREATE TABLE IF NOT EXISTS prayer_requests (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    user_id INTEGER NOT NULL,
    group_id INTEGER,
    content TEXT NOT NULL,
    original_content TEXT,
    is_answered BOOLEAN DEFAULT 0,
    answered_note TEXT,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
    FOREIGN KEY (group_id) REFERENCES groups(id) ON DELETE SET NULL
  );

  CREATE TABLE IF NOT EXISTS prayer_interactions (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    prayer_request_id INTEGER NOT NULL,
    user_id INTEGER NOT NULL,
    type TEXT NOT NULL, -- 'PRAYING' or 'COMMENT'
    content TEXT,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (prayer_request_id) REFERENCES prayer_requests(id) ON DELETE CASCADE,
    FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
  );
`);

// Migration: add answered_note if missing (existing DBs)
try {
  const cols = db.prepare("PRAGMA table_info(prayer_requests)").all() as { name: string }[];
  if (!cols.some((c) => c.name === "answered_note")) {
    db.exec("ALTER TABLE prayer_requests ADD COLUMN answered_note TEXT");
  }
} catch (_) {}

// Seed default groups if empty
const groupCount = db.prepare("SELECT COUNT(*) as count FROM groups").get() as {
  count: number;
};
if (groupCount.count === 0) {
  const insertGroup = db.prepare("INSERT INTO groups (name) VALUES (?)");
  db.transaction(() => {
    insertGroup.run("창환 조");
    insertGroup.run("은아 조");
  })();
}

export default db;

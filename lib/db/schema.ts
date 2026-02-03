import { getDatabase } from './connection';

/**
 * Initialize database schema
 */
export function initializeSchema(): void {
  const db = getDatabase();

  // エージェント
  db.exec(`
    CREATE TABLE IF NOT EXISTS agents (
      id TEXT PRIMARY KEY,
      name TEXT NOT NULL,
      description TEXT,
      endpoint TEXT NOT NULL,
      avatar_color TEXT DEFAULT '#6366f1',
      is_active INTEGER DEFAULT 1,
      created_at TEXT DEFAULT CURRENT_TIMESTAMP
    );
  `);

  // スケジュール（プライベートデータ）
  db.exec(`
    CREATE TABLE IF NOT EXISTS schedules (
      id TEXT PRIMARY KEY,
      agent_id TEXT NOT NULL REFERENCES agents(id),
      title TEXT NOT NULL,
      description TEXT,
      start_time TEXT NOT NULL,
      end_time TEXT NOT NULL,
      event_date TEXT NOT NULL,
      is_private INTEGER DEFAULT 1,
      visibility TEXT DEFAULT 'busy',
      created_at TEXT DEFAULT CURRENT_TIMESTAMP
    );
  `);

  // Create index for faster schedule lookups
  db.exec(`
    CREATE INDEX IF NOT EXISTS idx_schedules_agent_date
    ON schedules(agent_id, event_date);
  `);

  // A2Aタスク
  db.exec(`
    CREATE TABLE IF NOT EXISTS tasks (
      id TEXT PRIMARY KEY,
      context_id TEXT,
      state TEXT NOT NULL DEFAULT 'working',
      created_at TEXT DEFAULT CURRENT_TIMESTAMP,
      updated_at TEXT DEFAULT CURRENT_TIMESTAMP,
      error_message TEXT,
      metadata TEXT
    );
  `);

  // Create index for context lookups
  db.exec(`
    CREATE INDEX IF NOT EXISTS idx_tasks_context ON tasks(context_id);
  `);

  // メッセージ
  db.exec(`
    CREATE TABLE IF NOT EXISTS messages (
      id TEXT PRIMARY KEY,
      task_id TEXT NOT NULL REFERENCES tasks(id) ON DELETE CASCADE,
      role TEXT NOT NULL,
      content TEXT NOT NULL,
      timestamp TEXT DEFAULT CURRENT_TIMESTAMP
    );
  `);

  // Create index for message lookups
  db.exec(`
    CREATE INDEX IF NOT EXISTS idx_messages_task ON messages(task_id, timestamp);
  `);

  // アーティファクト
  db.exec(`
    CREATE TABLE IF NOT EXISTS artifacts (
      id TEXT PRIMARY KEY,
      task_id TEXT NOT NULL REFERENCES tasks(id) ON DELETE CASCADE,
      name TEXT,
      mime_type TEXT NOT NULL,
      content TEXT NOT NULL,
      created_at TEXT DEFAULT CURRENT_TIMESTAMP
    );
  `);

  // Create index for artifact lookups
  db.exec(`
    CREATE INDEX IF NOT EXISTS idx_artifacts_task ON artifacts(task_id);
  `);
}

/**
 * Check if database is initialized
 */
export function isDatabaseInitialized(): boolean {
  const db = getDatabase();
  const result = db
    .prepare(
      "SELECT name FROM sqlite_master WHERE type='table' AND name='agents'"
    )
    .get();
  return !!result;
}

/**
 * Reset database (drop all tables and recreate)
 */
export function resetDatabase(): void {
  const db = getDatabase();

  db.exec(`
    DROP TABLE IF EXISTS artifacts;
    DROP TABLE IF EXISTS messages;
    DROP TABLE IF EXISTS tasks;
    DROP TABLE IF EXISTS schedules;
    DROP TABLE IF EXISTS agents;
  `);

  initializeSchema();
}

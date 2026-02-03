import { getDatabase } from '../connection';
import { generateTaskId, generateMessageId, generateArtifactId } from '../../utils/id';
import { getCurrentTimestamp } from '../../utils/date';
import type { Task, TaskState, Message, Artifact, Part } from '../../a2a/types';

interface TaskRow {
  id: string;
  context_id: string | null;
  state: string;
  created_at: string;
  updated_at: string;
  error_message: string | null;
  metadata: string | null;
}

interface MessageRow {
  id: string;
  task_id: string;
  role: string;
  content: string;
  timestamp: string;
}

interface ArtifactRow {
  id: string;
  task_id: string;
  name: string | null;
  mime_type: string;
  content: string;
  created_at: string;
}

/**
 * Convert database row to Task object
 */
function rowToTask(row: TaskRow): Task {
  return {
    id: row.id,
    contextId: row.context_id || undefined,
    status: {
      state: row.state as TaskState,
      timestamp: row.updated_at,
    },
    metadata: row.metadata ? JSON.parse(row.metadata) : undefined,
  };
}

/**
 * Convert database row to Message object
 */
function rowToMessage(row: MessageRow): Message {
  return {
    role: row.role as 'user' | 'agent',
    parts: JSON.parse(row.content) as Part[],
  };
}

/**
 * Convert database row to Artifact object
 */
function rowToArtifact(row: ArtifactRow): Artifact {
  return {
    id: row.id,
    name: row.name || undefined,
    mimeType: row.mime_type,
    parts: JSON.parse(row.content),
  };
}

/**
 * Get task by ID
 */
export function getTaskById(id: string): Task | undefined {
  const db = getDatabase();
  const row = db.prepare('SELECT * FROM tasks WHERE id = ?').get(id) as TaskRow | undefined;
  return row ? rowToTask(row) : undefined;
}

/**
 * Get all tasks
 */
export function getAllTasks(): Task[] {
  const db = getDatabase();
  const rows = db.prepare('SELECT * FROM tasks ORDER BY created_at DESC').all() as TaskRow[];
  return rows.map(rowToTask);
}

/**
 * Get tasks by context ID
 */
export function getTasksByContextId(contextId: string): Task[] {
  const db = getDatabase();
  const rows = db
    .prepare('SELECT * FROM tasks WHERE context_id = ? ORDER BY created_at DESC')
    .all(contextId) as TaskRow[];
  return rows.map(rowToTask);
}

/**
 * Create a new task
 */
export function createTask(params: {
  id?: string;
  contextId?: string;
  metadata?: Record<string, unknown>;
}): Task {
  const db = getDatabase();
  const id = params.id || generateTaskId();
  const now = getCurrentTimestamp();

  db.prepare(`
    INSERT INTO tasks (id, context_id, state, created_at, updated_at, metadata)
    VALUES (?, ?, ?, ?, ?, ?)
  `).run(
    id,
    params.contextId || null,
    'working',
    now,
    now,
    params.metadata ? JSON.stringify(params.metadata) : null
  );

  return getTaskById(id)!;
}

/**
 * Update task state
 */
export function updateTaskState(
  id: string,
  state: TaskState,
  errorMessage?: string
): Task | undefined {
  const db = getDatabase();
  const existing = getTaskById(id);
  if (!existing) return undefined;

  const now = getCurrentTimestamp();

  db.prepare(`
    UPDATE tasks
    SET state = ?, updated_at = ?, error_message = ?
    WHERE id = ?
  `).run(state, now, errorMessage || null, id);

  return getTaskById(id);
}

/**
 * Update task metadata
 */
export function updateTaskMetadata(
  id: string,
  metadata: Record<string, unknown>
): Task | undefined {
  const db = getDatabase();
  const existing = getTaskById(id);
  if (!existing) return undefined;

  const now = getCurrentTimestamp();
  const existingMetadata = existing.metadata || {};
  const mergedMetadata = { ...existingMetadata, ...metadata };

  db.prepare(`
    UPDATE tasks
    SET metadata = ?, updated_at = ?
    WHERE id = ?
  `).run(JSON.stringify(mergedMetadata), now, id);

  return getTaskById(id);
}

/**
 * Delete task and related data
 */
export function deleteTask(id: string): boolean {
  const db = getDatabase();

  // Delete related messages and artifacts first (CASCADE should handle this)
  db.prepare('DELETE FROM messages WHERE task_id = ?').run(id);
  db.prepare('DELETE FROM artifacts WHERE task_id = ?').run(id);

  const result = db.prepare('DELETE FROM tasks WHERE id = ?').run(id);
  return result.changes > 0;
}

/**
 * Get messages for a task
 */
export function getTaskMessages(taskId: string, limit?: number): Message[] {
  const db = getDatabase();
  const query = limit
    ? 'SELECT * FROM messages WHERE task_id = ? ORDER BY timestamp ASC LIMIT ?'
    : 'SELECT * FROM messages WHERE task_id = ? ORDER BY timestamp ASC';

  const rows = (limit
    ? db.prepare(query).all(taskId, limit)
    : db.prepare(query).all(taskId)) as MessageRow[];

  return rows.map(rowToMessage);
}

/**
 * Add message to task
 */
export function addTaskMessage(taskId: string, message: Message): void {
  const db = getDatabase();
  const id = generateMessageId();
  const now = getCurrentTimestamp();

  db.prepare(`
    INSERT INTO messages (id, task_id, role, content, timestamp)
    VALUES (?, ?, ?, ?, ?)
  `).run(id, taskId, message.role, JSON.stringify(message.parts), now);

  // Also update the task's updated_at
  db.prepare('UPDATE tasks SET updated_at = ? WHERE id = ?').run(now, taskId);
}

/**
 * Get artifacts for a task
 */
export function getTaskArtifacts(taskId: string): Artifact[] {
  const db = getDatabase();
  const rows = db
    .prepare('SELECT * FROM artifacts WHERE task_id = ? ORDER BY created_at ASC')
    .all(taskId) as ArtifactRow[];

  return rows.map(rowToArtifact);
}

/**
 * Add artifact to task
 */
export function addTaskArtifact(taskId: string, artifact: Artifact): Artifact {
  const db = getDatabase();
  const id = artifact.id || generateArtifactId();
  const now = getCurrentTimestamp();

  db.prepare(`
    INSERT INTO artifacts (id, task_id, name, mime_type, content, created_at)
    VALUES (?, ?, ?, ?, ?, ?)
  `).run(id, taskId, artifact.name || null, artifact.mimeType, JSON.stringify(artifact.parts), now);

  // Also update the task's updated_at
  db.prepare('UPDATE tasks SET updated_at = ? WHERE id = ?').run(now, taskId);

  return { ...artifact, id };
}

/**
 * Get full task with history and artifacts
 */
export function getFullTask(id: string, historyLength?: number): Task | undefined {
  const task = getTaskById(id);
  if (!task) return undefined;

  const messages = getTaskMessages(id, historyLength);
  const artifacts = getTaskArtifacts(id);

  return {
    ...task,
    history: messages,
    artifacts,
  };
}

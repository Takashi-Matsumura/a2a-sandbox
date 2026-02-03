import { getDatabase } from '../connection';
import { generateScheduleId } from '../../utils/id';

export interface ScheduleRow {
  id: string;
  agent_id: string;
  title: string;
  description: string | null;
  start_time: string;
  end_time: string;
  event_date: string;
  is_private: number;
  visibility: string;
  created_at: string;
}

export interface Schedule {
  id: string;
  agentId: string;
  title: string;
  description: string | null;
  startTime: string;
  endTime: string;
  eventDate: string;
  isPrivate: boolean;
  visibility: string;
  createdAt: string;
}

/**
 * Convert database row to Schedule object
 */
function rowToSchedule(row: ScheduleRow): Schedule {
  return {
    id: row.id,
    agentId: row.agent_id,
    title: row.title,
    description: row.description,
    startTime: row.start_time,
    endTime: row.end_time,
    eventDate: row.event_date,
    isPrivate: row.is_private === 1,
    visibility: row.visibility,
    createdAt: row.created_at,
  };
}

/**
 * Get schedules for an agent on a specific date
 */
export function getAgentSchedules(agentId: string, date: string): Schedule[] {
  const db = getDatabase();
  const rows = db
    .prepare(
      'SELECT * FROM schedules WHERE agent_id = ? AND event_date = ? ORDER BY start_time'
    )
    .all(agentId, date) as ScheduleRow[];

  return rows.map(rowToSchedule);
}

/**
 * Get all schedules for an agent
 */
export function getAllAgentSchedules(agentId: string): Schedule[] {
  const db = getDatabase();
  const rows = db
    .prepare(
      'SELECT * FROM schedules WHERE agent_id = ? ORDER BY event_date, start_time'
    )
    .all(agentId) as ScheduleRow[];

  return rows.map(rowToSchedule);
}

/**
 * Get public view of schedules (privacy filtered)
 * Returns only busy/available status without titles or descriptions
 */
export function getPublicAgentSchedules(
  agentId: string,
  date: string
): { startTime: string; endTime: string; status: string }[] {
  const schedules = getAgentSchedules(agentId, date);

  return schedules.map((schedule) => ({
    startTime: schedule.startTime,
    endTime: schedule.endTime,
    status: schedule.visibility,
  }));
}

/**
 * Get schedule by ID
 */
export function getScheduleById(id: string): Schedule | undefined {
  const db = getDatabase();
  const row = db.prepare('SELECT * FROM schedules WHERE id = ?').get(id) as ScheduleRow | undefined;
  return row ? rowToSchedule(row) : undefined;
}

/**
 * Create a new schedule
 */
export function createSchedule(schedule: {
  agentId: string;
  title: string;
  description?: string;
  startTime: string;
  endTime: string;
  eventDate: string;
  isPrivate?: boolean;
  visibility?: string;
}): Schedule {
  const db = getDatabase();
  const id = generateScheduleId();

  db.prepare(`
    INSERT INTO schedules (id, agent_id, title, description, start_time, end_time, event_date, is_private, visibility)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
  `).run(
    id,
    schedule.agentId,
    schedule.title,
    schedule.description || null,
    schedule.startTime,
    schedule.endTime,
    schedule.eventDate,
    schedule.isPrivate ? 1 : 0,
    schedule.visibility || 'busy'
  );

  return getScheduleById(id)!;
}

/**
 * Update schedule
 */
export function updateSchedule(
  id: string,
  updates: {
    title?: string;
    description?: string;
    startTime?: string;
    endTime?: string;
    eventDate?: string;
    isPrivate?: boolean;
    visibility?: string;
  }
): Schedule | undefined {
  const db = getDatabase();
  const existing = getScheduleById(id);
  if (!existing) return undefined;

  const fields: string[] = [];
  const values: (string | number)[] = [];

  if (updates.title !== undefined) {
    fields.push('title = ?');
    values.push(updates.title);
  }
  if (updates.description !== undefined) {
    fields.push('description = ?');
    values.push(updates.description);
  }
  if (updates.startTime !== undefined) {
    fields.push('start_time = ?');
    values.push(updates.startTime);
  }
  if (updates.endTime !== undefined) {
    fields.push('end_time = ?');
    values.push(updates.endTime);
  }
  if (updates.eventDate !== undefined) {
    fields.push('event_date = ?');
    values.push(updates.eventDate);
  }
  if (updates.isPrivate !== undefined) {
    fields.push('is_private = ?');
    values.push(updates.isPrivate ? 1 : 0);
  }
  if (updates.visibility !== undefined) {
    fields.push('visibility = ?');
    values.push(updates.visibility);
  }

  if (fields.length > 0) {
    values.push(id);
    db.prepare(`UPDATE schedules SET ${fields.join(', ')} WHERE id = ?`).run(...values);
  }

  return getScheduleById(id);
}

/**
 * Delete schedule
 */
export function deleteSchedule(id: string): boolean {
  const db = getDatabase();
  const result = db.prepare('DELETE FROM schedules WHERE id = ?').run(id);
  return result.changes > 0;
}

/**
 * Check if agent has conflicting schedule
 */
export function hasConflict(
  agentId: string,
  date: string,
  startTime: string,
  endTime: string,
  excludeId?: string
): boolean {
  const db = getDatabase();

  // Check for overlapping schedules
  const query = excludeId
    ? `
      SELECT COUNT(*) as count FROM schedules
      WHERE agent_id = ? AND event_date = ? AND id != ?
      AND ((start_time < ? AND end_time > ?) OR (start_time < ? AND end_time > ?) OR (start_time >= ? AND end_time <= ?))
    `
    : `
      SELECT COUNT(*) as count FROM schedules
      WHERE agent_id = ? AND event_date = ?
      AND ((start_time < ? AND end_time > ?) OR (start_time < ? AND end_time > ?) OR (start_time >= ? AND end_time <= ?))
    `;

  const params = excludeId
    ? [agentId, date, excludeId, endTime, startTime, endTime, startTime, startTime, endTime]
    : [agentId, date, endTime, startTime, endTime, startTime, startTime, endTime];

  const result = db.prepare(query).get(...params) as { count: number };
  return result.count > 0;
}

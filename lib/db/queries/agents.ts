import { getDatabase } from '../connection';

export interface AgentRow {
  id: string;
  name: string;
  description: string | null;
  endpoint: string;
  avatar_color: string;
  is_active: number;
  created_at: string;
}

/**
 * Get all agents
 */
export function getAllAgents(): AgentRow[] {
  const db = getDatabase();
  return db.prepare('SELECT * FROM agents WHERE is_active = 1').all() as AgentRow[];
}

/**
 * Get agent by ID
 */
export function getAgentById(id: string): AgentRow | undefined {
  const db = getDatabase();
  return db.prepare('SELECT * FROM agents WHERE id = ?').get(id) as AgentRow | undefined;
}

/**
 * Create a new agent
 */
export function createAgent(agent: {
  id: string;
  name: string;
  description?: string;
  endpoint: string;
  avatarColor?: string;
}): AgentRow {
  const db = getDatabase();
  db.prepare(`
    INSERT INTO agents (id, name, description, endpoint, avatar_color)
    VALUES (?, ?, ?, ?, ?)
  `).run(
    agent.id,
    agent.name,
    agent.description || null,
    agent.endpoint,
    agent.avatarColor || '#6366f1'
  );

  return getAgentById(agent.id)!;
}

/**
 * Update agent
 */
export function updateAgent(
  id: string,
  updates: {
    name?: string;
    description?: string;
    endpoint?: string;
    avatarColor?: string;
    isActive?: boolean;
  }
): AgentRow | undefined {
  const db = getDatabase();
  const existing = getAgentById(id);
  if (!existing) return undefined;

  const fields: string[] = [];
  const values: (string | number)[] = [];

  if (updates.name !== undefined) {
    fields.push('name = ?');
    values.push(updates.name);
  }
  if (updates.description !== undefined) {
    fields.push('description = ?');
    values.push(updates.description);
  }
  if (updates.endpoint !== undefined) {
    fields.push('endpoint = ?');
    values.push(updates.endpoint);
  }
  if (updates.avatarColor !== undefined) {
    fields.push('avatar_color = ?');
    values.push(updates.avatarColor);
  }
  if (updates.isActive !== undefined) {
    fields.push('is_active = ?');
    values.push(updates.isActive ? 1 : 0);
  }

  if (fields.length > 0) {
    values.push(id);
    db.prepare(`UPDATE agents SET ${fields.join(', ')} WHERE id = ?`).run(...values);
  }

  return getAgentById(id);
}

/**
 * Delete agent (soft delete)
 */
export function deleteAgent(id: string): boolean {
  const db = getDatabase();
  const result = db.prepare('UPDATE agents SET is_active = 0 WHERE id = ?').run(id);
  return result.changes > 0;
}

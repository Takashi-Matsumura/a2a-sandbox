import { v4 as uuidv4 } from 'uuid';

/**
 * Generate a unique task ID
 */
export function generateTaskId(): string {
  return `task_${uuidv4()}`;
}

/**
 * Generate a unique context ID
 */
export function generateContextId(): string {
  return `ctx_${uuidv4()}`;
}

/**
 * Generate a unique message ID
 */
export function generateMessageId(): string {
  return `msg_${uuidv4()}`;
}

/**
 * Generate a unique artifact ID
 */
export function generateArtifactId(): string {
  return `art_${uuidv4()}`;
}

/**
 * Generate a unique schedule ID
 */
export function generateScheduleId(): string {
  return `sch_${uuidv4()}`;
}

/**
 * Generate a generic unique ID
 */
export function generateId(prefix?: string): string {
  const id = uuidv4();
  return prefix ? `${prefix}_${id}` : id;
}

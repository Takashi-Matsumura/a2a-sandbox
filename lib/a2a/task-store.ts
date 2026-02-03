import type { Task, TaskStore, Message, Artifact } from './types';
import {
  createTask as dbCreateTask,
  getFullTask,
  updateTaskState,
  updateTaskMetadata,
  deleteTask as dbDeleteTask,
  addTaskMessage,
  addTaskArtifact,
  getTaskMessages,
  getTaskArtifacts,
} from '../db/queries/tasks';
import { generateTaskId } from '../utils/id';

/**
 * SQLite-backed TaskStore implementation for A2A protocol
 */
export class SQLiteTaskStore implements TaskStore {
  /**
   * Create a new task
   */
  async createTask(params: {
    id?: string;
    contextId?: string;
    metadata?: Record<string, unknown>;
  }): Promise<Task> {
    const task = dbCreateTask({
      id: params.id || generateTaskId(),
      contextId: params.contextId,
      metadata: params.metadata,
    });
    return task;
  }

  /**
   * Get a task by ID
   */
  async getTask(id: string): Promise<Task | null> {
    const task = getFullTask(id);
    return task || null;
  }

  /**
   * Update a task
   */
  async updateTask(id: string, updates: Partial<Task>): Promise<Task> {
    // Update state if provided
    if (updates.status?.state) {
      const errorMessage = updates.status.state === 'failed'
        ? updates.status.message?.parts.find(p => p.type === 'text')?.text
        : undefined;
      updateTaskState(id, updates.status.state, errorMessage);
    }

    // Update metadata if provided
    if (updates.metadata) {
      updateTaskMetadata(id, updates.metadata);
    }

    const task = await this.getTask(id);
    if (!task) {
      throw new Error(`Task not found: ${id}`);
    }
    return task;
  }

  /**
   * Delete a task
   */
  async deleteTask(id: string): Promise<void> {
    dbDeleteTask(id);
  }

  /**
   * Add a message to a task
   */
  async addMessage(taskId: string, message: Message): Promise<void> {
    addTaskMessage(taskId, message);
  }

  /**
   * Add an artifact to a task
   */
  async addArtifact(taskId: string, artifact: Artifact): Promise<void> {
    addTaskArtifact(taskId, artifact);
  }

  /**
   * Get messages for a task
   */
  async getMessages(taskId: string, limit?: number): Promise<Message[]> {
    return getTaskMessages(taskId, limit);
  }

  /**
   * Get artifacts for a task
   */
  async getArtifacts(taskId: string): Promise<Artifact[]> {
    return getTaskArtifacts(taskId);
  }
}

// Singleton instance
let taskStoreInstance: SQLiteTaskStore | null = null;

/**
 * Get the TaskStore instance
 */
export function getTaskStore(): SQLiteTaskStore {
  if (!taskStoreInstance) {
    taskStoreInstance = new SQLiteTaskStore();
  }
  return taskStoreInstance;
}

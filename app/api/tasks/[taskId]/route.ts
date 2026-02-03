import { NextResponse } from 'next/server';
import { getFullTask, deleteTask, updateTaskState } from '@/lib/db/queries/tasks';
import type { TaskState } from '@/lib/a2a/types';
import { initializeSchema, isDatabaseInitialized } from '@/lib/db/schema';
import { seedDatabase } from '@/lib/db/seed';

interface RouteParams {
  params: Promise<{ taskId: string }>;
}

/**
 * GET /api/tasks/[taskId]
 * Returns task details with history and artifacts
 * Query params:
 *   - historyLength: limit number of messages returned
 */
export async function GET(request: Request, { params }: RouteParams) {
  try {
    const { taskId } = await params;
    const url = new URL(request.url);
    const historyLength = url.searchParams.get('historyLength');

    // Ensure database is initialized
    if (!isDatabaseInitialized()) {
      initializeSchema();
      seedDatabase();
    }

    const task = getFullTask(taskId, historyLength ? parseInt(historyLength) : undefined);

    if (!task) {
      return NextResponse.json(
        { error: `Task not found: ${taskId}` },
        { status: 404 }
      );
    }

    return NextResponse.json({ task });
  } catch (error) {
    console.error('Error fetching task:', error);
    return NextResponse.json(
      { error: 'Failed to fetch task' },
      { status: 500 }
    );
  }
}

/**
 * PATCH /api/tasks/[taskId]
 * Update task state (e.g., cancel)
 * Body:
 *   - state: new task state
 */
export async function PATCH(request: Request, { params }: RouteParams) {
  try {
    const { taskId } = await params;
    const body = await request.json();
    const { state } = body;

    // Ensure database is initialized
    if (!isDatabaseInitialized()) {
      initializeSchema();
      seedDatabase();
    }

    const task = getFullTask(taskId);
    if (!task) {
      return NextResponse.json(
        { error: `Task not found: ${taskId}` },
        { status: 404 }
      );
    }

    // Validate state transition
    const validStates: TaskState[] = ['submitted', 'working', 'input-required', 'completed', 'failed', 'canceled'];
    if (!validStates.includes(state)) {
      return NextResponse.json(
        { error: `Invalid state: ${state}` },
        { status: 400 }
      );
    }

    // Check if task can be updated (not in terminal state)
    if (task.status.state === 'completed' || task.status.state === 'failed' || task.status.state === 'canceled') {
      return NextResponse.json(
        { error: `Task is already in terminal state: ${task.status.state}` },
        { status: 400 }
      );
    }

    const updatedTask = updateTaskState(taskId, state);

    return NextResponse.json({
      success: true,
      task: updatedTask,
    });
  } catch (error) {
    console.error('Error updating task:', error);
    return NextResponse.json(
      { error: 'Failed to update task' },
      { status: 500 }
    );
  }
}

/**
 * DELETE /api/tasks/[taskId]
 * Delete a task
 */
export async function DELETE(request: Request, { params }: RouteParams) {
  try {
    const { taskId } = await params;

    // Ensure database is initialized
    if (!isDatabaseInitialized()) {
      initializeSchema();
      seedDatabase();
    }

    const task = getFullTask(taskId);
    if (!task) {
      return NextResponse.json(
        { error: `Task not found: ${taskId}` },
        { status: 404 }
      );
    }

    const deleted = deleteTask(taskId);

    return NextResponse.json({
      success: deleted,
      message: deleted ? 'Task deleted successfully' : 'Failed to delete task',
    });
  } catch (error) {
    console.error('Error deleting task:', error);
    return NextResponse.json(
      { error: 'Failed to delete task' },
      { status: 500 }
    );
  }
}

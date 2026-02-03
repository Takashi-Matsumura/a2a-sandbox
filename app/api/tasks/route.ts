import { NextResponse } from 'next/server';
import { getAllTasks, createTask, getFullTask } from '@/lib/db/queries/tasks';
import { getAgentExecutor } from '@/lib/agents/registry';
import { getTaskStore } from '@/lib/a2a/task-store';
import { generateTaskId, generateContextId } from '@/lib/utils/id';
import type { Message } from '@/lib/a2a/types';
import { initializeSchema, isDatabaseInitialized } from '@/lib/db/schema';
import { seedDatabase } from '@/lib/db/seed';

/**
 * GET /api/tasks
 * Returns list of all tasks
 * Query params:
 *   - contextId: filter by context
 *   - state: filter by state
 */
export async function GET(request: Request) {
  try {
    // Ensure database is initialized
    if (!isDatabaseInitialized()) {
      initializeSchema();
      seedDatabase();
    }

    const url = new URL(request.url);
    const contextId = url.searchParams.get('contextId');
    const state = url.searchParams.get('state');

    let tasks = getAllTasks();

    // Apply filters
    if (contextId) {
      tasks = tasks.filter((t) => t.contextId === contextId);
    }
    if (state) {
      tasks = tasks.filter((t) => t.status.state === state);
    }

    return NextResponse.json({
      tasks,
      total: tasks.length,
    });
  } catch (error) {
    console.error('Error fetching tasks:', error);
    return NextResponse.json(
      { error: 'Failed to fetch tasks' },
      { status: 500 }
    );
  }
}

/**
 * POST /api/tasks
 * Create a new task and send a message to an agent
 * Body:
 *   - agentId: target agent ID
 *   - message: Message object or string
 *   - contextId: optional context ID
 *   - metadata: optional metadata
 */
export async function POST(request: Request) {
  try {
    // Ensure database is initialized
    if (!isDatabaseInitialized()) {
      initializeSchema();
      seedDatabase();
    }

    const body = await request.json();
    const { agentId, message, contextId, metadata } = body;

    // Validate required fields
    if (!agentId || !message) {
      return NextResponse.json(
        { error: 'Missing required fields: agentId, message' },
        { status: 400 }
      );
    }

    // Get the agent executor
    const executor = getAgentExecutor(agentId);
    if (!executor) {
      return NextResponse.json(
        { error: `Agent not found: ${agentId}` },
        { status: 404 }
      );
    }

    // Normalize message to Message type
    const normalizedMessage: Message =
      typeof message === 'string'
        ? { role: 'user', parts: [{ type: 'text', text: message }] }
        : message;

    // Create task
    const taskStore = getTaskStore();
    const taskId = generateTaskId();
    const taskContextId = contextId || generateContextId();

    const task = await taskStore.createTask({
      id: taskId,
      contextId: taskContextId,
      metadata: {
        ...metadata,
        agentId,
      },
    });

    // Add the user message
    await taskStore.addMessage(taskId, normalizedMessage);

    // Execute the agent
    const response = await executor.execute(task, normalizedMessage, {
      taskId,
      contextId: taskContextId,
      history: [normalizedMessage],
      metadata,
    });

    // Update task with response
    if (response.status) {
      await taskStore.updateTask(taskId, { status: response.status });

      // Add agent response message if present
      if (response.status.message) {
        await taskStore.addMessage(taskId, response.status.message);
      }
    }

    // Add artifacts if present
    if (response.artifacts) {
      for (const artifact of response.artifacts) {
        await taskStore.addArtifact(taskId, artifact);
      }
    }

    // Get the full updated task
    const updatedTask = getFullTask(taskId);

    return NextResponse.json({
      success: true,
      task: updatedTask,
    });
  } catch (error) {
    console.error('Error creating task:', error);
    return NextResponse.json(
      { error: 'Failed to create task' },
      { status: 500 }
    );
  }
}

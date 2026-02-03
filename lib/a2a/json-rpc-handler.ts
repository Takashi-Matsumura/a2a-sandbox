import type {
  JsonRpcRequest,
  JsonRpcResponse,
  JsonRpcError,
  Task,
  TaskSendParams,
  TaskGetParams,
  TaskCancelParams,
  AgentExecutor,
  Message,
} from './types';
import { JSON_RPC_ERRORS } from './types';
import { getTaskStore } from './task-store';
import { generateTaskId, generateContextId } from '../utils/id';

/**
 * Create a JSON-RPC error response
 */
export function createErrorResponse(
  id: string | number | null,
  code: number,
  message: string,
  data?: unknown
): JsonRpcResponse {
  return {
    jsonrpc: '2.0',
    id: id ?? 0,
    error: { code, message, data },
  };
}

/**
 * Create a JSON-RPC success response
 */
export function createSuccessResponse<T>(
  id: string | number,
  result: T
): JsonRpcResponse<T> {
  return {
    jsonrpc: '2.0',
    id,
    result,
  };
}

/**
 * Validate JSON-RPC request
 */
function validateRequest(request: unknown): JsonRpcRequest | JsonRpcError {
  if (typeof request !== 'object' || request === null) {
    return {
      code: JSON_RPC_ERRORS.INVALID_REQUEST,
      message: 'Invalid request: not an object',
    };
  }

  const req = request as Record<string, unknown>;

  if (req.jsonrpc !== '2.0') {
    return {
      code: JSON_RPC_ERRORS.INVALID_REQUEST,
      message: 'Invalid request: jsonrpc must be "2.0"',
    };
  }

  if (typeof req.method !== 'string') {
    return {
      code: JSON_RPC_ERRORS.INVALID_REQUEST,
      message: 'Invalid request: method must be a string',
    };
  }

  if (req.id === undefined || (typeof req.id !== 'string' && typeof req.id !== 'number')) {
    return {
      code: JSON_RPC_ERRORS.INVALID_REQUEST,
      message: 'Invalid request: id must be a string or number',
    };
  }

  return req as unknown as JsonRpcRequest;
}

/**
 * JSON-RPC Handler for A2A protocol
 */
export class JsonRpcHandler {
  private executor: AgentExecutor;
  private agentId: string;

  constructor(executor: AgentExecutor, agentId: string) {
    this.executor = executor;
    this.agentId = agentId;
  }

  /**
   * Handle a JSON-RPC request
   */
  async handle(request: unknown): Promise<JsonRpcResponse> {
    // Validate request
    const validationResult = validateRequest(request);
    if ('code' in validationResult) {
      return createErrorResponse(null, validationResult.code, validationResult.message);
    }

    const req = validationResult;

    try {
      switch (req.method) {
        case 'tasks/send':
          return await this.handleTaskSend(req.id, req.params as unknown as TaskSendParams);
        case 'tasks/get':
          return await this.handleTaskGet(req.id, req.params as unknown as TaskGetParams);
        case 'tasks/cancel':
          return await this.handleTaskCancel(req.id, req.params as unknown as TaskCancelParams);
        default:
          return createErrorResponse(
            req.id,
            JSON_RPC_ERRORS.METHOD_NOT_FOUND,
            `Method not found: ${req.method}`
          );
      }
    } catch (error) {
      console.error('JSON-RPC handler error:', error);
      return createErrorResponse(
        req.id,
        JSON_RPC_ERRORS.INTERNAL_ERROR,
        error instanceof Error ? error.message : 'Internal error'
      );
    }
  }

  /**
   * Handle tasks/send method
   */
  private async handleTaskSend(
    requestId: string | number,
    params: TaskSendParams
  ): Promise<JsonRpcResponse<Task | null>> {
    const taskStore = getTaskStore();

    // Validate params
    if (!params?.message) {
      return createErrorResponse(
        requestId,
        JSON_RPC_ERRORS.INVALID_PARAMS,
        'Missing required parameter: message'
      ) as JsonRpcResponse<Task | null>;
    }

    // Create or get existing task
    const taskId = params.id || generateTaskId();
    const contextId = params.contextId || generateContextId();

    let task = await taskStore.getTask(taskId);
    if (!task) {
      task = await taskStore.createTask({
        id: taskId,
        contextId,
        metadata: {
          ...params.metadata,
          agentId: this.agentId,
        },
      });
    }

    // Add the user message
    await taskStore.addMessage(taskId, params.message);

    // Get message history
    const history = await taskStore.getMessages(taskId, params.historyLength);

    // Execute the agent
    const response = await this.executor.execute(
      task,
      params.message,
      {
        taskId,
        contextId,
        history,
        metadata: params.metadata,
      }
    );

    // Update task with response
    if (response.status) {
      task = await taskStore.updateTask(taskId, { status: response.status });

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

    // Return updated task with history
    const updatedTask = await taskStore.getTask(taskId);
    return createSuccessResponse(requestId, updatedTask!);
  }

  /**
   * Handle tasks/get method
   */
  private async handleTaskGet(
    requestId: string | number,
    params: TaskGetParams
  ): Promise<JsonRpcResponse<Task | null>> {
    const taskStore = getTaskStore();

    if (!params?.id) {
      return createErrorResponse(
        requestId,
        JSON_RPC_ERRORS.INVALID_PARAMS,
        'Missing required parameter: id'
      ) as JsonRpcResponse<Task | null>;
    }

    const task = await taskStore.getTask(params.id);
    if (!task) {
      return createErrorResponse(
        requestId,
        JSON_RPC_ERRORS.TASK_NOT_FOUND,
        `Task not found: ${params.id}`
      ) as JsonRpcResponse<Task | null>;
    }

    // Apply history length limit if specified
    if (params.historyLength && task.history) {
      task.history = task.history.slice(-params.historyLength);
    }

    return createSuccessResponse(requestId, task);
  }

  /**
   * Handle tasks/cancel method
   */
  private async handleTaskCancel(
    requestId: string | number,
    params: TaskCancelParams
  ): Promise<JsonRpcResponse<Task | null>> {
    const taskStore = getTaskStore();

    if (!params?.id) {
      return createErrorResponse(
        requestId,
        JSON_RPC_ERRORS.INVALID_PARAMS,
        'Missing required parameter: id'
      ) as JsonRpcResponse<Task | null>;
    }

    const task = await taskStore.getTask(params.id);
    if (!task) {
      return createErrorResponse(
        requestId,
        JSON_RPC_ERRORS.TASK_NOT_FOUND,
        `Task not found: ${params.id}`
      ) as JsonRpcResponse<Task | null>;
    }

    // Check if task can be canceled
    if (task.status.state === 'completed' || task.status.state === 'failed') {
      return createErrorResponse(
        requestId,
        JSON_RPC_ERRORS.TASK_NOT_CANCELABLE,
        `Task cannot be canceled: already ${task.status.state}`
      ) as JsonRpcResponse<Task | null>;
    }

    // Cancel the task
    const updatedTask = await taskStore.updateTask(params.id, {
      status: {
        state: 'canceled',
        message: {
          role: 'agent',
          parts: [{ type: 'text', text: 'Task was canceled by request.' }],
        },
      },
    });

    return createSuccessResponse(requestId, updatedTask);
  }
}

/**
 * Create a Next.js API route handler for A2A protocol
 */
export function createA2AHandler(executor: AgentExecutor, agentId: string) {
  const handler = new JsonRpcHandler(executor, agentId);

  return async function handleRequest(request: Request): Promise<Response> {
    try {
      const body = await request.json();
      const response = await handler.handle(body);

      return new Response(JSON.stringify(response), {
        status: 200,
        headers: {
          'Content-Type': 'application/json',
        },
      });
    } catch (error) {
      console.error('A2A handler error:', error);
      const errorResponse = createErrorResponse(
        null,
        JSON_RPC_ERRORS.PARSE_ERROR,
        'Failed to parse request body'
      );

      return new Response(JSON.stringify(errorResponse), {
        status: 400,
        headers: {
          'Content-Type': 'application/json',
        },
      });
    }
  };
}

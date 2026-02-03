import type {
  AgentExecutor,
  Task,
  Message,
  ExecutionContext,
  AgentResponse,
  TaskStatus,
  AgentCard,
  AgentSkill,
  Part,
} from '../a2a/types';
import {
  extractTextContent,
  extractDataContent,
  createTextMessage,
  createDataMessage,
  parseScheduleRequest,
} from '../a2a/message-handler';
import { checkAvailability, getBusySlots } from './skills/check-availability';
import { scheduleMeeting } from './skills/schedule-meeting';
import { createAgentCard, STANDARD_SKILLS, getBaseUrl } from '../a2a/agent-card';
import { getAgentById } from '../db/queries/agents';
import { callLLM, createAgentSystemPrompt } from '../llm/client';
import { getTodayString } from '../utils/date';

export interface AgentConfig {
  id: string;
  name: string;
  description?: string;
  personality?: string;
  skills?: string[]; // skill IDs to enable
  useLLM?: boolean;
}

/**
 * Base agent class implementing the AgentExecutor interface
 */
export class BaseAgent implements AgentExecutor {
  protected config: AgentConfig;
  protected skills: Map<string, AgentSkill>;

  constructor(config: AgentConfig) {
    this.config = config;
    this.skills = new Map();

    // Register enabled skills
    const enabledSkills = config.skills || ['check-availability', 'get-busy-slots', 'schedule-meeting'];
    for (const skillId of enabledSkills) {
      const skill = STANDARD_SKILLS[skillId];
      if (skill) {
        this.skills.set(skillId, skill);
      }
    }
  }

  /**
   * Get the agent's ID
   */
  get id(): string {
    return this.config.id;
  }

  /**
   * Get the agent's name
   */
  get name(): string {
    return this.config.name;
  }

  /**
   * Generate the Agent Card for this agent
   */
  getAgentCard(): AgentCard {
    const baseUrl = getBaseUrl();
    return createAgentCard({
      name: `${this.config.name}'s Assistant`,
      description: this.config.description,
      url: `${baseUrl}/api/agents/${this.config.id}`,
      skills: Array.from(this.skills.values()),
    });
  }

  /**
   * Execute a task with a message
   */
  async execute(
    task: Task,
    message: Message,
    context: ExecutionContext
  ): Promise<AgentResponse> {
    try {
      // Extract content from the message
      const textContent = extractTextContent(message);
      const dataContent = extractDataContent(message);

      // Try to parse structured data first
      if (dataContent.length > 0) {
        return await this.handleStructuredRequest(dataContent[0], context);
      }

      // Parse natural language request
      const parsed = parseScheduleRequest(textContent);

      // If we have a clear intent, handle it directly
      if (parsed.intent !== 'unknown') {
        return await this.handleParsedRequest(parsed.intent, parsed.params, context);
      }

      // Use LLM for complex or unclear requests
      if (this.config.useLLM) {
        return await this.handleWithLLM(textContent, context);
      }

      // Fallback: try to identify the intent from keywords
      return this.handleFallback(textContent, context);
    } catch (error) {
      console.error(`[${this.config.name}] Error executing task:`, error);
      return this.createErrorResponse(
        error instanceof Error ? error.message : 'Unknown error occurred'
      );
    }
  }

  /**
   * Handle a structured data request
   */
  protected async handleStructuredRequest(
    data: Record<string, unknown>,
    context: ExecutionContext
  ): Promise<AgentResponse> {
    const action = data.action as string;
    const params = data.params as Record<string, unknown>;

    switch (action) {
      case 'check-availability':
        return this.executeCheckAvailability({
          date: (params?.date as string) || getTodayString(),
          startTime: params?.startTime as string,
          endTime: params?.endTime as string,
        });

      case 'get-busy-slots':
        return this.executeGetBusySlots({
          date: (params?.date as string) || getTodayString(),
        });

      case 'schedule-meeting':
        return this.executeScheduleMeeting({
          title: params?.title as string,
          date: (params?.date as string) || getTodayString(),
          startTime: params?.startTime as string,
          endTime: params?.endTime as string,
          description: params?.description as string,
        });

      default:
        return this.createErrorResponse(`Unknown action: ${action}`);
    }
  }

  /**
   * Handle a parsed natural language request
   */
  protected async handleParsedRequest(
    intent: string,
    params: Record<string, string | undefined>,
    context: ExecutionContext
  ): Promise<AgentResponse> {
    switch (intent) {
      case 'check-availability':
        return this.executeCheckAvailability({
          date: params.date || getTodayString(),
          startTime: params.startTime,
          endTime: params.endTime,
        });

      case 'get-busy-slots':
        return this.executeGetBusySlots({
          date: params.date || getTodayString(),
        });

      case 'schedule-meeting':
        if (!params.title || !params.startTime) {
          return this.createInputRequiredResponse(
            'Please provide the meeting title and time.'
          );
        }
        return this.executeScheduleMeeting({
          title: params.title,
          date: params.date || getTodayString(),
          startTime: params.startTime,
          endTime: params.endTime || this.addHour(params.startTime),
        });

      default:
        return this.createErrorResponse(`Unknown intent: ${intent}`);
    }
  }

  /**
   * Handle request using LLM
   */
  protected async handleWithLLM(
    text: string,
    context: ExecutionContext
  ): Promise<AgentResponse> {
    const systemPrompt = createAgentSystemPrompt({
      name: this.config.name,
      personality: this.config.personality,
      skills: Array.from(this.skills.values()),
    });

    const response = await callLLM({
      messages: [
        { role: 'system', content: systemPrompt },
        ...context.history.map((m) => ({
          role: m.role === 'user' ? 'user' as const : 'assistant' as const,
          content: extractTextContent(m),
        })),
        { role: 'user', content: text },
      ],
    });

    return this.createSuccessResponse(response);
  }

  /**
   * Fallback handler for unclear requests
   */
  protected handleFallback(
    text: string,
    context: ExecutionContext
  ): AgentResponse {
    const agentData = getAgentById(this.config.id);
    const greeting = `Hello! I'm ${this.config.name}'s assistant. I can help you with:\n\n` +
      '• Checking availability for specific times\n' +
      '• Viewing busy time slots for a day\n' +
      '• Scheduling meetings\n\n' +
      'How can I help you today?';

    return this.createSuccessResponse(greeting);
  }

  /**
   * Execute check-availability skill
   */
  protected executeCheckAvailability(params: {
    date: string;
    startTime?: string;
    endTime?: string;
  }): AgentResponse {
    const result = checkAvailability(this.config.id, params);

    const parts: Part[] = [
      { type: 'text', text: result.message },
      {
        type: 'data',
        data: {
          skill: 'check-availability',
          available: result.available,
          status: result.status,
          date: params.date,
          startTime: params.startTime,
          endTime: params.endTime,
          busySlots: result.busySlots,
        },
      },
    ];

    return {
      status: {
        state: 'completed',
        message: { role: 'agent', parts },
      },
    };
  }

  /**
   * Execute get-busy-slots skill
   */
  protected executeGetBusySlots(params: { date: string }): AgentResponse {
    const result = getBusySlots(this.config.id, params.date);

    let text = `Busy times on ${result.date}:\n`;
    if (result.busySlots.length === 0) {
      text = `No scheduled events on ${result.date}. The calendar is clear!`;
    } else {
      for (const slot of result.busySlots) {
        const title = slot.title ? ` - ${slot.title}` : '';
        text += `• ${slot.startTime} - ${slot.endTime}${title}\n`;
      }
    }

    if (result.freeSlots.length > 0) {
      text += `\nFree time slots:\n`;
      for (const slot of result.freeSlots) {
        text += `• ${slot.startTime} - ${slot.endTime}\n`;
      }
    }

    const parts: Part[] = [
      { type: 'text', text },
      {
        type: 'data',
        data: {
          skill: 'get-busy-slots',
          date: result.date,
          busySlots: result.busySlots,
          freeSlots: result.freeSlots,
        },
      },
    ];

    return {
      status: {
        state: 'completed',
        message: { role: 'agent', parts },
      },
    };
  }

  /**
   * Execute schedule-meeting skill
   */
  protected executeScheduleMeeting(params: {
    title: string;
    date: string;
    startTime: string;
    endTime: string;
    description?: string;
  }): AgentResponse {
    const result = scheduleMeeting(this.config.id, params);

    const parts: Part[] = [
      { type: 'text', text: result.message },
      {
        type: 'data',
        data: {
          skill: 'schedule-meeting',
          success: result.success,
          meetingId: result.meetingId,
          conflict: result.conflict,
          ...params,
        },
      },
    ];

    return {
      status: {
        state: result.success ? 'completed' : 'failed',
        message: { role: 'agent', parts },
      },
    };
  }

  /**
   * Create a success response
   */
  protected createSuccessResponse(text: string): AgentResponse {
    return {
      status: {
        state: 'completed',
        message: { role: 'agent', parts: [{ type: 'text', text }] },
      },
    };
  }

  /**
   * Create an error response
   */
  protected createErrorResponse(message: string): AgentResponse {
    return {
      status: {
        state: 'failed',
        message: { role: 'agent', parts: [{ type: 'text', text: `Error: ${message}` }] },
      },
    };
  }

  /**
   * Create an input-required response
   */
  protected createInputRequiredResponse(message: string): AgentResponse {
    return {
      status: {
        state: 'input-required',
        message: { role: 'agent', parts: [{ type: 'text', text: message }] },
      },
    };
  }

  /**
   * Helper to add one hour to a time string
   */
  protected addHour(time: string): string {
    const [hours, minutes] = time.split(':').map(Number);
    const newHours = (hours + 1) % 24;
    return `${newHours.toString().padStart(2, '0')}:${minutes.toString().padStart(2, '0')}`;
  }
}

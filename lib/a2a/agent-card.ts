import type { AgentCard, AgentSkill, JsonSchema } from './types';

/**
 * Create an Agent Card for an agent
 */
export function createAgentCard(params: {
  name: string;
  description?: string;
  url: string;
  skills: AgentSkill[];
  version?: string;
}): AgentCard {
  return {
    name: params.name,
    description: params.description,
    url: params.url,
    version: params.version || '1.0.0',
    capabilities: {
      streaming: false,
      pushNotifications: false,
      stateTransitionHistory: true,
    },
    defaultInputModes: ['text'],
    defaultOutputModes: ['text'],
    skills: params.skills,
    protocolVersions: ['1.0'],
  };
}

/**
 * Standard skill definitions for the meeting scheduling demo
 */
export const STANDARD_SKILLS: Record<string, AgentSkill> = {
  'check-availability': {
    id: 'check-availability',
    name: 'Check Availability',
    description: 'Check if the agent owner is available during a specific time range. Returns availability status without revealing private schedule details.',
    tags: ['schedule', 'availability', 'privacy'],
    examples: [
      'Are you available on 2024-01-15 from 14:00 to 15:00?',
      'Check availability for tomorrow afternoon',
    ],
    inputModes: ['text', 'data'],
    outputModes: ['text', 'data'],
    inputSchema: {
      type: 'object',
      properties: {
        date: {
          type: 'string',
          description: 'Date in YYYY-MM-DD format',
        },
        startTime: {
          type: 'string',
          description: 'Start time in HH:mm format',
        },
        endTime: {
          type: 'string',
          description: 'End time in HH:mm format',
        },
      },
      required: ['date', 'startTime', 'endTime'],
    } as JsonSchema,
    outputSchema: {
      type: 'object',
      properties: {
        available: {
          type: 'boolean',
          description: 'Whether the time slot is available',
        },
        status: {
          type: 'string',
          enum: ['available', 'busy', 'tentative'],
          description: 'Availability status',
        },
        message: {
          type: 'string',
          description: 'Human-readable message',
        },
      },
      required: ['available', 'status'],
    } as JsonSchema,
  },
  'get-busy-slots': {
    id: 'get-busy-slots',
    name: 'Get Busy Slots',
    description: 'Get all busy time slots for a specific date. Returns only busy/available status, not event details.',
    tags: ['schedule', 'availability', 'privacy'],
    examples: [
      'What times are you busy today?',
      'Get busy slots for 2024-01-15',
    ],
    inputModes: ['text', 'data'],
    outputModes: ['text', 'data'],
    inputSchema: {
      type: 'object',
      properties: {
        date: {
          type: 'string',
          description: 'Date in YYYY-MM-DD format',
        },
      },
      required: ['date'],
    } as JsonSchema,
    outputSchema: {
      type: 'object',
      properties: {
        date: {
          type: 'string',
          description: 'The queried date',
        },
        busySlots: {
          type: 'array',
          items: {
            type: 'object',
            properties: {
              startTime: { type: 'string' },
              endTime: { type: 'string' },
              status: { type: 'string' },
            },
          },
          description: 'List of busy time slots',
        },
      },
      required: ['date', 'busySlots'],
    } as JsonSchema,
  },
  'schedule-meeting': {
    id: 'schedule-meeting',
    name: 'Schedule Meeting',
    description: 'Schedule a meeting at a specific time. Adds the meeting to the calendar if the time slot is available.',
    tags: ['schedule', 'meeting'],
    examples: [
      'Schedule a meeting on 2024-01-15 from 14:00 to 15:00',
      'Book a meeting called "Team Sync" tomorrow at 10am',
    ],
    inputModes: ['text', 'data'],
    outputModes: ['text', 'data'],
    inputSchema: {
      type: 'object',
      properties: {
        title: {
          type: 'string',
          description: 'Meeting title',
        },
        date: {
          type: 'string',
          description: 'Date in YYYY-MM-DD format',
        },
        startTime: {
          type: 'string',
          description: 'Start time in HH:mm format',
        },
        endTime: {
          type: 'string',
          description: 'End time in HH:mm format',
        },
        description: {
          type: 'string',
          description: 'Optional meeting description',
        },
      },
      required: ['title', 'date', 'startTime', 'endTime'],
    } as JsonSchema,
    outputSchema: {
      type: 'object',
      properties: {
        success: {
          type: 'boolean',
          description: 'Whether the meeting was scheduled successfully',
        },
        meetingId: {
          type: 'string',
          description: 'ID of the created meeting',
        },
        message: {
          type: 'string',
          description: 'Human-readable result message',
        },
      },
      required: ['success', 'message'],
    } as JsonSchema,
  },
  'debate-argue': {
    id: 'debate-argue',
    name: 'Debate Argue',
    description: 'Present an argument for or against a given topic based on the agent\'s assigned stance.',
    tags: ['debate', 'argument'],
    examples: [
      'Present your argument about remote work',
      'Argue your position on AI regulation',
    ],
    inputModes: ['data'],
    outputModes: ['text', 'data'],
    inputSchema: {
      type: 'object',
      properties: {
        topic: {
          type: 'string',
          description: 'The debate topic',
        },
      },
      required: ['topic'],
    } as JsonSchema,
    outputSchema: {
      type: 'object',
      properties: {
        stance: {
          type: 'string',
          enum: ['pro', 'con'],
          description: 'The agent\'s stance',
        },
        argument: {
          type: 'string',
          description: 'The generated argument text',
        },
        perspective: {
          type: 'string',
          description: 'The perspective used (ethics, practical, economic, innovation)',
        },
      },
      required: ['stance', 'argument'],
    } as JsonSchema,
  },
  'debate-rebut': {
    id: 'debate-rebut',
    name: 'Debate Rebut',
    description: 'Present a rebuttal to the opponent\'s argument on the given topic.',
    tags: ['debate', 'rebuttal'],
    examples: [
      'Rebut the opponent\'s argument about remote work',
    ],
    inputModes: ['data'],
    outputModes: ['text', 'data'],
    inputSchema: {
      type: 'object',
      properties: {
        topic: {
          type: 'string',
          description: 'The debate topic',
        },
        opponentArgument: {
          type: 'string',
          description: 'The opponent\'s argument to rebut',
        },
      },
      required: ['topic', 'opponentArgument'],
    } as JsonSchema,
    outputSchema: {
      type: 'object',
      properties: {
        stance: {
          type: 'string',
          enum: ['pro', 'con'],
          description: 'The agent\'s stance',
        },
        rebuttal: {
          type: 'string',
          description: 'The generated rebuttal text',
        },
      },
      required: ['stance', 'rebuttal'],
    } as JsonSchema,
  },
};

/**
 * Get base URL for the current environment
 */
export function getBaseUrl(): string {
  // In server context, use environment variable or default
  if (typeof window === 'undefined') {
    return process.env.NEXT_PUBLIC_BASE_URL || 'http://localhost:3000';
  }
  // In browser context, use window location
  return window.location.origin;
}

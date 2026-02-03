import type { Message, Part, TextPart, DataPart, FilePart } from './types';

/**
 * Create a text message
 */
export function createTextMessage(role: 'user' | 'agent', text: string): Message {
  return {
    role,
    parts: [{ type: 'text', text }],
  };
}

/**
 * Create a data message
 */
export function createDataMessage(
  role: 'user' | 'agent',
  data: Record<string, unknown>,
  textPrefix?: string
): Message {
  const parts: Part[] = [];

  if (textPrefix) {
    parts.push({ type: 'text', text: textPrefix });
  }

  parts.push({ type: 'data', data });

  return {
    role,
    parts,
  };
}

/**
 * Extract text content from a message
 */
export function extractTextContent(message: Message): string {
  return message.parts
    .filter((part): part is TextPart => part.type === 'text')
    .map((part) => part.text)
    .join('\n');
}

/**
 * Extract data content from a message
 */
export function extractDataContent(message: Message): Record<string, unknown>[] {
  return message.parts
    .filter((part): part is DataPart => part.type === 'data')
    .map((part) => part.data);
}

/**
 * Extract file content from a message
 */
export function extractFileContent(message: Message): FilePart[] {
  return message.parts.filter((part): part is FilePart => part.type === 'file');
}

/**
 * Check if message contains a specific data field
 */
export function hasDataField(message: Message, field: string): boolean {
  const dataContents = extractDataContent(message);
  return dataContents.some((data) => field in data);
}

/**
 * Get a specific data field from a message
 */
export function getDataField<T = unknown>(
  message: Message,
  field: string
): T | undefined {
  const dataContents = extractDataContent(message);
  for (const data of dataContents) {
    if (field in data) {
      return data[field] as T;
    }
  }
  return undefined;
}

/**
 * Parse a structured request from message text
 * Supports patterns like:
 * - "Check availability for 2024-01-15 from 14:00 to 15:00"
 * - "Schedule meeting 'Team Sync' on 2024-01-15 at 10:00"
 */
export function parseScheduleRequest(text: string): {
  intent: 'check-availability' | 'get-busy-slots' | 'schedule-meeting' | 'unknown';
  params: Record<string, string | undefined>;
} {
  const lowerText = text.toLowerCase();

  // Check availability intent
  if (
    lowerText.includes('available') ||
    lowerText.includes('availability') ||
    lowerText.includes('free')
  ) {
    const dateMatch = text.match(/(\d{4}-\d{2}-\d{2})/);
    const timeRangeMatch = text.match(/(\d{1,2}:\d{2})\s*(?:to|-)\s*(\d{1,2}:\d{2})/);

    return {
      intent: 'check-availability',
      params: {
        date: dateMatch?.[1],
        startTime: timeRangeMatch?.[1],
        endTime: timeRangeMatch?.[2],
      },
    };
  }

  // Get busy slots intent
  if (
    lowerText.includes('busy') ||
    lowerText.includes('schedule') && (lowerText.includes('show') || lowerText.includes('get') || lowerText.includes('what'))
  ) {
    const dateMatch = text.match(/(\d{4}-\d{2}-\d{2})/);
    const todayMatch = lowerText.includes('today');

    return {
      intent: 'get-busy-slots',
      params: {
        date: dateMatch?.[1] || (todayMatch ? 'today' : undefined),
      },
    };
  }

  // Schedule meeting intent
  if (
    lowerText.includes('schedule') ||
    lowerText.includes('book') ||
    lowerText.includes('create meeting')
  ) {
    const dateMatch = text.match(/(\d{4}-\d{2}-\d{2})/);
    const timeRangeMatch = text.match(/(\d{1,2}:\d{2})\s*(?:to|-)\s*(\d{1,2}:\d{2})/);
    const singleTimeMatch = text.match(/at\s+(\d{1,2}:\d{2})/);
    const titleMatch = text.match(/['"]([^'"]+)['"]/);

    return {
      intent: 'schedule-meeting',
      params: {
        title: titleMatch?.[1],
        date: dateMatch?.[1],
        startTime: timeRangeMatch?.[1] || singleTimeMatch?.[1],
        endTime: timeRangeMatch?.[2],
      },
    };
  }

  return {
    intent: 'unknown',
    params: {},
  };
}

/**
 * Format availability response as natural language
 */
export function formatAvailabilityResponse(params: {
  available: boolean;
  date: string;
  startTime?: string;
  endTime?: string;
  agentName: string;
}): string {
  if (params.available) {
    if (params.startTime && params.endTime) {
      return `${params.agentName} is available on ${params.date} from ${params.startTime} to ${params.endTime}.`;
    }
    return `${params.agentName} is available on ${params.date}.`;
  } else {
    if (params.startTime && params.endTime) {
      return `${params.agentName} is not available on ${params.date} from ${params.startTime} to ${params.endTime}.`;
    }
    return `${params.agentName} is not available during that time.`;
  }
}

/**
 * Format busy slots response as natural language
 */
export function formatBusySlotsResponse(params: {
  date: string;
  busySlots: { startTime: string; endTime: string; status: string }[];
  agentName: string;
}): string {
  if (params.busySlots.length === 0) {
    return `${params.agentName} has no scheduled events on ${params.date} and is available all day.`;
  }

  const slotDescriptions = params.busySlots.map(
    (slot) => `${slot.startTime} - ${slot.endTime} (${slot.status})`
  );

  return `${params.agentName}'s busy times on ${params.date}:\n${slotDescriptions.map(s => `• ${s}`).join('\n')}`;
}

import type { Schedule } from '../db/queries/schedules';
import {
  type PrivacyContext,
  type PrivacyRule,
  SCHEDULE_PRIVACY_RULES,
  isSensitiveField,
} from './rules';

/**
 * Public schedule representation (privacy-filtered)
 */
export interface PublicSchedule {
  startTime: string;
  endTime: string;
  status: 'busy' | 'available' | 'tentative';
  title?: string; // Only included for non-private events to external agents, or for owner
}

/**
 * Apply privacy rules to a single schedule entry
 */
export function filterSchedule(
  schedule: Schedule,
  context: PrivacyContext
): PublicSchedule {
  // Owner always gets full access
  if (context.requesterType === 'owner') {
    return {
      startTime: schedule.startTime,
      endTime: schedule.endTime,
      status: schedule.visibility as 'busy' | 'available' | 'tentative',
      title: schedule.title,
    };
  }

  const filteredContext: PrivacyContext = {
    ...context,
    isPrivate: schedule.isPrivate,
  };

  const result: PublicSchedule = {
    startTime: schedule.startTime,
    endTime: schedule.endTime,
    status: schedule.visibility as 'busy' | 'available' | 'tentative',
  };

  // Apply privacy rules for title
  const shouldHideTitle = SCHEDULE_PRIVACY_RULES.some(
    (rule) =>
      rule.field === 'title' &&
      rule.condition?.(schedule.title, filteredContext)
  );

  if (!shouldHideTitle && !schedule.isPrivate) {
    result.title = schedule.title;
  }

  return result;
}

/**
 * Apply privacy rules to multiple schedules
 */
export function filterSchedules(
  schedules: Schedule[],
  context: PrivacyContext
): PublicSchedule[] {
  return schedules.map((schedule) => filterSchedule(schedule, context));
}

/**
 * Apply privacy filter to any object based on rules
 */
export function applyPrivacyFilter<T extends Record<string, unknown>>(
  data: T,
  rules: PrivacyRule[],
  context: PrivacyContext
): Partial<T> {
  const result: Partial<T> = {};

  for (const [key, value] of Object.entries(data)) {
    // Skip sensitive fields for external requests
    if (context.requesterType === 'external' && isSensitiveField(key)) {
      continue;
    }

    // Check rules for this field
    const applicableRule = rules.find(
      (rule) => rule.field === key && (!rule.condition || rule.condition(value, context))
    );

    if (!applicableRule) {
      result[key as keyof T] = value as T[keyof T];
      continue;
    }

    switch (applicableRule.action) {
      case 'hide':
        // Don't include the field
        break;
      case 'mask':
        result[key as keyof T] = '***' as T[keyof T];
        break;
      case 'replace':
        result[key as keyof T] = (applicableRule.replacement ?? '') as T[keyof T];
        break;
    }
  }

  return result;
}

/**
 * Create a privacy-safe availability response
 * This is the primary method for external agents to query availability
 */
export function createAvailabilityResponse(params: {
  agentId: string;
  date: string;
  schedules: Schedule[];
  queryStartTime?: string;
  queryEndTime?: string;
}): {
  available: boolean;
  busySlots: PublicSchedule[];
  freeSlots: { startTime: string; endTime: string }[];
} {
  const context: PrivacyContext = { requesterType: 'external' };
  const publicSchedules = filterSchedules(params.schedules, context);

  // Calculate free slots
  const busySlots = publicSchedules.map((s) => ({
    start: s.startTime,
    end: s.endTime,
  }));

  // Define working hours (9 AM - 6 PM)
  const workStart = '09:00';
  const workEnd = '18:00';

  const freeSlots = calculateFreeSlots(busySlots, workStart, workEnd);

  // Check if queried time range is available
  let available = true;
  if (params.queryStartTime && params.queryEndTime) {
    available = !busySlots.some((slot) => {
      return (
        (params.queryStartTime! < slot.end && params.queryEndTime! > slot.start)
      );
    });
  }

  return {
    available,
    busySlots: publicSchedules,
    freeSlots,
  };
}

/**
 * Calculate free time slots given busy slots and working hours
 */
function calculateFreeSlots(
  busySlots: { start: string; end: string }[],
  workStart: string,
  workEnd: string
): { startTime: string; endTime: string }[] {
  // Sort busy slots by start time
  const sortedBusy = [...busySlots].sort((a, b) => a.start.localeCompare(b.start));

  const freeSlots: { startTime: string; endTime: string }[] = [];
  let currentStart = workStart;

  for (const busy of sortedBusy) {
    // If there's a gap before this busy slot
    if (currentStart < busy.start && currentStart < workEnd) {
      freeSlots.push({
        startTime: currentStart,
        endTime: busy.start < workEnd ? busy.start : workEnd,
      });
    }

    // Move current start to end of busy slot
    if (busy.end > currentStart) {
      currentStart = busy.end;
    }
  }

  // Add remaining time after last busy slot
  if (currentStart < workEnd) {
    freeSlots.push({
      startTime: currentStart,
      endTime: workEnd,
    });
  }

  return freeSlots;
}

/**
 * Log privacy-related actions for audit purposes
 */
export function logPrivacyAction(params: {
  action: 'filter' | 'access' | 'deny';
  agentId: string;
  requesterId?: string;
  dataType: string;
  fieldsAffected?: string[];
}): void {
  // In a production system, this would write to an audit log
  console.log('[Privacy]', {
    timestamp: new Date().toISOString(),
    ...params,
  });
}

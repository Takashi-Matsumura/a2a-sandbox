import { createSchedule, hasConflict } from '../../db/queries/schedules';
import { getTodayString } from '../../utils/date';

export interface ScheduleMeetingParams {
  title: string;
  date: string;
  startTime: string;
  endTime: string;
  description?: string;
  isPrivate?: boolean;
}

export interface ScheduleMeetingResult {
  success: boolean;
  meetingId?: string;
  message: string;
  conflict?: boolean;
}

/**
 * Schedule a meeting for an agent
 * Checks for conflicts before creating the meeting
 */
export function scheduleMeeting(
  agentId: string,
  params: ScheduleMeetingParams
): ScheduleMeetingResult {
  const date = params.date === 'today' ? getTodayString() : params.date;

  // Check for conflicts
  const conflict = hasConflict(agentId, date, params.startTime, params.endTime);

  if (conflict) {
    return {
      success: false,
      message: `Cannot schedule meeting "${params.title}" on ${date} from ${params.startTime} to ${params.endTime}. There is a scheduling conflict.`,
      conflict: true,
    };
  }

  // Create the schedule
  const schedule = createSchedule({
    agentId,
    title: params.title,
    description: params.description,
    startTime: params.startTime,
    endTime: params.endTime,
    eventDate: date,
    isPrivate: params.isPrivate ?? false,
    visibility: 'busy',
  });

  return {
    success: true,
    meetingId: schedule.id,
    message: `Successfully scheduled "${params.title}" on ${date} from ${params.startTime} to ${params.endTime}.`,
  };
}

/**
 * Find common available time slots across multiple agents
 * This is the core of the meeting coordination feature
 */
export function findCommonAvailability(
  agentIds: string[],
  date: string,
  busySlotsByAgent: Map<string, { startTime: string; endTime: string }[]>
): { startTime: string; endTime: string }[] {
  const actualDate = date === 'today' ? getTodayString() : date;

  // Define working hours (9 AM - 6 PM)
  const workStart = '09:00';
  const workEnd = '18:00';

  // Generate all possible 30-minute slots
  const allSlots: { startTime: string; endTime: string }[] = [];
  let currentHour = 9;
  let currentMinute = 0;

  while (currentHour < 18) {
    const startTime = `${currentHour.toString().padStart(2, '0')}:${currentMinute.toString().padStart(2, '0')}`;
    currentMinute += 30;
    if (currentMinute >= 60) {
      currentMinute = 0;
      currentHour += 1;
    }
    const endTime = `${currentHour.toString().padStart(2, '0')}:${currentMinute.toString().padStart(2, '0')}`;
    allSlots.push({ startTime, endTime });
  }

  // Filter to slots that are free for all agents
  const commonFreeSlots = allSlots.filter((slot) => {
    for (const agentId of agentIds) {
      const busySlots = busySlotsByAgent.get(agentId) || [];

      // Check if this slot conflicts with any busy slot for this agent
      const hasConflict = busySlots.some((busy) => {
        return slot.startTime < busy.endTime && slot.endTime > busy.startTime;
      });

      if (hasConflict) {
        return false;
      }
    }
    return true;
  });

  // Merge adjacent slots
  const mergedSlots: { startTime: string; endTime: string }[] = [];
  for (const slot of commonFreeSlots) {
    const lastSlot = mergedSlots[mergedSlots.length - 1];
    if (lastSlot && lastSlot.endTime === slot.startTime) {
      lastSlot.endTime = slot.endTime;
    } else {
      mergedSlots.push({ ...slot });
    }
  }

  return mergedSlots;
}

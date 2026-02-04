import { getAgentSchedules } from '../../db/queries/schedules';
import { createAvailabilityResponse, type PublicSchedule } from '../../privacy/filter';
import { getTodayString } from '../../utils/date';

export interface CheckAvailabilityParams {
  date: string;
  startTime?: string;
  endTime?: string;
}

export interface CheckAvailabilityResult {
  available: boolean;
  status: 'available' | 'busy' | 'tentative';
  message: string;
  busySlots?: PublicSchedule[];
}

/**
 * Check if an agent is available during a specific time range
 * This skill respects privacy by not revealing the details of private events
 */
export function checkAvailability(
  agentId: string,
  params: CheckAvailabilityParams
): CheckAvailabilityResult {
  const date = params.date === 'today' ? getTodayString() : params.date;

  // Get the agent's schedules for the date
  const schedules = getAgentSchedules(agentId, date);

  // Create privacy-filtered availability response
  const availability = createAvailabilityResponse({
    agentId,
    date,
    schedules,
    queryStartTime: params.startTime,
    queryEndTime: params.endTime,
  });

  // Build response message
  let message: string;
  let status: 'available' | 'busy' | 'tentative';

  if (params.startTime && params.endTime) {
    if (availability.available) {
      message = `${date} の ${params.startTime} から ${params.endTime} は空いています。`;
      status = 'available';
    } else {
      message = `${date} の ${params.startTime} から ${params.endTime} は予定があります。`;
      status = 'busy';
    }
  } else {
    // General availability check for the day
    if (availability.freeSlots.length > 0) {
      const freeTimesList = availability.freeSlots
        .map((slot) => `${slot.startTime}-${slot.endTime}`)
        .join(', ');
      message = `${date} の空き時間: ${freeTimesList}`;
      status = 'available';
    } else {
      message = `${date} は終日予定が入っています。`;
      status = 'busy';
    }
  }

  return {
    available: availability.available,
    status,
    message,
    busySlots: availability.busySlots,
  };
}

/**
 * Get all busy time slots for an agent on a specific date
 * Returns privacy-filtered results
 */
export function getBusySlots(
  agentId: string,
  date: string
): {
  date: string;
  busySlots: PublicSchedule[];
  freeSlots: { startTime: string; endTime: string }[];
} {
  const actualDate = date === 'today' ? getTodayString() : date;
  const schedules = getAgentSchedules(agentId, actualDate);

  const availability = createAvailabilityResponse({
    agentId,
    date: actualDate,
    schedules,
  });

  return {
    date: actualDate,
    busySlots: availability.busySlots,
    freeSlots: availability.freeSlots,
  };
}

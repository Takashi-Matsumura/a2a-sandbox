import {
  format,
  parse,
  isWithinInterval,
  addMinutes,
  isBefore,
  isAfter,
  areIntervalsOverlapping,
  parseISO,
  startOfDay,
  endOfDay,
  eachHourOfInterval,
} from 'date-fns';

/**
 * Parse time string (HH:mm) to Date object for a given date
 */
export function parseTime(timeStr: string, dateStr: string): Date {
  const date = parseISO(dateStr);
  const [hours, minutes] = timeStr.split(':').map(Number);
  date.setHours(hours, minutes, 0, 0);
  return date;
}

/**
 * Format Date to time string (HH:mm)
 */
export function formatTime(date: Date): string {
  return format(date, 'HH:mm');
}

/**
 * Format Date to ISO date string (YYYY-MM-DD)
 */
export function formatDate(date: Date): string {
  return format(date, 'yyyy-MM-dd');
}

/**
 * Format Date to full datetime string
 */
export function formatDateTime(date: Date): string {
  return format(date, 'yyyy-MM-dd HH:mm');
}

/**
 * Check if two time intervals overlap
 */
export function intervalsOverlap(
  start1: Date,
  end1: Date,
  start2: Date,
  end2: Date
): boolean {
  return areIntervalsOverlapping(
    { start: start1, end: end1 },
    { start: start2, end: end2 }
  );
}

/**
 * Check if a time is within a time range
 */
export function isTimeInRange(time: Date, start: Date, end: Date): boolean {
  return isWithinInterval(time, { start, end });
}

/**
 * Get all hour slots for a given date
 */
export function getHourSlots(dateStr: string): { start: Date; end: Date }[] {
  const date = parseISO(dateStr);
  const dayStart = startOfDay(date);
  const dayEnd = endOfDay(date);

  const hours = eachHourOfInterval({ start: dayStart, end: dayEnd });

  return hours.slice(0, -1).map((hour) => ({
    start: hour,
    end: addMinutes(hour, 60),
  }));
}

/**
 * Find common available slots given multiple schedules
 */
export function findCommonAvailableSlots(
  schedules: { startTime: string; endTime: string }[][],
  dateStr: string,
  slotDuration: number = 60 // minutes
): { startTime: string; endTime: string }[] {
  const hourSlots = getHourSlots(dateStr);
  const availableSlots: { startTime: string; endTime: string }[] = [];

  for (const slot of hourSlots) {
    // Check if this slot conflicts with any schedule from any participant
    let isAvailable = true;

    for (const schedule of schedules) {
      for (const event of schedule) {
        const eventStart = parseTime(event.startTime, dateStr);
        const eventEnd = parseTime(event.endTime, dateStr);

        if (intervalsOverlap(slot.start, slot.end, eventStart, eventEnd)) {
          isAvailable = false;
          break;
        }
      }
      if (!isAvailable) break;
    }

    if (isAvailable) {
      availableSlots.push({
        startTime: formatTime(slot.start),
        endTime: formatTime(slot.end),
      });
    }
  }

  return availableSlots;
}

/**
 * Get current timestamp in ISO format
 */
export function getCurrentTimestamp(): string {
  return new Date().toISOString();
}

/**
 * Get today's date string (YYYY-MM-DD)
 */
export function getTodayString(): string {
  return formatDate(new Date());
}

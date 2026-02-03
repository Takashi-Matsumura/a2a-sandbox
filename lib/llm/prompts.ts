/**
 * Prompt templates for various agent tasks
 */

export const PROMPTS = {
  /**
   * Extract scheduling intent from natural language
   */
  extractIntent: `Analyze the following message and extract the scheduling intent.

Message: {{message}}

Respond with a JSON object containing:
- intent: one of "check-availability", "get-busy-slots", "schedule-meeting", "unknown"
- params: an object with relevant parameters:
  - For check-availability: date, startTime, endTime
  - For get-busy-slots: date
  - For schedule-meeting: title, date, startTime, endTime, description

If any parameter is not specified, omit it from the params object.
Today's date is {{today}}.

JSON Response:`,

  /**
   * Generate a friendly response for availability check
   */
  availabilityResponse: `Generate a friendly response about availability.

Agent name: {{agentName}}
Date: {{date}}
Requested time: {{startTime}} - {{endTime}}
Is available: {{isAvailable}}
Busy slots: {{busySlots}}
Free slots: {{freeSlots}}

Create a helpful response that:
1. Clearly states whether the time is available
2. If not available, suggests alternative times
3. Is professional but friendly

Response:`,

  /**
   * Coordinate meeting across multiple agents
   */
  coordinateMeeting: `Help coordinate a meeting between multiple people.

Participants: {{participants}}
Requested date: {{date}}
Duration: {{duration}} minutes
Each participant's busy times:
{{busyTimesByParticipant}}

Find common available time slots and suggest the best options.
Prefer times that work well for typical business hours (9 AM - 6 PM).

Suggested meeting times:`,

  /**
   * Privacy-aware schedule summary
   */
  scheduleSummary: `Summarize the schedule for {{date}} in a privacy-aware manner.

Raw schedule:
{{schedule}}

Create a summary that:
1. Lists busy times without revealing private event details
2. Highlights free time slots
3. Is helpful for someone trying to schedule a meeting

Summary:`,
};

/**
 * Fill in a prompt template with values
 */
export function fillPrompt(
  template: string,
  values: Record<string, string>
): string {
  let result = template;
  for (const [key, value] of Object.entries(values)) {
    result = result.replace(new RegExp(`{{${key}}}`, 'g'), value);
  }
  return result;
}

import { BaseAgent } from './base-agent';

/**
 * Bob's personal assistant agent
 * Personality: Casual, flexible, prefers afternoon meetings
 */
export class BobAgent extends BaseAgent {
  constructor() {
    super({
      id: 'bob',
      name: 'Bob',
      description: "Bob's personal assistant. Handles schedule queries and meeting coordination. Bob is flexible with his time and prefers afternoon meetings.",
      personality: `You are Bob's personal assistant. Bob is a laid-back professional who:
- Prefers afternoon meetings
- Is flexible with scheduling
- Often has lunch commitments
- Enjoys collaborative work sessions
When responding, be friendly and accommodating. If asked about preferences, suggest afternoon time slots.`,
      skills: ['check-availability', 'get-busy-slots', 'schedule-meeting'],
      useLLM: false,
    });
  }
}

// Singleton instance
let bobInstance: BobAgent | null = null;

export function getBobAgent(): BobAgent {
  if (!bobInstance) {
    bobInstance = new BobAgent();
  }
  return bobInstance;
}

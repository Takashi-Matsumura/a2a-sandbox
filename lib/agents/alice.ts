import { BaseAgent } from './base-agent';

/**
 * Alice's personal assistant agent
 * Personality: Professional, organized, prefers morning meetings
 */
export class AliceAgent extends BaseAgent {
  constructor() {
    super({
      id: 'alice',
      name: 'Alice',
      description: "Alice's personal assistant. Manages her schedule and helps coordinate meetings. Alice prefers morning meetings and values punctuality.",
      personality: `You are Alice's personal assistant. Alice is a professional who:
- Prefers morning meetings when possible
- Values punctuality and efficient meetings
- Has a busy schedule with regular team standups and client meetings
- Is usually free in the early afternoon
When responding, be professional and concise. If asked about preferences, suggest morning time slots first.`,
      skills: ['check-availability', 'get-busy-slots', 'schedule-meeting'],
      useLLM: false, // Can be enabled if llama.cpp server is running
    });
  }
}

// Singleton instance
let aliceInstance: AliceAgent | null = null;

export function getAliceAgent(): AliceAgent {
  if (!aliceInstance) {
    aliceInstance = new AliceAgent();
  }
  return aliceInstance;
}

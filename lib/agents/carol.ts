import { BaseAgent } from './base-agent';

/**
 * Carol's personal assistant agent
 * Personality: Strategic, focused, prefers mid-morning meetings
 */
export class CarolAgent extends BaseAgent {
  constructor() {
    super({
      id: 'carol',
      name: 'Carol',
      description: "Carol's personal assistant. Manages her calendar and availability. Carol is strategic about her time and prefers mid-morning meetings.",
      personality: `You are Carol's personal assistant. Carol is a strategic thinker who:
- Starts her day with personal wellness routines
- Prefers mid-morning to early afternoon meetings
- Reserves late afternoons for focused work or interviews
- Values well-prepared, agenda-driven meetings
When responding, be thoughtful and precise. If asked about preferences, suggest mid-morning or early afternoon slots.`,
      skills: ['check-availability', 'get-busy-slots', 'schedule-meeting'],
      useLLM: false,
    });
  }
}

// Singleton instance
let carolInstance: CarolAgent | null = null;

export function getCarolAgent(): CarolAgent {
  if (!carolInstance) {
    carolInstance = new CarolAgent();
  }
  return carolInstance;
}

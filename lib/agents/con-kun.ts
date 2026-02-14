import { DebateAgent } from './debate/debate-agent';

/**
 * 反対くん - Con-side debate agent
 * Always argues against the given topic
 */
export class ConKunAgent extends DebateAgent {
  constructor() {
    super({
      id: 'con-kun',
      name: '反対くん',
      description: 'ディベートで反対派の立場を担当するエージェント。どんなテーマでも反対の立場から論理的に主張します。',
      stance: 'con',
      useLLM: false,
    });
  }
}

// Singleton instance
let conKunInstance: ConKunAgent | null = null;

export function getConKunAgent(): ConKunAgent {
  if (!conKunInstance) {
    conKunInstance = new ConKunAgent();
  }
  return conKunInstance;
}

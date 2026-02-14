import { DebateAgent } from './debate/debate-agent';

/**
 * 賛成くん - Pro-side debate agent
 * Always argues in favor of the given topic
 */
export class ProKunAgent extends DebateAgent {
  constructor() {
    super({
      id: 'pro-kun',
      name: '賛成くん',
      description: 'ディベートで賛成派の立場を担当するエージェント。どんなテーマでも賛成の立場から論理的に主張します。',
      stance: 'pro',
      useLLM: false,
    });
  }
}

// Singleton instance
let proKunInstance: ProKunAgent | null = null;

export function getProKunAgent(): ProKunAgent {
  if (!proKunInstance) {
    proKunInstance = new ProKunAgent();
  }
  return proKunInstance;
}

import type { AgentExecutor, AgentCard } from '../a2a/types';
import { BaseAgent } from './base-agent';
import { getAliceAgent } from './alice';
import { getBobAgent } from './bob';
import { getCarolAgent } from './carol';

/**
 * Agent registry for managing multiple agents
 */
class AgentRegistry {
  private agents: Map<string, BaseAgent> = new Map();

  constructor() {
    // Register default agents
    this.register(getAliceAgent());
    this.register(getBobAgent());
    this.register(getCarolAgent());
  }

  /**
   * Register an agent
   */
  register(agent: BaseAgent): void {
    this.agents.set(agent.id, agent);
  }

  /**
   * Get an agent by ID
   */
  get(id: string): BaseAgent | undefined {
    return this.agents.get(id);
  }

  /**
   * Get all registered agents
   */
  getAll(): BaseAgent[] {
    return Array.from(this.agents.values());
  }

  /**
   * Get all agent IDs
   */
  getIds(): string[] {
    return Array.from(this.agents.keys());
  }

  /**
   * Get agent cards for all registered agents
   */
  getAgentCards(): AgentCard[] {
    return this.getAll().map((agent) => agent.getAgentCard());
  }

  /**
   * Get agent card for a specific agent
   */
  getAgentCard(id: string): AgentCard | undefined {
    const agent = this.get(id);
    return agent?.getAgentCard();
  }

  /**
   * Check if an agent is registered
   */
  has(id: string): boolean {
    return this.agents.has(id);
  }

  /**
   * Unregister an agent
   */
  unregister(id: string): boolean {
    return this.agents.delete(id);
  }
}

// Singleton instance
let registryInstance: AgentRegistry | null = null;

export function getAgentRegistry(): AgentRegistry {
  if (!registryInstance) {
    registryInstance = new AgentRegistry();
  }
  return registryInstance;
}

/**
 * Get an agent executor by ID
 */
export function getAgentExecutor(id: string): AgentExecutor | undefined {
  return getAgentRegistry().get(id);
}

/**
 * Get all agent IDs
 */
export function getAllAgentIds(): string[] {
  return getAgentRegistry().getIds();
}

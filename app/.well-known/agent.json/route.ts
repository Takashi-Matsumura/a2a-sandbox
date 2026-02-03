import { NextResponse } from 'next/server';
import { getAgentRegistry } from '@/lib/agents/registry';

/**
 * GET /.well-known/agent.json
 * Returns the Agent Card for discovery
 * This is the standard endpoint for A2A agent discovery
 */
export async function GET(request: Request) {
  const url = new URL(request.url);
  const agentId = url.searchParams.get('agent');

  const registry = getAgentRegistry();

  if (agentId) {
    // Return specific agent's card
    const agentCard = registry.getAgentCard(agentId);
    if (!agentCard) {
      return NextResponse.json(
        { error: `Agent not found: ${agentId}` },
        { status: 404 }
      );
    }
    return NextResponse.json(agentCard);
  }

  // Return all agent cards as an array
  const agentCards = registry.getAgentCards();

  return NextResponse.json({
    agents: agentCards,
    description: 'A2A Protocol Demo - Meeting Scheduling Agents',
    version: '1.0.0',
  });
}

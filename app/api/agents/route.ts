import { NextResponse } from 'next/server';
import { getAllAgents } from '@/lib/db/queries/agents';
import { getAgentRegistry } from '@/lib/agents/registry';
import { initializeSchema, isDatabaseInitialized } from '@/lib/db/schema';
import { seedDatabase } from '@/lib/db/seed';

/**
 * GET /api/agents
 * Returns list of all agents with their info and capabilities
 */
export async function GET() {
  try {
    // Ensure database is initialized
    if (!isDatabaseInitialized()) {
      initializeSchema();
      seedDatabase();
    }

    const agents = getAllAgents();
    const registry = getAgentRegistry();

    const agentData = agents.map((agent) => {
      const agentCard = registry.getAgentCard(agent.id);
      return {
        id: agent.id,
        name: agent.name,
        description: agent.description,
        endpoint: agent.endpoint,
        avatarColor: agent.avatar_color,
        isActive: agent.is_active === 1,
        capabilities: agentCard?.capabilities,
        skills: agentCard?.skills.map((s) => ({
          id: s.id,
          name: s.name,
          description: s.description,
        })),
      };
    });

    return NextResponse.json({
      agents: agentData,
      total: agentData.length,
    });
  } catch (error) {
    console.error('Error fetching agents:', error);
    return NextResponse.json(
      { error: 'Failed to fetch agents' },
      { status: 500 }
    );
  }
}

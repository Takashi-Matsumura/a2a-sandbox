import { NextResponse } from 'next/server';
import { getAgentById } from '@/lib/db/queries/agents';
import { getAgentRegistry, getAgentExecutor } from '@/lib/agents/registry';
import { createA2AHandler } from '@/lib/a2a/json-rpc-handler';
import { initializeSchema, isDatabaseInitialized } from '@/lib/db/schema';
import { seedDatabase } from '@/lib/db/seed';

interface RouteParams {
  params: Promise<{ agentId: string }>;
}

/**
 * GET /api/agents/[agentId]
 * Returns agent details and Agent Card
 */
export async function GET(request: Request, { params }: RouteParams) {
  try {
    const { agentId } = await params;

    // Ensure database is initialized
    if (!isDatabaseInitialized()) {
      initializeSchema();
      seedDatabase();
    }

    const agent = getAgentById(agentId);
    if (!agent) {
      return NextResponse.json(
        { error: `Agent not found: ${agentId}` },
        { status: 404 }
      );
    }

    const registry = getAgentRegistry();
    const agentCard = registry.getAgentCard(agentId);

    return NextResponse.json({
      id: agent.id,
      name: agent.name,
      description: agent.description,
      endpoint: agent.endpoint,
      avatarColor: agent.avatar_color,
      isActive: agent.is_active === 1,
      agentCard,
    });
  } catch (error) {
    console.error('Error fetching agent:', error);
    return NextResponse.json(
      { error: 'Failed to fetch agent' },
      { status: 500 }
    );
  }
}

/**
 * POST /api/agents/[agentId]
 * A2A JSON-RPC endpoint for agent communication
 */
export async function POST(request: Request, { params }: RouteParams) {
  try {
    const { agentId } = await params;

    // Ensure database is initialized
    if (!isDatabaseInitialized()) {
      initializeSchema();
      seedDatabase();
    }

    const executor = getAgentExecutor(agentId);
    if (!executor) {
      return NextResponse.json(
        {
          jsonrpc: '2.0',
          id: null,
          error: { code: -32000, message: `Agent not found: ${agentId}` },
        },
        { status: 404 }
      );
    }

    const handler = createA2AHandler(executor, agentId);
    return handler(request);
  } catch (error) {
    console.error('Error handling A2A request:', error);
    return NextResponse.json(
      {
        jsonrpc: '2.0',
        id: null,
        error: {
          code: -32603,
          message: error instanceof Error ? error.message : 'Internal error',
        },
      },
      { status: 500 }
    );
  }
}

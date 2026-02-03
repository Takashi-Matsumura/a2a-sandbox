import { NextResponse } from 'next/server';
import {
  getAgentSchedules,
  getPublicAgentSchedules,
  createSchedule,
} from '@/lib/db/queries/schedules';
import { getAgentById } from '@/lib/db/queries/agents';
import { getTodayString } from '@/lib/utils/date';
import { initializeSchema, isDatabaseInitialized } from '@/lib/db/schema';
import { seedDatabase } from '@/lib/db/seed';

interface RouteParams {
  params: Promise<{ agentId: string }>;
}

/**
 * GET /api/agents/[agentId]/schedule
 * Returns the agent's schedule for a given date
 * Query params:
 *   - date: YYYY-MM-DD format (default: today)
 *   - public: boolean - if true, returns privacy-filtered view
 */
export async function GET(request: Request, { params }: RouteParams) {
  try {
    const { agentId } = await params;
    const url = new URL(request.url);
    const date = url.searchParams.get('date') || getTodayString();
    const isPublic = url.searchParams.get('public') === 'true';

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

    if (isPublic) {
      // Return privacy-filtered schedule
      const publicSchedule = getPublicAgentSchedules(agentId, date);
      return NextResponse.json({
        agentId,
        agentName: agent.name,
        date,
        schedule: publicSchedule,
        privacyFiltered: true,
      });
    }

    // Return full schedule (for demo/owner view)
    const schedule = getAgentSchedules(agentId, date);
    return NextResponse.json({
      agentId,
      agentName: agent.name,
      date,
      schedule,
      privacyFiltered: false,
    });
  } catch (error) {
    console.error('Error fetching schedule:', error);
    return NextResponse.json(
      { error: 'Failed to fetch schedule' },
      { status: 500 }
    );
  }
}

/**
 * POST /api/agents/[agentId]/schedule
 * Add a new schedule entry for the agent
 */
export async function POST(request: Request, { params }: RouteParams) {
  try {
    const { agentId } = await params;
    const body = await request.json();

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

    // Validate required fields
    const { title, startTime, endTime, eventDate } = body;
    if (!title || !startTime || !endTime) {
      return NextResponse.json(
        { error: 'Missing required fields: title, startTime, endTime' },
        { status: 400 }
      );
    }

    const schedule = createSchedule({
      agentId,
      title,
      description: body.description,
      startTime,
      endTime,
      eventDate: eventDate || getTodayString(),
      isPrivate: body.isPrivate ?? false,
      visibility: body.visibility || 'busy',
    });

    return NextResponse.json({
      success: true,
      schedule,
    });
  } catch (error) {
    console.error('Error creating schedule:', error);
    return NextResponse.json(
      { error: 'Failed to create schedule' },
      { status: 500 }
    );
  }
}

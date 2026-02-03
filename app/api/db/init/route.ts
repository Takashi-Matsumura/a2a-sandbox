import { NextResponse } from 'next/server';
import { initializeSchema, resetDatabase, isDatabaseInitialized } from '@/lib/db/schema';
import { seedDatabase, getSeedSummary } from '@/lib/db/seed';

/**
 * GET /api/db/init
 * Check database status
 */
export async function GET() {
  try {
    const initialized = isDatabaseInitialized();
    const summary = initialized ? getSeedSummary() : { agents: 0, schedules: 0 };

    return NextResponse.json({
      initialized,
      ...summary,
    });
  } catch (error) {
    console.error('Error checking database:', error);
    return NextResponse.json(
      { error: 'Failed to check database status' },
      { status: 500 }
    );
  }
}

/**
 * POST /api/db/init
 * Initialize or reset database
 * Body:
 *   - reset: boolean - if true, drops all tables and recreates
 */
export async function POST(request: Request) {
  try {
    const body = await request.json().catch(() => ({}));
    const { reset } = body;

    if (reset) {
      resetDatabase();
      seedDatabase();
      return NextResponse.json({
        success: true,
        message: 'Database reset and seeded successfully',
        ...getSeedSummary(),
      });
    }

    const initialized = isDatabaseInitialized();
    if (initialized) {
      return NextResponse.json({
        success: true,
        message: 'Database already initialized',
        ...getSeedSummary(),
      });
    }

    initializeSchema();
    seedDatabase();

    return NextResponse.json({
      success: true,
      message: 'Database initialized and seeded successfully',
      ...getSeedSummary(),
    });
  } catch (error) {
    console.error('Error initializing database:', error);
    return NextResponse.json(
      { error: 'Failed to initialize database' },
      { status: 500 }
    );
  }
}

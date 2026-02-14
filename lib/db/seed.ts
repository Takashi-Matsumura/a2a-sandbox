import { getDatabase } from './connection';
import { initializeSchema } from './schema';
import { generateScheduleId } from '../utils/id';
import { getTodayString } from '../utils/date';

/**
 * Seed sample data for agents and their schedules
 */
export function seedDatabase(): void {
  const db = getDatabase();

  // Initialize schema first
  initializeSchema();

  // Check if already seeded
  const existingAgents = db.prepare('SELECT COUNT(*) as count FROM agents').get() as { count: number };
  if (existingAgents.count > 0) {
    console.log('Database already seeded');
    return;
  }

  const today = getTodayString();

  // Insert agents
  const insertAgent = db.prepare(`
    INSERT INTO agents (id, name, description, endpoint, avatar_color)
    VALUES (?, ?, ?, ?, ?)
  `);

  const agents = [
    {
      id: 'alice',
      name: 'Alice',
      description: "Aliceのパーソナルアシスタント。スケジュール管理と会議の調整をサポートします。",
      endpoint: '/api/agents/alice',
      avatarColor: '#ec4899', // pink
    },
    {
      id: 'bob',
      name: 'Bob',
      description: "Bobのパーソナルアシスタント。スケジュールの問い合わせと会議の調整を担当します。",
      endpoint: '/api/agents/bob',
      avatarColor: '#3b82f6', // blue
    },
    {
      id: 'carol',
      name: 'Carol',
      description: "Carolのパーソナルアシスタント。カレンダーと空き状況を管理します。",
      endpoint: '/api/agents/carol',
      avatarColor: '#22c55e', // green
    },
  ];

  for (const agent of agents) {
    insertAgent.run(
      agent.id,
      agent.name,
      agent.description,
      agent.endpoint,
      agent.avatarColor
    );
  }

  // Insert sample schedules for each agent
  const insertSchedule = db.prepare(`
    INSERT INTO schedules (id, agent_id, title, description, start_time, end_time, event_date, is_private, visibility)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
  `);

  // Alice's schedule - morning meetings, free afternoon
  const aliceSchedules = [
    {
      id: generateScheduleId(),
      title: 'Team Standup',
      description: 'Daily team sync meeting',
      startTime: '09:00',
      endTime: '09:30',
      isPrivate: 0, // work meeting, can show details
      visibility: 'busy',
    },
    {
      id: generateScheduleId(),
      title: 'Dentist Appointment',
      description: 'Regular checkup',
      startTime: '10:00',
      endTime: '11:00',
      isPrivate: 1, // personal, hide details
      visibility: 'busy',
    },
    {
      id: generateScheduleId(),
      title: 'Product Review',
      description: 'Quarterly product review with stakeholders',
      startTime: '11:30',
      endTime: '12:30',
      isPrivate: 0,
      visibility: 'busy',
    },
  ];

  for (const schedule of aliceSchedules) {
    insertSchedule.run(
      schedule.id,
      'alice',
      schedule.title,
      schedule.description,
      schedule.startTime,
      schedule.endTime,
      today,
      schedule.isPrivate,
      schedule.visibility
    );
  }

  // Bob's schedule - late morning meetings
  const bobSchedules = [
    {
      id: generateScheduleId(),
      title: 'Client Call',
      description: 'Weekly check-in with client',
      startTime: '10:00',
      endTime: '11:00',
      isPrivate: 0,
      visibility: 'busy',
    },
    {
      id: generateScheduleId(),
      title: 'Lunch with friend',
      description: 'Catching up with old colleague',
      startTime: '12:00',
      endTime: '13:00',
      isPrivate: 1, // personal
      visibility: 'busy',
    },
    {
      id: generateScheduleId(),
      title: 'Code Review',
      description: 'Review PRs for sprint',
      startTime: '15:00',
      endTime: '16:00',
      isPrivate: 0,
      visibility: 'busy',
    },
  ];

  for (const schedule of bobSchedules) {
    insertSchedule.run(
      schedule.id,
      'bob',
      schedule.title,
      schedule.description,
      schedule.startTime,
      schedule.endTime,
      today,
      schedule.isPrivate,
      schedule.visibility
    );
  }

  // Carol's schedule - afternoon meetings
  const carolSchedules = [
    {
      id: generateScheduleId(),
      title: 'Morning Yoga',
      description: 'Weekly yoga class',
      startTime: '08:00',
      endTime: '09:00',
      isPrivate: 1, // personal
      visibility: 'busy',
    },
    {
      id: generateScheduleId(),
      title: 'Strategy Meeting',
      description: 'Planning session with leadership',
      startTime: '13:00',
      endTime: '14:00',
      isPrivate: 0,
      visibility: 'busy',
    },
    {
      id: generateScheduleId(),
      title: 'Interview',
      description: 'Candidate interview for open position',
      startTime: '16:00',
      endTime: '17:00',
      isPrivate: 0,
      visibility: 'busy',
    },
  ];

  for (const schedule of carolSchedules) {
    insertSchedule.run(
      schedule.id,
      'carol',
      schedule.title,
      schedule.description,
      schedule.startTime,
      schedule.endTime,
      today,
      schedule.isPrivate,
      schedule.visibility
    );
  }

  console.log('Database seeded successfully');
}

/**
 * Seed debate agents (can be run on an already-seeded database)
 */
export function seedDebateAgents(): void {
  const db = getDatabase();
  initializeSchema();

  // Check if pro-kun already exists
  const existing = db.prepare('SELECT COUNT(*) as count FROM agents WHERE id = ?').get('pro-kun') as { count: number };
  if (existing.count > 0) {
    return;
  }

  const insertAgent = db.prepare(`
    INSERT INTO agents (id, name, description, endpoint, avatar_color)
    VALUES (?, ?, ?, ?, ?)
  `);

  const debateAgents = [
    {
      id: 'pro-kun',
      name: '賛成くん',
      description: 'ディベートで賛成派の立場を担当するエージェント。どんなテーマでも賛成の立場から論理的に主張します。',
      endpoint: '/api/agents/pro-kun',
      avatarColor: '#f97316', // orange
    },
    {
      id: 'con-kun',
      name: '反対くん',
      description: 'ディベートで反対派の立場を担当するエージェント。どんなテーマでも反対の立場から論理的に主張します。',
      endpoint: '/api/agents/con-kun',
      avatarColor: '#8b5cf6', // purple
    },
  ];

  for (const agent of debateAgents) {
    insertAgent.run(
      agent.id,
      agent.name,
      agent.description,
      agent.endpoint,
      agent.avatarColor
    );
  }

  console.log('Debate agents seeded successfully');
}

/**
 * Get seeded data summary
 */
export function getSeedSummary(): { agents: number; schedules: number } {
  const db = getDatabase();
  const agentCount = db.prepare('SELECT COUNT(*) as count FROM agents').get() as { count: number };
  const scheduleCount = db.prepare('SELECT COUNT(*) as count FROM schedules').get() as { count: number };

  return {
    agents: agentCount.count,
    schedules: scheduleCount.count,
  };
}

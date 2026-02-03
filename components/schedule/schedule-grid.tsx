'use client';

import { TimeSlot } from './time-slot';
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card';

interface ScheduleItem {
  id?: string;
  startTime: string;
  endTime: string;
  status: 'available' | 'busy' | 'tentative';
  title?: string;
  isPrivate?: boolean;
}

interface ScheduleGridProps {
  date: string;
  agentName: string;
  agentColor?: string;
  busySlots: ScheduleItem[];
  freeSlots?: { startTime: string; endTime: string }[];
  showFreeSlots?: boolean;
  onSlotClick?: (slot: ScheduleItem) => void;
}

export function ScheduleGrid({
  date,
  agentName,
  agentColor,
  busySlots,
  freeSlots,
  showFreeSlots = true,
  onSlotClick,
}: ScheduleGridProps) {
  // Combine and sort all slots by start time
  const allSlots: ScheduleItem[] = [
    ...busySlots,
    ...(showFreeSlots && freeSlots
      ? freeSlots.map((slot) => ({
          startTime: slot.startTime,
          endTime: slot.endTime,
          status: 'available' as const,
        }))
      : []),
  ].sort((a, b) => a.startTime.localeCompare(b.startTime));

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center gap-3">
          <div
            className="w-10 h-10 rounded-full flex items-center justify-center text-white font-semibold"
            style={{ backgroundColor: agentColor || '#6366f1' }}
          >
            {agentName.charAt(0)}
          </div>
          <div>
            <CardTitle>{agentName}のスケジュール</CardTitle>
            <p className="text-sm text-zinc-500 dark:text-zinc-400">{date}</p>
          </div>
        </div>
      </CardHeader>
      <CardContent>
        {allSlots.length === 0 ? (
          <p className="text-zinc-500 dark:text-zinc-400 text-center py-4">
            スケジュールデータがありません
          </p>
        ) : (
          <div className="space-y-2">
            {allSlots.map((slot, index) => (
              <TimeSlot
                key={slot.id || index}
                startTime={slot.startTime}
                endTime={slot.endTime}
                status={slot.status}
                title={slot.title}
                isPrivate={slot.isPrivate}
                onClick={onSlotClick ? () => onSlotClick(slot) : undefined}
              />
            ))}
          </div>
        )}

        {/* Legend */}
        <div className="mt-4 pt-4 border-t border-zinc-200 dark:border-zinc-800 flex flex-wrap gap-4 text-xs">
          <div className="flex items-center gap-1.5">
            <div className="w-3 h-3 rounded bg-green-500" />
            <span className="text-zinc-600 dark:text-zinc-400">空き</span>
          </div>
          <div className="flex items-center gap-1.5">
            <div className="w-3 h-3 rounded bg-red-500" />
            <span className="text-zinc-600 dark:text-zinc-400">予定あり</span>
          </div>
          <div className="flex items-center gap-1.5">
            <div className="w-3 h-3 rounded bg-yellow-500" />
            <span className="text-zinc-600 dark:text-zinc-400">仮予約</span>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}

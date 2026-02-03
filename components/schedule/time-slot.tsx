'use client';

interface TimeSlotProps {
  startTime: string;
  endTime: string;
  status: 'available' | 'busy' | 'tentative';
  title?: string;
  isPrivate?: boolean;
  onClick?: () => void;
}

export function TimeSlot({
  startTime,
  endTime,
  status,
  title,
  isPrivate,
  onClick,
}: TimeSlotProps) {
  const statusColors = {
    available: 'bg-green-100 border-green-300 text-green-800 dark:bg-green-900/30 dark:border-green-700 dark:text-green-400',
    busy: 'bg-red-100 border-red-300 text-red-800 dark:bg-red-900/30 dark:border-red-700 dark:text-red-400',
    tentative: 'bg-yellow-100 border-yellow-300 text-yellow-800 dark:bg-yellow-900/30 dark:border-yellow-700 dark:text-yellow-400',
  };

  return (
    <div
      className={`rounded-lg border p-3 ${statusColors[status]} ${onClick ? 'cursor-pointer hover:opacity-80' : ''}`}
      onClick={onClick}
    >
      <div className="flex items-center justify-between">
        <span className="font-medium text-sm">
          {startTime} - {endTime}
        </span>
        {isPrivate && (
          <span className="text-xs opacity-60">プライベート</span>
        )}
      </div>
      {title && (
        <p className="mt-1 text-sm opacity-80">{title}</p>
      )}
    </div>
  );
}

/**
 * Compact version for display in grids
 */
export function TimeSlotCompact({
  startTime,
  endTime,
  status,
}: {
  startTime: string;
  endTime: string;
  status: 'available' | 'busy' | 'tentative';
}) {
  const statusColors = {
    available: 'bg-green-500',
    busy: 'bg-red-500',
    tentative: 'bg-yellow-500',
  };

  return (
    <div className="flex items-center gap-2 text-sm">
      <div className={`w-2 h-2 rounded-full ${statusColors[status]}`} />
      <span className="text-zinc-600 dark:text-zinc-400">
        {startTime} - {endTime}
      </span>
    </div>
  );
}

'use client';

import { type ReactNode } from 'react';

interface BadgeProps {
  children: ReactNode;
  variant?: 'default' | 'success' | 'warning' | 'error' | 'info';
  size?: 'sm' | 'md';
  className?: string;
}

export function Badge({
  children,
  variant = 'default',
  size = 'sm',
  className = '',
}: BadgeProps) {
  const variants = {
    default: 'bg-zinc-100 text-zinc-800 dark:bg-zinc-800 dark:text-zinc-200',
    success: 'bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-400',
    warning: 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900/30 dark:text-yellow-400',
    error: 'bg-red-100 text-red-800 dark:bg-red-900/30 dark:text-red-400',
    info: 'bg-blue-100 text-blue-800 dark:bg-blue-900/30 dark:text-blue-400',
  };

  const sizes = {
    sm: 'px-2 py-0.5 text-xs',
    md: 'px-2.5 py-1 text-sm',
  };

  return (
    <span
      className={`inline-flex items-center font-medium rounded-full ${variants[variant]} ${sizes[size]} ${className}`}
    >
      {children}
    </span>
  );
}

/**
 * Task state badge with appropriate colors
 */
export function TaskStateBadge({ state }: { state: string }) {
  const stateVariants: Record<string, 'default' | 'success' | 'warning' | 'error' | 'info'> = {
    submitted: 'info',
    working: 'warning',
    'input-required': 'warning',
    completed: 'success',
    failed: 'error',
    canceled: 'default',
  };

  return <Badge variant={stateVariants[state] || 'default'}>{state}</Badge>;
}

/**
 * Availability status badge
 */
export function AvailabilityBadge({ status }: { status: 'available' | 'busy' | 'tentative' }) {
  const statusVariants: Record<string, 'success' | 'error' | 'warning'> = {
    available: 'success',
    busy: 'error',
    tentative: 'warning',
  };

  return <Badge variant={statusVariants[status]}>{status}</Badge>;
}

'use client';

import Link from 'next/link';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';

interface AgentCardProps {
  agent: {
    id: string;
    name: string;
    description?: string;
    avatarColor?: string;
    isActive?: boolean;
    skills?: { id: string; name: string; description?: string }[];
  };
  showSkills?: boolean;
}

export function AgentCard({ agent, showSkills = true }: AgentCardProps) {
  return (
    <Link href={`/agents/${agent.id}`}>
      <Card className="hover:border-indigo-300 hover:shadow-md transition-all cursor-pointer h-full">
        <CardContent className="pt-6">
          <div className="flex items-start gap-4">
            {/* Avatar */}
            <div
              className="w-12 h-12 rounded-full flex items-center justify-center text-white font-semibold text-lg shrink-0"
              style={{ backgroundColor: agent.avatarColor || '#6366f1' }}
            >
              {agent.name.charAt(0).toUpperCase()}
            </div>

            {/* Info */}
            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-2">
                <h3 className="text-lg font-semibold text-zinc-900 dark:text-zinc-100 truncate">
                  {agent.name}
                </h3>
                {agent.isActive !== false && (
                  <Badge variant="success" size="sm">
                    アクティブ
                  </Badge>
                )}
              </div>

              {agent.description && (
                <p className="mt-1 text-sm text-zinc-500 dark:text-zinc-400 line-clamp-2">
                  {agent.description}
                </p>
              )}

              {/* Skills */}
              {showSkills && agent.skills && agent.skills.length > 0 && (
                <div className="mt-3 flex flex-wrap gap-1.5">
                  {agent.skills.map((skill) => (
                    <Badge key={skill.id} variant="info" size="sm">
                      {skill.name}
                    </Badge>
                  ))}
                </div>
              )}
            </div>
          </div>
        </CardContent>
      </Card>
    </Link>
  );
}

/**
 * Agent avatar component
 */
export function AgentAvatar({
  name,
  color,
  size = 'md',
}: {
  name: string;
  color?: string;
  size?: 'sm' | 'md' | 'lg';
}) {
  const sizes = {
    sm: 'w-8 h-8 text-sm',
    md: 'w-10 h-10 text-base',
    lg: 'w-12 h-12 text-lg',
  };

  return (
    <div
      className={`${sizes[size]} rounded-full flex items-center justify-center text-white font-semibold`}
      style={{ backgroundColor: color || '#6366f1' }}
    >
      {name.charAt(0).toUpperCase()}
    </div>
  );
}

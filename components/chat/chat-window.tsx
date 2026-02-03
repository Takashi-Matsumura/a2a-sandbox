'use client';

import { useRef, useEffect } from 'react';
import { MessageBubble } from './message-bubble';
import { ChatInput } from './chat-input';

interface Message {
  role: 'user' | 'agent';
  content: string;
  data?: Record<string, unknown>;
  timestamp?: string;
}

interface ChatWindowProps {
  messages: Message[];
  onSend: (message: string) => void;
  agentName?: string;
  agentColor?: string;
  loading?: boolean;
  disabled?: boolean;
}

export function ChatWindow({
  messages,
  onSend,
  agentName,
  agentColor,
  loading = false,
  disabled = false,
}: ChatWindowProps) {
  const messagesEndRef = useRef<HTMLDivElement>(null);

  // Auto-scroll to bottom when new messages arrive
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  return (
    <div className="flex flex-col h-full">
      {/* Messages area */}
      <div className="flex-1 overflow-y-auto p-4 space-y-4">
        {messages.length === 0 ? (
          <div className="flex items-center justify-center h-full">
            <p className="text-zinc-400 dark:text-zinc-500">
              {agentName || 'エージェント'}との会話を始めましょう
            </p>
          </div>
        ) : (
          messages.map((message, index) => (
            <MessageBubble
              key={index}
              role={message.role}
              content={message.content}
              agentName={agentName}
              agentColor={agentColor}
              timestamp={message.timestamp}
              data={message.data}
            />
          ))
        )}

        {/* Loading indicator */}
        {loading && (
          <div className="flex gap-3">
            <div
              className="w-8 h-8 rounded-full flex items-center justify-center text-white font-semibold text-sm"
              style={{ backgroundColor: agentColor || '#6366f1' }}
            >
              {(agentName || 'A').charAt(0)}
            </div>
            <div className="bg-zinc-100 dark:bg-zinc-800 rounded-2xl px-4 py-2">
              <div className="flex gap-1">
                <span className="w-2 h-2 bg-zinc-400 rounded-full animate-bounce" style={{ animationDelay: '0ms' }} />
                <span className="w-2 h-2 bg-zinc-400 rounded-full animate-bounce" style={{ animationDelay: '150ms' }} />
                <span className="w-2 h-2 bg-zinc-400 rounded-full animate-bounce" style={{ animationDelay: '300ms' }} />
              </div>
            </div>
          </div>
        )}

        <div ref={messagesEndRef} />
      </div>

      {/* Input area */}
      <div className="border-t border-zinc-200 dark:border-zinc-800 p-4">
        <ChatInput
          onSend={onSend}
          disabled={disabled || loading}
          placeholder={`${agentName || 'エージェント'}にメッセージ...`}
        />
      </div>
    </div>
  );
}

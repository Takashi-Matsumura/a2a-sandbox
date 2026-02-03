'use client';

import { useState, type FormEvent, type KeyboardEvent } from 'react';
import { Button } from '@/components/ui/button';

interface ChatInputProps {
  onSend: (message: string) => void;
  disabled?: boolean;
  placeholder?: string;
}

export function ChatInput({
  onSend,
  disabled = false,
  placeholder = 'メッセージを入力...',
}: ChatInputProps) {
  const [message, setMessage] = useState('');

  const handleSubmit = (e: FormEvent) => {
    e.preventDefault();
    if (message.trim() && !disabled) {
      onSend(message.trim());
      setMessage('');
    }
  };

  const handleKeyDown = (e: KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSubmit(e);
    }
  };

  return (
    <form onSubmit={handleSubmit} className="flex gap-2">
      <textarea
        value={message}
        onChange={(e) => setMessage(e.target.value)}
        onKeyDown={handleKeyDown}
        placeholder={placeholder}
        disabled={disabled}
        rows={1}
        className="flex-1 resize-none rounded-lg border border-zinc-300 bg-white px-4 py-2 text-sm
          placeholder:text-zinc-400
          focus:border-indigo-500 focus:outline-none focus:ring-1 focus:ring-indigo-500
          disabled:cursor-not-allowed disabled:opacity-50
          dark:border-zinc-600 dark:bg-zinc-800 dark:text-zinc-100 dark:placeholder:text-zinc-500
          dark:focus:border-indigo-400 dark:focus:ring-indigo-400"
      />
      <Button type="submit" disabled={!message.trim() || disabled}>
        送信
      </Button>
    </form>
  );
}

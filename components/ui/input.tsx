'use client';

import { forwardRef, type InputHTMLAttributes } from 'react';

export interface InputProps extends InputHTMLAttributes<HTMLInputElement> {
  label?: string;
  error?: string;
}

const Input = forwardRef<HTMLInputElement, InputProps>(
  ({ className, label, error, id, ...props }, ref) => {
    const inputId = id || label?.toLowerCase().replace(/\s+/g, '-');

    return (
      <div className="space-y-1">
        {label && (
          <label
            htmlFor={inputId}
            className="block text-sm font-medium text-zinc-700 dark:text-zinc-300"
          >
            {label}
          </label>
        )}
        <input
          ref={ref}
          id={inputId}
          className={`
            w-full rounded-lg border border-zinc-300 bg-white px-3 py-2 text-sm
            placeholder:text-zinc-400
            focus:border-indigo-500 focus:outline-none focus:ring-1 focus:ring-indigo-500
            disabled:cursor-not-allowed disabled:opacity-50
            dark:border-zinc-600 dark:bg-zinc-800 dark:text-zinc-100 dark:placeholder:text-zinc-500
            dark:focus:border-indigo-400 dark:focus:ring-indigo-400
            ${error ? 'border-red-500 focus:border-red-500 focus:ring-red-500' : ''}
            ${className || ''}
          `}
          {...props}
        />
        {error && <p className="text-sm text-red-500">{error}</p>}
      </div>
    );
  }
);

Input.displayName = 'Input';

export { Input };

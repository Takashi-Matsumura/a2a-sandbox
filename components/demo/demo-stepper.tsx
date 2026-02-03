'use client';

interface Step {
  id: string;
  title: string;
  description: string;
  status: 'pending' | 'active' | 'completed' | 'error';
}

interface DemoStepperProps {
  steps: Step[];
  currentStep: number;
}

export function DemoStepper({ steps, currentStep }: DemoStepperProps) {
  return (
    <div className="space-y-4">
      {steps.map((step, index) => {
        const isActive = index === currentStep;
        const isCompleted = step.status === 'completed' || index < currentStep;
        const isError = step.status === 'error';

        return (
          <div key={step.id} className="flex gap-4">
            {/* Step indicator */}
            <div className="flex flex-col items-center">
              <div
                className={`w-8 h-8 rounded-full flex items-center justify-center font-medium text-sm
                  ${isCompleted ? 'bg-green-500 text-white' : ''}
                  ${isActive ? 'bg-indigo-600 text-white ring-4 ring-indigo-200 dark:ring-indigo-900' : ''}
                  ${isError ? 'bg-red-500 text-white' : ''}
                  ${!isActive && !isCompleted && !isError ? 'bg-zinc-200 text-zinc-500 dark:bg-zinc-700 dark:text-zinc-400' : ''}
                `}
              >
                {isCompleted ? (
                  <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                  </svg>
                ) : isError ? (
                  <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                  </svg>
                ) : (
                  index + 1
                )}
              </div>
              {/* Connecting line */}
              {index < steps.length - 1 && (
                <div
                  className={`w-0.5 h-full min-h-[2rem] mt-2
                    ${isCompleted ? 'bg-green-500' : 'bg-zinc-200 dark:bg-zinc-700'}
                  `}
                />
              )}
            </div>

            {/* Step content */}
            <div className="flex-1 pb-8">
              <h4
                className={`font-medium ${
                  isActive ? 'text-indigo-600 dark:text-indigo-400' : 'text-zinc-900 dark:text-zinc-100'
                }`}
              >
                {step.title}
              </h4>
              <p className="text-sm text-zinc-500 dark:text-zinc-400 mt-1">
                {step.description}
              </p>
            </div>
          </div>
        );
      })}
    </div>
  );
}

/**
 * Demo progress bar
 */
export function DemoProgress({
  current,
  total,
  label,
}: {
  current: number;
  total: number;
  label?: string;
}) {
  const percentage = Math.round((current / total) * 100);

  return (
    <div className="space-y-2">
      {label && (
        <div className="flex justify-between text-sm">
          <span className="text-zinc-600 dark:text-zinc-400">{label}</span>
          <span className="font-medium text-zinc-900 dark:text-zinc-100">
            {current} / {total}
          </span>
        </div>
      )}
      <div className="h-2 bg-zinc-200 dark:bg-zinc-700 rounded-full overflow-hidden">
        <div
          className="h-full bg-indigo-600 transition-all duration-300"
          style={{ width: `${percentage}%` }}
        />
      </div>
    </div>
  );
}

import type { ReactNode } from 'react';

interface SysAdPageShellProps {
  eyebrow?: ReactNode;
  title: string;
  description?: string;
  action?: ReactNode;
  children: ReactNode;
  className?: string;
}

export function SysAdPageShell({
  eyebrow,
  title,
  description,
  action,
  children,
  className = '',
}: SysAdPageShellProps) {
  return (
    <div className={`flex h-full w-full overflow-hidden bg-slate-50 p-4 text-slate-950 dark:bg-gray-900 dark:text-white sm:p-5 lg:p-6 ${className}`}>
      <div className="mx-auto flex h-full w-full max-w-[96rem] flex-col gap-4 overflow-hidden">
        <header className="shrink-0 overflow-hidden rounded-[2rem] border border-slate-200 bg-white shadow-sm dark:border-slate-700 dark:bg-slate-800">
          <div className="relative p-5 sm:p-6">
            <div className="absolute right-0 top-0 h-28 w-28 rounded-bl-full bg-indigo-500/10" />
            <div className="relative flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
              <div>
                {eyebrow}
                <h1 className="text-3xl font-black tracking-tight">{title}</h1>
                {description && (
                  <p className="mt-2 max-w-3xl text-sm text-slate-600 dark:text-slate-300">
                    {description}
                  </p>
                )}
              </div>
              {action}
            </div>
          </div>
        </header>

        <div className="min-h-0 flex-1 overflow-hidden">
          {children}
        </div>
      </div>
    </div>
  );
}

export function SysAdEyebrow({ children }: { children: ReactNode }) {
  return (
    <div className="mb-3 inline-flex items-center gap-2 rounded-full bg-indigo-100 px-3 py-1 text-xs font-bold uppercase tracking-[0.2em] text-indigo-700 dark:bg-indigo-500/15 dark:text-indigo-300">
      {children}
    </div>
  );
}

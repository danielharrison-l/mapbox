import type * as React from 'react';
import { cn } from '../../lib/utils';

export function Switch({
  checked,
  className,
  disabled,
  onCheckedChange,
  ...props
}: Omit<React.ButtonHTMLAttributes<HTMLButtonElement>, 'onChange'> & {
  checked: boolean;
  onCheckedChange: (checked: boolean) => void;
}) {
  return (
    <button
      aria-checked={checked}
      className={cn(
        'inline-flex h-6 w-11 shrink-0 cursor-pointer items-center rounded-full border border-transparent p-0.5 transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-500 focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50',
        checked ? 'bg-blue-700' : 'bg-slate-300',
        className,
      )}
      disabled={disabled}
      role="switch"
      type="button"
      onClick={() => onCheckedChange(!checked)}
      {...props}
    >
      <span
        className={cn(
          'block h-5 w-5 rounded-full bg-white shadow-sm transition-transform',
          checked ? 'translate-x-5' : 'translate-x-0',
        )}
      />
    </button>
  );
}

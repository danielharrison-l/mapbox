import type * as React from 'react';
import { cn } from '../../lib/utils';

export function Alert({ className, ...props }: React.HTMLAttributes<HTMLDivElement>) {
  return (
    <div
      className={cn('rounded-lg border border-slate-200 bg-slate-50 px-3 py-3 text-sm', className)}
      {...props}
    />
  );
}

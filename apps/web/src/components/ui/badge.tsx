import { cva, type VariantProps } from 'class-variance-authority';
import type * as React from 'react';
import { cn } from '../../lib/utils';

const badgeVariants = cva(
  'inline-flex items-center rounded-md px-2 py-1 text-xs font-extrabold leading-none',
  {
    variants: {
      variant: {
        default: 'bg-slate-900 text-white',
        secondary: 'bg-slate-100 text-slate-700',
        success: 'bg-green-100 text-green-800',
        warning: 'bg-amber-100 text-amber-800',
        outline: 'border border-slate-300 bg-white text-slate-700',
      },
    },
    defaultVariants: {
      variant: 'default',
    },
  },
);

export type BadgeProps = React.HTMLAttributes<HTMLSpanElement> & VariantProps<typeof badgeVariants>;

export function Badge({ className, variant, ...props }: BadgeProps) {
  return <span className={cn(badgeVariants({ variant, className }))} {...props} />;
}

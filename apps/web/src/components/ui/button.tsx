import { Slot } from '@radix-ui/react-slot';
import { cva, type VariantProps } from 'class-variance-authority';
import type * as React from 'react';
import { cn } from '../../lib/utils';

const buttonVariants = cva(
  'inline-flex min-h-9 cursor-pointer items-center justify-center gap-2 whitespace-nowrap rounded-md text-sm font-bold transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-500 focus-visible:ring-offset-2 disabled:pointer-events-none disabled:cursor-not-allowed disabled:opacity-50',
  {
    variants: {
      variant: {
        default: 'bg-blue-700 text-white hover:bg-blue-800',
        destructive: 'bg-red-600 text-white hover:bg-red-700',
        outline: 'border border-slate-300 bg-white text-slate-700 hover:bg-slate-50',
        secondary: 'bg-slate-100 text-slate-900 hover:bg-slate-200',
        ghost: 'text-slate-700 hover:bg-slate-100',
        success: 'bg-emerald-700 text-white hover:bg-emerald-800',
      },
      size: {
        default: 'px-3.5 py-2',
        sm: 'min-h-8 px-2.5 py-1.5 text-xs',
        icon: 'h-9 w-9 p-0',
      },
    },
    defaultVariants: {
      variant: 'default',
      size: 'default',
    },
  },
);

export type ButtonProps = React.ButtonHTMLAttributes<HTMLButtonElement> &
  VariantProps<typeof buttonVariants> & {
    asChild?: boolean;
  };

export function Button({ asChild = false, className, size, variant, ...props }: ButtonProps) {
  const Comp = asChild ? Slot : 'button';

  return <Comp className={cn(buttonVariants({ variant, size, className }))} {...props} />;
}

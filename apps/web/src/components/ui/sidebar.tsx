import type * as React from 'react';
import { createContext, useContext, useMemo, useState } from 'react';
import { cn } from '../../lib/utils';

type SidebarContextValue = {
  open: boolean;
  setOpen: (open: boolean) => void;
  toggleSidebar: () => void;
};

const SidebarContext = createContext<SidebarContextValue | null>(null);

export function SidebarProvider({
  children,
  defaultOpen = true,
}: {
  children: React.ReactNode;
  defaultOpen?: boolean;
}) {
  const [open, setOpen] = useState(defaultOpen);
  const value = useMemo(
    () => ({
      open,
      setOpen,
      toggleSidebar: () => setOpen((currentOpen) => !currentOpen),
    }),
    [open],
  );

  return <SidebarContext.Provider value={value}>{children}</SidebarContext.Provider>;
}

export function useSidebar() {
  const context = useContext(SidebarContext);

  if (!context) {
    throw new Error('useSidebar must be used within a SidebarProvider.');
  }

  return context;
}

export function Sidebar({ className, ...props }: React.HTMLAttributes<HTMLElement>) {
  const { open } = useSidebar();

  return (
    <aside
      className={cn(
        'fixed top-0 bottom-0 left-0 z-30 flex h-screen overflow-hidden border-slate-200 border-r bg-white text-slate-950 transition-[width] duration-200 ease-out',
        open ? 'w-[360px] max-w-[calc(100vw-16px)]' : 'w-14',
        className,
      )}
      data-state={open ? 'expanded' : 'collapsed'}
      {...props}
    />
  );
}

export function SidebarRail({ className, ...props }: React.HTMLAttributes<HTMLDivElement>) {
  return (
    <div className={cn('grid w-14 shrink-0 content-start bg-[#f3f6ff]', className)} {...props} />
  );
}

export function SidebarHeader({ className, ...props }: React.HTMLAttributes<HTMLDivElement>) {
  return (
    <div
      className={cn('border-slate-200 border-b bg-[#f8f9ff] px-4 pt-4 pb-3', className)}
      {...props}
    />
  );
}

export function SidebarContent({ className, ...props }: React.HTMLAttributes<HTMLDivElement>) {
  return (
    <div
      className={cn(
        'min-h-0 flex-1 overflow-y-auto px-5 py-5 [scrollbar-gutter:stable]',
        className,
      )}
      {...props}
    />
  );
}

export function SidebarFooter({ className, ...props }: React.HTMLAttributes<HTMLDivElement>) {
  return (
    <div className={cn('border-slate-200 border-t bg-[#f8f9ff] px-4 py-3', className)} {...props} />
  );
}

export function SidebarMenu({ className, ...props }: React.HTMLAttributes<HTMLDivElement>) {
  return <div className={cn('grid content-start gap-1 p-2', className)} {...props} />;
}

export function SidebarMenuButton({
  active,
  className,
  ...props
}: React.ButtonHTMLAttributes<HTMLButtonElement> & {
  active?: boolean;
}) {
  return (
    <button
      className={cn(
        'grid h-9 w-9 cursor-pointer place-items-center rounded-md text-slate-700 transition hover:bg-white hover:text-blue-700 disabled:cursor-not-allowed disabled:opacity-35',
        active && 'bg-white text-blue-700 shadow-sm ring-1 ring-blue-100',
        className,
      )}
      type="button"
      {...props}
    />
  );
}

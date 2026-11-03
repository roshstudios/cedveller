import type { ReactNode } from 'react';
import { Link, useLocation } from 'wouter';
import { motion, useReducedMotion } from 'framer-motion';
import { useKeyboardOpen } from '@/hooks/use-keyboard-open';
import { CalendarDays, Sun, Upload, Users, Settings2 } from 'lucide-react';

const NAV = [
  { href: '/', label: 'Bu gün', icon: Sun },
  { href: '/program', label: 'Cədvəl', icon: CalendarDays },
  { href: '/yukle', label: 'Yüklə', icon: Upload },
  { href: '/arkadaslar', label: 'Dostlar', icon: Users },
  { href: '/ayarlar', label: 'Ayarlar', icon: Settings2 },
];

export function Shell({ children, showNavigation = true }: { children: ReactNode; showNavigation?: boolean }) {
  const [loc] = useLocation();
  const reduce = useReducedMotion();
  const keyboard = useKeyboardOpen();
  const active = (h: string) => (h === '/' ? loc === '/' : loc.startsWith(h));
  const mainPad = showNavigation ? 'pb-safe md:pb-16' : 'pb-[calc(env(safe-area-inset-bottom)+2rem)]';
  return (
    <div className="min-h-[100dvh]">
      <header className="sticky top-0 z-40 backdrop-blur-xl bg-[hsl(var(--background)/0.8)] pt-[env(safe-area-inset-top)]">
        <div className="mx-auto max-w-5xl px-4 h-16 flex items-center justify-between">
          <Link href="/" className="flex items-center gap-2 press" data-testid="link-home">
            <span className="ink rounded-full h-9 px-3 flex items-center font-display font-extrabold text-sm">
              DT<span className="ml-1 h-2 w-2 rounded-full bg-[hsl(72_95%_62%)]" />
            </span>
            <span className="font-display font-bold text-lg">Dərs Cədvəlim</span>
          </Link>
          {showNavigation && <nav aria-label="Əsas naviqasiya" className="hidden md:flex items-center gap-1 rounded-full bg-card border p-1">
            {NAV.map((n) => (
              <Link key={n.href} href={n.href} data-testid={`nav-${n.href}`} aria-current={active(n.href) ? 'page' : undefined}
                className={`press rounded-full px-4 py-2 text-sm font-semibold transition-colors ${active(n.href) ? 'ink' : 'hover:bg-muted'}`}>
                {n.label}
              </Link>
            ))}
          </nav>}
        </div>
      </header>
      <main className={`mx-auto max-w-5xl px-4 pt-2 ${mainPad}`}>{children}</main>
      {showNavigation && (
        <nav aria-label="Əsas naviqasiya" aria-hidden={keyboard || undefined}
          className={`md:hidden fixed z-50 inset-x-0 bottom-0 px-3 pb-[calc(env(safe-area-inset-bottom)+10px)] pointer-events-none transition-opacity duration-200 ${keyboard ? 'opacity-0 invisible' : 'opacity-100'}`}>
          <div className="pointer-events-auto mx-auto max-w-md rounded-full ink p-1.5 flex justify-between shadow-[0_18px_40px_-12px_hsl(262_52%_18%/0.55)]">
            {NAV.map((n) => {
              const on = active(n.href);
              const I = n.icon;
              return (
                <Link key={n.href} href={n.href} data-testid={`tab-${n.href}`} aria-current={on ? 'page' : undefined}
                  tabIndex={keyboard ? -1 : undefined}
                  className="relative flex-1 flex flex-col items-center justify-center gap-0.5 rounded-full py-2 min-h-11 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[hsl(72_95%_62%)]">
                  {on && (
                    <motion.span layoutId="tab-capsule" aria-hidden className="absolute inset-0 rounded-full lime"
                      transition={reduce ? { duration: 0 } : { type: 'spring', stiffness: 520, damping: 40, mass: 0.8 }} />
                  )}
                  <span className={`relative flex flex-col items-center gap-0.5 transition-colors duration-200 ${on ? 'text-[hsl(262_38%_14%)]' : 'opacity-70'}`}>
                    <I className="h-[18px] w-[18px]" strokeWidth={2.4} />
                    <span className="text-[10px] font-bold">{n.label}</span>
                  </span>
                </Link>
              );
            })}
          </div>
        </nav>
      )}
    </div>
  );
}

export function PageTitle({ kicker, title, right }: { kicker?: string; title: ReactNode; right?: ReactNode }) {
  return (
    <div className="flex items-end justify-between gap-3 mt-4 mb-6 rise">
      <div>
        {kicker && <div className="text-xs font-bold uppercase tracking-[0.18em] text-muted-foreground mb-1">{kicker}</div>}
        <h1 className="font-display font-extrabold text-4xl md:text-5xl leading-[0.95]">{title}</h1>
      </div>
      {right}
    </div>
  );
}

export function Pill({ children, className = '' }: { children: ReactNode; className?: string }) {
  return <span className={`inline-flex items-center gap-1.5 rounded-full px-3 py-1 text-xs font-bold ${className}`}>{children}</span>;
}

export function SkeletonBlock({ className = '' }: { className?: string }) {
  return <div className={`animate-pulse rounded-[1.75rem] bg-muted ${className}`} />;
}

export function ErrorCard({ message, onRetry }: { message: string; onRetry?: () => void }) {
  return (
    <div className="rounded-[1.75rem] border-2 border-destructive/40 bg-card p-6 rise" data-testid="status-error">
      <div className="font-display font-bold text-xl">Xəta baş verdi</div>
      <p className="text-sm text-muted-foreground mt-1 break-words">{message}</p>
      {onRetry && (
        <button onClick={onRetry} className="press mt-4 rounded-full ink px-5 py-2.5 text-sm font-bold" data-testid="button-retry">Yenidən cəhd et</button>
      )}
    </div>
  );
}

export const btn = {
  ink: 'press inline-flex items-center justify-center gap-2 rounded-full ink px-5 py-2.5 text-sm font-bold disabled:opacity-50',
  lime: 'press inline-flex items-center justify-center gap-2 rounded-full lime px-5 py-2.5 text-sm font-bold disabled:opacity-50',
  ghost: 'press inline-flex items-center justify-center gap-2 rounded-full border-[1.5px] border-foreground/15 bg-card px-5 py-2.5 text-sm font-bold hover:border-foreground/40 disabled:opacity-50',
  danger: 'press inline-flex items-center justify-center gap-2 rounded-full bg-destructive text-destructive-foreground px-5 py-2.5 text-sm font-bold disabled:opacity-50',
};

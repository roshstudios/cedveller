import { useState } from 'react';
import type { Lesson, ScheduleInput } from '@workspace/api-client-react';
import { MapPin, User } from 'lucide-react';
import { DAYS, DAYS_SHORT, TYPE_LABEL, TYPE_TONE, WEEK_LABEL, sortLessons } from '@/lib/schedule';
import { Pill } from './shell';

export function LessonCapsule({ l, compact }: { l: Lesson; compact?: boolean }) {
  return (
    <div className="rounded-[1.5rem] bg-card border p-4 flex gap-4 items-start hover:-translate-y-0.5 transition-transform duration-300" data-testid={`card-lesson-${l.id}`}>
      <div className="tnum text-sm font-bold leading-tight shrink-0 w-14">
        {l.start}
        <div className="text-muted-foreground font-medium">{l.end}</div>
      </div>
      <div className="min-w-0 flex-1">
        <div className="font-semibold leading-snug">{l.name}</div>
        <div className="flex flex-wrap gap-1.5 mt-2">
          <Pill className={TYPE_TONE[l.type]}>{TYPE_LABEL[l.type]}</Pill>
          {l.week !== 'all' && <Pill className="ink">{WEEK_LABEL[l.week]}</Pill>}
          {l.room && <Pill className="bg-muted"><MapPin className="h-3 w-3" />{l.room}</Pill>}
          {!compact && l.teacher && <Pill className="bg-muted"><User className="h-3 w-3" />{l.teacher}</Pill>}
        </div>
        {!compact && l.note && <p className="text-xs text-muted-foreground mt-2">{l.note}</p>}
      </div>
    </div>
  );
}

export type WeekFilter = 'all' | 'lower' | 'upper';

export function WeekToggle({ value, onChange, current }: { value: WeekFilter; onChange: (v: WeekFilter) => void; current?: string }) {
  const opts: WeekFilter[] = ['lower', 'upper', 'all'];
  return (
    <div className="inline-flex rounded-full bg-card border p-1">
      {opts.map((o) => (
        <button key={o} onClick={() => onChange(o)} data-testid={`toggle-week-${o}`}
          className={`press relative rounded-full px-4 py-2 text-sm font-bold transition-colors duration-300 ${value === o ? 'ink' : 'text-muted-foreground'}`}>
          {o === 'all' ? 'Hamısı' : WEEK_LABEL[o]}
          {current === o && <span className="absolute top-1.5 right-2 h-1.5 w-1.5 rounded-full bg-[hsl(72_95%_52%)]" />}
        </button>
      ))}
    </div>
  );
}

export function WeekView({ schedule, filter, todayWeekday }: { schedule: ScheduleInput; filter: WeekFilter; todayWeekday?: number }) {
  const ls = sortLessons(schedule.lessons.filter((l) => filter === 'all' || l.week === 'all' || l.week === filter));
  const hasWeekend = ls.some((l) => l.day > 5);
  const days = hasWeekend || (todayWeekday ?? 0) > 5 ? [1, 2, 3, 4, 5, 6, 7] : [1, 2, 3, 4, 5];
  if (todayWeekday) days.sort((a, b) => Number(b === todayWeekday) - Number(a === todayWeekday) || a - b);
  const [open, setOpen] = useState<number | null>(null);
  return (
    <div className="grid gap-3 md:grid-cols-2 lg:grid-cols-3">
      {days.map((d, i) => {
        const day = ls.filter((l) => l.day === d);
        const isToday = d === todayWeekday;
        return (
          <section key={d} className={`rounded-[2rem] p-3 rise ${isToday ? 'ink' : 'bg-secondary/70'}`} style={{ animationDelay: `${i * 50}ms` }} data-testid={`day-${d}`}>
            <button onClick={() => setOpen(open === d ? null : d)} className="w-full flex items-center justify-between px-2 py-1.5">
              <span className="font-display font-bold text-xl">{DAYS[d - 1]}</span>
              <span className={`tnum text-xs rounded-full px-2.5 py-1 ${isToday ? 'lime' : 'bg-card'}`}>
                {isToday ? 'Bu gün' : DAYS_SHORT[d - 1]} · {day.length}
              </span>
            </button>
            <div className="space-y-2 mt-1 text-foreground">
              {day.length === 0 ? (
                <div className={`rounded-[1.5rem] border-2 border-dashed p-4 text-sm ${isToday ? 'border-white/20 text-white/70' : 'border-foreground/15 text-muted-foreground'}`}>Dərs yoxdur. İstirahət günüdür.</div>
              ) : day.map((l) => <LessonCapsule key={l.id} l={l} compact={open !== d} />)}
            </div>
          </section>
        );
      })}
    </div>
  );
}

import { Link } from 'wouter';
import { ArrowRight } from 'lucide-react';
import { useActiveSchedule, useNow } from '@/hooks/use-active';
import { PageTitle, Pill, SkeletonBlock, ErrorCard, btn } from '@/components/shell';
import { LessonCapsule } from '@/components/lessons';
import { DAYS, WEEK_LABEL, fmtDate, fmtDuration, findNext, lessonsOn, toMin, weekParity, errMsg } from '@/lib/schedule';

export default function Today() {
  const a = useActiveSchedule();
  const now = useNow();
  if (a.isLoading) return <div className="space-y-3 mt-6"><SkeletonBlock className="h-16" /><SkeletonBlock className="h-56" /><SkeletonBlock className="h-24" /></div>;
  if (a.error || !a.schedule) return <div className="mt-6"><ErrorCard message={errMsg(a.error)} onRetry={a.refetch} /></div>;
  const s = a.schedule;
  const parity = weekParity(s, now.date);
  const today = lessonsOn(s, now.date);
  const current = today.find((l) => toMin(l.start) <= now.minutes && now.minutes < toMin(l.end));
  const next = findNext(s, now);
  const hh = String(Math.floor(now.minutes / 60)).padStart(2, '0');
  const mm = String(now.minutes % 60).padStart(2, '0');
  const left = today.filter((l) => toMin(l.end) > now.minutes).length;

  return (
    <div className="space-y-5">
      <PageTitle kicker={`${DAYS[now.weekday - 1]} · ${fmtDate(now.date)}`} title={<>Bu gün <span className="tnum">{hh}:{mm}</span></>}
        right={<Pill className="ink text-sm py-1.5" ><span className="h-2 w-2 rounded-full bg-[hsl(72_95%_62%)]" />{WEEK_LABEL[parity]}</Pill>} />

      {current ? (() => {
        const total = toMin(current.end) - toMin(current.start);
        const el = now.minutes - toMin(current.start);
        return (
          <section className="ink rounded-[2.25rem] p-6 rise relative overflow-hidden" data-testid="card-current">
            <div className="flex items-center gap-2 text-sm font-bold"><span className="relative h-2.5 w-2.5"><span className="absolute inset-0 rounded-full bg-[hsl(72_95%_62%)] live-dot" /><span className="absolute inset-0 rounded-full bg-[hsl(72_95%_62%)]" /></span>Hazırda dərsdəsən</div>
            <h2 className="font-display font-extrabold text-3xl md:text-4xl mt-3 leading-tight">{current.name}</h2>
            <div className="mt-2 opacity-80 text-sm">{[current.room, current.teacher].filter(Boolean).join(' · ')}</div>
            <div className="mt-6 h-3 rounded-full bg-white/15 overflow-hidden">
              <div className="h-full lime rounded-full origin-left transition-transform duration-1000" style={{ transform: `scaleX(${el / total})` }} />
            </div>
            <div className="flex justify-between mt-2 tnum text-xs opacity-80"><span>{current.start} · {fmtDuration(el)} keçib</span><span>{fmtDuration(total - el)} qalıb · {current.end}</span></div>
          </section>
        );
      })() : (
        <section className="rounded-[2.25rem] bg-card border p-6 rise" data-testid="card-next">
          {next ? (
            <>
              <div className="text-sm font-bold text-muted-foreground">
                {next.offset === 0 ? 'Növbəti dərs' : next.offset === 1 ? 'Bu gün başqa dərs yoxdur · sabah' : `Növbəti dərs · ${DAYS[next.lesson.day - 1]}, ${fmtDate(next.date)}`}
              </div>
              <h2 className="font-display font-extrabold text-3xl md:text-4xl mt-2 leading-tight">{next.lesson.name}</h2>
              <div className="flex flex-wrap gap-2 mt-4">
                <Pill className="lime text-sm tnum">{next.lesson.start} – {next.lesson.end}</Pill>
                {next.offset === 0 && <Pill className="ink text-sm">{fmtDuration(toMin(next.lesson.start) - now.minutes)} sonra</Pill>}
                {next.lesson.room && <Pill className="bg-muted text-sm">{next.lesson.room}</Pill>}
              </div>
            </>
          ) : (
            <div><h2 className="font-display font-bold text-2xl">Növbəti 3 həftədə dərs yoxdur</h2><p className="text-sm text-muted-foreground mt-1">Cədvəlinə dərs əlavə edəndə burada görünəcək.</p></div>
          )}
        </section>
      )}

      {current && next && (
        <section className="rounded-[1.75rem] bg-card border p-5 rise" data-testid="card-upcoming-during-class">
          <div className="text-xs font-bold text-muted-foreground">Növbəti dərs · {next.offset === 0 ? 'Bu gün' : `${DAYS[next.lesson.day - 1]}, ${fmtDate(next.date)}`}</div>
          <h3 className="font-display font-bold text-xl mt-1">{next.lesson.name}</h3>
          <div className="mt-2 flex flex-wrap gap-2">
            <Pill className="lime tnum">{next.lesson.start} – {next.lesson.end}</Pill>
            {next.lesson.room && <Pill className="bg-secondary">{next.lesson.room}</Pill>}
          </div>
        </section>
      )}
      <div className="flex items-center justify-between pt-2">
        <h2 className="font-display font-bold text-2xl">Günün planı</h2>
        <span className="tnum text-sm text-muted-foreground">{today.length} dərs · {left} qalıb</span>
      </div>
      {today.length === 0 ? (
        <div className="rounded-[2rem] border-2 border-dashed border-foreground/15 p-8 text-center rise" data-testid="status-empty-today">
          <div className="font-display font-bold text-2xl">Bu gün dərs yoxdur</div>
          <p className="text-sm text-muted-foreground mt-1">{WEEK_LABEL[parity]} — {DAYS[now.weekday - 1]} günü üçün cədvəlində dərs yoxdur.</p>
        </div>
      ) : (
        <ol className="space-y-2">
          {today.map((l, i) => {
            const prev = today[i - 1];
            const gap = prev ? toMin(l.start) - toMin(prev.end) : 0;
            const past = toMin(l.end) <= now.minutes;
            return (
              <li key={l.id} className="rise" style={{ animationDelay: `${i * 60}ms` }}>
                {gap > 0 && <div className="flex items-center gap-2 py-1.5 pl-5 text-xs font-bold text-muted-foreground"><span className="h-4 w-px bg-foreground/20" />{fmtDuration(gap)} fasilə</div>}
                <div className={past ? 'opacity-45' : ''}><LessonCapsule l={l} /></div>
              </li>
            );
          })}
        </ol>
      )}
      <Link href="/program" className={`${btn.ghost} w-full`} data-testid="link-week">Bütün həftə <ArrowRight className="h-4 w-4" /></Link>
    </div>
  );
}

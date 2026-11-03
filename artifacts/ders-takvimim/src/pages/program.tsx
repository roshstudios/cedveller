import { useState } from 'react';
import { Link } from 'wouter';
import { Pencil } from 'lucide-react';
import { useActiveSchedule, useNow } from '@/hooks/use-active';
import { useToast } from '@/hooks/use-toast';
import { PageTitle, SkeletonBlock, ErrorCard, btn } from '@/components/shell';
import { WeekToggle, WeekView, type WeekFilter } from '@/components/lessons';
import { ScheduleEditor } from '@/components/schedule-editor';
import { errMsg, toInput, weekParity, WEEK_LABEL } from '@/lib/schedule';

export default function Program() {
  const a = useActiveSchedule();
  const now = useNow(60000);
  const { toast } = useToast();
  const [filter, setFilter] = useState<WeekFilter | null>(null);
  const [editing, setEditing] = useState(false);
  if (a.isLoading) return <div className="grid md:grid-cols-3 gap-3 mt-6">{[0, 1, 2, 3, 4].map((i) => <SkeletonBlock key={i} className="h-48" />)}</div>;
  if (a.error || !a.schedule) return <div className="mt-6"><ErrorCard message={errMsg(a.error)} onRetry={a.refetch} /></div>;
  const s = a.schedule;
  const cur = weekParity(s, now.date);
  const f = filter ?? cur;

  if (editing) {
    return (
      <div>
        <PageTitle kicker={a.owned ? 'Yadda saxlanmış cədvəli redaktə et' : 'İlkin variantdan yeni cədvəl'} title="Redaktə et" />
        <ScheduleEditor initial={toInput(s)} scheduleId={a.owned?.id}
          onCancel={() => setEditing(false)}
          onSaved={(saved) => { a.setActiveId(saved.id); setEditing(false); toast({ title: a.owned ? 'Cədvəl yeniləndi' : 'Cədvəl yadda saxlanıldı' }); }} />
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {a.owned && s.group === 'TT-11' && s.lessons.some((l) => ['fri-2', 'fri-3a', 'fri-3b'].includes(l.id)) && (
        <div className="rounded-[1.5rem] bg-secondary p-4 text-sm space-y-2" data-testid="notice-source-correction">
          <p>TT-11 mənbə oxunuşu düzəldilib: Cümə 10:15 Üst/Alt həftə mühazirələridir; 12:00 Xarici dil hər həftə seminardır. Saxladığın cədvəl avtomatik dəyişdirilməyib.</p>
          <Link href="/yukle" className="font-bold underline">Öz mənbə faylını yükləyib yenidən yoxla</Link>
        </div>
      )}
      <PageTitle kicker={`${s.group} · bu həftə ${WEEK_LABEL[cur]}`} title="Həftəlik cədvəl"
        right={<button onClick={() => setEditing(true)} className={btn.ink} data-testid="button-edit-schedule"><Pencil className="h-4 w-4" /><span className="hidden sm:inline">Redaktə et</span></button>} />
      {a.list.length > 1 && (
        <div className="flex gap-2 overflow-x-auto pb-1">
          {a.list.map((x) => (
            <button key={x.id} onClick={() => a.setActiveId(x.id)} data-testid={`button-select-${x.id}`}
              className={`press shrink-0 rounded-full px-4 py-2 text-sm font-bold border ${x.id === a.owned?.id ? 'lime border-transparent' : 'bg-card'}`}>{x.name} · {x.group}</button>
          ))}
        </div>
      )}
      <WeekToggle value={f} onChange={setFilter} current={cur} />
      <WeekView schedule={s} filter={f} todayWeekday={now.weekday} />
    </div>
  );
}

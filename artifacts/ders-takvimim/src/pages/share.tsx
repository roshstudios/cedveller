import { useState } from 'react';
import { useParams } from 'wouter';
import { useGetSchedule, getGetScheduleQueryKey } from '@workspace/api-client-react';
import { Eye } from 'lucide-react';
import { useNow } from '@/hooks/use-active';
import { PageTitle, SkeletonBlock, ErrorCard, Pill } from '@/components/shell';
import { WeekToggle, WeekView, type WeekFilter } from '@/components/lessons';
import { errMsg, weekParity, WEEK_LABEL, lessonsOn, toMin } from '@/lib/schedule';

export default function Share() {
  const { id = '' } = useParams<{ id: string }>();
  const q = useGetSchedule(id, { query: { enabled: !!id, queryKey: getGetScheduleQueryKey(id), retry: false } });
  const now = useNow();
  const [filter, setFilter] = useState<WeekFilter | null>(null);
  if (q.isLoading) return <div className="space-y-3 mt-6"><SkeletonBlock className="h-20" /><SkeletonBlock className="h-64" /></div>;
  if (q.error || !q.data) return <div className="mt-6"><ErrorCard message={`Bu cədvəl tapılmadı və ya gizlidir. (${errMsg(q.error)})`} onRetry={() => q.refetch()} /></div>;
  const s = q.data;
  const cur = weekParity(s, now.date);
  const live = lessonsOn(s, now.date).find((l) => toMin(l.start) <= now.minutes && now.minutes < toMin(l.end));
  return (
    <div className="space-y-4">
      <PageTitle kicker={`${s.group} · yalnız baxış`} title={s.name} right={<Pill className="bg-card border"><Eye className="h-3 w-3" />Baxış</Pill>} />
      <div className={`rounded-full px-5 py-3 text-sm font-semibold ${live ? 'ink' : 'bg-card border'}`} data-testid="status-friend-now">
        {live ? `Hazırda dərsdədir: ${live.name} (${live.end}-dək)` : 'Hazırda dərsdə deyil'}
      </div>
      <WeekToggle value={filter ?? cur} onChange={setFilter} current={cur} />
      <p className="text-xs text-muted-foreground">Bu həftə: {WEEK_LABEL[cur]}. Bu cədvəli yalnız sahibi redaktə edə bilər.</p>
      <WeekView schedule={s} filter={filter ?? cur} todayWeekday={now.weekday} />
    </div>
  );
}

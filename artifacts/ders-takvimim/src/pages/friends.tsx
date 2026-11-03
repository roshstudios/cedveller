import { useEffect, useState } from 'react';
import { Link } from 'wouter';
import { useListPublicSchedules } from '@workspace/api-client-react';
import { Search, ArrowUpRight } from 'lucide-react';
import { PageTitle, SkeletonBlock, ErrorCard, Pill } from '@/components/shell';
import { errMsg } from '@/lib/schedule';

export default function Friends() {
  const [q, setQ] = useState('');
  const [dq, setDq] = useState('');
  useEffect(() => { const t = setTimeout(() => setDq(q.trim()), 300); return () => clearTimeout(t); }, [q]);
  const res = useListPublicSchedules(dq ? { search: dq } : {});
  return (
    <div className="space-y-5">
      <PageTitle kicker="Hamıya açıq cədvəllər" title="Dostlar" />
      <div className="relative">
        <Search className="absolute left-4 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
        <input className="field pl-11 py-3.5" placeholder="Ad və ya qrup axtar" value={q} onChange={(e) => setQ(e.target.value)} data-testid="input-search" />
      </div>
      <p className="text-xs text-muted-foreground">Burada yalnız sahiblərinin hamıya açıq etdiyi cədvəllər göstərilir.</p>
      {res.isLoading ? <div className="space-y-2">{[0, 1, 2].map((i) => <SkeletonBlock key={i} className="h-20" />)}</div> :
        res.error ? <ErrorCard message={errMsg(res.error)} onRetry={() => res.refetch()} /> :
        !res.data?.length ? (
          <div className="rounded-[2rem] border-2 border-dashed border-foreground/15 p-8 text-center" data-testid="status-empty-friends">
            <div className="font-display font-bold text-2xl">{dq ? 'Uyğun cədvəl tapılmadı' : 'Hələ açıq cədvəl yoxdur'}</div>
            <p className="text-sm text-muted-foreground mt-1">Dostun Ayarlarda cədvəlini hamıya açıq edəndə burada görünəcək.</p>
          </div>
        ) : (
          <div className="grid sm:grid-cols-2 gap-2">
            {res.data.map((s, i) => (
              <Link key={s.id} href={`/paylas/${s.id}`} className="press rise rounded-full bg-card border p-2 pr-4 flex items-center gap-3 hover:border-foreground/40 transition-colors" style={{ animationDelay: `${i * 40}ms` }} data-testid={`link-friend-${s.id}`}>
                <span className="ink h-12 w-12 rounded-full grid place-items-center font-display font-bold">{s.name.slice(0, 2).toLocaleUpperCase('az-AZ')}</span>
                <span className="flex-1 min-w-0"><span className="block font-semibold truncate">{s.name}</span><span className="text-xs text-muted-foreground">{s.lessons.length} dərs</span></span>
                <Pill className="lime">{s.group}</Pill>
                <ArrowUpRight className="h-4 w-4" />
              </Link>
            ))}
          </div>
        )}
    </div>
  );
}

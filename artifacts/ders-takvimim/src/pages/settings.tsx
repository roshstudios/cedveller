import { useEffect, useState } from 'react';
import { ChoiceField } from '@/components/choice-field';
import { Link } from 'wouter';
import { useQueryClient } from '@tanstack/react-query';
import {
  useUpdateSchedule, useDeleteSchedule, getListMySchedulesQueryKey, getGetScheduleQueryKey,
  getListPublicSchedulesQueryKey, getGetBootstrapQueryKey, type ScheduleInput,
} from '@workspace/api-client-react';
import { Copy, Share, SquarePlus, Smartphone, ShieldCheck } from 'lucide-react';
import { useActiveSchedule } from '@/hooks/use-active';
import { useToast } from '@/hooks/use-toast';
import { PageTitle, SkeletonBlock, ErrorCard, btn } from '@/components/shell';
import { errMsg, toInput } from '@/lib/schedule';

export default function Settings() {
  const a = useActiveSchedule();
  const qc = useQueryClient();
  const { toast } = useToast();
  const upd = useUpdateSchedule();
  const del = useDeleteSchedule();
  const [form, setForm] = useState<ScheduleInput | null>(null);
  const [confirmDel, setConfirmDel] = useState(false);
  const owned = a.owned;
  useEffect(() => { setForm(owned ? toInput(owned) : null); }, [owned?.id, owned?.updatedAt]); // eslint-disable-line react-hooks/exhaustive-deps

  const inval = (id: string) => {
    qc.invalidateQueries({ queryKey: getListMySchedulesQueryKey() });
    qc.invalidateQueries({ queryKey: getGetScheduleQueryKey(id) });
    qc.invalidateQueries({ queryKey: getListPublicSchedulesQueryKey() });
    qc.invalidateQueries({ queryKey: getGetBootstrapQueryKey() });
  };
  const save = (data: ScheduleInput, msg: string) => owned && upd.mutate({ id: owned.id, data }, { onSuccess: () => { inval(owned.id); toast({ title: msg }); } });
  const shareUrl = owned ? `${location.origin}${import.meta.env.BASE_URL.replace(/\/$/, '')}/paylas/${owned.id}` : '';

  return (
    <div className="space-y-5">
      <PageTitle kicker="Bu brauzer" title="Ayarlar" />
      <div className="rounded-[2rem] ink p-5 flex gap-3">
        <ShieldCheck className="h-5 w-5 shrink-0 text-[hsl(72_95%_62%)]" />
        <p className="text-sm">Hesab tələb olunmur. Cədvəlin bu brauzerdəki təhlükəsiz kuki ilə sənə bağlıdır. Yalnız bu brauzerdən redaktə edə bilərsən; kukiləri silsən, redaktə icazəsi itəcək. Sən açmadıqca paylaşım bağlıdır.</p>
      </div>

      {a.isLoading ? <SkeletonBlock className="h-64" /> : a.error ? <ErrorCard message={errMsg(a.error)} onRetry={a.refetch} /> :
        !owned || !form ? (
          <div className="rounded-[2rem] border-2 border-dashed border-foreground/15 p-8 text-center" data-testid="status-no-schedule">
            <div className="font-display font-bold text-2xl">Yadda saxlanmış cədvəlin yoxdur</div>
            <p className="text-sm text-muted-foreground mt-1">Öz cədvəl faylını yüklə, dərslərini yoxla və yadda saxla.</p>
            <Link href="/yukle" className={`${btn.ink} mt-4`} data-testid="link-review">Cədvəlini qur</Link>
          </div>
        ) : (
          <>
            <section className="rounded-[2rem] bg-secondary/70 p-4 grid sm:grid-cols-2 gap-3">
              <label className="text-xs font-bold">Görünən ad<input className="field mt-1" value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} data-testid="input-name" /></label>
              <label className="text-xs font-bold">Qrup<input className="field mt-1" value={form.group} onChange={(e) => setForm({ ...form, group: e.target.value })} data-testid="input-group" /></label>
              <label className="text-xs font-bold">İstinad tarixi<input type="date" className="field mt-1" value={form.anchorDate} onChange={(e) => setForm({ ...form, anchorDate: e.target.value })} data-testid="input-anchor-date" /></label>
              <ChoiceField label="Həmin həftənin növü" value={form.anchorWeek}
                options={[{ value: 'lower', label: 'Alt həftə' }, { value: 'upper', label: 'Üst həftə' }]}
                onChange={(v: 'lower' | 'upper') => setForm({ ...form, anchorWeek: v })} testId="select-anchor-week" />
              <button disabled={upd.isPending || !form.name.trim() || !form.group.trim()} onClick={() => save(form, 'Ayarlar yadda saxlanıldı')} className={`${btn.ink} sm:col-span-2`} data-testid="button-save-settings">{upd.isPending ? 'Yadda saxlanılır' : 'Yadda saxla'}</button>
              {upd.error && <p className="sm:col-span-2 text-sm text-destructive font-semibold">Yadda saxlamaq mümkün olmadı: {errMsg(upd.error)}</p>}
            </section>

            <section className="rounded-[2rem] bg-card border p-5 space-y-3">
              <div className="flex items-center justify-between gap-3">
                <div><div className="font-display font-bold text-xl">Hamıya açıq</div><p className="text-sm text-muted-foreground">{owned.isPublic ? 'Dostların səni axtarıb tapa bilər.' : 'Hazırda yalnız sən görürsən.'}</p></div>
                <button disabled={upd.isPending} onClick={() => save({ ...toInput(owned), isPublic: !owned.isPublic }, owned.isPublic ? 'Paylaşım bağlandı' : 'Paylaşıma açıldı')} data-testid="toggle-publish"
                  className={`press h-8 w-14 rounded-full p-1 transition-colors ${owned.isPublic ? 'bg-[hsl(72_95%_52%)]' : 'bg-muted'}`}>
                  <span className={`block h-6 w-6 rounded-full ink transition-transform duration-300 ${owned.isPublic ? 'translate-x-6' : ''}`} />
                </button>
              </div>
              {owned.isPublic && (
                <button onClick={() => navigator.clipboard.writeText(shareUrl).then(() => toast({ title: 'Keçid kopyalandı' }), () => toast({ title: 'Kopyalamaq mümkün olmadı', description: shareUrl }))} className={`${btn.ghost} w-full`} data-testid="button-copy-link"><Copy className="h-4 w-4" /> Paylaşım keçidini kopyala</button>
              )}
            </section>

            <section className="rounded-[2rem] bg-card border p-5">
              <div className="font-display font-bold text-xl">Cədvəli sil</div>
              <p className="text-sm text-muted-foreground">Yadda saxlanmış cədvəl və dərsləri serverdən həmişəlik silinəcək.</p>
              {!confirmDel ? <button onClick={() => setConfirmDel(true)} className={`${btn.ghost} mt-3 text-destructive`} data-testid="button-delete">Sil</button> : (
                <div className="flex gap-2 mt-3">
                  <button onClick={() => setConfirmDel(false)} className={btn.ghost} data-testid="button-cancel-delete">Ləğv et</button>
                  <button disabled={del.isPending} onClick={() => del.mutate({ id: owned.id }, { onSuccess: () => { inval(owned.id); a.setActiveId(null); setConfirmDel(false); toast({ title: 'Cədvəl silindi' }); } })} className={`${btn.danger} flex-1`} data-testid="button-confirm-delete">{del.isPending ? 'Silinir' : 'Bəli, həmişəlik sil'}</button>
                </div>
              )}
              {del.error && <p className="text-sm text-destructive font-semibold mt-2">Silmək mümkün olmadı: {errMsg(del.error)}</p>}
            </section>
          </>
        )}

      <section className="rounded-[2rem] lime p-5">
        <div className="flex items-center gap-2 font-display font-bold text-xl"><Smartphone className="h-5 w-5" /> iPhone-a tətbiq kimi əlavə et</div>
        <ol className="mt-3 space-y-2 text-sm font-semibold">
          <li className="flex items-center gap-3 rounded-full bg-white/50 px-4 py-2"><span className="tnum">1</span> Bu səhifəni Safari-də aç</li>
          <li className="flex items-center gap-3 rounded-full bg-white/50 px-4 py-2"><span className="tnum">2</span> <Share className="h-4 w-4" /> Paylaş düyməsinə toxun</li>
          <li className="flex items-center gap-3 rounded-full bg-white/50 px-4 py-2"><span className="tnum">3</span> <SquarePlus className="h-4 w-4" /> Ana ekrana əlavə et seçimini et</li>
        </ol>
      </section>
    </div>
  );
}

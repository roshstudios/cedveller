import { useCallback, useEffect, useState } from 'react';
import { Bell, BellOff } from 'lucide-react';
import { ChoiceField } from '@/components/choice-field';
import { btn } from '@/components/shell';
import { useToast } from '@/hooks/use-toast';
import { disable, enable, getStatus, pushSupport, save, sendTest, type PushPrefs, type PushStatus } from '@/lib/push';

const REMIND = [
  { value: 0, label: 'Xatırlatma yoxdur' },
  { value: 5, label: '5 dəqiqə əvvəl' },
  { value: 10, label: '10 dəqiqə əvvəl' },
  { value: 15, label: '15 dəqiqə əvvəl' },
  { value: 30, label: '30 dəqiqə əvvəl' },
  { value: 60, label: '1 saat əvvəl' },
] as const;

const DEFAULTS: PushPrefs = { remindBefore: 15, morningEnabled: true, morningTime: '07:30' };

export function NotificationsCard({ scheduleId }: { scheduleId: string }) {
  const { toast } = useToast();
  const support = pushSupport();
  const [status, setStatus] = useState<PushStatus | null>(null);
  const [prefs, setPrefs] = useState<PushPrefs>(DEFAULTS);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');

  const refresh = useCallback(async () => {
    if (support !== 'ok') return;
    try {
      const s = await getStatus();
      setStatus(s);
      if (s.subscribed) setPrefs({ remindBefore: s.remindBefore ?? 15, morningEnabled: s.morningEnabled ?? true, morningTime: s.morningTime ?? '07:30' });
    } catch (e) { setError(e instanceof Error ? e.message : 'Vəziyyəti yoxlamaq mümkün olmadı.'); }
  }, [support]);
  useEffect(() => { void refresh(); }, [refresh]);

  const run = async (fn: () => Promise<void>, ok?: string) => {
    setBusy(true); setError('');
    try { await fn(); await refresh(); if (ok) toast({ title: ok }); }
    catch (e) { setError(e instanceof Error ? e.message : 'Əməliyyat tamamlanmadı.'); }
    finally { setBusy(false); }
  };
  const update = (next: PushPrefs) => { setPrefs(next); if (status?.subscribed) void run(() => save(scheduleId, next)); };

  const wrongSchedule = status?.subscribed && status.scheduleId !== scheduleId;
  return (
    <section className="rounded-[2rem] bg-card border p-5 space-y-3" data-testid="card-notifications">
      <div className="flex items-center gap-2 font-display font-bold text-xl">
        {status?.subscribed ? <Bell className="h-5 w-5" /> : <BellOff className="h-5 w-5" />} Bildirişlər
      </div>

      {support === 'ios-install' && <p className="text-sm text-muted-foreground">iPhone-da bildiriş yalnız saytı <b>Ana ekrana əlavə et</b> ilə əlavə etdikdən sonra, ana ekrandakı ikondan açanda işləyir (iOS 16.4 və ya yuxarı). Aşağıdakı addımları izlə, sonra bu səhifəni ikondan aç.</p>}
      {support === 'unsupported' && <p className="text-sm text-muted-foreground">Bu brauzer bildirişləri dəstəkləmir. Chrome (Android) və ya ana ekrana əlavə olunmuş tətbiq (iPhone) istifadə et.</p>}

      {support === 'ok' && !status && !error && <p className="text-sm text-muted-foreground">Yoxlanılır…</p>}

      {support === 'ok' && status && !status.subscribed && (
        <>
          <p className="text-sm text-muted-foreground">Dərsdən əvvəl və hər səhər gündəlik dərs siyahısı telefonuna bildiriş kimi gəlsin.</p>
          <button disabled={busy} onClick={() => run(() => enable(scheduleId, prefs), 'Bildirişlər açıldı')} className={btn.ink} data-testid="button-enable-push">{busy ? 'Açılır' : 'Bildirişləri aç'}</button>
        </>
      )}

      {support === 'ok' && status?.subscribed && (
        <>
          {wrongSchedule && (
            <div className="rounded-2xl bg-secondary/70 p-3 text-sm">
              Bu cihazın bildirişləri başqa cədvələ bağlıdır.
              <button disabled={busy} onClick={() => run(() => save(scheduleId, prefs), 'Bildirişlər bu cədvələ keçirildi')} className={`${btn.lime} mt-2 w-full`}>Bu cədvələ keçir</button>
            </div>
          )}
          <ChoiceField label="Dərsdən əvvəl xatırlat" value={prefs.remindBefore} options={REMIND} onChange={(v: number) => update({ ...prefs, remindBefore: v })} testId="select-remind" />
          <div className="flex items-center justify-between gap-3">
            <div><div className="text-sm font-bold">Səhər dərs siyahısı</div><p className="text-xs text-muted-foreground">Dərsi olan günlərdə göndərilir</p></div>
            <button aria-label="Səhər bildirişi" disabled={busy} onClick={() => update({ ...prefs, morningEnabled: !prefs.morningEnabled })} data-testid="toggle-morning"
              className={`press h-8 w-14 shrink-0 rounded-full p-1 transition-colors ${prefs.morningEnabled ? 'bg-[hsl(72_95%_52%)]' : 'bg-muted'}`}>
              <span className={`block h-6 w-6 rounded-full ink transition-transform duration-300 ${prefs.morningEnabled ? 'translate-x-6' : ''}`} />
            </button>
          </div>
          {prefs.morningEnabled && (
            <label className="block text-xs font-bold">Səhər bildirişinin saatı (Bakı vaxtı)
              <input type="time" className="field mt-1" value={prefs.morningTime} disabled={busy}
                onChange={(e) => e.target.value && update({ ...prefs, morningTime: e.target.value })} data-testid="input-morning-time" />
            </label>
          )}
          <div className="flex gap-2 pt-1">
            <button disabled={busy} onClick={() => run(sendTest, 'Sınaq bildirişi göndərildi')} className={`${btn.ghost} flex-1`} data-testid="button-test-push">Sınaq göndər</button>
            <button disabled={busy} onClick={() => run(disable, 'Bildirişlər söndürüldü')} className={`${btn.ghost} flex-1 text-destructive`} data-testid="button-disable-push">Söndür</button>
          </div>
        </>
      )}
      {error && <p className="text-sm text-destructive font-semibold">{error}</p>}
    </section>
  );
}

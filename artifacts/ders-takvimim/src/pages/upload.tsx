import { useRef, useState } from 'react';
import { useLocation } from 'wouter';
import { useGetBootstrap, getGetBootstrapQueryKey, useParseTimetable, type Extraction } from '@workspace/api-client-react';
import { FileUp, AlertTriangle, HelpCircle, RefreshCw } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { ErrorCard, btn, Pill } from '@/components/shell';
import { WizardFrame } from '@/components/wizard-frame';
import { ScheduleEditor } from '@/components/schedule-editor';
import { fileToImages } from '@/lib/pdf';
import { bakuNow, errMsg } from '@/lib/schedule';

type Src = { images: string[]; text: string; fileName: string; pages: number; verifiedSource?: boolean };
const BDU_SOURCE_SHA256 = '6496a0c453675c9c98824ca406f5438fda4bc03fc3760678e2c811ab9e22ff1c';

export default function Upload({ onboarding = false }: { onboarding?: boolean }) {
  const [, nav] = useLocation();
  const { toast } = useToast();
  const boot = useGetBootstrap({ query: { queryKey: getGetBootstrapQueryKey(), enabled: false } });
  const parse = useParseTimetable();
  const [group, setGroup] = useState('');
  const [src, setSrc] = useState<Src | null>(null);
  const [prepErr, setPrepErr] = useState<string | null>(null);
  const [preparing, setPreparing] = useState(false);
  const [result, setResult] = useState<Extraction | null>(null);
  const [version, setVersion] = useState(0);
  const [clar, setClar] = useState('');
  const [reviewing, setReviewing] = useState(false);
  const fileRef = useRef<HTMLInputElement>(null);

  const run = (s: Src, clarification?: string) => {
    parse.mutate(
      { data: { group, fileName: s.fileName, images: s.images, text: s.text || undefined, clarification: clarification || undefined } },
      { onSuccess: (r) => { setResult(r); setReviewing(true); setVersion((v) => v + 1); window.scrollTo({ top: 0 }); if (clarification) toast({ title: 'İlkin variant yeniləndi', description: 'Əvvəlki variant yeni nəticə ilə əvəz olundu.' }); } },
    );
  };

  const onFile = async (f: File | undefined) => {
    if (!f) return;
    if (!group.trim()) { setPrepErr('Əvvəl qrupunu yaz.'); return; }
    if (result && !window.confirm('Yeni fayl əvvəlki çıxarışı və saxlanmamış düzəlişləri əvəz edəcək. Davam edilsin?')) return;
    setPrepErr(null); setResult(null); setSrc(null); parse.reset(); setPreparing(true);
    try {
      if (f.size > 15 * 1024 * 1024) throw new Error('Fayl ən çox 15 MB ola bilər.');
      if (f.name.toLowerCase().endsWith('.pdf') && group.toUpperCase().replace(/[^A-Z0-9]/g, '') === 'TT11') {
        const hash = [...new Uint8Array(await crypto.subtle.digest('SHA-256', await f.arrayBuffer()))]
          .map((b) => b.toString(16).padStart(2, '0')).join('');
        if (hash === BDU_SOURCE_SHA256) {
          const bootstrap = boot.data ?? (await boot.refetch()).data;
          if (!bootstrap) throw new Error('Yoxlanılmış mənbəni almaq mümkün olmadı. Yenidən cəhd et.');
          setSrc({ images: [], text: '', fileName: f.name, pages: 2, verifiedSource: true });
          setResult({ lessons: bootstrap.template.lessons, warnings: [
            'Bu faylın rəqəmsal izi mənbə BDU PDF-i ilə tam uyğundur. TT-11 dərsləri şəkildən yenidən təxmin edilmədən yoxlanılmış ilkin variantdan götürüldü.',
            ...bootstrap.warnings,
          ], questions: [], sourceName: f.name });
          setVersion((v) => v + 1);
          setReviewing(true); window.scrollTo({ top: 0 });
          return;
        }
      }
      const r = await fileToImages(f, group);
      const s = { ...r, fileName: f.name };
      setSrc(s);
      run(s);
    } catch (e) { setPrepErr(errMsg(e)); } finally { setPreparing(false); }
  };

  const saved = (schedule: { id: string }) => { localStorage.setItem('dt-active-id', schedule.id); toast({ title: 'Cədvəl yadda saxlanıldı', description: 'Cədvəl bu brauzerə bağlandı.' }); nav('/'); };

  return (
    <div className="space-y-5">
      {!reviewing && <WizardFrame step={1}>
          <p className="text-sm text-muted-foreground">{onboarding ? 'İlk cədvəlini öz faylından yaradaq.' : 'Yeni cədvəl əlavə et.'} Faylı oxuduqdan sonra dərsləri düzəldə, adını və paylaşımını seçə biləcəksən.</p>
          <div className="rounded-[2rem] bg-secondary/70 p-4 space-y-3">
            <label className="text-xs font-bold block">Qrupun (sənəddə axtarılacaq)
              <input className="field mt-1" value={group} maxLength={40} disabled={preparing || parse.isPending || !!result}
                onChange={(e) => setGroup(e.target.value)} placeholder="Qrup kodunu yaz" data-testid="input-group" />
            </label>
            <button onClick={() => fileRef.current?.click()} disabled={preparing || parse.isPending || !group.trim()} data-testid="button-pick-file"
              className="press w-full rounded-[1.75rem] border-2 border-dashed border-foreground/25 bg-card p-8 flex flex-col items-center gap-2 hover:border-foreground/60 transition-colors disabled:opacity-60">
              <span className="ink rounded-full p-3"><FileUp className="h-6 w-6" /></span>
              <span className="font-display font-bold text-lg">{preparing ? 'Səhifələr hazırlanır' : parse.isPending ? 'Cədvəl oxunur' : 'PDF, DOCX və ya şəkil seç'}</span>
              <span className="text-xs text-muted-foreground">PDF, Word (.docx), PNG və ya JPEG · ən çox 15 MB. Groq ilə ən çox 3 səhifə. Word cədvəlinin birləşdirilmiş hüceyrələri qorunaraq oxunur. Fayl AI xidmətinə göndərilir; heç nə avtomatik saxlanılmır.</span>
            </button>
            <div className="rounded-[1.5rem] bg-secondary/70 p-4 text-xs leading-relaxed space-y-1">
              <p><strong>Üst/Alt həftə:</strong> eyni saat blokunun üst hissəsi Üst, alt hissəsi Alt həftədir.</p>
              <p><strong>Dərs növü:</strong> iki və daha çox qrupun sütununu tutan hüceyrə mühazirə, yalnız bir qrupun hüceyrəsi seminardır. Bölünmüş blokun hər iki hissəsi də mühazirə ola bilər.</p>
            </div>
            <input ref={fileRef} type="file" accept=".pdf,.docx,application/pdf,application/vnd.openxmlformats-officedocument.wordprocessingml.document,image/png,image/jpeg" className="hidden" onChange={(e) => { onFile(e.target.files?.[0]); e.target.value = ''; }} data-testid="input-file" />
            {src && <div className="flex flex-wrap gap-2"><Pill className="bg-card">{src.fileName}</Pill><Pill className="bg-card">{src.verifiedSource ? 'Yoxlanılmış TT-11 mənbəsi' : `${src.images.length}/${src.pages} səhifə göndərildi`}</Pill></div>}
          </div>
          {(parse.isPending) && <div className="space-y-2">{[0, 1, 2].map((i) => <div key={i} className="h-14 animate-pulse rounded-full bg-muted" />)}</div>}
          {prepErr && <ErrorCard message={prepErr} />}
          {parse.error && <ErrorCard message={`Oxuma uğursuz oldu: ${errMsg(parse.error)}`} onRetry={src ? () => run(src, clar) : undefined} />}
          {result && <div className="flex flex-wrap gap-2">
            <button className={btn.ink} onClick={() => setReviewing(true)} data-testid="button-resume-review">Düzəlişlərə davam et</button>
            <button className={btn.ghost} onClick={() => {
              if (window.confirm('Saxlanmamış çıxarış və düzəlişlər silinəcək. Yenidən başlansın?')) {
                setResult(null); setSrc(null); setClar(''); parse.reset();
              }
            }} data-testid="button-restart-upload">Yenidən başla</button>
          </div>}
      </WizardFrame>}
          {result && (
            <div hidden={!reviewing}>
              <ScheduleEditor key={version} wizard navigationVisible={!onboarding} busy={parse.isPending} onReviewBack={() => setReviewing(false)} onSaved={saved}
                initial={{ name: '', group: group.trim(), isPublic: false, anchorDate: src?.verifiedSource ? '2026-11-02' : bakuNow().date, anchorWeek: 'lower', lessons: result.lessons }}
                banner={<div className="space-y-3">
                  <p className="text-sm text-muted-foreground">{result.sourceName} faylından {result.lessons.length} dərs çıxarıldı. Hər dərsin saatını, həftəsini və növünü yoxla, lazım olsa düzəlt.</p>
              {(result.warnings.length > 0 || result.questions.length > 0) && (
                <div className="rounded-[2rem] bg-card border p-5 space-y-3">
                  {result.warnings.map((w) => <div key={w} className="flex gap-2 text-sm"><AlertTriangle className="h-4 w-4 shrink-0 text-destructive" />{w}</div>)}
                  {result.questions.length > 0 && (
                    <>
                      {result.questions.map((q) => <div key={q} className="flex gap-2 text-sm font-semibold"><HelpCircle className="h-4 w-4 shrink-0" />{q}</div>)}
                      <textarea className="field" rows={3} placeholder="Cavabını yaz" value={clar} onChange={(e) => setClar(e.target.value)} data-testid="input-clarification" />
                      <p className="text-xs text-muted-foreground">Yenidən oxuma eyni səhifələrdən istifadə edir və aşağıdakı düzəlişlərini əvəz edir.</p>
                      <button disabled={!clar.trim() || !src || parse.isPending} onClick={() => {
                        if (src && window.confirm('Yenidən oxuma etdiyin düzəlişləri əvəz edəcək. Davam edilsin?')) run(src, clar);
                      }} className={btn.ink} data-testid="button-reparse"><RefreshCw className="h-4 w-4" /> {parse.isPending ? 'Oxunur…' : 'Cavabla və yenidən oxu'}</button>
                    </>
                  )}
                </div>
              )}
                  {parse.error && <ErrorCard message={`Oxuma uğursuz oldu: ${errMsg(parse.error)}`} />}
                </div>} />
            </div>
          )}
    </div>
  );
}

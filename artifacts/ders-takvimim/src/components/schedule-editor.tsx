import { useState } from 'react';
import { useQueryClient } from '@tanstack/react-query';
import {
  useCreateSchedule, useUpdateSchedule, getListMySchedulesQueryKey, getGetScheduleQueryKey,
  getGetBootstrapQueryKey, getListPublicSchedulesQueryKey,
  type Lesson, type ScheduleInput, type Schedule,
} from '@workspace/api-client-react';
import { Plus, Trash2, ChevronDown, Check, Lock, Globe } from 'lucide-react';
import { DAYS, TYPE_LABEL, WEEK_LABEL, blankLesson, sortLessons, errMsg } from '@/lib/schedule';
import { btn, Pill } from './shell';
import { ChoiceField } from './choice-field';
import { WizardFrame } from './wizard-frame';

const TIME = /^(?:[01][0-9]|2[0-3]):[0-5][0-9]$/;

function validate(l: Lesson) {
  if (!l.name.trim()) return 'Dərsin adı boşdur';
  if (!TIME.test(l.start) || !TIME.test(l.end)) return 'Saat SS:DD formatında olmalıdır';
  if (l.end <= l.start) return 'Bitiş vaxtı başlanğıcdan sonra olmalıdır';
  return null;
}

function LessonRow({ l, onChange, onDelete }: { l: Lesson; onChange: (l: Lesson) => void; onDelete: () => void }) {
  const [open, setOpen] = useState(!l.name);
  const err = validate(l);
  const set = <K extends keyof Lesson>(k: K, v: Lesson[K]) => onChange({ ...l, [k]: v });
  return (
    <div className={`rounded-[1.5rem] border-[1.5px] bg-card transition-colors ${err ? 'border-destructive/60' : ''}`} data-testid={`row-lesson-${l.id}`}>
      <button onClick={() => setOpen(!open)} className="w-full flex items-center gap-3 p-3 text-left" data-testid={`button-expand-${l.id}`}>
        <span className="tnum text-xs font-bold rounded-full bg-muted px-2.5 py-1">{DAYS[l.day - 1]?.slice(0, 3)} {l.start}</span>
        <span className="flex-1 truncate font-semibold text-sm">{l.name || 'Adsız dərs'}</span>
        {l.week !== 'all' && <Pill className="ink hidden sm:inline-flex">{WEEK_LABEL[l.week]}</Pill>}
        <ChevronDown className={`h-4 w-4 transition-transform ${open ? 'rotate-180' : ''}`} />
      </button>
      {err && <div className="px-4 -mt-1 pb-2 text-xs font-semibold text-destructive">{err}</div>}
      {open && (
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 p-3 pt-0">
          <label className="col-span-2 sm:col-span-4 text-xs font-bold">Dərsin adı
            <input className="field mt-1" value={l.name} onChange={(e) => set('name', e.target.value)} data-testid={`input-name-${l.id}`} />
          </label>
          <ChoiceField label="Gün" value={l.day} options={DAYS.map((d, i) => ({ value: i + 1, label: d }))}
            onChange={(v) => set('day', v)} testId={`select-day-${l.id}`} />
          <label className="text-xs font-bold">Başlanğıc
            <input type="time" className="field mt-1 tnum" value={l.start} onChange={(e) => set('start', e.target.value)} data-testid={`input-start-${l.id}`} />
          </label>
          <label className="text-xs font-bold">Bitiş
            <input type="time" className="field mt-1 tnum" value={l.end} onChange={(e) => set('end', e.target.value)} data-testid={`input-end-${l.id}`} />
          </label>
          <label className="text-xs font-bold">Auditoriya
            <input className="field mt-1" value={l.room} onChange={(e) => set('room', e.target.value)} data-testid={`input-room-${l.id}`} />
          </label>
          <label className="col-span-2 text-xs font-bold">Müəllim
            <input className="field mt-1" value={l.teacher} onChange={(e) => set('teacher', e.target.value)} data-testid={`input-teacher-${l.id}`} />
          </label>
          <ChoiceField label="Həftə" value={l.week}
            options={(['all', 'upper', 'lower'] as const).map((w) => ({ value: w, label: WEEK_LABEL[w] }))}
            onChange={(v) => set('week', v)} testId={`select-week-${l.id}`} />
          <ChoiceField label="Növ" value={l.type}
            options={(['lecture', 'seminar', 'lab'] as const).map((w) => ({ value: w, label: TYPE_LABEL[w] }))}
            onChange={(v) => set('type', v)} testId={`select-type-${l.id}`} />
          <label className="col-span-2 sm:col-span-3 text-xs font-bold">Qeyd
            <input className="field mt-1" value={l.note} onChange={(e) => set('note', e.target.value)} data-testid={`input-note-${l.id}`} />
          </label>
          <button onClick={onDelete} className={`${btn.ghost} self-end text-destructive`} data-testid={`button-delete-lesson-${l.id}`}>
            <Trash2 className="h-4 w-4" /> Sil
          </button>
        </div>
      )}
    </div>
  );
}

export function ScheduleEditor({ initial, scheduleId, onSaved, onCancel, banner, wizard = false, onReviewBack, busy = false, navigationVisible = true }: {
  initial: ScheduleInput; scheduleId?: string; onSaved: (s: Schedule) => void; onCancel?: () => void; banner?: React.ReactNode;
  wizard?: boolean; onReviewBack?: () => void; busy?: boolean; navigationVisible?: boolean;
}) {
  const qc = useQueryClient();
  const [draft, setDraft] = useState<ScheduleInput>(initial);
  const [confirming, setConfirming] = useState(false);
  const [phase, setPhase] = useState<'review' | 'profile'>('review');
  const create = useCreateSchedule();
  const update = useUpdateSchedule();
  const pending = create.isPending || update.isPending || busy;
  const error = create.error || update.error;
  const invalidLessons = draft.lessons.length === 0 || draft.lessons.some((l) => validate(l));
  const overlaps = draft.lessons.some((a, i) => draft.lessons.slice(i + 1).some((b) =>
    a.day === b.day && (a.week === b.week || a.week === 'all' || b.week === 'all') && a.start < b.end && b.start < a.end));
  const invalid = invalidLessons || overlaps || !draft.name.trim() || !draft.group.trim();

  const setLesson = (id: string, l: Lesson) => setDraft((d) => ({ ...d, lessons: d.lessons.map((x) => (x.id === id ? l : x)) }));
  const del = (id: string) => setDraft((d) => ({ ...d, lessons: d.lessons.filter((x) => x.id !== id) }));
  const add = () => setDraft((d) => ({ ...d, lessons: [...d.lessons, blankLesson()] }));

  const save = () => {
    if (pending || invalid) return;
    const done = (s: Schedule) => {
      qc.setQueryData<Schedule[]>(getListMySchedulesQueryKey(), (list) => [s, ...(list ?? []).filter((x) => x.id !== s.id)]);
      qc.setQueryData(getGetScheduleQueryKey(s.id), s);
      qc.invalidateQueries({ queryKey: getListMySchedulesQueryKey() });
      qc.invalidateQueries({ queryKey: getGetScheduleQueryKey(s.id) });
      qc.invalidateQueries({ queryKey: getGetBootstrapQueryKey() });
      qc.invalidateQueries({ queryKey: getListPublicSchedulesQueryKey() });
      setConfirming(false);
      onSaved(s);
    };
    if (scheduleId) update.mutate({ id: scheduleId, data: draft }, { onSuccess: done });
    else create.mutate({ data: draft }, { onSuccess: done });
  };

  const content = (
    <div className="space-y-4">
      {(!wizard || phase === 'review') && banner}
      {(!wizard || phase === 'profile') && <>
      {wizard && <div className="rounded-[1.5rem] bg-card border p-4 text-sm"><strong>{draft.group}</strong> · {draft.lessons.length} dərs yoxlanıldı. Adını yaz və cədvəlini kimlərin görə biləcəyini seç.</div>}
      <div className="rounded-[2rem] bg-secondary/70 p-4 grid sm:grid-cols-2 gap-3" data-testid="schedule-profile">
        <label className="text-xs font-bold">Görünən ad
          <input className="field mt-1" value={draft.name} maxLength={80} onChange={(e) => setDraft({ ...draft, name: e.target.value })} data-testid="input-schedule-name" />
        </label>
        <label className="text-xs font-bold">Qrup
          <input className="field mt-1" value={draft.group} maxLength={40} onChange={(e) => setDraft({ ...draft, group: e.target.value })} data-testid="input-schedule-group" />
        </label>
        <label className="text-xs font-bold">İstinad tarixi
          <input type="date" className="field mt-1" value={draft.anchorDate} onChange={(e) => setDraft({ ...draft, anchorDate: e.target.value })} data-testid="input-anchor-date" />
        </label>
        <ChoiceField label="Həmin həftənin növü" value={draft.anchorWeek}
          options={(['lower', 'upper'] as const).map((w) => ({ value: w, label: WEEK_LABEL[w] }))}
          onChange={(v) => setDraft({ ...draft, anchorWeek: v })} testId="select-anchor-week" />
        <button role="switch" aria-checked={draft.isPublic} aria-label="Cədvəli hamıya açıq et" onClick={() => setDraft({ ...draft, isPublic: !draft.isPublic })} data-testid="toggle-public"
          className="sm:col-span-2 press flex items-center gap-3 rounded-full bg-card border px-4 py-3 text-left">
          {draft.isPublic ? <Globe className="h-4 w-4" /> : <Lock className="h-4 w-4" />}
          <span className="flex-1 text-sm font-semibold">{draft.isPublic ? 'Hamıya açıq: dostların axtarıb görə bilər' : 'Gizli: yalnız bu brauzerdən görünür'}</span>
          <span className={`h-6 w-11 rounded-full p-0.5 transition-colors ${draft.isPublic ? 'bg-[hsl(72_95%_52%)]' : 'bg-muted'}`}>
            <span className={`block h-5 w-5 rounded-full ink transition-transform duration-300 ${draft.isPublic ? 'translate-x-5' : ''}`} />
          </span>
        </button>
      </div>
      {wizard && <p className="text-xs text-muted-foreground px-2">Paylaşım bağlı başlayır. Açsan, adın, qrupun və cədvəlin Dostlar bölməsində görünəcək. İstinad tarixi və həmin həftənin növünü öz cədvəlinə görə yoxla.</p>}
      </>}
      {(!wizard || phase === 'review') && <>
      <div className="flex items-center justify-between">
        <h2 className="font-display font-bold text-2xl">Dərslər <span className="tnum text-base text-muted-foreground">{draft.lessons.length}</span></h2>
        <button onClick={add} className={btn.lime} data-testid="button-add-lesson"><Plus className="h-4 w-4" /> Dərs əlavə et</button>
      </div>
      {overlaps && <p className="text-sm font-semibold text-destructive" role="alert">Eyni həftədə üst-üstə düşən dərslər var. Həftə və saat seçimlərini düzəlt.</p>}
      </>}
      <div className="space-y-2">
        {draft.lessons.length === 0 && (
          <div className="rounded-[1.5rem] border-2 border-dashed border-foreground/15 p-6 text-sm text-muted-foreground text-center">Hələ dərs yoxdur. Əl ilə əlavə edə bilərsən.</div>
        )}
        {sortLessons(draft.lessons).map((l) => (
          <LessonRow key={l.id} l={l} onChange={(n) => setLesson(l.id, n)} onDelete={() => del(l.id)} />
        ))}
      </div>

      {error && <div className="rounded-[1.5rem] border-2 border-destructive/40 bg-card p-4 text-sm" data-testid="status-save-error">Yadda saxlamaq mümkün olmadı: {errMsg(error)}</div>}

      <div className={`sticky ${wizard && !navigationVisible ? 'bottom-[calc(env(safe-area-inset-bottom)+1rem)]' : 'bottom-[calc(env(safe-area-inset-bottom)+5.5rem)]'} md:bottom-4 z-30 rounded-full bg-card/95 backdrop-blur border p-1.5 flex gap-2 shadow-lg`}>
        {onCancel && <button onClick={onCancel} className={btn.ghost} data-testid="button-cancel-edit">Ləğv et</button>}
        {wizard ? (
          phase === 'review' ? <button disabled={invalidLessons || overlaps || pending} onClick={() => { setPhase('profile'); window.scrollTo({ top: 0, behavior: 'smooth' }); }}
            className={`${btn.ink} flex-1`} data-testid="button-wizard-next">{invalidLessons || overlaps ? 'Əvvəl dərsləri düzəlt' : 'Yoxladım, davam et'}</button> :
          <button disabled={invalid || pending} onClick={save} className={`${btn.lime} flex-1`} data-testid="button-wizard-finish">
            <Check className="h-4 w-4" />{pending ? 'Yadda saxlanılır…' : 'Tamamla və yadda saxla'}
          </button>
        ) : !confirming ? (
          <button disabled={invalid} onClick={() => setConfirming(true)} className={`${btn.ink} flex-1`} data-testid="button-review-save">
            {invalid ? 'Əvvəl xətaları düzəlt' : scheduleId ? 'Dəyişiklikləri saxla' : 'Yoxladım, yadda saxla'}
          </button>
        ) : (
          <button disabled={pending} onClick={save} className={`${btn.lime} flex-1`} data-testid="button-confirm-save">
            <Check className="h-4 w-4" /> {pending ? 'Yadda saxlanılır' : `Təsdiqlə: ${draft.lessons.length} dərs ${scheduleId ? 'yenilənsin' : 'saxlanılsın'}`}
          </button>
        )}
      </div>
    </div>
  );
  return wizard ? <WizardFrame step={phase === 'review' ? 2 : 3} onBack={pending ? undefined : () => {
    if (phase === 'profile') setPhase('review'); else onReviewBack?.();
    window.scrollTo({ top: 0, behavior: 'smooth' });
  }}>{content}</WizardFrame> : content;
}

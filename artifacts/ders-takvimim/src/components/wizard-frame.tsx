import type { ReactNode } from 'react';
import { ArrowLeft, Check } from 'lucide-react';

const STEPS = ['Faylı yüklə', 'Dərsləri yoxla', 'Ad və paylaşım'] as const;

export function WizardFrame({ step, children, onBack }: { step: 1 | 2 | 3; children: ReactNode; onBack?: () => void }) {
  return (
    <section className="mx-auto w-full max-w-2xl pt-4 rise" aria-labelledby="wizard-step-title" data-testid="wizard-frame">
      <div className="flex items-center justify-between gap-3 min-h-11">
        {onBack ? (
          <button type="button" onClick={onBack} data-testid="button-wizard-back"
            className="press inline-flex items-center gap-1.5 rounded-full border-[1.5px] border-foreground/15 bg-card h-11 px-4 text-sm font-bold hover:border-foreground/40">
            <ArrowLeft className="h-4 w-4" /> Geri
          </button>
        ) : <span />}
        <span className="tnum text-xs font-bold text-muted-foreground" data-testid="text-wizard-step">
          {step} / {STEPS.length}
        </span>
      </div>

      {step === 1 && (
        <div className="mt-5">
          <div className="text-xs font-bold uppercase tracking-[0.18em] text-muted-foreground">Xoş gəldin</div>
          <p className="font-display font-extrabold text-3xl md:text-4xl leading-[1] mt-1">Cədvəlini üç addımda qur.</p>
        </div>
      )}

      <ol className="mt-6 grid grid-cols-3 gap-2" aria-label="Addımlar">
        {STEPS.map((label, i) => {
          const n = i + 1;
          const done = n < step;
          const current = n === step;
          return (
            <li key={label} aria-current={current ? 'step' : undefined} data-testid={`step-wizard-${n}`} className="min-w-0">
              <div className="h-1.5 rounded-full bg-muted overflow-hidden">
                <div className={`h-full rounded-full origin-left transition-transform duration-500 ease-out ${done ? 'ink' : current ? 'lime' : ''}`}
                  style={{ transform: `scaleX(${done || current ? 1 : 0})` }} />
              </div>
              <div className={`mt-2 flex items-center gap-1.5 text-xs font-bold ${current ? 'text-foreground' : 'text-muted-foreground'}`}>
                <span className={`grid place-items-center h-5 w-5 shrink-0 rounded-full text-[10px] ${done ? 'ink' : current ? 'lime' : 'border-[1.5px] border-foreground/20'}`}>
                  {done ? <Check className="h-3 w-3" strokeWidth={3} /> : n}
                </span>
                <span className="truncate">{label}</span>
              </div>
            </li>
          );
        })}
      </ol>

      <h1 id="wizard-step-title" className="sr-only">Addım {step} / {STEPS.length}: {STEPS[step - 1]}</h1>
      <div className="mt-6">{children}</div>
    </section>
  );
}

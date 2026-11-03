import { useId } from 'react';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from './ui/select';

/** Branded, keyboard-accessible choices; never opens the iOS native picker. */
export function ChoiceField<T extends string | number>({ label, value, options, onChange, testId }: {
  label: string;
  value: T;
  options: readonly { value: T; label: string }[];
  onChange: (value: T) => void;
  testId: string;
}) {
  const id = useId();
  return (
    <div className="min-w-0">
      <label htmlFor={id} className="block text-xs font-bold">{label}</label>
      <Select value={String(value)} onValueChange={(v) => {
        const option = options.find((o) => String(o.value) === v);
        if (option) onChange(option.value);
      }}>
        <SelectTrigger id={id} data-testid={testId}
          className="mt-1 h-11 rounded-full border-[1.5px] bg-card px-4 text-base shadow-none focus:ring-4 focus:ring-accent/60 [&>span]:truncate">
          <SelectValue />
        </SelectTrigger>
        <SelectContent position="popper" sideOffset={6} collisionPadding={16}
          className="max-h-[min(340px,var(--radix-select-content-available-height))] min-w-[var(--radix-select-trigger-width)] rounded-[1.5rem] border-[1.5px] border-primary/20 bg-card p-1 shadow-[0_12px_40px_hsl(262_38%_14%_/_0.18)]">
          {options.map((o) => (
            <SelectItem key={o.value} value={String(o.value)}
              className="min-h-11 cursor-pointer rounded-full py-3 pl-4 pr-10 text-sm font-semibold focus:bg-secondary data-[state=checked]:bg-accent data-[state=checked]:text-accent-foreground">
              {o.label}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>
    </div>
  );
}

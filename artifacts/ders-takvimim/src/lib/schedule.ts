import type { Lesson, ScheduleInput, Schedule } from '@workspace/api-client-react';

export const TZ = 'Asia/Baku';
export const DAYS = ['Bazar ertəsi', 'Çərşənbə axşamı', 'Çərşənbə', 'Cümə axşamı', 'Cümə', 'Şənbə', 'Bazar'];
export const DAYS_SHORT = ['B.e.', 'Ç.a.', 'Çər.', 'C.a.', 'Cüm.', 'Şən.', 'Baz.'];
const MONTHS = ['yanvar', 'fevral', 'mart', 'aprel', 'may', 'iyun', 'iyul', 'avqust', 'sentyabr', 'oktyabr', 'noyabr', 'dekabr'];
export const WEEK_LABEL: Record<string, string> = { lower: 'Alt həftə', upper: 'Üst həftə', all: 'Hər həftə' };
export const TYPE_LABEL: Record<string, string> = { lecture: 'Mühazirə', seminar: 'Seminar', lab: 'Laboratoriya' };
export const TYPE_TONE: Record<string, string> = {
  lecture: 'bg-[hsl(72_95%_62%)] text-[hsl(262_38%_14%)]',
  seminar: 'bg-[hsl(14_92%_70%)] text-[hsl(262_38%_14%)]',
  lab: 'bg-[hsl(190_60%_72%)] text-[hsl(262_38%_14%)]',
};

export type BakuNow = { date: string; weekday: number; minutes: number; seconds: number };

export function bakuNow(d = new Date()): BakuNow {
  const parts = new Intl.DateTimeFormat('en-GB', {
    timeZone: TZ, year: 'numeric', month: '2-digit', day: '2-digit',
    hour: '2-digit', minute: '2-digit', second: '2-digit', hourCycle: 'h23',
  }).formatToParts(d);
  const g = (t: string) => parts.find((p) => p.type === t)?.value ?? '00';
  const date = `${g('year')}-${g('month')}-${g('day')}`;
  return { date, weekday: weekdayOf(date), minutes: Number(g('hour')) * 60 + Number(g('minute')), seconds: Number(g('second')) };
}

const dayNum = (iso: string) => {
  const [y, m, d] = iso.split('-').map(Number);
  return Math.floor(Date.UTC(y, m - 1, d) / 86400000);
};
export const weekdayOf = (iso: string) => ((dayNum(iso) + 3) % 7) + 1; // 1970-01-01 was Thursday
export function addDays(iso: string, n: number) {
  return new Date((dayNum(iso) + n) * 86400000).toISOString().slice(0, 10);
}
export function weekParity(s: Pick<ScheduleInput, 'anchorDate' | 'anchorWeek'>, iso: string): 'lower' | 'upper' {
  const mon = (x: string) => dayNum(x) - (weekdayOf(x) - 1);
  const diff = Math.round((mon(iso) - mon(s.anchorDate)) / 7);
  const even = ((diff % 2) + 2) % 2 === 0;
  return even ? s.anchorWeek : s.anchorWeek === 'lower' ? 'upper' : 'lower';
}
export const toMin = (t: string) => Number(t.slice(0, 2)) * 60 + Number(t.slice(3, 5));
export const sortLessons = (l: Lesson[]) => [...l].sort((a, b) => a.day - b.day || toMin(a.start) - toMin(b.start));

export function lessonsOn(s: ScheduleInput, iso: string) {
  const p = weekParity(s, iso);
  const wd = weekdayOf(iso);
  return sortLessons(s.lessons.filter((l) => l.day === wd && (l.week === 'all' || l.week === p)));
}

export function findNext(s: ScheduleInput, now: BakuNow) {
  for (let i = 0; i < 21; i++) {
    const iso = addDays(now.date, i);
    const ls = lessonsOn(s, iso).filter((l) => i > 0 || toMin(l.start) > now.minutes);
    if (ls.length) return { lesson: ls[0], date: iso, offset: i };
  }
  return null;
}

export function fmtDuration(min: number) {
  if (min < 60) return `${min} dəq`;
  const h = Math.floor(min / 60), m = min % 60;
  return m ? `${h} saat ${m} dəq` : `${h} saat`;
}
export function fmtDate(iso: string) {
  const [, m, d] = iso.split('-').map(Number);
  return `${d} ${MONTHS[m - 1]}`;
}

export const newId = () => `l_${Date.now().toString(36)}${Math.random().toString(36).slice(2, 7)}`;
export const blankLesson = (day = 1): Lesson => ({
  id: newId(), day, start: '08:30', end: '09:50', name: '', room: '', teacher: '', week: 'all', type: 'lecture', note: '',
});
export function toInput(s: ScheduleInput | Schedule): ScheduleInput {
  return { name: s.name, group: s.group, isPublic: s.isPublic, anchorDate: s.anchorDate, anchorWeek: s.anchorWeek, lessons: s.lessons };
}
export function errMsg(e: unknown) {
  if (!e) return 'Naməlum xəta';
  const anyE = e as { data?: { error?: string; message?: string }; message?: string };
  return anyE.data?.error || anyE.data?.message || anyE.message || 'Naməlum xəta';
}

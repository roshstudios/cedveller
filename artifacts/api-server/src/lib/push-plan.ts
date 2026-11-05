// Pure planning logic: which notifications are due right now for one subscription.
export type PlanLesson = { id: string; day: number; start: string; end: string; name: string; room: string; teacher: string; week: string };
export type PlanSub = { remindBefore: number; morningEnabled: boolean; morningTime: string };
export type PlanSchedule = { anchorDate: string; anchorWeek: string; lessons: PlanLesson[] };
export type PlanItem = { key: string; title: string; body: string; tag: string; ttl: number; urgency: "normal" | "high" };

export const TZ = "Asia/Baku";
const toMin = (t: string) => Number(t.slice(0, 2)) * 60 + Number(t.slice(3, 5));
const dayNum = (iso: string) => { const [y, m, d] = iso.split("-").map(Number); return Math.floor(Date.UTC(y!, m! - 1, d!) / 86400000); };
const weekdayOf = (iso: string) => ((dayNum(iso) + 3) % 7) + 1;

export function bakuClock(d = new Date()) {
  const parts = new Intl.DateTimeFormat("en-GB", { timeZone: TZ, year: "numeric", month: "2-digit", day: "2-digit", hour: "2-digit", minute: "2-digit", hourCycle: "h23" }).formatToParts(d);
  const g = (t: string) => parts.find((p) => p.type === t)?.value ?? "00";
  return { date: `${g("year")}-${g("month")}-${g("day")}`, minutes: Number(g("hour")) * 60 + Number(g("minute")) };
}

export function weekParity(s: Pick<PlanSchedule, "anchorDate" | "anchorWeek">, iso: string): "lower" | "upper" {
  const mon = (x: string) => dayNum(x) - (weekdayOf(x) - 1);
  const diff = Math.round((mon(iso) - mon(s.anchorDate)) / 7);
  const even = ((diff % 2) + 2) % 2 === 0;
  return even ? (s.anchorWeek as "lower" | "upper") : s.anchorWeek === "lower" ? "upper" : "lower";
}

export function lessonsOn(s: PlanSchedule, iso: string) {
  const p = weekParity(s, iso);
  const wd = weekdayOf(iso);
  return s.lessons.filter((l) => l.day === wd && (l.week === "all" || l.week === p)).sort((a, b) => toMin(a.start) - toMin(b.start));
}

const REMIND_GRACE = 10; // minutes after the ideal time we still send (cron jitter)
const MORNING_GRACE = 25;

export function duePushes(sub: PlanSub, sched: PlanSchedule, now: { date: string; minutes: number }): PlanItem[] {
  const out: PlanItem[] = [];
  const today = lessonsOn(sched, now.date);
  if (sub.remindBefore > 0) {
    for (const l of today) {
      const start = toMin(l.start);
      const at = start - sub.remindBefore;
      if (now.minutes >= at && now.minutes < Math.min(start, at + REMIND_GRACE)) {
        const extra = [l.room && `otaq ${l.room}`, l.teacher].filter(Boolean).join(" · ");
        out.push({
          key: `${now.date}:l:${l.id}`, tag: `lesson-${l.id}`,
          title: `Növbəti dərs: ${l.start}`,
          body: `${l.name}${extra ? ` · ${extra}` : ""}`,
          ttl: 600, urgency: "high",
        });
      }
    }
  }
  if (sub.morningEnabled && today.length) {
    const at = toMin(sub.morningTime);
    if (now.minutes >= at && now.minutes < at + MORNING_GRACE) {
      const lines = today.slice(0, 6).map((l) => `${l.start} ${l.name}${l.room ? ` (${l.room})` : ""}`);
      if (today.length > 6) lines.push(`+${today.length - 6} dərs`);
      out.push({ key: `${now.date}:m`, tag: "morning", title: `Bu gün ${today.length} dərs var`, body: lines.join("\n"), ttl: 3600, urgency: "normal" });
    }
  }
  return out;
}

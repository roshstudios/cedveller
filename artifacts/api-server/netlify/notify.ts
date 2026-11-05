import { and, eq, lt, notInArray, sql } from "drizzle-orm";
import { db, schedulesTable, pushSubscriptionsTable, pushSentTable } from "@workspace/db";
import { bakuClock, duePushes, type PlanLesson } from "../src/lib/push-plan";
import { sendPush } from "../src/lib/webpush";
import { getVapidKeys, vapidSubject } from "../src/lib/push-keys";

// Runs every 5 minutes (published deploys only) and sends reminders that are due.
export default async function notify() {
  const now = bakuClock();
  const keys = await getVapidKeys();
  const subject = vapidSubject();
  const rows = await db.select({ sub: pushSubscriptionsTable, sched: schedulesTable })
    .from(pushSubscriptionsTable).innerJoin(schedulesTable, eq(pushSubscriptionsTable.scheduleId, schedulesTable.id));
  let sent = 0, failed = 0, removed = 0;

  const work = rows.flatMap(({ sub, sched }) =>
    duePushes(sub, { anchorDate: sched.anchorDate, anchorWeek: sched.anchorWeek, lessons: sched.lessons as PlanLesson[] }, now).map((item) => ({ sub, item })));

  for (let i = 0; i < work.length; i += 10) {
    await Promise.all(work.slice(i, i + 10).map(async ({ sub, item }) => {
      const claimed = await db.insert(pushSentTable).values({ endpoint: sub.endpoint, key: item.key }).onConflictDoNothing().returning({ key: pushSentTable.key });
      if (!claimed.length) return; // already sent
      try {
        const r = await sendPush(sub, { title: item.title, body: item.body, tag: item.tag, url: "/" }, keys, { subject, ttl: item.ttl, urgency: item.urgency });
        if (r.ok) { sent++; return; }
        if (r.gone) { removed++; await db.delete(pushSubscriptionsTable).where(eq(pushSubscriptionsTable.endpoint, sub.endpoint)); return; }
        failed++;
        await db.delete(pushSentTable).where(and(eq(pushSentTable.endpoint, sub.endpoint), eq(pushSentTable.key, item.key)));
      } catch {
        failed++;
        await db.delete(pushSentTable).where(and(eq(pushSentTable.endpoint, sub.endpoint), eq(pushSentTable.key, item.key)));
      }
    }));
  }

  // housekeeping
  await db.delete(pushSentTable).where(lt(pushSentTable.sentAt, sql`now() - interval '3 days'`));
  const live = db.select({ id: schedulesTable.id }).from(schedulesTable);
  await db.delete(pushSubscriptionsTable).where(notInArray(pushSubscriptionsTable.scheduleId, live));

  console.log(JSON.stringify({ at: `${now.date} ${Math.floor(now.minutes / 60)}:${String(now.minutes % 60).padStart(2, "0")}`, subs: rows.length, due: work.length, sent, failed, removed }));
  return new Response(JSON.stringify({ sent, failed, removed }), { headers: { "content-type": "application/json" } });
}

export const config = { schedule: "*/5 * * * *" };

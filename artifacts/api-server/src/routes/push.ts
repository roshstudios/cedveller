import { Router, type IRouter, type Request, type Response } from "express";
import { createHash } from "node:crypto";
import { and, eq, ne } from "drizzle-orm";
import { z } from "zod";
import { db, schedulesTable, pushSubscriptionsTable } from "@workspace/db";
import { getVapidKeys, vapidSubject } from "../lib/push-keys";
import { isAllowedEndpoint, sendPush } from "../lib/webpush";

const router: IRouter = Router();

function ownerHash(req: Request): string | null {
  const token = req.cookies?.dt_device;
  if (typeof token !== "string" || !/^[a-f0-9]{64}$/.test(token)) return null;
  return createHash("sha256").update(token).digest("hex");
}
function need(req: Request, res: Response): string | null {
  const hash = ownerHash(req);
  if (!hash) res.status(401).json({ error: "Əvvəlcə cədvəl yarat." });
  return hash;
}

const Endpoint = z.string().max(1000).refine(isAllowedEndpoint, "bad endpoint");
const SubscribeBody = z.object({
  subscription: z.object({ endpoint: Endpoint, keys: z.object({ p256dh: z.string().min(80).max(200), auth: z.string().min(16).max(60) }) }),
  scheduleId: z.string().min(1).max(100),
  remindBefore: z.number().int().refine((v) => [0, 5, 10, 15, 20, 30, 45, 60].includes(v)),
  morningEnabled: z.boolean(),
  morningTime: z.string().regex(/^(?:[01][0-9]|2[0-3]):[0-5][0-9]$/),
});
const EndpointBody = z.object({ endpoint: Endpoint });

router.get("/push/key", async (_req, res): Promise<void> => {
  res.json({ publicKey: (await getVapidKeys()).publicKey });
});

router.post("/push/status", async (req, res): Promise<void> => {
  const hash = need(req, res); if (!hash) return;
  const body = EndpointBody.safeParse(req.body);
  if (!body.success) { res.status(400).json({ error: "Bildiriş ünvanı düzgün deyil." }); return; }
  const [row] = await db.select().from(pushSubscriptionsTable).where(and(eq(pushSubscriptionsTable.endpoint, body.data.endpoint), eq(pushSubscriptionsTable.ownerHash, hash)));
  if (!row) { res.json({ subscribed: false }); return; }
  res.json({ subscribed: true, scheduleId: row.scheduleId, remindBefore: row.remindBefore, morningEnabled: row.morningEnabled, morningTime: row.morningTime });
});

router.post("/push/subscribe", async (req, res): Promise<void> => {
  const hash = need(req, res); if (!hash) return;
  const body = SubscribeBody.safeParse(req.body);
  if (!body.success) { res.status(400).json({ error: "Bildiriş məlumatları düzgün deyil." }); return; }
  const d = body.data;
  const [sched] = await db.select({ id: schedulesTable.id }).from(schedulesTable).where(and(eq(schedulesTable.id, d.scheduleId), eq(schedulesTable.ownerHash, hash)));
  if (!sched) { res.status(404).json({ error: "Cədvəl tapılmadı və ya bu brauzerə aid deyil." }); return; }
  const others = await db.select({ e: pushSubscriptionsTable.endpoint }).from(pushSubscriptionsTable).where(and(eq(pushSubscriptionsTable.ownerHash, hash), ne(pushSubscriptionsTable.endpoint, d.subscription.endpoint))).limit(10);
  if (others.length >= 10) { res.status(400).json({ error: "Ən çox 10 cihaz üçün bildiriş aça bilərsən." }); return; }
  const values = { endpoint: d.subscription.endpoint, ownerHash: hash, scheduleId: d.scheduleId, p256dh: d.subscription.keys.p256dh, auth: d.subscription.keys.auth, remindBefore: d.remindBefore, morningEnabled: d.morningEnabled, morningTime: d.morningTime };
  await db.insert(pushSubscriptionsTable).values(values).onConflictDoUpdate({ target: pushSubscriptionsTable.endpoint, set: values });
  res.json({ ok: true });
});

router.post("/push/unsubscribe", async (req, res): Promise<void> => {
  const hash = need(req, res); if (!hash) return;
  const body = EndpointBody.safeParse(req.body);
  if (!body.success) { res.status(400).json({ error: "Bildiriş ünvanı düzgün deyil." }); return; }
  await db.delete(pushSubscriptionsTable).where(and(eq(pushSubscriptionsTable.endpoint, body.data.endpoint), eq(pushSubscriptionsTable.ownerHash, hash)));
  res.json({ ok: true });
});

const testBuckets = new Map<string, { count: number; reset: number }>();
router.post("/push/test", async (req, res): Promise<void> => {
  const hash = need(req, res); if (!hash) return;
  const body = EndpointBody.safeParse(req.body);
  if (!body.success) { res.status(400).json({ error: "Bildiriş ünvanı düzgün deyil." }); return; }
  const now = Date.now();
  const bucket = testBuckets.get(hash) ?? { count: 0, reset: now + 3600000 };
  if (bucket.reset < now) { bucket.count = 0; bucket.reset = now + 3600000; }
  if (bucket.count >= 6) { res.status(429).json({ error: "Saatda ən çox 6 sınaq bildirişi göndərə bilərsən." }); return; }
  bucket.count++; testBuckets.set(hash, bucket);
  const [row] = await db.select().from(pushSubscriptionsTable).where(and(eq(pushSubscriptionsTable.endpoint, body.data.endpoint), eq(pushSubscriptionsTable.ownerHash, hash)));
  if (!row) { res.status(404).json({ error: "Bu cihaz üçün bildiriş aktiv deyil." }); return; }
  try {
    const result = await sendPush(row, { title: "Bildirişlər işləyir", body: "Dərs xatırlatmaları bu cihaza belə gələcək.", tag: "test", url: "/" }, await getVapidKeys(), { subject: vapidSubject(), ttl: 120, urgency: "high" });
    if (result.gone) { await db.delete(pushSubscriptionsTable).where(eq(pushSubscriptionsTable.endpoint, row.endpoint)); res.status(410).json({ error: "Bu cihazın bildiriş icazəsi bitib. Bildirişləri yenidən aç." }); return; }
    if (!result.ok) { res.status(502).json({ error: `Bildiriş xidməti rədd etdi (HTTP ${result.status}).` }); return; }
    res.json({ ok: true });
  } catch {
    res.status(502).json({ error: "Bildiriş göndərmək mümkün olmadı." });
  }
});

export default router;

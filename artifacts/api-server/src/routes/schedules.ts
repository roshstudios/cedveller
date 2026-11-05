import { Router, type IRouter, type Request, type Response } from "express";
import { randomBytes, randomUUID, createHash } from "node:crypto";
import { and, eq, desc, ilike, or } from "drizzle-orm";
import { db, schedulesTable, pushSubscriptionsTable, type StoredSchedule } from "@workspace/db";
import {
  CreateScheduleBody, CreateScheduleResponse, UpdateScheduleBody, UpdateScheduleResponse,
  GetScheduleParams, GetScheduleResponse, DeleteScheduleParams,
  ListMySchedulesResponse, ListPublicSchedulesQueryParams, ListPublicSchedulesResponse,
  GetBootstrapResponse, ParseTimetableBody, ParseTimetableResponse,
} from "@workspace/api-zod";
import { template, templateWarnings, weekFor } from "../lib/template";
import { extractTimetable, TimetableServiceError } from "../lib/extract";

const router: IRouter = Router();
function owner(req: Request, res: Response) {
  let token = req.cookies?.dt_device;
  if (typeof token !== "string" || !/^[a-f0-9]{64}$/.test(token)) {
    token = randomBytes(32).toString("hex");
    res.cookie("dt_device", token, { httpOnly: true, secure: req.secure || process.env.NODE_ENV === "production" || Boolean(process.env.AWS_LAMBDA_FUNCTION_NAME), sameSite: "lax", maxAge: 31536000000, path: "/api" });
  }
  return createHash("sha256").update(token).digest("hex");
}
function present(row: StoredSchedule, hash: string) {
  const { ownerHash, ...rest } = row;
  return { ...rest, updatedAt: row.updatedAt.toISOString(), owned: ownerHash === hash };
}
function validateTimes(data: { anchorDate: string; lessons: { id: string; day: number; start: string; end: string; week: string }[] }) {
  const anchor = new Date(`${data.anchorDate}T12:00:00Z`);
  if (!Number.isFinite(anchor.getTime()) || anchor.toISOString().slice(0, 10) !== data.anchorDate) return "Düzgün istinad tarixi seç.";
  const ids = new Set<string>();
  for (const l of data.lessons) {
    if (l.end <= l.start) return "Dərsin bitiş vaxtı başlanğıcdan sonra olmalıdır.";
    if (ids.has(l.id)) return "Dərslərin identifikatorları təkrarlanmamalıdır.";
    ids.add(l.id);
  }
  for (let i = 0; i < data.lessons.length; i++) for (let j = i + 1; j < data.lessons.length; j++) {
    const a = data.lessons[i]!, b = data.lessons[j]!;
    if (a.day === b.day && (a.week === b.week || a.week === "all" || b.week === "all") && a.start < b.end && b.start < a.end) return "Eyni həftədə üst-üstə düşən dərslər var; saat və həftə seçimlərini düzəlt.";
  }
  return null;
}
router.get("/bootstrap", (_req, res) => {
  const today = new Intl.DateTimeFormat("en-CA", { timeZone: "Asia/Baku", year: "numeric", month: "2-digit", day: "2-digit" }).format(new Date());
  res.json(GetBootstrapResponse.parse({ template, currentWeek: weekFor(today), today, timezone: "Asia/Baku", sourceName: "BDU · 2026–2027 I Semestr", warnings: templateWarnings }));
});
router.get("/schedules", async (req, res): Promise<void> => {
  const hash = owner(req, res);
  const rows = await db.select().from(schedulesTable).where(eq(schedulesTable.ownerHash, hash)).orderBy(desc(schedulesTable.updatedAt));
  res.json(ListMySchedulesResponse.parse(rows.map(r => present(r, hash))));
});
router.post("/schedules", async (req, res): Promise<void> => {
  const hash = owner(req, res);
  const parsed = CreateScheduleBody.safeParse(req.body);
  if (!parsed.success) { res.status(400).json({ error: "Cədvəl məlumatları düzgün deyil." }); return; }
  const invalid = validateTimes(parsed.data);
  if (invalid) { res.status(400).json({ error: invalid }); return; }
  const mine = await db.select({ id: schedulesTable.id }).from(schedulesTable).where(eq(schedulesTable.ownerHash, hash)).limit(20);
  if (mine.length >= 20) { res.status(400).json({ error: "Ən çox 20 cədvəl saxlaya bilərsən." }); return; }
  const [row] = await db.insert(schedulesTable).values({ ...parsed.data, id: randomUUID(), ownerHash: hash }).returning();
  res.status(201).json(CreateScheduleResponse.parse(present(row!, hash)));
});
router.get("/schedules/:id", async (req, res): Promise<void> => {
  const hash = owner(req, res);
  const params = GetScheduleParams.safeParse(req.params);
  if (!params.success) { res.status(400).json({ error: "Cədvəl identifikatoru düzgün deyil." }); return; }
  const [row] = await db.select().from(schedulesTable).where(and(eq(schedulesTable.id, params.data.id), or(eq(schedulesTable.isPublic, true), eq(schedulesTable.ownerHash, hash))));
  if (!row) { res.status(404).json({ error: "Cədvəl tapılmadı və ya gizlidir." }); return; }
  res.json(GetScheduleResponse.parse(present(row, hash)));
});
router.put("/schedules/:id", async (req, res): Promise<void> => {
  const hash = owner(req, res);
  const parsed = UpdateScheduleBody.safeParse(req.body);
  const params = GetScheduleParams.safeParse(req.params);
  if (!parsed.success || !params.success) { res.status(400).json({ error: "Cədvəl məlumatları düzgün deyil." }); return; }
  const invalid = validateTimes(parsed.data);
  if (invalid) { res.status(400).json({ error: invalid }); return; }
  const [row] = await db.update(schedulesTable).set({ ...parsed.data, updatedAt: new Date() }).where(and(eq(schedulesTable.id, params.data.id), eq(schedulesTable.ownerHash, hash))).returning();
  if (!row) { res.status(404).json({ error: "Cədvəl tapılmadı və ya bu brauzerə aid deyil." }); return; }
  res.json(UpdateScheduleResponse.parse(present(row, hash)));
});
router.delete("/schedules/:id", async (req, res): Promise<void> => {
  const hash = owner(req, res);
  const parsed = DeleteScheduleParams.safeParse(req.params);
  if (!parsed.success) { res.status(400).json({ error: "Cədvəl identifikatoru düzgün deyil." }); return; }
  const rows = await db.delete(schedulesTable).where(and(eq(schedulesTable.id, parsed.data.id), eq(schedulesTable.ownerHash, hash))).returning({ id: schedulesTable.id });
  if (!rows.length) { res.status(404).json({ error: "Cədvəl tapılmadı." }); return; }
  await db.delete(pushSubscriptionsTable).where(eq(pushSubscriptionsTable.scheduleId, parsed.data.id));
  res.sendStatus(204);
});
router.get("/directory", async (req, res): Promise<void> => {
  const hash = owner(req, res);
  const parsed = ListPublicSchedulesQueryParams.safeParse(req.query);
  if (!parsed.success) { res.status(400).json({ error: "Axtarış düzgün deyil." }); return; }
  const search = (parsed.data.search || "").slice(0, 80).replace(/[%_\\]/g, "\\$&");
  const rows = await db.select().from(schedulesTable).where(and(eq(schedulesTable.isPublic, true), or(ilike(schedulesTable.name, `%${search}%`), ilike(schedulesTable.group, `%${search}%`)))).orderBy(desc(schedulesTable.updatedAt)).limit(100);
  res.json(ListPublicSchedulesResponse.parse(rows.map(r => present(r, hash))));
});
const buckets = new Map<string, { count: number; reset: number }>();
router.post("/parse", async (req, res): Promise<void> => {
  const key = req.ip || "unknown";
  const now = Date.now();
  for (const [k, value] of buckets) if (value.reset < now) buckets.delete(k);
  const bucket = buckets.get(key) || { count: 0, reset: now + 3600000 };
  if (bucket.count >= 8) { res.status(429).json({ error: "Saatlıq AI oxuma limitinə çatdın. Bir qədər sonra yenidən cəhd et." }); return; }
  const parsed = ParseTimetableBody.safeParse(req.body);
  if (!parsed.success) { res.status(400).json({ error: "Fayl və ya qrup məlumatı düzgün deyil. Ən çox 8 səhifə yüklə." }); return; }
  if (!parsed.data.images.length || parsed.data.images.some(s => !/^data:image\/(png|jpeg|webp);base64,[A-Za-z0-9+/=\r\n]+$/.test(s))) {
    res.status(400).json({ error: "PDF səhifələrini və ya bir şəkil yüklə." }); return;
  }
  if (parsed.data.images.reduce((n, s) => n + s.length, 0) > 4_500_000) { res.status(413).json({ error: "Şəkillər çox böyükdür. Lazım olan hissəni kəsib yenidən yüklə." }); return; }
  bucket.count++; buckets.set(key, bucket);
  try {
    const result = await extractTimetable(parsed.data);
    res.json(ParseTimetableResponse.parse(result));
  } catch (err) {
    req.log.error({ errorType: err instanceof Error ? err.name : "unknown" }, "Timetable extraction failed");
    res.status(err instanceof TimetableServiceError ? err.status : 503).json({ error: err instanceof TimetableServiceError ? err.message : "AI cədvəli oxuya bilmədi. Yenidən cəhd et və ya cədvəli əl ilə redaktə et." });
  }
});
export default router;

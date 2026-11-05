import { eq } from "drizzle-orm";
import { db, appSecretsTable } from "@workspace/db";
import { generateVapidKeys, type VapidKeys } from "./webpush";

let cached: VapidKeys | null = null;

/** VAPID keys come from env (VAPID_PUBLIC_KEY/VAPID_PRIVATE_KEY) or are created once and stored in the database. */
export async function getVapidKeys(): Promise<VapidKeys> {
  if (cached) return cached;
  const envPub = process.env.VAPID_PUBLIC_KEY;
  const envPriv = process.env.VAPID_PRIVATE_KEY;
  if (envPub && envPriv) return (cached = { publicKey: envPub, privateKey: envPriv });
  const read = async () => {
    const [row] = await db.select().from(appSecretsTable).where(eq(appSecretsTable.name, "vapid_keys"));
    return row ? (JSON.parse(row.value) as VapidKeys) : null;
  };
  let keys = await read();
  if (!keys) {
    await db.insert(appSecretsTable).values({ name: "vapid_keys", value: JSON.stringify(generateVapidKeys()) }).onConflictDoNothing();
    keys = await read();
  }
  if (!keys) throw new Error("VAPID keys unavailable");
  return (cached = keys);
}

export const vapidSubject = () => process.env.VAPID_SUBJECT || process.env.URL || "mailto:admin@example.com";

export type PushPrefs = { remindBefore: number; morningEnabled: boolean; morningTime: string };
export type PushStatus = { subscribed: boolean; scheduleId?: string } & Partial<PushPrefs>;
export type PushSupport = 'ok' | 'ios-install' | 'unsupported';

const API = '/api/push';

export function pushSupport(): PushSupport {
  const ios = /iphone|ipad|ipod/i.test(navigator.userAgent) || (navigator.platform === 'MacIntel' && navigator.maxTouchPoints > 1);
  const standalone = window.matchMedia('(display-mode: standalone)').matches || (navigator as unknown as { standalone?: boolean }).standalone === true;
  const capable = 'serviceWorker' in navigator && 'PushManager' in window && 'Notification' in window;
  if (ios && !standalone) return 'ios-install';
  return capable ? 'ok' : 'unsupported';
}

async function call<T>(path: string, body?: unknown): Promise<T> {
  const res = await fetch(`${API}${path}`, {
    method: body === undefined ? 'GET' : 'POST',
    headers: body === undefined ? undefined : { 'Content-Type': 'application/json' },
    body: body === undefined ? undefined : JSON.stringify(body),
  });
  const data = await res.json().catch(() => ({}));
  if (!res.ok) throw new Error((data as { error?: string }).error || `HTTP ${res.status}`);
  return data as T;
}

const b64uToBytes = (s: string) => {
  const pad = '='.repeat((4 - (s.length % 4)) % 4);
  const raw = atob((s + pad).replace(/-/g, '+').replace(/_/g, '/'));
  return Uint8Array.from(raw, (c) => c.charCodeAt(0));
};

async function registration() {
  return navigator.serviceWorker.ready;
}

export async function currentSubscription() {
  if (pushSupport() !== 'ok') return null;
  return (await registration()).pushManager.getSubscription();
}

export async function getStatus(): Promise<PushStatus> {
  const sub = await currentSubscription();
  if (!sub) return { subscribed: false };
  return call<PushStatus>('/status', { endpoint: sub.endpoint });
}

/** Must be called from a tap/click handler (iOS requires it for the permission prompt). */
export async function enable(scheduleId: string, prefs: PushPrefs) {
  const permission = await Notification.requestPermission();
  if (permission !== 'granted') throw new Error('Bildiriş icazəsi verilmədi. Telefonun ayarlarından bu sayt üçün bildirişlərə icazə ver.');
  const reg = await registration();
  let sub = await reg.pushManager.getSubscription();
  if (!sub) {
    const { publicKey } = await call<{ publicKey: string }>('/key');
    sub = await reg.pushManager.subscribe({ userVisibleOnly: true, applicationServerKey: b64uToBytes(publicKey) });
  }
  await save(scheduleId, prefs, sub);
}

export async function save(scheduleId: string, prefs: PushPrefs, sub?: PushSubscription | null) {
  const s = sub ?? (await currentSubscription());
  if (!s) throw new Error('Bu cihazda bildiriş aktiv deyil.');
  const json = s.toJSON();
  await call('/subscribe', {
    subscription: { endpoint: s.endpoint, keys: { p256dh: json.keys?.p256dh, auth: json.keys?.auth } },
    scheduleId, ...prefs,
  });
}

export async function disable() {
  const sub = await currentSubscription();
  if (!sub) return;
  await call('/unsubscribe', { endpoint: sub.endpoint }).catch(() => {});
  await sub.unsubscribe().catch(() => {});
}

export async function sendTest() {
  const sub = await currentSubscription();
  if (!sub) throw new Error('Bu cihazda bildiriş aktiv deyil.');
  await call('/test', { endpoint: sub.endpoint });
}

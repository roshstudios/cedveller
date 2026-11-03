import { useEffect, useState } from 'react';
import { useListMySchedules } from '@workspace/api-client-react';
import { bakuNow } from '@/lib/schedule';

const KEY = 'dt-active-id';

export function useActiveSchedule() {
  const mine = useListMySchedules();
  const [activeId, setActive] = useState<string | null>(() => localStorage.getItem(KEY));
  const list = mine.data ?? [];
  const owned = list.find((s) => s.id === activeId) ?? list[0] ?? null;
  const setActiveId = (id: string | null) => {
    if (id) localStorage.setItem(KEY, id); else localStorage.removeItem(KEY);
    setActive(id);
  };
  return {
    mine,
    list,
    owned,
    schedule: owned,
    isDraft: !owned,
    isLoading: mine.isLoading,
    error: mine.error,
    refetch: () => { mine.refetch(); },
    setActiveId,
  };
}

export function useNow(intervalMs = 15000) {
  const [now, setNow] = useState(() => bakuNow());
  useEffect(() => {
    const t = setInterval(() => setNow(bakuNow()), intervalMs);
    return () => clearInterval(t);
  }, [intervalMs]);
  return now;
}

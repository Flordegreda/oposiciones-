"use client";

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
  type ReactNode,
} from "react";
import { getSyncService, type SyncPhase } from "@/lib/persistence";

type PersistenceContextValue = {
  phase: SyncPhase;
  detail: string | null;
  syncNow: () => Promise<void>;
};

const PersistenceContext = createContext<PersistenceContextValue>({
  phase: "idle",
  detail: null,
  syncNow: async () => undefined,
});

export function PersistenceProvider({ children }: { children: ReactNode }) {
  const [phase, setPhase] = useState<SyncPhase>("idle");
  const [detail, setDetail] = useState<string | null>(null);

  useEffect(() => {
    const sync = getSyncService();
    const unsub = sync.subscribe((p, d) => {
      setPhase(p);
      setDetail(d ?? null);
    });
    sync.start();
    return () => {
      unsub();
      sync.stop();
    };
  }, []);

  const syncNow = useCallback(async () => {
    await getSyncService().syncNow("manual");
  }, []);

  const value = useMemo(
    () => ({ phase, detail, syncNow }),
    [phase, detail, syncNow],
  );

  return (
    <PersistenceContext.Provider value={value}>{children}</PersistenceContext.Provider>
  );
}

export function usePersistence() {
  return useContext(PersistenceContext);
}

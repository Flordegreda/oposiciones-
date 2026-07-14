"use client";

import { createContext, useCallback, useContext, useEffect, useMemo, useState } from "react";

export type PageHeaderState = {
  title?: string | null;
  backHref?: string | null;
  backLabel?: string | null;
};

type PageHeaderContextValue = {
  state: PageHeaderState;
  setState: (patch: PageHeaderState) => void;
  clearState: () => void;
};

const PageHeaderContext = createContext<PageHeaderContextValue | null>(null);

export function PageHeaderProvider({ children }: { children: React.ReactNode }) {
  const [state, setStateRaw] = useState<PageHeaderState>({});

  const setState = useCallback((patch: PageHeaderState) => {
    setStateRaw((prev) => ({ ...prev, ...patch }));
  }, []);

  const clearState = useCallback(() => setStateRaw({}), []);

  const value = useMemo(
    () => ({
      state,
      setState,
      clearState,
    }),
    [state, setState, clearState],
  );

  return (
    <PageHeaderContext.Provider value={value}>{children}</PageHeaderContext.Provider>
  );
}

function usePageHeaderContext() {
  return useContext(PageHeaderContext);
}

export function usePageHeaderState() {
  return usePageHeaderContext()?.state ?? {};
}

type SetPageHeaderProps = PageHeaderState;

/** Actualiza la cabecera desde componentes cliente (p. ej. simulacro en curso). */
export function SetPageHeader({ title, backHref, backLabel }: SetPageHeaderProps) {
  const ctx = usePageHeaderContext();

  useEffect(() => {
    if (!ctx) return;
    ctx.setState({ title, backHref, backLabel });
    return () => ctx.clearState();
  }, [ctx, title, backHref, backLabel]);

  useEffect(() => {
    if (!title) return;
    const prev = document.title;
    document.title = `${title} — JEX`;
    return () => {
      document.title = prev;
    };
  }, [title]);

  return null;
}

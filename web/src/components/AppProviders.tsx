"use client";

import { PageHeaderProvider } from "@/components/page-header-context";
import { PersistenceProvider } from "@/components/PersistenceProvider";

export function AppProviders({ children }: { children: React.ReactNode }) {
  return (
    <PersistenceProvider>
      <PageHeaderProvider>{children}</PageHeaderProvider>
    </PersistenceProvider>
  );
}

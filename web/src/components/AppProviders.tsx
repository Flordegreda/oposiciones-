"use client";

import { PageHeaderProvider } from "@/components/page-header-context";
import { PersistenceProvider } from "@/components/PersistenceProvider";
import { PwaRegister } from "@/components/PwaRegister";

export function AppProviders({ children }: { children: React.ReactNode }) {
  return (
    <PersistenceProvider>
      <PageHeaderProvider>
        <PwaRegister />
        {children}
      </PageHeaderProvider>
    </PersistenceProvider>
  );
}
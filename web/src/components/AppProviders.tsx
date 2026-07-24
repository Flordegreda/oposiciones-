"use client";

import { PageHeaderProvider } from "@/components/page-header-context";

export function AppProviders({ children }: { children: React.ReactNode }) {
  return <PageHeaderProvider>{children}</PageHeaderProvider>;
}

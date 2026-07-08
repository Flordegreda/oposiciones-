"use client";

import { useEffect, useState } from "react";
import { useSearchParams } from "next/navigation";
import { PrintSheet } from "@/components/PrintSheet";
import { PRINT_SESSION_KEY, parsePrintSearchParams, type PrintUrlOptions } from "@/lib/print-url";
import type { PrintSection } from "@/lib/print-test";

type StoredJob = {
  title: string;
  subtitle?: string;
  sections: PrintSection[];
} & PrintUrlOptions;

export default function PrintSessionClient() {
  const searchParams = useSearchParams();
  const [job, setJob] = useState<StoredJob | null>(null);
  const [missing, setMissing] = useState(false);

  useEffect(() => {
    const key = searchParams.get("k");
    if (!key) {
      setMissing(true);
      return;
    }
    try {
      const raw = sessionStorage.getItem(`${PRINT_SESSION_KEY}:${key}`);
      if (!raw) {
        setMissing(true);
        return;
      }
      const parsed = JSON.parse(raw) as StoredJob;
      setJob(parsed);
      sessionStorage.removeItem(`${PRINT_SESSION_KEY}:${key}`);
    } catch {
      setMissing(true);
    }
  }, [searchParams]);

  if (missing) {
    return (
      <p className="print-route-hint">
        No se encontró el test para imprimir. Vuelve a la app y pulsa Imprimir de nuevo.
      </p>
    );
  }

  if (!job) {
    return <p className="print-route-hint">Cargando test…</p>;
  }

  const opts = parsePrintSearchParams({
    style: job.answerStyle === "inline" ? "inline" : undefined,
    explanations: job.showExplanations ? "1" : undefined,
  });

  return (
    <PrintSheet
      title={job.title}
      subtitle={job.subtitle}
      sections={job.sections}
      answerStyle={opts.answerStyle}
      showExplanations={opts.showExplanations}
    />
  );
}

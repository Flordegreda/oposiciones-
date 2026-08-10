"use client";

import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { Suspense, useEffect, useMemo, useState } from "react";
import { SiteHeader } from "@/components/SiteHeader";
import { MobileBottomNav } from "@/components/MobileBottomNav";
import { ExamSession } from "@/components/ExamSession";
import type { PublicExamPregunta } from "@/lib/exam-utils";
import { prepareExamSessionQuestions } from "@/lib/exam-utils";
import { JEX_SUBTITLE } from "@/lib/constants";
import { fetchWithRetry } from "@/lib/retry";
import {
  obtenerPoolRepaso,
  sessionPreguntaId,
  type ModoRepaso,
  type RepasoQuery,
} from "@/lib/persistence/repaso-fallos";

type SessionState = {
  list: PublicExamPregunta[];
  optionMaps: number[][];
  originalOpciones: string[][];
  banner: string;
  title: string;
};

function parseRepasoQuery(params: URLSearchParams): RepasoQuery {
  const rawModo = params.get("modo");
  let modo: ModoRepaso = "top";
  if (rawModo === "maraton") modo = "maraton";
  else if (rawModo === "banco") modo = "banco";
  else if (rawModo === "criticos") modo = "criticos";

  return {
    modo,
    bancoId: params.get("banco") ?? undefined,
    bancoNombre: params.get("nombre") ?? undefined,
  };
}

function RepasoFallosInner() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const query = useMemo(
    () => parseRepasoQuery(searchParams),
    [searchParams],
  );
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [empty, setEmpty] = useState(false);
  const [session, setSession] = useState<SessionState | null>(null);

  useEffect(() => {
    let cancelled = false;

    async function boot() {
      setLoading(true);
      setError(null);
      setEmpty(false);
      setSession(null);
      try {
        if (query.modo === "banco" && !query.bancoId) {
          throw new Error("Falta el banco para el repaso");
        }

        const { pool, title, banner } = await obtenerPoolRepaso(query);
        if (cancelled) return;
        if (!pool.length) {
          setEmpty(true);
          return;
        }

        const uniqueIds = [...new Set(pool.map((p) => p.preguntaId))];
        const res = await fetchWithRetry(
          "/api/exam/by-ids",
          {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ ids: uniqueIds }),
          },
          { retries: 3, baseDelayMs: 400, maxDelayMs: 8_000 },
        );
        const data = (await res.json()) as {
          preguntas?: PublicExamPregunta[];
          error?: string;
        };
        if (!res.ok) throw new Error(data.error || "No se pudieron cargar las preguntas");

        const byId = new Map((data.preguntas ?? []).map((p) => [p.id, p]));
        const counts = new Map<string, number>();
        const list: PublicExamPregunta[] = [];

        for (const item of pool) {
          const src = byId.get(item.preguntaId);
          if (!src) continue;
          const n = counts.get(item.preguntaId) ?? 0;
          counts.set(item.preguntaId, n + 1);
          list.push({
            ...src,
            id: sessionPreguntaId(item.preguntaId, n),
          });
        }

        if (!list.length) {
          setEmpty(true);
          return;
        }

        const prepared = prepareExamSessionQuestions(list);
        setSession({
          list: prepared.questions,
          optionMaps: prepared.optionMaps,
          originalOpciones: prepared.originalOpciones,
          title,
          banner,
        });
      } catch (e) {
        if (!cancelled) {
          setError(e instanceof Error ? e.message : "Error al iniciar el repaso");
        }
      } finally {
        if (!cancelled) setLoading(false);
      }
    }

    void boot();
    return () => {
      cancelled = true;
    };
  }, [query]);

  if (session) {
    return (
      <div className="site site--mobile-nav">
        <SiteHeader />
        <main className="site-main">
          <ExamSession
            title={session.title}
            preguntas={session.list}
            examMode={false}
            timerSeconds={null}
            backHref="/estadisticas"
            onFinish={() => router.push("/estadisticas")}
            optionMaps={session.optionMaps}
            originalOpciones={session.originalOpciones}
            bancoId="repaso_fallos"
            tipo="repaso_fallos"
            banner={session.banner}
          />
        </main>
        <footer className="site-footer">
          <p>{JEX_SUBTITLE}</p>
        </footer>
        <MobileBottomNav />
      </div>
    );
  }

  const heading =
    query.modo === "maraton"
      ? "Maratón de fallos"
      : query.modo === "banco"
        ? `Repaso — ${query.bancoNombre ?? "banco"}`
        : query.modo === "criticos"
          ? "Repaso — bancos críticos"
          : "Repaso de fallos";

  return (
    <div className="site site--mobile-nav">
      <SiteHeader />
      <main className="site-main">
        <section className="hero hero--compact">
          <p className="hero-eyebrow">Repaso</p>
          <h1 className="page-title">{heading}</h1>
        </section>

        <div className="card">
          {loading && <p className="muted">Preparando tu repaso…</p>}
          {empty && (
            <>
              <p>🎉 No hay preguntas falladas para este repaso.</p>
              <Link href="/estadisticas" className="btn-primary" style={{ marginTop: "1rem" }}>
                Volver a estadísticas
              </Link>
            </>
          )}
          {error && (
            <>
              <p className="muted" style={{ color: "var(--danger)" }}>
                {error}
              </p>
              <Link href="/estadisticas" className="btn-link" style={{ marginTop: "1rem" }}>
                Volver
              </Link>
            </>
          )}
        </div>
      </main>
      <footer className="site-footer">
        <p>{JEX_SUBTITLE}</p>
      </footer>
      <MobileBottomNav />
    </div>
  );
}

export default function RepasoFallosPage() {
  return (
    <Suspense
      fallback={
        <div className="site site--mobile-nav">
          <SiteHeader />
          <main className="site-main">
            <div className="card">
              <p className="muted">Preparando…</p>
            </div>
          </main>
          <MobileBottomNav />
        </div>
      }
    >
      <RepasoFallosInner />
    </Suspense>
  );
}

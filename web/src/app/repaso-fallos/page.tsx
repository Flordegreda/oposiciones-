"use client";

import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { Suspense, useEffect, useState } from "react";
import { SiteHeader } from "@/components/SiteHeader";
import { MobileBottomNav } from "@/components/MobileBottomNav";
import { ExamSession } from "@/components/ExamSession";
import type { PublicExamPregunta } from "@/lib/exam-utils";
import { prepareExamSessionQuestions } from "@/lib/exam-utils";
import { JEX_SUBTITLE } from "@/lib/constants";
import { fetchWithRetry } from "@/lib/retry";
import {
  obtenerPoolSegunModo,
  sessionPreguntaId,
  type ModoRepaso,
} from "@/lib/persistence/repaso-fallos";

type SessionState = {
  list: PublicExamPregunta[];
  optionMaps: number[][];
  originalOpciones: string[][];
  banner: string;
  title: string;
};

function parseModo(raw: string | null): ModoRepaso {
  return raw === "maraton" ? "maraton" : "top";
}

function RepasoFallosInner() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const modo = parseModo(searchParams.get("modo"));
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
        const pool = await obtenerPoolSegunModo(modo);
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
        const unicas = new Set(list.map((q) => q.id.replace(/__dup\d+$/, ""))).size;
        const isMaraton = modo === "maraton";
        setSession({
          list: prepared.questions,
          optionMaps: prepared.optionMaps,
          originalOpciones: prepared.originalOpciones,
          title: isMaraton ? "Maratón de fallos" : "Repaso de fallos",
          banner: isMaraton
            ? `🏃 Maratón de fallos: ${list.length} preguntas aleatorias (${unicas} única${unicas === 1 ? "" : "s"}, con repetición).`
            : `📝 Repasando tus fallos. Tienes ${list.length} pregunta${list.length === 1 ? "" : "s"} (${unicas} única${unicas === 1 ? "" : "s"}).`,
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
  }, [modo]);

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

  const isMaraton = modo === "maraton";

  return (
    <div className="site site--mobile-nav">
      <SiteHeader />
      <main className="site-main">
        <section className="hero hero--compact">
          <p className="hero-eyebrow">Repaso</p>
          <h1 className="page-title">
            {isMaraton ? "Maratón de fallos" : "Repaso de fallos"}
          </h1>
          <p className="lead lead--compact">
            {isMaraton
              ? "50 preguntas aleatorias de todas tus falladas"
              : "Practica solo las preguntas que más te cuestan"}
          </p>
        </section>

        <div className="card">
          {loading && (
            <p className="muted">
              {isMaraton ? "Preparando tu maratón…" : "Preparando tu repaso…"}
            </p>
          )}
          {empty && (
            <>
              <p>🎉 ¡No tienes preguntas falladas! Sigue así.</p>
              <p className="muted small" style={{ marginTop: "0.75rem" }}>
                Completa tests y vuelve cuando haya fallos que repasar.
              </p>
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

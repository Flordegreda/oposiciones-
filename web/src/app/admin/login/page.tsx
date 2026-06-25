"use client";

import { Suspense, FormEvent, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { SiteHeader } from "@/components/SiteHeader";
import { JEX_SUBTITLE } from "@/lib/constants";

export default function AdminLoginPage() {
  return (
    <Suspense fallback={<p className="muted site-main">Cargando…</p>}>
      <AdminLoginForm />
    </Suspense>
  );
}

function AdminLoginForm() {
  const router = useRouter();
  const params = useSearchParams();
  const next = params.get("next") || "/admin";

  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  async function onSubmit(e: FormEvent) {
    e.preventDefault();
    setError(null);
    setLoading(true);

    try {
      const res = await fetch("/api/admin/auth/login", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ username, password }),
      });
      const data = (await res.json()) as { error?: string };

      if (!res.ok) {
        setError(data.error ?? "No se pudo iniciar sesión");
        return;
      }

      router.replace(next);
      router.refresh();
    } catch {
      setError("Error de red");
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="site">
      <SiteHeader />
      <main className="site-main">
        <section className="hero hero--compact">
          <p className="hero-eyebrow">Administración</p>
          <h1 className="page-title">Acceso a Material</h1>
          <p className="lead lead--compact">{JEX_SUBTITLE}</p>
        </section>

        <form className="card card-form" onSubmit={onSubmit}>
          <label htmlFor="admin-username">
            Usuario
            <input
              id="admin-username"
              type="text"
              autoComplete="username"
              value={username}
              onChange={(e) => setUsername(e.target.value)}
              required
              disabled={loading}
            />
          </label>
          <label htmlFor="admin-password">
            Contraseña
            <input
              id="admin-password"
              type="password"
              autoComplete="current-password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              required
              disabled={loading}
            />
          </label>

          {error && <p className="error">{error}</p>}

          <button
            type="submit"
            className="btn-primary"
            disabled={loading || !username || !password}
          >
            {loading ? "Entrando…" : "Entrar"}
          </button>
        </form>
      </main>
    </div>
  );
}

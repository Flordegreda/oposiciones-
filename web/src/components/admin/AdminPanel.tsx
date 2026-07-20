"use client";

import { useRouter, useSearchParams } from "next/navigation";
import { AdminRebalanceBancos } from "@/components/admin/AdminRebalanceBancos";
import { AdminClearCache } from "@/components/admin/AdminClearCache";
import { AdminCocinar } from "@/components/admin/AdminCocinar";
import { AdminBancos } from "@/components/admin/AdminBancos";
import { AdminBackup } from "@/components/admin/AdminBackup";
import { AdminMaterias, AdminMaterialStats } from "@/components/admin/AdminMaterias";
import type { BancoRow, MaterialStats } from "@/lib/queries/bancos";

type Materia = { id: string; nombre: string; bancos: number };

type Props = {
  bancos: BancoRow[];
  materias: Materia[];
  stats: MaterialStats;
  schemaOk: boolean;
  supuestosOk?: boolean;
};

const tabs = ["contenido", "importar", "copia"] as const;

const legacyTabMap: Record<string, (typeof tabs)[number]> = {
  cocinar: "importar",
  materias: "contenido",
  bancos: "contenido",
  temario: "contenido",
};

export function AdminPanel({ bancos, materias, stats, schemaOk, supuestosOk = true }: Props) {
  const router = useRouter();
  const params = useSearchParams();
  const tabParam = params.get("tab");
  const tab =
    tabParam && tabs.includes(tabParam as (typeof tabs)[number])
      ? (tabParam as (typeof tabs)[number])
      : tabParam && legacyTabMap[tabParam]
        ? legacyTabMap[tabParam]
        : "contenido";

  function setTab(t: (typeof tabs)[number]) {
    router.replace(`/admin?tab=${t}`, { scroll: false });
  }

  return (
    <>
      {schemaOk && <AdminMaterialStats stats={stats} />}
      {schemaOk && <AdminClearCache />}

      <div className="admin-tabs" role="tablist" aria-label="Administración">
        <button
          type="button"
          role="tab"
          aria-selected={tab === "contenido"}
          className={tab === "contenido" ? "active" : ""}
          onClick={() => setTab("contenido")}
        >
          Contenido
        </button>
        <button
          type="button"
          role="tab"
          aria-selected={tab === "importar"}
          className={tab === "importar" ? "active" : ""}
          onClick={() => setTab("importar")}
        >
          Importar
        </button>
        <button
          type="button"
          role="tab"
          aria-selected={tab === "copia"}
          className={tab === "copia" ? "active" : ""}
          onClick={() => setTab("copia")}
        >
          Copia de seguridad
        </button>
      </div>

      {tab === "contenido" && (
        <div className="admin-contenido">
          {schemaOk && <AdminRebalanceBancos materias={materias} />}
          <AdminMaterias stats={stats} schemaOk={schemaOk} hideStats />
          <hr className="admin-section-divider" />
          <AdminBancos bancos={bancos} />
        </div>
      )}
      {tab === "importar" && (
        <AdminCocinar materias={materias} schemaOk={schemaOk} supuestosOk={supuestosOk} />
      )}
      {tab === "copia" && <AdminBackup schemaOk={schemaOk} />}
    </>
  );
}

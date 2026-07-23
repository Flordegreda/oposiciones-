"use client";

import { useRouter, useSearchParams } from "next/navigation";
import { AdminRebalanceBancos } from "@/components/admin/AdminRebalanceBancos";
import { AdminClearCache } from "@/components/admin/AdminClearCache";
import { AdminCocinar } from "@/components/admin/AdminCocinar";
import { AdminBancos } from "@/components/admin/AdminBancos";
import { AdminBackup } from "@/components/admin/AdminBackup";
import { AdminMaterias, AdminMaterialStats } from "@/components/admin/AdminMaterias";
import { AdminFichas } from "@/components/admin/AdminFichas";
import type { BancoRow, MaterialStats } from "@/lib/queries/bancos";
import type { MazoFichas } from "@/lib/queries/fichas";

type Materia = { id: string; nombre: string; bancos: number };

type Props = {
  bancos: BancoRow[];
  materias: Materia[];
  stats: MaterialStats;
  schemaOk: boolean;
  supuestosOk?: boolean;
  fichasOk?: boolean;
  mazosFichas?: MazoFichas[];
};

const tabs = ["importar", "fichas", "copia"] as const;

type AdminTab = (typeof tabs)[number] | null;

export function AdminPanel({
  bancos,
  materias,
  stats,
  schemaOk,
  supuestosOk = true,
  fichasOk = false,
  mazosFichas = [],
}: Props) {
  const router = useRouter();
  const params = useSearchParams();
  const tabParam = params.get("tab");
  const tab: AdminTab =
    tabParam && tabs.includes(tabParam as (typeof tabs)[number])
      ? (tabParam as (typeof tabs)[number])
      : null;

  function setTab(t: AdminTab) {
    if (t) router.replace(`/admin?tab=${t}`, { scroll: false });
    else router.replace("/admin", { scroll: false });
  }

  return (
    <>
      {schemaOk && <AdminMaterialStats stats={stats} />}
      {schemaOk && <AdminClearCache />}

      <div className="admin-tabs" role="tablist" aria-label="Administración">
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
          aria-selected={tab === "fichas"}
          className={tab === "fichas" ? "active" : ""}
          onClick={() => setTab("fichas")}
        >
          Fichas
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

      {tab === null && (
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
      {tab === "fichas" && (
        <AdminFichas
          materias={materias}
          mazos={mazosFichas}
          fichasOk={fichasOk}
          schemaOk={schemaOk}
        />
      )}
      {tab === "copia" && <AdminBackup schemaOk={schemaOk} />}
    </>
  );
}

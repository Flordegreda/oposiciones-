"use client";

import { useRouter, useSearchParams } from "next/navigation";
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
};

const tabs = ["cocinar", "materias", "bancos", "copia"] as const;

export function AdminPanel({ bancos, materias, stats, schemaOk }: Props) {
  const router = useRouter();
  const params = useSearchParams();
  const tabParam = params.get("tab");
  const tab = tabs.includes(tabParam as (typeof tabs)[number])
    ? (tabParam as (typeof tabs)[number])
    : "cocinar";

  function setTab(t: (typeof tabs)[number]) {
    router.replace(`/admin?tab=${t}`, { scroll: false });
  }

  return (
    <>
      <div className="admin-tabs" role="tablist" aria-label="Material">
        <button
          type="button"
          role="tab"
          aria-selected={tab === "cocinar"}
          className={tab === "cocinar" ? "active" : ""}
          onClick={() => setTab("cocinar")}
        >
          Cargar material
        </button>
        <button
          type="button"
          role="tab"
          aria-selected={tab === "materias"}
          className={tab === "materias" ? "active" : ""}
          onClick={() => setTab("materias")}
        >
          Materias
        </button>
        <button
          type="button"
          role="tab"
          aria-selected={tab === "bancos"}
          className={tab === "bancos" ? "active" : ""}
          onClick={() => setTab("bancos")}
        >
          Bancos
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

      {schemaOk && tab !== "materias" && <AdminMaterialStats stats={stats} />}

      {tab === "cocinar" && <AdminCocinar materias={materias} schemaOk={schemaOk} />}
      {tab === "materias" && <AdminMaterias stats={stats} schemaOk={schemaOk} />}
      {tab === "bancos" && <AdminBancos bancos={bancos} stats={stats} />}
      {tab === "copia" && <AdminBackup schemaOk={schemaOk} />}
    </>
  );
}

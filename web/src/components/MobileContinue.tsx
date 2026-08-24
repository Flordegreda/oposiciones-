"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { getSeguirItems, type SeguirItem } from "@/lib/study-continue";

function KindLabel({ kind }: { kind: SeguirItem["kind"] }) {
  return <span className="seguir-kind">{kind === "test" ? "Test" : "Fichas"}</span>;
}

export function MobileContinue() {
  const [items, setItems] = useState<SeguirItem[]>([]);

  useEffect(() => {
    setItems(getSeguirItems());
  }, []);

  if (!items.length) return null;

  return (
    <section className="seguir-block" aria-label="Continuar estudio">
      <h2 className="seguir-title">Seguir</h2>
      <div className="seguir-list">
        {items.map((item) => (
          <Link key={`${item.kind}-${item.id}`} href={item.href} className="seguir-card">
            <KindLabel kind={item.kind} />
            <span className="seguir-card-title">{item.title}</span>
            <span className="seguir-card-hint">{item.hint}</span>
          </Link>
        ))}
      </div>
    </section>
  );
}

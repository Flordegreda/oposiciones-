"use client";

import { useRouter } from "next/navigation";

export function LogoutButton() {
  const router = useRouter();
  async function logout() {
    await fetch("/api/auth/logout", { method: "POST" });
    router.replace("/acceso");
    router.refresh();
  }
  return (
    <button type="button" className="site-logout" onClick={logout}>
      Salir
    </button>
  );
}

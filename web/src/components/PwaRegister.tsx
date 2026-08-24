"use client";

import { useEffect } from "react";

export function PwaRegister() {
  useEffect(() => {
    if (!("serviceWorker" in navigator)) return;
    const url = "/sw.js";
    void navigator.serviceWorker.register(url).catch(() => {
      /* ignore */
    });
  }, []);
  return null;
}

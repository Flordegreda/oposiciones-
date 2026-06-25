"use client";

import { useEffect } from "react";
import { syncProgressWithServer } from "@/lib/test-progress";

export function ProgressSync() {
  useEffect(() => {
    void syncProgressWithServer();
  }, []);

  return null;
}

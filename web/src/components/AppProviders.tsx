"use client";

import { useEffect, useState } from "react";
import {
  applyStudySettings,
  readTextSize,
  readTheme,
  type TextSize,
  type ThemeMode,
} from "@/lib/study-settings";
import { StudySettingsPanel } from "@/components/StudySettingsPanel";

export function AppProviders({ children }: { children: React.ReactNode }) {
  const [open, setOpen] = useState(false);

  useEffect(() => {
    applyStudySettings(readTheme(), readTextSize());
  }, []);

  useEffect(() => {
    const onOpen = () => setOpen(true);
    window.addEventListener("opo-open-settings", onOpen);
    return () => window.removeEventListener("opo-open-settings", onOpen);
  }, []);

  return (
    <>
      {children}
      {open && (
        <StudySettingsPanel
          onClose={() => setOpen(false)}
          onChange={(theme: ThemeMode, textSize: TextSize) => {
            applyStudySettings(theme, textSize);
          }}
        />
      )}
    </>
  );
}

export function openStudySettings() {
  window.dispatchEvent(new CustomEvent("opo-open-settings"));
}

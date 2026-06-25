"use client";

import { openStudySettings } from "@/components/AppProviders";

export function StudySettingsButton() {
  return (
    <button
      type="button"
      className="settings-trigger"
      aria-label="Ajustes de estudio"
      title="Modo oscuro y tamaño de texto"
      onClick={openStudySettings}
    >
      <span className="settings-trigger-icon" aria-hidden>
        ⚙
      </span>
      <span className="settings-trigger-label">Ajustes</span>
    </button>
  );
}

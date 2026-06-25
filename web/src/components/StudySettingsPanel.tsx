"use client";

import { useEffect, useState } from "react";
import {
  readTextSize,
  readTheme,
  type TextSize,
  type ThemeMode,
} from "@/lib/study-settings";

type Props = {
  onClose: () => void;
  onChange: (theme: ThemeMode, textSize: TextSize) => void;
};

export function StudySettingsPanel({ onClose, onChange }: Props) {
  const [theme, setTheme] = useState<ThemeMode>("light");
  const [textSize, setTextSize] = useState<TextSize>("normal");

  useEffect(() => {
    setTheme(readTheme());
    setTextSize(readTextSize());
  }, []);

  function save(nextTheme: ThemeMode, nextText: TextSize) {
    setTheme(nextTheme);
    setTextSize(nextText);
    onChange(nextTheme, nextText);
  }

  return (
    <div className="settings-overlay" role="dialog" aria-modal="true" aria-label="Ajustes">
      <button type="button" className="settings-backdrop" aria-label="Cerrar" onClick={onClose} />
      <div className="settings-panel card card-elevated">
        <div className="settings-panel-head">
          <h2 style={{ margin: 0 }}>Ajustes de estudio</h2>
          <button type="button" className="btn-link btn-sm" onClick={onClose}>
            Cerrar
          </button>
        </div>

        <fieldset className="settings-group">
          <legend>Apariencia</legend>
          <label className="settings-option">
            <input
              type="radio"
              name="theme"
              checked={theme === "light"}
              onChange={() => save("light", textSize)}
            />
            <span>Modo claro</span>
          </label>
          <label className="settings-option">
            <input
              type="radio"
              name="theme"
              checked={theme === "dark"}
              onChange={() => save("dark", textSize)}
            />
            <span>Modo oscuro</span>
          </label>
        </fieldset>

        <fieldset className="settings-group">
          <legend>Tamaño del texto</legend>
          <label className="settings-option">
            <input
              type="radio"
              name="textSize"
              checked={textSize === "normal"}
              onChange={() => save(theme, "normal")}
            />
            <span>Normal</span>
          </label>
          <label className="settings-option">
            <input
              type="radio"
              name="textSize"
              checked={textSize === "large"}
              onChange={() => save(theme, "large")}
            />
            <span>Grande (mejor en móvil)</span>
          </label>
        </fieldset>

        <p className="muted small" style={{ marginBottom: "1rem" }}>
          Los ajustes se guardan en este dispositivo.
        </p>

        <div className="settings-preview card">
          <p className="test-meta" style={{ marginBottom: "0.5rem" }}>
            Vista previa
          </p>
          <p className="test-question" style={{ marginBottom: "0.75rem" }}>
            ¿Cuál es el plazo de recurso contra un acto administrativo?
          </p>
          <p className="option-text muted small" style={{ margin: 0 }}>
            A) Un mes · B) Dos meses · C) Tres meses
          </p>
        </div>
      </div>
    </div>
  );
}

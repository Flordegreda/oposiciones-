"use client";

const THEME_KEY = "opo_jex_theme";
const TEXT_KEY = "opo_jex_text_size";

export type ThemeMode = "light" | "dark";
export type TextSize = "normal" | "large";

export function readTheme(): ThemeMode {
  if (typeof window === "undefined") return "light";
  return localStorage.getItem(THEME_KEY) === "dark" ? "dark" : "light";
}

export function readTextSize(): TextSize {
  if (typeof window === "undefined") return "normal";
  return localStorage.getItem(TEXT_KEY) === "large" ? "large" : "normal";
}

export function applyStudySettings(theme: ThemeMode, textSize: TextSize) {
  const root = document.documentElement;
  root.dataset.theme = theme;
  root.dataset.textSize = textSize;
  localStorage.setItem(THEME_KEY, theme);
  localStorage.setItem(TEXT_KEY, textSize);
  const meta = document.querySelector('meta[name="theme-color"]');
  if (meta) meta.setAttribute("content", theme === "dark" ? "#0f1724" : "#1e4d7b");
}

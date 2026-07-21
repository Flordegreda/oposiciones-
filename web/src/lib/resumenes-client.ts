export function tituloFromFilename(filename: string): string {
  return filename.replace(/\.pdf$/i, "").trim() || "Resumen";
}

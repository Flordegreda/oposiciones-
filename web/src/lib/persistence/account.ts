/** Cuenta única de esta app: móvil y PC comparten el historial sin códigos. */
export const JEX_ACCOUNT_ID = "c0a1e7e5-0a11-4e5c-8a00-0000000000e5";

export const PREV_USUARIO_KEY = "jex-usuario-id-prev";

/** Fila sintética en resultados_tests para el checklist de fichas. */
export const PROGRESO_BANCO = "__jex_progreso__";
export const PROGRESO_RESULT_ID = "c0a1e7e5-0a11-4e5c-8a00-00000000c1e5";

export function isProgresoBanco(banco: string | null | undefined): boolean {
  return banco === PROGRESO_BANCO;
}

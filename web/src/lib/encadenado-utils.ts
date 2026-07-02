/** Banco tratado como encadenado por nombre o por tener preguntas con supuesto. */
export function isEncadenadoBankName(nombre: string): boolean {
  return /\bencadenad[oa]s?\b/i.test(nombre);
}

export function isEncadenadoBank(
  nombre: string,
  preguntasConSupuesto = 0,
  supuestosEnBanco = 0,
): boolean {
  return isEncadenadoBankName(nombre) || preguntasConSupuesto > 0 || supuestosEnBanco > 0;
}

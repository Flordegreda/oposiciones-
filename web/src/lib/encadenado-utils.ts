/** Bancos cuyo nombre indica test encadenado (caso compartido + preguntas). */
export function isEncadenadoBankName(nombre: string): boolean {
  return /encadenado/i.test(nombre);
}

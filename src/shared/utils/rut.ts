/**
 * Normaliza y valida un RUT chileno (ej: 12.345.678-k -> 12345678K)
 */
export function normalizarRut(rutRaw: string): string {
  if (!rutRaw) return '';
  return rutRaw
    .replace(/[^0-9kK]/g, '')
    .toUpperCase()
    .trim();
}

/**
 * Valida el dígito verificador de un RUT chileno (módulo 11)
 */
export function validarRut(rutRaw: string): boolean {
  const rutLimpio = normalizarRut(rutRaw);
  if (rutLimpio.length < 8) return false;

  const cuerpo = rutLimpio.slice(0, -1);
  const dv = rutLimpio.slice(-1);

  let suma = 0;
  let multiplo = 2;

  for (let i = cuerpo.length - 1; i >= 0; i--) {
    suma += parseInt(cuerpo.charAt(i), 10) * multiplo;
    multiplo = multiplo === 7 ? 2 : multiplo + 1;
  }

  const dvr = 11 - (suma % 11);
  let dvEsperado = '';

  if (dvr === 11) dvEsperado = '0';
  else if (dvr === 10) dvEsperado = 'K';
  else dvEsperado = dvr.toString();

  return dv === dvEsperado;
}

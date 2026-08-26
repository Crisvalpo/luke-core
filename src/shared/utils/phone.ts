/**
 * Normaliza cualquier número de teléfono chileno al estándar internacional E.164 (+569...)
 */
export function normalizarTelefonoChileno(telefonoRaw: string): string | null {
  if (!telefonoRaw) return null;

  // Remover todo lo que no sea dígito
  let soloDigitos = telefonoRaw.replace(/\D/g, '');

  if (!soloDigitos) return null;

  // Caso: 912345678 (9 dígitos) -> agregar 56
  if (soloDigitos.length === 9 && soloDigitos.startsWith('9')) {
    return `+56${soloDigitos}`;
  }

  // Caso: 56912345678 (11 dígitos) -> agregar +
  if (soloDigitos.length === 11 && soloDigitos.startsWith('569')) {
    return `+${soloDigitos}`;
  }

  // Caso: 56XXXXXXXXX
  if (soloDigitos.length >= 10 && soloDigitos.startsWith('56')) {
    return `+${soloDigitos}`;
  }

  // Si no calza con Chile pero tiene formato internacional general
  if (soloDigitos.length >= 8) {
    return `+${soloDigitos}`;
  }

  return null;
}

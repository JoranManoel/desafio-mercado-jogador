export function normalizePlayerName(value: unknown): unknown {
  if (typeof value !== 'string') {
    return value;
  }

  // Preserva caracteres de controle para que a validação os rejeite.
  if (/[\p{Cc}\p{Cf}]/u.test(value)) {
    return value;
  }

  return value.trim().replace(/ {2,}/g, ' ');
}
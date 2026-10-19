export function normalizeClubName(value: unknown): unknown {
  if (typeof value !== 'string') {
    return value;
  }

  if (/[\p{Cc}\p{Cf}]/u.test(value)) {
    return value;
  }

  return value.trim().replace(/\s+/g, ' ').normalize('NFC');
}

export function normalizeClubNameKey(value: string): string {
  // Ignora maiúsculas/minúsculas, mas preserva os acentos.
  return value.normalize('NFC').toLowerCase();
}
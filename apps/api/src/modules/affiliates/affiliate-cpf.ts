/**
 * An affiliate's CPF as the affiliate reads it in their own area (the user's review, 12/11/2026):
 * the middle six digits, the way a CPF is printed when it is only being recognised — enough to see
 * it is theirs, not enough to be used. The shop reads it whole; nobody else reads it at all.
 */
export function maskedCpfOf(cpf: string | null): string | null {
  if (cpf === null || !/^\d{11}$/.test(cpf)) return null;
  return `***.${cpf.slice(3, 6)}.${cpf.slice(6, 9)}-**`;
}

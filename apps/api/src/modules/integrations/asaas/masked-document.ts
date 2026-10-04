/**
 * A CPF or a CNPJ with its first and last digits hidden — `***.456.789-**`, `**.345.678/0001-**` —
 * as Brazilian services show a document they need only to tell whose it is. Anything that is
 * neither eleven nor fourteen digits is not shown at all.
 */
export function maskedDocumentOf(digits: string | null): string | null {
  if (digits === null) return null;
  if (/^\d{11}$/.test(digits)) return `***.${digits.slice(3, 6)}.${digits.slice(6, 9)}-**`;
  if (/^\d{14}$/.test(digits)) return `**.${digits.slice(2, 5)}.${digits.slice(5, 8)}/${digits.slice(8, 12)}-**`;
  return null;
}

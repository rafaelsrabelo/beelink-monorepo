/**
 * A CPF or a CNPJ with its first and last places hidden — `***.456.789-**`, `**.345.678/0001-**` —
 * as Brazilian services show a document they need only to tell whose it is. A CNPJ issued since July
 * 2026 may hold capital letters in its first twelve places, and is masked the same way. Anything that
 * is neither is not shown at all.
 */
export function maskedDocumentOf(document: string | null): string | null {
  if (document === null) return null;
  if (/^\d{11}$/.test(document)) return `***.${document.slice(3, 6)}.${document.slice(6, 9)}-**`;
  if (/^[0-9A-Z]{12}\d{2}$/.test(document)) return `**.${document.slice(2, 5)}.${document.slice(5, 8)}/${document.slice(8, 12)}-**`;
  return null;
}

/**
 * Keyword normalization: trim, lowercase, collapse internal whitespace.
 * Used for duplicate protection:
 *   "Bihar News" === "bihar news" === " Bihar News " (same normalized form)
 */
export function normalizeKeyword(input: string): string {
  return input.trim().toLowerCase().replace(/\s+/g, " ");
}

export function isValidKeyword(input: string): boolean {
  return normalizeKeyword(input).length > 0;
}

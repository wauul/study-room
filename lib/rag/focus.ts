/** Literal label terms, with word/number boundaries (chapter 1 != chapter 10). */
export function focusPatterns(terms: string[]) {
  return terms.flatMap((term) => {
    const parts = term.toLowerCase().match(/[\p{L}]+|[\p{N}]+/gu);
    return parts?.length
      ? [
          `(^|[^[:alnum:]])${parts.join("[[:space:][:punct:]]*")}([^[:alnum:]]|$)`,
        ]
      : [];
  });
}

/** `%text%` for a LIKE … ESCAPE '\' match, with the user's own % and _ taken literally. */
export function containsPattern(text: string): string {
  return `%${text.replace(/[\\%_]/g, (char) => `\\${char}`)}%`;
}

/** `text%`: starts-with match, same escaping. */
export function prefixPattern(text: string): string {
  return `${text.replace(/[\\%_]/g, (char) => `\\${char}`)}%`;
}

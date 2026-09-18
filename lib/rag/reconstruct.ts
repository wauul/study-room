/** Legacy uploads kept chunks, not original files. Recover their text without
 * repeated window overlap. Whitespace/layout that was discarded is unrecoverable. */
export function reconstructText(
  chunks: { content: string; sectionLabel: string | null }[],
) {
  let result = "",
    previous: (typeof chunks)[number] | undefined;
  for (const chunk of chunks) {
    const words = chunk.content.trim().split(/\s+/);
    let overlap = 0;
    if (previous && previous.sectionLabel === chunk.sectionLabel) {
      const prior = previous.content.trim().split(/\s+/);
      for (let n = Math.min(45, prior.length, words.length); n > 0; n--) {
        if (prior.slice(-n).join(" ") === words.slice(0, n).join(" ")) {
          overlap = n;
          break;
        }
      }
    }
    let text = words.slice(overlap).join(" ");
    if (!previous || previous.sectionLabel !== chunk.sectionLabel) {
      const label = chunk.sectionLabel;
      // Keep trustworthy legacy headings on their own line. Metric labels such
      // as "4 min" were false positives and are retained as ordinary text.
      if (label && !/^\d+\s+(?:min|sec|ms|hours?)$/i.test(label)) {
        const plain = text.replace(/^#+\s*/, "");
        text = `# ${label}\n${plain.startsWith(label) ? plain.slice(label.length).trim() : text}`;
      }
      result += (result ? "\n\n" : "") + text;
    } else result += " " + text;
    previous = chunk;
  }
  return result;
}

export type TextChunk = {
  content: string;
  sectionLabel: string | null;
  position: number;
};
export function chunkText(
  text: string,
  maxWords = 180,
  overlap = 30,
): TextChunk[] {
  if (maxWords < 2 || overlap < 0 || overlap >= maxWords)
    throw new Error("Invalid chunk window");
  const blocks: { label: string | null; text: string }[] = [];
  let label: string | null = null,
    body: string[] = [];
  const flush = () => {
    if (body.length) blocks.push({ label, text: body.join("\n") });
    body = [];
  };
  for (const line of text.replace(/\r/g, "").split("\n")) {
    if (
      /^\s*(#{1,4}\s+.+|(?:chapter|section|unit|lecture|chapitre|fiche)\s+[\dIVX]+\b.*|\d+(?:\.\d+)+\.?\s+\p{Lu}.{2,70})$/iu.test(
        line.trim(),
      )
    ) {
      flush();
      label = line.trim().replace(/^#+\s*/, "");
    }
    body.push(line);
  }
  flush();
  const chunks: TextChunk[] = [];
  for (const block of blocks) {
    // Paragraphs stay intact when they fit. Only oversized paragraphs fall back
    // to sentences; an oversized sentence/code line has a bounded word fallback.
    const count = (s: string) => s.trim().split(/\s+/).filter(Boolean).length;
    const sentences = (s: string) =>
      Array.from(
        new Intl.Segmenter(undefined, { granularity: "sentence" }).segment(s),
        (x) => x.segment.trim(),
      ).filter(Boolean);
    const units = block.text
      .trim()
      .split(/\n\s*\n/)
      .filter(Boolean)
      .flatMap((p) =>
        count(p) <= maxWords
          ? [p]
          : sentences(p).flatMap((s) => {
              if (count(s) <= maxWords) return [s];
              const words = s.split(/\s+/),
                pieces: string[] = [];
              for (let i = 0; i < words.length; i += maxWords - overlap) {
                pieces.push(words.slice(i, i + maxWords).join(" "));
                if (i + maxWords >= words.length) break;
              }
              return pieces;
            }),
      );
    let current: string[] = [];
    const push = () => {
      if (current.length)
        chunks.push({
          content: current.join("\n\n"),
          sectionLabel: block.label,
          position: chunks.length,
        });
    };
    for (const unit of units) {
      if (current.length && count([...current, unit].join(" ")) > maxWords) {
        push();
        const tail: string[] = [];
        for (const sentence of sentences(current.join(" ")).reverse()) {
          if (count([sentence, ...tail].join(" ")) > overlap) break;
          tail.unshift(sentence);
        }
        current = count([...tail, unit].join(" ")) <= maxWords ? tail : [];
      }
      current.push(unit);
    }
    push();
  }
  return chunks;
}

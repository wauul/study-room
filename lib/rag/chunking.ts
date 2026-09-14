export type TextChunk = {
  content: string;
  sectionLabel: string | null;
  position: number;
};
export function chunkText(
  text: string,
  maxWords = 350,
  overlap = 45,
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
      /^\s*(#{1,4}\s+.+|(?:chapter|section|unit|lecture)\s+[\dIVX]+\b.*|\d+(?:\.\d+)*\.?\s+[A-Z].{2,70})$/i.test(
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
    const words = block.text.trim().split(/\s+/).filter(Boolean);
    for (let start = 0; start < words.length; start += maxWords - overlap) {
      chunks.push({
        content: words.slice(start, start + maxWords).join(" "),
        sectionLabel: block.label,
        position: chunks.length,
      });
      if (start + maxWords >= words.length) break;
    }
  }
  return chunks;
}

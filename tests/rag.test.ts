import test from "node:test";
import assert from "node:assert/strict";
import { chunkText } from "../lib/rag/chunking";
import { reconstructText } from "../lib/rag/reconstruct";
import { focusPatterns } from "../lib/rag/focus";
import { Heatmap } from "../lib/realtime/heatmap";

test("complete sentences overlap without losing the boundary fact", () => {
  const sentences = Array.from(
    { length: 20 },
    (_, i) => `Fact ${i} needs all these words together.`,
  );
  const chunks = chunkText(sentences.join(" "), 25, 8);
  for (const sentence of sentences)
    assert.ok(
      chunks.some((c) => c.content.includes(sentence)),
      sentence,
    );
  for (const chunk of chunks) {
    assert.ok(chunk.content.endsWith("."));
    assert.ok(chunk.content.split(/\s+/).length <= 25);
  }
  assert.ok(chunks[1].content.startsWith(sentences[2]));
});
test("paragraphs and unlabeled metric lines are preserved", () => {
  const chunks = chunkText(
    "4 min\nAverage latency.\n\nOne complete paragraph.\n\nAnother complete paragraph.",
  );
  assert.equal(chunks[0].sectionLabel, null);
  assert.ok(chunks[0].content.includes("\n\n"));
  assert.deepEqual(focusPatterns(["", "   ", "---"]), []);
  assert.notEqual(
    focusPatterns(["chapter 1"])[0],
    focusPatterns(["chapter 10"])[0],
  );
  assert.equal(focusPatterns(["chapter3"])[0], focusPatterns(["chapter 3"])[0]);
});
test("legacy reconstruction removes only the known window overlap", () => {
  assert.equal(
    reconstructText([
      { content: "Alpha beta gamma.", sectionLabel: null },
      { content: "beta gamma. Delta epsilon.", sectionLabel: null },
    ]),
    "Alpha beta gamma. Delta epsilon.",
  );
  assert.ok(
    reconstructText([
      { content: "4 min Average latency.", sectionLabel: "4 min" },
    ]).startsWith("4 min"),
  );
});
test("aggregate heat restoration matches replayed events", () => {
  const replay = new Heatmap();
  replay.add("x", 0);
  replay.add("x", 60000);
  const restored = new Heatmap();
  restored.restore("x", 1.95, 60000);
  assert.deepEqual(restored.snapshot(120000), replay.snapshot(120000));
});

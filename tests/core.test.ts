import test from "node:test";
import assert from "node:assert/strict";
import {
  properScoringRule,
  validateDistribution,
  confusionWeight,
} from "../lib/scoring/properScoringRule";
import { chunkText } from "../lib/rag/chunking";
import { Heatmap } from "../lib/realtime/heatmap";
test("log scoring rewards honest belief in expectation", () => {
  const truth = [0.5, 0.3, 0.15, 0.05];
  const expected = (p: number[]) =>
    truth.reduce((sum, q, i) => sum + q * properScoringRule(p, i), 0);
  const honest = expected(truth.map((x) => x * 100));
  for (const candidate of [
    [25, 25, 25, 25],
    [70, 20, 5, 5],
    [40, 30, 20, 10],
  ])
    assert.ok(honest > expected(candidate));
});
test("zero probability is exact negative infinity, certainty correct is zero", () => {
  assert.equal(properScoringRule([100, 0, 0, 0], 1), -Infinity);
  assert.equal(properScoringRule([100, 0, 0, 0], 0), 0);
});
test("invalid, malicious, or unnormalized distributions fail", () => {
  for (const p of [
    [NaN, 25, 25, 25],
    [-1, 1, 50, 50],
    [100],
    [30, 30, 30, 30],
    [Infinity, 0, 0, 0],
  ])
    assert.throws(() => validateDistribution(p));
});
test("confident errors carry more confusion weight", () =>
  assert.ok(
    confusionWeight([1, 97, 1, 1], 0) > confusionWeight([25, 25, 25, 25], 0),
  ));
test("chunking preserves sections, overlap and order", () => {
  const chunks = chunkText(
    "# Chapter 1\na b c d e f g h\n# Chapter 2\ni j k l",
    5,
    1,
  );
  assert.ok(chunks.length >= 3);
  assert.ok(chunks[0].sectionLabel?.includes("Chapter 1"));
  assert.equal(
    chunks[0].content.split(" ").at(-1),
    chunks[1].content.split(" ")[0],
  );
  assert.ok(chunks.at(-1)?.sectionLabel?.includes("Chapter 2"));
  assert.deepEqual(
    chunks.map((c) => c.position),
    chunks.map((_, i) => i),
  );
});
test("heat decays by elapsed time and reconstructed history agrees", () => {
  const heat = new Heatmap();
  heat.add("a", 0);
  assert.equal(heat.snapshot(60000).a, 0.95);
  heat.add("a", 60000);
  assert.equal(heat.snapshot(60000).a, 1.95);
  assert.ok(Math.abs(heat.snapshot(120000).a - 1.8525) < 1e-10);
});

/** Exponential decay is elapsed-time based, so late ticks and restarts agree.
 * Every elapsed minute retains 95% of a hit's weight. Frequent retrieval is a
 * discussion signal, not proof that a topic is poorly understood. */
export class Heatmap {
  private hits = new Map<string, { value: number; at: number }>();
  restore(chunkId: string, value: number, at: number) {
    this.hits.set(chunkId, { value, at });
  }
  add(chunkId: string, at = Date.now()) {
    const old = this.hits.get(chunkId);
    this.hits.set(chunkId, {
      value: (old ? old.value * Math.pow(0.95, (at - old.at) / 60000) : 0) + 1,
      at,
    });
  }
  snapshot(now = Date.now()) {
    return Object.fromEntries(
      [...this.hits].map(([id, h]) => [
        id,
        h.value * Math.pow(0.95, (now - h.at) / 60000),
      ]),
    );
  }
}

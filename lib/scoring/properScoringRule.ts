export function validateDistribution(p: number[]): void {
  if (p.length !== 4 || p.some(x => !Number.isFinite(x) || x < 0 || x > 100) || Math.abs(p.reduce((a,b) => a+b,0)-100) > 0.001) {
    throw new Error('Enter four probabilities between 0 and 100 that sum to 100%.');
  }
}
/**
 * Logarithmic proper scoring rule: S(p,y) = ln(p_y).
 * For true belief q, E_q[S(q,Y)] - E_q[S(p,Y)] = KL(q || p) >= 0.
 * Thus honest probabilities uniquely maximize expected score. A confident wrong
 * answer costs much more than admitting uncertainty; higher (closer to zero) wins.
 * A zero probability on the truth is EXACTLY -Infinity, not an epsilon clamp.
 * Persistence uses a separate zeroProbability flag because JSON cannot encode infinity.
 */
export function properScoringRule(distribution: number[], correctIndex: number): number {
  validateDistribution(distribution);
  if (!Number.isInteger(correctIndex) || correctIndex < 0 || correctIndex > 3) throw new Error('Invalid correct option');
  return Math.log(distribution[correctIndex] / 100);
}
export function confusionWeight(distribution: number[], correctIndex: number): number {
  const score = properScoringRule(distribution, correctIndex);
  const confidentWrong = Math.max(...distribution.filter((_,i) => i !== correctIndex)) / 100;
  return Math.min(20, -score) * (1 + confidentWrong);
}

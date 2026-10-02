/** Index of the highest total score across questions; the first candidate wins ties and failures. */
export function pickBest(scores: Array<Record<string, number> | null>) {
  let best = 0;
  let bestTotal = -Infinity;
  scores.forEach((s, i) => {
    const total = s ? Object.values(s).reduce((a, b) => a + b, 0) : -Infinity;
    if (total > bestTotal) {
      best = i;
      bestTotal = total;
    }
  });
  return best;
}

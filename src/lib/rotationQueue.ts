export function shuffleOrder(length: number, avoidFirst?: number): number[] {
  if (length <= 0) return [];
  if (length === 1) return [0];

  const indices = Array.from({ length }, (_, i) => i);

  for (let i = indices.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [indices[i], indices[j]] = [indices[j], indices[i]];
  }

  for (let i = 1; i < indices.length; i++) {
    if (indices[i] === indices[i - 1]) {
      const swapWith = indices.findIndex((v, j) => j !== i && v !== indices[i - 1]);
      if (swapWith >= 0) {
        [indices[i], indices[swapWith]] = [indices[swapWith], indices[i]];
      }
    }
  }

  if (avoidFirst !== undefined && indices[0] === avoidFirst) {
    const swapWith = indices.findIndex((v, j) => j > 0 && v !== avoidFirst);
    if (swapWith > 0) {
      [indices[0], indices[swapWith]] = [indices[swapWith], indices[0]];
    }
  }

  return indices;
}

export function windowProductIndices(
  queue: number[],
  position: number,
  windowSize: number
): number[] {
  if (queue.length === 0) return [];
  const size = Math.min(windowSize, queue.length);
  const indices: number[] = [];
  for (let i = 0; i < size; i++) {
    indices.push(queue[(position + i) % queue.length] ?? 0);
  }
  return indices;
}

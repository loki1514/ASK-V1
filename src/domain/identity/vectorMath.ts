export function l2Normalize(values: Float32Array): Float32Array {
  let sumSquares = 0;
  for (const value of values) sumSquares += value * value;
  const norm = Math.sqrt(sumSquares);
  if (!Number.isFinite(norm) || norm === 0) {
    throw new Error("Cannot normalize an empty or zero embedding");
  }
  return Float32Array.from(values, (value) => value / norm);
}

export function cosineSimilarity(left: Float32Array, right: Float32Array): number {
  if (left.length !== right.length || left.length === 0) {
    throw new Error("Embeddings must have the same non-zero dimensions");
  }

  let dot = 0;
  let leftNorm = 0;
  let rightNorm = 0;
  for (let index = 0; index < left.length; index += 1) {
    dot += left[index] * right[index];
    leftNorm += left[index] * left[index];
    rightNorm += right[index] * right[index];
  }

  const denominator = Math.sqrt(leftNorm) * Math.sqrt(rightNorm);
  if (denominator === 0) throw new Error("Cannot compare a zero embedding");
  return Math.max(-1, Math.min(1, dot / denominator));
}

export function embeddingCentroid(embeddings: Float32Array[]): Float32Array {
  if (!embeddings.length) throw new Error("At least one embedding is required");
  const dimensions = embeddings[0].length;
  if (!dimensions || embeddings.some((embedding) => embedding.length !== dimensions)) {
    throw new Error("All embeddings must have matching non-zero dimensions");
  }

  const mean = new Float32Array(dimensions);
  for (const embedding of embeddings) {
    for (let index = 0; index < dimensions; index += 1) mean[index] += embedding[index];
  }
  for (let index = 0; index < dimensions; index += 1) mean[index] /= embeddings.length;
  return l2Normalize(mean);
}

export function minimumPairwiseSimilarity(embeddings: Float32Array[]): number {
  if (embeddings.length < 2) return 1;
  let minimum = 1;
  for (let left = 0; left < embeddings.length; left += 1) {
    for (let right = left + 1; right < embeddings.length; right += 1) {
      minimum = Math.min(minimum, cosineSimilarity(embeddings[left], embeddings[right]));
    }
  }
  return minimum;
}


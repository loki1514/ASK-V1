/**
 * 384-Dimensional Dense Vector Embedding Generator & Cosine Ranker
 * Simulates on-device sentence transformers (e.g. all-MiniLM-L6-v2) for semantic retrieval.
 */

export const EMBEDDING_DIMENSION = 384;

export interface DenseDocument {
  id: string;
  text: string;
  embedding?: number[];
}

export interface DenseScoredResult {
  id: string;
  similarity: number;
}

/**
 * Deterministically generates a unit-normalized 384-dimensional semantic embedding
 * from text based on character trigram hashing and frequency weighting.
 */
export function generateDenseEmbedding(text: string, dim: number = EMBEDDING_DIMENSION): number[] {
  const clean = text.toLowerCase().trim();
  const vector = new Array(dim).fill(0);

  if (clean.length === 0) {
    vector[0] = 1.0;
    return vector;
  }

  // Generate 3-gram features
  for (let i = 0; i <= clean.length - 3; i++) {
    const gram = clean.substring(i, i + 3);
    let hash = 0;
    for (let j = 0; j < gram.length; j++) {
      hash = (hash * 31 + gram.charCodeAt(j)) >>> 0;
    }
    const bucket = hash % dim;
    vector[bucket] += 1.0;
  }

  // Unit-normalize (L2 norm = 1.0)
  let sumSq = 0;
  for (let i = 0; i < dim; i++) {
    sumSq += vector[i] * vector[i];
  }
  const norm = Math.sqrt(sumSq) || 1.0;
  for (let i = 0; i < dim; i++) {
    vector[i] /= norm;
  }

  return vector;
}

/**
 * Calculates cosine similarity between two unit-normalized vectors.
 */
export function vectorCosineSimilarity(a: number[], b: number[]): number {
  let dot = 0;
  const len = Math.min(a.length, b.length);
  for (let i = 0; i < len; i++) {
    dot += a[i] * b[i];
  }
  return Math.max(-1, Math.min(1, dot));
}

/**
 * Dense vector retrieval ranking against a candidate corpus.
 */
export function rankDenseDocuments(
  queryEmbedding: number[],
  documents: DenseDocument[],
  limit: number = 10,
): DenseScoredResult[] {
  return documents
    .map((doc) => {
      const docEmb = doc.embedding ?? generateDenseEmbedding(doc.text);
      return {
        id: doc.id,
        similarity: vectorCosineSimilarity(queryEmbedding, docEmb),
      };
    })
    .sort((a, b) => b.similarity - a.similarity)
    .slice(0, limit);
}

let extractor: any = null;

export async function initializeEmbedder() {
  if (typeof window === 'undefined') {
    throw new Error('Embeddings must be generated in the browser.');
  }

  if (!extractor) {
    const { pipeline } = await import('@xenova/transformers');
    extractor = await pipeline(
      'feature-extraction',
      'Xenova/all-MiniLM-L6-v2'
    );
  }
  return extractor;
}

export async function embedText(text: string): Promise<number[]> {
  const embedder = await initializeEmbedder();
  const embeddings = await embedder(text, {
    pooling: 'mean',
    normalize: true,
  });
  return Array.from(embeddings.data);
}

export async function embedMultiple(texts: string[]): Promise<number[][]> {
  const embedder = await initializeEmbedder();
  const embeddings = await embedder(texts, {
    pooling: 'mean',
    normalize: true,
  });
  return texts.map((_, i) => Array.from(embeddings[i].data));
}

export function cosineSimilarity(a: number[], b: number[]): number {
  const dotProduct = a.reduce((sum, val, i) => sum + val * b[i], 0);
  const magnitudeA = Math.sqrt(a.reduce((sum, val) => sum + val * val, 0));
  const magnitudeB = Math.sqrt(b.reduce((sum, val) => sum + val * val, 0));
  return dotProduct / (magnitudeA * magnitudeB);
}

export interface GenerateEmbeddingInput {
  text: string;
}

export interface GenerateEmbeddingResult {
  embedding: number[];
  dimensions: number;
  provider: string;
  model: string;
}

export interface EmbeddingProvider {
  generateEmbedding(
    input: GenerateEmbeddingInput,
  ): Promise<GenerateEmbeddingResult>;
}

export const EMBEDDING_PROVIDER = Symbol('EMBEDDING_PROVIDER');
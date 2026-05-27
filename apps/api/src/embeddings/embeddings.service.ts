import { Inject, Injectable } from '@nestjs/common';

import {
  EMBEDDING_PROVIDER,
  type EmbeddingProvider,
  type GenerateEmbeddingResult,
} from './embeddings.provider';

@Injectable()
export class EmbeddingsService {
  constructor(
    @Inject(EMBEDDING_PROVIDER)
    private readonly embeddingProvider: EmbeddingProvider,
  ) {}

  generateEmbedding(text: string): Promise<GenerateEmbeddingResult> {
    return this.embeddingProvider.generateEmbedding({
      text,
    });
  }
}
import { Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { createHash } from 'node:crypto';

import {
  type EmbeddingProvider,
  type GenerateEmbeddingInput,
  type GenerateEmbeddingResult,
} from './embeddings.provider';

@Injectable()
export class LocalEmbeddingProvider implements EmbeddingProvider {
  private readonly dimensions: number;

  constructor(configService: ConfigService) {
    this.dimensions = Number(
      configService.getOrThrow<string>('EMBEDDING_DIMENSIONS'),
    );
  }

  async generateEmbedding(
    input: GenerateEmbeddingInput,
  ): Promise<GenerateEmbeddingResult> {
    const hash = createHash('sha256').update(input.text).digest();
    const embedding = Array.from({ length: this.dimensions }, (_, index) => {
      const value = hash[index % hash.length];

      return Number(((value / 255) * 2 - 1).toFixed(6));
    });

    return {
      embedding,
      dimensions: this.dimensions,
      provider: 'local',
      model: `local-deterministic-${this.dimensions}`,
    };
  }
}
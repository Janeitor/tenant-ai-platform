import { BadRequestException, Injectable, ServiceUnavailableException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import OpenAI from 'openai';

import {
  type EmbeddingProvider,
  type GenerateEmbeddingInput,
  type GenerateEmbeddingResult,
} from './embeddings.provider';

@Injectable()
export class OpenAiEmbeddingProvider implements EmbeddingProvider {
  private readonly model: string;
  private readonly dimensions: number;
  private client?: OpenAI;

  constructor(private readonly configService: ConfigService) {
    this.model = configService.get<string>(
      'OPENAI_EMBEDDING_MODEL',
      'text-embedding-3-small',
    );
    this.dimensions = Number(
      configService.get<string>('EMBEDDING_DIMENSIONS', '1536'),
    );
  }

  setClientForTesting(client: OpenAI): void {
    this.client = client;
  }

  async generateEmbedding(
    input: GenerateEmbeddingInput,
  ): Promise<GenerateEmbeddingResult> {
    if (input.text.trim().length === 0) {
      throw new BadRequestException('Embedding text is required');
    }

    try {
      const response = await this.getClient().embeddings.create({
        model: this.model,
        input: input.text,
        dimensions: this.dimensions,
      });

      const embedding = response.data[0]?.embedding;

      if (!embedding) {
        throw new ServiceUnavailableException('Embedding provider returned no data');
      }

      return {
        embedding,
        dimensions: embedding.length,
        provider: 'openai',
        model: this.model,
      };
    } catch (error) {
      if (error instanceof BadRequestException) {
        throw error;
      }

      if (error instanceof ServiceUnavailableException) {
        throw error;
      }

      throw new ServiceUnavailableException('Embedding provider request failed');
    }
  }

  private getClient(): OpenAI {
    this.client ??= new OpenAI({
      apiKey: this.configService.getOrThrow<string>('OPENAI_API_KEY'),
    });

    return this.client;
  }
}
import { Injectable } from '@nestjs/common';

import { EmbeddingsService } from '../embeddings/embeddings.service';
import { PrismaService } from '../prisma/prisma.service';
import { type SearchDto } from './dto/search.dto';
import { ConfigService } from '@nestjs/config';

export interface RetrievalResult {
  chunkId: string;
  documentId: string;
  documentName: string;
  content: string;
  tokenCount: number | null;
  similarity: number;
}

export interface SearchResponse {
  results: RetrievalResult[];
}

interface RawRetrievalResult {
  chunkId: string;
  documentId: string;
  documentName: string;
  content: string;
  tokenCount: number | null;
  similarity: number;
}

@Injectable()
export class RetrievalService {
  private readonly minRetrievalSimilarity: number | null;

  constructor(
    private readonly prisma: PrismaService,
    private readonly embeddingsService: EmbeddingsService,
    configService: ConfigService,
  ) {
    this.minRetrievalSimilarity = this.parseMinRetrievalSimilarity(
      configService.get<string>('MIN_RETRIEVAL_SIMILARITY'),
    );
  }

  async search(tenantId: string, searchDto: SearchDto): Promise<SearchResponse> {
    const limit = this.normalizeLimit(searchDto.limit);
    const queryEmbedding = await this.embeddingsService.generateEmbedding(
      searchDto.query,
    );

    const results = await this.prisma.$queryRaw<RawRetrievalResult[]>`
      SELECT
        dc."id" AS "chunkId",
        dc."documentId" AS "documentId",
        d."name" AS "documentName",
        dc."content" AS "content",
        dc."tokenCount" AS "tokenCount",
        (1 - (dc."embedding" <=> ${this.formatVector(queryEmbedding.embedding)}::vector)) AS "similarity"
      FROM "document_chunks" dc
      INNER JOIN "documents" d ON d."id" = dc."documentId"
      WHERE dc."tenantId" = ${tenantId}
        AND d."tenantId" = ${tenantId}
        AND dc."embedding" IS NOT NULL
      ORDER BY dc."embedding" <=> ${this.formatVector(queryEmbedding.embedding)}::vector
      LIMIT ${limit}
    `;

    return {
      results: this.applySimilarityThreshold(results),
    };
  }

  private normalizeLimit(limit?: number): number {
    if (!limit) {
      return 5;
    }

    return Math.min(Math.max(limit, 1), 20);
  }

  private formatVector(embedding: number[]): string {
    return `[${embedding.join(',')}]`;
  }

  private parseMinRetrievalSimilarity(value?: string): number | null {
    if (!value) {
      return null;
    }

    const parsedValue = Number(value);

    if (!Number.isFinite(parsedValue) || parsedValue < 0 || parsedValue > 1) {
      throw new Error('MIN_RETRIEVAL_SIMILARITY must be a number between 0 and 1');
    }

    return parsedValue;
  }

  private applySimilarityThreshold(
    results: RawRetrievalResult[],
  ): RawRetrievalResult[] {
    const minRetrievalSimilarity = this.minRetrievalSimilarity;

    if (minRetrievalSimilarity === null) {
      return results;
    }

    return results.filter(
      (result) => result.similarity >= minRetrievalSimilarity,
    );
  }
}
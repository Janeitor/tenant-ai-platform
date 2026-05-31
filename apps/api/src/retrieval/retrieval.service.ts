import { Injectable } from '@nestjs/common';

import { EmbeddingsService } from '../embeddings/embeddings.service';
import { PrismaService } from '../prisma/prisma.service';
import { type SearchDto } from './dto/search.dto';

export interface RetrievalResult {
  chunkId: string;
  documentId: string;
  documentName: string;
  content: string;
  tokenCount: number | null;
  score: number;
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
  score: number;
}

@Injectable()
export class RetrievalService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly embeddingsService: EmbeddingsService,
  ) {}

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
        (dc."embedding" <-> ${this.formatVector(queryEmbedding.embedding)}::vector) AS "score"
      FROM "document_chunks" dc
      INNER JOIN "documents" d ON d."id" = dc."documentId"
      WHERE dc."tenantId" = ${tenantId}
        AND d."tenantId" = ${tenantId}
        AND dc."embedding" IS NOT NULL
      ORDER BY dc."embedding" <-> ${this.formatVector(queryEmbedding.embedding)}::vector
      LIMIT ${limit}
    `;

    return {
      results,
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
}
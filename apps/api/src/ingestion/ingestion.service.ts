import {
  BadRequestException,
  Inject,
  Injectable,
  NotFoundException,
} from '@nestjs/common';

import { EmbeddingsService } from '../embeddings/embeddings.service';
import { PrismaService } from '../prisma/prisma.service';
import { OBJECT_STORAGE } from '../storage/object-storage.service';
import { type ObjectStoragePort } from '../storage/object-storage.types';

export interface IngestDocumentResult {
  documentId: string;
  status: string;
  chunksCreated: number;
}

@Injectable()
export class IngestionService {
  private readonly chunkSize = 1000;
  private readonly chunkOverlap = 150;

  constructor(
    private readonly prisma: PrismaService,
    @Inject(OBJECT_STORAGE)
    private readonly objectStorage: ObjectStoragePort,
    private readonly embeddingsService: EmbeddingsService,
  ) {}

  async ingestDocument(
    tenantId: string,
    documentId: string,
  ): Promise<IngestDocumentResult> {
    const document = await this.prisma.document.findFirst({
      where: {
        id: documentId,
        tenantId,
      },
    });

    if (!document) {
      throw new NotFoundException('Document not found');
    }

    if (!document.storageKey) {
      throw new BadRequestException('Document has no stored file');
    }

    if (document.mimeType !== 'text/plain') {
      throw new BadRequestException('Only text/plain ingestion is supported');
    }

    await this.prisma.document.update({
      where: {
        id: document.id,
      },
      data: {
        status: 'processing',
      },
    });

    const storedObject = await this.objectStorage.getObject({
      key: document.storageKey,
    });

    const content = storedObject.body.toString('utf8');
    const chunks = this.splitIntoChunks(content);

    await this.prisma.documentChunk.deleteMany({
      where: {
        documentId: document.id,
        tenantId,
      },
    });

    for (const [index, chunk] of chunks.entries()) {
      const embedding = await this.embeddingsService.generateEmbedding(chunk);

      await this.prisma.$executeRaw`
        INSERT INTO "document_chunks" (
          "id",
          "tenantId",
          "documentId",
          "content",
          "chunkIndex",
          "embedding",
          "createdAt"
        )
        VALUES (
          gen_random_uuid()::text,
          ${tenantId},
          ${document.id},
          ${chunk},
          ${index},
          ${this.formatVector(embedding.embedding)}::vector,
          now()
        )
      `;
    }

    await this.prisma.document.update({
      where: {
        id: document.id,
      },
      data: {
        status: 'ready',
      },
    });

    return {
      documentId: document.id,
      status: 'ready',
      chunksCreated: chunks.length,
    };
  }

  private splitIntoChunks(content: string): string[] {
    const normalizedContent = content.trim();

    if (!normalizedContent) {
      return [];
    }

    const chunks: string[] = [];
    let start = 0;

    while (start < normalizedContent.length) {
      const end = Math.min(start + this.chunkSize, normalizedContent.length);
      chunks.push(normalizedContent.slice(start, end));

      if (end === normalizedContent.length) {
        break;
      }

      start = Math.max(end - this.chunkOverlap, start + 1);
    }

    return chunks;
  }

  private formatVector(embedding: number[]): string {
    return `[${embedding.join(',')}]`;
  }
}

import {
  BadRequestException,
  Inject,
  Injectable,
  NotFoundException,
} from '@nestjs/common';

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

    if (chunks.length > 0) {
      await this.prisma.documentChunk.createMany({
        data: chunks.map((chunk, index) => ({
          tenantId,
          documentId: document.id,
          content: chunk,
          chunkIndex: index,
        })),
      });
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
}
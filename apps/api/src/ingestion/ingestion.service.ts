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
import { estimateTokenCount } from './token-count';
import { ConfigService } from '@nestjs/config';
import { DocumentTextExtractorService } from './document-text-extractor.service';

export interface IngestDocumentResult {
    documentId: string;
    status: string;
    chunksCreated: number;
}

@Injectable()
export class IngestionService {
    private readonly chunkSize = 1000;
    private readonly chunkOverlap = 150;
    private readonly expectedEmbeddingDimensions: number;

    constructor(
        private readonly prisma: PrismaService,
        @Inject(OBJECT_STORAGE)
        private readonly objectStorage: ObjectStoragePort,
        private readonly embeddingsService: EmbeddingsService,
        private readonly documentTextExtractor: DocumentTextExtractorService,
        configService: ConfigService,
    ) {
        this.expectedEmbeddingDimensions = Number(
            configService.getOrThrow<string>('EMBEDDING_DIMENSIONS'),
        );
    }

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

        await this.prisma.document.update({
            where: {
                id: document.id,
            },
            data: {
                status: 'processing',
            },
        });

        try {
            const storedObject = await this.objectStorage.getObject({
                key: document.storageKey,
            });

            const content = await this.documentTextExtractor.extractText({
                body: storedObject.body,
                mimeType: document.mimeType,
            });
            const chunks = this.splitIntoChunks(content);

            await this.prisma.documentChunk.deleteMany({
                where: {
                    documentId: document.id,
                    tenantId,
                },
            });

            for (const [index, chunk] of chunks.entries()) {
                const embedding = await this.embeddingsService.generateEmbedding(chunk);
                const tokenCount = estimateTokenCount(chunk);

                this.validateEmbeddingDimensions(embedding.embedding, embedding.dimensions);

                await this.prisma.$executeRaw`
        INSERT INTO "document_chunks" (
          "id",
          "tenantId",
          "documentId",
          "content",
          "chunkIndex",
          "tokenCount",
          "embedding",
          "createdAt"
        )
        VALUES (
          gen_random_uuid()::text,
          ${tenantId},
          ${document.id},
          ${chunk},
          ${index},
          ${tokenCount},
          CAST(${this.formatVector(embedding.embedding)} AS vector),
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
        } catch (error) {
            await this.prisma.document.update({
                where: {
                    id: document.id,
                },
                data: {
                    status: 'failed',
                },
            });
            
            throw error;
        }
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


    private validateEmbeddingDimensions(
        embedding: number[],
        reportedDimensions: number,
    ): void {
        if (embedding.length !== reportedDimensions) {
            throw new BadRequestException(
                'Embedding dimensions do not match returned vector length',
            );
        }

        if (reportedDimensions !== this.expectedEmbeddingDimensions) {
            throw new BadRequestException(
                `Embedding dimensions must be ${this.expectedEmbeddingDimensions}`,
            );
        }
    }

    private formatVector(embedding: number[]): string {
        return `[${embedding.join(',')}]`;
    }
}

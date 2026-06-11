import { Injectable, UnauthorizedException } from '@nestjs/common';

import { PrismaService } from '../prisma/prisma.service';
import { ApiKeysService } from '../api-keys/api-keys.service';
import { type CreateTenantAdminApiKeyDto } from './dto/create-tenant-admin-api-key.dto';
import {
  DocumentsService,
  type UploadDocumentInput,
} from '../documents/documents.service';
import { IngestionService } from '../ingestion/ingestion.service';

export interface TenantAdminSummary {
  tenant: {
    id: string;
    name: string;
    slug: string;
  };
  metrics: {
    documents: number;
    chunks: number;
    usageLogs: number;
  };
  recentUsageLogs: Array<{
    id: string;
    provider: string;
    model: string;
    inputTokens: number | null;
    outputTokens: number | null;
    totalTokens: number | null;
    estimatedCostUsd: number | null;
    contextTokens: number | null;
    selectedChunks: number | null;
    maxContextTokens: number | null;
    candidateLimit: number | null;
    createdAt: Date;
  }>;
}

export interface TenantAdminDocument {
  id: string;
  name: string;
  mimeType: string;
  sizeBytes: number;
  status: string;
  createdAt: Date;
  updatedAt: Date;
}

export interface TenantAdminApiKey {
  id: string;
  name: string;
  keyPrefix: string;
  createdAt: Date;
  revokedAt: Date | null;
}

@Injectable()
export class TenantAdminService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly apiKeysService: ApiKeysService,
    private readonly documentsService: DocumentsService,
    private readonly ingestionService: IngestionService,
  ) { }

  async getSummary(tenantId: string | null): Promise<TenantAdminSummary> {
    if (!tenantId) {
      throw new UnauthorizedException('Tenant admin user is not assigned to a tenant');
    }

    const [tenant, documents, chunks, usageLogs, recentUsageLogs] =
      await Promise.all([
        this.prisma.tenant.findUniqueOrThrow({
          where: {
            id: tenantId,
          },
          select: {
            id: true,
            name: true,
            slug: true,
          },
        }),
        this.prisma.document.count({
          where: {
            tenantId,
          },
        }),
        this.prisma.documentChunk.count({
          where: {
            tenantId,
          },
        }),
        this.prisma.usageLog.count({
          where: {
            tenantId,
          },
        }),
        this.prisma.usageLog.findMany({
          where: {
            tenantId,
          },
          orderBy: {
            createdAt: 'desc',
          },
          take: 5,
          select: {
            id: true,
            provider: true,
            model: true,
            inputTokens: true,
            outputTokens: true,
            totalTokens: true,
            estimatedCostUsd: true,
            contextTokens: true,
            selectedChunks: true,
            maxContextTokens: true,
            candidateLimit: true,
            createdAt: true,
          },
        }),
      ]);

    return {
      tenant,
      metrics: {
        documents,
        chunks,
        usageLogs,
      },
      recentUsageLogs: recentUsageLogs.map((usageLog) => ({
        ...usageLog,
        estimatedCostUsd: usageLog.estimatedCostUsd?.toNumber() ?? null,
      })),
    };
  }

  async createApiKey(
    tenantId: string | null,
    createDto: CreateTenantAdminApiKeyDto,
  ): ReturnType<ApiKeysService['create']> {
    if (!tenantId) {
      throw new UnauthorizedException('Tenant admin user is not assigned to a tenant');
    }

    return this.apiKeysService.create(tenantId, createDto);
  }

  async listDocuments(tenantId: string | null): Promise<TenantAdminDocument[]> {
    if (!tenantId) {
      throw new UnauthorizedException('Tenant admin user is not assigned to a tenant');
    }

    return this.prisma.document.findMany({
      where: {
        tenantId,
      },
      orderBy: {
        createdAt: 'desc',
      },
      select: {
        id: true,
        name: true,
        mimeType: true,
        sizeBytes: true,
        status: true,
        createdAt: true,
        updatedAt: true,
      },
    });
  }

  async listApiKeys(tenantId: string | null): Promise<TenantAdminApiKey[]> {
    if (!tenantId) {
      throw new UnauthorizedException('Tenant admin user is not assigned to a tenant');
    }

    return this.prisma.apiKey.findMany({
      where: {
        tenantId,
      },
      orderBy: {
        createdAt: 'desc',
      },
      select: {
        id: true,
        name: true,
        keyPrefix: true,
        createdAt: true,
        revokedAt: true,
      },
    });
  }

  async uploadDocument(
    tenantId: string | null,
    uploadDocumentInput: UploadDocumentInput,
  ): ReturnType<DocumentsService['upload']> {
    if (!tenantId) {
      throw new UnauthorizedException('Tenant admin user is not assigned to a tenant');
    }

    return this.documentsService.upload(tenantId, uploadDocumentInput);
  }

  async ingestDocument(
    tenantId: string | null,
    documentId: string,
  ): ReturnType<IngestionService['ingestDocument']> {
    if (!tenantId) {
      throw new UnauthorizedException('Tenant admin user is not assigned to a tenant');
    }

    return this.ingestionService.ingestDocument(tenantId, documentId);
  }
}

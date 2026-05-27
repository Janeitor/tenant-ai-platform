import { Inject, Injectable } from '@nestjs/common';

import { OBJECT_STORAGE } from '../storage/object-storage.service';
import { type ObjectStoragePort } from '../storage/object-storage.types';
import { PrismaService } from '../prisma/prisma.service';
import { type CreateDocumentDto } from './dto/create-document.dto';

type DocumentRecord = Awaited<ReturnType<PrismaService['document']['create']>>;

export interface UploadDocumentInput {
  originalName: string;
  mimeType: string;
  sizeBytes: number;
  buffer: Buffer;
}

@Injectable()
export class DocumentsService {
  constructor(
    private readonly prisma: PrismaService,
    @Inject(OBJECT_STORAGE)
    private readonly objectStorage: ObjectStoragePort,
  ) {}

  async create(
    tenantId: string,
    createDocumentDto: CreateDocumentDto,
  ): Promise<DocumentRecord> {
    return this.prisma.document.create({
      data: {
        tenantId,
        name: createDocumentDto.name,
        mimeType: createDocumentDto.mimeType,
        sizeBytes: createDocumentDto.sizeBytes,
      },
    });
  }

  async upload(
    tenantId: string,
    uploadDocumentInput: UploadDocumentInput,
  ): Promise<DocumentRecord> {
    const storageKey = this.buildStorageKey(
      tenantId,
      uploadDocumentInput.originalName,
    );

    await this.objectStorage.putObject({
      key: storageKey,
      body: uploadDocumentInput.buffer,
      contentType: uploadDocumentInput.mimeType,
    });

    return this.prisma.document.create({
      data: {
        tenantId,
        name: uploadDocumentInput.originalName,
        mimeType: uploadDocumentInput.mimeType,
        sizeBytes: uploadDocumentInput.sizeBytes,
        storageKey,
        status: 'uploaded',
      },
    });
  }

  async findAllByTenant(tenantId: string): Promise<DocumentRecord[]> {
    return this.prisma.document.findMany({
      where: {
        tenantId,
      },
      orderBy: {
        createdAt: 'desc',
      },
    });
  }

  private buildStorageKey(tenantId: string, originalName: string): string {
    const safeFileName = originalName.replace(/[^a-zA-Z0-9_.-]/g, '_');
    const uniqueSuffix = `${Date.now()}-${crypto.randomUUID()}`;

    return `${tenantId}/documents/${uniqueSuffix}-${safeFileName}`;
  }
}
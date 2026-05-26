import { Injectable } from '@nestjs/common';

import { PrismaService } from '../prisma/prisma.service';
import { type CreateDocumentDto } from './dto/create-document.dto';

type DocumentRecord = Awaited<ReturnType<PrismaService['document']['create']>>;

@Injectable()
export class DocumentsService {
  constructor(private readonly prisma: PrismaService) {}

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
}
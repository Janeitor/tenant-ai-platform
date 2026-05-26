import { Injectable, NotFoundException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { createHmac, randomBytes } from 'node:crypto';

import { PrismaService } from '../prisma/prisma.service';
import { type CreateApiKeyDto } from './dto/create-api-key.dto';

type ApiKeyRecord = Awaited<ReturnType<PrismaService['apiKey']['create']>>;

export interface CreatedApiKeyResponse {
  id: string;
  name: string;
  keyPrefix: string;
  apiKey: string;
  createdAt: Date;
}

export type ApiKeyListItem = Omit<ApiKeyRecord, 'keyHash'>;

@Injectable()
export class ApiKeysService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly configService: ConfigService,
  ) {}

  async create(
    tenantId: string,
    createApiKeyDto: CreateApiKeyDto,
  ): Promise<CreatedApiKeyResponse> {
    const tenant = await this.prisma.tenant.findUnique({
      where: {
        id: tenantId,
      },
    });

    if (!tenant) {
      throw new NotFoundException('Tenant not found');
    }

    const apiKey = this.generateApiKey();
    const keyHash = this.hashApiKey(apiKey);
    const keyPrefix = apiKey.slice(0, 12);

    const createdApiKey = await this.prisma.apiKey.create({
      data: {
        tenantId,
        name: createApiKeyDto.name,
        keyHash,
        keyPrefix,
      },
    });

    return {
      id: createdApiKey.id,
      name: createdApiKey.name,
      keyPrefix: createdApiKey.keyPrefix,
      apiKey,
      createdAt: createdApiKey.createdAt,
    };
  }

  async findAllByTenant(tenantId: string): Promise<ApiKeyListItem[]> {
    return this.prisma.apiKey.findMany({
      where: {
        tenantId,
      },
      omit: {
        keyHash: true,
      },
      orderBy: {
        createdAt: 'desc',
      },
    });
  }

  private generateApiKey(): string {
    return `tai_${randomBytes(32).toString('hex')}`;
  }

  private hashApiKey(apiKey: string): string {
    const pepper = this.configService.getOrThrow<string>('API_KEY_PEPPER');

    return createHmac('sha256', pepper).update(apiKey).digest('hex');
  }
}
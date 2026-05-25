import { Injectable } from '@nestjs/common';

import { PrismaService } from '../prisma/prisma.service';
import { type CreateTenantDto } from './dto/create-tenant.dto';

type Tenant = Awaited<ReturnType<PrismaService['tenant']['create']>>;

@Injectable()
export class TenantsService {
  constructor(private readonly prisma: PrismaService) {}

  async create(createTenantDto: CreateTenantDto): Promise<Tenant> {
    return this.prisma.tenant.create({
      data: createTenantDto,
    });
  }

  async findAll(): Promise<Tenant[]> {
    return this.prisma.tenant.findMany({
      orderBy: {
        createdAt: 'desc',
      },
    });
  }
}
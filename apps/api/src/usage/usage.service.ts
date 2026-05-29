import { Injectable } from '@nestjs/common';

import { PrismaService } from '../prisma/prisma.service';
import { type CreateUsageLogDto } from './dto/create-usage-log.dto';

type UsageLogRecord = Awaited<ReturnType<PrismaService['usageLog']['create']>>;

@Injectable()
export class UsageService {
    constructor(private readonly prisma: PrismaService) { }

    async createLog(
        createUsageLogDto: CreateUsageLogDto,
    ): Promise<UsageLogRecord> {
        return this.prisma.usageLog.create({
            data: createUsageLogDto,
        });
    }

    async findAllByTenant(tenantId: string): Promise<UsageLogRecord[]> {
        return this.prisma.usageLog.findMany({
            where: {
                tenantId,
            },
            orderBy: {
                createdAt: 'desc',
            },
        });
    }
}

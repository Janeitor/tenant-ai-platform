import { BadRequestException, Injectable, RequestTimeoutException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { type CreateUsageLogDto } from './dto/create-usage-log.dto';
import { type ListUsageQueryDto } from './dto/list-usage-query.dto';

type UsageLogRecord = Awaited<ReturnType<PrismaService['usageLog']['create']>>;
const DEFAULT_USAGE_PAGE = 1;
const DEFAULT_USAGE_LIMIT = 50;
const MAX_USAGE_DATE_RANGE_DAYS = 90;
const USAGE_QUERY_TIMEOUT_MS = 15_000;

export interface UsagePagination {
    page: number;
    limit: number;
    total: number;
    totalPages: number;
}

export interface UsageFilters {
    startDate: string;
    endDate: string;
}

export interface PaginatedUsageLogs {
    data: UsageLogRecord[];
    pagination: UsagePagination;
    filters: UsageFilters;
}

interface ResolvedDateRange {
    start: Date;
    end: Date;
    startDate: string;
    endDate: string;
}

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

    async findAllByTenant(
        tenantId: string,
        query: ListUsageQueryDto,
    ): Promise<PaginatedUsageLogs> {
        const page = query.page ?? DEFAULT_USAGE_PAGE;
        const limit = query.limit ?? DEFAULT_USAGE_LIMIT;
        const dateRange = this.resolveDateRange(query);
        const skip = (page - 1) * limit;

        const [data, total] = await this.withTimeout(
            Promise.all([
                this.prisma.usageLog.findMany({
                    where: {
                        tenantId,
                        createdAt: {
                            gte: dateRange.start,
                            lte: dateRange.end,
                        },
                    },
                    orderBy: {
                        createdAt: 'desc',
                    },
                    skip,
                    take: limit,
                }),
                this.prisma.usageLog.count({
                    where: {
                        tenantId,
                        createdAt: {
                            gte: dateRange.start,
                            lte: dateRange.end,
                        },
                    },
                }),
            ]),
        );

        return {
            data,
            pagination: {
                page,
                limit,
                total,
                totalPages: Math.ceil(total / limit),
            },
            filters: {
                startDate: dateRange.startDate,
                endDate: dateRange.endDate,
            },
        };
    }

    private resolveDateRange(query: ListUsageQueryDto): ResolvedDateRange {
        if ((query.startDate && !query.endDate) || (!query.startDate && query.endDate)) {
            throw new BadRequestException('startDate and endDate must be provided together');
        }

        if (!query.startDate && !query.endDate) {
            return this.resolveCurrentMonthDateRange();
        }

        const startDate = query.startDate as string;
        const endDate = query.endDate as string;
        const start = this.buildStartOfDay(startDate);
        const end = this.buildEndOfDay(endDate);

        if (end.getTime() < start.getTime()) {
            throw new BadRequestException('endDate must not be earlier than startDate');
        }

        const rangeDays =
            (end.getTime() - start.getTime()) / (1000 * 60 * 60 * 24);

        if (rangeDays > MAX_USAGE_DATE_RANGE_DAYS) {
            throw new BadRequestException('Date range must not exceed 90 days');
        }

        return {
            start,
            end,
            startDate,
            endDate,
        };
    }

    private resolveCurrentMonthDateRange(): ResolvedDateRange {
        const now = new Date();
        const start = new Date(now.getFullYear(), now.getMonth(), 1, 0, 0, 0, 0);
        const end = new Date(
            now.getFullYear(),
            now.getMonth() + 1,
            0,
            23,
            59,
            59,
            999,
        );

        return {
            start,
            end,
            startDate: this.formatDateOnly(start),
            endDate: this.formatDateOnly(end),
        };
    }

    private buildStartOfDay(date: string): Date {
        return this.buildLocalDate(date, 0, 0, 0, 0);
    }

    private buildEndOfDay(date: string): Date {
        return this.buildLocalDate(date, 23, 59, 59, 999);
    }

    private buildLocalDate(
        date: string,
        hours: number,
        minutes: number,
        seconds: number,
        milliseconds: number,
    ): Date {
        const [year, month, day] = date.split('-').map(Number);
        const parsedDate = new Date(
            year,
            month - 1,
            day,
            hours,
            minutes,
            seconds,
            milliseconds,
        );

        if (
            parsedDate.getFullYear() !== year ||
            parsedDate.getMonth() !== month - 1 ||
            parsedDate.getDate() !== day
        ) {
            throw new BadRequestException('Invalid date');
        }

        return parsedDate;
    }

    private formatDateOnly(date: Date): string {
        const year = date.getFullYear();
        const month = String(date.getMonth() + 1).padStart(2, '0');
        const day = String(date.getDate()).padStart(2, '0');

        return `${year}-${month}-${day}`;
    }

    private withTimeout<T>(promise: Promise<T>): Promise<T> {
        let timeoutId: NodeJS.Timeout;

        const timeout = new Promise<T>((_, reject) => {
            timeoutId = setTimeout(() => {
                reject(
                    new RequestTimeoutException(
                        'Response time exceeded. Please adjust the filters to reduce the amount of data.',
                    ),
                );
            }, USAGE_QUERY_TIMEOUT_MS);
        });

        return Promise.race([promise, timeout]).finally(() => {
            clearTimeout(timeoutId);
        });
    }
}

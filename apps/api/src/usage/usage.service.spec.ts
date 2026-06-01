import { UsageService } from './usage.service';

describe('UsageService', () => {
    const prisma = {
        usageLog: {
            create: jest.fn(),
            findMany: jest.fn(),
            count: jest.fn(),
        },
    };

    beforeEach(() => {
        jest.clearAllMocks();
    });

    it('creates usage log', async () => {
        const usageLog = {
            id: 'usage_1',
            tenantId: 'tenant_1',
            provider: 'local',
            model: 'retrieval-only',
            inputTokens: null,
            outputTokens: null,
            totalTokens: null,
            estimatedCostUsd: null,
            createdAt: new Date('2026-01-01T00:00:00.000Z'),
        };

        prisma.usageLog.create.mockResolvedValue(usageLog);

        const service = new UsageService(prisma as never);

        await expect(
            service.createLog({
                tenantId: 'tenant_1',
                provider: 'local',
                model: 'retrieval-only',
                inputTokens: null,
                outputTokens: null,
                totalTokens: null,
                estimatedCostUsd: null,
                contextTokens: 7,
                selectedChunks: 1,
                maxContextTokens: 8000,
                candidateLimit: 5,
            }),
        ).resolves.toEqual(usageLog);

        expect(prisma.usageLog.create).toHaveBeenCalledWith({
            data: {
                tenantId: 'tenant_1',
                provider: 'local',
                model: 'retrieval-only',
                inputTokens: null,
                outputTokens: null,
                totalTokens: null,
                estimatedCostUsd: null,
                contextTokens: 7,
                selectedChunks: 1,
                maxContextTokens: 8000,
                candidateLimit: 5,
            },
        });
    });

        it('creates usage log with null context metrics', async () => {
        const usageLog = {
            id: 'usage_2',
            tenantId: 'tenant_1',
            provider: 'local',
            model: 'retrieval-only',
            inputTokens: null,
            outputTokens: null,
            totalTokens: null,
            estimatedCostUsd: null,
            contextTokens: null,
            selectedChunks: null,
            maxContextTokens: null,
            candidateLimit: null,
            createdAt: new Date('2026-01-01T00:00:00.000Z'),
        };

        prisma.usageLog.create.mockResolvedValue(usageLog);

        const service = new UsageService(prisma as never);

        await expect(
            service.createLog({
                tenantId: 'tenant_1',
                provider: 'local',
                model: 'retrieval-only',
                inputTokens: null,
                outputTokens: null,
                totalTokens: null,
                estimatedCostUsd: null,
                contextTokens: null,
                selectedChunks: null,
                maxContextTokens: null,
                candidateLimit: null,
            }),
        ).resolves.toEqual(usageLog);

        expect(prisma.usageLog.create).toHaveBeenCalledWith({
            data: {
                tenantId: 'tenant_1',
                provider: 'local',
                model: 'retrieval-only',
                inputTokens: null,
                outputTokens: null,
                totalTokens: null,
                estimatedCostUsd: null,
                contextTokens: null,
                selectedChunks: null,
                maxContextTokens: null,
                candidateLimit: null,
            },
        });
    });

    it('lists paginated usage logs for a tenant and date range', async () => {
        const usageLogs = [
            {
                id: 'usage_1',
                tenantId: 'tenant_1',
                provider: 'local',
                model: 'retrieval-only',
                inputTokens: null,
                outputTokens: null,
                totalTokens: null,
                estimatedCostUsd: null,
                createdAt: new Date('2026-05-20T10:00:00.000Z'),
            },
        ];

        prisma.usageLog.findMany.mockResolvedValue(usageLogs);
        prisma.usageLog.count.mockResolvedValue(25);

        const service = new UsageService(prisma as never);

        await expect(
            service.findAllByTenant('tenant_1', {
                page: 2,
                limit: 10,
                startDate: '2026-05-01',
                endDate: '2026-05-29',
            }),
        ).resolves.toEqual({
            data: usageLogs,
            pagination: {
                page: 2,
                limit: 10,
                total: 25,
                totalPages: 3,
            },
            filters: {
                startDate: '2026-05-01',
                endDate: '2026-05-29',
            },
        });

        expect(prisma.usageLog.findMany).toHaveBeenCalledWith({
            where: {
                tenantId: 'tenant_1',
                createdAt: {
                    gte: new Date(2026, 4, 1, 0, 0, 0, 0),
                    lte: new Date(2026, 4, 29, 23, 59, 59, 999),
                },
            },
            orderBy: {
                createdAt: 'desc',
            },
            skip: 10,
            take: 10,
        });

        expect(prisma.usageLog.count).toHaveBeenCalledWith({
            where: {
                tenantId: 'tenant_1',
                createdAt: {
                    gte: new Date(2026, 4, 1, 0, 0, 0, 0),
                    lte: new Date(2026, 4, 29, 23, 59, 59, 999),
                },
            },
        });
    });

    it('uses the current month as default date range', async () => {
        jest.useFakeTimers();
        jest.setSystemTime(new Date(2026, 4, 29, 12, 0, 0, 0));
        try {
            const usageLogs = [];
            prisma.usageLog.findMany.mockResolvedValue(usageLogs);
            prisma.usageLog.count.mockResolvedValue(0);

            const service = new UsageService(prisma as never);

            await expect(service.findAllByTenant('tenant_1', {})).resolves.toEqual({
                data: usageLogs,
                pagination: {
                    page: 1,
                    limit: 50,
                    total: 0,
                    totalPages: 0,
                },
                filters: {
                    startDate: '2026-05-01',
                    endDate: '2026-05-31',
                },
            });

            expect(prisma.usageLog.findMany).toHaveBeenCalledWith({
                where: {
                    tenantId: 'tenant_1',
                    createdAt: {
                        gte: new Date(2026, 4, 1, 0, 0, 0, 0),
                        lte: new Date(2026, 4, 31, 23, 59, 59, 999),
                    },
                },
                orderBy: {
                    createdAt: 'desc',
                },
                skip: 0,
                take: 50,
            });
        } finally {
            jest.useRealTimers();
        }
    });

    it('rejects when only startDate is provided', async () => {
        const service = new UsageService(prisma as never);

        await expect(
            service.findAllByTenant('tenant_1', {
                startDate: '2026-05-01',
            }),
        ).rejects.toThrow('startDate and endDate must be provided together');
    });

    it('rejects when only endDate is provided', async () => {
        const service = new UsageService(prisma as never);

        await expect(
            service.findAllByTenant('tenant_1', {
                endDate: '2026-05-29',
            }),
        ).rejects.toThrow('startDate and endDate must be provided together');
    });

    it('rejects when endDate is earlier than startDate', async () => {
        const service = new UsageService(prisma as never);

        await expect(
            service.findAllByTenant('tenant_1', {
                startDate: '2026-05-29',
                endDate: '2026-05-01',
            }),
        ).rejects.toThrow('endDate must not be earlier than startDate');
    });

    it('rejects date ranges greater than 90 days', async () => {
        const service = new UsageService(prisma as never);

        await expect(
            service.findAllByTenant('tenant_1', {
                startDate: '2026-01-01',
                endDate: '2026-05-01',
            }),
        ).rejects.toThrow('Date range must not exceed 90 days');
    });

    it('rejects invalid calendar dates', async () => {
        const service = new UsageService(prisma as never);

        await expect(
            service.findAllByTenant('tenant_1', {
                startDate: '2026-02-31',
                endDate: '2026-03-01',
            }),
        ).rejects.toThrow('Invalid date');
    });

    it('throws RequestTimeoutException when the usage query exceeds the timeout', async () => {
        jest.useFakeTimers();

        try {
            prisma.usageLog.findMany.mockReturnValue(new Promise(() => undefined));
            prisma.usageLog.count.mockResolvedValue(0);

            const service = new UsageService(prisma as never);
            const result = service.findAllByTenant('tenant_1', {
                startDate: '2026-05-01',
                endDate: '2026-05-29',
            });

            jest.advanceTimersByTime(15_000);

            await expect(result).rejects.toThrow(
                'Response time exceeded. Please adjust the filters to reduce the amount of data.',
            );
        } finally {
            jest.useRealTimers();
        }
    });
});
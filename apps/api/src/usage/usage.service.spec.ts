import { UsageService } from './usage.service';

describe('UsageService', () => {
    const prisma = {
        usageLog: {
            create: jest.fn(),
            findMany: jest.fn(),
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
            },
        });
    });

    it('lists usage logs for a tenant ordered by newest first', async () => {
        prisma.usageLog.findMany.mockResolvedValue([]);

        const service = new UsageService(prisma as never);

        await expect(service.findAllByTenant('tenant_1')).resolves.toEqual([]);

        expect(prisma.usageLog.findMany).toHaveBeenCalledWith({
            where: {
                tenantId: 'tenant_1',
            },
            orderBy: {
                createdAt: 'desc',
            },
        });
    });
});
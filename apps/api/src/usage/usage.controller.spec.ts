import { UsageController } from './usage.controller';

describe('UsageController', () => {
    const usageService = {
        findAllByTenant: jest.fn(),
    };

    beforeEach(() => {
        jest.clearAllMocks();
    });

    it('lists usage logs for the authenticated tenant', async () => {
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
                createdAt: new Date('2026-01-01T00:00:00.000Z'),
            },
        ];

        usageService.findAllByTenant.mockResolvedValue(usageLogs);

        const controller = new UsageController(usageService as never);

        const query = {
            page: 1,
            limit: 10,
            startDate: '2026-05-01',
            endDate: '2026-05-29',
        };

        await expect(
            controller.findAll(
                {
                    apiKey: {
                        id: 'api_key_1',
                        tenantId: 'tenant_1',
                        keyPrefix: 'tai_test',
                    },
                } as never,
                query,
            ),
        ).resolves.toEqual(usageLogs);

        expect(usageService.findAllByTenant).toHaveBeenCalledWith(
            'tenant_1',
            query,
        );
    });
});
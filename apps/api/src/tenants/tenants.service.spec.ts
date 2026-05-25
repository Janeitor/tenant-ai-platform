import { TenantsService } from './tenants.service';

describe('TenantsService', () => {
  const prisma = {
    tenant: {
      create: jest.fn(),
      findMany: jest.fn(),
    },
  };

  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('creates a tenant', async () => {
    const tenant = {
      id: 'tenant_1',
      name: 'Demo Company',
      slug: 'demo-company',
      createdAt: new Date('2026-01-01T00:00:00.000Z'),
      updatedAt: new Date('2026-01-01T00:00:00.000Z'),
    };

    prisma.tenant.create.mockResolvedValue(tenant);

    const service = new TenantsService(prisma as never);

    await expect(
      service.create({
        name: 'Demo Company',
        slug: 'demo-company',
      }),
    ).resolves.toEqual(tenant);

    expect(prisma.tenant.create).toHaveBeenCalledWith({
      data: {
        name: 'Demo Company',
        slug: 'demo-company',
      },
    });
  });

  it('lists tenants ordered by creation date descending', async () => {
    prisma.tenant.findMany.mockResolvedValue([]);

    const service = new TenantsService(prisma as never);

    await expect(service.findAll()).resolves.toEqual([]);

    expect(prisma.tenant.findMany).toHaveBeenCalledWith({
      orderBy: {
        createdAt: 'desc',
      },
    });
  });
});
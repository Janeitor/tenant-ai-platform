import { HealthService } from './health.service';

describe('HealthService', () => {
  it('returns API health status', () => {
    const service = new HealthService();

    expect(service.getStatus()).toEqual({
      status: 'ok',
      service: 'tenant-ai-api',
    });
  });
});
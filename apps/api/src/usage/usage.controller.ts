import { Controller, Get, Req, UseGuards } from '@nestjs/common';

import { ApiKeyAuthGuard } from '../auth/api-key-auth.guard';
import { type ApiKeyAuthenticatedRequest } from '../auth/api-key-authenticated-request';
import { UsageService } from './usage.service';

type UsageLogResponse = Awaited<ReturnType<UsageService['findAllByTenant']>>;

@Controller('usage')
@UseGuards(ApiKeyAuthGuard)
export class UsageController {
  constructor(private readonly usageService: UsageService) {}

  @Get()
  findAll(
    @Req() request: ApiKeyAuthenticatedRequest,
  ): Promise<UsageLogResponse> {
    return this.usageService.findAllByTenant(request.apiKey.tenantId);
  }
}
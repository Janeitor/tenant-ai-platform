import { Body, Controller, Get, Param, Post } from '@nestjs/common';

import {
  ApiKeysService,
  type ApiKeyListItem,
  type CreatedApiKeyResponse,
} from './api-keys.service';
import { type CreateApiKeyDto } from './dto/create-api-key.dto';

@Controller('tenants/:tenantId/api-keys')
export class ApiKeysController {
  constructor(private readonly apiKeysService: ApiKeysService) {}

  @Post()
  create(
    @Param('tenantId') tenantId: string,
    @Body() createApiKeyDto: CreateApiKeyDto,
  ): Promise<CreatedApiKeyResponse> {
    return this.apiKeysService.create(tenantId, createApiKeyDto);
  }

  @Get()
  findAllByTenant(
    @Param('tenantId') tenantId: string,
  ): Promise<ApiKeyListItem[]> {
    return this.apiKeysService.findAllByTenant(tenantId);
  }
}
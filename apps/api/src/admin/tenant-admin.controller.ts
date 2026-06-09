import { Body, Controller, Get, Post, Req, UseGuards } from '@nestjs/common';

import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { type JwtAuthenticatedRequest } from '../auth/jwt-authenticated-request';
import { Roles } from '../auth/roles.decorator';
import { RolesGuard } from '../auth/roles.guard';
import { TenantAdminService } from './tenant-admin.service';
import { CreateTenantAdminApiKeyDto } from './dto/create-tenant-admin-api-key.dto';

@Controller('admin/tenant')
@UseGuards(JwtAuthGuard, RolesGuard)
@Roles('tenant_admin')
export class TenantAdminController {
  constructor(private readonly tenantAdminService: TenantAdminService) { }

  @Get('summary')
  getSummary(
    @Req() request: JwtAuthenticatedRequest,
  ): ReturnType<TenantAdminService['getSummary']> {
    return this.tenantAdminService.getSummary(request.user.tenantId);
  }
  
  @Post('api-keys')
  createApiKey(
    @Req() request: JwtAuthenticatedRequest,
    @Body() createDto: CreateTenantAdminApiKeyDto,
  ): ReturnType<TenantAdminService['createApiKey']> {
    return this.tenantAdminService.createApiKey(request.user.tenantId, createDto);
  }
}
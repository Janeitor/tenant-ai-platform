import { Body, Controller, Get, Post } from '@nestjs/common';

import { CreateTenantDto } from './dto/create-tenant.dto';
import { TenantsService } from './tenants.service';

type TenantResponse = Awaited<ReturnType<TenantsService['create']>>;

@Controller('tenants')
export class TenantsController {
  constructor(private readonly tenantsService: TenantsService) {}

  @Post()
  create(@Body() createTenantDto: CreateTenantDto): Promise<TenantResponse> {
    return this.tenantsService.create(createTenantDto);
  }

  @Get()
  findAll(): Promise<TenantResponse[]> {
    return this.tenantsService.findAll();
  }
}

import {
  BadRequestException,
  Body,
  Controller,
  Get,
  Param,
  Post,
  Req,
  UploadedFile,
  UseGuards,
  UseInterceptors,
} from '@nestjs/common';
import { FileInterceptor } from '@nestjs/platform-express';

import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { type JwtAuthenticatedRequest } from '../auth/jwt-authenticated-request';
import { Roles } from '../auth/roles.decorator';
import { RolesGuard } from '../auth/roles.guard';
import { TenantAdminService } from './tenant-admin.service';
import { CreateTenantAdminApiKeyDto } from './dto/create-tenant-admin-api-key.dto';
import {
  documentUploadOptions,
  type UploadedDocumentFile,
} from '../documents/documents-upload.options';

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

  @Get('documents')
  listDocuments(
    @Req() request: JwtAuthenticatedRequest,
  ): ReturnType<TenantAdminService['listDocuments']> {
    return this.tenantAdminService.listDocuments(request.user.tenantId);
  }

  @Get('api-keys')
  listApiKeys(
    @Req() request: JwtAuthenticatedRequest,
  ): ReturnType<TenantAdminService['listApiKeys']> {
    return this.tenantAdminService.listApiKeys(request.user.tenantId);
  }

  @Post('documents/upload')
  @UseInterceptors(FileInterceptor('file', documentUploadOptions))
  uploadDocument(
    @Req() request: JwtAuthenticatedRequest,
    @UploadedFile() file?: UploadedDocumentFile,
  ): ReturnType<TenantAdminService['uploadDocument']> {
    if (!file) {
      throw new BadRequestException('File is required');
    }

    return this.tenantAdminService.uploadDocument(request.user.tenantId, {
      originalName: file.originalname,
      mimeType: file.mimetype,
      sizeBytes: file.size,
      buffer: file.buffer,
    });
  }

  @Post('documents/:documentId/ingest')
  ingestDocument(
    @Req() request: JwtAuthenticatedRequest,
    @Param('documentId') documentId: string,
  ): ReturnType<TenantAdminService['ingestDocument']> {
    return this.tenantAdminService.ingestDocument(
      request.user.tenantId,
      documentId,
    );
  }
}

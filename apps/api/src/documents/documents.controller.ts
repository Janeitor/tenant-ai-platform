import { Body, Controller, Get, Post, Req, UseGuards } from '@nestjs/common';

import { ApiKeyAuthGuard } from '../auth/api-key-auth.guard';
import { type ApiKeyAuthenticatedRequest } from '../auth/api-key-authenticated-request';
import { type CreateDocumentDto } from './dto/create-document.dto';
import { DocumentsService } from './documents.service';

type DocumentResponse = Awaited<ReturnType<DocumentsService['create']>>;

@Controller('documents')
@UseGuards(ApiKeyAuthGuard)
export class DocumentsController {
  constructor(private readonly documentsService: DocumentsService) {}

  @Post()
  create(
    @Req() request: ApiKeyAuthenticatedRequest,
    @Body() createDocumentDto: CreateDocumentDto,
  ): Promise<DocumentResponse> {
    return this.documentsService.create(
      request.apiKey.tenantId,
      createDocumentDto,
    );
  }

  @Get()
  findAll(
    @Req() request: ApiKeyAuthenticatedRequest,
  ): Promise<DocumentResponse[]> {
    return this.documentsService.findAllByTenant(request.apiKey.tenantId);
  }
}
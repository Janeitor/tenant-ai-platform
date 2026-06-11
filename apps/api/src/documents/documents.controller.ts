import {
  BadRequestException,
  Body,
  Controller,
  Get,
  Post,
  Req,
  UploadedFile,
  UseGuards,
  UseInterceptors,
} from '@nestjs/common';
import { FileInterceptor } from '@nestjs/platform-express';

import { ApiKeyAuthGuard } from '../auth/api-key-auth.guard';
import { type ApiKeyAuthenticatedRequest } from '../auth/api-key-authenticated-request';
import { CreateDocumentDto } from './dto/create-document.dto';
import { DocumentsService } from './documents.service';
import {
  documentUploadOptions,
  type UploadedDocumentFile,
} from './documents-upload.options';

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

  @Post('upload')
  @UseInterceptors(FileInterceptor('file', documentUploadOptions))
  upload(
    @Req() request: ApiKeyAuthenticatedRequest,
    @UploadedFile() file?: UploadedDocumentFile,
  ): Promise<DocumentResponse> {
    if (!file) {
      throw new BadRequestException('File is required');
    }

    return this.documentsService.upload(request.apiKey.tenantId, {
      originalName: file.originalname,
      mimeType: file.mimetype,
      sizeBytes: file.size,
      buffer: file.buffer,
    });
  }

  @Get()
  findAll(
    @Req() request: ApiKeyAuthenticatedRequest,
  ): Promise<DocumentResponse[]> {
    return this.documentsService.findAllByTenant(request.apiKey.tenantId);
  }
}

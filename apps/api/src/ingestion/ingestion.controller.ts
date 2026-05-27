import { Controller, Param, Post, Req, UseGuards } from '@nestjs/common';

import { ApiKeyAuthGuard } from '../auth/api-key-auth.guard';
import { type ApiKeyAuthenticatedRequest } from '../auth/api-key-authenticated-request';
import {
  IngestionService,
  type IngestDocumentResult,
} from './ingestion.service';

@Controller('documents/:documentId/ingest')
@UseGuards(ApiKeyAuthGuard)
export class IngestionController {
  constructor(private readonly ingestionService: IngestionService) {}

  @Post()
  ingestDocument(
    @Req() request: ApiKeyAuthenticatedRequest,
    @Param('documentId') documentId: string,
  ): Promise<IngestDocumentResult> {
    return this.ingestionService.ingestDocument(
      request.apiKey.tenantId,
      documentId,
    );
  }
}
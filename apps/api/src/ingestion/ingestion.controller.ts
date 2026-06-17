import { Controller, Param, Post, Req, UseGuards } from '@nestjs/common';

import { ApiKeyAuthGuard } from '../auth/api-key-auth.guard';
import { type ApiKeyAuthenticatedRequest } from '../auth/api-key-authenticated-request';
import {
  IngestionService,
  type IngestDocumentResult,
} from './ingestion.service';
import { IngestionQueueService } from './ingestion-queue.service';

@Controller('documents/:documentId/ingest')
@UseGuards(ApiKeyAuthGuard)
export class IngestionController {
  constructor(
    private readonly ingestionService: IngestionService,
    private readonly ingestionQueueService: IngestionQueueService,
  ) { }

  @Post()
  async ingestDocument(
    @Req() request: ApiKeyAuthenticatedRequest,
    @Param('documentId') documentId: string,
  ): Promise<IngestDocumentResult> {
    const tenantId = request.apiKey.tenantId;

    const result = await this.ingestionService.ingestDocument(
      tenantId,
      documentId,
    );

    await this.ingestionQueueService.enqueue({
      tenantId,
      documentId,
    });

    return result;
  }
}
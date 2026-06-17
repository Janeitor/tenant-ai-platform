import { Processor, WorkerHost } from '@nestjs/bullmq';
import { Injectable } from '@nestjs/common';
import { type Job } from 'bullmq';

import {
  DOCUMENT_INGESTION_QUEUE,
  INGEST_DOCUMENT_JOB,
  type IngestDocumentJobData,
} from './ingestion-queue.service';
import { IngestionService } from './ingestion.service';

@Processor(DOCUMENT_INGESTION_QUEUE, {
  concurrency: 1,
})
@Injectable()
export class IngestionProcessor extends WorkerHost {
  constructor(private readonly ingestionService: IngestionService) {
    super();
  }

  async process(job: Job<IngestDocumentJobData>): Promise<void> {
    if (job.name !== INGEST_DOCUMENT_JOB) {
      return;
    }

    await this.ingestionService.processDocument(
      job.data.tenantId,
      job.data.documentId,
    );
  }
}
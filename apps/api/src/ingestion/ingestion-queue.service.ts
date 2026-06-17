import { InjectQueue } from '@nestjs/bullmq';
import { Injectable } from '@nestjs/common';
import { type Queue } from 'bullmq';

export const DOCUMENT_INGESTION_QUEUE = 'document-ingestion';
export const INGEST_DOCUMENT_JOB = 'ingest-document';

export interface IngestDocumentJobData {
  tenantId: string;
  documentId: string;
}

@Injectable()
export class IngestionQueueService {
  constructor(
    @InjectQueue(DOCUMENT_INGESTION_QUEUE)
    private readonly queue: Queue<IngestDocumentJobData>,
  ) {}

  async enqueue(data: IngestDocumentJobData): Promise<void> {
    await this.queue.add(INGEST_DOCUMENT_JOB, data, {
      jobId: `tenant-ingestion-${data.tenantId}`,
      removeOnComplete: true,
      removeOnFail: false,
      attempts: 1,
    });
  }
}
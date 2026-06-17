import { InjectQueue } from '@nestjs/bullmq';
import { Injectable, Logger } from '@nestjs/common';
import { type Queue } from 'bullmq';


export const DOCUMENT_INGESTION_QUEUE = 'document-ingestion';
export const INGEST_DOCUMENT_JOB = 'ingest-document';

export interface IngestDocumentJobData {
    tenantId: string;
    documentId: string;
}

@Injectable()
export class IngestionQueueService {
    private readonly logger = new Logger(IngestionQueueService.name);

    constructor(
        @InjectQueue(DOCUMENT_INGESTION_QUEUE)
        private readonly queue: Queue<IngestDocumentJobData>,
    ) { }

    async enqueue(data: IngestDocumentJobData): Promise<void> {
        this.logger.log(
            `Enqueue ingestion job tenant=${data.tenantId} document=${data.documentId}`,
        );

        const job = await this.queue.add(INGEST_DOCUMENT_JOB, data, {
            jobId: `document-ingestion-${data.documentId}`,
            removeOnComplete: true,
            removeOnFail: false,
            attempts: 1,
        });

        this.logger.log(
            `Ingestion job queued id=${job.id} tenant=${data.tenantId} document=${data.documentId}`,
        );
    }
}
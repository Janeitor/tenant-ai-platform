import { Processor, WorkerHost } from '@nestjs/bullmq';
import { Injectable, Logger } from '@nestjs/common';
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
    private readonly logger = new Logger(IngestionProcessor.name);

    constructor(private readonly ingestionService: IngestionService) {
        super();
    }

    async process(job: Job<IngestDocumentJobData>): Promise<void> {
        this.logger.log(
            `Processing ingestion job id=${job.id} name=${job.name} tenant=${job.data.tenantId} document=${job.data.documentId}`,
        );

        if (job.name !== INGEST_DOCUMENT_JOB) {
            this.logger.warn(`Ignoring unknown ingestion job name=${job.name}`);
            return;
        }

        try {
            await this.ingestionService.processDocument(
                job.data.tenantId,
                job.data.documentId,
            );

            this.logger.log(
                `Finished ingestion job id=${job.id} document=${job.data.documentId}`,
            );
        } catch (error) {
            this.logger.error(
                `Failed ingestion job id=${job.id} document=${job.data.documentId}`,
                error instanceof Error ? error.stack : String(error),
            );

            throw error;
        }
    }
}
import {
  CreateBucketCommand,
  GetObjectCommand,
  HeadBucketCommand,
  PutObjectCommand,
  S3Client,
} from '@aws-sdk/client-s3';
import { Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { Readable } from 'node:stream';

import {
  type GetObjectInput,
  type GetObjectResult,
  type ObjectStoragePort,
  type PutObjectInput,
  type PutObjectResult,
} from './object-storage.types';

@Injectable()
export class S3StorageAdapter implements ObjectStoragePort {
  private readonly bucket: string;
  private readonly client: S3Client;

  constructor(configService: ConfigService) {
    this.bucket = configService.getOrThrow<string>('S3_BUCKET');

    this.client = new S3Client({
      endpoint: configService.getOrThrow<string>('S3_ENDPOINT'),
      region: configService.getOrThrow<string>('S3_REGION'),
      forcePathStyle: true,
      credentials: {
        accessKeyId: configService.getOrThrow<string>('S3_ACCESS_KEY'),
        secretAccessKey: configService.getOrThrow<string>('S3_SECRET_KEY'),
      },
    });
  }

  async putObject(input: PutObjectInput): Promise<PutObjectResult> {
    await this.ensureBucketExists();

    await this.client.send(
      new PutObjectCommand({
        Bucket: this.bucket,
        Key: input.key,
        Body: input.body,
        ContentType: input.contentType,
      }),
    );

    return {
      key: input.key,
      bucket: this.bucket,
    };
  }

  async getObject(input: GetObjectInput): Promise<GetObjectResult> {
    const response = await this.client.send(
      new GetObjectCommand({
        Bucket: this.bucket,
        Key: input.key,
      }),
    );

    if (!response.Body) {
      return {
        key: input.key,
        body: Buffer.alloc(0),
        contentType: response.ContentType ?? null,
      };
    }

    return {
      key: input.key,
      body: await this.readBody(response.Body),
      contentType: response.ContentType ?? null,
    };
  }

  private async ensureBucketExists(): Promise<void> {
    try {
      await this.client.send(
        new HeadBucketCommand({
          Bucket: this.bucket,
        }),
      );
    } catch (error) {
      if (!this.isMissingBucketError(error)) {
        throw error;
      }

      await this.client.send(
        new CreateBucketCommand({
          Bucket: this.bucket,
        }),
      );
    }
  }

  private async readBody(body: unknown): Promise<Buffer> {
    if (body instanceof Readable) {
      const chunks: Buffer[] = [];

      for await (const chunk of body) {
        chunks.push(Buffer.isBuffer(chunk) ? chunk : Buffer.from(chunk));
      }

      return Buffer.concat(chunks);
    }

    if (body instanceof Uint8Array) {
      return Buffer.from(body);
    }

    if (typeof body === 'string') {
      return Buffer.from(body);
    }

    return Buffer.alloc(0);
  }

  private isMissingBucketError(error: unknown): boolean {
    if (!(error instanceof Error)) {
      return false;
    }

    return error.name === 'NotFound' || error.name === 'NoSuchBucket';
  }
}
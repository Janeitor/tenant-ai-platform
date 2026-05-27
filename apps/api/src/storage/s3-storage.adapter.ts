import { PutObjectCommand, S3Client } from '@aws-sdk/client-s3';
import { Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';

import {
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
}
import { PutObjectCommand, S3Client } from '@aws-sdk/client-s3';

import { S3StorageAdapter } from './s3-storage.adapter';

jest.mock('@aws-sdk/client-s3', () => {
  const send = jest.fn();

  return {
    S3Client: jest.fn().mockImplementation(() => ({
      send,
    })),
    PutObjectCommand: jest.fn().mockImplementation((input: unknown) => ({
      input,
    })),
  };
});

describe('S3StorageAdapter', () => {
  const configService = {
    getOrThrow: jest.fn((key: string) => {
      const values: Record<string, string> = {
        S3_BUCKET: 'tenant-ai-documents',
        S3_ENDPOINT: 'http://localhost:9000',
        S3_REGION: 'us-east-1',
        S3_ACCESS_KEY: 'minioadmin',
        S3_SECRET_KEY: 'minioadmin',
      };

      return values[key];
    }),
  };

  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('uploads an object to S3-compatible storage', async () => {
    const adapter = new S3StorageAdapter(configService as never);
    const clientInstance = (S3Client as jest.Mock).mock.results[0].value;

    await expect(
      adapter.putObject({
        key: 'tenant_1/documents/document_1.pdf',
        body: Buffer.from('content'),
        contentType: 'application/pdf',
      }),
    ).resolves.toEqual({
      key: 'tenant_1/documents/document_1.pdf',
      bucket: 'tenant-ai-documents',
    });

    expect(PutObjectCommand).toHaveBeenCalledWith({
      Bucket: 'tenant-ai-documents',
      Key: 'tenant_1/documents/document_1.pdf',
      Body: Buffer.from('content'),
      ContentType: 'application/pdf',
    });

    expect(clientInstance.send).toHaveBeenCalledWith({
      input: {
        Bucket: 'tenant-ai-documents',
        Key: 'tenant_1/documents/document_1.pdf',
        Body: Buffer.from('content'),
        ContentType: 'application/pdf',
      },
    });
  });
});
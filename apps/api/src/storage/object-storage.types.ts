export interface PutObjectInput {
  key: string;
  body: Buffer;
  contentType: string;
}

export interface PutObjectResult {
  key: string;
  bucket: string;
}

export interface ObjectStoragePort {
  putObject(input: PutObjectInput): Promise<PutObjectResult>;
}
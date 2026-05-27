export interface PutObjectInput {
  key: string;
  body: Buffer;
  contentType: string;
}

export interface PutObjectResult {
  key: string;
  bucket: string;
}

export interface GetObjectInput {
  key: string;
}

export interface GetObjectResult {
  key: string;
  body: Buffer;
  contentType: string | null;
}

export interface ObjectStoragePort {
  putObject(input: PutObjectInput): Promise<PutObjectResult>;
  getObject(input: GetObjectInput): Promise<GetObjectResult>;
}
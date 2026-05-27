import { Module } from '@nestjs/common';

import { OBJECT_STORAGE } from './object-storage.service';
import { S3StorageAdapter } from './s3-storage.adapter';

@Module({
  providers: [
    S3StorageAdapter,
    {
      provide: OBJECT_STORAGE,
      useExisting: S3StorageAdapter,
    },
  ],
  exports: [OBJECT_STORAGE],
})
export class StorageModule {}
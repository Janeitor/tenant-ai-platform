import { BadRequestException } from '@nestjs/common';

import {
  isAllowedDocumentMimeType,
  MAX_DOCUMENT_UPLOAD_SIZE_BYTES,
} from './documents-upload.validation';

type MulterFileFilterCallback = (
  error: Error | null,
  acceptFile: boolean,
) => void;

type MulterFileMetadata = {
  mimetype: string;
};

export type UploadedDocumentFile = {
  originalname: string;
  mimetype: string;
  size: number;
  buffer: Buffer;
};

export const documentUploadOptions = {
  limits: {
    fileSize: MAX_DOCUMENT_UPLOAD_SIZE_BYTES,
  },
  fileFilter: (
    _request: unknown,
    file: MulterFileMetadata,
    callback: MulterFileFilterCallback,
  ): void => {
    if (!isAllowedDocumentMimeType(file.mimetype)) {
      callback(new BadRequestException('Unsupported document MIME type'), false);
      return;
    }

    callback(null, true);
  },
};

import { BadRequestException } from '@nestjs/common';
import { PDFParse } from 'pdf-parse';

import { DocumentTextExtractorService } from './document-text-extractor.service';

jest.mock('pdf-parse', () => ({
    PDFParse: jest.fn(),
}));

describe('DocumentTextExtractorService', () => {
    const mockedPDFParse = jest.mocked(PDFParse);

    beforeEach(() => {
        jest.clearAllMocks();
    });

    it('extracts text from plain text documents', async () => {
        const service = new DocumentTextExtractorService();

        await expect(
            service.extractText({
                body: Buffer.from('  Plain text content  '),
                mimeType: 'text/plain',
            }),
        ).resolves.toBe('Plain text content');
    });

    it('extracts selectable text from PDF documents', async () => {
        const getText = jest.fn().mockResolvedValue({
            text: '  PDF text content  ',
        });

        mockedPDFParse.mockImplementation(
            () =>
                ({
                    getText,
                }) as never,
        );

        const service = new DocumentTextExtractorService();

        await expect(
            service.extractText({
                body: Buffer.from('pdf bytes'),
                mimeType: 'application/pdf',
            }),
        ).resolves.toBe('PDF text content');

        expect(mockedPDFParse).toHaveBeenCalledWith({
            data: Buffer.from('pdf bytes'),
        });
        expect(getText).toHaveBeenCalledTimes(1);
    });

    it('rejects unsupported MIME types', async () => {
        const service = new DocumentTextExtractorService();

        await expect(
            service.extractText({
                body: Buffer.from('content'),
                mimeType: 'image/png',
            }),
        ).rejects.toBeInstanceOf(BadRequestException);
    });

    it('rejects documents without extractable text', async () => {
        const getText = jest.fn().mockResolvedValue({
            text: '   ',
        });

        mockedPDFParse.mockImplementation(
            () =>
                ({
                    getText,
                }) as never,
        );

        const service = new DocumentTextExtractorService();

        await expect(
            service.extractText({
                body: Buffer.from('pdf bytes'),
                mimeType: 'application/pdf',
            }),
        ).rejects.toBeInstanceOf(BadRequestException);
    });
});
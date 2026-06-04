import { BadRequestException, Injectable } from '@nestjs/common';
import { PDFParse } from 'pdf-parse';

@Injectable()
export class DocumentTextExtractorService {
    async extractText(input: {
        body: Buffer;
        mimeType: string;
    }): Promise<string> {
        if (input.mimeType === 'text/plain') {
            return this.normalizeExtractedText(input.body.toString('utf8'));
        }

        if (input.mimeType === 'application/pdf') {
            const parser = new PDFParse({
                data: input.body,
            });
            const parsedPdf = await parser.getText();

            return this.normalizeExtractedText(parsedPdf.text);
        }

        throw new BadRequestException('Unsupported document MIME type for ingestion');
    }

    private normalizeExtractedText(text: string): string {
        const normalizedText = text.trim();

        if (!normalizedText) {
            throw new BadRequestException('Document contains no extractable text');
        }

        return normalizedText;
    }
}
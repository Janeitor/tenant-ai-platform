import { Body, Controller, Post, Req, UseGuards } from '@nestjs/common';

import { ApiKeyAuthGuard } from '../auth/api-key-auth.guard';
import { type ApiKeyAuthenticatedRequest } from '../auth/api-key-authenticated-request';
import { type SearchDto } from './dto/search.dto';
import {
  RetrievalService,
  type SearchResponse,
} from './retrieval.service';

@Controller('retrieval')
@UseGuards(ApiKeyAuthGuard)
export class RetrievalController {
  constructor(private readonly retrievalService: RetrievalService) {}

  @Post('search')
  search(
    @Req() request: ApiKeyAuthenticatedRequest,
    @Body() searchDto: SearchDto,
  ): Promise<SearchResponse> {
    return this.retrievalService.search(request.apiKey.tenantId, searchDto);
  }
}
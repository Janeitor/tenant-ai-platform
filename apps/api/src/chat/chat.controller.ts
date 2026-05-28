import { Body, Controller, Post, Req, UseGuards } from '@nestjs/common';

import { ApiKeyAuthGuard } from '../auth/api-key-auth.guard';
import { type ApiKeyAuthenticatedRequest } from '../auth/api-key-authenticated-request';
import { ChatService, type AskResponse } from './chat.service';
import { AskDto } from './dto/ask.dto';

@Controller('ask')
@UseGuards(ApiKeyAuthGuard)
export class ChatController {
  constructor(private readonly chatService: ChatService) {}

  @Post()
  ask(
    @Req() request: ApiKeyAuthenticatedRequest,
    @Body() askDto: AskDto,
  ): Promise<AskResponse> {
    return this.chatService.ask(request.apiKey.tenantId, askDto);
  }
}

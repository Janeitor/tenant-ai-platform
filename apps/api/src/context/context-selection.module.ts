import { Module } from '@nestjs/common';

import { ContextSelectionService } from './context-selection.service';

@Module({
  providers: [ContextSelectionService],
  exports: [ContextSelectionService],
})
export class ContextSelectionModule {}
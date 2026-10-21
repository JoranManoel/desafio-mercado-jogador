import {
  Controller,
  Get,
  Header,
  Param,
} from '@nestjs/common';

import { TransactionsService } from './transactions.service';

@Controller('clubs')
export class TransactionsController {
  constructor(
    private readonly transactionsService:
      TransactionsService,
  ) {}

  @Get(':id/transactions/summary')
  getSummary(@Param('id') id: string) {
    return this.transactionsService.getSummary(id);
  }

  @Get(':id/transactions/export')
  @Header(
    'Content-Type',
    'text/csv; charset=utf-8',
  )
  @Header(
    'Content-Disposition',
    'attachment; filename="transactions.csv"',
  )
  exportCsv(@Param('id') id: string) {
    return this.transactionsService.exportCsv(id);
  }

  @Get(':id/transactions')
  findAll(@Param('id') id: string) {
    return this.transactionsService.findAll(id);
  }
}
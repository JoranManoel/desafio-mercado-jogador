import {
  Controller,
  Get,
  Param,
  Query,
  Res,
} from '@nestjs/common';
import type { Response } from 'express';

import { TransactionsService } from './transactions.service';

@Controller('clubs')
export class TransactionsController {
  constructor(
    private readonly transactionsService: TransactionsService,
  ) {}

  @Get(':id/transactions/export')
  async exportCsv(
    @Param('id') id: string,
    @Query('type') type?: string,
    @Query('player_id') playerId?: string,
    @Res() response?: Response,
  ) {
    const csv = await this.transactionsService.exportCsv(
      id,
      type,
      playerId,
    );

    response!
      .setHeader('Content-Type', 'text/csv; charset=utf-8')
      .send(csv);
  }

  @Get(':id/transactions')
  findAll(
    @Param('id') id: string,
    @Query('type') type?: string,
    @Query('player_id') playerId?: string,
  ) {
    return this.transactionsService.findAll(id, type, playerId);
  }
}
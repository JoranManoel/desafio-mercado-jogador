import { Body, Controller, Get, HttpCode, HttpStatus, Param, Post, } from '@nestjs/common';

import { BuyPlayerDto } from './dto/buy-player.dto';
import { MarketService } from './market.service';

@Controller('players')
export class MarketController {
  constructor(
    private readonly marketService: MarketService,
  ) { }

  @Post(':id/buy')
  @HttpCode(HttpStatus.OK)
  buy(@Param('id') id: string, @Body() dto: BuyPlayerDto) {
    return this.marketService.buy(id, dto);
  }

  @Get(':id/sell-preview')
  sellPreview(@Param('id') id: string) {
    return this.marketService.sellPreview(id);
  }

  @Post(':id/sell')
  @HttpCode(HttpStatus.OK)
  sell(@Param('id') id: string) {
    return this.marketService.sell(id);
  }
}
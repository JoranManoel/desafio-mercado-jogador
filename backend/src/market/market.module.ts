import { Module } from '@nestjs/common';

import { PrismaModule } from '../prisma/prisma.module';
import { MarketController } from './market.controller';
import { MarketService } from './market.service';

@Module({
  imports: [PrismaModule],
  controllers: [MarketController],
  providers: [MarketService],
})
export class MarketModule {}
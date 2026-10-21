import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';

import { PrismaModule } from './prisma/prisma.module';
import { PlayersModule } from './players/players.module';
import { ClubsModule } from './clubs/clubs.module';
import { MarketModule } from './market/market.module';
import { TransactionsModule } from './transactions/transactions.module';
import { LineupModule } from './lineup/lineup.module';

@Module({
  imports: [
    ConfigModule.forRoot({
      isGlobal: true,
    }),
    PrismaModule,
    PlayersModule,
    ClubsModule,
    MarketModule,
    TransactionsModule,
    LineupModule
  ],
})
export class AppModule {}
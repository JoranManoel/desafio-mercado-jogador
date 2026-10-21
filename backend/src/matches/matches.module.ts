import { Module } from '@nestjs/common';

import { PrismaModule } from '../prisma/prisma.module';
import { MatchesController } from './matches.controller';
import { MatchesService } from './matches.service';
import { StandingsController } from './standings.controller';
import { StandingsService } from './standings.service';

@Module({
  imports: [PrismaModule],
  controllers: [
    MatchesController,
    StandingsController,
  ],
  providers: [
    MatchesService,
    StandingsService,
  ],
})
export class MatchesModule {}
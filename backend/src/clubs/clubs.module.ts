import { Module } from '@nestjs/common';

import { PrismaModule } from '../prisma/prisma.module';
import { PlayersModule } from '../players/players.module';
import { ClubsController } from './clubs.controller';
import { ClubsService } from './clubs.service';

@Module({
  imports: [PrismaModule, PlayersModule],
  controllers: [ClubsController],
  providers: [ClubsService],
})
export class ClubsModule {}
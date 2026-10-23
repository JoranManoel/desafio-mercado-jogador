import { Module } from '@nestjs/common';
import { LineupService } from './lineup.service';
import { LineupController } from './lineup.controller';
import { PrismaModule } from '../prisma/prisma.module';
import { PlayersModule } from '../players/players.module';

@Module({
  imports: [PrismaModule, PlayersModule],
  controllers: [LineupController],
  providers: [LineupService],
})
export class LineupModule {}

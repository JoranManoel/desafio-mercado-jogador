import { Module } from '@nestjs/common';
import { LineupService } from './lineup.service';
import { LineupController } from './lineup.controller';
import { PrismaModule } from '../prisma/prisma.module';

@Module({
  imports: [PrismaModule],
  controllers: [LineupController],
  providers: [LineupService],
})
export class LineupModule {}

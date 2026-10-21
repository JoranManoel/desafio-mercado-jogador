import {
  Body,
  Controller,
  Get,
  Param,
  Put,
} from '@nestjs/common';

import { LineupService } from './lineup.service';
import { UpdateLineupDto } from './dto/update-lineup.dto';

@Controller('clubs')
export class LineupController {
  constructor(private readonly lineupService: LineupService) {}

  @Get(':id/lineup')
  findOne(@Param('id') id: string) {
    return this.lineupService.findOne(id);
  }

  @Put(':id/lineup')
  update(
    @Param('id') id: string,
    @Body() dto: UpdateLineupDto,
  ) {
    return this.lineupService.update(id, dto);
  }
}
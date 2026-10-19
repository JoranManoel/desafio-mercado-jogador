import {
  Body,
  Controller,
  Get,
  Param,
  Patch,
  Post,
  Put,
  Res,
} from '@nestjs/common';
import type { Response } from 'express';

import { CreatePlayerDto } from './dto/create-player.dto';
import { PlayersService } from './players.service';
import { UpdatePlayerDto } from './dto/update-player.dto';
import { UpdatePlayerConditionDto } from './dto/update-player-condition.dto';

@Controller('players')
export class PlayersController {
  constructor(private readonly playersService: PlayersService) { }

  @Post()
  async create(
    @Body() dto: CreatePlayerDto,
    @Res({ passthrough: true }) response: Response,
  ) {
    const player = await this.playersService.create(dto);

    response.setHeader(
      'Location',
      `/api/v1/players/${player.id}`,
    );

    return player;
  }

  @Get(':id')
  findOne(@Param('id') id: string) {
    return this.playersService.findOne(id);
  }

  @Put(':id')
  update(@Param('id') id: string, @Body() dto: UpdatePlayerDto) {
    return this.playersService.update(id, dto);
  }

  @Patch(':id/condition')
  updateCondition(
    @Param('id') id: string,
    @Body() dto: UpdatePlayerConditionDto,
  ) {
    return this.playersService.updateCondition(id, dto);
  }
}
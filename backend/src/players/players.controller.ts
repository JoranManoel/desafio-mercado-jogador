import {
  Body,
  Controller,
  Get,
  Param,
  Post,
  Res,
} from '@nestjs/common';
import type { Response } from 'express';

import { CreatePlayerDto } from './dto/create-player.dto';
import { PlayersService } from './players.service';

@Controller('players')
export class PlayersController {
  constructor(private readonly playersService: PlayersService) {}

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
}
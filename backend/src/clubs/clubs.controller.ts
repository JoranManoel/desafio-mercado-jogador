import {
  Body,
  Controller,
  Get,
  Param,
  Post,
  Query,
  Res,
} from '@nestjs/common';
import type { Response } from 'express';

import { ClubsService } from './clubs.service';
import { CreateClubDto } from './dto/create-club.dto';

@Controller('clubs')
export class ClubsController {
  constructor(private readonly clubsService: ClubsService) {}

  @Post()
  async create(
    @Body() dto: CreateClubDto,
    @Res({ passthrough: true }) response: Response,
  ) {
    const club = await this.clubsService.create(dto);

    response.setHeader('Location', `/api/v1/clubs/${club.id}`);

    return club;
  }

  @Get()
  findAll(@Query('sort') sort?: string) {
    return this.clubsService.findAll(sort);
  }

  @Get(':id')
  findOne(@Param('id') id: string) {
    return this.clubsService.findOne(id);
  }
}
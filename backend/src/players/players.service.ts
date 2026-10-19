import {
  BadRequestException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';

import { PrismaService } from '../prisma/prisma.service';
import {
  calculateBaseValueCents,
  calculateMarketValueCents,
  calculateOverall,
  formatMoney,
  moneyToCents,
} from './domain/player-calculation';
import type {
  PlayerAttributes,
  PlayerCondition,
  PlayerPosition,
} from './domain/player-calculation';
import { CreatePlayerDto } from './dto/create-player.dto';

@Injectable()
export class PlayersService {
  constructor(private readonly prisma: PrismaService) {}

  async create(dto: CreatePlayerDto) {
    this.validateCrossFieldRules(dto);

    const attributes: PlayerAttributes = {
      pace: dto.pace,
      shooting: dto.shooting,
      passing: dto.passing,
      dribbling: dto.dribbling,
      defending: dto.defending,
      physical: dto.physical,
    };

    const overall = calculateOverall(dto.position, attributes);

    const baseValueCents = calculateBaseValueCents(
      overall,
      dto.potential,
      dto.age,
    );

    const player = await this.prisma.player.create({
      data: {
        name: dto.name,
        position: dto.position,
        agility: dto.agility,
        age: dto.age,
        baseValue: formatMoney(baseValueCents),
        condition: 'APTO',
        clubId: null,
        pace: dto.pace,
        shooting: dto.shooting,
        passing: dto.passing,
        dribbling: dto.dribbling,
        defending: dto.defending,
        physical: dto.physical,
        potential: dto.potential,
      },
    });

    return this.toApiResponse(player);
  }

  async findOne(rawId: string) {
    const id = this.parseCanonicalId(rawId);

    const player = await this.prisma.player.findFirst({
      where: {
        id,
        deletedAt: null,
      },
    });

    if (!player) {
      throw new NotFoundException('Jogador não encontrado.');
    }

    return this.toApiResponse(player);
  }

  private validateCrossFieldRules(dto: CreatePlayerDto): void {
    const attributes = [
      dto.pace,
      dto.shooting,
      dto.passing,
      dto.dribbling,
      dto.defending,
      dto.physical,
    ];

    const maxAttribute = Math.max(...attributes);
    const sumAttributes = attributes.reduce(
      (total, value) => total + value,
      0,
    );

    if (dto.age >= 35 && dto.agility > 85) {
      throw new BadRequestException(
        'Agilidade máxima para jogadores com 35 anos ou mais é 85.',
      );
    }

    if (sumAttributes > 480) {
      throw new BadRequestException(
        'A soma dos seis atributos não pode ultrapassar 480.',
      );
    }

    if (dto.potential < maxAttribute) {
      throw new BadRequestException(
        'O potencial deve ser maior ou igual ao maior atributo.',
      );
    }

    if (dto.age >= 33 && dto.potential !== maxAttribute) {
      throw new BadRequestException(
        'Para jogadores com 33 anos ou mais, o potencial deve ser igual ao maior atributo.',
      );
    }
  }

  private parseCanonicalId(rawId: string): number {
    if (!/^[1-9]\d*$/.test(rawId)) {
      throw new NotFoundException('Jogador não encontrado.');
    }

    const id = Number(rawId);

    if (!Number.isSafeInteger(id) || id > 2147483647) {
      throw new NotFoundException('Jogador não encontrado.');
    }

    return id;
  }

  private toApiResponse(player: {
    id: number;
    name: string;
    position: string;
    agility: number;
    age: number;
    condition: string;
    baseValue: { toFixed(decimalPlaces?: number): string };
    clubId: number | null;
    pace: number;
    shooting: number;
    passing: number;
    dribbling: number;
    defending: number;
    physical: number;
    potential: number;
  }) {
    const baseValueCents = moneyToCents(
      player.baseValue.toFixed(2),
    );

    const marketValueCents = calculateMarketValueCents(
      baseValueCents,
      player.condition as PlayerCondition,
      player.agility,
      player.age,
    );

    const attributes: PlayerAttributes = {
      pace: player.pace,
      shooting: player.shooting,
      passing: player.passing,
      dribbling: player.dribbling,
      defending: player.defending,
      physical: player.physical,
    };

    return {
      id: player.id,
      name: player.name,
      position: player.position,
      agility: player.agility,
      age: player.age,
      condition: player.condition,
      base_value: Number(formatMoney(baseValueCents)),
      market_value: Number(formatMoney(marketValueCents)),
      pace: player.pace,
      shooting: player.shooting,
      passing: player.passing,
      dribbling: player.dribbling,
      defending: player.defending,
      physical: player.physical,
      potential: player.potential,
      overall: calculateOverall(
        player.position as PlayerPosition,
        attributes,
      ),
      club_id: player.clubId,
    };
  }
}
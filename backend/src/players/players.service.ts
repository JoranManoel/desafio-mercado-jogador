import {
  BadRequestException,
  ConflictException,
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
import { UpdatePlayerDto } from './dto/update-player.dto';
import { UpdatePlayerConditionDto } from './dto/update-player-condition.dto';

@Injectable()
export class PlayersService {
  constructor(private readonly prisma: PrismaService) { }

  private async findActivePlayerOrThrow(id: number) {
    const player = await this.prisma.player.findFirst({
      where: {
        id,
        deletedAt: null,
      },
    });

    if (!player) {
      throw new NotFoundException('Jogador não encontrado.');
    }

    return player;
  }

  private validateAgeAndAgility(
    age: number,
    agility: number,
  ): void {
    if (age >= 35 && agility > 85) {
      throw new BadRequestException(
        'Agilidade máxima para jogadores com 35 anos ou mais é 85.',
      );
    }
  }

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

    const player = await this.findActivePlayerOrThrow(id);

    return this.toApiResponse(player);
  }

  async update(rawId: string, dto: UpdatePlayerDto) {
    const id = this.parseCanonicalId(rawId);

    const current = await this.findActivePlayerOrThrow(id)

    // Validações que dependem de mais de um campo.
    this.validateAgeAndAgility(dto.age, dto.agility)

    // Um jogador vinculado a clube não pode mudar de posição.
    if (
      current.clubId !== null &&
      current.position !== dto.position
    ) {
      throw new ConflictException(
        'Não é possível mudar a posição de um jogador que pertence a um clube.',
      );
    }

    // A idade nunca pode diminuir.
    if (dto.age < current.age) {
      throw new ConflictException(
        'A idade do jogador não pode ser reduzida.',
      );
    }

    const updated = await this.prisma.player.update({
      where: { id },
      data: {
        name: dto.name,
        position: dto.position,
        agility: dto.agility,
        age: dto.age,
      },
    });

    return this.toApiResponse(updated);
  }

  async updateCondition(rawId: string, dto: UpdatePlayerConditionDto) {
    const id = this.parseCanonicalId(rawId);

    const current = await this.findActivePlayerOrThrow(id);
    const condition = dto.condition;

    // Reenviar a condição atual é permitido.
    if (current.condition === condition) {
      return this.toApiResponse(current);
    }

    // Não permite a transição direta de DOENTE para APTO.
    if (
      current.condition === 'DOENTE' &&
      condition === 'APTO'
    ) {
      throw new ConflictException(
        'Um jogador DOENTE não pode passar diretamente para APTO.',
      );
    }

    const updated = await this.prisma.$transaction(async (tx) => {
      const player = await tx.player.update({
        where: { id },
        data: { condition },
      });

      // Se ficar DOENTE, remove sua titularidade atomicamente.
      if (condition === 'DOENTE') {
        await tx.lineup.deleteMany({
          where: { playerId: id },
        });
      }

      return player;
    });

    return this.toApiResponse(updated);
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

    this.validateAgeAndAgility(dto.age, dto.agility)

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
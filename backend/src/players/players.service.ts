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
import { ListPlayersQueryDto } from './dto/list-players-query';
import { normalizeSearchText } from '../common/utils/normalize-search-text';

@Injectable()
export class PlayersService {
  constructor(private readonly prisma: PrismaService) { }

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

  async findAll(query: ListPlayersQueryDto) {
    const page = this.parseIntegerQuery(
      query.page,
      'page',
      1,
      2147483647,
    ) ?? 1;

    const limit = this.parseIntegerQuery(
      query.limit,
      'limit',
      1,
      100,
    ) ?? 10;

    let search: string | undefined;

    if (query.search !== undefined) {
      if (/[\p{Cc}\p{Cf}]/u.test(query.search)) {
        throw new BadRequestException(
          'O parâmetro search contém caracteres inválidos.',
        );
      }

      search = normalizeSearchText(query.search);

      if (!search) {
        throw new BadRequestException(
          'O parâmetro search não pode ser vazio.',
        );
      }
    }

    const validPositions = ['GOL', 'ZAG', 'LAT', 'MEI', 'ATA'];
    const validConditions = [
      'APTO',
      'MAL_CONDICIONADO',
      'DOENTE',
    ];

    if (
      query.position !== undefined &&
      !validPositions.includes(query.position)
    ) {
      throw new BadRequestException('position inválido.');
    }

    if (
      query.condition !== undefined &&
      !validConditions.includes(query.condition)
    ) {
      throw new BadRequestException('condition inválido.');
    }

    let free: boolean | undefined;

    if (query.free !== undefined) {
      if (query.free !== 'true' && query.free !== 'false') {
        throw new BadRequestException(
          'free deve ser exatamente true ou false.',
        );
      }

      free = query.free === 'true';
    }

    const clubId = this.parseIntegerQuery(
      query.club_id,
      'club_id',
      1,
      2147483647,
    );

    if (free === true && clubId !== undefined) {
      throw new BadRequestException(
        'Os filtros free=true e club_id não podem ser combinados.',
      );
    }

    if (clubId !== undefined) {
      const club = await this.prisma.club.findUnique({
        where: { id: clubId },
        select: { id: true },
      });

      if (!club) {
        throw new NotFoundException('Clube não encontrado.');
      }
    }

    const minAge = this.parseIntegerQuery(
      query.min_age,
      'min_age',
      0,
      2147483647,
    );

    const maxAge = this.parseIntegerQuery(
      query.max_age,
      'max_age',
      0,
      2147483647,
    );

    const minValueCents = this.parseMoneyQuery(
      query.min_value,
      'min_value',
    );

    const maxValueCents = this.parseMoneyQuery(
      query.max_value,
      'max_value',
    );

    if (
      minAge !== undefined &&
      maxAge !== undefined &&
      minAge > maxAge
    ) {
      throw new BadRequestException(
        'min_age não pode ser maior que max_age.',
      );
    }

    if (
      minValueCents !== undefined &&
      maxValueCents !== undefined &&
      minValueCents > maxValueCents
    ) {
      throw new BadRequestException(
        'min_value não pode ser maior que max_value.',
      );
    }

    const allowedSorts = [
      'name_asc',
      'name_desc',
      'value_asc',
      'value_desc',
      'age_asc',
      'age_desc',
      'position_asc',
      'position_desc',
    ];

    const sort = query.sort ?? 'name_asc';

    if (!allowedSorts.includes(sort)) {
      throw new BadRequestException('sort inválido.');
    }

    // Buscamos somente jogadores ativos. Os cálculos de mercado
    // são feitos antes dos filtros e da paginação.
    const players = await this.prisma.player.findMany({
      where: { deletedAt: null },
    });

    const positionOrder: Record<string, number> = {
      GOL: 0,
      ZAG: 1,
      LAT: 2,
      MEI: 3,
      ATA: 4,
    };

    let filtered = players.map((player) => {
      const response = this.toApiResponse(player);

      return {
        response,
        id: player.id,
        nameKey: normalizeSearchText(player.name),
        position: player.position,
        age: player.age,
        condition: player.condition,
        clubId: player.clubId,
        marketValueCents: moneyToCents(
          response.market_value.toFixed(2),
        ),
      };
    });

    if (search !== undefined) {
      filtered = filtered.filter((item) =>
        item.nameKey.includes(search!),
      );
    }

    if (query.position !== undefined) {
      filtered = filtered.filter(
        (item) => item.position === query.position,
      );
    }

    if (query.condition !== undefined) {
      filtered = filtered.filter(
        (item) => item.condition === query.condition,
      );
    }

    if (free !== undefined) {
      filtered = filtered.filter((item) =>
        free ? item.clubId === null : item.clubId !== null,
      );
    }

    if (clubId !== undefined) {
      filtered = filtered.filter(
        (item) => item.clubId === clubId,
      );
    }

    if (minAge !== undefined) {
      filtered = filtered.filter((item) => item.age >= minAge);
    }

    if (maxAge !== undefined) {
      filtered = filtered.filter((item) => item.age <= maxAge);
    }

    if (minValueCents !== undefined) {
      filtered = filtered.filter(
        (item) => item.marketValueCents >= minValueCents,
      );
    }

    if (maxValueCents !== undefined) {
      filtered = filtered.filter(
        (item) => item.marketValueCents <= maxValueCents,
      );
    }

    const compareText = (a: string, b: string): number =>
      a < b ? -1 : a > b ? 1 : 0;

    filtered.sort((a, b) => {
      let comparison = 0;

      switch (sort) {
        case 'name_asc':
        case 'name_desc':
          comparison = compareText(a.nameKey, b.nameKey);

          if (sort === 'name_desc') {
            comparison *= -1;
          }
          break;

        case 'value_asc':
        case 'value_desc':
          comparison =
            a.marketValueCents - b.marketValueCents;

          if (sort === 'value_desc') {
            comparison *= -1;
          }
          break;

        case 'age_asc':
        case 'age_desc':
          comparison = a.age - b.age;

          if (sort === 'age_desc') {
            comparison *= -1;
          }
          break;

        case 'position_asc':
        case 'position_desc':
          comparison =
            positionOrder[a.position] -
            positionOrder[b.position];

          if (sort === 'position_desc') {
            comparison *= -1;
          }
          break;
      }

      // Empates nas ordenações sempre são resolvidos por nome
      // normalizado e, depois, pelo ID crescente.
      if (comparison !== 0) {
        return comparison;
      }

      const nameComparison = compareText(a.nameKey, b.nameKey);

      return nameComparison !== 0
        ? nameComparison
        : a.id - b.id;
    });

    const totalItems = filtered.length;
    const totalPages =
      totalItems === 0 ? 0 : Math.ceil(totalItems / limit);

    const offset = (page - 1) * limit;

    const data = filtered
      .slice(offset, offset + limit)
      .map((item) => item.response);

    return {
      data,
      meta: {
        page,
        limit,
        total_items: totalItems,
        total_pages: totalPages,
      },
    };
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

  async remove(rawId: string): Promise<void> {
    const id = this.parseCanonicalId(rawId);
    const player = await this.findActivePlayerOrThrow(id);

    if (player.clubId !== null) {
      throw new ConflictException(
        'Não é possível excluir um jogador vinculado a um clube.',
      );
    }

    await this.prisma.player.update({
      where: { id },
      data: {
        deletedAt: new Date(),
      },
    });
  }


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

  toApiResponse(player: {
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

  private parseIntegerQuery(
    value: string | undefined,
    field: string,
    minimum: number,
    maximum: number,
  ): number | undefined {
    if (value === undefined) {
      return undefined;
    }

    if (!/^(0|[1-9]\d*)$/.test(value)) {
      throw new BadRequestException(
        `${field} deve ser um número inteiro válido.`,
      );
    }

    const number = Number(value);

    if (
      !Number.isSafeInteger(number) ||
      number < minimum ||
      number > maximum
    ) {
      throw new BadRequestException(
        `${field} está fora do limite permitido.`,
      );
    }

    return number;
  }

  private parseMoneyQuery(
    value: string | undefined,
    field: string,
  ): number | undefined {
    if (value === undefined) {
      return undefined;
    }

    if (!/^(0|[1-9]\d*)(?:\.\d{1,2})?$/.test(value)) {
      throw new BadRequestException(
        `${field} deve ser um valor monetário válido, com até duas casas decimais.`,
      );
    }

    const cents = moneyToCents(value);

    if (!Number.isSafeInteger(cents)) {
      throw new BadRequestException(
        `${field} está fora do limite permitido.`,
      );
    }

    return cents;
  }
}
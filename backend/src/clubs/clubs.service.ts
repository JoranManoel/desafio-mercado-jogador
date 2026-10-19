import {
  BadRequestException,
  ConflictException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';

import { PrismaService } from '../prisma/prisma.service';
import { PlayersService } from '../players/players.service';
import { CreateClubDto } from './dto/create-club.dto';
import { normalizeSearchText } from '../common/utils/normalize-search-text';
import { normalizeClubNameKey } from './utils/normalize-club-name';

import {
  calculateMarketValueCents,
  formatMoney,
  moneyToCents,
} from '../players/domain/player-calculation';

import type { PlayerCondition } from '../players/domain/player-calculation';

type DecimalLike = {
  toFixed(decimalPlaces?: number): string;
};

type ClubWithPlayers = {
  id: number;
  name: string;
  acronym: string;
  cash: DecimalLike;
  players: Array<{
    id: number;
    name: string;
    position: string;
    age: number;
    agility: number;
    condition: string;
    baseValue: DecimalLike;
  }>;
};

type ClubSummary = {
  id: number;
  name: string;
  acronym: string;
  cash: number;
  squad_value: number;
  net_worth: number;
  nameKey: string;
  netWorthCents: number;
};

@Injectable()
export class ClubsService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly playersService: PlayersService,
  ) {}

  async create(dto: CreateClubDto) {
    const name = dto.name.normalize('NFC');
    this.validateNameWords(name);
    this.validateAcronym(name, dto.acronym);

    const nameNormalized = normalizeClubNameKey(name);

    try {
      return await this.prisma.$transaction(async (tx) => {
        const count = await tx.club.count();

        if (count >= 20) {
          throw new ConflictException(
            'O limite de 20 clubes foi atingido.',
          );
        }

        const existing = await tx.club.findFirst({
          where: {
            OR: [
              { nameNormalized },
              { acronym: dto.acronym },
            ],
          },
        });

        if (existing) {
          throw new ConflictException(
            'O nome ou a sigla já estão cadastrados.',
          );
        }

        const club = await tx.club.create({
          data: {
            name,
            nameNormalized,
            acronym: dto.acronym,
          },
        });

        const cash = Number(club.cash.toFixed(2));

        return {
          id: club.id,
          name: club.name,
          acronym: club.acronym,
          cash,
          squad_value: 0,
          net_worth: cash,
        };
      });
    } catch (error: unknown) {
      // A restrição UNIQUE do banco também protege contra
      // duplicidade em requisições concorrentes.
      if (this.isUniqueConstraintError(error)) {
        throw new ConflictException(
          'O nome ou a sigla já estão cadastrados.',
        );
      }

      throw error;
    }
  }

  async findAll(sort?: string) {
    const selectedSort = sort ?? 'name_asc';

    // Mantemos estas opções explícitas. Confirmaremos os enums
    // definitivos com a seção oficial de query params do enunciado.
    const allowedSorts = [
      'name',
      'name_asc',
      'net_worth',
      'net_worth_desc',
    ];

    if (!allowedSorts.includes(selectedSort)) {
      throw new BadRequestException('Parâmetro sort inválido.');
    }

    const clubs = await this.prisma.club.findMany({
      include: {
        players: {
          where: { deletedAt: null },
        },
      },
    });

    const summaries = clubs.map((club) =>
      this.buildSummary(club),
    );

    const sortByNetWorth =
      selectedSort === 'net_worth' ||
      selectedSort === 'net_worth_desc';

    summaries.sort((a, b) => {
      if (sortByNetWorth) {
        const difference = b.netWorthCents - a.netWorthCents;

        if (difference !== 0) {
          return difference;
        }
      }

      if (a.nameKey < b.nameKey) return -1;
      if (a.nameKey > b.nameKey) return 1;

      return a.id - b.id;
    });

    return summaries.map((summary) =>
      this.toPublicSummary(summary),
    );
  }

  async findOne(rawId: string) {
    const id = this.parseCanonicalId(rawId);

    const club = await this.prisma.club.findUnique({
      where: { id },
      include: {
        players: {
          where: { deletedAt: null },
          include: {
            contracts: {
              where: {
                status: 'ATIVO',
                clubId: id,
              },
            },
          },
        },
      },
    });

    if (!club) {
      throw new NotFoundException('Clube não encontrado.');
    }

    const summary = this.buildSummary(club);
    const now = Date.now();

    const positionOrder: Record<string, number> = {
      GOL: 0,
      ZAG: 1,
      LAT: 2,
      MEI: 3,
      ATA: 4,
    };

    const players = club.players
      .map((player) => {
        const contract = player.contracts[0];

        let contractResponse = null;

        if (contract) {
          const remainingDays = Math.max(
            0,
            Math.ceil(
              (contract.loyaltyUntil.getTime() - now) /
                86_400_000,
            ),
          );

          const penaltyRate =
            remainingDays === 0
              ? 0
              : remainingDays <= 30
                ? 5
                : remainingDays <= 180
                  ? 10
                  : 20;

          contractResponse = {
            purchase_value: Number(
              contract.purchaseValue.toFixed(2),
            ),
            loyalty_until: this.formatBrasiliaTimestamp(
              contract.loyaltyUntil,
            ),
            remaining_days: remainingDays,
            penalty_rate: penaltyRate,
          };
        }

        return {
          id: player.id,
          position: player.position,
          nameKey: normalizeSearchText(player.name),
          response: {
            ...this.playersService.toApiResponse(player),
            contract: contractResponse,
          },
        };
      })
      .sort((a, b) => {
        const positionDifference =
          positionOrder[a.position] - positionOrder[b.position];

        if (positionDifference !== 0) {
          return positionDifference;
        }

        if (a.nameKey < b.nameKey) return -1;
        if (a.nameKey > b.nameKey) return 1;

        return a.id - b.id;
      })
      .map((item) => item.response);

    return {
      ...this.toPublicSummary(summary),
      players,
    };
  }

  private buildSummary(club: ClubWithPlayers): ClubSummary {
    const cashCents = moneyToCents(club.cash.toFixed(2));

    const squadValueCents = club.players.reduce(
      (total, player) => {
        const baseValueCents = moneyToCents(
          player.baseValue.toFixed(2),
        );

        const marketValueCents = calculateMarketValueCents(
          baseValueCents,
          player.condition as PlayerCondition,
          player.agility,
          player.age,
        );

        return total + marketValueCents;
      },
      0,
    );

    return {
      id: club.id,
      name: club.name,
      acronym: club.acronym,
      cash: Number(formatMoney(cashCents)),
      squad_value: Number(formatMoney(squadValueCents)),
      net_worth: Number(
        formatMoney(cashCents + squadValueCents),
      ),
      nameKey: normalizeSearchText(club.name),
      netWorthCents: cashCents + squadValueCents,
    };
  }

  private toPublicSummary(summary: ClubSummary) {
    return {
      id: summary.id,
      name: summary.name,
      acronym: summary.acronym,
      cash: summary.cash,
      squad_value: summary.squad_value,
      net_worth: summary.net_worth,
    };
  }

  private validateNameWords(name: string): void {
    const words = name.split(' ');

    if (
      words.length < 2 ||
      words.length > 5 ||
      words.some((word) => !/\p{L}/u.test(word))
    ) {
      throw new BadRequestException(
        'O nome do clube deve conter de duas a cinco palavras.',
      );
    }
  }

  private validateAcronym(
    name: string,
    acronym: string,
  ): void {
    const foldedName = name
      .normalize('NFD')
      .replace(/\p{M}/gu, '')
      .toUpperCase();

    const letters = foldedName.match(/[A-Z]/g) ?? [];

    if (
      letters.length === 0 ||
      acronym[0] !== letters[0] ||
      new Set(acronym).size === 1
    ) {
      throw new BadRequestException(
        'A sigla deve começar com a primeira letra do nome, conter letras do nome em ordem e não pode repetir uma única letra.',
      );
    }

    let searchFrom = 0;

    for (const letter of acronym) {
      const index = foldedName.indexOf(letter, searchFrom);

      if (index === -1) {
        throw new BadRequestException(
          'As letras da sigla devem aparecer no nome do clube em ordem.',
        );
      }

      searchFrom = index + 1;
    }
  }

  private parseCanonicalId(rawId: string): number {
    if (!/^[1-9]\d*$/.test(rawId)) {
      throw new NotFoundException('Clube não encontrado.');
    }

    const id = Number(rawId);

    if (!Number.isSafeInteger(id) || id > 2147483647) {
      throw new NotFoundException('Clube não encontrado.');
    }

    return id;
  }

  private formatBrasiliaTimestamp(date: Date): string {
    const parts = new Intl.DateTimeFormat('en-CA', {
      timeZone: 'America/Recife',
      year: 'numeric',
      month: '2-digit',
      day: '2-digit',
      hour: '2-digit',
      minute: '2-digit',
      second: '2-digit',
      hourCycle: 'h23',
    }).formatToParts(date);

    const get = (type: string) =>
      parts.find((part) => part.type === type)?.value ?? '';

    return `${get('year')}-${get('month')}-${get('day')}T${get('hour')}:${get('minute')}:${get('second')}-03:00`;
  }

  private isUniqueConstraintError(error: unknown): boolean {
    return (
      typeof error === 'object' &&
      error !== null &&
      'code' in error &&
      (error as { code?: unknown }).code === 'P2002'
    );
  }
}
import {
  BadRequestException,
  ConflictException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';

import { PrismaService } from '../prisma/prisma.service';
import {
  calculateMarketValueCents,
  formatMoney,
  moneyToCents,
} from '../players/domain/player-calculation';
import type { PlayerCondition } from '../players/domain/player-calculation';
import { BuyPlayerDto } from './dto/buy-player.dto';

const DAY_MS = 24 * 60 * 60 * 1000;

@Injectable()
export class MarketService {
  constructor(private readonly prisma: PrismaService) {}

  async buy(rawPlayerId: string, dto: BuyPlayerDto) {
    const playerId = this.parseCanonicalId(rawPlayerId);

    const loyaltyUntil = this.parseBrasiliaDate(
      dto.loyalty_until,
    );

    const now = new Date();

    if (loyaltyUntil.getTime() <= now.getTime()) {
      throw new BadRequestException(
        'O fim da fidelidade deve ser uma data futura.',
      );
    }

    if (
      loyaltyUntil.getTime() >
      now.getTime() + 1095 * DAY_MS
    ) {
      throw new BadRequestException(
        'A fidelidade não pode ultrapassar 1.095 dias.',
      );
    }

    try {
      return await this.prisma.$transaction(async (tx) => {
        const player = await tx.player.findFirst({
          where: {
            id: playerId,
            deletedAt: null,
          },
        });

        if (!player) {
          throw new NotFoundException(
            'Jogador não encontrado.',
          );
        }

        const club = await tx.club.findUnique({
          where: { id: dto.club_id },
        });

        if (!club) {
          throw new NotFoundException(
            'Clube não encontrado.',
          );
        }

        if (player.clubId !== null) {
          throw new ConflictException(
            'O jogador não está livre.',
          );
        }

        const previousSale = await tx.transaction.findFirst({
          where: {
            clubId: club.id,
            playerId: player.id,
            type: 'VENDA',
          },
          select: { id: true },
        });

        if (previousSale) {
          throw new ConflictException(
            'Este clube não pode recomprar um jogador que já vendeu.',
          );
        }

        const rosterCount = await tx.player.count({
          where: {
            clubId: club.id,
            deletedAt: null,
          },
        });

        if (rosterCount >= 12) {
          throw new ConflictException(
            'O elenco do clube já possui 12 jogadores.',
          );
        }

        const baseValueCents = moneyToCents(
          player.baseValue.toFixed(2),
        );

        const marketValueCents = calculateMarketValueCents(
          baseValueCents,
          player.condition as PlayerCondition,
          player.agility,
          player.age,
        );

        const feeCents =
          marketValueCents > 3000
            ? Math.floor(
                (marketValueCents * 5 + 50) / 100,
              )
            : 0;

        const totalCostCents =
          marketValueCents + feeCents;

        const cashCents = moneyToCents(
          club.cash.toFixed(2),
        );

        // Evita arredondar o limite de 50% do caixa.
        if (totalCostCents * 2 > cashCents) {
          throw new ConflictException(
            'O custo total da compra ultrapassa 50% do caixa do clube.',
          );
        }

        // Reserva o jogador somente se ele ainda estiver livre.
        const claimed = await tx.player.updateMany({
          where: {
            id: player.id,
            clubId: null,
            deletedAt: null,
          },
          data: {
            clubId: club.id,
          },
        });

        if (claimed.count !== 1) {
          throw new ConflictException(
            'O jogador não está mais disponível para compra.',
          );
        }

        const contract = await tx.contract.create({
          data: {
            playerId: player.id,
            clubId: club.id,
            purchaseValue: formatMoney(marketValueCents),
            loyaltyUntil,
            status: 'ATIVO',
            startedAt: now,
            endedAt: null,
          },
        });

        const newCashCents =
          cashCents - totalCostCents;

        // Atualização condicional para não sobrescrever
        // silenciosamente um caixa alterado por outra operação.
        const cashUpdate = await tx.club.updateMany({
          where: {
            id: club.id,
            cash: club.cash,
          },
          data: {
            cash: formatMoney(newCashCents),
          },
        });

        if (cashUpdate.count !== 1) {
          throw new ConflictException(
            'O caixa do clube foi alterado. Atualize os dados e tente novamente.',
          );
        }

        const transaction = await tx.transaction.create({
          data: {
            clubId: club.id,
            playerId: player.id,
            playerName: player.name,
            type: 'COMPRA',
            value: formatMoney(marketValueCents),
            fee: formatMoney(feeCents),
            penalty: '0.00',
            profit: null,
            cashChange: this.formatSignedMoney(
              -totalCostCents,
            ),
            createdAt: now,
          },
        });

        return {
          id: transaction.id,
          club_id: club.id,
          player_id: player.id,
          player_name: player.name,
          type: 'COMPRA',
          value: Number(formatMoney(marketValueCents)),
          fee: Number(formatMoney(feeCents)),
          penalty: 0,
          profit: null,
          cash_change: -Number(
            formatMoney(totalCostCents),
          ),
          created_at: this.formatBrasiliaTimestamp(
            transaction.createdAt,
          ),
          contract: {
            purchase_value: Number(
              contract.purchaseValue.toFixed(2),
            ),
            loyalty_until:
              this.formatBrasiliaTimestamp(
                contract.loyaltyUntil,
              ),
            status: contract.status,
          },
          club_cash: Number(formatMoney(newCashCents)),
        };
      });
    } catch (error: unknown) {
      if (this.isPrismaError(error, 'P2002')) {
        throw new ConflictException(
          'A compra conflitou com outra operação. Atualize os dados e tente novamente.',
        );
      }

      throw error;
    }
  }

  private parseCanonicalId(rawId: string): number {
    if (!/^[1-9]\d*$/.test(rawId)) {
      throw new NotFoundException(
        'Jogador não encontrado.',
      );
    }

    const id = Number(rawId);

    if (!Number.isSafeInteger(id) || id > 2147483647) {
      throw new NotFoundException(
        'Jogador não encontrado.',
      );
    }

    return id;
  }

  private parseBrasiliaDate(value: string): Date {
    const match =
      /^(\d{4})-(\d{2})-(\d{2})T(\d{2}):(\d{2})-03:00$/.exec(
        value,
      );

    if (!match) {
      throw new BadRequestException(
        'Data inválida. Use YYYY-MM-DDTHH:MM-03:00.',
      );
    }

    const [, yearText, monthText, dayText, hourText, minuteText] =
      match;

    const year = Number(yearText);
    const month = Number(monthText);
    const day = Number(dayText);
    const hour = Number(hourText);
    const minute = Number(minuteText);

    const calendar = new Date(
      Date.UTC(year, month - 1, day, hour, minute),
    );

    // Date pode normalizar datas inexistentes, como 30 de fevereiro.
    if (
      calendar.getUTCFullYear() !== year ||
      calendar.getUTCMonth() !== month - 1 ||
      calendar.getUTCDate() !== day ||
      calendar.getUTCHours() !== hour ||
      calendar.getUTCMinutes() !== minute
    ) {
      throw new BadRequestException(
        'A data de fidelidade não existe no calendário.',
      );
    }

    return new Date(value);
  }

  private formatSignedMoney(cents: number): string {
    const sign = cents < 0 ? '-' : '';
    const absolute = Math.abs(cents);
    const whole = Math.floor(absolute / 100);
    const fraction = String(absolute % 100).padStart(2, '0');

    return `${sign}${whole}.${fraction}`;
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

    return (
      `${get('year')}-${get('month')}-${get('day')}` +
      `T${get('hour')}:${get('minute')}:${get('second')}-03:00`
    );
  }

  private isPrismaError(
    error: unknown,
    code: string,
  ): boolean {
    return (
      typeof error === 'object' &&
      error !== null &&
      'code' in error &&
      (error as { code?: unknown }).code === code
    );
  }
}
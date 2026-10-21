import {
  Injectable,
  NotFoundException,
} from '@nestjs/common';

import { PrismaService } from '../prisma/prisma.service';

@Injectable()
export class TransactionsService {
  constructor(
    private readonly prisma: PrismaService,
  ) {}

  async findAll(rawClubId: string) {
    const clubId = this.parseClubId(rawClubId);

    const club = await this.prisma.club.findUnique({
      where: { id: clubId },
      select: { id: true },
    });

    if (!club) {
      throw new NotFoundException(
        'Clube não encontrado.',
      );
    }

    const transactions =
      await this.prisma.transaction.findMany({
        where: { clubId },
        orderBy: [
          { createdAt: 'desc' },
          { id: 'desc' },
        ],
      });

    return transactions.map((transaction) => ({
      id: transaction.id,
      club_id: transaction.clubId,
      player_id: transaction.playerId,
      player_name: transaction.playerName,
      type: transaction.type,
      value: Number(
        transaction.value.toFixed(2),
      ),
      fee: Number(
        transaction.fee.toFixed(2),
      ),
      penalty: Number(
        transaction.penalty.toFixed(2),
      ),
      profit:
        transaction.profit === null
          ? null
          : Number(
              transaction.profit.toFixed(2),
            ),
      cash_change: Number(
        transaction.cashChange.toFixed(2),
      ),
      created_at: this.formatTimestamp(
        transaction.createdAt,
      ),
    }));
  }

  async getSummary(rawClubId: string) {
    const clubId = this.parseClubId(rawClubId);

    const club = await this.prisma.club.findUnique({
      where: { id: clubId },
      select: { id: true },
    });

    if (!club) {
      throw new NotFoundException(
        'Clube não encontrado.',
      );
    }

    const transactions =
      await this.prisma.transaction.findMany({
        where: { clubId },
      });

    let purchaseCount = 0;
    let saleCount = 0;

    let purchasesCents = 0;
    let salesCents = 0;
    let feesCents = 0;
    let penaltiesCents = 0;
    let cashChangeCents = 0;

    for (const transaction of transactions) {
      const valueCents = this.toCents(
        transaction.value,
      );

      const feeCents = this.toCents(
        transaction.fee,
      );

      const penaltyCents = this.toCents(
        transaction.penalty,
      );

      const changeCents = this.toCents(
        transaction.cashChange,
      );

      if (transaction.type === 'COMPRA') {
        purchaseCount++;
        purchasesCents += valueCents;
      }

      if (transaction.type === 'VENDA') {
        saleCount++;
        salesCents += valueCents;
      }

      feesCents += feeCents;
      penaltiesCents += penaltyCents;
      cashChangeCents += changeCents;
    }

    return {
      club_id: clubId,
      total_transactions: transactions.length,

      purchases: {
        count: purchaseCount,
        total: this.formatMoney(
          purchasesCents,
        ),
      },

      sales: {
        count: saleCount,
        total: this.formatMoney(
          salesCents,
        ),
      },

      total_fees: this.formatMoney(
        feesCents,
      ),

      total_penalties: this.formatMoney(
        penaltiesCents,
      ),

      net_cash_change: this.formatMoney(
        cashChangeCents,
      ),
    };
  }

  async exportCsv(rawClubId: string) {
    const clubId = this.parseClubId(rawClubId);

    const club = await this.prisma.club.findUnique({
      where: { id: clubId },
      select: { id: true },
    });

    if (!club) {
      throw new NotFoundException(
        'Clube não encontrado.',
      );
    }

    const transactions =
      await this.prisma.transaction.findMany({
        where: { clubId },
        orderBy: [
          { createdAt: 'desc' },
          { id: 'desc' },
        ],
      });

    const headers = [
      'id',
      'club_id',
      'player_id',
      'player_name',
      'type',
      'value',
      'fee',
      'penalty',
      'profit',
      'cash_change',
      'created_at',
    ];

    const rows = transactions.map(
      (transaction) => [
        transaction.id,
        transaction.clubId,
        transaction.playerId,
        transaction.playerName,
        transaction.type,
        transaction.value.toFixed(2),
        transaction.fee.toFixed(2),
        transaction.penalty.toFixed(2),
        transaction.profit === null
          ? ''
          : transaction.profit.toFixed(2),
        transaction.cashChange.toFixed(2),
        this.formatTimestamp(
          transaction.createdAt,
        ),
      ],
    );

    const csv = [
      headers.join(','),
      ...rows.map((row) =>
        row.map((value) =>
          this.escapeCsv(String(value)),
        ).join(','),
      ),
    ].join('\r\n');

    // BOM para facilitar a abertura no Excel
    // com caracteres acentuados.
    return '\uFEFF' + csv + '\r\n';
  }

  private parseClubId(rawId: string): number {
    if (!/^[1-9]\d*$/.test(rawId)) {
      throw new NotFoundException(
        'Clube não encontrado.',
      );
    }

    const id = Number(rawId);

    if (
      !Number.isSafeInteger(id) ||
      id > 2147483647
    ) {
      throw new NotFoundException(
        'Clube não encontrado.',
      );
    }

    return id;
  }

  private toCents(
    value: { toFixed: (digits: number) => string },
  ): number {
    const formatted = value.toFixed(2);
    const negative = formatted.startsWith('-');
    const unsigned = negative
      ? formatted.slice(1)
      : formatted;

    const [whole, fraction] = unsigned.split('.');

    const cents =
      Number(whole) * 100 +
      Number(fraction);

    return negative ? -cents : cents;
  }

  private formatMoney(cents: number): number {
    return Number((cents / 100).toFixed(2));
  }

  private formatTimestamp(date: Date): string {
    const parts = new Intl.DateTimeFormat(
      'en-CA',
      {
        timeZone: 'America/Recife',
        year: 'numeric',
        month: '2-digit',
        day: '2-digit',
        hour: '2-digit',
        minute: '2-digit',
        second: '2-digit',
        hourCycle: 'h23',
      },
    ).formatToParts(date);

    const get = (type: string) =>
      parts.find(
        (part) => part.type === type,
      )?.value ?? '';

    return (
      `${get('year')}-${get('month')}-${get('day')}` +
      `T${get('hour')}:${get('minute')}:${get('second')}-03:00`
    );
  }

  private escapeCsv(value: string): string {
    return `"${value.replace(/"/g, '""')}"`;
  }
}
import {
  BadRequestException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';

import { PrismaService } from '../prisma/prisma.service';

@Injectable()
export class TransactionsService {
  constructor(
    private readonly prisma: PrismaService,
  ) {}

  /**
   * Valida e converte o ID do clube vindo da URL.
   */
  private parseClubId(rawId: string): number {
    if (!/^[1-9]\d*$/.test(rawId)) {
      throw new NotFoundException('Clube não encontrado.');
    }

    const id = Number(rawId);

    if (!Number.isSafeInteger(id) || id > 2147483647) {
      throw new NotFoundException('Clube não encontrado.');
    }

    return id;
  }

  /**
   * Valida o filtro `type` (COMPRA, VENDA ou combinação).
   * Retorna um array de tipos, ou undefined se ausente.
   */
  private parseTypeFilter(
    rawType: string | undefined,
  ): string[] | undefined {
    if (rawType === undefined) return undefined;

    if (rawType === '') {
      throw new BadRequestException(
        'O parâmetro type não pode ser vazio.',
      );
    }

    const VALID = ['COMPRA', 'VENDA'];
    const parts = rawType.split(',');

    if (parts.length === 0) {
      throw new BadRequestException('type inválido.');
    }

    const seen = new Set<string>();

    for (const part of parts) {
      if (!VALID.includes(part)) {
        throw new BadRequestException(`type inválido: "${part}".`);
      }

      if (seen.has(part)) {
        throw new BadRequestException('type não pode repetir valores.');
      }

      seen.add(part);
    }

    return parts;
  }

  /**
   * Valida e converte o filtro `player_id`.
   */
  private async parsePlayerIdFilter(
    rawPlayerId: string | undefined,
  ): Promise<number | undefined> {
    if (rawPlayerId === undefined) return undefined;

    if (rawPlayerId === '') {
      throw new BadRequestException(
        'O parâmetro player_id não pode ser vazio.',
      );
    }

    if (!/^[1-9]\d*$/.test(rawPlayerId)) {
      throw new BadRequestException('player_id inválido.');
    }

    const id = Number(rawPlayerId);

    if (!Number.isSafeInteger(id) || id > 2147483647) {
      throw new BadRequestException('player_id fora do limite.');
    }

    // Jogador inexistente ou excluído → 404.
    const player = await this.prisma.player.findFirst({
      where: { id, deletedAt: null },
      select: { id: true },
    });

    if (!player) {
      throw new NotFoundException('Jogador não encontrado.');
    }

    return id;
  }

  async findAll(
    rawClubId: string,
    rawType?: string,
    rawPlayerId?: string,
  ) {
    const clubId = this.parseClubId(rawClubId);

    const club = await this.prisma.club.findUnique({
      where: { id: clubId },
      select: { id: true },
    });

    if (!club) {
      throw new NotFoundException('Clube não encontrado.');
    }

    const types = this.parseTypeFilter(rawType);
    const playerId = await this.parsePlayerIdFilter(rawPlayerId);

    const transactions = await this.prisma.transaction.findMany({
      where: {
        clubId,
        ...(types ? { type: { in: types } } : {}),
        ...(playerId !== undefined ? { playerId } : {}),
      },
      orderBy: [{ createdAt: 'desc' }, { id: 'desc' }],
    });

    const data = transactions.map((t) => ({
      id: t.id,
      club_id: t.clubId,
      player_id: t.playerId,
      player_name: t.playerName,
      type: t.type,
      value: Number(t.value.toFixed(2)),
      fee: Number(t.fee.toFixed(2)),
      penalty: Number(t.penalty.toFixed(2)),
      profit: t.profit === null ? null : Number(t.profit.toFixed(2)),
      cash_change: Number(t.cashChange.toFixed(2)),
      created_at: this.formatTimestamp(t.createdAt),
    }));

    // Totais respeitam os filtros aplicados.
    let totalSpentCents = 0;
    let totalReceivedCents = 0;
    let totalFeesCents = 0;
    let totalPenaltiesCents = 0;
    let totalProfitCents = 0;

    for (const t of transactions) {
      const valueCents = this.toCents(t.value);
      const feeCents = this.toCents(t.fee);
      const penaltyCents = this.toCents(t.penalty);
      const cashChangeCents = this.toCents(t.cashChange);
      const profitCents =
        t.profit === null ? 0 : this.toCents(t.profit);

      if (t.type === 'COMPRA') {
        totalSpentCents += valueCents + feeCents;
      } else {
        totalReceivedCents += cashChangeCents;
        totalProfitCents += profitCents;
      }

      totalFeesCents += feeCents;
      totalPenaltiesCents += penaltyCents;
    }

    const summary = {
      total_spent: this.formatMoney(totalSpentCents),
      total_received: this.formatMoney(totalReceivedCents),
      total_fees: this.formatMoney(totalFeesCents),
      total_penalties: this.formatMoney(totalPenaltiesCents),
      total_profit: this.formatMoney(totalProfitCents),
    };

    return { data, summary };
  }

  async exportCsv(
    rawClubId: string,
    rawType?: string,
    rawPlayerId?: string,
  ): Promise<string> {
    const clubId = this.parseClubId(rawClubId);

    const club = await this.prisma.club.findUnique({
      where: { id: clubId },
      select: { id: true },
    });

    if (!club) {
      throw new NotFoundException('Clube não encontrado.');
    }

    const types = this.parseTypeFilter(rawType);
    const playerId = await this.parsePlayerIdFilter(rawPlayerId);

    const transactions = await this.prisma.transaction.findMany({
      where: {
        clubId,
        ...(types ? { type: { in: types } } : {}),
        ...(playerId !== undefined ? { playerId } : {}),
      },
      orderBy: [{ createdAt: 'desc' }, { id: 'desc' }],
    });

    // Cabeçalho exigido pelo enunciado (RN18).
    const header =
      'data_hora;tipo;jogador;valor;taxa_ou_comissao;multa;lucro;variacao_caixa\n';

    if (transactions.length === 0) {
      return header;
    }

    const rows = transactions.map((t) => {
      const dataHora = this.formatTimestamp(t.createdAt);
      const tipo = t.type;
      const jogador = this.escapeCsvField(t.playerName);
      const valor = this.formatDecimalBr(t.value.toFixed(2));
      const taxaOuComissao = this.formatDecimalBr(t.fee.toFixed(2));
      const multa = this.formatDecimalBr(t.penalty.toFixed(2));
      const lucro =
        t.profit === null
          ? ''
          : this.formatDecimalBr(t.profit.toFixed(2));
      const variacaoCaixa = this.formatDecimalBr(
        t.cashChange.toFixed(2),
      );

      return [
        dataHora,
        tipo,
        jogador,
        valor,
        taxaOuComissao,
        multa,
        lucro,
        variacaoCaixa,
      ].join(';');
    });

    // Sem BOM; separador LF; última linha terminada em LF.
    return header + rows.join('\n') + '\n';
  }

  // ─── Helpers privados ────────────────────────────────────────────

  /**
   * Converte Decimal do Prisma em centavos inteiros.
   * Suporta valores negativos (ex.: cashChange).
   */
  private toCents(
    value: { toFixed: (digits: number) => string },
  ): number {
    const formatted = value.toFixed(2);
    const negative = formatted.startsWith('-');
    const unsigned = negative ? formatted.slice(1) : formatted;
    const [whole, fraction] = unsigned.split('.');
    const cents = Number(whole) * 100 + Number(fraction);
    return negative ? -cents : cents;
  }

  private formatMoney(cents: number): number {
    return Number((cents / 100).toFixed(2));
  }

  private formatTimestamp(date: Date): string {
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
      parts.find((p) => p.type === type)?.value ?? '';

    return (
      `${get('year')}-${get('month')}-${get('day')}` +
      `T${get('hour')}:${get('minute')}:${get('second')}-03:00`
    );
  }

  /**
   * Converte valor decimal de string no formato pt-BR (vírgula decimal).
   * Ex.: "35.70" → "35,70"; "-38.85" → "-38,85".
   */
  private formatDecimalBr(value: string): string {
    return value.replace('.', ',');
  }

  /**
   * Escapa um campo CSV com `;`: se contiver `;` ou `"`,
   * envolve em aspas duplas e duplica as aspas internas.
   */
  private escapeCsvField(value: string): string {
    if (value.includes(';') || value.includes('"')) {
      return `"${value.replace(/"/g, '""')}"`;
    }

    return value;
  }
}
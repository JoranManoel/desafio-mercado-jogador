import {
  BadRequestException,
  ConflictException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';

import { PrismaService } from '../prisma/prisma.service';
import { UpdateLineupDto } from './dto/update-lineup.dto';

const FORMATIONS = ['3-1', '2-2', '2-1-1', '1-2-1'] as const;

type Formation = (typeof FORMATIONS)[number];

@Injectable()
export class LineupService {
  constructor(private readonly prisma: PrismaService) {}

  async findOne(rawClubId: string) {
    const clubId = this.parseId(rawClubId);

    const club = await this.prisma.club.findUnique({
      where: { id: clubId },
      include: {
        lineupEntries: {
          include: {
            player: true,
          },
        },
      },
    });

    if (!club) {
      throw new NotFoundException('Clube não encontrado.');
    }

    const players = club.lineupEntries
      .map(({ player }) => player)
      .sort((a, b) => {
        const order: Record<string, number> = {
          GOL: 0,
          ZAG: 1,
          LAT: 2,
          MEI: 3,
          ATA: 4,
        };

        return (
          (order[a.position] ?? 99) - (order[b.position] ?? 99) ||
          a.id - b.id
        );
      });

    return {
      club_id: club.id,
      club_name: club.name,
      formation: club.formation,
      total_players: players.length,
      players: players.map((player) => ({
        id: player.id,
        name: player.name,
        position: player.position,
        condition: player.condition,
      })),
    };
  }

  async update(rawClubId: string, dto: UpdateLineupDto) {
    const clubId = this.parseId(rawClubId);

    if (!FORMATIONS.includes(dto.formation as Formation)) {
      throw new BadRequestException('Formação inválida.');
    }

    const club = await this.prisma.club.findUnique({
      where: { id: clubId },
      select: { id: true },
    });

    if (!club) {
      throw new NotFoundException('Clube não encontrado.');
    }

    const players = await this.prisma.player.findMany({
      where: {
        id: { in: dto.player_ids },
        deletedAt: null,
      },
      select: {
        id: true,
        name: true,
        position: true,
        condition: true,
        clubId: true,
      },
    });

    if (players.length !== 5) {
      throw new BadRequestException(
        'Todos os cinco jogadores devem existir e não podem estar excluídos.',
      );
    }

    const playersFromOtherClubs = players.filter(
      (player) => player.clubId !== clubId,
    );

    if (playersFromOtherClubs.length > 0) {
      throw new ConflictException(
        'Todos os jogadores escalados devem pertencer ao clube.',
      );
    }

    const sickPlayers = players.filter(
      (player) => player.condition === 'DOENTE',
    );

    if (sickPlayers.length > 0) {
      throw new ConflictException(
        'Jogadores doentes não podem ser escalados.',
      );
    }

    const goalkeepers = players.filter(
      (player) => player.position === 'GOL',
    );

    if (goalkeepers.length !== 1) {
      throw new BadRequestException(
        'A escalação deve conter exatamente um goleiro.',
      );
    }

    const linePlayers = players.filter(
      (player) => player.position !== 'GOL',
    );

    if (
      linePlayers.some(
        (player) =>
          !['ZAG', 'LAT', 'MEI', 'ATA'].includes(player.position),
      )
    ) {
      throw new BadRequestException(
        'A escalação contém uma posição inválida.',
      );
    }

    this.validateFormation(dto.formation as Formation, linePlayers);

    try {
      await this.prisma.$transaction(async (tx) => {
        await tx.lineup.deleteMany({
          where: { clubId },
        });

        await tx.lineup.createMany({
          data: dto.player_ids.map((playerId) => ({
            clubId,
            playerId,
          })),
        });

        await tx.club.update({
          where: { id: clubId },
          data: { formation: dto.formation },
        });
      });
    } catch (error: unknown) {
      if (
        typeof error === 'object' &&
        error !== null &&
        'code' in error &&
        (error as { code?: unknown }).code === 'P2002'
      ) {
        throw new ConflictException(
          'Um dos jogadores já está escalado em outro clube.',
        );
      }

      throw error;
    }

    return this.findOne(String(clubId));
  }

  private validateFormation(
    formation: Formation,
    players: Array<{ position: string }>,
  ) {
    const defenders = players.filter((player) =>
      ['ZAG', 'LAT'].includes(player.position),
    ).length;

    const midfielders = players.filter(
      (player) => player.position === 'MEI',
    ).length;

    const attackers = players.filter(
      (player) => player.position === 'ATA',
    ).length;

    const valid =
      formation === '3-1'
        ? defenders === 3 && midfielders + attackers === 1
        : formation === '2-2'
          ? defenders === 2 && midfielders + attackers === 2
          : formation === '2-1-1'
            ? defenders === 2 &&
              midfielders === 1 &&
              attackers === 1
            : defenders === 1 &&
              midfielders === 2 &&
              attackers === 1;

    if (!valid) {
      throw new BadRequestException(
        `As posições dos jogadores não correspondem à formação ${formation}.`,
      );
    }
  }

  private parseId(rawId: string): number {
    if (!/^[1-9]\d*$/.test(rawId)) {
      throw new NotFoundException('Clube não encontrado.');
    }

    const id = Number(rawId);

    if (!Number.isSafeInteger(id) || id > 2147483647) {
      throw new NotFoundException('Clube não encontrado.');
    }

    return id;
  }
}
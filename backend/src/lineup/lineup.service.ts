import {
  ConflictException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';

import { PrismaService } from '../prisma/prisma.service';
import { PlayersService } from '../players/players.service';
import { UpdateLineupDto } from './dto/update-lineup.dto';
import { normalizeSearchText } from '../common/utils/normalize-search-text';

const FORMATIONS = ['3-1', '2-2', '2-1-1', '1-2-1'] as const;

type Formation = (typeof FORMATIONS)[number];

/** Posições esperadas nos 4 jogadores de linha, por formação. */
const FORMATION_LINE_POSITIONS: Record<Formation, string[]> = {
  '3-1': ['ZAG', 'LAT', 'LAT', 'ATA'],
  '2-2': ['ZAG', 'LAT', 'ATA', 'ATA'],
  '2-1-1': ['ZAG', 'LAT', 'MEI', 'ATA'],
  '1-2-1': ['ZAG', 'MEI', 'MEI', 'ATA'],
};

const POSITION_ORDER: Record<string, number> = {
  GOL: 0,
  ZAG: 1,
  LAT: 2,
  MEI: 3,
  ATA: 4,
};

@Injectable()
export class LineupService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly playersService: PlayersService,
  ) {}

  async findOne(rawClubId: string) {
    const clubId = this.parseId(rawClubId);

    const club = await this.prisma.club.findUnique({
      where: { id: clubId },
      include: {
        lineupEntries: {
          include: { player: true },
        },
      },
    });

    if (!club) {
      throw new NotFoundException('Clube não encontrado.');
    }

    const players = club.lineupEntries
      .map(({ player }) => player)
      .sort((a, b) => {
        const positionDiff =
          (POSITION_ORDER[a.position] ?? 99) -
          (POSITION_ORDER[b.position] ?? 99);

        if (positionDiff !== 0) return positionDiff;

        const nameA = normalizeSearchText(a.name);
        const nameB = normalizeSearchText(b.name);

        if (nameA < nameB) return -1;
        if (nameA > nameB) return 1;

        return a.id - b.id;
      });

    const complete = players.length === 5;

    return {
      club_id: club.id,
      formation: club.formation,
      complete,
      players: players.map((player) =>
        this.playersService.toApiResponse(player),
      ),
    };
  }

  async update(rawClubId: string, dto: UpdateLineupDto) {
    const clubId = this.parseId(rawClubId);

    if (!FORMATIONS.includes(dto.formation as Formation)) {
      // formation inválida → 400 (já validado pelo DTO, mas defensivo)
      throw new ConflictException('Formação inválida.');
    }

    const club = await this.prisma.club.findUnique({
      where: { id: clubId },
      select: { id: true },
    });

    if (!club) {
      throw new NotFoundException('Clube não encontrado.');
    }

    // Busca apenas jogadores existentes e não excluídos.
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

    // Se o número retornado for menor que 5, algum id não existe ou está excluído → 404.
    if (players.length !== dto.player_ids.length) {
      throw new NotFoundException(
        'Um ou mais jogadores não foram encontrados.',
      );
    }

    const playersFromOtherClubs = players.filter(
      (p) => p.clubId !== clubId,
    );

    if (playersFromOtherClubs.length > 0) {
      throw new ConflictException(
        'Todos os jogadores escalados devem pertencer ao clube.',
      );
    }

    const sickPlayers = players.filter(
      (p) => p.condition === 'DOENTE',
    );

    if (sickPlayers.length > 0) {
      throw new ConflictException(
        'Jogadores doentes não podem ser escalados.',
      );
    }

    const goalkeepers = players.filter(
      (p) => p.position === 'GOL',
    );

    if (goalkeepers.length !== 1) {
      throw new ConflictException(
        'A escalação deve conter exatamente um goleiro.',
      );
    }

    const linePlayers = players.filter(
      (p) => p.position !== 'GOL',
    );

    this.validateFormation(dto.formation as Formation, linePlayers);

    try {
      await this.prisma.$transaction(async (tx) => {
        await tx.lineup.deleteMany({ where: { clubId } });

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
    const expected = [...FORMATION_LINE_POSITIONS[formation]].sort();
    const actual = players.map((p) => p.position).sort();

    if (expected.join(',') !== actual.join(',')) {
      throw new ConflictException(
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
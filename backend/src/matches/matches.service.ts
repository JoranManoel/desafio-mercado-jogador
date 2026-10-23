import {
  BadRequestException,
  ConflictException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';

import { PrismaService } from '../prisma/prisma.service';
import { CreateMatchDto } from './dto/create-match.dto';

const FORMATION_POSITIONS: Record<string, string[]> = {
  '3-1': ['ZAG', 'LAT', 'LAT', 'ATA'],
  '2-2': ['ZAG', 'LAT', 'ATA', 'ATA'],
  '2-1-1': ['ZAG', 'LAT', 'MEI', 'ATA'],
  '1-2-1': ['ZAG', 'MEI', 'MEI', 'ATA'],
};

type PlayerData = {
  id: number;
  name: string;
  position: string;
  condition: string;
  clubId: number | null;
  deletedAt: Date | null;
  shooting: number;
  passing: number;
  dribbling: number;
  defending: number;
};

type TeamData = {
  id: number;
  name: string;
  formation: string | null;
  lineupEntries: { player: PlayerData }[];
};

type DuelData = {
  order: number;
  attackingClubId: number;
  attackerId: number;
  defenderId: number;
  attackerName: string;
  defenderName: string;
  attackerPosition: string;
  defenderPosition: string;
  attackerCondition: string;
  defenderCondition: string;
  attackAttribute: string;
  defenseAttribute: string;
  attackValue: number;
  defenseValue: number;
  goal: boolean;
};

@Injectable()
export class MatchesService {
  constructor(private readonly prisma: PrismaService) {}

  async create(dto: CreateMatchDto) {
    if (dto.home_club_id === dto.away_club_id) {
      throw new BadRequestException(
        'O mandante e o visitante devem ser clubes diferentes.',
      );
    }

    const matchId = await this.prisma.$transaction(async (tx) => {
      const clubs = await tx.club.findMany({
        where: {
          id: {
            in: [dto.home_club_id, dto.away_club_id],
          },
        },
        include: {
          lineupEntries: {
            include: {
              player: true,
            },
          },
        },
      });

      const home = clubs.find(
        (club) => club.id === dto.home_club_id,
      );

      const away = clubs.find(
        (club) => club.id === dto.away_club_id,
      );

      if (!home || !away) {
        throw new NotFoundException('Clube não encontrado.');
      }

      const homePlayers = this.getStartingPlayers(home);
      const awayPlayers = this.getStartingPlayers(away);

      const homeLine = homePlayers.filter(
        (player) => player.position !== 'GOL',
      );

      const awayLine = awayPlayers.filter(
        (player) => player.position !== 'GOL',
      );

      const homeGoalkeeper = homePlayers.find(
        (player) => player.position === 'GOL',
      )!;

      const awayGoalkeeper = awayPlayers.find(
        (player) => player.position === 'GOL',
      )!;

      const duels: DuelData[] = [];

      // Duelos 1 a 3: o mandante ataca.
      duels.push(
        this.createDuel(
          1,
          home.id,
          homeLine[3],
          awayGoalkeeper,
        ),
        this.createDuel(
          2,
          home.id,
          homeLine[2],
          awayLine[0],
        ),
        this.createDuel(
          3,
          home.id,
          homeLine[1],
          awayLine[1],
        ),
      );

      // Duelos 4 a 6: o visitante ataca.
      duels.push(
        this.createDuel(
          4,
          away.id,
          awayLine[3],
          homeGoalkeeper,
        ),
        this.createDuel(
          5,
          away.id,
          awayLine[2],
          homeLine[0],
        ),
        this.createDuel(
          6,
          away.id,
          awayLine[1],
          homeLine[1],
        ),
      );

      const homeGoals = duels.filter(
        (duel) => duel.attackingClubId === home.id && duel.goal,
      ).length;

      const awayGoals = duels.filter(
        (duel) => duel.attackingClubId === away.id && duel.goal,
      ).length;

      const match = await tx.match.create({
        data: {
          homeClubId: home.id,
          awayClubId: away.id,
          homeGoals,
          awayGoals,
          homeFormation: home.formation!,
          awayFormation: away.formation!,
        },
      });

      await tx.duel.createMany({
        data: duels.map((duel) => ({
          matchId: match.id,
          ...duel,
        })),
      });

      return match.id;
    });

    return this.findOne(String(matchId));
  }

  async findAll(rawClubId?: string) {
    let clubId: number | undefined;

    if (rawClubId !== undefined) {
      clubId = this.parseId(rawClubId);

      const club = await this.prisma.club.findUnique({
        where: { id: clubId },
        select: { id: true },
      });

      if (!club) {
        throw new NotFoundException('Clube não encontrado.');
      }
    }

    const matches = await this.prisma.match.findMany({
      where:
        clubId === undefined
          ? undefined
          : {
              OR: [
                { homeClubId: clubId },
                { awayClubId: clubId },
              ],
            },
      include: {
        homeClub: true,
        awayClub: true,
      },
      orderBy: [{ playedAt: 'desc' }, { id: 'desc' }],
    });

    return matches.map((match) => ({
      id: match.id,
      played_at: this.formatBrasiliaTimestamp(match.playedAt),
      home: {
        club_id: match.homeClubId,
        club_name: match.homeClub.name,
        formation: match.homeFormation,
        goals: match.homeGoals,
      },
      away: {
        club_id: match.awayClubId,
        club_name: match.awayClub.name,
        formation: match.awayFormation,
        goals: match.awayGoals,
      },
      home_club_id: match.homeClubId,
      home_club_name: match.homeClub.name,
      away_club_id: match.awayClubId,
      away_club_name: match.awayClub.name,
      home_goals: match.homeGoals,
      away_goals: match.awayGoals,
      home_formation: match.homeFormation,
      away_formation: match.awayFormation,
      result: this.getResult(match.homeGoals, match.awayGoals),
    }));
  }

  async findOne(rawId: string) {
    const id = this.parseId(rawId);

    const match = await this.prisma.match.findUnique({
      where: { id },
      include: {
        homeClub: true,
        awayClub: true,
        duels: {
          orderBy: { order: 'asc' },
        },
      },
    });

    if (!match) {
      throw new NotFoundException('Partida não encontrada.');
    }

    return {
      id: match.id,
      played_at: this.formatBrasiliaTimestamp(match.playedAt),
      home: {
        club_id: match.homeClubId,
        club_name: match.homeClub.name,
        formation: match.homeFormation,
        goals: match.homeGoals,
      },
      away: {
        club_id: match.awayClubId,
        club_name: match.awayClub.name,
        formation: match.awayFormation,
        goals: match.awayGoals,
      },
      home_club_id: match.homeClubId,
      home_club_name: match.homeClub.name,
      away_club_id: match.awayClubId,
      away_club_name: match.awayClub.name,
      home_goals: match.homeGoals,
      away_goals: match.awayGoals,
      home_formation: match.homeFormation,
      away_formation: match.awayFormation,
      result: this.getResult(match.homeGoals, match.awayGoals),
      duels: match.duels.map((duel) => ({
        order: duel.order,
        attacking_club_id: duel.attackingClubId,
        attacker: {
          player_id: duel.attackerId,
          player_name: duel.attackerName,
          position: duel.attackerPosition,
          condition: duel.attackerCondition,
          attribute: duel.attackAttribute,
          value: duel.attackValue,
        },
        defender: {
          player_id: duel.defenderId,
          player_name: duel.defenderName,
          position: duel.defenderPosition,
          condition: duel.defenderCondition,
          attribute: duel.defenseAttribute,
          value: duel.defenseValue,
        },
        attacker_id: duel.attackerId,
        defender_id: duel.defenderId,
        attacker_name: duel.attackerName,
        defender_name: duel.defenderName,
        attacker_position: duel.attackerPosition,
        defender_position: duel.defenderPosition,
        attacker_condition: duel.attackerCondition,
        defender_condition: duel.defenderCondition,
        attack_attribute: duel.attackAttribute,
        defense_attribute: duel.defenseAttribute,
        attack_value: duel.attackValue,
        defense_value: duel.defenseValue,
        goal: duel.goal,
      })),
    };
  }

  private getStartingPlayers(club: TeamData): PlayerData[] {
    if (!club.formation || !FORMATION_POSITIONS[club.formation]) {
      throw new ConflictException(
        `O clube ${club.name} não possui uma formação válida.`,
      );
    }

    if (club.lineupEntries.length !== 5) {
      throw new ConflictException(
        `O clube ${club.name} não possui cinco titulares escalados.`,
      );
    }

    const players = club.lineupEntries.map((entry) => entry.player);

    if (
      players.some(
        (player) =>
          player.clubId !== club.id ||
          player.deletedAt !== null ||
          player.condition === 'DOENTE',
      )
    ) {
      throw new ConflictException(
        `A escalação do clube ${club.name} está incompleta ou contém jogador indisponível.`,
      );
    }

    const goalkeepers = players.filter(
      (player) => player.position === 'GOL',
    );

    const linePlayers = players.filter(
      (player) => player.position !== 'GOL',
    );

    if (goalkeepers.length !== 1 || linePlayers.length !== 4) {
      throw new ConflictException(
        `A escalação do clube ${club.name} deve conter um goleiro e quatro jogadores de linha.`,
      );
    }

    const expected = [...FORMATION_POSITIONS[club.formation]].sort();
    const actual = linePlayers.map((player) => player.position).sort();

    if (expected.join(',') !== actual.join(',')) {
      throw new ConflictException(
        `A escalação do clube ${club.name} não corresponde à formação ${club.formation}.`,
      );
    }

    linePlayers.sort((a, b) => {
      const rankA = FORMATION_POSITIONS[club.formation!].indexOf(
        a.position,
      );
      const rankB = FORMATION_POSITIONS[club.formation!].indexOf(
        b.position,
      );

      return (
        rankA - rankB ||
        a.name.localeCompare(b.name, 'pt-BR', {
          sensitivity: 'base',
        }) ||
        a.id - b.id
      );
    });

    return [goalkeepers[0], ...linePlayers];
  }

  private createDuel(
    order: number,
    attackingClubId: number,
    attacker: PlayerData,
    defender: PlayerData,
  ): DuelData {
    const attackAttribute =
      attacker.position === 'ATA'
        ? 'shooting'
        : attacker.position === 'MEI'
          ? 'passing'
          : 'dribbling';

    const rawAttackValue = attacker[attackAttribute as
      | 'shooting'
      | 'passing'
      | 'dribbling'];

    const rawDefenseValue = defender.defending;

    const attackValue = this.applyCondition(
      rawAttackValue,
      attacker.condition,
    );

    const defenseValue = this.applyCondition(
      rawDefenseValue,
      defender.condition,
    );

    return {
      order,
      attackingClubId,
      attackerId: attacker.id,
      defenderId: defender.id,
      attackerName: attacker.name,
      defenderName: defender.name,
      attackerPosition: attacker.position,
      defenderPosition: defender.position,
      attackerCondition: attacker.condition,
      defenderCondition: defender.condition,
      attackAttribute,
      defenseAttribute: 'defending',
      attackValue,
      defenseValue,
      goal: attackValue > defenseValue,
    };
  }

  private applyCondition(value: number, condition: string): number {
    return condition === 'MAL_CONDICIONADO'
      ? Math.floor(value * 0.85 + 0.5)
      : value;
  }

  private getResult(homeGoals: number, awayGoals: number) {
    if (homeGoals > awayGoals) return 'MANDANTE';
    if (awayGoals > homeGoals) return 'VISITANTE';
    return 'EMPATE';
  }

  private parseId(rawId: string): number {
    if (!/^[1-9]\d*$/.test(rawId)) {
      throw new NotFoundException('Recurso não encontrado.');
    }

    const id = Number(rawId);

    if (!Number.isSafeInteger(id) || id > 2147483647) {
      throw new NotFoundException('Recurso não encontrado.');
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

    return (
      `${get('year')}-${get('month')}-${get('day')}` +
      `T${get('hour')}:${get('minute')}:${get('second')}-03:00`
    );
  }
}
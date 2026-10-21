import { Injectable } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';

type Standing = {
  club_id: number;
  club_name: string;
  played: number;
  wins: number;
  draws: number;
  losses: number;
  goals_for: number;
  goals_against: number;
  goal_difference: number;
  points: number;
};

@Injectable()
export class StandingsService {
  constructor(private readonly prisma: PrismaService) {}

  async findAll() {
    const [clubs, matches] = await Promise.all([
      this.prisma.club.findMany({
        select: {
          id: true,
          name: true,
        },
      }),
      this.prisma.match.findMany({
        select: {
          homeClubId: true,
          awayClubId: true,
          homeGoals: true,
          awayGoals: true,
        },
      }),
    ]);

    const standings: Standing[] = clubs.map((club) => ({
      club_id: club.id,
      club_name: club.name,
      played: 0,
      wins: 0,
      draws: 0,
      losses: 0,
      goals_for: 0,
      goals_against: 0,
      goal_difference: 0,
      points: 0,
    }));

    const byClubId = new Map(
      standings.map((standing) => [
        standing.club_id,
        standing,
      ]),
    );

    for (const match of matches) {
      const home = byClubId.get(match.homeClubId);
      const away = byClubId.get(match.awayClubId);

      if (!home || !away) continue;

      home.played++;
      away.played++;

      home.goals_for += match.homeGoals;
      home.goals_against += match.awayGoals;

      away.goals_for += match.awayGoals;
      away.goals_against += match.homeGoals;

      if (match.homeGoals > match.awayGoals) {
        home.wins++;
        home.points += 3;
        away.losses++;
      } else if (match.awayGoals > match.homeGoals) {
        away.wins++;
        away.points += 3;
        home.losses++;
      } else {
        home.draws++;
        away.draws++;
        home.points++;
        away.points++;
      }
    }

    for (const standing of standings) {
      standing.goal_difference =
        standing.goals_for - standing.goals_against;
    }

    standings.sort(
      (a, b) =>
        b.points - a.points ||
        b.goal_difference - a.goal_difference ||
        b.goals_for - a.goals_for ||
        a.club_name.localeCompare(b.club_name, 'pt-BR', {
          sensitivity: 'base',
        }) ||
        a.club_id - b.club_id,
    );

    return standings.map((standing, index) => ({
      position: index + 1,
      ...standing,
    }));
  }
}
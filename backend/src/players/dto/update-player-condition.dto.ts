import { IsIn, IsString } from 'class-validator';

import type { PlayerCondition } from '../domain/player-calculation';

export class UpdatePlayerConditionDto {
  @IsString()
  @IsIn(['APTO', 'MAL_CONDICIONADO', 'DOENTE'])
  condition!: PlayerCondition;
}
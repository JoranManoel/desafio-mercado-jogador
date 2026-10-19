import { Transform } from 'class-transformer';
import {
  IsIn,
  IsInt,
  IsString,
  Length,
  Matches,
  Max,
  Min,
} from 'class-validator';

import type { PlayerPosition } from '../domain/player-calculation';
import { normalizePlayerName } from '../utils/normalize-player-name';


export class CreatePlayerDto {
  @Transform(({ value }) => normalizePlayerName(value))
  @IsString()
  @Length(3, 100)
  @Matches(/^[^\p{Cc}\p{Cf}]*$/u, {
    message: 'name cannot contain control characters',
  })
  @Matches(/^(?=.*\s)(?!.*\p{N}).+$/u, {
    message: 'name must contain at least two words and no digits',
  })
  name!: string;

  @IsIn(['GOL', 'ZAG', 'LAT', 'MEI', 'ATA'])
  position!: PlayerPosition;

  @IsInt()
  @Min(1)
  @Max(100)
  agility!: number;

  @IsInt()
  @Min(16)
  @Max(45)
  age!: number;

  @IsInt()
  @Min(1)
  @Max(99)
  pace!: number;

  @IsInt()
  @Min(1)
  @Max(99)
  shooting!: number;

  @IsInt()
  @Min(1)
  @Max(99)
  passing!: number;

  @IsInt()
  @Min(1)
  @Max(99)
  dribbling!: number;

  @IsInt()
  @Min(1)
  @Max(99)
  defending!: number;

  @IsInt()
  @Min(1)
  @Max(99)
  physical!: number;

  @IsInt()
  @Min(1)
  @Max(99)
  potential!: number;
}
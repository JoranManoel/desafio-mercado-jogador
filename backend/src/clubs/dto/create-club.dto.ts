import { Transform } from 'class-transformer';
import {
  IsString,
  Length,
  Matches,
} from 'class-validator';

import { normalizeClubName } from '../utils/normalize-club-name';

export class CreateClubDto {
  @Transform(({ value }) => normalizeClubName(value))
  @IsString()
  @Length(3, 60)
  @Matches(/^[\p{L} .-]+$/u, {
    message: 'O nome só pode conter letras, espaços, pontos e hífens.',
  })
  name!: string;

  @IsString()
  @Matches(/^[A-Z]{3}$/, {
    message: 'A sigla deve conter exatamente três letras maiúsculas A-Z.',
  })
  acronym!: string;
}
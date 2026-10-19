import { IsOptional, IsString } from 'class-validator';

export class ListPlayersQueryDto {
  @IsOptional()
  @IsString()
  search?: string;

  @IsOptional()
  @IsString()
  position?: string;

  @IsOptional()
  @IsString()
  condition?: string;

  @IsOptional()
  @IsString()
  free?: string;

  @IsOptional()
  @IsString()
  club_id?: string;

  @IsOptional()
  @IsString()
  min_age?: string;

  @IsOptional()
  @IsString()
  max_age?: string;

  @IsOptional()
  @IsString()
  min_value?: string;

  @IsOptional()
  @IsString()
  max_value?: string;

  @IsOptional()
  @IsString()
  sort?: string;

  @IsOptional()
  @IsString()
  page?: string;

  @IsOptional()
  @IsString()
  limit?: string;
}
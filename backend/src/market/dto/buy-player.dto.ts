import { IsInt, IsString, Matches, Min } from 'class-validator';

export class BuyPlayerDto {
  @IsInt()
  @Min(1)
  club_id!: number;

  @IsString()
  @Matches(
    /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}-03:00$/,
    {
      message:
        'loyalty_until deve seguir o formato YYYY-MM-DDTHH:MM-03:00.',
    },
  )
  loyalty_until!: string;
}
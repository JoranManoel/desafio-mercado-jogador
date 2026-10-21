import {
  ArrayMaxSize,
  ArrayMinSize,
  ArrayUnique,
  IsArray,
  IsIn,
  IsInt,
} from 'class-validator';

export class UpdateLineupDto {
  @IsArray()
  @ArrayMinSize(5)
  @ArrayMaxSize(5)
  @ArrayUnique()
  @IsInt({ each: true })
  player_ids!: number[];

  @IsIn(['3-1', '2-2', '2-1-1', '1-2-1'])
  formation!: string;
}
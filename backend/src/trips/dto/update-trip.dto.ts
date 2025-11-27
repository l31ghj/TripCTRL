import { IsDateString, IsOptional, IsString } from 'class-validator';

export class UpdateTripDto {
  @IsString()
  @IsOptional()
  title?: string;

  @IsString()
  @IsOptional()
  mainLocation?: string;

  @IsDateString()
  @IsOptional()
  startDate?: string;

  @IsDateString()
  @IsOptional()
  endDate?: string;

  @IsString()
  @IsOptional()
  notes?: string;
}

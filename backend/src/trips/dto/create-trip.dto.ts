import { IsDateString, IsOptional, IsString } from 'class-validator';

export class CreateTripDto {
  @IsString()
  title: string;

  @IsString()
  @IsOptional()
  mainLocation?: string;

  @IsDateString()
  startDate: string;

  @IsDateString()
  endDate: string;

  @IsString()
  @IsOptional()
  notes?: string;
}

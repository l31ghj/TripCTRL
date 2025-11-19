import { IsDateString, IsEnum, IsInt, IsObject, IsOptional, IsString } from 'class-validator';
import { SegmentType } from '@prisma/client';

export class UpdateSegmentDto {
  @IsEnum(SegmentType)
  @IsOptional()
  type?: SegmentType;

  @IsString()
  @IsOptional()
  title?: string;

  @IsDateString()
  @IsOptional()
  startTime?: string;

  @IsDateString()
  @IsOptional()
  endTime?: string;

  @IsString()
  @IsOptional()
  location?: string;

  @IsString()
  @IsOptional()
  provider?: string;

  @IsString()
  @IsOptional()
  confirmationCode?: string;

  @IsObject()
  @IsOptional()
  details?: Record<string, any>;

  @IsInt()
  @IsOptional()
  sortOrder?: number;
}

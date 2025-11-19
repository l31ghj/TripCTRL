import { IsDateString, IsEnum, IsInt, IsObject, IsOptional, IsString } from 'class-validator';
import { SegmentType } from '@prisma/client';

export class CreateSegmentDto {
  @IsEnum(SegmentType)
  type: SegmentType;

  @IsString()
  title: string;

  @IsDateString()
  startTime: string;

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

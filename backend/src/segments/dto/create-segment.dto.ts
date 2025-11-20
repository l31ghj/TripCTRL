import {
  IsDateString,
  IsEnum,
  IsInt,
  IsObject,
  IsOptional,
  IsString,
} from 'class-validator';
import { SegmentType, TransportMode } from '@prisma/client';

export class CreateSegmentDto {
  @IsEnum(SegmentType)
  type!: SegmentType;

  @IsEnum(TransportMode)
  @IsOptional()
  transportMode?: TransportMode;

  @IsString()
  title!: string;

  @IsDateString()
  startTime!: string;

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

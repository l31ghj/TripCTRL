import { IsEmail, IsEnum, IsOptional, IsString } from 'class-validator';
import { TripPermission } from '@prisma/client';

export class ShareTripDto {
  @IsOptional()
  @IsString()
  userId?: string;

  @IsOptional()
  @IsEmail()
  email?: string;

  @IsEnum(TripPermission)
  permission!: TripPermission;
}

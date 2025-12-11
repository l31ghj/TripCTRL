import { IsEnum, IsString } from 'class-validator';
import { TripPermission } from '@prisma/client';

export class ShareTripDto {
  @IsString()
  userId!: string;

  @IsEnum(TripPermission)
  permission!: TripPermission;
}

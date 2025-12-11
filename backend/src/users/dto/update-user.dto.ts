import { IsEnum } from 'class-validator';
import { UserRole, UserStatus } from '@prisma/client';

export class UpdateUserStatusDto {
  @IsEnum(UserStatus)
  status!: UserStatus;
}

export class UpdateUserRoleDto {
  @IsEnum(UserRole)
  role!: UserRole;
}

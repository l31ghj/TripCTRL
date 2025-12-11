import { IsObject } from 'class-validator';

export class UpdatePlanningDto {
  @IsObject()
  planning!: Record<string, any>;
}

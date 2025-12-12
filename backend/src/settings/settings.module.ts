import { Module } from '@nestjs/common';
import { SettingsService } from './settings.service';
import { SettingsController } from './settings.controller';
import { PrismaModule } from '../prisma.module';
import { RolesGuard } from '../auth/roles.guard';

@Module({
  imports: [PrismaModule],
  providers: [SettingsService, RolesGuard],
  controllers: [SettingsController],
  exports: [SettingsService],
})
export class SettingsModule {}

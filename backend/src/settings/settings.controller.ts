import { Body, Controller, Get, Put, UseGuards } from '@nestjs/common';
import { SettingsService } from './settings.service';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { RolesGuard } from '../auth/roles.guard';
import { Roles } from '../auth/roles.decorator';
import { UserRole } from '@prisma/client';
import { IsOptional, IsString } from 'class-validator';

class UpdateFlightApiKeyDto {
  @IsOptional()
  @IsString()
  apiKey?: string;
}

@UseGuards(JwtAuthGuard, RolesGuard)
@Roles(UserRole.admin)
@Controller('admin/flight-api-key')
export class SettingsController {
  constructor(private settings: SettingsService) {}

  @Get()
  async getStatus() {
    const fromEnv = process.env.AERODATABOX_API_KEY;
    if (fromEnv) {
      return { hasKey: true, source: 'env' };
    }
    const val = await this.settings.get('AERODATABOX_API_KEY');
    return { hasKey: !!val, source: val ? 'db' : null };
  }

  @Put()
  async update(@Body() dto: UpdateFlightApiKeyDto) {
    if (!dto.apiKey) {
      await this.settings.delete('AERODATABOX_API_KEY');
      return { saved: false, hasKey: false };
    }
    await this.settings.set('AERODATABOX_API_KEY', dto.apiKey);
    return { saved: true, hasKey: true, source: 'db' };
  }
}

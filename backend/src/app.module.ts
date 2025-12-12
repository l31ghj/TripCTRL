import { Module } from '@nestjs/common';
import { AuthModule } from './auth/auth.module';
import { UsersModule } from './users/users.module';
import { TripsModule } from './trips/trips.module';
import { SegmentsModule } from './segments/segments.module';
import { PrismaModule } from './prisma.module';
import { SettingsModule } from './settings/settings.module';
import { FlightsModule } from './flights/flights.module';

@Module({
  imports: [PrismaModule, AuthModule, UsersModule, TripsModule, SegmentsModule, SettingsModule, FlightsModule],
})
export class AppModule {}

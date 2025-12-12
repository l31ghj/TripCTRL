import { Module } from '@nestjs/common';
import { SegmentsService } from './segments.service';
import { SegmentsController } from './segments.controller';
import { PrismaModule } from '../prisma.module';
import { FlightService } from '../flights/flight.service';
import { SettingsModule } from '../settings/settings.module';
import { FlightsModule } from '../flights/flights.module';

@Module({
  imports: [PrismaModule, SettingsModule, FlightsModule],
  controllers: [SegmentsController],
  providers: [SegmentsService, FlightService],
})
export class SegmentsModule {}

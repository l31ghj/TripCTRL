import { Module } from '@nestjs/common';
import { FlightService } from './flight.service';
import { SettingsModule } from '../settings/settings.module';
import { FlightsController } from './flights.controller';

@Module({
  imports: [SettingsModule],
  providers: [FlightService],
  exports: [FlightService],
  controllers: [FlightsController],
})
export class FlightsModule {}

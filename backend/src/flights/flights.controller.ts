import { Controller, Get, Query, UseGuards, BadRequestException } from '@nestjs/common';
import { FlightService } from './flight.service';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';

@UseGuards(JwtAuthGuard)
@Controller('flights')
export class FlightsController {
  constructor(private flights: FlightService) {}

  @Get('lookup')
  async lookup(@Query('flightNumber') flightNumber?: string, @Query('date') date?: string) {
    if (!flightNumber || !date) {
      throw new BadRequestException('flightNumber and date are required (YYYY-MM-DD)');
    }
    const data = await this.flights.fetchByNumberAndDate(flightNumber, date);
    if (!data) {
      return { found: false };
    }
    return { found: true, data };
  }
}

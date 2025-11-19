import {
  Body,
  Controller,
  Delete,
  Get,
  Param,
  Post,
  Put,
  Req,
  UseGuards,
} from '@nestjs/common';
import { TripsService } from './trips.service';
import { CreateTripDto } from './dto/create-trip.dto';
import { UpdateTripDto } from './dto/update-trip.dto';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';

@Controller('trips')
@UseGuards(JwtAuthGuard)
export class TripsController {
  constructor(private trips: TripsService) {}

  @Get()
  list(@Req() req: any) {
    return this.trips.listTrips(req.user.userId);
  }

  @Post()
  create(@Req() req: any, @Body() dto: CreateTripDto) {
    return this.trips.createTrip(req.user.userId, dto);
  }

  @Get(':id')
  get(@Req() req: any, @Param('id') id: string) {
    return this.trips.getTrip(req.user.userId, id);
  }

  @Put(':id')
  update(
    @Req() req: any,
    @Param('id') id: string,
    @Body() dto: UpdateTripDto,
  ) {
    return this.trips.updateTrip(req.user.userId, id, dto);
  }

  @Delete(':id')
  remove(@Req() req: any, @Param('id') id: string) {
    return this.trips.deleteTrip(req.user.userId, id);
  }
}

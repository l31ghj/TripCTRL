import {
  Body,
  Controller,
  Delete,
  Param,
  Post,
  Put,
  Req,
  UseGuards,
} from '@nestjs/common';
import { SegmentsService } from './segments.service';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { CreateSegmentDto } from './dto/create-segment.dto';
import { UpdateSegmentDto } from './dto/update-segment.dto';

@UseGuards(JwtAuthGuard)
@Controller()
export class SegmentsController {
  constructor(private segments: SegmentsService) {}

  @Post('trips/:tripId/segments')
  create(
    @Req() req: any,
    @Param('tripId') tripId: string,
    @Body() dto: CreateSegmentDto,
  ) {
    return this.segments.createSegment(req.user.userId, tripId, dto);
  }

  @Put('segments/:id')
  update(
    @Req() req: any,
    @Param('id') id: string,
    @Body() dto: UpdateSegmentDto,
  ) {
    return this.segments.updateSegment(req.user.userId, id, dto);
  }

  @Delete('segments/:id')
  remove(@Req() req: any, @Param('id') id: string) {
    return this.segments.deleteSegment(req.user.userId, id);
  }
}

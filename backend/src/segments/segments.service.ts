import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../prisma.service';
import { CreateSegmentDto } from './dto/create-segment.dto';
import { UpdateSegmentDto } from './dto/update-segment.dto';

@Injectable()
export class SegmentsService {
  constructor(private prisma: PrismaService) {}

  async createSegment(userId: string, tripId: string, dto: CreateSegmentDto) {
    const trip = await this.prisma.trip.findFirst({
      where: { id: tripId, userId },
    });
    if (!trip) throw new NotFoundException('Trip not found');

    return this.prisma.segment.create({
      data: {
        tripId,
        type: dto.type,
        transportMode: dto.transportMode,
        title: dto.title,
        startTime: new Date(dto.startTime),
        endTime: dto.endTime ? new Date(dto.endTime) : undefined,
        location: dto.location,
        provider: dto.provider,
        confirmationCode: dto.confirmationCode,
        details: dto.details,
        sortOrder: dto.sortOrder,
        flightNumber: dto.flightNumber,
        seatNumber: dto.seatNumber,
        passengerName: dto.passengerName,
      },
    });
  }

  async updateSegment(userId: string, segmentId: string, dto: UpdateSegmentDto) {
    const segment = await this.prisma.segment.findUnique({
      where: { id: segmentId },
      include: { trip: true },
    });
    if (!segment || segment.trip.userId !== userId) {
      throw new NotFoundException('Segment not found');
    }

    return this.prisma.segment.update({
      where: { id: segmentId },
      data: {
        type: dto.type,
        transportMode: dto.transportMode,
        title: dto.title,
        startTime: dto.startTime ? new Date(dto.startTime) : undefined,
        endTime: dto.endTime ? new Date(dto.endTime) : undefined,
        location: dto.location,
        provider: dto.provider,
        confirmationCode: dto.confirmationCode,
        details: dto.details,
        sortOrder: dto.sortOrder,
        flightNumber: dto.flightNumber,
        seatNumber: dto.seatNumber,
        passengerName: dto.passengerName,
      },
    });
  }

  async deleteSegment(userId: string, segmentId: string) {
    const segment = await this.prisma.segment.findUnique({
      where: { id: segmentId },
      include: { trip: true },
    });
    if (!segment || segment.trip.userId !== userId) {
      throw new NotFoundException('Segment not found');
    }
    return this.prisma.segment.delete({ where: { id: segmentId } });
  }
}

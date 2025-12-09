import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../prisma.service';
import { CreateSegmentDto } from './dto/create-segment.dto';
import { UpdateSegmentDto } from './dto/update-segment.dto';
import { join } from 'path';
import * as fs from 'fs';

@Injectable()
export class SegmentsService {
  constructor(private prisma: PrismaService) {}

  private async getTripWithDetails(tripId: string, userId: string) {
    return this.prisma.trip.findFirst({
      where: { id: tripId, userId },
      include: {
        segments: {
          orderBy: { startTime: 'asc' },
          include: { attachments: true },
        },
        attachments: true,
      },
    });
  }

  private removeFileIfExists(path: string | null | undefined) {
    if (!path) return;
    const cleaned = path.replace(/^\/+/, '');
    const abs = join(process.cwd(), cleaned);
    try {
      if (fs.existsSync(abs)) {
        fs.unlinkSync(abs);
      }
    } catch {
      // best-effort cleanup only
    }
  }

  async createSegment(userId: string, tripId: string, dto: CreateSegmentDto) {
    const trip = await this.prisma.trip.findFirst({
      where: { id: tripId, userId },
    });
    if (!trip) throw new NotFoundException('Trip not found');

    await this.prisma.segment.create({
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

    return this.getTripWithDetails(tripId, userId);
  }

  async updateSegment(userId: string, segmentId: string, dto: UpdateSegmentDto) {
    const segment = await this.prisma.segment.findUnique({
      where: { id: segmentId },
      include: { trip: true },
    });
    if (!segment || segment.trip.userId !== userId) {
      throw new NotFoundException('Segment not found');
    }

    await this.prisma.segment.update({
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

    return this.getTripWithDetails(segment.tripId, userId);
  }


  async addSegmentAttachment(
    userId: string,
    segmentId: string,
    data: { path: string; originalName: string; mimeType?: string; size?: number },
  ) {
    const segment = await this.prisma.segment.findUnique({
      where: { id: segmentId },
      include: { trip: true },
    });
    if (!segment || segment.trip.userId !== userId) {
      throw new NotFoundException('Segment not found');
    }

    return this.prisma.attachment.create({
      data: {
        segmentId,
        path: data.path,
        originalName: data.originalName,
        mimeType: data.mimeType,
        size: data.size,
      },
    });
  }



  async deleteSegmentAttachment(
    userId: string,
    segmentId: string,
    attachmentId: string,
  ) {
    const segment = await this.prisma.segment.findUnique({
      where: { id: segmentId },
      include: { trip: true },
    });
    if (!segment || segment.trip.userId !== userId) {
      throw new NotFoundException('Segment not found');
    }

    const attachment = await this.prisma.attachment.findFirst({
      where: { id: attachmentId, segmentId },
    });
    if (!attachment) {
      throw new NotFoundException('Attachment not found');
    }

    this.removeFileIfExists(attachment.path);

    await this.prisma.attachment.delete({ where: { id: attachmentId } });
    return { success: true };
  }

  async deleteSegment(userId: string, segmentId: string) {
    const segment = await this.prisma.segment.findUnique({
      where: { id: segmentId },
      include: { trip: true },
    });
    if (!segment || segment.trip.userId !== userId) {
      throw new NotFoundException('Segment not found');
    }

    const attachments = await this.prisma.attachment.findMany({
      where: { segmentId },
    });
    attachments.forEach((att) => this.removeFileIfExists(att.path));

    await this.prisma.$transaction([
      this.prisma.attachment.deleteMany({ where: { segmentId } }),
      this.prisma.segment.delete({ where: { id: segmentId } }),
    ]);

    return { success: true };
  }
}

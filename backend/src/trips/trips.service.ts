import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../prisma.service';
import { CreateTripDto } from './dto/create-trip.dto';
import { UpdateTripDto } from './dto/update-trip.dto';
import { join } from 'path';
import * as fs from 'fs';

@Injectable()
export class TripsService {
  constructor(private prisma: PrismaService) {}

  private removeFileIfExists(path: string | null | undefined) {
    if (!path) return;
    const cleaned = path.replace(/^\/+/, '');
    const abs = join(process.cwd(), cleaned);
    try {
      if (fs.existsSync(abs)) {
        fs.unlinkSync(abs);
      }
    } catch {
      // Best-effort cleanup; ignore filesystem errors
    }
  }

  listTrips(userId: string) {
    return this.prisma.trip.findMany({
      where: { userId },
      orderBy: { startDate: 'asc' },
    });
  }

  async getTrip(userId: string, tripId: string) {
    const trip = await this.prisma.trip.findFirst({
      where: { id: tripId, userId },
      include: {
        segments: { orderBy: { startTime: 'asc' }, include: { attachments: true } },
        attachments: true,
      },
    });
    if (!trip) {
      throw new NotFoundException('Trip not found');
    }
    return trip;
  }

  createTrip(userId: string, dto: CreateTripDto) {
    return this.prisma.trip.create({
      data: {
        userId,
        title: dto.title,
        mainLocation: dto.mainLocation,
        startDate: new Date(dto.startDate),
        endDate: new Date(dto.endDate),
        notes: dto.notes,
      },
    });
  }

  async updateTrip(userId: string, tripId: string, dto: UpdateTripDto) {
    await this.getTrip(userId, tripId);
    return this.prisma.trip.update({
      where: { id: tripId },
      data: {
        title: dto.title,
        mainLocation: dto.mainLocation,
        startDate: dto.startDate ? new Date(dto.startDate) : undefined,
        endDate: dto.endDate ? new Date(dto.endDate) : undefined,
        notes: dto.notes,
      },
    });
  }

  async updateTripImage(userId: string, tripId: string, imagePath: string) {
    await this.getTrip(userId, tripId);
    return this.prisma.trip.update({
      where: { id: tripId },
      data: {
        imagePath,
      },
    });
  }


  async addTripAttachment(
    userId: string,
    tripId: string,
    data: { path: string; originalName: string; mimeType?: string; size?: number },
  ) {
    const trip = await this.prisma.trip.findFirst({
      where: { id: tripId, userId },
    });
    if (!trip) {
      throw new NotFoundException('Trip not found');
    }

    return this.prisma.attachment.create({
      data: {
        tripId,
        path: data.path,
        originalName: data.originalName,
        mimeType: data.mimeType,
        size: data.size,
      },
    });
  }


  async deleteTripAttachment(userId: string, tripId: string, attachmentId: string) {
    const trip = await this.prisma.trip.findFirst({
      where: { id: tripId, userId },
    });
    if (!trip) {
      throw new NotFoundException('Trip not found');
    }

    const attachment = await this.prisma.attachment.findFirst({
      where: { id: attachmentId, tripId },
    });
    if (!attachment) {
      throw new NotFoundException('Attachment not found');
    }

    this.removeFileIfExists(attachment.path);
    await this.prisma.attachment.delete({ where: { id: attachmentId } });
    return { success: true };
  }

  async deleteTrip(userId: string, tripId: string) {
    await this.getTrip(userId, tripId);

    const attachments = await this.prisma.attachment.findMany({
      where: {
        OR: [{ tripId }, { segment: { tripId } }],
      },
    });

    attachments.forEach((att) => this.removeFileIfExists(att.path));

    await this.prisma.$transaction([
      this.prisma.attachment.deleteMany({
        where: { OR: [{ tripId }, { segment: { tripId } }] },
      }),
      this.prisma.segment.deleteMany({ where: { tripId } }),
      this.prisma.trip.delete({ where: { id: tripId } }),
    ]);

    return { success: true };
  }
}

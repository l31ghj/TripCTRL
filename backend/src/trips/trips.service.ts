import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../prisma.service';
import { CreateTripDto } from './dto/create-trip.dto';
import { UpdateTripDto } from './dto/update-trip.dto';
import * as fs from 'fs';
import { join } from 'path';


@Injectable()
export class TripsService {
  constructor(private prisma: PrismaService) {}

  listTrips(userId: string) {
    return this.prisma.trip.findMany({
      where: { userId },
      orderBy: { startDate: 'asc' },
    });
  }

  async getTrip(userId: string, tripId: string) {
    const trip = await this.prisma.trip.findFirst({
      where: { id: tripId, userId },
      include: { segments: { orderBy: { startTime: 'asc' } } },
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

  async deleteTrip(userId: string, tripId: string) {
    const trip = await this.getTrip(userId, tripId);

    // Clean up any uploaded cover image from disk. We ignore errors if the file is missing.
    if (trip.imagePath) {
      const relativePath = trip.imagePath.startsWith('/')
        ? trip.imagePath.slice(1)
        : trip.imagePath;
      const filePath = join(process.cwd(), relativePath);
      try {
        await fs.promises.unlink(filePath);
      } catch (err: any) {
        // Ignore file-not-found or other filesystem errors to avoid blocking trip deletion
      }
    }

    await this.prisma.segment.deleteMany({ where: { tripId } });
    return this.prisma.trip.delete({ where: { id: tripId } });
  }
}

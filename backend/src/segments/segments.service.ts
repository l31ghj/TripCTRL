import { ForbiddenException, Injectable, NotFoundException, OnModuleInit } from '@nestjs/common';
import { PrismaService } from '../prisma.service';
import { CreateSegmentDto } from './dto/create-segment.dto';
import { UpdateSegmentDto } from './dto/update-segment.dto';
import { join } from 'path';
import * as fs from 'fs';
import { TripPermission, UserRole } from '@prisma/client';
import { FlightService } from '../flights/flight.service';

@Injectable()
export class SegmentsService implements OnModuleInit {
  private flightTimer: NodeJS.Timeout | null = null;

  constructor(
    private prisma: PrismaService,
    private flights: FlightService,
  ) {}

  onModuleInit() {
    const enabled = process.env.FLIGHT_SYNC_ENABLED !== 'false';
    if (!enabled) return;
    // Refresh hourly
    this.flightTimer = setInterval(() => {
      this.refreshTodayFlights().catch((err) => {
        // eslint-disable-next-line no-console
        console.error('Flight sync failed', err);
      });
    }, 60 * 60 * 1000);
  }

  private permissionRank: Record<TripPermission, number> = {
    view: 1,
    edit: 2,
    owner: 3,
  };

  private satisfies(required: TripPermission, actual: TripPermission) {
    return this.permissionRank[actual] >= this.permissionRank[required];
  }

  private async assertTripPermission(tripId: string, userId: string, userRole: UserRole, required: TripPermission) {
    const trip = await this.prisma.trip.findUnique({
      where: { id: tripId },
      include: { shares: { where: { userId } } },
    });
    if (!trip) {
      throw new NotFoundException('Trip not found');
    }

    const permission =
      userRole === UserRole.admin
        ? TripPermission.owner
        : trip.userId === userId
          ? TripPermission.owner
          : trip.shares[0]?.permission;

    if (!permission) {
      throw new NotFoundException('Trip not found');
    }

    if (!this.satisfies(required, permission)) {
      throw new ForbiddenException('Not enough permissions for this trip');
    }

    return trip;
  }

  private async getTripWithDetails(tripId: string) {
    return this.prisma.trip.findUnique({
      where: { id: tripId },
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

  async createSegment(userId: string, userRole: UserRole, tripId: string, dto: CreateSegmentDto) {
    await this.assertTripPermission(tripId, userId, userRole, TripPermission.edit);

    const created = await this.prisma.segment.create({
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

    await this.maybeEnrichFlight(created.id, dto.transportMode, dto.flightNumber, dto.startTime);

    return this.getTripWithDetails(tripId);
  }

  async updateSegment(userId: string, userRole: UserRole, segmentId: string, dto: UpdateSegmentDto) {
    const segment = await this.prisma.segment.findUnique({
      where: { id: segmentId },
      include: { trip: true },
    });
    if (!segment) {
      throw new NotFoundException('Segment not found');
    }

    await this.assertTripPermission(segment.tripId, userId, userRole, TripPermission.edit);

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

    const startTime = dto.startTime ? dto.startTime.toString() : segment.startTime.toISOString();
    const flightNumber = dto.flightNumber ?? segment.flightNumber ?? undefined;
    await this.maybeEnrichFlight(segmentId, dto.transportMode ?? segment.transportMode, flightNumber, startTime);

    return this.getTripWithDetails(segment.tripId);
  }


  async addSegmentAttachment(
    userId: string,
    userRole: UserRole,
    segmentId: string,
    data: { path: string; originalName: string; mimeType?: string; size?: number },
  ) {
    const segment = await this.prisma.segment.findUnique({
      where: { id: segmentId },
      include: { trip: true },
    });
    if (!segment) {
      throw new NotFoundException('Segment not found');
    }

    await this.assertTripPermission(segment.tripId, userId, userRole, TripPermission.edit);

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
    userRole: UserRole,
    segmentId: string,
    attachmentId: string,
  ) {
    const segment = await this.prisma.segment.findUnique({
      where: { id: segmentId },
      include: { trip: true },
    });
    if (!segment) {
      throw new NotFoundException('Segment not found');
    }

    await this.assertTripPermission(segment.tripId, userId, userRole, TripPermission.edit);

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

  async deleteSegment(userId: string, userRole: UserRole, segmentId: string) {
    const segment = await this.prisma.segment.findUnique({
      where: { id: segmentId },
      include: { trip: true },
    });
    if (!segment) {
      throw new NotFoundException('Segment not found');
    }

    await this.assertTripPermission(segment.tripId, userId, userRole, TripPermission.edit);

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

  private async maybeEnrichFlight(
    segmentId: string,
    transportMode?: string | null,
    flightNumber?: string | null,
    startTime?: string | Date | null,
  ) {
    if (transportMode !== 'flight') return;
    if (!flightNumber || !startTime) return;
    const date = new Date(startTime);
    if (Number.isNaN(date.getTime())) return;
    const flightDate = date.toISOString().slice(0, 10);
    const now = new Date();
    try {
      const data = await this.flights.fetchByNumberAndDate(flightNumber, flightDate);
      if (!data) {
        await this.prisma.segment.update({
          where: { id: segmentId },
          data: {
            flightLastFetchedAt: now,
            flightLastStatus: 'not_found',
            flightAutoSync: true,
          },
        });
        return;
      }

      await this.prisma.segment.update({
        where: { id: segmentId },
        data: {
          ...data,
          flightLastFetchedAt: now,
          flightLastStatus: 'ok',
          flightAutoSync: true,
        },
      });
    } catch (err: any) {
      await this.prisma.segment.update({
        where: { id: segmentId },
        data: {
          flightLastFetchedAt: now,
          flightLastStatus: 'error',
          flightAutoSync: true,
        },
      });
    }
  }

  private async refreshTodayFlights() {
    const enabled = process.env.FLIGHT_SYNC_ENABLED !== 'false';
    if (!enabled) return;

    const now = new Date();
    const startOfDay = new Date(now);
    startOfDay.setHours(0, 0, 0, 0);
    const endOfDay = new Date(now);
    endOfDay.setHours(23, 59, 59, 999);

    const segments = await this.prisma.segment.findMany({
      where: {
        transportMode: 'flight',
        flightAutoSync: true,
        startTime: { gte: startOfDay, lte: endOfDay },
      },
      select: {
        id: true,
        flightNumber: true,
        startTime: true,
        flightLastFetchedAt: true,
      },
    });

    for (const seg of segments) {
      const last = seg.flightLastFetchedAt ? new Date(seg.flightLastFetchedAt).getTime() : 0;
      if (now.getTime() - last < 50 * 60 * 1000) continue; // refresh at most hourly-ish
      await this.maybeEnrichFlight(seg.id, 'flight', seg.flightNumber, seg.startTime.toISOString());
    }
  }
}

import { Injectable, NotFoundException, ForbiddenException } from '@nestjs/common';
import { PrismaService } from '../prisma.service';
import { CreateTripDto } from './dto/create-trip.dto';
import { UpdateTripDto } from './dto/update-trip.dto';
import { join } from 'path';
import * as fs from 'fs';
import { TripPermission, UserRole } from '@prisma/client';

@Injectable()
export class TripsService {
  constructor(private prisma: PrismaService) {}

  private permissionRank: Record<TripPermission, number> = {
    view: 1,
    edit: 2,
    owner: 3,
  };

  private satisfies(required: TripPermission, actual: TripPermission) {
    return this.permissionRank[actual] >= this.permissionRank[required];
  }

  private async resolveTripPermission(tripId: string, userId: string, userRole?: UserRole) {
    const trip = await this.prisma.trip.findUnique({
      where: { id: tripId },
      include: { shares: { where: { userId } } },
    });
    if (!trip) return null;

    if (userRole === UserRole.admin) {
      return { trip, permission: TripPermission.owner };
    }

    if (trip.userId === userId) {
      return { trip, permission: TripPermission.owner };
    }

    const share = trip.shares[0];
    if (share) {
      return { trip, permission: share.permission };
    }

    return null;
  }

  private async assertPermission(tripId: string, userId: string, userRole: UserRole, required: TripPermission) {
    const result = await this.resolveTripPermission(tripId, userId, userRole);
    if (!result) {
      throw new NotFoundException('Trip not found');
    }
    if (!this.satisfies(required, result.permission)) {
      throw new ForbiddenException('Not enough permissions for this trip');
    }
    return result.trip;
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
      // Best-effort cleanup; ignore filesystem errors
    }
  }

  listTrips(userId: string, userRole: UserRole) {
    if (userRole === UserRole.admin) {
      return this.prisma.trip.findMany({
        orderBy: { startDate: 'asc' },
      });
    }

    return this.prisma.trip
      .findMany({
        where: {
          OR: [
            { userId },
            {
              shares: {
                some: {
                  userId,
                },
              },
            },
          ],
        },
        orderBy: { startDate: 'asc' },
        include: { shares: { where: { userId }, select: { permission: true } } },
      })
      .then((trips) =>
        trips.map((trip) => {
          const { shares, ...rest } = trip as any;
          return {
            ...rest,
            accessPermission:
              trip.userId === userId ? TripPermission.owner : trip.shares[0]?.permission ?? TripPermission.view,
          };
        }),
      );
  }

  async getTrip(userId: string, userRole: UserRole, tripId: string) {
    const access = await this.resolveTripPermission(tripId, userId, userRole);
    if (!access) {
      throw new NotFoundException('Trip not found');
    }

    const trip = await this.prisma.trip.findUnique({
      where: { id: tripId },
      include: {
        segments: { orderBy: { startTime: 'asc' }, include: { attachments: true } },
        attachments: true,
      },
    });

    if (!trip) {
      throw new NotFoundException('Trip not found');
    }

    return { ...trip, accessPermission: access.permission };
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
        planning: {},
      },
    });
  }

  async updateTrip(userId: string, userRole: UserRole, tripId: string, dto: UpdateTripDto) {
    await this.assertPermission(tripId, userId, userRole, TripPermission.edit);
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

  async updateTripImage(userId: string, userRole: UserRole, tripId: string, imagePath: string) {
    await this.assertPermission(tripId, userId, userRole, TripPermission.edit);
    return this.prisma.trip.update({
      where: { id: tripId },
      data: {
        imagePath,
      },
    });
  }


  async addTripAttachment(
    userId: string,
    userRole: UserRole,
    tripId: string,
    data: { path: string; originalName: string; mimeType?: string; size?: number },
  ) {
    await this.assertPermission(tripId, userId, userRole, TripPermission.edit);

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


  async deleteTripAttachment(userId: string, userRole: UserRole, tripId: string, attachmentId: string) {
    await this.assertPermission(tripId, userId, userRole, TripPermission.edit);

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

  async deleteTrip(userId: string, userRole: UserRole, tripId: string) {
    await this.assertPermission(tripId, userId, userRole, TripPermission.owner);

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
      this.prisma.tripShare.deleteMany({ where: { tripId } }),
      this.prisma.trip.delete({ where: { id: tripId } }),
    ]);

    return { success: true };
  }

  async getPlanning(userId: string, userRole: UserRole, tripId: string) {
    await this.assertPermission(tripId, userId, userRole, TripPermission.view);
    const trip = await this.prisma.trip.findUnique({
      where: { id: tripId },
      select: { planning: true },
    });
    if (!trip) throw new NotFoundException('Trip not found');
    return { planning: trip.planning ?? {} };
  }

  async updatePlanning(
    userId: string,
    userRole: UserRole,
    tripId: string,
    planning: Record<string, any>,
  ) {
    await this.assertPermission(tripId, userId, userRole, TripPermission.edit);
    await this.prisma.trip.update({
      where: { id: tripId },
      data: { planning },
    });
    return { planning };
  }

  async listShares(userId: string, userRole: UserRole, tripId: string) {
    await this.assertPermission(tripId, userId, userRole, TripPermission.owner);
    return this.prisma.tripShare.findMany({
      where: { tripId },
      include: {
        user: {
          select: { id: true, email: true, role: true, status: true, createdAt: true },
        },
      },
    });
  }

  async addShare(
    userId: string,
    userRole: UserRole,
    tripId: string,
    payload: { targetUserId?: string; email?: string; permission: TripPermission },
  ) {
    const trip = await this.assertPermission(tripId, userId, userRole, TripPermission.owner);

    if (payload.permission === TripPermission.owner) {
      throw new ForbiddenException('Cannot assign owner permission');
    }

    const targetUser =
      payload.targetUserId
        ? await this.prisma.user.findUnique({ where: { id: payload.targetUserId } })
        : payload.email
          ? await this.prisma.user.findUnique({ where: { email: payload.email } })
          : null;

    if (!targetUser) {
      throw new NotFoundException('User not found');
    }

    if (trip.userId === targetUser.id) {
      throw new ForbiddenException('Owner already has full access');
    }

    return this.prisma.tripShare.upsert({
      where: { tripId_userId: { tripId, userId: targetUser.id } },
      create: { tripId, userId: targetUser.id, permission: payload.permission },
      update: { permission: payload.permission },
      include: {
        user: { select: { id: true, email: true, role: true, status: true, createdAt: true } },
      },
    });
  }

  async removeShare(userId: string, userRole: UserRole, tripId: string, shareId: string) {
    await this.assertPermission(tripId, userId, userRole, TripPermission.owner);

    const share = await this.prisma.tripShare.findUnique({ where: { id: shareId } });
    if (!share || share.tripId !== tripId) {
      throw new NotFoundException('Share not found');
    }

    await this.prisma.tripShare.delete({ where: { id: shareId } });
    return { success: true };
  }
}

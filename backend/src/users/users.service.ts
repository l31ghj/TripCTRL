import { Injectable } from '@nestjs/common';
import { UserStatus, UserRole } from '@prisma/client';
import { PrismaService } from '../prisma.service';

@Injectable()
export class UsersService {
  constructor(private prisma: PrismaService) {}

  findByEmail(email: string) {
    return this.prisma.user.findUnique({ where: { email } });
  }

  findById(id: string) {
    return this.prisma.user.findUnique({ where: { id } });
  }

  countUsers() {
    return this.prisma.user.count();
  }

  create(email: string, passwordHash: string, options?: { role?: UserRole; status?: UserStatus }) {
    return this.prisma.user.create({
      data: {
        email,
        password: passwordHash,
        role: options?.role ?? UserRole.member,
        status: options?.status ?? UserStatus.pending,
      },
    });
  }

  listAll() {
    return this.prisma.user.findMany({
      orderBy: { createdAt: 'asc' },
      select: {
        id: true,
        email: true,
        role: true,
        status: true,
        createdAt: true,
      },
    });
  }

  updateRole(userId: string, role: UserRole) {
    return this.prisma.user.update({ where: { id: userId }, data: { role } });
  }

  updateStatus(userId: string, status: UserStatus) {
    return this.prisma.user.update({ where: { id: userId }, data: { status } });
  }
}

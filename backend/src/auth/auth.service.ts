import { Injectable, UnauthorizedException } from '@nestjs/common';
import { UsersService } from '../users/users.service';
import { JwtService } from '@nestjs/jwt';
import * as bcrypt from 'bcrypt';
import { UserRole, UserStatus } from '@prisma/client';

@Injectable()
export class AuthService {
  constructor(
    private users: UsersService,
    private jwt: JwtService,
  ) {}

  async register(email: string, password: string) {
    const existing = await this.users.findByEmail(email);
    if (existing) {
      throw new UnauthorizedException('Email already in use');
    }
    const userCount = await this.users.countUsers();
    const isFirstUser = userCount === 0;
    const hash = await bcrypt.hash(password, 10);
    const user = await this.users.create(email, hash, {
      role: isFirstUser ? UserRole.admin : UserRole.member,
      status: isFirstUser ? UserStatus.active : UserStatus.pending,
    });

    if (!isFirstUser) {
      return { status: 'pending', message: 'Account pending admin approval' };
    }

    return this.signToken(user.id, user.email, user.role);
  }

  async login(email: string, password: string) {
    const user = await this.users.findByEmail(email);
    if (!user) throw new UnauthorizedException('Invalid credentials');

    const valid = await bcrypt.compare(password, user.password);
    if (!valid) throw new UnauthorizedException('Invalid credentials');

    // If migrating existing users, default missing status to active to avoid lockout
    if (!user.status) {
      await this.users.updateStatus(user.id, UserStatus.active);
      user.status = UserStatus.active;
    }

    if (user.status === UserStatus.pending) {
      const activeAdmins = await this.users.countActiveAdmins();
      // Safety valve: if no active admins exist, promote/activate this user so the system is not locked out
      if (activeAdmins === 0) {
        await this.users.updateStatus(user.id, UserStatus.active);
        await this.users.updateRole(user.id, UserRole.admin);
        user.status = UserStatus.active;
        user.role = UserRole.admin;
      } else {
        throw new UnauthorizedException('Account pending approval');
      }
    }
    if (user.status === UserStatus.rejected) {
      throw new UnauthorizedException('Account rejected');
    }

    return this.signToken(user.id, user.email, user.role);
  }

  signToken(userId: string, email: string, role: UserRole) {
    const payload = { sub: userId, email, role };
    return {
      accessToken: this.jwt.sign(payload),
    };
  }
}

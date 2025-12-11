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

    if (user.status === UserStatus.pending) {
      throw new UnauthorizedException('Account pending approval');
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

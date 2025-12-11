import { Injectable, UnauthorizedException } from '@nestjs/common';
import { PassportStrategy } from '@nestjs/passport';
import { ExtractJwt, Strategy } from 'passport-jwt';
import { UsersService } from '../users/users.service';
import { UserStatus } from '@prisma/client';

const jwtSecret = process.env.JWT_SECRET as string;
if (!jwtSecret) {
  throw new Error('JWT_SECRET is not set');
}

@Injectable()
export class JwtStrategy extends PassportStrategy(Strategy) {
  constructor(private users: UsersService) {
    super({
      jwtFromRequest: ExtractJwt.fromAuthHeaderAsBearerToken(),
      ignoreExpiration: false,
      secretOrKey: jwtSecret,
    });
  }

  async validate(payload: { sub: string; email: string; role: string }) {
    const user = await this.users.findById(payload.sub);
    if (!user) {
      throw new UnauthorizedException('User not found');
    }
    if (user.status !== UserStatus.active) {
      throw new UnauthorizedException('User not active');
    }
    return { userId: user.id, email: user.email, role: user.role };
  }
}

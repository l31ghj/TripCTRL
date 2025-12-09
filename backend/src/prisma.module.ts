import { Global, Module } from '@nestjs/common';
import { PrismaService } from './prisma.service';

/**
 * Shared Prisma provider so we only maintain a single client/connection.
 */
@Global()
@Module({
  providers: [PrismaService],
  exports: [PrismaService],
})
export class PrismaModule {}

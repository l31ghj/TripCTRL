import { Module } from '@nestjs/common';
import { AuthModule } from './auth/auth.module';
import { UsersModule } from './users/users.module';
import { TripsModule } from './trips/trips.module';
import { SegmentsModule } from './segments/segments.module';
import { PrismaService } from './prisma.service';

@Module({
  imports: [AuthModule, UsersModule, TripsModule, SegmentsModule],
  providers: [PrismaService],
  exports: [PrismaService],
})
export class AppModule {}

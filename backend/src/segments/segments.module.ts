import { Module } from '@nestjs/common';
import { SegmentsService } from './segments.service';
import { SegmentsController } from './segments.controller';
import { PrismaService } from '../prisma.service';

@Module({
  controllers: [SegmentsController],
  providers: [SegmentsService, PrismaService],
})
export class SegmentsModule {}

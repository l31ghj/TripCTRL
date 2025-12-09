import { Module } from '@nestjs/common';
import { SegmentsService } from './segments.service';
import { SegmentsController } from './segments.controller';
import { PrismaModule } from '../prisma.module';

@Module({
  imports: [PrismaModule],
  controllers: [SegmentsController],
  providers: [SegmentsService],
})
export class SegmentsModule {}

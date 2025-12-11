import {
  Body,
  Controller,
  Delete,
  Param,
  Post,
  Put,
  Req,
  UseGuards,
  UploadedFile,
  UseInterceptors,
  BadRequestException,
} from '@nestjs/common';
import { SegmentsService } from './segments.service';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { FileInterceptor } from '@nestjs/platform-express';
import { diskStorage } from 'multer';
import { extname } from 'path';

import { CreateSegmentDto } from './dto/create-segment.dto';
import { UpdateSegmentDto } from './dto/update-segment.dto';


function segmentAttachmentStorage() {
  return diskStorage({
    destination: 'uploads/attachments',
    filename: (_req: any, file: any, cb: any) => {
      const unique = `${Date.now()}-${Math.round(Math.random() * 1e9)}`;
      const extension = extname(file.originalname) || '';
      cb(null, `${unique}${extension}`);
    },
  });
}

@UseGuards(JwtAuthGuard)
@Controller()
export class SegmentsController {
  constructor(private segments: SegmentsService) {}

  @Post('trips/:tripId/segments')
  create(
    @Req() req: any,
    @Param('tripId') tripId: string,
    @Body() dto: CreateSegmentDto,
  ) {
    return this.segments.createSegment(req.user.userId, req.user.role, tripId, dto);
  }

  @Put('segments/:id')
  update(
    @Req() req: any,
    @Param('id') id: string,
    @Body() dto: UpdateSegmentDto,
  ) {
    return this.segments.updateSegment(req.user.userId, req.user.role, id, dto);
  }


  @Post('segments/:id/attachments')
  @UseInterceptors(
    FileInterceptor('file', {
      storage: segmentAttachmentStorage(),
      limits: { fileSize: 20 * 1024 * 1024 },
    }),
  )
  async uploadSegmentAttachment(
    @Req() req: any,
    @Param('id') id: string,
    @UploadedFile() file: any,
  ) {
    if (!file) {
      throw new BadRequestException('No file uploaded');
    }
    const publicPath = `/uploads/attachments/${file.filename}`;
    return this.segments.addSegmentAttachment(req.user.userId, req.user.role, id, {
      path: publicPath,
      originalName: file.originalname,
      mimeType: file.mimetype,
      size: file.size,
    });
  }


  @Delete('segments/:id/attachments/:attachmentId')
  removeAttachment(
    @Req() req: any,
    @Param('id') id: string,
    @Param('attachmentId') attachmentId: string,
  ) {
    return this.segments.deleteSegmentAttachment(req.user.userId, req.user.role, id, attachmentId);
  }

  @Delete('segments/:id')
  remove(@Req() req: any, @Param('id') id: string) {
    return this.segments.deleteSegment(req.user.userId, req.user.role, id);
  }
}

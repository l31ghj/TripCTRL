import {
  Body,
  Controller,
  Delete,
  Get,
  Param,
  Post,
  Put,
  Req,
  UploadedFile,
  UseGuards,
  UseInterceptors,
  BadRequestException,
} from '@nestjs/common';
import { FileInterceptor } from '@nestjs/platform-express';
import { diskStorage } from 'multer';
import { extname } from 'path';
import { TripsService } from './trips.service';
import { CreateTripDto } from './dto/create-trip.dto';
import { UpdateTripDto } from './dto/update-trip.dto';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { ShareTripDto } from './dto/share-trip.dto';

function tripImageStorage() {
  return diskStorage({
    destination: 'uploads/trips',
    filename: (_req: any, file: any, cb: any) => {
      const unique = `${Date.now()}-${Math.round(Math.random() * 1e9)}`;
      const extension = extname(file.originalname) || '.jpg';
      cb(null, `${unique}${extension}`);
    },
  });
}

function attachmentStorage() {
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
@Controller('trips')
export class TripsController {
  constructor(private readonly trips: TripsService) {}

  @Get()
  list(@Req() req: any) {
    return this.trips.listTrips(req.user.userId, req.user.role);
  }

  @Get(':id')
  getOne(@Req() req: any, @Param('id') id: string) {
    return this.trips.getTrip(req.user.userId, req.user.role, id);
  }

  @Post()
  create(@Req() req: any, @Body() dto: CreateTripDto) {
    return this.trips.createTrip(req.user.userId, dto);
  }

  @Put(':id')
  update(
    @Req() req: any,
    @Param('id') id: string,
    @Body() dto: UpdateTripDto,
  ) {
    return this.trips.updateTrip(req.user.userId, req.user.role, id, dto);
  }

  @Post(':id/image')
  @UseInterceptors(
    FileInterceptor('file', {
      storage: tripImageStorage(),
      limits: { fileSize: 5 * 1024 * 1024 },
      fileFilter: (_req, file, cb) => {
        if (!file.mimetype.startsWith('image/')) {
          return cb(new BadRequestException('Only image uploads allowed'), false);
        }
        cb(null, true);
      },
    }),
  )
  async uploadImage(
    @Req() req: any,
    @Param('id') id: string,
    @UploadedFile() file: any,
  ) {
    const publicPath = `/uploads/trips/${file.filename}`;
    return this.trips.updateTripImage(req.user.userId, req.user.role, id, publicPath);
  }


  @Post(':id/attachments')
  @UseInterceptors(
    FileInterceptor('file', {
      storage: attachmentStorage(),
      limits: { fileSize: 20 * 1024 * 1024 },
    }),
  )
  async uploadAttachment(
    @Req() req: any,
    @Param('id') id: string,
    @UploadedFile() file: any,
  ) {
    if (!file) {
      throw new BadRequestException('No file uploaded');
    }
    const publicPath = `/uploads/attachments/${file.filename}`;
    return this.trips.addTripAttachment(req.user.userId, req.user.role, id, {
      path: publicPath,
      originalName: file.originalname,
      mimeType: file.mimetype,
      size: file.size,
    });
  }


  @Delete(':id/attachments/:attachmentId')
  removeAttachment(
    @Req() req: any,
    @Param('id') id: string,
    @Param('attachmentId') attachmentId: string,
  ) {
    return this.trips.deleteTripAttachment(req.user.userId, req.user.role, id, attachmentId);
  }

  @Delete(':id')
  remove(@Req() req: any, @Param('id') id: string) {
    return this.trips.deleteTrip(req.user.userId, req.user.role, id);
  }

  @Get(':id/shares')
  listShares(@Req() req: any, @Param('id') id: string) {
    return this.trips.listShares(req.user.userId, req.user.role, id);
  }

  @Post(':id/shares')
  addShare(@Req() req: any, @Param('id') id: string, @Body() dto: ShareTripDto) {
    return this.trips.addShare(req.user.userId, req.user.role, id, dto.userId, dto.permission);
  }

  @Delete(':id/shares/:shareId')
  removeShare(@Req() req: any, @Param('id') id: string, @Param('shareId') shareId: string) {
    return this.trips.removeShare(req.user.userId, req.user.role, id, shareId);
  }
}

import { Injectable } from '@nestjs/common';
import { PrismaService } from '../prisma.service';

@Injectable()
export class SettingsService {
  constructor(private prisma: PrismaService) {}

  async get(key: string): Promise<string | null> {
    const setting = await this.prisma.setting.findUnique({ where: { key } });
    return setting?.value ?? null;
  }

  async set(key: string, value: string) {
    return this.prisma.setting.upsert({
      where: { key },
      create: { key, value },
      update: { value },
    });
  }

  async delete(key: string) {
    return this.prisma.setting.delete({ where: { key } }).catch(() => null);
  }
}

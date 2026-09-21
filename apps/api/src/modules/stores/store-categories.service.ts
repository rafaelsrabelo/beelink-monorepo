// Nest
import { Injectable } from '@nestjs/common';

// Types
import type { StoreCategory } from '@harness-monorepo/contracts';

// App
import { PrismaService } from '../../shared/prisma/prisma.service.js';
import { toStoreCategory } from './store.mapper.js';

@Injectable()
export class StoreCategoriesService {
  constructor(private readonly prisma: PrismaService) {}

  /** By name — the ordering the legacy `GET /api/categories` answered with. */
  async all(): Promise<StoreCategory[]> {
    const rows = await this.prisma.storeCategory.findMany({ orderBy: { name: 'asc' } });
    return rows.map(toStoreCategory);
  }
}

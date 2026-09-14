// Nest
import { Injectable } from '@nestjs/common';
import type { OnModuleDestroy, OnModuleInit } from '@nestjs/common';

// Libs
import { PrismaPg } from '@prisma/adapter-pg';

// App
import { PrismaClient } from '../../generated/prisma/client.js';
import { env } from '../config/env.js';

@Injectable()
export class PrismaService extends PrismaClient implements OnModuleInit, OnModuleDestroy {
  constructor() {
    super({ adapter: new PrismaPg({ connectionString: env.DATABASE_URL }) });
  }

  // Connecting at boot turns an unreachable database into a failed start (P1001), not a failed first request.
  async onModuleInit(): Promise<void> {
    await this.$connect();
  }

  async onModuleDestroy(): Promise<void> {
    await this.$disconnect();
  }
}

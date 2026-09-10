// Nest
import { Module } from '@nestjs/common';

// Libs
import { LoggerModule } from 'nestjs-pino';

// App
import { HealthController } from './health.controller.js';
import { TasksModule } from './modules/tasks/tasks.module.js';
import { env } from './shared/config/env.js';
import { PrismaModule } from './shared/prisma/prisma.module.js';

@Module({
  imports: [
    LoggerModule.forRoot({
      pinoHttp: {
        level: env.LOG_LEVEL,
        // Pretty lines for a person at a terminal; JSON wherever a machine reads the logs.
        transport:
          env.NODE_ENV === 'development'
            ? { target: 'pino-pretty', options: { singleLine: true } }
            : undefined,
        redact: ['req.headers.authorization', 'req.headers.cookie'],
      },
    }),
    PrismaModule,
    TasksModule,
  ],
  controllers: [HealthController],
})
export class AppModule {}

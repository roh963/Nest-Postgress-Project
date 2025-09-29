import { Module, ClassSerializerInterceptor } from '@nestjs/common';
import { APP_INTERCEPTOR, APP_FILTER } from '@nestjs/core';
import { AppController } from './app.controller';
import { AppService } from './app.service';
import { ConfigModule } from './config/config.module'; // Import custom ConfigModule
import { HealthModule } from './health/health.module';
import { UsersModule } from './users/users.module';
import { FeedbackModule } from './feedback/feedback.module';
import { PrismaModule } from './prisma/prisma.module';
import { LoggingInterceptor } from './common/interceptors/logging.interceptor';
import { HttpExceptionFilter } from './common/filters/http-exception.filter';

@Module({
  imports: [
    ConfigModule, // Loads and validates env
    HealthModule,
    UsersModule,
    FeedbackModule,
    PrismaModule,
  ],
  controllers: [AppController],
  providers: [
    AppService,
    { provide: APP_INTERCEPTOR, useClass: ClassSerializerInterceptor },
    { provide: APP_INTERCEPTOR, useClass: LoggingInterceptor },
    { provide: APP_FILTER, useClass: HttpExceptionFilter },
  ],
})
export class AppModule {}
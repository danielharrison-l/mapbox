import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { PrismaModule } from './database/prisma/prisma.module';
import { DeliverablesModule } from './modules/deliverables/deliverables.module';
import { GeoModule } from './modules/geo/geo.module';
import { HealthModule } from './modules/health/health.module';

@Module({
  imports: [
    ConfigModule.forRoot({
      isGlobal: true,
    }),
    PrismaModule,
    HealthModule,
    DeliverablesModule,
    GeoModule,
  ],
})
export class AppModule {}

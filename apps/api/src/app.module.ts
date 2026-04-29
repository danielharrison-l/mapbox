import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { TypeOrmDatabaseModule } from './database/typeorm/typeorm.module';
import { DeliverablesModule } from './modules/deliverables/deliverables.module';
import { GeoModule } from './modules/geo/geo.module';
import { HealthModule } from './modules/health/health.module';

@Module({
  imports: [
    ConfigModule.forRoot({
      isGlobal: true,
      envFilePath: ['.env', 'apps/api/.env', '../../.env'],
    }),
    TypeOrmDatabaseModule,
    HealthModule,
    DeliverablesModule,
    GeoModule,
  ],
})
export class AppModule {}

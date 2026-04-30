import { Module } from '@nestjs/common';
import { TypeOrmDatabaseModule } from './database/typeorm/typeorm.module';
import { DeliverablesModule } from './modules/deliverables/deliverables.module';
import { GeoModule } from './modules/geo/geo.module';
import { HealthModule } from './modules/health/health.module';

@Module({
  imports: [TypeOrmDatabaseModule, HealthModule, DeliverablesModule, GeoModule],
})
export class AppModule {}

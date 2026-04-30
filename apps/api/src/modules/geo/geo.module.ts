import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { SeedMunicipalitiesService } from './application/seed/seed-municipalities.service';
import { GEO_USE_CASE_PROVIDERS } from './application/usecases/providers/usecases.providers';
import { InfrastructurePointController } from './http/controllers/infrastructure-point.controller';
import { MeteorologyAssetController } from './http/controllers/meteorology-asset.controller';
import { MunicipalityController } from './http/controllers/municipality.controller';
import { GEO_ENTITIES } from './infrastructure/persistence/entities/token/entities.token';
import {
  GEO_REPOSITORY_PROVIDERS,
  GEO_REPOSITORY_TOKENS,
} from './infrastructure/persistence/repositories/providers/repositories.providers';

@Module({
  imports: [TypeOrmModule.forFeature(GEO_ENTITIES)],
  controllers: [InfrastructurePointController, MeteorologyAssetController, MunicipalityController],
  providers: [
    ...GEO_USE_CASE_PROVIDERS,
    SeedMunicipalitiesService,
    ...GEO_REPOSITORY_PROVIDERS,
  ],
  exports: [TypeOrmModule, ...GEO_REPOSITORY_TOKENS],
})
export class GeoModule {}

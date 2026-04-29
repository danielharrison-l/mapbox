import {Module} from '@nestjs/common';
import {TypeOrmModule} from '@nestjs/typeorm';
import {CreateInfrastructurePointUseCase} from './application/usecases/create-infrastructure-point.use-case';
import {CreateMeteorologyAssetUseCase} from './application/usecases/create-meteorology-asset.use-case';
import {FindAllMunicipalitiesUseCase} from './application/usecases/find-all-municipalities.use-case';
import {InfrastructurePointController} from './http/controllers/infrastructure-point.controller';
import {MeteorologyAssetController} from './http/controllers/meteorology-asset.controller';
import {MunicipalityController} from './http/controllers/municipality.controller';
import {GEO_ENTITIES} from './infrastructure/persistence/entities/token/entities.token';
import {GEO_REPOSITORY_PROVIDERS, GEO_REPOSITORY_TOKENS,} from './infrastructure/persistence/repositories/providers/repositories.providers';

@Module({
    imports: [TypeOrmModule.forFeature(GEO_ENTITIES)],
    controllers: [InfrastructurePointController, MeteorologyAssetController, MunicipalityController],
    providers: [
        CreateInfrastructurePointUseCase,
        CreateMeteorologyAssetUseCase,
        FindAllMunicipalitiesUseCase,
        ...GEO_REPOSITORY_PROVIDERS
    ],
    exports: [TypeOrmModule, ...GEO_REPOSITORY_TOKENS],
})
export class GeoModule {
}

import {TypeOrmInfrastructurePointRepository} from '../typeorm/typeorm-infrastructure-point.repository';
import {TypeOrmMeteorologyAssetRepository} from '../typeorm/typeorm-meteorology-asset.repository';
import {TypeOrmMunicipalityRepository} from '../typeorm/typeorm-municipality.repository';

export const INFRASTRUCTURE_POINT_REPOSITORY = Symbol('INFRASTRUCTURE_POINT_REPOSITORY');
export const METEOROLOGY_ASSET_REPOSITORY = Symbol('METEOROLOGY_ASSET_REPOSITORY');
export const MUNICIPALITY_REPOSITORY = Symbol('MUNICIPALITY_REPOSITORY');

export const GEO_REPOSITORY_PROVIDERS = [
    {
        provide: INFRASTRUCTURE_POINT_REPOSITORY,
        useClass: TypeOrmInfrastructurePointRepository,
    },
    {
        provide: METEOROLOGY_ASSET_REPOSITORY,
        useClass: TypeOrmMeteorologyAssetRepository,
    },
    {
        provide: MUNICIPALITY_REPOSITORY,
        useClass: TypeOrmMunicipalityRepository,
    },
];

export const GEO_REPOSITORY_TOKENS = [
    INFRASTRUCTURE_POINT_REPOSITORY,
    METEOROLOGY_ASSET_REPOSITORY,
    MUNICIPALITY_REPOSITORY,
];

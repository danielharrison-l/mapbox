import type { CreateInfrastructurePointInput } from '../../application/dto/create-infrastructure-point.input';
import type { CreateMeteorologyAssetInput } from '../../application/dto/create-meteorology-asset.input';
import type { CreateMeteorologyAssetRequest } from '../../http/requests/create-meteorology-asset.request';
import type {
  GeoJsonGeometry,
  MeteorologyAssetGeoJsonFeatureResponse,
  MeteorologyAssetGeoJsonPropertiesResponse,
  MeteorologyAssetGeoJsonResponse,
} from '../../http/responses/meteorology-asset-geojson.response';
import type { InfrastructurePoint } from '../persistence/entities/infrastructure-point.entity';
import { MeteorologyAsset } from '../persistence/entities/meteorology-asset.entity';
import { InfrastructurePointMapper } from './infrastructure-point.mapper';

export class MeteorologyAssetMapper {
  public static toCreateInput(request: CreateMeteorologyAssetRequest): CreateMeteorologyAssetInput {
    return {
      name: request.name,
      description: request.description ?? null,
      municipalityId: request.municipalityId,
      geometry: request.geometry,
      coverageArea: request.coverageArea,
      status: request.status,
    };
  }

  public static toInfrastructurePointEntity(
    input: CreateMeteorologyAssetInput,
  ): InfrastructurePoint {
    const infrastructurePointInput: CreateInfrastructurePointInput = {
      name: input.name,
      description: input.description ?? null,
      municipalityId: input.municipalityId,
      geometry: input.geometry,
    };

    return InfrastructurePointMapper.toEntity(infrastructurePointInput);
  }

  public static toEntity(
    input: CreateMeteorologyAssetInput,
    infrastructurePoint: InfrastructurePoint,
  ): MeteorologyAsset {
    const meteorologyAsset = new MeteorologyAsset();

    meteorologyAsset.infrastructurePointId = infrastructurePoint.id;
    meteorologyAsset.infrastructurePoint = infrastructurePoint;
    meteorologyAsset.coverageArea = input.coverageArea;

    if (input.status) {
      meteorologyAsset.status = input.status;
    }

    return meteorologyAsset;
  }

  public static toGeoJsonResponse(entities: MeteorologyAsset[]): MeteorologyAssetGeoJsonResponse {
    return {
      type: 'FeatureCollection',
      features: entities.map((entity) => MeteorologyAssetMapper.toGeoJsonFeatureResponse(entity)),
    };
  }

  private static toGeoJsonFeatureResponse(
    entity: MeteorologyAsset,
  ): MeteorologyAssetGeoJsonFeatureResponse {
    return {
      type: 'Feature',
      geometry: MeteorologyAssetMapper.toGeoJsonGeometry(entity.infrastructurePoint.geometry),
      properties: MeteorologyAssetMapper.toGeoJsonPropertiesResponse(entity),
    };
  }

  private static toGeoJsonPropertiesResponse(
    entity: MeteorologyAsset,
  ): MeteorologyAssetGeoJsonPropertiesResponse {
    return {
      id: entity.infrastructurePointId,
      infrastructurePointId: entity.infrastructurePointId,
      name: entity.infrastructurePoint.name,
      description: entity.infrastructurePoint.description,
      municipalityId: entity.infrastructurePoint.municipalityId,
      municipalityName: entity.infrastructurePoint.municipality?.name ?? null,
      municipalityState: entity.infrastructurePoint.municipality?.state ?? null,
      status: entity.status,
      coverageArea: MeteorologyAssetMapper.toGeoJsonGeometry(entity.coverageArea),
    };
  }

  private static toGeoJsonGeometry(geometry: unknown): GeoJsonGeometry | null {
    if (!geometry) {
      return null;
    }

    if (typeof geometry !== 'string') {
      return geometry as GeoJsonGeometry;
    }

    try {
      return JSON.parse(geometry) as GeoJsonGeometry;
    } catch {
      return null;
    }
  }
}

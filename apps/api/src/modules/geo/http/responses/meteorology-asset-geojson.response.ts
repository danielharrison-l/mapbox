import { ApiProperty } from '@nestjs/swagger';
import type { BrazilianState } from '../../domain/brazilian-state';
import { MeteorologyAssetStatus } from '../../infrastructure/persistence/entities/meteorology-asset.entity';

export type GeoJsonGeometry = {
  type: string;
  coordinates: unknown;
};

export class MeteorologyAssetGeoJsonPropertiesResponse {
  @ApiProperty({
    example: 1,
  })
  public id!: number;

  @ApiProperty({
    example: 1,
  })
  public infrastructurePointId!: number;

  @ApiProperty({
    example: 'Estacao Meteorologica 01',
  })
  public name!: string;

  @ApiProperty({
    example: 'Asset para monitoramento meteorologico',
    nullable: true,
  })
  public description!: string | null;

  @ApiProperty({
    example: 1,
  })
  public municipalityId!: number;

  @ApiProperty({
    example: 'Piranhas',
    nullable: true,
  })
  public municipalityName!: string | null;

  @ApiProperty({
    example: 'AL',
    nullable: true,
  })
  public municipalityState!: BrazilianState | null;

  @ApiProperty({
    enum: MeteorologyAssetStatus,
    example: MeteorologyAssetStatus.NOT_STARTED,
  })
  public status!: MeteorologyAssetStatus;

  @ApiProperty({
    example: {
      type: 'Polygon',
      coordinates: [
        [
          [-35.74, -9.67],
          [-35.73, -9.67],
          [-35.73, -9.66],
          [-35.74, -9.66],
          [-35.74, -9.67],
        ],
      ],
    },
    nullable: true,
  })
  public coverageArea!: GeoJsonGeometry | null;
}

export class MeteorologyAssetGeoJsonFeatureResponse {
  @ApiProperty({
    example: 'Feature',
  })
  public type!: 'Feature';

  @ApiProperty({
    example: {
      type: 'Point',
      coordinates: [-35.735, -9.6658],
    },
    nullable: true,
  })
  public geometry!: GeoJsonGeometry | null;

  @ApiProperty({
    type: MeteorologyAssetGeoJsonPropertiesResponse,
  })
  public properties!: MeteorologyAssetGeoJsonPropertiesResponse;
}

export class MeteorologyAssetGeoJsonResponse {
  @ApiProperty({
    example: 'FeatureCollection',
  })
  public type!: 'FeatureCollection';

  @ApiProperty({
    type: MeteorologyAssetGeoJsonFeatureResponse,
    isArray: true,
  })
  public features!: MeteorologyAssetGeoJsonFeatureResponse[];
}

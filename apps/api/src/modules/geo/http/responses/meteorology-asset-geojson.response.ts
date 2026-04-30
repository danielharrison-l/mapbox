import { ApiProperty } from '@nestjs/swagger';
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
    enum: MeteorologyAssetStatus,
    example: MeteorologyAssetStatus.NOT_STARTED,
  })
  public status!: MeteorologyAssetStatus;
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

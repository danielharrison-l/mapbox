import { Column, Entity, Index, JoinColumn, OneToOne, PrimaryColumn } from 'typeorm';
import { InfrastructurePoint } from './infrastructure-point.entity';

export enum MeteorologyAssetStatus {
  NOT_STARTED = 'NOT_STARTED',
  STARTED = 'STARTED',
  CONCLUDED = 'CONCLUDED',
}

@Entity('meteorology_asset')
export class MeteorologyAsset {
  @PrimaryColumn({ name: 'infrastructure_point_id', type: 'int' })
  infrastructurePointId!: number;

  @OneToOne(() => InfrastructurePoint)
  @JoinColumn({ name: 'infrastructure_point_id' })
  infrastructurePoint!: InfrastructurePoint;

  @Column({
    type: 'enum',
    enum: MeteorologyAssetStatus,
    enumName: 'meteorology_asset_status_enum',
    default: MeteorologyAssetStatus.NOT_STARTED,
  })
  @Index()
  status!: MeteorologyAssetStatus;

  @Column({
    name: 'coverage_area',
    type: 'geometry',
    spatialFeatureType: 'Polygon',
    srid: 4326,
  })
  coverageArea!: string;
}

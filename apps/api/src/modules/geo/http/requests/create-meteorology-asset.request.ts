import { ApiProperty } from '@nestjs/swagger';
import { MeteorologyAssetStatus } from '../../infrastructure/persistence/entities/meteorology-asset.entity';

export class CreateMeteorologyAssetRequest {
  @ApiProperty({
    example: 'Estação Meteorológica 01',
  })
  public name!: string;

  @ApiProperty({
    example: 'Ativo para monitoramento meteorológico',
    required: false,
    nullable: true,
  })
  public description?: string | null;

  @ApiProperty({
    example: 1,
  })
  public municipalityId!: number;

  @ApiProperty({
    example: {
      type: 'Point',
      coordinates: [-35.7350, -9.6658],
    },
  })
  public geometry!: string;

  @ApiProperty({
    example: {
      type: 'Polygon',
      coordinates: [
        [
          [-35.7400, -9.6700],
          [-35.7300, -9.6700],
          [-35.7300, -9.6600],
          [-35.7400, -9.6600],
          [-35.7400, -9.6700],
        ],
      ],
    },
  })
  public coverageArea!: string;

  @ApiProperty({
    enum: MeteorologyAssetStatus,
    required: false,
    example: MeteorologyAssetStatus.NOT_STARTED,
  })
  public status?: MeteorologyAssetStatus;
}

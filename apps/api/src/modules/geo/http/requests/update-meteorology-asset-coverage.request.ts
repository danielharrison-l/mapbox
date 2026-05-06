import { ApiProperty } from '@nestjs/swagger';

export class UpdateMeteorologyAssetCoverageRequest {
  @ApiProperty({
    example: {
      type: 'Polygon',
      coordinates: [
        [
          [-46.6403, -23.556],
          [-46.6262, -23.556],
          [-46.6262, -23.545],
          [-46.6403, -23.545],
          [-46.6403, -23.556],
        ],
      ],
    },
  })
  public coverageArea!: string;
}

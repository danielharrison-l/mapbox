import { ApiProperty } from '@nestjs/swagger';

export class CreateInfrastructurePointRequest {
  @ApiProperty({
    example: 'Poste de energia 01',
  })
  public name!: string;

  @ApiProperty({
    example: 'Ponto de infraestrutura na esquina principal',
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
}

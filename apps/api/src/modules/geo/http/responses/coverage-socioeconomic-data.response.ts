import { ApiProperty } from '@nestjs/swagger';
import type { BrazilianState } from '../../domain/brazilian-state';

export class CoverageSocioeconomicAreaResponse {
  @ApiProperty({
    example: 1,
  })
  public id!: number;

  @ApiProperty({
    example: 'Setor Socioeconomico 01-1',
  })
  public name!: string;

  @ApiProperty({
    example: 'AL',
    nullable: true,
  })
  public state!: BrazilianState | null;

  @ApiProperty({
    example: 1500,
  })
  public population!: number;

  @ApiProperty({
    example: 2750.5,
    description: 'Renda media mensal em BRL.',
  })
  public averageMonthlyIncome!: number;
}

export class CoverageSocioeconomicDataResponse {
  @ApiProperty({
    example: 1,
  })
  public infrastructurePointId!: number;

  @ApiProperty({
    example: 3,
  })
  public externalAreasCount!: number;

  @ApiProperty({
    example: 4500,
  })
  public totalPopulation!: number;

  @ApiProperty({
    example: 2750.5,
    description: 'Renda media mensal ponderada pela populacao.',
  })
  public averageMonthlyIncome!: number;

  @ApiProperty({
    type: CoverageSocioeconomicAreaResponse,
    isArray: true,
  })
  public areas!: CoverageSocioeconomicAreaResponse[];
}

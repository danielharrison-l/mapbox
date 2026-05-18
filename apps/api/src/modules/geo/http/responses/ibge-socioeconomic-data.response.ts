import { ApiProperty } from '@nestjs/swagger';
import type { BrazilianState } from '../../domain/brazilian-state';

export class IbgeSocioeconomicMunicipalityResponse {
  @ApiProperty({ example: 1 })
  public id!: number;

  @ApiProperty({ example: 'Belém' })
  public name!: string;

  @ApiProperty({ example: 'PA', nullable: true })
  public state!: BrazilianState | null;

  @ApiProperty({ example: '1501402', nullable: true })
  public ibgeCode!: string | null;
}

export class IbgeSocioeconomicIndicatorResponse {
  @ApiProperty({ example: 'population' })
  public key!: string;

  @ApiProperty({ example: 'População residente' })
  public label!: string;

  @ApiProperty({ example: 1303403, nullable: true })
  public value!: number | null;

  @ApiProperty({ example: 'Pessoas' })
  public unit!: string;

  @ApiProperty({ example: 'IBGE SIDRA tabela 4709, variável 93' })
  public source!: string;

  @ApiProperty({ example: 2022 })
  public referenceYear!: number;
}

export class IbgeSocioeconomicDataResponse {
  @ApiProperty({ example: 1 })
  public infrastructurePointId!: number;

  @ApiProperty({ type: IbgeSocioeconomicMunicipalityResponse })
  public municipality!: IbgeSocioeconomicMunicipalityResponse;

  @ApiProperty({ example: 'IBGE API Localidades/SIDRA' })
  public source!: string;

  @ApiProperty({ example: 2022 })
  public referenceYear!: number;

  @ApiProperty({ example: 1303403, nullable: true })
  public population!: number | null;

  @ApiProperty({ example: 422975, nullable: true })
  public occupiedHouseholds!: number | null;

  @ApiProperty({ example: 1301368, nullable: true })
  public residentsInHouseholds!: number | null;

  @ApiProperty({ example: 3.08, nullable: true })
  public averageResidentsPerHousehold!: number | null;

  @ApiProperty({ type: IbgeSocioeconomicIndicatorResponse, isArray: true })
  public indicators!: IbgeSocioeconomicIndicatorResponse[];

  @ApiProperty({
    example: ['Dados obtidos via API do IBGE em nível municipal.'],
    isArray: true,
  })
  public warnings!: string[];
}

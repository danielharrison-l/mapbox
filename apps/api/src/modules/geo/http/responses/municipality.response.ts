import { ApiProperty } from '@nestjs/swagger';
import type { BrazilianState } from '../../domain/brazilian-state';

export class MunicipalityResponse {
  @ApiProperty({
    example: 1,
  })
  public id!: number;

  @ApiProperty({
    example: 'Piranhas',
  })
  public name!: string;

  @ApiProperty({
    example: 'AL',
    nullable: true,
  })
  public state!: BrazilianState | null;

  @ApiProperty({
    example: 24000,
  })
  public population!: number;
}

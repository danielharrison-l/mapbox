import { ApiProperty } from '@nestjs/swagger';

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
    example: 24000,
  })
  public population!: number;
}

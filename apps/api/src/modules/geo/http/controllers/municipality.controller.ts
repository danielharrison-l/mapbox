import { Controller, Get } from '@nestjs/common';
import { ApiOkResponse, ApiOperation, ApiTags } from '@nestjs/swagger';
import { FindAllMunicipalitiesUseCase } from '../../application/usecases/find-all-municipalities.use-case';
import { MunicipalityMapper } from '../../infrastructure/mapper/municipality.mapper';
import { MunicipalityResponse } from '../responses/municipality.response';

@ApiTags('geo')
@Controller('geo/municipalities')
export class MunicipalityController {
  public constructor(
    private readonly findAllMunicipalitiesUseCase: FindAllMunicipalitiesUseCase,
  ) {}

  @Get()
  @ApiOperation({ summary: 'Lista todos os municipios' })
  @ApiOkResponse({
    description: 'Municipios listados com sucesso',
    isArray: true,
    type: MunicipalityResponse,
  })
  public async findAll(): Promise<MunicipalityResponse[]> {
    const outputs = await this.findAllMunicipalitiesUseCase.execute();
    return MunicipalityMapper.toResponseList(outputs);
  }
}

import { Body, Controller, Post } from '@nestjs/common';
import { ApiCreatedResponse, ApiOperation, ApiTags } from '@nestjs/swagger';
import { CreateInfrastructurePointUseCase } from '../../application/usecases/create-infrastructure-point.use-case';
import { InfrastructurePointMapper } from '../../infrastructure/mapper/infrastructure-point.mapper';
import { InfrastructurePoint } from '../../infrastructure/persistence/entities/infrastructure-point.entity';
import { CreateInfrastructurePointRequest } from '../requests/create-infrastructure-point.request';

@ApiTags('geo')
@Controller('geo/infrastructure-points')
export class InfrastructurePointController {
  public constructor(
    private readonly createInfrastructurePointUseCase: CreateInfrastructurePointUseCase,
  ) {}

  @Post()
  @ApiOperation({ summary: 'Cria um ponto de infraestrutura' })
  @ApiCreatedResponse({ description: 'Ponto de infraestrutura criado com sucesso' })
  public async create(
    @Body() body: CreateInfrastructurePointRequest,
  ): Promise<InfrastructurePoint> {
    const input = InfrastructurePointMapper.toCreateInput(body);
    return this.createInfrastructurePointUseCase.execute(input);
  }
}

import { Body, Controller, Post } from '@nestjs/common';
import { ApiCreatedResponse, ApiOperation, ApiTags } from '@nestjs/swagger';
import { CreateMeteorologyAssetUseCase } from '../../application/usecases/create-meteorology-asset.use-case';
import { MeteorologyAssetMapper } from '../../infrastructure/mapper/meteorology-asset.mapper';
import { MeteorologyAsset } from '../../infrastructure/persistence/entities/meteorology-asset.entity';
import { CreateMeteorologyAssetRequest } from '../requests/create-meteorology-asset.request';

@ApiTags('geo')
@Controller('geo/meteorology-assets')
export class MeteorologyAssetController {
  public constructor(
    private readonly createMeteorologyAssetUseCase: CreateMeteorologyAssetUseCase,
  ) {}

  @Post()
  @ApiOperation({ summary: 'Cria um asset de meteorologia' })
  @ApiCreatedResponse({ description: 'Asset de meteorologia criado com sucesso' })
  public async create(
    @Body() body: CreateMeteorologyAssetRequest,
  ): Promise<MeteorologyAsset> {
    const input = MeteorologyAssetMapper.toCreateInput(body);
    return this.createMeteorologyAssetUseCase.execute(input);
  }
}

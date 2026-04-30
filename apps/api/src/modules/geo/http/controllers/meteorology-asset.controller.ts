import {
  Body,
  Controller,
  Get,
  NotFoundException,
  Param,
  ParseIntPipe,
  Post,
} from '@nestjs/common';
import {
  ApiCreatedResponse,
  ApiNotFoundResponse,
  ApiOkResponse,
  ApiOperation,
  ApiParam,
  ApiTags,
} from '@nestjs/swagger';
import { CreateMeteorologyAssetUseCase } from '../../application/usecases/create-meteorology-asset.use-case';
import { FindAllMeteorologyAssetsUseCase } from '../../application/usecases/find-all-meteorology-assets.use-case';
import { FindMeteorologyAssetByInfrastructurePointIdUseCase } from '../../application/usecases/find-meteorology-asset-by-infrastructure-point-id.use-case';
import { MeteorologyAssetMapper } from '../../infrastructure/mapper/meteorology-asset.mapper';
import { MeteorologyAsset } from '../../infrastructure/persistence/entities/meteorology-asset.entity';
import { CreateMeteorologyAssetRequest } from '../requests/create-meteorology-asset.request';
import { MeteorologyAssetGeoJsonResponse } from '../responses/meteorology-asset-geojson.response';

@ApiTags('geo')
@Controller('geo/meteorology-assets')
export class MeteorologyAssetController {
  public constructor(
    private readonly createMeteorologyAssetUseCase: CreateMeteorologyAssetUseCase,
    private readonly findAllMeteorologyAssetsUseCase: FindAllMeteorologyAssetsUseCase,
    private readonly findMeteorologyAssetByInfrastructurePointIdUseCase: FindMeteorologyAssetByInfrastructurePointIdUseCase,
  ) {}

  @Get()
  @ApiOperation({
    summary: 'Lista os assets de meteorologia com os dados do banco',
  })
  @ApiOkResponse({
    description: 'Assets de meteorologia listados com sucesso',
    isArray: true,
    type: MeteorologyAsset,
  })
  public async findAll(): Promise<MeteorologyAsset[]> {
    return this.findAllMeteorologyAssetsUseCase.execute();
  }

  @Get('geojson')
  @ApiOperation({
    summary: 'Lista os assets de meteorologia em formato GeoJSON',
  })
  @ApiOkResponse({
    description: 'Assets de meteorologia listados em GeoJSON com sucesso',
    type: MeteorologyAssetGeoJsonResponse,
  })
  public async findAllAsGeoJson(): Promise<MeteorologyAssetGeoJsonResponse> {
    const meteorologyAssets = await this.findAllMeteorologyAssetsUseCase.execute();
    return MeteorologyAssetMapper.toGeoJsonResponse(meteorologyAssets);
  }

  @Get('infrastructure-points/:infrastructurePointId/geojson')
  @ApiOperation({
    summary:
      'Busca um asset de meteorologia pelo ponto de infraestrutura em formato GeoJSON',
  })
  @ApiParam({
    name: 'infrastructurePointId',
    description: 'ID do ponto de infraestrutura',
    type: Number,
  })
  @ApiOkResponse({
    description: 'Asset de meteorologia encontrado em GeoJSON com sucesso',
    type: MeteorologyAssetGeoJsonResponse,
  })
  @ApiNotFoundResponse({
    description: 'Asset de meteorologia nao encontrado para o ponto de infraestrutura',
  })
  public async findByInfrastructurePointIdAsGeoJson(
    @Param('infrastructurePointId', ParseIntPipe) infrastructurePointId: number,
  ): Promise<MeteorologyAssetGeoJsonResponse> {
    const meteorologyAsset = await this.findByInfrastructurePointIdOrThrow(
      infrastructurePointId,
    );

    return MeteorologyAssetMapper.toGeoJsonResponse([meteorologyAsset]);
  }

  @Get('infrastructure-points/:infrastructurePointId')
  @ApiOperation({
    summary: 'Busca um asset de meteorologia pelo ponto de infraestrutura',
  })
  @ApiParam({
    name: 'infrastructurePointId',
    description: 'ID do ponto de infraestrutura',
    type: Number,
  })
  @ApiOkResponse({
    description: 'Asset de meteorologia encontrado com sucesso',
    type: MeteorologyAsset,
  })
  @ApiNotFoundResponse({
    description: 'Asset de meteorologia nao encontrado para o ponto de infraestrutura',
  })
  public async findByInfrastructurePointId(
    @Param('infrastructurePointId', ParseIntPipe) infrastructurePointId: number,
  ): Promise<MeteorologyAsset> {
    return this.findByInfrastructurePointIdOrThrow(infrastructurePointId);
  }

  private async findByInfrastructurePointIdOrThrow(
    infrastructurePointId: number,
  ): Promise<MeteorologyAsset> {
    const meteorologyAsset =
      await this.findMeteorologyAssetByInfrastructurePointIdUseCase.execute(
        infrastructurePointId,
      );

    if (!meteorologyAsset) {
      throw new NotFoundException(
        'Asset de meteorologia nao encontrado para o ponto de infraestrutura informado',
      );
    }

    return meteorologyAsset;
  }

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

import {
  BadRequestException,
  Body,
  Controller,
  Get,
  NotFoundException,
  Param,
  ParseIntPipe,
  Patch,
  Post,
  Query,
} from '@nestjs/common';
import {
  ApiCreatedResponse,
  ApiNotFoundResponse,
  ApiOkResponse,
  ApiOperation,
  ApiParam,
  ApiQuery,
  ApiTags,
} from '@nestjs/swagger';
import type { FindMeteorologyAssetsInput } from '../../application/dto/find-meteorology-assets.input';
import { CreateMeteorologyAssetUseCase } from '../../application/usecases/create-meteorology-asset.use-case';
import { FindAllMeteorologyAssetsUseCase } from '../../application/usecases/find-all-meteorology-assets.use-case';
import { FindIbgeSocioeconomicDataUseCase } from '../../application/usecases/find-ibge-socioeconomic-data.use-case';
import { FindMeteorologyAssetByInfrastructurePointIdUseCase } from '../../application/usecases/find-meteorology-asset-by-infrastructure-point-id.use-case';
import { UpdateMeteorologyAssetCoverageUseCase } from '../../application/usecases/update-meteorology-asset-coverage.use-case';
import { isBrazilianState } from '../../domain/brazilian-state';
import { MeteorologyAssetMapper } from '../../infrastructure/mapper/meteorology-asset.mapper';
import {
  MeteorologyAsset,
  MeteorologyAssetStatus,
} from '../../infrastructure/persistence/entities/meteorology-asset.entity';
import type { CreateMeteorologyAssetRequest } from '../requests/create-meteorology-asset.request';
import type { UpdateMeteorologyAssetCoverageRequest } from '../requests/update-meteorology-asset-coverage.request';
import { IbgeSocioeconomicDataResponse } from '../responses/ibge-socioeconomic-data.response';
import { MeteorologyAssetGeoJsonResponse } from '../responses/meteorology-asset-geojson.response';

@ApiTags('geo')
@Controller('geo/meteorology-assets')
export class MeteorologyAssetController {
  public constructor(
    private readonly createMeteorologyAssetUseCase: CreateMeteorologyAssetUseCase,
    private readonly findAllMeteorologyAssetsUseCase: FindAllMeteorologyAssetsUseCase,
    private readonly findMeteorologyAssetByInfrastructurePointIdUseCase: FindMeteorologyAssetByInfrastructurePointIdUseCase,
    private readonly findIbgeSocioeconomicDataUseCase: FindIbgeSocioeconomicDataUseCase,
    private readonly updateMeteorologyAssetCoverageUseCase: UpdateMeteorologyAssetCoverageUseCase,
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
  @ApiQuery({
    name: 'state',
    required: false,
    example: 'SP',
  })
  @ApiQuery({
    name: 'status',
    required: false,
    enum: MeteorologyAssetStatus,
  })
  public async findAll(
    @Query('state') state?: string | string[],
    @Query('status') status?: string | string[],
  ): Promise<MeteorologyAsset[]> {
    const filters = this.parseFilters(state, status);
    return this.findAllMeteorologyAssetsUseCase.execute(filters);
  }

  @Get('geojson')
  @ApiOperation({
    summary: 'Lista os assets de meteorologia em formato GeoJSON',
  })
  @ApiOkResponse({
    description: 'Assets de meteorologia listados em GeoJSON com sucesso',
    type: MeteorologyAssetGeoJsonResponse,
  })
  @ApiQuery({
    name: 'state',
    required: false,
    example: 'SP',
  })
  @ApiQuery({
    name: 'status',
    required: false,
    enum: MeteorologyAssetStatus,
  })
  public async findAllAsGeoJson(
    @Query('state') state?: string | string[],
    @Query('status') status?: string | string[],
  ): Promise<MeteorologyAssetGeoJsonResponse> {
    const filters = this.parseFilters(state, status);
    const meteorologyAssets = await this.findAllMeteorologyAssetsUseCase.execute(filters);
    return MeteorologyAssetMapper.toGeoJsonResponse(meteorologyAssets);
  }

  @Get('infrastructure-points/:infrastructurePointId/geojson')
  @ApiOperation({
    summary: 'Busca um ativo de meteorologia pelo ponto de infraestrutura em formato GeoJSON',
  })
  @ApiParam({
    name: 'infrastructurePointId',
    description: 'ID do ponto de infraestrutura',
    type: Number,
  })
  @ApiOkResponse({
    description: 'Ativo de meteorologia encontrado em GeoJSON com sucesso',
    type: MeteorologyAssetGeoJsonResponse,
  })
  @ApiNotFoundResponse({
    description: 'Ativo de meteorologia não encontrado para o ponto de infraestrutura',
  })
  public async findByInfrastructurePointIdAsGeoJson(
    @Param('infrastructurePointId', ParseIntPipe) infrastructurePointId: number,
  ): Promise<MeteorologyAssetGeoJsonResponse> {
    const meteorologyAsset = await this.findByInfrastructurePointIdOrThrow(infrastructurePointId);

    return MeteorologyAssetMapper.toGeoJsonResponse([meteorologyAsset]);
  }

  @Get('infrastructure-points/:infrastructurePointId/ibge-socioeconomic-data')
  @ApiOperation({
    summary: 'Busca indicadores socioeconômicos municipais pela API do IBGE',
  })
  @ApiParam({
    name: 'infrastructurePointId',
    description: 'ID do ponto de infraestrutura',
    type: Number,
  })
  @ApiOkResponse({
    description: 'Indicadores municipais do IBGE consultados com sucesso',
    type: IbgeSocioeconomicDataResponse,
  })
  @ApiNotFoundResponse({
    description: 'Ativo de meteorologia não encontrado para o ponto de infraestrutura',
  })
  public async findIbgeSocioeconomicData(
    @Param('infrastructurePointId', ParseIntPipe) infrastructurePointId: number,
  ): Promise<IbgeSocioeconomicDataResponse> {
    const ibgeSocioeconomicData =
      await this.findIbgeSocioeconomicDataUseCase.execute(infrastructurePointId);

    if (!ibgeSocioeconomicData) {
      throw new NotFoundException(
        'Ativo de meteorologia não encontrado para o ponto de infraestrutura informado',
      );
    }

    return ibgeSocioeconomicData;
  }

  @Get('infrastructure-points/:infrastructurePointId')
  @ApiOperation({
    summary: 'Busca um ativo de meteorologia pelo ponto de infraestrutura',
  })
  @ApiParam({
    name: 'infrastructurePointId',
    description: 'ID do ponto de infraestrutura',
    type: Number,
  })
  @ApiOkResponse({
    description: 'Ativo de meteorologia encontrado com sucesso',
    type: MeteorologyAsset,
  })
  @ApiNotFoundResponse({
    description: 'Ativo de meteorologia não encontrado para o ponto de infraestrutura',
  })
  public async findByInfrastructurePointId(
    @Param('infrastructurePointId', ParseIntPipe) infrastructurePointId: number,
  ): Promise<MeteorologyAsset> {
    return this.findByInfrastructurePointIdOrThrow(infrastructurePointId);
  }

  @Patch('infrastructure-points/:infrastructurePointId/coverage')
  @ApiOperation({
    summary: 'Atualiza a área de cobertura de um ativo de meteorologia',
  })
  @ApiParam({
    name: 'infrastructurePointId',
    description: 'ID do ponto de infraestrutura',
    type: Number,
  })
  @ApiOkResponse({
    description: 'Área de cobertura atualizada com sucesso',
    type: MeteorologyAsset,
  })
  @ApiNotFoundResponse({
    description: 'Ativo de meteorologia não encontrado para o ponto de infraestrutura',
  })
  public async updateCoverageArea(
    @Param('infrastructurePointId', ParseIntPipe) infrastructurePointId: number,
    @Body() body: UpdateMeteorologyAssetCoverageRequest,
  ): Promise<MeteorologyAsset> {
    const meteorologyAsset = await this.updateMeteorologyAssetCoverageUseCase.execute({
      infrastructurePointId,
      coverageArea: body.coverageArea,
    });

    if (!meteorologyAsset) {
      throw new NotFoundException(
        'Ativo de meteorologia não encontrado para o ponto de infraestrutura informado',
      );
    }

    return meteorologyAsset;
  }

  private async findByInfrastructurePointIdOrThrow(
    infrastructurePointId: number,
  ): Promise<MeteorologyAsset> {
    const meteorologyAsset =
      await this.findMeteorologyAssetByInfrastructurePointIdUseCase.execute(infrastructurePointId);

    if (!meteorologyAsset) {
      throw new NotFoundException(
        'Ativo de meteorologia não encontrado para o ponto de infraestrutura informado',
      );
    }

    return meteorologyAsset;
  }

  private parseFilters(
    state?: string | string[],
    status?: string | string[],
  ): FindMeteorologyAssetsInput {
    const filters: FindMeteorologyAssetsInput = {};
    const stateFilter = this.parseSingleQueryParam('state', state);
    const statusFilter = this.parseSingleQueryParam('status', status);

    if (stateFilter) {
      const normalizedState = stateFilter.toUpperCase();

      if (!isBrazilianState(normalizedState)) {
        throw new BadRequestException('Filtro de estado brasileiro inválido.');
      }

      filters.state = normalizedState;
    }

    if (statusFilter) {
      if (!Object.values(MeteorologyAssetStatus).includes(statusFilter as MeteorologyAssetStatus)) {
        throw new BadRequestException('Filtro de status do ativo de meteorologia inválido.');
      }

      filters.status = statusFilter as MeteorologyAssetStatus;
    }

    return filters;
  }

  private parseSingleQueryParam(name: string, value?: string | string[]): string | undefined {
    if (Array.isArray(value)) {
      throw new BadRequestException(`Query param "${name}" must be provided only once.`);
    }

    return value?.trim() || undefined;
  }

  @Post()
  @ApiOperation({ summary: 'Cria um ativo de meteorologia' })
  @ApiCreatedResponse({ description: 'Ativo de meteorologia criado com sucesso' })
  public async create(@Body() body: CreateMeteorologyAssetRequest): Promise<MeteorologyAsset> {
    const input = MeteorologyAssetMapper.toCreateInput(body);
    return this.createMeteorologyAssetUseCase.execute(input);
  }
}

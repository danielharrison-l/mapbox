import { Inject, Injectable } from '@nestjs/common';
import { IbgeApiClient } from '../../infrastructure/http/ibge-api.client';
import type { MeteorologyAssetRepository } from '../../infrastructure/persistence/repositories/meteorology-asset.repository';
import { METEOROLOGY_ASSET_REPOSITORY } from '../../infrastructure/persistence/repositories/providers/repositories.providers';
import type { IbgeSocioeconomicDataOutput } from '../dto/ibge-socioeconomic-data.output';

@Injectable()
export class FindIbgeSocioeconomicDataUseCase {
  public constructor(
    @Inject(METEOROLOGY_ASSET_REPOSITORY)
    private readonly meteorologyAssetRepository: MeteorologyAssetRepository,
    private readonly ibgeApiClient: IbgeApiClient,
  ) {}

  public async execute(infrastructurePointId: number): Promise<IbgeSocioeconomicDataOutput | null> {
    const asset =
      await this.meteorologyAssetRepository.findByInfrastructurePointId(infrastructurePointId);

    if (!asset) {
      return null;
    }

    const municipality = asset.infrastructurePoint.municipality;
    const warnings: string[] = [
      'Dados obtidos via API do IBGE em nível municipal; não representam bairro, setor censitário ou interseção exata da área de cobertura.',
    ];
    const ibgeMunicipality = await this.ibgeApiClient.findMunicipalityByNameAndState(
      municipality.name,
      municipality.state,
    );

    if (!ibgeMunicipality) {
      return {
        infrastructurePointId,
        municipality: {
          id: municipality.id,
          name: municipality.name,
          state: municipality.state,
          ibgeCode: null,
        },
        source: 'IBGE API Localidades/SIDRA',
        referenceYear: 2022,
        population: null,
        occupiedHouseholds: null,
        residentsInHouseholds: null,
        averageResidentsPerHousehold: null,
        indicators: [],
        indicatorGroups: [],
        warnings: [
          ...warnings,
          'Município não encontrado na API de Localidades do IBGE para o nome/UF do ativo.',
        ],
      };
    }

    const indicators = await this.ibgeApiClient.findMunicipalityIndicators(
      String(ibgeMunicipality.id),
    );

    return {
      infrastructurePointId,
      municipality: {
        id: municipality.id,
        name: municipality.name,
        state: municipality.state,
        ibgeCode: String(ibgeMunicipality.id),
      },
      source: 'IBGE API Localidades/SIDRA',
      referenceYear: 2022,
      ...indicators,
      indicators: indicators.indicatorGroups.flatMap((group) => group.indicators),
      warnings,
    };
  }
}

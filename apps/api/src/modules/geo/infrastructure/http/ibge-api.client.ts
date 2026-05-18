import { Injectable } from '@nestjs/common';
import type { BrazilianState } from '../../domain/brazilian-state';

type IbgeMunicipalityApiResponse = {
  id: number;
  nome: string;
  microrregiao?: {
    mesorregiao?: {
      UF?: {
        sigla?: string;
      };
    };
  };
};

type IbgeAggregateResponse = Array<{
  id: string;
  variavel: string;
  unidade: string;
  resultados?: Array<{
    series?: Array<{
      serie?: Record<string, string>;
    }>;
  }>;
}>;

export type IbgeMunicipality = {
  id: number;
  name: string;
  state: string | null;
};

export type IbgeMunicipalityIndicators = {
  population: number | null;
  occupiedHouseholds: number | null;
  residentsInHouseholds: number | null;
  averageResidentsPerHousehold: number | null;
};

const IBGE_BASE_URL = 'https://servicodados.ibge.gov.br/api';
const REQUEST_TIMEOUT_MS = 12_000;

@Injectable()
export class IbgeApiClient {
  private readonly municipalitiesByStateCache = new Map<string, IbgeMunicipality[]>();
  private readonly indicatorsByMunicipalityCache = new Map<string, IbgeMunicipalityIndicators>();

  public async findMunicipalityByNameAndState(
    municipalityName: string,
    state: BrazilianState | null,
  ): Promise<IbgeMunicipality | null> {
    const municipalities = await this.findMunicipalities(state);
    const normalizedName = this.normalizeName(municipalityName);

    return (
      municipalities.find(
        (municipality) => this.normalizeName(municipality.name) === normalizedName,
      ) ??
      municipalities.find((municipality) =>
        this.normalizeName(municipality.name).includes(normalizedName),
      ) ??
      null
    );
  }

  public async findMunicipalityIndicators(
    municipalityCode: string,
  ): Promise<IbgeMunicipalityIndicators> {
    const cachedIndicators = this.indicatorsByMunicipalityCache.get(municipalityCode);

    if (cachedIndicators) {
      return cachedIndicators;
    }

    const [population, households] = await Promise.all([
      this.fetchPopulation(municipalityCode),
      this.fetchHouseholds(municipalityCode),
    ]);
    const indicators = {
      population,
      ...households,
    };

    this.indicatorsByMunicipalityCache.set(municipalityCode, indicators);

    return indicators;
  }

  private async findMunicipalities(state: BrazilianState | null): Promise<IbgeMunicipality[]> {
    const cacheKey = state ?? 'ALL';
    const cachedMunicipalities = this.municipalitiesByStateCache.get(cacheKey);

    if (cachedMunicipalities) {
      return cachedMunicipalities;
    }

    const path = state
      ? `/v1/localidades/estados/${state}/municipios`
      : '/v1/localidades/municipios';
    const municipalities = (await this.fetchJson(path)) as IbgeMunicipalityApiResponse[];
    const mappedMunicipalities = municipalities.map((municipality) => ({
      id: municipality.id,
      name: municipality.nome,
      state: municipality.microrregiao?.mesorregiao?.UF?.sigla ?? state,
    }));

    this.municipalitiesByStateCache.set(cacheKey, mappedMunicipalities);

    return mappedMunicipalities;
  }

  private async fetchPopulation(municipalityCode: string): Promise<number | null> {
    const response = (await this.fetchJson(
      `/v3/agregados/4709/periodos/2022/variaveis/93?localidades=N6[${municipalityCode}]`,
    )) as IbgeAggregateResponse;

    return this.readAggregateNumber(response, '93');
  }

  private async fetchHouseholds(
    municipalityCode: string,
  ): Promise<Omit<IbgeMunicipalityIndicators, 'population'>> {
    const response = (await this.fetchJson(
      `/v3/agregados/9922/periodos/2022/variaveis/381|382|5930?localidades=N6[${municipalityCode}]&classificacao=1[6795]`,
    )) as IbgeAggregateResponse;

    return {
      occupiedHouseholds: this.readAggregateNumber(response, '381'),
      residentsInHouseholds: this.readAggregateNumber(response, '382'),
      averageResidentsPerHousehold: this.readAggregateNumber(response, '5930'),
    };
  }

  private readAggregateNumber(response: IbgeAggregateResponse, variableId: string): number | null {
    const variable = response.find((item) => item.id === variableId);
    const value = variable?.resultados?.[0]?.series?.[0]?.serie?.['2022'];

    if (!value || value === '-' || value === '...') {
      return null;
    }

    const parsed = Number(value.includes(',') ? value.replace(/\./g, '').replace(',', '.') : value);

    return Number.isFinite(parsed) ? parsed : null;
  }

  private async fetchJson(path: string): Promise<unknown> {
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), REQUEST_TIMEOUT_MS);

    try {
      const response = await fetch(`${IBGE_BASE_URL}${path}`, {
        signal: controller.signal,
      });

      if (!response.ok) {
        throw new Error(`IBGE API returned ${response.status} for ${path}`);
      }

      return response.json();
    } finally {
      clearTimeout(timeout);
    }
  }

  private normalizeName(value: string): string {
    return value
      .normalize('NFD')
      .replace(/[\u0300-\u036f]/g, '')
      .replace(/\s+/g, ' ')
      .trim()
      .toLowerCase();
  }
}

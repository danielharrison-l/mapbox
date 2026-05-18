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
    classificacoes?: Array<{
      id: string;
      nome: string;
      categoria: Record<string, string>;
    }>;
    series?: Array<{
      serie?: Record<string, string>;
    }>;
  }>;
}>;

type IbgeAggregateResponseItem = IbgeAggregateResponse[number];

type IbgeAggregateClassificationFilter = Record<string, string>;

export type IbgeSocioeconomicMetric = {
  key: string;
  label: string;
  value: number | null;
  unit: string;
  source: string;
  referenceYear: number;
};

export type IbgeSocioeconomicMetricGroup = {
  key: string;
  label: string;
  indicators: IbgeSocioeconomicMetric[];
};

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
  indicatorGroups: IbgeSocioeconomicMetricGroup[];
};

const IBGE_BASE_URL = 'https://servicodados.ibge.gov.br/api';
const REQUEST_TIMEOUT_MS = 12_000;
const REFERENCE_YEAR = 2022;

const SOURCE = {
  population: 'IBGE SIDRA tabela 4709, variável 93',
  households: 'IBGE SIDRA tabela 9922',
  householdIncome: 'IBGE SIDRA tabela 10295',
  workIncome: 'IBGE SIDRA tabela 10280',
  laborForce: 'IBGE SIDRA tabela 6580',
  incomeDistribution: 'IBGE SIDRA tabela 10296',
  incomeByEducation: 'IBGE SIDRA tabela 10281',
  incomeComposition: 'IBGE SIDRA tabela 10297',
  waterSupply: 'IBGE SIDRA tabela 6804',
  sewage: 'IBGE SIDRA tabela 6805',
  bathroom: 'IBGE SIDRA tabela 6806',
  garbage: 'IBGE SIDRA tabela 6892',
} as const;

const TOTAL_SEX = '6794';
const TOTAL_RACE = '95251';
const TOTAL_AGE = '95253';
const TOTAL_OCCUPATION_POSITION = '96165';
const TOTAL_SOCIAL_SECURITY_CONTRIBUTION = '15349';
const TOTAL_WATER_PLUMBING = '72125';
const TOTAL_SEWAGE = '46292';

const INCOME_CLASSES = [
  ['9681', 'Até 1/4 de salário mínimo'],
  ['9682', 'Mais de 1/4 a 1/2 salário mínimo'],
  ['9683', 'Mais de 1/2 a 1 salário mínimo'],
  ['9684', 'Mais de 1 a 2 salários mínimos'],
  ['9685', 'Mais de 2 a 3 salários mínimos'],
  ['9686', 'Mais de 3 a 5 salários mínimos'],
  ['9687', 'Mais de 5 a 10 salários mínimos'],
  ['9688', 'Mais de 10 a 15 salários mínimos'],
  ['9689', 'Mais de 15 a 20 salários mínimos'],
  ['9690', 'Mais de 20 salários mínimos'],
  ['9692', 'Sem rendimento'],
] as const;

const SEX_CATEGORIES = [
  ['4', 'Homens'],
  ['5', 'Mulheres'],
] as const;

const RACE_CATEGORIES = [
  ['2776', 'Branca'],
  ['2777', 'Preta'],
  ['2778', 'Amarela'],
  ['2779', 'Parda'],
  ['2780', 'Indígena'],
] as const;

const EDUCATION_CATEGORIES = [
  ['9493', 'Sem instrução e fundamental incompleto'],
  ['9494', 'Fundamental completo e médio incompleto'],
  ['9495', 'Médio completo e superior incompleto'],
  ['99713', 'Superior completo'],
] as const;

const INCOME_COMPOSITION_CATEGORIES = [
  ['79451', 'Rendimento de todos os trabalhos'],
  ['79452', 'Rendimento de outras fontes'],
] as const;

const WATER_SUPPLY_CATEGORIES = [
  ['31471', 'Rede geral de distribuição'],
  ['72054', 'Poço profundo ou artesiano'],
  ['72055', 'Poço raso, freático ou cacimba'],
  ['72088', 'Fonte, nascente ou mina'],
  ['31472', 'Carro-pipa'],
  ['72089', 'Água da chuva armazenada'],
  ['72090', 'Rios, açudes, córregos, lagos e igarapés'],
  ['72091', 'Outra'],
] as const;

const SEWAGE_CATEGORIES = [
  ['46290', 'Rede geral, rede pluvial ou fossa ligada à rede'],
  ['72112', 'Fossa séptica ou fossa filtro não ligada à rede'],
  ['72113', 'Fossa rudimentar ou buraco'],
  ['92858', 'Vala'],
  ['72114', 'Rio, lago, córrego ou mar'],
  ['72115', 'Outra forma'],
  ['92861', 'Não tinham banheiro nem sanitário'],
] as const;

const BATHROOM_CATEGORIES = [
  ['12032', 'Tinham banheiro de uso exclusivo do domicílio'],
  ['72118', 'Apenas banheiro de uso comum a mais de um domicílio'],
  ['72119', 'Apenas sanitário ou buraco para dejeções'],
  ['12046', 'Não tinham banheiro nem sanitário'],
] as const;

const GARBAGE_CATEGORIES = [
  ['2520', 'Coletado'],
  ['72120', 'Coletado no domicílio por serviço de limpeza'],
  ['72121', 'Depositado em caçamba de serviço de limpeza'],
  ['72122', 'Queimado na propriedade'],
  ['72123', 'Enterrado na propriedade'],
  ['72124', 'Jogado em terreno baldio, encosta ou área pública'],
  ['1091', 'Outro destino'],
] as const;

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

    const [
      population,
      households,
      householdIncome,
      workIncome,
      laborForce,
      incomeDistribution,
      incomeBySex,
      incomeByRace,
      incomeByEducation,
      incomeComposition,
      sanitation,
    ] = await Promise.all([
      this.fetchPopulation(municipalityCode),
      this.fetchHouseholds(municipalityCode),
      this.fetchHouseholdIncome(municipalityCode),
      this.fetchWorkIncome(municipalityCode),
      this.fetchLaborForce(municipalityCode),
      this.fetchIncomeDistribution(municipalityCode),
      this.fetchIncomeBySex(municipalityCode),
      this.fetchIncomeByRace(municipalityCode),
      this.fetchIncomeByEducation(municipalityCode),
      this.fetchIncomeComposition(municipalityCode),
      this.fetchSanitation(municipalityCode),
    ]);
    const indicators = {
      population,
      ...households,
      indicatorGroups: [
        this.createGroup('baseline', 'Indicadores básicos', [
          this.createMetric(
            'population',
            'População residente',
            population,
            'Pessoas',
            SOURCE.population,
          ),
          this.createMetric(
            'occupiedHouseholds',
            'Domicílios particulares permanentes ocupados',
            households.occupiedHouseholds,
            'Domicílios',
            `${SOURCE.households}, variável 381`,
          ),
          this.createMetric(
            'residentsInHouseholds',
            'Moradores em domicílios particulares permanentes ocupados',
            households.residentsInHouseholds,
            'Pessoas',
            `${SOURCE.households}, variável 382`,
          ),
          this.createMetric(
            'averageResidentsPerHousehold',
            'Média de moradores por domicílio ocupado',
            households.averageResidentsPerHousehold,
            'Pessoas',
            `${SOURCE.households}, variável 5930`,
          ),
        ]),
        householdIncome,
        workIncome,
        laborForce,
        incomeDistribution,
        incomeBySex,
        incomeByRace,
        incomeByEducation,
        incomeComposition,
        sanitation,
      ],
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
  ): Promise<Omit<IbgeMunicipalityIndicators, 'population' | 'indicatorGroups'>> {
    const response = (await this.fetchJson(
      `/v3/agregados/9922/periodos/2022/variaveis/381|382|5930?localidades=N6[${municipalityCode}]&classificacao=1[6795]`,
    )) as IbgeAggregateResponse;

    return {
      occupiedHouseholds: this.readAggregateNumber(response, '381'),
      residentsInHouseholds: this.readAggregateNumber(response, '382'),
      averageResidentsPerHousehold: this.readAggregateNumber(response, '5930'),
    };
  }

  private async fetchHouseholdIncome(
    municipalityCode: string,
  ): Promise<IbgeSocioeconomicMetricGroup> {
    const response = (await this.fetchJson(
      `/v3/agregados/10295/periodos/2022/variaveis/13431|13534?localidades=N6[${municipalityCode}]&classificacao=2[${TOTAL_SEX}]|86[${TOTAL_RACE}]|58[${TOTAL_AGE}]`,
    )) as IbgeAggregateResponse;

    return this.createGroup('householdIncome', 'Renda domiciliar per capita', [
      this.createMetric(
        'averageHouseholdIncomePerCapita',
        'Renda domiciliar per capita média',
        this.readAggregateNumber(response, '13431'),
        'Reais',
        `${SOURCE.householdIncome}, variável 13431`,
      ),
      this.createMetric(
        'medianHouseholdIncomePerCapita',
        'Renda domiciliar per capita mediana',
        this.readAggregateNumber(response, '13534'),
        'Reais',
        `${SOURCE.householdIncome}, variável 13534`,
      ),
    ]);
  }

  private async fetchWorkIncome(municipalityCode: string): Promise<IbgeSocioeconomicMetricGroup> {
    const response = (await this.fetchJson(
      `/v3/agregados/10280/periodos/2022/variaveis/13535|13536|13537?localidades=N6[${municipalityCode}]&classificacao=2[${TOTAL_SEX}]|11913[${TOTAL_OCCUPATION_POSITION}]`,
    )) as IbgeAggregateResponse;

    return this.createGroup('workIncome', 'Trabalho e rendimento', [
      this.createMetric(
        'employedWithWorkIncome',
        'Pessoas ocupadas com rendimento de trabalho',
        this.readAggregateNumber(response, '13535'),
        'Pessoas',
        `${SOURCE.workIncome}, variável 13535`,
      ),
      this.createMetric(
        'averageWorkIncome',
        'Rendimento médio do trabalho',
        this.readAggregateNumber(response, '13536'),
        'Reais',
        `${SOURCE.workIncome}, variável 13536`,
      ),
      this.createMetric(
        'medianWorkIncome',
        'Rendimento mediano do trabalho',
        this.readAggregateNumber(response, '13537'),
        'Reais',
        `${SOURCE.workIncome}, variável 13537`,
      ),
    ]);
  }

  private async fetchLaborForce(municipalityCode: string): Promise<IbgeSocioeconomicMetricGroup> {
    const response = (await this.fetchJson(
      `/v3/agregados/6580/periodos/2022/variaveis/1641|1001641?localidades=N6[${municipalityCode}]&classificacao=629[32387,32447]|2[${TOTAL_SEX}]|58[${TOTAL_AGE}]`,
    )) as IbgeAggregateResponse;

    return this.createGroup('laborForce', 'Força de trabalho', [
      this.createMetric(
        'occupiedPopulation',
        'População ocupada',
        this.readAggregateNumber(response, '1641', { '629': '32387' }),
        'Pessoas',
        `${SOURCE.laborForce}, variável 1641`,
      ),
      this.createMetric(
        'outsideLaborForcePopulation',
        'População fora da força de trabalho',
        this.readAggregateNumber(response, '1641', { '629': '32447' }),
        'Pessoas',
        `${SOURCE.laborForce}, variável 1641`,
      ),
      this.createMetric(
        'occupationLevel',
        'Nível de ocupação',
        this.readAggregateNumber(response, '1001641', { '629': '32387' }),
        '%',
        `${SOURCE.laborForce}, variável 1001641`,
      ),
    ]);
  }

  private async fetchIncomeDistribution(
    municipalityCode: string,
  ): Promise<IbgeSocioeconomicMetricGroup> {
    const response = (await this.fetchJson(
      `/v3/agregados/10296/periodos/2022/variaveis/1013604?localidades=N6[${municipalityCode}]&classificacao=2[${TOTAL_SEX}]|86[${TOTAL_RACE}]|386[${INCOME_CLASSES.map(([id]) => id).join(',')}]`,
    )) as IbgeAggregateResponse;

    return this.createGroup(
      'incomeDistribution',
      'Distribuição por faixas de renda',
      INCOME_CLASSES.map(([categoryId, label]) =>
        this.createMetric(
          `incomeClass.${categoryId}`,
          label,
          this.readAggregateNumber(response, '1013604', { '386': categoryId }),
          '%',
          `${SOURCE.incomeDistribution}, variável 1013604`,
        ),
      ),
    );
  }

  private async fetchIncomeBySex(municipalityCode: string): Promise<IbgeSocioeconomicMetricGroup> {
    const response = (await this.fetchJson(
      `/v3/agregados/10295/periodos/2022/variaveis/13431?localidades=N6[${municipalityCode}]&classificacao=2[${SEX_CATEGORIES.map(([id]) => id).join(',')}]|86[${TOTAL_RACE}]|58[${TOTAL_AGE}]`,
    )) as IbgeAggregateResponse;

    return this.createGroup(
      'incomeBySex',
      'Renda domiciliar per capita por sexo',
      SEX_CATEGORIES.map(([categoryId, label]) =>
        this.createMetric(
          `householdIncomeBySex.${categoryId}`,
          label,
          this.readAggregateNumber(response, '13431', { '2': categoryId }),
          'Reais',
          `${SOURCE.householdIncome}, variável 13431`,
        ),
      ),
    );
  }

  private async fetchIncomeByRace(municipalityCode: string): Promise<IbgeSocioeconomicMetricGroup> {
    const response = (await this.fetchJson(
      `/v3/agregados/10295/periodos/2022/variaveis/13431?localidades=N6[${municipalityCode}]&classificacao=2[${TOTAL_SEX}]|86[${RACE_CATEGORIES.map(([id]) => id).join(',')}]|58[${TOTAL_AGE}]`,
    )) as IbgeAggregateResponse;

    return this.createGroup(
      'incomeByRace',
      'Renda domiciliar per capita por cor ou raça',
      RACE_CATEGORIES.map(([categoryId, label]) =>
        this.createMetric(
          `householdIncomeByRace.${categoryId}`,
          label,
          this.readAggregateNumber(response, '13431', { '86': categoryId }),
          'Reais',
          `${SOURCE.householdIncome}, variável 13431`,
        ),
      ),
    );
  }

  private async fetchIncomeByEducation(
    municipalityCode: string,
  ): Promise<IbgeSocioeconomicMetricGroup> {
    const response = (await this.fetchJson(
      `/v3/agregados/10281/periodos/2022/variaveis/13536?localidades=N6[${municipalityCode}]&classificacao=2[${TOTAL_SEX}]|86[${TOTAL_RACE}]|1568[${EDUCATION_CATEGORIES.map(([id]) => id).join(',')}]|526[${TOTAL_SOCIAL_SECURITY_CONTRIBUTION}]`,
    )) as IbgeAggregateResponse;

    return this.createGroup(
      'incomeByEducation',
      'Rendimento médio do trabalho por nível de instrução',
      EDUCATION_CATEGORIES.map(([categoryId, label]) =>
        this.createMetric(
          `workIncomeByEducation.${categoryId}`,
          label,
          this.readAggregateNumber(response, '13536', { '1568': categoryId }),
          'Reais',
          `${SOURCE.incomeByEducation}, variável 13536`,
        ),
      ),
    );
  }

  private async fetchIncomeComposition(
    municipalityCode: string,
  ): Promise<IbgeSocioeconomicMetricGroup> {
    const response = (await this.fetchJson(
      `/v3/agregados/10297/periodos/2022/variaveis/13504?localidades=N6[${municipalityCode}]&classificacao=11308[${INCOME_COMPOSITION_CATEGORIES.map(([id]) => id).join(',')}]`,
    )) as IbgeAggregateResponse;

    return this.createGroup(
      'incomeComposition',
      'Composição do rendimento domiciliar',
      INCOME_COMPOSITION_CATEGORIES.map(([categoryId, label]) =>
        this.createMetric(
          `incomeComposition.${categoryId}`,
          label,
          this.readAggregateNumber(response, '13504', { '11308': categoryId }),
          '%',
          `${SOURCE.incomeComposition}, variável 13504`,
        ),
      ),
    );
  }

  private async fetchSanitation(municipalityCode: string): Promise<IbgeSocioeconomicMetricGroup> {
    const [waterSupply, sewage, bathroom, garbage] = await Promise.all([
      this.fetchWaterSupply(municipalityCode),
      this.fetchSewage(municipalityCode),
      this.fetchBathroom(municipalityCode),
      this.fetchGarbage(municipalityCode),
    ]);

    return this.createGroup('sanitation', 'Saneamento e características do domicílio', [
      ...waterSupply,
      ...sewage,
      ...garbage,
      ...bathroom,
    ]);
  }

  private async fetchWaterSupply(municipalityCode: string): Promise<IbgeSocioeconomicMetric[]> {
    const response = (await this.fetchJson(
      `/v3/agregados/6804/periodos/2022/variaveis/1000381?localidades=N6[${municipalityCode}]&classificacao=301[${WATER_SUPPLY_CATEGORIES.map(([id]) => id).join(',')}]|1817[${TOTAL_WATER_PLUMBING}]`,
    )) as IbgeAggregateResponse;

    return WATER_SUPPLY_CATEGORIES.map(([categoryId, label]) =>
      this.createMetric(
        `waterSupply.${categoryId}`,
        `Abastecimento de água - ${label}`,
        this.readAggregateNumber(response, '1000381', { '301': categoryId }),
        '%',
        `${SOURCE.waterSupply}, variável 1000381`,
      ),
    );
  }

  private async fetchSewage(municipalityCode: string): Promise<IbgeSocioeconomicMetric[]> {
    const response = (await this.fetchJson(
      `/v3/agregados/6805/periodos/2022/variaveis/1000381?localidades=N6[${municipalityCode}]&classificacao=11558[${SEWAGE_CATEGORIES.map(([id]) => id).join(',')}]`,
    )) as IbgeAggregateResponse;

    return SEWAGE_CATEGORIES.map(([categoryId, label]) =>
      this.createMetric(
        `sewage.${categoryId}`,
        `Esgotamento sanitário - ${label}`,
        this.readAggregateNumber(response, '1000381', { '11558': categoryId }),
        '%',
        `${SOURCE.sewage}, variável 1000381`,
      ),
    );
  }

  private async fetchBathroom(municipalityCode: string): Promise<IbgeSocioeconomicMetric[]> {
    const response = (await this.fetchJson(
      `/v3/agregados/6806/periodos/2022/variaveis/1000381?localidades=N6[${municipalityCode}]&classificacao=458[${BATHROOM_CATEGORIES.map(([id]) => id).join(',')}]|11558[${TOTAL_SEWAGE}]`,
    )) as IbgeAggregateResponse;

    return BATHROOM_CATEGORIES.map(([categoryId, label]) =>
      this.createMetric(
        `bathroom.${categoryId}`,
        `Banheiro ou sanitário - ${label}`,
        this.readAggregateNumber(response, '1000381', { '458': categoryId }),
        '%',
        `${SOURCE.bathroom}, variável 1000381`,
      ),
    );
  }

  private async fetchGarbage(municipalityCode: string): Promise<IbgeSocioeconomicMetric[]> {
    const response = (await this.fetchJson(
      `/v3/agregados/6892/periodos/2022/variaveis/1000381?localidades=N6[${municipalityCode}]&classificacao=67[${GARBAGE_CATEGORIES.map(([id]) => id).join(',')}]`,
    )) as IbgeAggregateResponse;

    return GARBAGE_CATEGORIES.map(([categoryId, label]) =>
      this.createMetric(
        `garbage.${categoryId}`,
        `Coleta de lixo - ${label}`,
        this.readAggregateNumber(response, '1000381', { '67': categoryId }),
        '%',
        `${SOURCE.garbage}, variável 1000381`,
      ),
    );
  }

  private createGroup(
    key: string,
    label: string,
    indicators: IbgeSocioeconomicMetric[],
  ): IbgeSocioeconomicMetricGroup {
    return {
      key,
      label,
      indicators,
    };
  }

  private createMetric(
    key: string,
    label: string,
    value: number | null,
    unit: string,
    source: string,
  ): IbgeSocioeconomicMetric {
    return {
      key,
      label,
      value,
      unit,
      source,
      referenceYear: REFERENCE_YEAR,
    };
  }

  private readAggregateNumber(
    response: IbgeAggregateResponse | IbgeAggregateResponseItem,
    variableId: string,
    classificationFilter: IbgeAggregateClassificationFilter = {},
  ): number | null {
    const variables = Array.isArray(response) ? response : [response];
    const variable = variables.find((item) => item.id === variableId);
    const result = variable?.resultados?.find((item) =>
      this.matchesClassificationFilter(item.classificacoes ?? [], classificationFilter),
    );
    const value = result?.series?.[0]?.serie?.[String(REFERENCE_YEAR)];

    if (!value || value === '-' || value === '...') {
      return null;
    }

    const parsed = Number(value.includes(',') ? value.replace(/\./g, '').replace(',', '.') : value);

    return Number.isFinite(parsed) ? parsed : null;
  }

  private matchesClassificationFilter(
    classifications: NonNullable<IbgeAggregateResponseItem['resultados']>[number]['classificacoes'],
    filter: IbgeAggregateClassificationFilter,
  ): boolean {
    return Object.entries(filter).every(([classificationId, categoryId]) =>
      classifications?.some((classification) => {
        const category = classification.categoria ?? {};
        return classification.id === classificationId && Object.hasOwn(category, categoryId);
      }),
    );
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

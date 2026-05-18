import { Injectable, Logger, type OnApplicationBootstrap } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import type { Repository } from 'typeorm';
import { assertBrazilianState, type BrazilianState } from '../../domain/brazilian-state';
import { InfrastructurePoint } from '../../infrastructure/persistence/entities/infrastructure-point.entity';
import {
  MeteorologyAsset,
  MeteorologyAssetStatus,
} from '../../infrastructure/persistence/entities/meteorology-asset.entity';
import { Municipality } from '../../infrastructure/persistence/entities/municipality.entity';

type PointGeometry = {
  type: 'Point';
  coordinates: [number, number];
};

type PolygonGeometry = {
  type: 'Polygon';
  coordinates: [Array<[number, number]>];
};

type MunicipalitySeed = {
  name: string;
  state: BrazilianState;
  population: number;
  coordinates: [number, number];
};

type CapitalPlacementProfile = {
  assetLngStep: number;
  assetLatStep: number;
  coverageLngRadius: number;
  coverageLatRadius: number;
};

type SpecificCapitalAssetPlacement = {
  name: string;
  coordinates: [number, number];
};

const TARGET_METEOROLOGY_ASSETS_COUNT = 90;
const DEFAULT_CAPITAL_PLACEMENT_PROFILE: CapitalPlacementProfile = {
  assetLngStep: 0.024,
  assetLatStep: 0.017,
  coverageLngRadius: 0.0055,
  coverageLatRadius: 0.004,
};
const WATER_SENSITIVE_CAPITAL_PLACEMENT_PROFILE: CapitalPlacementProfile = {
  assetLngStep: 0.0105,
  assetLatStep: 0.0075,
  coverageLngRadius: 0.0028,
  coverageLatRadius: 0.002,
};
const WATER_SENSITIVE_STATES: BrazilianState[] = [
  'AL',
  'AM',
  'AP',
  'BA',
  'CE',
  'ES',
  'MA',
  'PA',
  'PB',
  'PE',
  'PI',
  'RJ',
  'RN',
  'RO',
  'RS',
  'SC',
  'SE',
];
const ASSET_OFFSET_PATTERNS: Array<[number, number]> = [
  [-1.15, 0.55],
  [0.95, -0.7],
  [0.35, 1.2],
  [-0.6, -1.05],
  [1.15, 0.45],
  [-0.9, -0.35],
];
const SPECIFIC_CAPITAL_ASSET_PLACEMENTS: Record<string, SpecificCapitalAssetPlacement[]> = {
  'PA:Belem': [
    {
      name: '14 SETOR',
      coordinates: [-48.454269331682, -1.402101078396209],
    },
    {
      name: '07 SETOR',
      coordinates: [-48.44502109037465, -1.4566665776308565],
    },
    {
      name: '04 SETOR',
      coordinates: [-48.46897759784098, -1.4620388948113543],
    },
  ],
};
const MUNICIPALITY_SEED_DATA: MunicipalitySeed[] = [
  { name: 'Rio Branco', state: 'AC', population: 364756, coordinates: [-67.8243, -9.974] },
  { name: 'Maceió', state: 'AL', population: 957916, coordinates: [-35.735, -9.6658] },
  { name: 'Macapa', state: 'AP', population: 442933, coordinates: [-51.05, 0.0349] },
  { name: 'Manaus', state: 'AM', population: 2063689, coordinates: [-60.0217, -3.119] },
  { name: 'Salvador', state: 'BA', population: 2417678, coordinates: [-38.5014, -12.9777] },
  { name: 'Fortaleza', state: 'CE', population: 2428678, coordinates: [-38.5267, -3.7319] },
  { name: 'Brasilia', state: 'DF', population: 2817381, coordinates: [-47.8825, -15.7942] },
  { name: 'Vitória', state: 'ES', population: 322869, coordinates: [-40.3377, -20.3155] },
  { name: 'Goiânia', state: 'GO', population: 1437366, coordinates: [-49.2643, -16.6869] },
  { name: 'São Luís', state: 'MA', population: 1037775, coordinates: [-44.3028, -2.5307] },
  { name: 'Cuiaba', state: 'MT', population: 650912, coordinates: [-56.0967, -15.601] },
  { name: 'Campo Grande', state: 'MS', population: 898100, coordinates: [-54.6464, -20.4697] },
  { name: 'Belo Horizonte', state: 'MG', population: 2315560, coordinates: [-43.9345, -19.9167] },
  { name: 'Belem', state: 'PA', population: 1303389, coordinates: [-48.5044, -1.4558] },
  { name: 'Joao Pessoa', state: 'PB', population: 833932, coordinates: [-34.845, -7.1195] },
  { name: 'Curitiba', state: 'PR', population: 1773718, coordinates: [-49.2733, -25.4284] },
  { name: 'Recife', state: 'PE', population: 1488920, coordinates: [-34.877, -8.0476] },
  { name: 'Teresina', state: 'PI', population: 866300, coordinates: [-42.8016, -5.0892] },
  { name: 'Rio de Janeiro', state: 'RJ', population: 6211423, coordinates: [-43.1729, -22.9068] },
  { name: 'Natal', state: 'RN', population: 751300, coordinates: [-35.2094, -5.7945] },
  { name: 'Porto Alegre', state: 'RS', population: 1332845, coordinates: [-51.2177, -30.0346] },
  { name: 'Porto Velho', state: 'RO', population: 460434, coordinates: [-63.9039, -8.7608] },
  { name: 'Boa Vista', state: 'RR', population: 413486, coordinates: [-60.6758, 2.8235] },
  { name: 'Florianopolis', state: 'SC', population: 537211, coordinates: [-48.5482, -27.5949] },
  { name: 'São Paulo', state: 'SP', population: 11451999, coordinates: [-46.6333, -23.5505] },
  { name: 'Aracaju', state: 'SE', population: 602757, coordinates: [-37.0717, -10.9472] },
  { name: 'Palmas', state: 'TO', population: 302692, coordinates: [-48.3336, -10.184] },
];

@Injectable()
export class SeedMunicipalitiesService implements OnApplicationBootstrap {
  private readonly logger = new Logger(SeedMunicipalitiesService.name);

  public constructor(
    @InjectRepository(Municipality)
    private readonly municipalityRepository: Repository<Municipality>,
    @InjectRepository(InfrastructurePoint)
    private readonly infrastructurePointRepository: Repository<InfrastructurePoint>,
    @InjectRepository(MeteorologyAsset)
    private readonly meteorologyAssetRepository: Repository<MeteorologyAsset>,
  ) {}

  public async onApplicationBootstrap(): Promise<void> {
    await this.resetGeoMock();
  }

  public async resetGeoMock(): Promise<void> {
    for (const municipalitySeed of MUNICIPALITY_SEED_DATA) {
      assertBrazilianState(municipalitySeed.state);
    }

    await this.meteorologyAssetRepository.query('DROP TABLE IF EXISTS socioeconomic_area CASCADE');
    await this.meteorologyAssetRepository.query(`
      TRUNCATE TABLE
        meteorology_asset,
        infrastructure_point,
        municipality
      RESTART IDENTITY CASCADE
    `);

    const municipalities = await this.municipalityRepository.save(
      MUNICIPALITY_SEED_DATA.map((seed) => this.municipalityRepository.create(seed)),
    );

    for (let assetNumber = 1; assetNumber <= TARGET_METEOROLOGY_ASSETS_COUNT; assetNumber += 1) {
      const municipalityIndex = (assetNumber - 1) % municipalities.length;
      const municipalitySeed = MUNICIPALITY_SEED_DATA[municipalityIndex];
      const municipalityAssetIndex = Math.floor((assetNumber - 1) / municipalities.length);
      const specificPlacement = this.getSpecificAssetPlacement(
        municipalitySeed,
        municipalityAssetIndex,
      );
      const coordinates =
        specificPlacement?.coordinates ??
        this.createAssetCoordinates(municipalitySeed, municipalityAssetIndex);
      const assetName =
        specificPlacement?.name ?? `Estação Meteorológica ${String(assetNumber).padStart(2, '0')}`;
      const infrastructurePoint = await this.infrastructurePointRepository.save(
        this.infrastructurePointRepository.create({
          name: assetName,
          description: specificPlacement
            ? `Ativo meteorológico de referência da POC ${assetNumber} em ${specificPlacement.name}, ${municipalitySeed.name}/${municipalitySeed.state}`
            : `Ativo meteorológico de referência da POC ${assetNumber}`,
          municipalityId: municipalities[municipalityIndex].id,
          geometry: this.createPointGeometry(coordinates) as unknown as string,
        }),
      );

      await this.meteorologyAssetRepository.save(
        this.meteorologyAssetRepository.create({
          infrastructurePointId: infrastructurePoint.id,
          infrastructurePoint,
          status: this.createStatus(assetNumber),
          coverageArea: this.createCoverageArea(
            municipalitySeed.state,
            coordinates,
            assetNumber,
          ) as unknown as string,
        }),
      );
    }

    this.logger.log(`Geo seed reset completed with ${TARGET_METEOROLOGY_ASSETS_COUNT} assets.`);
  }

  private createAssetCoordinates(
    municipalitySeed: MunicipalitySeed,
    municipalityAssetIndex: number,
  ): [number, number] {
    const [lng, lat] = municipalitySeed.coordinates;
    const placementProfile = this.getPlacementProfile(municipalitySeed.state);
    const [lngOffsetFactor, latOffsetFactor] =
      ASSET_OFFSET_PATTERNS[municipalityAssetIndex % ASSET_OFFSET_PATTERNS.length];

    return [
      this.roundCoordinate(lng + lngOffsetFactor * placementProfile.assetLngStep),
      this.roundCoordinate(lat + latOffsetFactor * placementProfile.assetLatStep),
    ];
  }

  private createPointGeometry(coordinates: [number, number]): PointGeometry {
    return {
      type: 'Point',
      coordinates,
    };
  }

  private createCoverageArea(
    state: BrazilianState,
    [lng, lat]: [number, number],
    assetNumber: number,
  ): PolygonGeometry {
    const verticesCount = 8;
    const placementProfile = this.getPlacementProfile(state);
    const angleOffset = ((assetNumber % verticesCount) * Math.PI) / 18;
    const baseLngRadius = placementProfile.coverageLngRadius * (0.9 + (assetNumber % 3) * 0.05);
    const baseLatRadius = placementProfile.coverageLatRadius * (0.9 + (assetNumber % 2) * 0.05);
    const coordinates: Array<[number, number]> = [];

    for (let index = 0; index < verticesCount; index += 1) {
      const angle = angleOffset + (index / verticesCount) * Math.PI * 2;
      const radiusFactor = 0.74 + (((assetNumber * 17 + index * 29) % 100) / 100) * 0.38;

      coordinates.push([
        this.roundCoordinate(lng + Math.cos(angle) * baseLngRadius * radiusFactor),
        this.roundCoordinate(lat + Math.sin(angle) * baseLatRadius * radiusFactor),
      ]);
    }

    coordinates.push(coordinates[0]);

    return {
      type: 'Polygon',
      coordinates: [coordinates],
    };
  }

  private getPlacementProfile(state: BrazilianState): CapitalPlacementProfile {
    if (WATER_SENSITIVE_STATES.includes(state)) {
      return WATER_SENSITIVE_CAPITAL_PLACEMENT_PROFILE;
    }

    return DEFAULT_CAPITAL_PLACEMENT_PROFILE;
  }

  private getSpecificAssetPlacement(
    municipalitySeed: MunicipalitySeed,
    municipalityAssetIndex: number,
  ): SpecificCapitalAssetPlacement | null {
    const placements =
      SPECIFIC_CAPITAL_ASSET_PLACEMENTS[`${municipalitySeed.state}:${municipalitySeed.name}`];

    return placements?.[municipalityAssetIndex % placements.length] ?? null;
  }

  private roundCoordinate(coordinate: number): number {
    return Number(coordinate.toFixed(6));
  }

  private createStatus(assetNumber: number): MeteorologyAssetStatus {
    const statuses = [
      MeteorologyAssetStatus.NOT_STARTED,
      MeteorologyAssetStatus.STARTED,
      MeteorologyAssetStatus.CONCLUDED,
    ];

    return statuses[(assetNumber - 1) % statuses.length];
  }
}

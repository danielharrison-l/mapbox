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
import { SocioeconomicArea } from '../../infrastructure/persistence/entities/socioeconomic-area.entity';

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

type SocioeconomicAreaSeed = {
  name: string;
  state: BrazilianState;
  population: number;
  averageMonthlyIncome: number;
  coordinates: [number, number];
};

const TARGET_METEOROLOGY_ASSETS_COUNT = 90;
const SOCIOECONOMIC_AREAS_PER_METEOROLOGY_ASSET = 3;

const MUNICIPALITY_SEED_DATA: MunicipalitySeed[] = [
  { name: 'Rio Branco', state: 'AC', population: 364756, coordinates: [-67.8243, -9.974] },
  { name: 'Maceio', state: 'AL', population: 957916, coordinates: [-35.735, -9.6658] },
  { name: 'Macapa', state: 'AP', population: 442933, coordinates: [-51.05, 0.0349] },
  { name: 'Manaus', state: 'AM', population: 2063689, coordinates: [-60.0217, -3.119] },
  { name: 'Salvador', state: 'BA', population: 2417678, coordinates: [-38.5014, -12.9777] },
  { name: 'Fortaleza', state: 'CE', population: 2428678, coordinates: [-38.5267, -3.7319] },
  { name: 'Brasilia', state: 'DF', population: 2817381, coordinates: [-47.8825, -15.7942] },
  { name: 'Vitoria', state: 'ES', population: 322869, coordinates: [-40.3377, -20.3155] },
  { name: 'Goiania', state: 'GO', population: 1437366, coordinates: [-49.2643, -16.6869] },
  { name: 'Sao Luis', state: 'MA', population: 1037775, coordinates: [-44.3028, -2.5307] },
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
  { name: 'Sao Paulo', state: 'SP', population: 11451999, coordinates: [-46.6333, -23.5505] },
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
    @InjectRepository(SocioeconomicArea)
    private readonly socioeconomicAreaRepository: Repository<SocioeconomicArea>,
  ) {}

  public async onApplicationBootstrap(): Promise<void> {
    await this.resetGeoMock();
  }

  public async resetGeoMock(): Promise<void> {
    for (const municipalitySeed of MUNICIPALITY_SEED_DATA) {
      assertBrazilianState(municipalitySeed.state);
    }

    await this.meteorologyAssetRepository.createQueryBuilder().delete().execute();
    await this.infrastructurePointRepository.createQueryBuilder().delete().execute();
    await this.municipalityRepository.createQueryBuilder().delete().execute();
    await this.socioeconomicAreaRepository.createQueryBuilder().delete().execute();

    const municipalities = await this.municipalityRepository.save(
      MUNICIPALITY_SEED_DATA.map((seed) => this.municipalityRepository.create(seed)),
    );
    const socioeconomicAreaSeeds: SocioeconomicAreaSeed[] = [];

    for (let assetNumber = 1; assetNumber <= TARGET_METEOROLOGY_ASSETS_COUNT; assetNumber += 1) {
      const municipalityIndex = (assetNumber - 1) % municipalities.length;
      const municipalitySeed = MUNICIPALITY_SEED_DATA[municipalityIndex];
      const coordinates = this.createAssetCoordinates(
        municipalitySeed.coordinates,
        assetNumber,
      );
      const infrastructurePoint = await this.infrastructurePointRepository.save(
        this.infrastructurePointRepository.create({
          name: `Estacao Meteorologica ${String(assetNumber).padStart(2, '0')}`,
          description: `Ativo meteorologico de referencia da POC ${assetNumber}`,
          municipalityId: municipalities[municipalityIndex].id,
          geometry: this.createPointGeometry(coordinates) as unknown as string,
        }),
      );

      await this.meteorologyAssetRepository.save(
        this.meteorologyAssetRepository.create({
          infrastructurePointId: infrastructurePoint.id,
          infrastructurePoint,
          status: this.createStatus(assetNumber),
          coverageArea: this.createCoverageArea(coordinates, assetNumber) as unknown as string,
        }),
      );

      socioeconomicAreaSeeds.push(
        ...this.createSocioeconomicAreaSeeds(municipalitySeed, coordinates, assetNumber),
      );
    }

    await this.socioeconomicAreaRepository.save(
      socioeconomicAreaSeeds.map((seed) =>
        this.socioeconomicAreaRepository.create({
          name: seed.name,
          state: seed.state,
          population: seed.population,
          averageMonthlyIncome: seed.averageMonthlyIncome,
          geometry: this.createPointGeometry(seed.coordinates) as unknown as string,
        }),
      ),
    );

    this.logger.log(
      `Geo mock reset completed with ${TARGET_METEOROLOGY_ASSETS_COUNT} assets and ${socioeconomicAreaSeeds.length} socioeconomic areas.`,
    );
  }

  private createAssetCoordinates(
    [lng, lat]: [number, number],
    assetNumber: number,
  ): [number, number] {
    const columnOffset = ((assetNumber - 1) % 5) - 2;
    const rowOffset = (Math.floor((assetNumber - 1) / 5) % 3) - 1;

    return [lng + columnOffset * 0.11, lat + rowOffset * 0.08];
  }

  private createPointGeometry(coordinates: [number, number]): PointGeometry {
    return {
      type: 'Point',
      coordinates,
    };
  }

  private createCoverageArea([lng, lat]: [number, number], assetNumber: number): PolygonGeometry {
    const verticesCount = 8;
    const angleOffset = ((assetNumber % verticesCount) * Math.PI) / 18;
    const baseLngRadius = 0.2 + (assetNumber % 5) * 0.025;
    const baseLatRadius = 0.16 + (assetNumber % 4) * 0.022;
    const coordinates: Array<[number, number]> = [];

    for (let index = 0; index < verticesCount; index += 1) {
      const angle = angleOffset + (index / verticesCount) * Math.PI * 2;
      const radiusFactor = 0.74 + (((assetNumber * 17 + index * 29) % 100) / 100) * 0.38;

      coordinates.push([
        Number((lng + Math.cos(angle) * baseLngRadius * radiusFactor).toFixed(6)),
        Number((lat + Math.sin(angle) * baseLatRadius * radiusFactor).toFixed(6)),
      ]);
    }

    coordinates.push(coordinates[0]);

    return {
      type: 'Polygon',
      coordinates: [coordinates],
    };
  }

  private createSocioeconomicAreaSeeds(
    municipalitySeed: MunicipalitySeed,
    [lng, lat]: [number, number],
    assetNumber: number,
  ): SocioeconomicAreaSeed[] {
    const offsets: Array<[number, number]> = [
      [0, 0],
      [0.035, 0.018],
      [-0.032, -0.021],
    ];

    return offsets.slice(0, SOCIOECONOMIC_AREAS_PER_METEOROLOGY_ASSET).map(
      ([lngOffset, latOffset], index): SocioeconomicAreaSeed => ({
        name: `Setor Socioeconomico ${String(assetNumber).padStart(2, '0')}-${index + 1}`,
        state: municipalitySeed.state,
        population: 350 + ((assetNumber * 137 + index * 211) % 1450),
        averageMonthlyIncome: 1200 + ((assetNumber * 173 + index * 397) % 5200),
        coordinates: [
          Number((lng + lngOffset).toFixed(6)),
          Number((lat + latOffset).toFixed(6)),
        ],
      }),
    );
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

import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import type { Repository } from 'typeorm';
import type {
  CoverageSocioeconomicAreaOutput,
  CoverageSocioeconomicDataOutput,
} from '../../../../application/dto/coverage-socioeconomic-data.output';
import type { FindMeteorologyAssetsInput } from '../../../../application/dto/find-meteorology-assets.input';
import type { BrazilianState } from '../../../../domain/brazilian-state';
import { MeteorologyAsset } from '../../entities/meteorology-asset.entity';
import type { MeteorologyAssetRepository } from '../meteorology-asset.repository';

type CoverageSocioeconomicAreaRow = {
  id: number | string;
  name: string;
  state: BrazilianState | null;
  population: number | string;
  averageMonthlyIncome: number | string;
};

type CoverageSocioeconomicDataRow = {
  infrastructurePointId: number | string;
  externalAreasCount: number | string;
  totalPopulation: number | string;
  averageMonthlyIncome: number | string | null;
  areas: CoverageSocioeconomicAreaRow[] | string | null;
};

@Injectable()
export class TypeOrmMeteorologyAssetRepository implements MeteorologyAssetRepository {
  public constructor(
    @InjectRepository(MeteorologyAsset)
    private readonly repository: Repository<MeteorologyAsset>,
  ) {}

  public async save(entity: MeteorologyAsset): Promise<MeteorologyAsset> {
    return this.repository.save(entity);
  }

  public async findAll(filters: FindMeteorologyAssetsInput = {}): Promise<MeteorologyAsset[]> {
    const queryBuilder = this.repository
      .createQueryBuilder('meteorologyAsset')
      .innerJoinAndSelect('meteorologyAsset.infrastructurePoint', 'infrastructurePoint')
      .innerJoinAndSelect('infrastructurePoint.municipality', 'municipality')
      .orderBy('meteorologyAsset.infrastructurePointId', 'ASC');

    if (filters.status) {
      queryBuilder.andWhere('meteorologyAsset.status = :status', {
        status: filters.status,
      });
    }

    if (filters.state) {
      queryBuilder.andWhere('municipality.state = :state', {
        state: filters.state,
      });
    }

    return queryBuilder.getMany();
  }

  public async findByInfrastructurePointId(
    infrastructurePointId: number,
  ): Promise<MeteorologyAsset | null> {
    return this.repository.findOne({
      where: {
        infrastructurePointId,
      },
      relations: {
        infrastructurePoint: {
          municipality: true,
        },
      },
    });
  }

  public async findCoverageSocioeconomicDataByInfrastructurePointId(
    infrastructurePointId: number,
  ): Promise<CoverageSocioeconomicDataOutput | null> {
    const rows = (await this.repository.query(
      `
        SELECT
          asset.infrastructure_point_id AS "infrastructurePointId",
          COUNT(socioeconomic_area.id)::int AS "externalAreasCount",
          COALESCE(SUM(socioeconomic_area.population), 0)::int AS "totalPopulation",
          COALESCE(
            ROUND(
              SUM(
                socioeconomic_area.average_monthly_income * socioeconomic_area.population
              )::numeric / NULLIF(SUM(socioeconomic_area.population), 0),
              2
            ),
            0
          ) AS "averageMonthlyIncome",
          COALESCE(
            JSON_AGG(
              JSON_BUILD_OBJECT(
                'id', socioeconomic_area.id,
                'name', socioeconomic_area.name,
                'state', socioeconomic_area.state,
                'population', socioeconomic_area.population,
                'averageMonthlyIncome', socioeconomic_area.average_monthly_income
              )
              ORDER BY socioeconomic_area.id
            ) FILTER (WHERE socioeconomic_area.id IS NOT NULL),
            '[]'::json
          ) AS "areas"
        FROM meteorology_asset asset
        LEFT JOIN socioeconomic_area socioeconomic_area
          ON ST_Contains(asset.coverage_area, socioeconomic_area.geometry)
        WHERE asset.infrastructure_point_id = $1
        GROUP BY asset.infrastructure_point_id
      `,
      [infrastructurePointId],
    )) as CoverageSocioeconomicDataRow[];

    const [row] = rows;

    if (!row) {
      return null;
    }

    return {
      infrastructurePointId: Number(row.infrastructurePointId),
      externalAreasCount: Number(row.externalAreasCount),
      totalPopulation: Number(row.totalPopulation),
      averageMonthlyIncome: Number(row.averageMonthlyIncome ?? 0),
      areas: this.parseCoverageSocioeconomicAreas(row.areas),
    };
  }

  private parseCoverageSocioeconomicAreas(
    areas: CoverageSocioeconomicDataRow['areas'],
  ): CoverageSocioeconomicAreaOutput[] {
    const parsedAreas =
      typeof areas === 'string'
        ? (JSON.parse(areas) as CoverageSocioeconomicAreaRow[])
        : (areas ?? []);

    return parsedAreas.map((area) => ({
      id: Number(area.id),
      name: area.name,
      state: area.state,
      population: Number(area.population),
      averageMonthlyIncome: Number(area.averageMonthlyIncome),
    }));
  }
}

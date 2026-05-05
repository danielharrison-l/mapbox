import assert from 'node:assert/strict';
import { describe, it } from 'node:test';
import type { Repository } from 'typeorm';
import { TypeOrmMeteorologyAssetRepository } from '../../../../../../../src/modules/geo/infrastructure/persistence/repositories/typeorm/typeorm-meteorology-asset.repository';
import type { MeteorologyAsset } from '../../../../../../../src/modules/geo/infrastructure/persistence/entities/meteorology-asset.entity';

describe('TypeOrmMeteorologyAssetRepository', () => {
  it('crosses socioeconomic data covered by a meteorology asset coverage polygon with PostGIS', async () => {
    const queries: Array<{ sql: string; params: unknown[] }> = [];
    const repository = {
      query: async (sql: string, params: unknown[]) => {
        queries.push({ sql, params });

        return [
          {
            infrastructurePointId: 42,
            externalAreasCount: '2',
            totalPopulation: '1500',
            averageMonthlyIncome: '2750.5',
            areas: [
              {
                id: 1,
                name: 'Setor censitario 1',
                state: 'AL',
                population: 500,
                averageMonthlyIncome: 2000,
                geometry: {
                  type: 'Point',
                  coordinates: [-35.735, -9.6658],
                },
              },
              {
                id: 2,
                name: 'Setor censitario 2',
                state: 'AL',
                population: 1000,
                averageMonthlyIncome: 3125.75,
                geometry: {
                  type: 'Point',
                  coordinates: [-35.734, -9.6648],
                },
              },
            ],
          },
        ];
      },
    } as unknown as Repository<MeteorologyAsset>;

    const sut = new TypeOrmMeteorologyAssetRepository(repository);

    const result = await sut.findCoverageSocioeconomicDataByInfrastructurePointId(42);

    assert.equal(result?.infrastructurePointId, 42);
    assert.equal(result?.externalAreasCount, 2);
    assert.equal(result?.totalPopulation, 1500);
    assert.equal(result?.averageMonthlyIncome, 2750.5);
    assert.deepEqual(result?.areas, [
      {
        id: 1,
        name: 'Setor censitario 1',
        state: 'AL',
        population: 500,
        averageMonthlyIncome: 2000,
        geometry: {
          type: 'Point',
          coordinates: [-35.735, -9.6658],
        },
      },
      {
        id: 2,
        name: 'Setor censitario 2',
        state: 'AL',
        population: 1000,
        averageMonthlyIncome: 3125.75,
        geometry: {
          type: 'Point',
          coordinates: [-35.734, -9.6648],
        },
      },
    ]);
    assert.equal(queries[0].params[0], 42);
    assert.match(queries[0].sql, /ST_Covers\(/);
    assert.match(queries[0].sql, /ST_AsGeoJSON\(/);
    assert.match(queries[0].sql, /meteorology_asset/);
    assert.match(queries[0].sql, /socioeconomic_area/);
  });
});

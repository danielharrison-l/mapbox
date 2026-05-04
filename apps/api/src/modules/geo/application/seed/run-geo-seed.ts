import 'reflect-metadata';
import { Logger } from '@nestjs/common';
import dataSource from '../../../../database/typeorm/data-source';
import { InfrastructurePoint } from '../../infrastructure/persistence/entities/infrastructure-point.entity';
import { MeteorologyAsset } from '../../infrastructure/persistence/entities/meteorology-asset.entity';
import { Municipality } from '../../infrastructure/persistence/entities/municipality.entity';
import { SocioeconomicArea } from '../../infrastructure/persistence/entities/socioeconomic-area.entity';
import { SeedMunicipalitiesService } from './seed-municipalities.service';

async function runGeoSeed(): Promise<void> {
  const logger = new Logger('GeoSeed');

  await dataSource.initialize();

  try {
    const seedService = new SeedMunicipalitiesService(
      dataSource.getRepository(Municipality),
      dataSource.getRepository(InfrastructurePoint),
      dataSource.getRepository(MeteorologyAsset),
      dataSource.getRepository(SocioeconomicArea),
    );

    await seedService.resetGeoMock();
    logger.log('Geo seed completed.');
  } finally {
    await dataSource.destroy();
  }
}

void runGeoSeed().catch((error: unknown) => {
  const logger = new Logger('GeoSeed');
  logger.error('Geo seed failed.', error instanceof Error ? error.stack : String(error));
  process.exitCode = 1;
});

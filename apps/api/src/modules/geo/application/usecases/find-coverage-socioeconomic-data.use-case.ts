import { Inject, Injectable } from '@nestjs/common';
import type { CoverageSocioeconomicDataOutput } from '../dto/coverage-socioeconomic-data.output';
import type { MeteorologyAssetRepository } from '../../infrastructure/persistence/repositories/meteorology-asset.repository';
import { METEOROLOGY_ASSET_REPOSITORY } from '../../infrastructure/persistence/repositories/providers/repositories.providers';

@Injectable()
export class FindCoverageSocioeconomicDataUseCase {
  public constructor(
    @Inject(METEOROLOGY_ASSET_REPOSITORY)
    private readonly meteorologyAssetRepository: MeteorologyAssetRepository,
  ) {}

  public async execute(
    infrastructurePointId: number,
  ): Promise<CoverageSocioeconomicDataOutput | null> {
    return this.meteorologyAssetRepository.findCoverageSocioeconomicDataByInfrastructurePointId(
      infrastructurePointId,
    );
  }
}

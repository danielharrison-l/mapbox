import { Inject, Injectable } from '@nestjs/common';
import type { MunicipalityOutput } from '../dto/municipality.output';
import { MunicipalityMapper } from '../../infrastructure/mapper/municipality.mapper';
import type { MunicipalityRepository } from '../../infrastructure/persistence/repositories/municipality.repository';
import { MUNICIPALITY_REPOSITORY } from '../../infrastructure/persistence/repositories/providers/repositories.providers';

@Injectable()
export class FindAllMunicipalitiesUseCase {
  public constructor(
    @Inject(MUNICIPALITY_REPOSITORY)
    private readonly municipalityRepository: MunicipalityRepository,
  ) {}

  public async execute(): Promise<MunicipalityOutput[]> {
    const municipalities = await this.municipalityRepository.findAll();
    return MunicipalityMapper.toOutputList(municipalities);
  }
}

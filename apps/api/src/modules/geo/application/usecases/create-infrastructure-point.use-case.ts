import { Inject, Injectable } from '@nestjs/common';
import type { InfrastructurePoint } from '../../infrastructure/persistence/entities/infrastructure-point.entity';
import type { InfrastructurePointRepository } from '../../infrastructure/persistence/repositories/infrastructure-point.repository';
import { INFRASTRUCTURE_POINT_REPOSITORY } from '../../infrastructure/persistence/repositories/providers/repositories.providers';
import { InfrastructurePointMapper } from '../../infrastructure/mapper/infrastructure-point.mapper';
import type { CreateInfrastructurePointInput } from '../dto/create-infrastructure-point.input';

@Injectable()
export class CreateInfrastructurePointUseCase {
  public constructor(
    @Inject(INFRASTRUCTURE_POINT_REPOSITORY)
    private readonly infrastructurePointRepository: InfrastructurePointRepository,
  ) {}

  public async execute(
    input: CreateInfrastructurePointInput,
  ): Promise<InfrastructurePoint> {
    const infrastructurePoint = InfrastructurePointMapper.toEntity(input);
    return this.infrastructurePointRepository.save(infrastructurePoint);
  }
}

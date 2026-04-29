import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import type { Repository } from 'typeorm';
import { InfrastructurePoint } from '../../entities/infrastructure-point.entity';
import type { InfrastructurePointRepository } from '../infrastructure-point.repository';

@Injectable()
export class TypeOrmInfrastructurePointRepository implements InfrastructurePointRepository {
  public constructor(
    @InjectRepository(InfrastructurePoint)
    private readonly repository: Repository<InfrastructurePoint>,
  ) {}

  public async save(
    entity: InfrastructurePoint,
  ): Promise<InfrastructurePoint> {
    return this.repository.save(entity);
  }
}

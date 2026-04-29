import type { InfrastructurePoint } from '../entities/infrastructure-point.entity';

export interface InfrastructurePointRepository {
  save(entity: InfrastructurePoint): Promise<InfrastructurePoint>;
}

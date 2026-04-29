import type { CreateInfrastructurePointInput } from '../../application/dto/create-infrastructure-point.input';
import { CreateInfrastructurePointRequest } from '../../http/requests/create-infrastructure-point.request';
import { InfrastructurePoint } from '../persistence/entities/infrastructure-point.entity';

export class InfrastructurePointMapper {
  public static toCreateInput(
    request: CreateInfrastructurePointRequest,
  ): CreateInfrastructurePointInput {
    return {
      name: request.name,
      description: request.description ?? null,
      municipalityId: request.municipalityId,
      geometry: request.geometry,
    };
  }

  public static toEntity(
    input: CreateInfrastructurePointInput,
  ): InfrastructurePoint {
    const infrastructurePoint = new InfrastructurePoint();

    infrastructurePoint.name = input.name;
    infrastructurePoint.description = input.description ?? null;
    infrastructurePoint.municipalityId = input.municipalityId;
    infrastructurePoint.geometry = input.geometry;

    return infrastructurePoint;
  }
}

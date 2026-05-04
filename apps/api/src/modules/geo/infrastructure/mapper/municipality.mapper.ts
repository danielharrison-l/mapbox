import type { MunicipalityOutput } from '../../application/dto/municipality.output';
import { MunicipalityResponse } from '../../http/responses/municipality.response';
import type { Municipality } from '../persistence/entities/municipality.entity';

export class MunicipalityMapper {
  public static toOutput(entity: Municipality): MunicipalityOutput {
    return {
      id: entity.id,
      name: entity.name,
      state: entity.state,
      population: entity.population,
    };
  }

  public static toOutputList(entities: Municipality[]): MunicipalityOutput[] {
    return entities.map((entity) => MunicipalityMapper.toOutput(entity));
  }

  public static toResponse(output: MunicipalityOutput): MunicipalityResponse {
    const response = new MunicipalityResponse();

    response.id = output.id;
    response.name = output.name;
    response.state = output.state;
    response.population = output.population;

    return response;
  }

  public static toResponseList(outputs: MunicipalityOutput[]): MunicipalityResponse[] {
    return outputs.map((output) => MunicipalityMapper.toResponse(output));
  }
}

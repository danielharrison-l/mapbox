import type { Municipality } from '../entities/municipality.entity';

export interface MunicipalityRepository {
  findAll(): Promise<Municipality[]>;
}

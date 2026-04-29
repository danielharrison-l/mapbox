import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import type { Repository } from 'typeorm';
import { Municipality } from '../../entities/municipality.entity';
import type { MunicipalityRepository } from '../municipality.repository';

@Injectable()
export class TypeOrmMunicipalityRepository implements MunicipalityRepository {
  public constructor(
    @InjectRepository(Municipality)
    private readonly repository: Repository<Municipality>,
  ) {}

  public async findAll(): Promise<Municipality[]> {
    return this.repository.find({
      order: {
        id: 'ASC',
      },
    });
  }
}

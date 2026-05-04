import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import type { Repository } from 'typeorm';
import type { FindMeteorologyAssetsInput } from '../../../../application/dto/find-meteorology-assets.input';
import { MeteorologyAsset } from '../../entities/meteorology-asset.entity';
import type { MeteorologyAssetRepository } from '../meteorology-asset.repository';

@Injectable()
export class TypeOrmMeteorologyAssetRepository implements MeteorologyAssetRepository {
  public constructor(
    @InjectRepository(MeteorologyAsset)
    private readonly repository: Repository<MeteorologyAsset>,
  ) {}

  public async save(entity: MeteorologyAsset): Promise<MeteorologyAsset> {
    return this.repository.save(entity);
  }

  public async findAll(filters: FindMeteorologyAssetsInput = {}): Promise<MeteorologyAsset[]> {
    const queryBuilder = this.repository
      .createQueryBuilder('meteorologyAsset')
      .innerJoinAndSelect('meteorologyAsset.infrastructurePoint', 'infrastructurePoint')
      .innerJoinAndSelect('infrastructurePoint.municipality', 'municipality')
      .orderBy('meteorologyAsset.infrastructurePointId', 'ASC');

    if (filters.status) {
      queryBuilder.andWhere('meteorologyAsset.status = :status', {
        status: filters.status,
      });
    }

    if (filters.state) {
      queryBuilder.andWhere('municipality.state = :state', {
        state: filters.state,
      });
    }

    return queryBuilder.getMany();
  }

  public async findByInfrastructurePointId(
    infrastructurePointId: number,
  ): Promise<MeteorologyAsset | null> {
    return this.repository.findOne({
      where: {
        infrastructurePointId,
      },
      relations: {
        infrastructurePoint: {
          municipality: true,
        },
      },
    });
  }
}

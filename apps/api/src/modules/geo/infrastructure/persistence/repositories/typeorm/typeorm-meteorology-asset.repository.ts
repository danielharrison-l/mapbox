import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import type { Repository } from 'typeorm';
import { MeteorologyAsset } from '../../entities/meteorology-asset.entity';
import type { MeteorologyAssetRepository } from '../meteorology-asset.repository';

@Injectable()
export class TypeOrmMeteorologyAssetRepository implements MeteorologyAssetRepository {
  public constructor(
    @InjectRepository(MeteorologyAsset)
    private readonly repository: Repository<MeteorologyAsset>,
  ) {}

  public async save(
    entity: MeteorologyAsset,
  ): Promise<MeteorologyAsset> {
    return this.repository.save(entity);
  }
}

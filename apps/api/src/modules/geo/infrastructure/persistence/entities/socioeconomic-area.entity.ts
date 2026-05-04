import { Column, Entity, Index, PrimaryGeneratedColumn } from 'typeorm';
import type { BrazilianState } from '../../../domain/brazilian-state';

@Entity('socioeconomic_area')
export class SocioeconomicArea {
  @PrimaryGeneratedColumn()
  id!: number;

  @Column({ type: 'varchar', length: 140 })
  name!: string;

  @Column({ type: 'varchar', length: 2, nullable: true })
  @Index()
  state!: BrazilianState | null;

  @Column({ type: 'int' })
  population!: number;

  @Column({ name: 'average_monthly_income', type: 'int' })
  averageMonthlyIncome!: number;

  @Column({
    type: 'geometry',
    spatialFeatureType: 'Point',
    srid: 4326,
  })
  geometry!: string;
}

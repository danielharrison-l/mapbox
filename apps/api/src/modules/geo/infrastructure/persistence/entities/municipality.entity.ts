import { Column, Entity, Index, PrimaryGeneratedColumn } from 'typeorm';
import type { BrazilianState } from '../../../domain/brazilian-state';

@Entity('municipality')
export class Municipality {
  @PrimaryGeneratedColumn()
  id!: number;

  @Column({ type: 'varchar', length: 120 })
  name!: string;

  @Column({ type: 'varchar', length: 2, nullable: true })
  @Index()
  state!: BrazilianState | null;

  @Column({ type: 'int' })
  population!: number;
}

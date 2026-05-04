import { Column, Entity, Index, JoinColumn, ManyToOne, PrimaryGeneratedColumn } from 'typeorm';
import { Municipality } from './municipality.entity';

@Entity('infrastructure_point')
export class InfrastructurePoint {
  @PrimaryGeneratedColumn()
  id!: number;

  @Column({ type: 'varchar', length: 120 })
  name!: string;

  @Column({ type: 'text', nullable: true })
  description!: string | null;

  @Column({ name: 'municipality_id', type: 'int' })
  @Index()
  municipalityId!: number;

  @ManyToOne(() => Municipality)
  @JoinColumn({ name: 'municipality_id' })
  municipality!: Municipality;

  @Column({
    type: 'geometry',
    spatialFeatureType: 'Point',
    srid: 4326,
  })
  geometry!: string;
}

import { Column, Entity, PrimaryGeneratedColumn } from 'typeorm';

@Entity('municipality')
export class Municipality {
  @PrimaryGeneratedColumn()
  id!: number;

  @Column({ type: 'varchar', length: 120 })
  name!: string;

  @Column({ type: 'int' })
  population!: number;
}


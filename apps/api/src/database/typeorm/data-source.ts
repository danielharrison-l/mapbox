import { DataSource } from 'typeorm';
import { apiEnv } from '../../config/env';
import { createPostgresTypeOrmOptions } from './typeorm-options';

export default new DataSource({
  ...createPostgresTypeOrmOptions(apiEnv.databaseUrl, {
    nodeEnv: apiEnv.nodeEnv,
  }),
  entities: ['src/**/*.entity.ts', 'dist/**/*.entity.js'],
  migrations: ['src/database/migrations/*{.ts,.js}', 'dist/database/migrations/*.js'],
});

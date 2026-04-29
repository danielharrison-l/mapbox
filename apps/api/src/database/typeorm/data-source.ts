import { config } from 'dotenv';
import { DataSource } from 'typeorm';
import { createPostgresTypeOrmOptions } from './typeorm-options';

for (const envFilePath of ['.env', 'apps/api/.env', '../../.env']) {
  config({ path: envFilePath, quiet: true });
}

const databaseUrl = process.env.DATABASE_URL;

if (!databaseUrl) {
  throw new Error('DATABASE_URL is required to run TypeORM migrations.');
}

export default new DataSource({
  ...createPostgresTypeOrmOptions(databaseUrl, {
    nodeEnv: process.env.NODE_ENV,
    schema: process.env.DATABASE_SCHEMA,
  }),
  entities: ['src/**/*.entity.ts', 'dist/**/*.entity.js'],
  migrations: ['src/database/migrations/*{.ts,.js}', 'dist/database/migrations/*.js'],
});

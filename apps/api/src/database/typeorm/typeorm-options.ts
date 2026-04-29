import type { DataSourceOptions } from 'typeorm';

type TypeOrmEnvironmentOptions = {
  nodeEnv?: string;
  schema?: string;
};

export function createPostgresTypeOrmOptions(
  databaseUrl: string,
  options: TypeOrmEnvironmentOptions = {},
): DataSourceOptions {
  const parsedUrl = new URL(databaseUrl);
  const schema = options.schema ?? parsedUrl.searchParams.get('schema') ?? 'public';

  parsedUrl.searchParams.delete('schema');

  return {
    type: 'postgres',
    url: parsedUrl.toString(),
    schema,
    synchronize: false,
    logging: options.nodeEnv === 'development' ? ['error', 'warn'] : ['error'],
  };
}

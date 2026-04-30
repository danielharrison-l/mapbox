import type { DataSourceOptions } from 'typeorm';

type TypeOrmEnvironmentOptions = {
  nodeEnv?: string;
};

export function createPostgresTypeOrmOptions(
  databaseUrl: string,
  options: TypeOrmEnvironmentOptions = {},
): DataSourceOptions {
  const parsedUrl = new URL(databaseUrl);
  const schema = parsedUrl.searchParams.get('schema') ?? 'public';

  parsedUrl.searchParams.delete('schema');

  return {
    type: 'postgres',
    url: parsedUrl.toString(),
    schema,
    synchronize: true,
    logging: options.nodeEnv === 'development' ? ['error', 'warn'] : ['error'],
  };
}

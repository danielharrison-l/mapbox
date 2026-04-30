import { config } from 'dotenv';

const ENV_FILE_PATHS = ['.env', 'apps/api/.env', '../../.env'] as const;
const DEFAULT_WEB_ORIGINS = ['http://localhost:5173', 'http://localhost:5174'];

type NodeEnv = 'development' | 'production' | 'test';

export type ApiEnv = {
  apiPort: number;
  databaseUrl: string;
  nodeEnv: NodeEnv;
  webOrigins: string[];
};

for (const envFilePath of ENV_FILE_PATHS) {
  config({ path: envFilePath, quiet: true });
}

function requiredEnv(name: string): string {
  const value = process.env[name];

  if (!value) {
    throw new Error(`${name} is required.`);
  }

  return value;
}

function parsePort(value: string | undefined): number {
  const port = Number(value ?? 3000);

  if (!Number.isInteger(port) || port <= 0) {
    throw new Error('API_PORT must be a positive integer.');
  }

  return port;
}

function parseNodeEnv(value: string | undefined): NodeEnv {
  if (value === 'production' || value === 'test') {
    return value;
  }

  return 'development';
}

function parseWebOrigins(value: string | undefined): string[] {
  return (value ? value.split(',') : DEFAULT_WEB_ORIGINS)
    .map((origin) => origin.trim())
    .filter(Boolean);
}

export const apiEnv: ApiEnv = {
  apiPort: parsePort(process.env.API_PORT),
  databaseUrl: requiredEnv('DATABASE_URL'),
  nodeEnv: parseNodeEnv(process.env.NODE_ENV),
  webOrigins: parseWebOrigins(process.env.WEB_ORIGIN),
};

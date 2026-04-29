import { Global, Module } from '@nestjs/common';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { TypeOrmModule, type TypeOrmModuleOptions } from '@nestjs/typeorm';
import { createPostgresTypeOrmOptions } from './typeorm-options';

@Global()
@Module({
  imports: [
    TypeOrmModule.forRootAsync({
      imports: [ConfigModule],
      inject: [ConfigService],
      useFactory: (configService: ConfigService): TypeOrmModuleOptions => {
        const url = configService.get<string>('DATABASE_URL');

        if (!url) {
          throw new Error('DATABASE_URL is required to connect TypeORM to PostgreSQL.');
        }

        return {
          ...createPostgresTypeOrmOptions(url, {
            nodeEnv: configService.get<string>('NODE_ENV'),
            schema: configService.get<string>('DATABASE_SCHEMA'),
          }),
          autoLoadEntities: true,
        };
      },
    }),
  ],
  exports: [TypeOrmModule],
})
export class TypeOrmDatabaseModule {}

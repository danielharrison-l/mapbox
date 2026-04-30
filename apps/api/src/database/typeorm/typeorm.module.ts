import { Global, Module } from '@nestjs/common';
import { TypeOrmModule, type TypeOrmModuleOptions } from '@nestjs/typeorm';
import { apiEnv } from '../../config/env';
import { createPostgresTypeOrmOptions } from './typeorm-options';

@Global()
@Module({
  imports: [
    TypeOrmModule.forRootAsync({
      useFactory: (): TypeOrmModuleOptions => {
        return {
          ...createPostgresTypeOrmOptions(apiEnv.databaseUrl, {
            nodeEnv: apiEnv.nodeEnv,
          }),
          autoLoadEntities: true,
        };
      },
    }),
  ],
  exports: [TypeOrmModule],
})
export class TypeOrmDatabaseModule {}

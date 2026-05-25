import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import path from 'node:path';

import { HealthModule } from './health/health.module';
import { PrismaModule } from './prisma/prisma.module';
import { TenantsModule } from './tenants/tenants.module';

const rootEnvPath = path.resolve(process.cwd(), '../../.env');
const rootLocalEnvPath = path.resolve(process.cwd(), '../../.env.local');

@Module({
  imports: [
    ConfigModule.forRoot({
      isGlobal: true,
      envFilePath: [rootLocalEnvPath, rootEnvPath],
    }),
    PrismaModule,
    HealthModule,
    TenantsModule,
  ],
})
export class AppModule {}

import { AuthController } from './auth.controller';
import { Module } from '@nestjs/common';
import { JwtModule } from '@nestjs/jwt';
import { JwtAuthGuard } from './jwt-auth.guard';
import { RolesGuard } from './roles.guard';

import { ApiKeysModule } from '../api-keys/api-keys.module';
import { PrismaModule } from '../prisma/prisma.module';
import { ApiKeyAuthGuard } from './api-key-auth.guard';
import { AuthService } from './auth.service';
import { PasswordHasherService } from './password-hasher.service';

@Module({
  imports: [ApiKeysModule, PrismaModule, JwtModule.register({})],
  controllers: [AuthController],
  providers: [
    ApiKeyAuthGuard,
    JwtAuthGuard,
    AuthService,
    PasswordHasherService,
    RolesGuard,
  ],
  exports: [JwtModule, ApiKeyAuthGuard, JwtAuthGuard, RolesGuard, AuthService],
})
export class AuthModule {}
import { ConflictException, Injectable, UnauthorizedException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { JwtService } from '@nestjs/jwt';
import { randomUUID } from 'node:crypto';
import { type UserRole } from '#prisma-client';
import { type StringValue } from 'ms';

import { PrismaService } from '../prisma/prisma.service';
import { type LoginDto } from './dto/login.dto';
import { type RegisterDto } from './dto/register.dto';
import { PasswordHasherService } from './password-hasher.service';

interface AuthenticatedUser {
    id: string;
    email: string;
    name: string | null;
    role: UserRole;
    tenantId: string | null;
}

interface AuthResponse {
    accessToken: string;
    user: AuthenticatedUser;
}

interface JwtPayload {
    sub: string;
    email: string;
    role: UserRole;
    tenantId: string | null;
}

@Injectable()
export class AuthService {
    constructor(
        private readonly prisma: PrismaService,
        private readonly passwordHasher: PasswordHasherService,
        private readonly jwtService: JwtService,
        private readonly configService: ConfigService,
    ) { }

    async register(registerDto: RegisterDto): Promise<AuthResponse> {
        const existingUser = await this.prisma.user.findUnique({
            where: {
                email: registerDto.email,
            },
        });

        if (existingUser) {
            throw new ConflictException('Email already registered');
        }

        const passwordHash = await this.passwordHasher.hash(registerDto.password);
        const slug = this.buildTenantSlug(registerDto.companyName);

        const user = await this.prisma.$transaction(async (tx) => {
            const tenant = await tx.tenant.create({
                data: {
                    name: registerDto.companyName,
                    slug,
                },
            });

            return tx.user.create({
                data: {
                    email: registerDto.email,
                    name: registerDto.name,
                    passwordHash,
                    role: 'tenant_admin',
                    tenantId: tenant.id,
                },
            });
        });

        return this.buildAuthResponse(user);
    }

    async login(loginDto: LoginDto): Promise<AuthResponse> {
        const user = await this.prisma.user.findUnique({
            where: {
                email: loginDto.email,
            },
        });

        if (!user) {
            throw new UnauthorizedException('Invalid credentials');
        }

        const isValidPassword = await this.passwordHasher.verify(
            loginDto.password,
            user.passwordHash,
        );

        if (!isValidPassword) {
            throw new UnauthorizedException('Invalid credentials');
        }

        return this.buildAuthResponse(user);
    }

    async findMe(userId: string): Promise<AuthenticatedUser> {
        const user = await this.prisma.user.findUniqueOrThrow({
            where: {
                id: userId,
            },
            select: {
                id: true,
                email: true,
                name: true,
                role: true,
                tenantId: true,
            },
        });

        return user;
    }

    private async buildAuthResponse(user: AuthenticatedUser): Promise<AuthResponse> {
        const payload: JwtPayload = {
            sub: user.id,
            email: user.email,
            role: user.role,
            tenantId: user.tenantId,
        };


        const expiresIn = this.configService.get<StringValue>('JWT_EXPIRES_IN', '1d');

        const accessToken = await this.jwtService.signAsync(payload, {
            secret: this.configService.getOrThrow<string>('JWT_SECRET'),
            expiresIn,
        });

        return {
            accessToken,
            user: {
                id: user.id,
                email: user.email,
                name: user.name,
                role: user.role,
                tenantId: user.tenantId,
            },
        };
    }

    private buildTenantSlug(companyName: string): string {
        const baseSlug = companyName
            .trim()
            .toLowerCase()
            .normalize('NFD')
            .replace(/[\u0300-\u036f]/g, '')
            .replace(/[^a-z0-9]+/g, '-')
            .replace(/^-+|-+$/g, '');

        return `${baseSlug}-${randomUUID().slice(0, 8)}`;
    }
}
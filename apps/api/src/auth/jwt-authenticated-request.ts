import { type Request } from 'express';
import { type UserRole } from '#prisma-client';

export interface JwtAuthenticatedUser {
  id: string;
  email: string;
  role: UserRole;
  tenantId: string | null;
}

export interface JwtAuthenticatedRequest extends Request {
  user: JwtAuthenticatedUser;
}
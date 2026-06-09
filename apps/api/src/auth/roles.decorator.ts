import { SetMetadata } from '@nestjs/common';
import { type UserRole } from '#prisma-client';

export const ROLES_KEY = 'roles';

export const Roles = (...roles: UserRole[]): ReturnType<typeof SetMetadata> => {
  return SetMetadata(ROLES_KEY, roles);
};
import { IsNotEmpty, IsString } from 'class-validator';

export class CreateTenantAdminApiKeyDto {
  @IsString()
  @IsNotEmpty()
  name!: string;
}
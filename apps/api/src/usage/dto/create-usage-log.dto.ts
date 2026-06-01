import {
  IsNumber,
  IsOptional,
  IsString,
  Min,
} from 'class-validator';

export class CreateUsageLogDto {
  @IsString()
  tenantId!: string;

  @IsString()
  provider!: string;

  @IsString()
  model!: string;

  @IsOptional()
  @IsNumber()
  @Min(0)
  inputTokens!: number | null;

  @IsOptional()
  @IsNumber()
  @Min(0)
  outputTokens!: number | null;

  @IsOptional()
  @IsNumber()
  @Min(0)
  totalTokens!: number | null;

  @IsOptional()
  @IsNumber()
  @Min(0)
  estimatedCostUsd!: number | null;

  @IsOptional()
  @IsNumber()
  @Min(0)
  contextTokens!: number | null;

  @IsOptional()
  @IsNumber()
  @Min(0)
  selectedChunks!: number | null;

  @IsOptional()
  @IsNumber()
  @Min(0)
  maxContextTokens!: number | null;

  @IsOptional()
  @IsNumber()
  @Min(0)
  candidateLimit!: number | null;
}
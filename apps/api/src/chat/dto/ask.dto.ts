import { IsInt, IsNotEmpty, IsOptional, IsString, Max, Min } from 'class-validator';

export class AskDto {
  @IsString()
  @IsNotEmpty()
  question!: string;

  @IsOptional()
  @IsInt()
  @Min(1)
  @Max(20)
  limit?: number;
}
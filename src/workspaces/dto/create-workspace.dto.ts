import {
  IsNotEmpty,
  IsOptional,
  IsString,
  MaxLength,
  MinLength,
} from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

export class CreateWorkspaceDto {
  @ApiProperty({
    description: 'Nome do workspace (entre 3 e 100 caracteres)',
    example: 'Sala 101',
    minLength: 3,
    maxLength: 100,
  })
  @IsString()
  @IsNotEmpty()
  @MinLength(3)
  @MaxLength(100)
  name: string;

  @ApiPropertyOptional({
    description: 'Descrição opcional do workspace',
    example: 'Sala de reunião com capacidade para 8 pessoas',
  })
  @IsOptional()
  @IsString()
  description?: string;
}

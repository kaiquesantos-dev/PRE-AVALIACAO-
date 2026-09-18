import {
  IsNotEmpty,
  IsOptional,
  IsString,
  MaxLength,
  MinLength,
} from 'class-validator';
import { ApiPropertyOptional } from '@nestjs/swagger';

export class UpdateWorkspaceDto {
  @ApiPropertyOptional({
    description: 'Novo nome do workspace (entre 3 e 100 caracteres)',
    example: 'Sala 101 - Reformada',
    minLength: 3,
    maxLength: 100,
  })
  @IsOptional()
  @IsString()
  @IsNotEmpty()
  @MinLength(3)
  @MaxLength(100)
  name?: string;

  @ApiPropertyOptional({
    description: 'Nova descrição do workspace',
    example: 'Sala de reunião com projetor e TV',
  })
  @IsOptional()
  @IsString()
  description?: string;
}

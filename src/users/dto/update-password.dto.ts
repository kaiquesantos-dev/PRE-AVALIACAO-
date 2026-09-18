import { IsString, MinLength } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';

export class UpdatePasswordDto {
  @ApiProperty({
    description: 'Nova senha do usuário (mínimo 8 caracteres)',
    example: 'novaSenha123',
    minLength: 8,
  })
  @IsString()
  @MinLength(8)
  newPassword: string;
}

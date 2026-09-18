import { IsEmail, IsString, MinLength } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';

export class LoginDto {
  @ApiProperty({
    description: 'Email cadastrado do usuário',
    example: 'admin@coworking.com',
  })
  @IsEmail()
  email: string;

  @ApiProperty({
    description: 'Senha do usuário (mínimo 8 caracteres)',
    example: 'admin123',
    minLength: 8,
  })
  @IsString()
  @MinLength(8)
  password: string;
}

import { Body, Controller, HttpCode, HttpStatus, Post } from '@nestjs/common';
import {
  ApiOperation,
  ApiResponse,
  ApiSecurity,
  ApiTags,
} from '@nestjs/swagger';
import { AuthService } from './auth.service';
import { LoginDto } from './dto/login.dto';

@ApiTags('Auth')
@ApiSecurity('apiKey')
@Controller('auth')
export class AuthController {
  constructor(private readonly authService: AuthService) {}

  @Post('login')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({
    summary: 'Autenticar usuário',
    description:
      'Valida email e senha e retorna um token JWT (válido por 1 dia) a ser usado no header Authorization das demais rotas protegidas.',
  })
  @ApiResponse({
    status: 200,
    description: 'Login realizado com sucesso. Retorna o token de acesso.',
  })
  @ApiResponse({
    status: 400,
    description:
      'Dados de entrada inválidos: email mal formatado, senha com menos de 8 caracteres ou campo extra enviado no corpo da requisição.',
  })
  @ApiResponse({
    status: 401,
    description:
      'Email não cadastrado ou senha incorreta, ou header x-api-key ausente/inválido.',
  })
  login(@Body() dto: LoginDto) {
    return this.authService.login(dto.email, dto.password);
  }
}

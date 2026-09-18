import {
  Body,
  Controller,
  Delete,
  Get,
  Param,
  ParseIntPipe,
  Patch,
  Post,
  UseGuards,
} from '@nestjs/common';
import {
  ApiBearerAuth,
  ApiOperation,
  ApiParam,
  ApiResponse,
  ApiSecurity,
  ApiTags,
} from '@nestjs/swagger';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { RolesGuard } from '../auth/roles.guard';
import { Roles } from '../auth/roles.decorator';
import { UsersService } from './users.service';
import { CreateUserDto } from './dto/create-user.dto';
import { UpdatePasswordDto } from './dto/update-password.dto';

@ApiTags('Users')
@ApiSecurity('apiKey')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard, RolesGuard)
@Roles('ADMIN')
@Controller('users')
export class UsersController {
  constructor(private readonly usersService: UsersService) {}

  @Post()
  @ApiOperation({
    summary: 'Criar um novo usuário',
    description: 'Somente usuários com papel ADMIN podem criar usuários.',
  })
  @ApiResponse({
    status: 201,
    description: 'Usuário criado com sucesso (sem o campo password).',
  })
  @ApiResponse({
    status: 400,
    description:
      'Dados inválidos: nome ausente, email inválido, senha com menos de 8 caracteres, papel diferente de USER/ADMIN ou campo extra no corpo.',
  })
  @ApiResponse({
    status: 401,
    description:
      'Token JWT ausente/inválido/expirado, ou header x-api-key ausente/inválido.',
  })
  @ApiResponse({
    status: 403,
    description: 'Usuário autenticado não possui o papel ADMIN.',
  })
  @ApiResponse({
    status: 409,
    description: 'Já existe um usuário cadastrado com esse email.',
  })
  create(@Body() dto: CreateUserDto) {
    return this.usersService.create(dto);
  }

  @Get()
  @ApiOperation({
    summary: 'Listar todos os usuários',
    description: 'Somente usuários com papel ADMIN podem listar usuários.',
  })
  @ApiResponse({
    status: 200,
    description: 'Lista de usuários retornada com sucesso (sem senhas).',
  })
  @ApiResponse({
    status: 401,
    description:
      'Token JWT ausente/inválido/expirado, ou header x-api-key ausente/inválido.',
  })
  @ApiResponse({
    status: 403,
    description: 'Usuário autenticado não possui o papel ADMIN.',
  })
  findAll() {
    return this.usersService.findAll();
  }

  @Get(':id')
  @ApiOperation({
    summary: 'Buscar um usuário pelo id',
    description: 'Somente usuários com papel ADMIN podem buscar usuários.',
  })
  @ApiParam({ name: 'id', description: 'Id do usuário', example: 1 })
  @ApiResponse({
    status: 200,
    description: 'Usuário encontrado com sucesso (sem senha).',
  })
  @ApiResponse({
    status: 401,
    description:
      'Token JWT ausente/inválido/expirado, ou header x-api-key ausente/inválido.',
  })
  @ApiResponse({
    status: 403,
    description: 'Usuário autenticado não possui o papel ADMIN.',
  })
  @ApiResponse({
    status: 404,
    description: 'Nenhum usuário encontrado com o id informado.',
  })
  findOne(@Param('id', ParseIntPipe) id: number) {
    return this.usersService.findOneOrThrow(id);
  }

  @Delete(':id')
  @ApiOperation({
    summary: 'Remover um usuário',
    description: 'Somente usuários com papel ADMIN podem remover usuários.',
  })
  @ApiParam({ name: 'id', description: 'Id do usuário', example: 1 })
  @ApiResponse({
    status: 200,
    description: 'Usuário removido com sucesso.',
  })
  @ApiResponse({
    status: 401,
    description:
      'Token JWT ausente/inválido/expirado, ou header x-api-key ausente/inválido.',
  })
  @ApiResponse({
    status: 403,
    description: 'Usuário autenticado não possui o papel ADMIN.',
  })
  @ApiResponse({
    status: 404,
    description: 'Nenhum usuário encontrado com o id informado.',
  })
  remove(@Param('id', ParseIntPipe) id: number) {
    return this.usersService.remove(id);
  }

  @Patch(':id/password')
  @ApiOperation({
    summary: 'Redefinir a senha de um usuário',
    description:
      'Somente usuários com papel ADMIN podem redefinir a senha de outro usuário.',
  })
  @ApiParam({ name: 'id', description: 'Id do usuário', example: 1 })
  @ApiResponse({
    status: 200,
    description: 'Senha atualizada com sucesso.',
  })
  @ApiResponse({
    status: 400,
    description:
      'Dados inválidos: nova senha ausente, com menos de 8 caracteres ou campo extra no corpo.',
  })
  @ApiResponse({
    status: 401,
    description:
      'Token JWT ausente/inválido/expirado, ou header x-api-key ausente/inválido.',
  })
  @ApiResponse({
    status: 403,
    description: 'Usuário autenticado não possui o papel ADMIN.',
  })
  @ApiResponse({
    status: 404,
    description: 'Nenhum usuário encontrado com o id informado.',
  })
  updatePassword(
    @Param('id', ParseIntPipe) id: number,
    @Body() dto: UpdatePasswordDto,
  ) {
    return this.usersService.updatePassword(id, dto);
  }
}

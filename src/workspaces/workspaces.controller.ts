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
  ApiTags,
} from '@nestjs/swagger';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { RolesGuard } from '../auth/roles.guard';
import { Roles } from '../auth/roles.decorator';
import { WorkspacesService } from './workspaces.service';
import { CreateWorkspaceDto } from './dto/create-workspace.dto';
import { UpdateWorkspaceDto } from './dto/update-workspace.dto';

@ApiTags('Workspaces')
@Controller('workspaces')
export class WorkspacesController {
  constructor(private readonly workspacesService: WorkspacesService) {}

  @Get()
  @ApiOperation({
    summary: 'Listar todos os workspaces',
    description: 'Rota pública — não exige autenticação.',
  })
  @ApiResponse({
    status: 200,
    description: 'Lista de workspaces retornada com sucesso.',
  })
  findAll() {
    return this.workspacesService.findAll();
  }

  @ApiBearerAuth()
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles('ADMIN')
  @Post()
  @ApiOperation({
    summary: 'Criar um novo workspace',
    description: 'Somente usuários com papel ADMIN podem criar workspaces.',
  })
  @ApiResponse({
    status: 201,
    description: 'Workspace criado com sucesso.',
  })
  @ApiResponse({
    status: 400,
    description:
      'Dados inválidos: nome ausente, muito curto (<3), muito longo (>100) ou campo extra no corpo.',
  })
  @ApiResponse({
    status: 401,
    description: 'Token de autenticação ausente, inválido ou expirado.',
  })
  @ApiResponse({
    status: 403,
    description: 'Usuário autenticado não possui o papel ADMIN.',
  })
  create(@Body() dto: CreateWorkspaceDto) {
    return this.workspacesService.create(dto);
  }

  @ApiBearerAuth()
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles('ADMIN')
  @Patch(':id')
  @ApiOperation({
    summary: 'Atualizar um workspace existente',
    description: 'Somente usuários com papel ADMIN podem editar workspaces.',
  })
  @ApiParam({ name: 'id', description: 'Id do workspace', example: 1 })
  @ApiResponse({
    status: 200,
    description: 'Workspace atualizado com sucesso.',
  })
  @ApiResponse({
    status: 400,
    description: 'Dados inválidos (nome muito curto/longo ou campo extra).',
  })
  @ApiResponse({
    status: 401,
    description: 'Token de autenticação ausente, inválido ou expirado.',
  })
  @ApiResponse({
    status: 403,
    description: 'Usuário autenticado não possui o papel ADMIN.',
  })
  @ApiResponse({
    status: 404,
    description: 'Nenhum workspace encontrado com o id informado.',
  })
  update(
    @Param('id', ParseIntPipe) id: number,
    @Body() dto: UpdateWorkspaceDto,
  ) {
    return this.workspacesService.update(id, dto);
  }

  @ApiBearerAuth()
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles('ADMIN')
  @Delete(':id')
  @ApiOperation({
    summary: 'Remover um workspace',
    description: 'Somente usuários com papel ADMIN podem remover workspaces.',
  })
  @ApiParam({ name: 'id', description: 'Id do workspace', example: 1 })
  @ApiResponse({
    status: 200,
    description: 'Workspace removido com sucesso.',
  })
  @ApiResponse({
    status: 401,
    description: 'Token de autenticação ausente, inválido ou expirado.',
  })
  @ApiResponse({
    status: 403,
    description: 'Usuário autenticado não possui o papel ADMIN.',
  })
  @ApiResponse({
    status: 404,
    description: 'Nenhum workspace encontrado com o id informado.',
  })
  remove(@Param('id', ParseIntPipe) id: number) {
    return this.workspacesService.remove(id);
  }
}

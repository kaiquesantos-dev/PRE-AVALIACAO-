import {
  Body,
  Controller,
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
import { AuthenticatedUser, CurrentUser } from '../auth/current-user.decorator';
import { BookingsService } from './bookings.service';
import { CreateBookingDto } from './dto/create-booking.dto';

@ApiTags('Bookings')
@ApiBearerAuth()
@ApiSecurity('apiKey')
@UseGuards(JwtAuthGuard)
@Controller('bookings')
export class BookingsController {
  constructor(private readonly bookingsService: BookingsService) {}

  @Post()
  @ApiOperation({
    summary: 'Criar uma reserva',
    description:
      'Cria uma reserva para o usuário autenticado (o id do usuário vem do token, nunca do corpo da requisição). Bloqueia sobreposição com reservas ativas no mesmo workspace.',
  })
  @ApiResponse({
    status: 201,
    description: 'Reserva criada com sucesso.',
  })
  @ApiResponse({
    status: 400,
    description:
      'Dados inválidos: startAt maior ou igual a endAt, datas fora do formato ISO 8601, workspaceId ausente/não numérico ou campo extra no corpo.',
  })
  @ApiResponse({
    status: 401,
    description:
      'Token JWT ausente/inválido/expirado, ou header x-api-key ausente/inválido.',
  })
  @ApiResponse({
    status: 404,
    description: 'O workspace informado não existe.',
  })
  @ApiResponse({
    status: 409,
    description:
      'Já existe uma reserva ativa que se sobrepõe ao período informado nesse workspace.',
  })
  create(
    @CurrentUser() user: AuthenticatedUser,
    @Body() dto: CreateBookingDto,
  ) {
    return this.bookingsService.create(user.userId, dto);
  }

  @Get('my')
  @ApiOperation({
    summary: 'Listar minhas reservas ativas',
    description:
      'Retorna apenas as reservas do usuário autenticado que ainda não foram canceladas.',
  })
  @ApiResponse({
    status: 200,
    description: 'Lista de reservas ativas do usuário autenticado.',
  })
  @ApiResponse({
    status: 401,
    description:
      'Token JWT ausente/inválido/expirado, ou header x-api-key ausente/inválido.',
  })
  findMine(@CurrentUser() user: AuthenticatedUser) {
    return this.bookingsService.findMine(user.userId);
  }

  @Get(':id')
  @ApiOperation({
    summary: 'Buscar uma reserva pelo id',
    description: 'Somente o dono da reserva pode consultá-la.',
  })
  @ApiParam({ name: 'id', description: 'Id da reserva', example: 1 })
  @ApiResponse({
    status: 200,
    description: 'Reserva encontrada e retornada com sucesso.',
  })
  @ApiResponse({
    status: 401,
    description:
      'Token JWT ausente/inválido/expirado, ou header x-api-key ausente/inválido.',
  })
  @ApiResponse({
    status: 403,
    description: 'A reserva existe, mas pertence a outro usuário.',
  })
  @ApiResponse({
    status: 404,
    description: 'Nenhuma reserva encontrada com o id informado.',
  })
  findOne(
    @CurrentUser() user: AuthenticatedUser,
    @Param('id', ParseIntPipe) id: number,
  ) {
    return this.bookingsService.findOneOwned(user.userId, id);
  }

  @Patch(':id/cancel')
  @ApiOperation({
    summary: 'Cancelar uma reserva',
    description:
      'Marca a reserva como cancelada (soft delete). Somente o dono pode cancelar, e apenas se ela ainda não estiver cancelada.',
  })
  @ApiParam({ name: 'id', description: 'Id da reserva', example: 1 })
  @ApiResponse({
    status: 200,
    description: 'Reserva cancelada com sucesso.',
  })
  @ApiResponse({
    status: 401,
    description:
      'Token JWT ausente/inválido/expirado, ou header x-api-key ausente/inválido.',
  })
  @ApiResponse({
    status: 403,
    description: 'A reserva existe, mas pertence a outro usuário.',
  })
  @ApiResponse({
    status: 404,
    description: 'Nenhuma reserva encontrada com o id informado.',
  })
  @ApiResponse({
    status: 409,
    description: 'A reserva já havia sido cancelada anteriormente.',
  })
  cancel(
    @CurrentUser() user: AuthenticatedUser,
    @Param('id', ParseIntPipe) id: number,
  ) {
    return this.bookingsService.cancel(user.userId, id);
  }
}

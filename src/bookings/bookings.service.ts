import {
  BadRequestException,
  ConflictException,
  ForbiddenException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { CreateBookingDto } from './dto/create-booking.dto';

@Injectable()
export class BookingsService {
  constructor(private readonly prisma: PrismaService) {}

  async create(userId: number, dto: CreateBookingDto) {
    const startAt = new Date(dto.startAt);
    const endAt = new Date(dto.endAt);

    if (startAt >= endAt) {
      throw new BadRequestException('startAt deve ser anterior a endAt');
    }

    const workspace = await this.prisma.workspace.findUnique({
      where: { id: dto.workspaceId },
    });
    if (!workspace) {
      throw new NotFoundException('Workspace não encontrado');
    }

    const overlapping = await this.prisma.booking.findFirst({
      where: {
        workspaceId: dto.workspaceId,
        canceledAt: null,
        startAt: { lt: endAt },
        endAt: { gt: startAt },
      },
    });
    if (overlapping) {
      throw new ConflictException('Já existe uma reserva ativa nesse período');
    }

    return this.prisma.booking.create({
      data: { userId, workspaceId: dto.workspaceId, startAt, endAt },
    });
  }

  findMine(userId: number) {
    return this.prisma.booking.findMany({
      where: { userId, canceledAt: null },
    });
  }

  async findOneOwned(userId: number, id: number) {
    const booking = await this.prisma.booking.findUnique({ where: { id } });
    if (!booking) {
      throw new NotFoundException('Reserva não encontrada');
    }
    if (booking.userId !== userId) {
      throw new ForbiddenException('Você não pode acessar essa reserva');
    }
    return booking;
  }

  async cancel(userId: number, id: number) {
    const booking = await this.findOneOwned(userId, id);
    if (booking.canceledAt) {
      throw new ConflictException('Reserva já foi cancelada');
    }
    return this.prisma.booking.update({
      where: { id },
      data: { canceledAt: new Date() },
    });
  }
}

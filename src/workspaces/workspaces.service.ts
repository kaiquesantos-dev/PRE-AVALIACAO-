import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { CreateWorkspaceDto } from './dto/create-workspace.dto';
import { UpdateWorkspaceDto } from './dto/update-workspace.dto';

@Injectable()
export class WorkspacesService {
  constructor(private readonly prisma: PrismaService) {}

  findAll() {
    return this.prisma.workspace.findMany();
  }

  async findOneOrThrow(id: number) {
    const workspace = await this.prisma.workspace.findUnique({
      where: { id },
    });
    if (!workspace) {
      throw new NotFoundException('Workspace não encontrado');
    }
    return workspace;
  }

  create(dto: CreateWorkspaceDto) {
    return this.prisma.workspace.create({ data: dto });
  }

  async update(id: number, dto: UpdateWorkspaceDto) {
    await this.findOneOrThrow(id);
    return this.prisma.workspace.update({ where: { id }, data: dto });
  }

  async remove(id: number) {
    await this.findOneOrThrow(id);
    await this.prisma.workspace.delete({ where: { id } });
    return { message: 'Workspace removido' };
  }
}

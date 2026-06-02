import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service'; // Verifique se o caminho do import está correto
import { CreateBarberDto } from './dto/create-barber.dto';
import { UpdateBarberDto } from './dto/update-barber.dto';

@Injectable()
export class BarbersService {
  constructor(private readonly prisma: PrismaService) {}

  create(dto: CreateBarberDto) {
    return this.prisma.barber.create({ data: dto });
  }

  findAll() {
    return this.prisma.barber.findMany({
      where: { deletedAt: null },
      orderBy: { createdAt: 'desc' },
    });
  }

  async findOne(id: number) {
    const barber = await this.prisma.barber.findFirst({
      where: { id, deletedAt: null },
    });
    if (!barber) {
      throw new NotFoundException(`Profissional ${id} não encontrado`);
    }
    return barber;
  }

  async update(id: number, dto: UpdateBarberDto) {
    await this.findOne(id); // Verifica se existe antes de atualizar
    return this.prisma.barber.update({ where: { id }, data: dto });
  }

  async remove(id: number) {
    await this.findOne(id); // Verifica se existe antes de remover
    return this.prisma.barber.update({
      where: { id },
      data: { deletedAt: new Date() }, // Soft Delete: apenas esconde o registro
    });
  }
}
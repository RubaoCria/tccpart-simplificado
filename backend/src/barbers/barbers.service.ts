import { Injectable, NotFoundException, ConflictException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service'; // Verifique se o caminho do import está correto
import { CreateBarberDto } from './dto/create-barber.dto';
import { UpdateBarberDto } from './dto/update-barber.dto';

@Injectable()
export class BarbersService {
  constructor(private readonly prisma: PrismaService) {}

  // ========================================================================
  // AQUI FAZ O CADASTRO (E BARRA DADOS REPETIDOS)
  // ========================================================================
  async create(dto: CreateBarberDto) {
    
    // AQUI: O Prisma vai no banco e procura se já tem algum barbeiro com esse email ou telefone
    const barbeiroExistente = await this.prisma.barber.findFirst({
      where: {
        OR: [
          { email: dto.email },
          { phone: dto.phone },
        ],
        deletedAt: null, // Ignora os que já foram deletados
      },
    });

    // AQUI: Se achar alguém, o NestJS joga um erro e o cadastro é interrompido
    if (barbeiroExistente) {
      throw new ConflictException('Este e-mail ou telefone já está cadastrado para outro profissional.');
    }

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

  // ========================================================================
  // AQUI FAZ A ATUALIZAÇÃO (E GARANTE QUE NÃO ROUBOU DADO DE OUTRO)
  // ========================================================================
  async update(id: number, dto: UpdateBarberDto) {
    await this.findOne(id); // Verifica se existe antes de atualizar

    // AQUI: Se o usuário estiver tentando mudar o email ou telefone, faz a checagem
    if (dto.email || dto.phone) {
      const conflitoDeDados = await this.prisma.barber.findFirst({
        where: {
          OR: [
            { email: dto.email },
            { phone: dto.phone },
          ],
          id: { not: id }, // AQUI: Ignora o ID do próprio barbeiro que estamos editando
          deletedAt: null,
        },
      });

      // AQUI: Se a busca achar que esse dado já é de outro barbeiro, ele bloqueia a edição
      if (conflitoDeDados) {
        throw new ConflictException('Este e-mail ou telefone já pertence a outro profissional.');
      }
    }

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
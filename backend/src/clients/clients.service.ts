import { Injectable, NotFoundException, ConflictException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { CreateClientDto } from './dto/create-client.dto';
import { UpdateClientDto } from './dto/update-client.dto';

@Injectable()
export class ClientsService {
  constructor(private readonly prisma: PrismaService) {}

  // 💡 PARA A BANCA: O método agora é 'async' porque o sistema precisa "esperar" (await)
  // a resposta do banco de dados na checagem antes de prosseguir com o INSERT.
  async create(dto: CreateClientDto) {
    
    // 💡 PARA A BANCA: Regra de Unicidade. O Prisma faz um SELECT na tabela buscando
    // clientes ativos (deletedAt: null) que possuam o MESMO e-mail OU o MESMO telefone.
    const clienteExistente = await this.prisma.client.findFirst({
      where: {
        OR: [
          { email: dto.email },
          { phone: dto.phone },
        ],
        deletedAt: null, // Ignora clientes que já foram excluídos do sistema
      },
    });

    // 💡 PARA A BANCA: Se a busca encontrou alguém, o NestJS aborta a operação e dispara 
    // um Erro 409 (ConflictException). O Frontend (React) captura essa mensagem e mostra na tela.
    if (clienteExistente) {
      throw new ConflictException('Este e-mail ou telefone já está cadastrado no sistema.');
    }

    return this.prisma.client.create({ data: dto });
  }

  findAll() {
    return this.prisma.client.findMany({
      where: { deletedAt: null },
      orderBy: { createdAt: 'desc' },
    });
  }

  async findOne(id: number) {
    const client = await this.prisma.client.findFirst({
      where: { id, deletedAt: null },
    });
    if (!client) {
      throw new NotFoundException(`Cliente ${id} não encontrado`);
    }
    return client;
  }

  async update(id: number, dto: UpdateClientDto) {
    await this.findOne(id); // Verifica se o cliente existe antes de tentar atualizar

    // 💡 PARA A BANCA: Blindagem também na Rota de Atualização (PATCH).
    // Impede que o usuário mude o próprio e-mail/telefone para dados que já pertencem a outra pessoa.
    if (dto.email || dto.phone) {
      const conflitoDeDados = await this.prisma.client.findFirst({
        where: {
          OR: [
            { email: dto.email },
            { phone: dto.phone },
          ],
          id: { not: id }, // Exclui o próprio usuário que está sendo editado dessa busca
          deletedAt: null,
        },
      });

      if (conflitoDeDados) {
        throw new ConflictException('Este e-mail ou telefone já pertence a outro cliente.');
      }
    }

    return this.prisma.client.update({ where: { id }, data: dto });
  }

  async remove(id: number) {
    await this.findOne(id);
    // Exclusão Lógica (Soft Delete)
    return this.prisma.client.update({
      where: { id },
      data: { deletedAt: new Date() },
    });
  }
}
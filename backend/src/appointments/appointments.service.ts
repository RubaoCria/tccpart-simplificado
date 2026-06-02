import {
  BadRequestException,
  ConflictException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { Prisma, Service } from '@prisma/client';
import { PrismaService } from '../prisma/prisma.service';
import { CreateAppointmentDto } from './dto/create-appointment.dto';
import { FindAppointmentsQueryDto } from './dto/find-appointments-query.dto';
import { UpdateAppointmentDto } from './dto/update-appointment.dto';

const APPOINTMENT_INCLUDE = {
  client: true,
  services: true, // ATUALIZADO: Agora retorna um array de serviços
  barber: true,
} as const;

@Injectable()
export class AppointmentsService {
  constructor(private readonly prisma: PrismaService) {}

  async create(dto: CreateAppointmentDto) {
    await this.assertClientExists(dto.clientId);
    await this.assertBarberExists(dto.barberId); 
    
    // Busca todos os serviços escolhidos para somar a duração
    const services = await this.fetchServices(dto.serviceIds);
    const totalDurationMinutes = services.reduce((total, service) => total + service.durationMinutes, 0);

    const scheduledAt = new Date(dto.scheduledAt);
    const endsAt = computeEndsAt(scheduledAt, totalDurationMinutes);
    const status = dto.status ?? 'agendado';

    if (status !== 'cancelado') {
      await this.assertNoConflict(scheduledAt, endsAt, dto.barberId);
    }

    return this.prisma.appointment.create({
      data: {
        clientId: dto.clientId,
        barberId: dto.barberId, 
        scheduledAt,
        endsAt,
        chargedPriceInCents: dto.chargedPriceInCents,
        status,
        notes: dto.notes,
        // ATUALIZADO: Vincula múltiplos serviços ao agendamento
        services: {
          connect: dto.serviceIds.map((id) => ({ id })),
        },
      },
      include: APPOINTMENT_INCLUDE,
    });
  }

  findAll(query: FindAppointmentsQueryDto) {
    const where: Prisma.AppointmentWhereInput = {};
    if (query.clientId !== undefined) where.clientId = query.clientId;
    if (query.status !== undefined) where.status = query.status;
    if (query.from || query.to) {
      where.scheduledAt = {};
      if (query.from) where.scheduledAt.gte = new Date(query.from);
      if (query.to) where.scheduledAt.lte = new Date(query.to);
    }
    return this.prisma.appointment.findMany({
      where,
      orderBy: { scheduledAt: 'asc' },
      include: APPOINTMENT_INCLUDE,
    });
  }

  async findOne(id: number) {
    const appointment = await this.prisma.appointment.findUnique({
      where: { id },
      include: APPOINTMENT_INCLUDE,
    });
    if (!appointment) {
      throw new NotFoundException(`Agendamento ${id} não encontrado`);
    }
    return appointment;
  }

  async update(id: number, dto: UpdateAppointmentDto) {
    // Agora incluímos os serviços antigos para poder recalcular caso a data mude mas os serviços não
    const existing = await this.prisma.appointment.findUnique({
      where: { id },
      include: { services: true } 
    });
    
    if (!existing) {
      throw new NotFoundException(`Agendamento ${id} não encontrado`);
    }
    
    if (dto.clientId !== undefined) {
      await this.assertClientExists(dto.clientId);
    }
    
    if (dto.barberId !== undefined) {
      await this.assertBarberExists(dto.barberId);
    }

    // Usamos 'any' aqui para acessar serviceIds que foi alterado no DTO base
    const updateDto = dto as any; 
    const slotChanged = dto.scheduledAt !== undefined || updateDto.serviceIds !== undefined;
    const barberChanged = dto.barberId !== undefined && dto.barberId !== existing.barberId;

    let scheduledAt = existing.scheduledAt;
    let endsAt = existing.endsAt;

    if (slotChanged) {
      scheduledAt = dto.scheduledAt ? new Date(dto.scheduledAt) : existing.scheduledAt;
      const serviceIds = updateDto.serviceIds ?? existing.services.map(s => s.id);
      
      const services = await this.fetchServices(serviceIds);
      const totalDurationMinutes = services.reduce((total, service) => total + service.durationMinutes, 0);
      endsAt = computeEndsAt(scheduledAt, totalDurationMinutes);
    }

    const finalStatus = dto.status ?? existing.status;
    const wasCancelled = existing.status === 'cancelado';
    const needsConflictCheck = finalStatus !== 'cancelado' && (slotChanged || wasCancelled || barberChanged);

    const finalBarberId = dto.barberId ?? existing.barberId;

    if (needsConflictCheck) {
      await this.assertNoConflict(scheduledAt, endsAt, finalBarberId, id);
    }

    return this.prisma.appointment.update({
      where: { id },
      data: {
        clientId: dto.clientId,
        barberId: dto.barberId,
        scheduledAt: slotChanged ? scheduledAt : undefined,
        endsAt: slotChanged ? endsAt : undefined,
        chargedPriceInCents: dto.chargedPriceInCents,
        status: dto.status,
        notes: dto.notes,
        // Se novos serviços foram enviados, atualiza a relação usando 'set'
        services: updateDto.serviceIds ? {
          set: updateDto.serviceIds.map((id: number) => ({ id }))
        } : undefined,
      },
      include: APPOINTMENT_INCLUDE,
    });
  }

  async remove(id: number) {
    await this.findOne(id);
    await this.prisma.appointment.delete({ where: { id } });
  }

  private async assertClientExists(clientId: number) {
    const client = await this.prisma.client.findFirst({
      where: { id: clientId, deletedAt: null },
    });
    if (!client) {
      throw new BadRequestException(
        `Cliente ${clientId} não encontrado ou foi removido`,
      );
    }
  }

  private async assertBarberExists(barberId: number) {
    const barber = await this.prisma.barber.findFirst({
      where: { id: barberId, deletedAt: null },
    });
    if (!barber) {
      throw new BadRequestException(
        `Profissional ${barberId} não encontrado ou foi removido da equipe`,
      );
    }
  }

  // ATUALIZADO: Agora busca um Array de serviços para validar todos de uma vez
  private async fetchServices(serviceIds: number[]): Promise<Service[]> {
    if (!serviceIds || serviceIds.length === 0) {
      throw new BadRequestException('É necessário selecionar pelo menos um serviço.');
    }
    
    const services = await this.prisma.service.findMany({
      where: { id: { in: serviceIds }, deletedAt: null },
    });
    
    if (services.length !== serviceIds.length) {
      throw new BadRequestException(
        `Um ou mais serviços não foram encontrados ou foram removidos.`,
      );
    }
    return services;
  }

  private async assertNoConflict(
    scheduledAt: Date,
    endsAt: Date,
    barberId: number, 
    excludeId?: number,
  ) {
    const conflict = await this.prisma.appointment.findFirst({
      where: {
        barberId, 
        status: { not: 'cancelado' },
        scheduledAt: { lt: endsAt },
        endsAt: { gt: scheduledAt },
        ...(excludeId !== undefined ? { id: { not: excludeId } } : {}),
      },
    });
    if (conflict) {
      throw new ConflictException(
        `O profissional selecionado já possui um agendamento neste horário ` +
          `(${conflict.scheduledAt.toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' })} → ${conflict.endsAt.toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' })})`,
      );
    }
  }
}

function computeEndsAt(start: Date, durationMinutes: number): Date {
  return new Date(start.getTime() + durationMinutes * 60_000);
}
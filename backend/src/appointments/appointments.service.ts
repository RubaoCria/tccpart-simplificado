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
  service: true,
} as const;

@Injectable()
export class AppointmentsService {
  constructor(private readonly prisma: PrismaService) {}

  async create(dto: CreateAppointmentDto) {
    await this.assertClientExists(dto.clientId);
    const service = await this.fetchService(dto.serviceId);
    const scheduledAt = new Date(dto.scheduledAt);
    const endsAt = computeEndsAt(scheduledAt, service.durationMinutes);
    const status = dto.status ?? 'agendado';

    if (status !== 'cancelado') {
      await this.assertNoConflict(scheduledAt, endsAt);
    }

    return this.prisma.appointment.create({
      data: {
        clientId: dto.clientId,
        serviceId: dto.serviceId,
        scheduledAt,
        endsAt,
        chargedPriceInCents: dto.chargedPriceInCents,
        status,
        notes: dto.notes,
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
    const existing = await this.findOne(id);
    if (dto.clientId !== undefined) {
      await this.assertClientExists(dto.clientId);
    }

    const slotChanged =
      dto.scheduledAt !== undefined || dto.serviceId !== undefined;

    let scheduledAt = existing.scheduledAt;
    let endsAt = existing.endsAt;

    if (slotChanged) {
      scheduledAt = dto.scheduledAt
        ? new Date(dto.scheduledAt)
        : existing.scheduledAt;
      const serviceId = dto.serviceId ?? existing.serviceId;
      const service = await this.fetchService(serviceId);
      endsAt = computeEndsAt(scheduledAt, service.durationMinutes);
    } else if (dto.serviceId === undefined && dto.scheduledAt === undefined) {
      // sem mudança de slot — mantém o que existe
    }

    const finalStatus = dto.status ?? existing.status;
    const wasCancelled = existing.status === 'cancelado';
    const needsConflictCheck =
      finalStatus !== 'cancelado' && (slotChanged || wasCancelled);

    if (needsConflictCheck) {
      await this.assertNoConflict(scheduledAt, endsAt, id);
    }

    return this.prisma.appointment.update({
      where: { id },
      data: {
        clientId: dto.clientId,
        serviceId: dto.serviceId,
        scheduledAt: slotChanged ? scheduledAt : undefined,
        endsAt: slotChanged ? endsAt : undefined,
        chargedPriceInCents: dto.chargedPriceInCents,
        status: dto.status,
        notes: dto.notes,
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

  private async fetchService(serviceId: number): Promise<Service> {
    const service = await this.prisma.service.findFirst({
      where: { id: serviceId, deletedAt: null },
    });
    if (!service) {
      throw new BadRequestException(
        `Serviço ${serviceId} não encontrado ou foi removido`,
      );
    }
    return service;
  }

  private async assertNoConflict(
    scheduledAt: Date,
    endsAt: Date,
    excludeId?: number,
  ) {
    const conflict = await this.prisma.appointment.findFirst({
      where: {
        status: { not: 'cancelado' },
        scheduledAt: { lt: endsAt },
        endsAt: { gt: scheduledAt },
        ...(excludeId !== undefined ? { id: { not: excludeId } } : {}),
      },
    });
    if (conflict) {
      throw new ConflictException(
        `Conflito de horário com agendamento #${conflict.id} ` +
          `(${conflict.scheduledAt.toISOString()} → ${conflict.endsAt.toISOString()})`,
      );
    }
  }
}

function computeEndsAt(start: Date, durationMinutes: number): Date {
  return new Date(start.getTime() + durationMinutes * 60_000);
}

import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import {
  IsDateString,
  IsIn,
  IsInt,
  IsOptional,
  IsString,
  Min,
} from 'class-validator';
import { APPOINTMENT_STATUSES } from '../appointment-status';
import type { AppointmentStatus } from '../appointment-status';

export class CreateAppointmentDto {
  @ApiProperty({ example: 1 })
  @IsInt()
  @Min(1)
  clientId: number;

  @ApiProperty({ example: 1 })
  @IsInt()
  @Min(1)
  serviceId: number;

  @ApiProperty({ example: '2026-06-01T14:30:00.000Z' })
  @IsDateString()
  scheduledAt: string;

  @ApiProperty({ example: 4990, description: 'Preço cobrado em centavos' })
  @IsInt()
  @Min(0)
  chargedPriceInCents: number;

  @ApiPropertyOptional({ enum: APPOINTMENT_STATUSES, default: 'agendado' })
  @IsOptional()
  @IsIn(APPOINTMENT_STATUSES)
  status?: AppointmentStatus;

  @ApiPropertyOptional({ example: 'Cliente prefere tesoura' })
  @IsOptional()
  @IsString()
  notes?: string;
}

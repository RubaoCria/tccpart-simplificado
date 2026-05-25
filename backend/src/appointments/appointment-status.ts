export const APPOINTMENT_STATUSES = [
  'agendado',
  'concluido',
  'cancelado',
] as const;

export type AppointmentStatus = (typeof APPOINTMENT_STATUSES)[number];

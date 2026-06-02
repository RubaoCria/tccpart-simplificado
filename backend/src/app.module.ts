import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { AppointmentsModule } from './appointments/appointments.module';
import { AuthModule } from './auth/auth.module';
import { ClientsModule } from './clients/clients.module';
import { PrismaModule } from './prisma/prisma.module';
import { ServicesModule } from './services/services.module';
import { ScheduleModule } from '@nestjs/schedule';

// 1. Importe o seu Service aqui (ajuste o caminho se o seu arquivo estiver em outra pasta)
import { BackupService } from './backup/backup.service'; 
import { BarbersModule } from './barbers/barbers.module';

@Module({
  imports: [
    ConfigModule.forRoot({ isGlobal: true }),
    PrismaModule,
    AuthModule,
    ScheduleModule.forRoot(),
    ServicesModule,
    ClientsModule,
    AppointmentsModule,
    BarbersModule,
  ],
  // 2. Adicione o BackupService aqui nos providers!
  providers: [BackupService], 
})
export class AppModule {}
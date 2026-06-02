import { Injectable, Logger } from '@nestjs/common';
import { Cron } from '@nestjs/schedule';
// Importação correta em TypeScript:
import * as fs from 'fs'; 
import * as path from 'path';

@Injectable()
export class BackupService {
  private readonly logger = new Logger(BackupService.name);

  @Cron('0 3 * * *') // Executa todo dia às 3h da manhã 0 minutos, 3 horas, todos os dias, todos os meses, todos os dias da semana
  handleCron() {
    this.logger.debug('Iniciando backup automático...');
    
    // Caminhos corretos usando o path.join
    const dataHoje = new Date().toISOString().split('T')[0];
    const pastaBackup = path.join(process.cwd(), 'backups'); // process.cwd() pega a raiz do projeto
    const arquivoOrigem = path.join(process.cwd(), 'prisma', 'dev.db');
    const arquivoDestino = path.join(pastaBackup, `backup-${dataHoje}.sqlite`);

    // Verifica se a pasta existe
    if (!fs.existsSync(pastaBackup)) {
      fs.mkdirSync(pastaBackup);
    }

    // Copia o arquivo
    fs.copyFile(arquivoOrigem, arquivoDestino, (err) => {
      if (err) {
        this.logger.error('Erro ao realizar backup:', err);
      } else {
        this.logger.log(`Backup realizado com sucesso: ${arquivoDestino}`);
      }
    });
  }
}
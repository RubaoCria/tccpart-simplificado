import { ApiProperty } from '@nestjs/swagger';
import { IsInt, IsNotEmpty, IsString, IsUrl, Min } from 'class-validator';

export class CreateServiceDto {
  @ApiProperty({ example: 'Corte masculino' })
  @IsString()
  @IsNotEmpty()
  title: string;

  @ApiProperty({ example: 'Corte na tesoura ou máquina, inclui lavagem.' })
  @IsString()
  @IsNotEmpty()
  description: string;

  @ApiProperty({ example: 'https://exemplo.com/corte.jpg' })
  @IsUrl()
  imageUrl: string;

  @ApiProperty({ example: 4990, description: 'Preço em centavos' })
  @IsInt()
  @Min(0)
  priceInCents: number;

  @ApiProperty({ example: 30, description: 'Duração do atendimento em minutos' })
  @IsInt()
  @Min(1)
  durationMinutes: number;
}

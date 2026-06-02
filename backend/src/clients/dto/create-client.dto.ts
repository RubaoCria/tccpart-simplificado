import { ApiProperty } from '@nestjs/swagger';
import { IsEmail, IsNotEmpty, IsOptional, IsString } from 'class-validator';

export class CreateClientDto {
  @ApiProperty({ example: 'Maria Silva' })
  @IsString()
  @IsNotEmpty()
  name: string;

  @ApiProperty({ example: '11999998888' })
  @IsString()
  @IsNotEmpty()
  phone: string;

  @ApiProperty({ example: 'maria@exemplo.com' })
  @IsEmail()
  email: string;

  // Novos campos separados de endereço com a documentação do Swagger
  @ApiProperty({ example: 'Rua das Flores', required: false })
  @IsString()
  @IsOptional()
  street?: string;

  @ApiProperty({ example: '123', required: false })
  @IsString()
  @IsOptional()
  number?: string;

  @ApiProperty({ example: 'Cianorte', required: false })
  @IsString()
  @IsOptional()
  city?: string;
}
import { IsString, IsNotEmpty, IsOptional, IsEmail } from 'class-validator';

export class CreateBarberDto {
  @IsString({ message: 'O nome deve ser um texto' })
  @IsNotEmpty({ message: 'O nome é obrigatório' })
  name: string;

  @IsString()
  @IsOptional()
  phone?: string;

  @IsEmail({}, { message: 'E-mail inválido' })
  @IsOptional()
  email?: string;
  
  // Novos campos separados de endereço
  @IsString()
  @IsOptional()
  street?: string;

  @IsString()
  @IsOptional()
  number?: string;

  @IsString()
  @IsOptional()
  city?: string;
}
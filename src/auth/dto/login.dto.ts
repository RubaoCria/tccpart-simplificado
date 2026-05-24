import { ApiProperty } from '@nestjs/swagger';
import { IsEmail, IsNotEmpty, IsString } from 'class-validator';

export class LoginDto {
  @ApiProperty({ example: 'admin@salao.local' })
  @IsEmail()
  email: string;

  @ApiProperty({ example: 'trocar-em-producao' })
  @IsString()
  @IsNotEmpty()
  password: string;
}

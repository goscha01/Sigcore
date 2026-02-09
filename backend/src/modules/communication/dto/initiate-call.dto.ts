import { IsString, IsOptional } from 'class-validator';

export class InitiateCallDto {
  @IsString()
  @IsOptional()
  fromNumber?: string;
}

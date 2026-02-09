import { IsString, IsNotEmpty, IsOptional } from 'class-validator';

export class SendMessageDto {
  @IsString()
  @IsNotEmpty()
  body: string;

  @IsString()
  @IsOptional()
  fromNumber?: string;
}

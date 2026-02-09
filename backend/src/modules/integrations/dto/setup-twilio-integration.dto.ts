import { IsString, IsNotEmpty, IsOptional } from 'class-validator';

export class SetupTwilioIntegrationDto {
  @IsString()
  @IsNotEmpty()
  accountSid: string;

  @IsString()
  @IsNotEmpty()
  authToken: string;

  @IsString()
  @IsOptional()
  phoneNumber?: string; // E.164 format phone number to use

  @IsString()
  @IsOptional()
  phoneNumberSid?: string; // SID of the phone number

  @IsString()
  @IsOptional()
  friendlyName?: string; // Optional friendly name for the integration
}

export class UpdateTwilioPhoneNumberDto {
  @IsString()
  @IsNotEmpty()
  phoneNumber?: string; // E.164 format

  @IsString()
  @IsNotEmpty()
  phoneNumberSid?: string;
}

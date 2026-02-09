import { IsString, IsNotEmpty, IsOptional, IsUUID } from 'class-validator';

/**
 * DTO for the new /messages endpoint that uses senderId instead of fromNumber
 *
 * This is the preferred way to send messages:
 * - Use senderId to specify which sender address to use
 * - Use conversationId OR contactId (one is required)
 * - templateId is optional (for WhatsApp templates)
 */
export class CreateMessageDto {
  @IsString()
  @IsNotEmpty()
  body: string;

  @IsUUID()
  senderId: string;

  @IsUUID()
  @IsOptional()
  conversationId?: string;

  @IsUUID()
  @IsOptional()
  contactId?: string;

  @IsString()
  @IsOptional()
  templateId?: string;

  @IsString()
  @IsOptional()
  templateName?: string;
}

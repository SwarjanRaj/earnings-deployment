import { IsNotEmpty, IsString, IsOptional } from 'class-validator';

export class DeleteMessageDto {
  @IsNotEmpty()
  @IsString()
  messageId: string;
}

import { IsNotEmpty, IsString, IsUUID } from 'class-validator';

export class AddReactionDto {
  @IsUUID()
  @IsNotEmpty()
  messageId: string;

  @IsString()
  @IsNotEmpty()
  emoji: string;
}
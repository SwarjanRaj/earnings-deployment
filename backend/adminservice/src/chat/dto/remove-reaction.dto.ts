import { IsNotEmpty, IsString, IsUUID } from 'class-validator';

export class RemoveReactionDto {
  @IsUUID()
  @IsNotEmpty()
  messageId: string;

  @IsString()
  @IsNotEmpty()
  emoji: string;
}
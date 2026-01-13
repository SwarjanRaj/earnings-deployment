import { IsString, IsNotEmpty, IsOptional, IsUUID } from 'class-validator';

export class SendMessageDto {
  @IsString()
  @IsOptional()
  chatId?: string;

  @IsString()
  @IsOptional()
  topicId?: string;

  @IsUUID()
  @IsOptional()
  discussionId?: string;

  @IsString()
  @IsNotEmpty()
  content: string;

  @IsUUID()
  @IsOptional()
  replyToId?: string;
}


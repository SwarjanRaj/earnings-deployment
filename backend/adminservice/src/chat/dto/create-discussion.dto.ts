import { IsNotEmpty, IsString, IsOptional, IsUUID } from 'class-validator';

export class CreateDiscussionDto {
  @IsNotEmpty()
  @IsString()
  title: string;

  @IsOptional()
  @IsString()
  description?: string;

  @IsNotEmpty()
  @IsUUID()
  topicId: string;
}

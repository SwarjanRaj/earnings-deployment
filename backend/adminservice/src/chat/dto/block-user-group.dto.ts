import { IsNotEmpty, IsString, IsOptional } from 'class-validator';

export class BlockUserFromGroupDto {
  @IsNotEmpty()
  @IsString()
  userId: string;

  @IsOptional()
  @IsString()
  topicId?: string;

  @IsOptional()
  @IsString()
  reason?: string;
}

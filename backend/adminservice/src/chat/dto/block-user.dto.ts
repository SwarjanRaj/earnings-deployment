import { IsString, IsNotEmpty, IsOptional } from 'class-validator';

export class BlockUserDto {
  @IsString()
  @IsNotEmpty()
  blockedId: string;

  @IsString()
  @IsOptional()
  reason?: string;
}


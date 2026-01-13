import { IsOptional, IsString } from 'class-validator';

export class UpdateDiscussionDto {
  @IsOptional()
  @IsString()
  title?: string;

  @IsOptional()
  @IsString()
  description?: string;
}

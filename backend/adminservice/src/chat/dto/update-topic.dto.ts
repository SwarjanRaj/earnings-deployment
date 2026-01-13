import { IsString, IsOptional, MinLength } from 'class-validator';

export class UpdateTopicDto {
  @IsString()
  @IsOptional()
  @MinLength(1)
  title?: string;

  @IsString()
  @IsOptional()
  description?: string;
}

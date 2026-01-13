// src/stock/dto/upload-stock.dto.ts
import { IsString, IsOptional, IsNumber } from 'class-validator';

export class UploadStockDto {
  @IsString()
  ticker!: string;

  @IsString()
  @IsOptional()
  companyName?: string;

  @IsString()
  @IsOptional()
  sector?: string;

  @IsString()
  @IsOptional()
  marketCap?: string;

  @IsString()
  @IsOptional()
  revenue?: string;

  @IsString()
  @IsOptional()
  eps?: string;

  @IsString()
  @IsOptional()
  peRatio?: string;

  @IsString()
  earningsDate!: string;

  @IsNumber()
  fiscalYear!: number;

  @IsString()
  fiscalQuarter!: string;

  @IsString()
  @IsOptional()
  reportTime?: string;
}

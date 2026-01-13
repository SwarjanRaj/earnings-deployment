// src/stock/dto/update-stock.dto.ts
import { IsString, IsOptional, IsNumber } from 'class-validator';

export class UpdateStockDto {
  @IsString()
  @IsOptional()
  ticker?: string;

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
  @IsOptional()
  earningsDate?: string;

  @IsNumber()
  @IsOptional()
  fiscalYear?: number;

  @IsString()
  @IsOptional()
  fiscalQuarter?: string;

  @IsString()
  @IsOptional()
  reportTime?: string;
} 
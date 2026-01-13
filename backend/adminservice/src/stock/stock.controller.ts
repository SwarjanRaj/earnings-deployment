// src/stock/stock.controller.ts
import {
  Controller,
  Post,
  Get,
  Body,
  Patch,
  Delete,
  Param,
  UploadedFile,
  UseInterceptors,
  BadRequestException,
  Query,
} from '@nestjs/common';
import { FileInterceptor } from '@nestjs/platform-express';
import { diskStorage } from 'multer';

import { StockService } from './stock.service';
import { UploadStockDto } from './dto/upload-stock.dto';
import { UpdateStockDto } from './dto/update-stock.dto';

@Controller('stock')
export class StockController {
  constructor(private readonly stockService: StockService) {}

  @Post('upload')
  @UseInterceptors(
    FileInterceptor('file', {
      storage: diskStorage({
        destination: './uploads',
        filename: (req, file, cb) => {
          const uniqueName = `${Date.now()}-${file.originalname}`;
          cb(null, uniqueName);
        },
      }),
      limits: { fileSize: 500 * 1024 * 1024 }, // 500MB
    }),
  )
  async uploadStockFile(@UploadedFile() file: Express.Multer.File) {
    if (!file) {
      throw new BadRequestException('File upload failed. No file received.');
    }
    return this.stockService.parseAndUpsert(file.path);
  }

  @Post('upload-earnings')
  @UseInterceptors(
    FileInterceptor('file', {
      storage: diskStorage({
        destination: './uploads',
        filename: (req, file, cb) => {
          const uniqueName = `${Date.now()}-${file.originalname}`;
          cb(null, uniqueName);
        },
      }),
      limits: { fileSize: 500 * 1024 * 1024 }, // 500MB
    }),
  )
  async uploadEarningsFile(@UploadedFile() file: Express.Multer.File) {
    if (!file) {
      throw new BadRequestException('File upload failed. No file received.');
    }
    return this.stockService.parseAndUpsertEarnings(file.path);
  }

  @Post('add')
  async addRecord(@Body() dto: UploadStockDto) {
    return this.stockService.addSingleRecord(dto);
  }

  @Post('bulk')
  async bulkUpload(@Body() rows: UploadStockDto[]) {
    return this.stockService.bulkUpsert(rows);
  }

  @Post('chunked-bulk')
  async chunkedBulkUpload(@Body() chunk: UploadStockDto[]) {
    return this.stockService.chunkedBulkUpsert(chunk);
  }

  @Get('all')
  async getAllRecords() {
    return this.stockService.getAllRecords();
  }

  @Get('all-ids')
  async getAllRecordIds() {
    const records = await this.stockService.getAllRecords();
    return {
      ids: records.map(record => record.id),
      total: records.length
    };
  }

  @Get()
  async getPaginated(
    @Query('page') page: string = '1',
    @Query('pageSize') pageSize: string = '25',
    @Query('search') search?: string,
    @Query('date') date?: string,
  ) {
    return this.stockService.getPaginated(+page, +pageSize, search, date);
  }

  @Get('search')
  async searchRecords(@Query('q') query: string) {
    return this.stockService.searchRecords(query);
  }



  @Get('today')
  async getToday(
    @Query('page') page: string = '1',
    @Query('pageSize') pageSize: string = '25',
  ) {
    return this.stockService.getTodayPaginated(+page, +pageSize);
  }

  @Get('yesterday')
  async getYesterday(
    @Query('page') page: string = '1',
    @Query('pageSize') pageSize: string = '25',
  ) {
    return this.stockService.getYesterdayPaginated(+page, +pageSize);
  }

  @Get('tomorrow')
  async getTomorrow(
    @Query('page') page: string = '1',
    @Query('pageSize') pageSize: string = '25',
  ) {
    return this.stockService.getTomorrowPaginated(+page, +pageSize);
  }

  @Get('this-week')
  async getThisWeek(
    @Query('page') page: string = '1',
    @Query('pageSize') pageSize: string = '25',
  ) {
    return this.stockService.getThisWeekPaginated(+page, +pageSize);
  }

  @Get('next-week')
  async getNextWeek(
    @Query('page') page: string = '1',
    @Query('pageSize') pageSize: string = '25',
  ) {
    return this.stockService.getNextWeekPaginated(+page, +pageSize);
  }

  @Get('public-preview')
  async getPublicPreview(
    @Query('page') page: string = '1',
    @Query('pageSize') pageSize: string = '50',
  ) {
    return this.stockService.getPublicPreview(+page, +pageSize);
  }

  // New date range endpoints
  @Get('date-range')
  async getByDateRange(
    @Query('startDate') startDate: string,
    @Query('endDate') endDate: string,
    @Query('page') page: string = '1',
    @Query('pageSize') pageSize: string = '25',
  ) {
    if (!startDate || !endDate) {
      throw new BadRequestException('Both startDate and endDate are required');
    }
    return this.stockService.getByDateRangePaginated(startDate, endDate, +page, +pageSize);
  }

  @Get('specific-date')
  async getBySpecificDate(
    @Query('date') date: string,
    @Query('page') page: string = '1',
    @Query('pageSize') pageSize: string = '25',
  ) {
    if (!date) {
      throw new BadRequestException('Date parameter is required');
    }
    return this.stockService.getBySpecificDatePaginated(date, +page, +pageSize);
  }

  @Get('month')
  async getByMonth(
    @Query('year') year: string,
    @Query('month') month: string,
    @Query('page') page: string = '1',
    @Query('pageSize') pageSize: string = '25',
  ) {
    if (!year || !month) {
      throw new BadRequestException('Both year and month are required');
    }
    const yearNum = parseInt(year);
    const monthNum = parseInt(month);
    if (isNaN(yearNum) || isNaN(monthNum) || monthNum < 1 || monthNum > 12) {
      throw new BadRequestException('Invalid year or month');
    }
    return this.stockService.getByMonthPaginated(yearNum, monthNum, +page, +pageSize);
  }

  @Get('quarter')
  async getByQuarter(
    @Query('year') year: string,
    @Query('quarter') quarter: string,
    @Query('page') page: string = '1',
    @Query('pageSize') pageSize: string = '25',
  ) {
    if (!year || !quarter) {
      throw new BadRequestException('Both year and quarter are required');
    }
    const yearNum = parseInt(year);
    const quarterNum = parseInt(quarter);
    if (isNaN(yearNum) || isNaN(quarterNum) || quarterNum < 1 || quarterNum > 4) {
      throw new BadRequestException('Invalid year or quarter');
    }
    return this.stockService.getByQuarterPaginated(yearNum, quarterNum, +page, +pageSize);
  }

  @Delete('delete-all')
  async deleteAllRecords() {
    return this.stockService.deleteAllRecords();
  }

  @Delete('bulk/delete')
  async bulkDeleteRecords(@Body() body: { ids: string[] }) {
    if (!body.ids || !Array.isArray(body.ids) || body.ids.length === 0) {
      throw new BadRequestException('ids array is required and must not be empty');
    }
    return this.stockService.bulkDeleteRecords(body.ids);
  }

  @Delete(':id')
  async deleteRecord(@Param('id') id: string) {
    return this.stockService.deleteRecord(id);
  }

  @Patch(':id')
  async updateRecord(@Param('id') id: string, @Body() dto: UpdateStockDto) {
    return this.stockService.updateRecord(id, dto);
  }
}

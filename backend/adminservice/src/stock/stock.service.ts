// src/stock/stock.service.ts
import {
  Injectable,
  BadRequestException,
  NotFoundException,
} from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { UploadStockDto } from './dto/upload-stock.dto';
import { UpdateStockDto } from './dto/update-stock.dto';
import { createReadStream } from 'fs';
import { v4 as uuid } from 'uuid';
import { Prisma } from '@prisma/client';
const csv = require('csv-parser');

@Injectable()
export class StockService {
  constructor(private readonly prisma: PrismaService) {}

  // Helper function to get field value with multiple possible column names
  private getFieldValue(row: any, possibleNames: string[]): string | null {
    for (const name of possibleNames) {
      if (row[name] !== undefined && row[name] !== null && row[name] !== '') {
        return row[name];
      }
    }
    return null;
  }

  // More robust field extraction that handles exact column names
  private extractField(row: any, fieldName: string, fallbackNames: string[] = []): string | null {
    // First try exact match
    if (row[fieldName] !== undefined && row[fieldName] !== null && row[fieldName] !== '') {
      return row[fieldName];
    }
    
    // Then try fallback names
    for (const name of fallbackNames) {
      if (row[name] !== undefined && row[name] !== null && row[name] !== '') {
        return row[name];
      }
    }
    
    return null;
  }

  // Debug function to log row structure
  private debugRow(row: any, rowIndex: number) {
    // Debug logging removed for production
  }

  async parseAndUpsert(filePath: string): Promise<any> {
    const rows: any[] = [];
    let insertCount = 0;
    let updateCount = 0;
    let skippedCount = 0;
    
    // Track existing records for better counting
    const existingRecords = new Set<string>();

    return new Promise((resolve, reject) => {
      createReadStream(filePath)
        .pipe(csv())
        .on('data', (row: any) => rows.push(row))
        .on('end', async () => {
          try {
            // First, get all existing records to track what will be updates vs inserts
            const allExisting = await this.prisma.financialRecord.findMany({
              select: { ticker: true, fiscalYear: true, fiscalQuarter: true }
            });
            
            allExisting.forEach(record => {
              existingRecords.add(`${record.ticker}-${record.fiscalYear}-${record.fiscalQuarter}`);
            });
            
            for (let i = 0; i < rows.length; i++) {
              const row = rows[i];
              this.debugRow(row, i);
              
              const ticker = this.getFieldValue(row, ['Ticker', 'ticker', 'Symbol', 'symbol']);
              const fiscalYear = this.getFieldValue(row, ['Fiscal Year', 'fiscalYear', 'FY', 'fy']);
              const fiscalQuarter = this.getFieldValue(row, ['Fiscal Quarter', 'fiscalQuarter', 'Quarter', 'quarter']);

              if (!ticker || !fiscalYear || !fiscalQuarter) {
                skippedCount++;
                continue;
              }

              const companyName = this.getFieldValue(row, ['Company Name', 'Company', 'company', 'companyName']) || '';
              const sector = this.getFieldValue(row, ['Sector', 'sector']) || '';
              const marketCap = this.getFieldValue(row, ['Market Cap (B USD)', 'Market Cap', 'marketCap', 'Market Cap (B)']);
              const revenue = this.getFieldValue(row, ['Quarterly Revenue (B USD)', 'Revenue', 'revenue', 'Quarterly Revenue']);
              const eps = this.getFieldValue(row, ['EPS (USD)', 'EPS', 'eps']);
              const peRatio = this.getFieldValue(row, ['P/E Ratio', 'PE Ratio', 'peRatio', 'P/E']);
              const earningsDate = this.getFieldValue(row, ['Earnings Date', 'Date', 'earningsDate']);
              const reportTime = this.getFieldValue(row, ['Report Time', 'Time', 'reportTime']) || 'day';

              // Check if this record already exists
              const recordKey = `${ticker}-${parseInt(fiscalYear)}-${fiscalQuarter}`;
              const isUpdate = existingRecords.has(recordKey);

              try {
                await this.prisma.financialRecord.upsert({
                  where: {
                    ticker_fiscalYear_fiscalQuarter: {
                      ticker,
                      fiscalYear: parseInt(fiscalYear),
                      fiscalQuarter,
                    },
                  },
                  update: {
                    companyName,
                    sector,
                    marketCap: marketCap?.toString(),
                    revenue: revenue?.toString(),
                    eps: eps?.toString(),
                    peRatio: peRatio?.toString(),
                    earningsDate: earningsDate ? new Date(earningsDate) : null,
                    reportTime,
                  },
                  create: {
                    id: uuid(),
                    ticker,
                    fiscalYear: parseInt(fiscalYear),
                    fiscalQuarter,
                    companyName,
                    sector,
                    marketCap: marketCap?.toString(),
                    revenue: revenue?.toString(),
                    eps: eps?.toString(),
                    peRatio: peRatio?.toString(),
                    earningsDate: earningsDate ? new Date(earningsDate) : null,
                    reportTime,
                  },
                });

                if (isUpdate) {
                  updateCount++;
                } else {
                  insertCount++;
                }

                // Debug logging for first few records
                if (i < 3) {
    
                }

              } catch (upsertError) {

                skippedCount++;
              }
            }



            resolve({
              message: 'Stock data uploaded successfully',
              inserted: insertCount,
              updated: updateCount,
              skipped: skippedCount,
              total: rows.length,
            });
          } catch (err: unknown) {
            reject(
              new BadRequestException(
                `CSV processing failed: ${(err as Error).message}`,
              ),
            );
          }
        })
        .on('error', (err: unknown) => {
          reject(
            new BadRequestException(
              `Failed to read CSV file: ${(err as Error).message}`,
            ),
          );
        });
    });
  }

  async addSingleRecord(dto: UploadStockDto) {
    return this.prisma.financialRecord.create({
      data: {
        id: uuid(),
        ticker: dto.ticker,
        fiscalYear: dto.fiscalYear,
        fiscalQuarter: dto.fiscalQuarter,
        companyName: dto.companyName,
        sector: dto.sector,
        marketCap: dto.marketCap?.toString(),
        revenue: dto.revenue?.toString(),
        eps: dto.eps?.toString(),
        peRatio: dto.peRatio?.toString(),
        earningsDate: new Date(dto.earningsDate),
        reportTime: dto.reportTime,
      },
    });
  }

  async getAll() {
    // Return only 20 random records for initial load
    const totalCount = await this.prisma.financialRecord.count();
    
    if (totalCount <= 20) {
      return this.prisma.financialRecord.findMany();
    }

    // Get 20 random records using a more efficient approach
    const randomRecords = await this.prisma.financialRecord.findMany({
      take: 20,
      orderBy: {
        // Use a random function for better randomness
        id: 'asc',
      },
    });

    // Shuffle the results for better randomness
    return randomRecords.sort(() => Math.random() - 0.5);
  }

  async getAllRecords() {
    // Use this method when you need all records
    return this.prisma.financialRecord.findMany();
  }

  async searchRecords(query: string) {
    if (!query || query.trim().length === 0) {
      return this.getAllRecords();
    }

    const searchTerm = query.trim();
    
    return this.prisma.financialRecord.findMany({
      where: {
        OR: [
          { ticker: { equals: searchTerm, mode: 'insensitive' } },
          { companyName: { equals: searchTerm, mode: 'insensitive' } },
          { sector: { equals: searchTerm, mode: 'insensitive' } },
        ],
      },
      orderBy: { ticker: 'asc' },
    });
  }

  async deleteRecord(id: string) {
    return this.prisma.financialRecord.delete({
      where: { id },
    });
  }

  async bulkDeleteRecords(ids: string[]) {
    if (!ids || ids.length === 0) {
      return { deletedCount: 0 };
    }

    try {
      // Use chunked deletion to avoid PostgreSQL bind variable limit
      const chunkSize = 1000; // Safe chunk size for PostgreSQL
      let totalDeleted = 0;
      
      for (let i = 0; i < ids.length; i += chunkSize) {
        const chunk = ids.slice(i, i + chunkSize);
        const result = await this.prisma.financialRecord.deleteMany({
          where: {
            id: {
              in: chunk,
            },
          },
        });
        totalDeleted += result.count;
      }

      return {
        deletedCount: totalDeleted,
        message: `Successfully deleted ${totalDeleted} record${totalDeleted !== 1 ? 's' : ''}`,
      };
    } catch (error) {
      throw new BadRequestException(`Bulk delete failed: ${error.message}`);
    }
  }

  async deleteAllRecords() {
    try {
      // First check if there are any records to delete
      const count = await this.prisma.financialRecord.count();
      console.log(`deleteAllRecords: Found ${count} records to delete`);
      
      if (count === 0) {
        return {
          deletedCount: 0,
          message: 'No records found to delete',
        };
      }
      
      const result = await this.prisma.financialRecord.deleteMany({});
      console.log(`deleteAllRecords: Successfully deleted ${result.count} records`);
      
      return {
        deletedCount: result.count,
        message: `Successfully deleted all ${result.count} records`,
      };
    } catch (error) {
      console.error('deleteAllRecords error:', error);
      throw new BadRequestException(`Delete all records failed: ${error.message}`);
    }
  }

  async getPaginated(
    page: number,
    pageSize: number,
    search?: string,
    date?: string, // Now filtering by a single date
  ) {
    const skip = (page - 1) * pageSize;
    const andConditions: any[] = [];

    if (search) {
      andConditions.push({
        OR: [
          { ticker: { equals: search, mode: 'insensitive' } },
          { companyName: { equals: search, mode: 'insensitive' } },
          { sector: { equals: search, mode: 'insensitive' } },
          { fiscalQuarter: { equals: search, mode: 'insensitive' } },
          !isNaN(+search) ? { fiscalYear: { equals: +search } } : {},
        ],
      });
    }

    if (date) {
      const targetDate = new Date(date);
      const startOfDay = new Date(targetDate);
      startOfDay.setHours(0, 0, 0, 0);
      const endOfDay = new Date(targetDate);
      endOfDay.setHours(23, 59, 59, 999);

      andConditions.push({
        earningsDate: {
          gte: startOfDay,
          lte: endOfDay,
        },
      });
    }

    const where: any =
      andConditions.length > 0 ? { AND: andConditions } : {};

    const [records, total] = await Promise.all([
      this.prisma.financialRecord.findMany({
        where,
        skip,
        take: pageSize,
        orderBy: { earningsDate: 'desc' },
      }),
      this.prisma.financialRecord.count({ where }),
    ]);

    const totalPages = Math.ceil(total / pageSize);
    const hasNextPage = page < totalPages;
    const hasPrevPage = page > 1;

    return {
      data: records,
      pagination: {
        currentPage: page,
        pageSize,
        total,
        totalPages,
        hasNextPage,
        hasPrevPage,
        startIndex: skip + 1,
        endIndex: Math.min(skip + pageSize, total),
      }
    };
  }

  async updateRecord(id: string, dto: UpdateStockDto) {
    const record = await this.prisma.financialRecord.findUnique({ where: { id } });
    if (!record) throw new NotFoundException('Record not found');

    // Build update data object with only provided fields
    const updateData: any = {};
    
    if (dto.ticker !== undefined) updateData.ticker = dto.ticker;
    if (dto.fiscalYear !== undefined) updateData.fiscalYear = dto.fiscalYear;
    if (dto.fiscalQuarter !== undefined) updateData.fiscalQuarter = dto.fiscalQuarter;
    if (dto.companyName !== undefined) updateData.companyName = dto.companyName;
    if (dto.sector !== undefined) updateData.sector = dto.sector;
    if (dto.marketCap !== undefined) updateData.marketCap = dto.marketCap.toString();
    if (dto.revenue !== undefined) updateData.revenue = dto.revenue.toString();
    if (dto.eps !== undefined) updateData.eps = dto.eps.toString();
    if (dto.peRatio !== undefined) updateData.peRatio = dto.peRatio.toString();
    if (dto.earningsDate !== undefined) updateData.earningsDate = new Date(dto.earningsDate);
    if (dto.reportTime !== undefined) updateData.reportTime = dto.reportTime;

    return this.prisma.financialRecord.update({
      where: { id },
      data: updateData,
    });
  }

  // Date filter methods
  async getToday() {
    const today = new Date();
    const startOfDay = new Date(today);
    startOfDay.setHours(0, 0, 0, 0);
    const endOfDay = new Date(today);
    endOfDay.setHours(23, 59, 59, 999);

    return this.prisma.financialRecord.findMany({
      where: {
        earningsDate: {
          gte: startOfDay,
          lte: endOfDay,
        },
      },
      orderBy: { earningsDate: 'asc' },
    });
  }

  async getTodayPaginated(page: number, pageSize: number) {
    const today = new Date();
    const startOfDay = new Date(today);
    startOfDay.setHours(0, 0, 0, 0);
    const endOfDay = new Date(today);
    endOfDay.setHours(23, 59, 59, 999);

    const skip = (page - 1) * pageSize;
    const where = {
      earningsDate: {
        gte: startOfDay,
        lte: endOfDay,
      },
    };

    const [records, total] = await Promise.all([
      this.prisma.financialRecord.findMany({
        where,
        skip,
        take: pageSize,
        orderBy: { earningsDate: 'asc' },
      }),
      this.prisma.financialRecord.count({ where }),
    ]);

    const totalPages = Math.ceil(total / pageSize);
    const hasNextPage = page < totalPages;
    const hasPrevPage = page > 1;

    return {
      data: records,
      pagination: {
        currentPage: page,
        pageSize,
        total,
        totalPages,
        hasNextPage,
        hasPrevPage,
        startIndex: skip + 1,
        endIndex: Math.min(skip + pageSize, total),
      }
    };
  }

  async getYesterday() {
    const yesterday = new Date();
    yesterday.setDate(yesterday.getDate() - 1);
    const startOfDay = new Date(yesterday);
    startOfDay.setHours(0, 0, 0, 0);
    const endOfDay = new Date(yesterday);
    endOfDay.setHours(23, 59, 59, 999);

    return this.prisma.financialRecord.findMany({
      where: {
        earningsDate: {
          gte: startOfDay,
          lte: endOfDay,
        },
      },
      orderBy: { earningsDate: 'asc' },
    });
  }

  async getYesterdayPaginated(page: number, pageSize: number) {
    const yesterday = new Date();
    yesterday.setDate(yesterday.getDate() - 1);
    const startOfDay = new Date(yesterday);
    startOfDay.setHours(0, 0, 0, 0);
    const endOfDay = new Date(yesterday);
    endOfDay.setHours(23, 59, 59, 999);

    const skip = (page - 1) * pageSize;
    const where = {
      earningsDate: {
        gte: startOfDay,
        lte: endOfDay,
      },
    };

    const [records, total] = await Promise.all([
      this.prisma.financialRecord.findMany({
        where,
        skip,
        take: pageSize,
        orderBy: { earningsDate: 'asc' },
      }),
      this.prisma.financialRecord.count({ where }),
    ]);

    const totalPages = Math.ceil(total / pageSize);
    const hasNextPage = page < totalPages;
    const hasPrevPage = page > 1;

    return {
      data: records,
      pagination: {
        currentPage: page,
        pageSize,
        total,
        totalPages,
        hasNextPage,
        hasPrevPage,
        startIndex: skip + 1,
        endIndex: Math.min(skip + pageSize, total),
      }
    };
  }

  async getTomorrow() {
    const tomorrow = new Date();
    tomorrow.setDate(tomorrow.getDate() + 1);
    const startOfDay = new Date(tomorrow);
    startOfDay.setHours(0, 0, 0, 0);
    const endOfDay = new Date(tomorrow);
    endOfDay.setHours(23, 59, 59, 999);

    return this.prisma.financialRecord.findMany({
      where: {
        earningsDate: {
          gte: startOfDay,
          lte: endOfDay,
        },
      },
      orderBy: { earningsDate: 'asc' },
    });
  }

  async getTomorrowPaginated(page: number, pageSize: number) {
    const tomorrow = new Date();
    tomorrow.setDate(tomorrow.getDate() + 1);
    const startOfDay = new Date(tomorrow);
    startOfDay.setHours(0, 0, 0, 0);
    const endOfDay = new Date(tomorrow);
    endOfDay.setHours(23, 59, 59, 999);

    const skip = (page - 1) * pageSize;
    const where = {
      earningsDate: {
        gte: startOfDay,
        lte: endOfDay,
      },
    };

    const [records, total] = await Promise.all([
      this.prisma.financialRecord.findMany({
        where,
        skip,
        take: pageSize,
        orderBy: { earningsDate: 'asc' },
      }),
      this.prisma.financialRecord.count({ where }),
    ]);

    const totalPages = Math.ceil(total / pageSize);
    const hasNextPage = page < totalPages;
    const hasPrevPage = page > 1;

    return {
      data: records,
      pagination: {
        currentPage: page,
        pageSize,
        total,
        totalPages,
        hasNextPage,
        hasPrevPage,
        startIndex: skip + 1,
        endIndex: Math.min(skip + pageSize, total),
      }
    };
  }

  async getThisWeek() {
    const today = new Date();
    const startOfWeek = new Date(today);
    startOfWeek.setDate(today.getDate() - today.getDay()); // Start of week (Sunday)
    startOfWeek.setHours(0, 0, 0, 0);
    
    const endOfWeek = new Date(startOfWeek);
    endOfWeek.setDate(startOfWeek.getDate() + 6); // End of week (Saturday)
    endOfWeek.setHours(23, 59, 59, 999);

    return this.prisma.financialRecord.findMany({
      where: {
        earningsDate: {
          gte: startOfWeek,
          lte: endOfWeek,
        },
      },
      orderBy: { earningsDate: 'asc' },
    });
  }

  async getThisWeekPaginated(page: number, pageSize: number) {
    const today = new Date();
    const startOfWeek = new Date(today);
    startOfWeek.setDate(today.getDate() - today.getDay()); // Start of week (Sunday)
    startOfWeek.setHours(0, 0, 0, 0);
    
    const endOfWeek = new Date(startOfWeek);
    endOfWeek.setDate(startOfWeek.getDate() + 6); // End of week (Saturday)
    endOfWeek.setHours(23, 59, 59, 999);

    const skip = (page - 1) * pageSize;
    const where = {
      earningsDate: {
        gte: startOfWeek,
        lte: endOfWeek,
      },
    };

    const [records, total] = await Promise.all([
      this.prisma.financialRecord.findMany({
        where,
        skip,
        take: pageSize,
        orderBy: { earningsDate: 'asc' },
      }),
      this.prisma.financialRecord.count({ where }),
    ]);

    const totalPages = Math.ceil(total / pageSize);
    const hasNextPage = page < totalPages;
    const hasPrevPage = page > 1;

    return {
      data: records,
      pagination: {
        currentPage: page,
        pageSize,
        total,
        totalPages,
        hasNextPage,
        hasPrevPage,
        startIndex: skip + 1,
        endIndex: Math.min(skip + pageSize, total),
      }
    };
  }

  async getNextWeek() {
    const today = new Date();
    const startOfNextWeek = new Date(today);
    startOfNextWeek.setDate(today.getDate() - today.getDay() + 7); // Start of next week
    startOfNextWeek.setHours(0, 0, 0, 0);
    
    const endOfNextWeek = new Date(startOfNextWeek);
    endOfNextWeek.setDate(startOfNextWeek.getDate() + 6); // End of next week
    endOfNextWeek.setHours(23, 59, 59, 999);

    return this.prisma.financialRecord.findMany({
      where: {
        earningsDate: {
          gte: startOfNextWeek,
          lte: endOfNextWeek,
        },
      },
      orderBy: { earningsDate: 'asc' },
    });
  }

  async getNextWeekPaginated(page: number, pageSize: number) {
    const today = new Date();
    const startOfNextWeek = new Date(today);
    startOfNextWeek.setDate(today.getDate() - today.getDay() + 7); // Start of next week
    startOfNextWeek.setHours(0, 0, 0, 0);
    
    const endOfNextWeek = new Date(startOfNextWeek);
    endOfNextWeek.setDate(startOfNextWeek.getDate() + 6); // End of next week
    endOfNextWeek.setHours(23, 59, 59, 999);

    const skip = (page - 1) * pageSize;
    const where = {
      earningsDate: {
        gte: startOfNextWeek,
        lte: endOfNextWeek,
      },
    };

    const [records, total] = await Promise.all([
      this.prisma.financialRecord.findMany({
        where,
        skip,
        take: pageSize,
        orderBy: { earningsDate: 'asc' },
      }),
      this.prisma.financialRecord.count({ where }),
    ]);

    const totalPages = Math.ceil(total / pageSize);
    const hasNextPage = page < totalPages;
    const hasPrevPage = page > 1;

    return {
      data: records,
      pagination: {
        currentPage: page,
        pageSize,
        total,
        totalPages,
        hasNextPage,
        hasPrevPage,
        startIndex: skip + 1,
        endIndex: Math.min(skip + pageSize, total),
      }
    };
  }

  // New date range methods
  async getByDateRange(startDate: string, endDate: string) {
    const start = new Date(startDate);
    start.setHours(0, 0, 0, 0);
    
    const end = new Date(endDate);
    end.setHours(23, 59, 59, 999);

    return this.prisma.financialRecord.findMany({
      where: {
        earningsDate: {
          gte: start,
          lte: end,
        },
      },
      orderBy: { earningsDate: 'asc' },
    });
  }

  async getByDateRangePaginated(startDate: string, endDate: string, page: number, pageSize: number) {
    const start = new Date(startDate);
    start.setHours(0, 0, 0, 0);
    
    const end = new Date(endDate);
    end.setHours(23, 59, 59, 999);

    const skip = (page - 1) * pageSize;
    const where = {
      earningsDate: {
        gte: start,
        lte: end,
      },
    };

    const [records, total] = await Promise.all([
      this.prisma.financialRecord.findMany({
        where,
        skip,
        take: pageSize,
        orderBy: { earningsDate: 'asc' },
      }),
      this.prisma.financialRecord.count({ where }),
    ]);

    const totalPages = Math.ceil(total / pageSize);
    const hasNextPage = page < totalPages;
    const hasPrevPage = page > 1;

    return {
      data: records,
      pagination: {
        currentPage: page,
        pageSize,
        total,
        totalPages,
        hasNextPage,
        hasPrevPage,
        startIndex: skip + 1,
        endIndex: Math.min(skip + pageSize, total),
      }
    };
  }

  async getBySpecificDate(date: string) {
    const targetDate = new Date(date);
    const startOfDay = new Date(targetDate);
    startOfDay.setHours(0, 0, 0, 0);
    const endOfDay = new Date(targetDate);
    endOfDay.setHours(23, 59, 59, 999);

    return this.prisma.financialRecord.findMany({
      where: {
        earningsDate: {
          gte: startOfDay,
          lte: endOfDay,
        },
      },
      orderBy: { earningsDate: 'asc' },
    });
  }

  async getBySpecificDatePaginated(date: string, page: number, pageSize: number) {
    const targetDate = new Date(date);
    const startOfDay = new Date(targetDate);
    startOfDay.setHours(0, 0, 0, 0);
    const endOfDay = new Date(targetDate);
    endOfDay.setHours(23, 59, 59, 999);

    const skip = (page - 1) * pageSize;
    const where = {
      earningsDate: {
        gte: startOfDay,
        lte: endOfDay,
      },
    };

    const [records, total] = await Promise.all([
      this.prisma.financialRecord.findMany({
        where,
        skip,
        take: pageSize,
        orderBy: { earningsDate: 'asc' },
      }),
      this.prisma.financialRecord.count({ where }),
    ]);

    const totalPages = Math.ceil(total / pageSize);
    const hasNextPage = page < totalPages;
    const hasPrevPage = page > 1;

    return {
      data: records,
      pagination: {
        currentPage: page,
        pageSize,
        total,
        totalPages,
        hasNextPage,
        hasPrevPage,
        startIndex: skip + 1,
        endIndex: Math.min(skip + pageSize, total),
      }
    };
  }

  async getByMonth(year: number, month: number) {
    const startOfMonth = new Date(year, month - 1, 1); // month is 0-indexed
    const endOfMonth = new Date(year, month, 0); // Last day of the month
    endOfMonth.setHours(23, 59, 59, 999);

    return this.prisma.financialRecord.findMany({
      where: {
        earningsDate: {
          gte: startOfMonth,
          lte: endOfMonth,
        },
      },
      orderBy: { earningsDate: 'asc' },
    });
  }

  async getByMonthPaginated(year: number, month: number, page: number, pageSize: number) {
    const startOfMonth = new Date(year, month - 1, 1); // month is 0-indexed
    const endOfMonth = new Date(year, month, 0); // Last day of the month
    endOfMonth.setHours(23, 59, 59, 999);

    const skip = (page - 1) * pageSize;
    const where = {
      earningsDate: {
        gte: startOfMonth,
        lte: endOfMonth,
      },
    };

    const [records, total] = await Promise.all([
      this.prisma.financialRecord.findMany({
        where,
        skip,
        take: pageSize,
        orderBy: { earningsDate: 'asc' },
      }),
      this.prisma.financialRecord.count({ where }),
    ]);

    const totalPages = Math.ceil(total / pageSize);
    const hasNextPage = page < totalPages;
    const hasPrevPage = page > 1;

    return {
      data: records,
      pagination: {
        currentPage: page,
        pageSize,
        total,
        totalPages,
        hasNextPage,
        hasPrevPage,
        startIndex: skip + 1,
        endIndex: Math.min(skip + pageSize, total),
      }
    };
  }

  async getByQuarter(year: number, quarter: number) {
    const quarterStartMonth = (quarter - 1) * 3; // Q1=0, Q2=3, Q3=6, Q4=9
    const startOfQuarter = new Date(year, quarterStartMonth, 1);
    const endOfQuarter = new Date(year, quarterStartMonth + 3, 0); // Last day of the quarter
    endOfQuarter.setHours(23, 59, 59, 999);

    return this.prisma.financialRecord.findMany({
      where: {
        earningsDate: {
          gte: startOfQuarter,
          lte: endOfQuarter,
        },
      },
      orderBy: { earningsDate: 'asc' },
    });
  }

  async getByQuarterPaginated(year: number, quarter: number, page: number, pageSize: number) {
    const quarterStartMonth = (quarter - 1) * 3; // Q1=0, Q2=3, Q3=6, Q4=9
    const startOfQuarter = new Date(year, quarterStartMonth, 1);
    const endOfQuarter = new Date(year, quarterStartMonth + 3, 0); // Last day of the quarter
    endOfQuarter.setHours(23, 59, 59, 999);

    const skip = (page - 1) * pageSize;
    const where = {
      earningsDate: {
        gte: startOfQuarter,
        lte: endOfQuarter,
      },
    };

    const [records, total] = await Promise.all([
      this.prisma.financialRecord.findMany({
        where,
        skip,
        take: pageSize,
        orderBy: { earningsDate: 'asc' },
      }),
      this.prisma.financialRecord.count({ where }),
    ]);

    const totalPages = Math.ceil(total / pageSize);
    const hasNextPage = page < totalPages;
    const hasPrevPage = page > 1;

    return {
      data: records,
      pagination: {
        currentPage: page,
        pageSize,
        total,
        totalPages,
        hasNextPage,
        hasPrevPage,
        startIndex: skip + 1,
        endIndex: Math.min(skip + pageSize, total),
      }
    };
  }

  async getPublicPreview(page: number = 1, pageSize: number = 50) {
    // Return paginated records ordered by earnings date
    const skip = (page - 1) * pageSize;
    
    const [records, total] = await Promise.all([
      this.prisma.financialRecord.findMany({
        orderBy: { earningsDate: 'asc' },
        skip,
        take: pageSize,
      }),
      this.prisma.financialRecord.count(),
    ]);

    return {
      data: records,
      pagination: {
        currentPage: page,
        pageSize,
        total,
        totalPages: Math.ceil(total / pageSize),
        hasNextPage: page < Math.ceil(total / pageSize),
        hasPrevPage: page > 1,
        startIndex: skip + 1,
        endIndex: Math.min(skip + pageSize, total),
      },
    };
  }

  async bulkUpsert(rows: UploadStockDto[]) {
    let insertCount = 0;
    let updateCount = 0;
    let skippedCount = 0;
    for (const row of rows) {
      if (!row.ticker || !row.fiscalYear || !row.fiscalQuarter) {
        skippedCount++;
        continue;
      }
      const existing = await this.prisma.financialRecord.findUnique({
        where: {
          ticker_fiscalYear_fiscalQuarter: {
            ticker: row.ticker,
            fiscalYear: row.fiscalYear,
            fiscalQuarter: row.fiscalQuarter,
          },
        },
      });
      await this.prisma.financialRecord.upsert({
        where: {
          ticker_fiscalYear_fiscalQuarter: {
            ticker: row.ticker,
            fiscalYear: row.fiscalYear,
            fiscalQuarter: row.fiscalQuarter,
          },
        },
        update: {
          companyName: row.companyName,
          sector: row.sector,
          marketCap: row.marketCap?.toString(),
          revenue: row.revenue?.toString(),
          eps: row.eps?.toString(),
          peRatio: row.peRatio?.toString(),
          earningsDate: row.earningsDate ? new Date(row.earningsDate) : null,
          reportTime: row.reportTime,
        },
        create: {
          id: existing?.id || (require('uuid').v4()),
          ticker: row.ticker,
          fiscalYear: row.fiscalYear,
          fiscalQuarter: row.fiscalQuarter,
          companyName: row.companyName,
          sector: row.sector,
          marketCap: row.marketCap?.toString(),
          revenue: row.revenue?.toString(),
          eps: row.eps?.toString(),
          peRatio: row.peRatio?.toString(),
          earningsDate: row.earningsDate ? new Date(row.earningsDate) : null,
          reportTime: row.reportTime,
        },
      });
      if (existing) {
        updateCount++;
      } else {
        insertCount++;
      }
    }
    return {
      message: 'Bulk upload complete',
      inserted: insertCount,
      updated: updateCount,
      skipped: skippedCount,
    };
  }

  async chunkedBulkUpsert(chunk: UploadStockDto[]) {

    
    if (!chunk || chunk.length === 0) {
      return {
        message: 'Chunk processed successfully',
        inserted: 0,
        updated: 0,
        skipped: 0,
        total: 0,
      };
    }

    // Filter out invalid rows first
    const skippedRows: { index: number, row: any, reason: string }[] = [];
    const validRows = chunk.filter((row, idx) => {
      if (!row || typeof row !== 'object') {
        skippedRows.push({ index: idx, row, reason: 'Not an object' });
        return false;
      }
      if (!row.ticker) {
        skippedRows.push({ index: idx, row, reason: 'Missing ticker' });
        return false;
      }
      if (!row.fiscalYear) {
        skippedRows.push({ index: idx, row, reason: 'Missing fiscalYear' });
        return false;
      }
      if (!row.fiscalQuarter) {
        skippedRows.push({ index: idx, row, reason: 'Missing fiscalQuarter' });
        return false;
      }
      return true;
    });
    const skippedCount = skippedRows.length;
    if (skippedRows.length > 0) {
      console.log('Skipped rows (first 10):', skippedRows.slice(0, 10));
    }

    if (validRows.length === 0) {
      return {
        message: 'Chunk processed successfully',
        inserted: 0,
        updated: 0,
        skipped: skippedCount,
        skippedRows: skippedRows.slice(0, 100),
        total: chunk.length,
      };
    }

    try {
      // First, check which records already exist
      const existingRecords = await this.prisma.financialRecord.findMany({
        where: {
          OR: validRows.map(row => ({
            AND: [
              { ticker: String(row.ticker) },
              { fiscalYear: Number(row.fiscalYear) },
              { fiscalQuarter: String(row.fiscalQuarter) },
            ],
          })),
        },
        select: {
          ticker: true,
          fiscalYear: true,
          fiscalQuarter: true,
        },
      });

      // Create a Set for O(1) lookup
      const existingSet = new Set(
        existingRecords.map(record => `${record.ticker}-${record.fiscalYear}-${record.fiscalQuarter}`)
      );

      // Separate inserts and updates
      const toInsert: any[] = [];
      const toUpdate: any[] = [];

      validRows.forEach(row => {
        const key = `${String(row.ticker)}-${Number(row.fiscalYear)}-${String(row.fiscalQuarter)}`;
        const recordData = {
          ticker: String(row.ticker),
          fiscalYear: Number(row.fiscalYear),
          fiscalQuarter: String(row.fiscalQuarter),
          companyName: row.companyName || '',
          sector: row.sector || '',
          marketCap: row.marketCap?.toString() || null,
          revenue: row.revenue?.toString() || null,
          eps: row.eps?.toString() || null,
          peRatio: row.peRatio?.toString() || null,
          earningsDate: row.earningsDate ? new Date(row.earningsDate) : null,
          reportTime: row.reportTime || 'day',
        };

        if (existingSet.has(key)) {
          toUpdate.push({
            where: {
              ticker_fiscalYear_fiscalQuarter: {
                ticker: String(row.ticker),
                fiscalYear: Number(row.fiscalYear),
                fiscalQuarter: String(row.fiscalQuarter),
              },
            },
            data: recordData,
          });
        } else {
          toInsert.push({
            ...recordData,
            id: uuid(),
          });
        }
      });

      // Execute operations in transaction
      const result = await this.prisma.$transaction(async (tx) => {
        const insertResults = toInsert.length > 0 
          ? await tx.financialRecord.createMany({ data: toInsert })
          : { count: 0 };
        
        const updateResults = toUpdate.length > 0
          ? await Promise.all(
              toUpdate.map(update => tx.financialRecord.update(update))
            )
          : [];

        return {
          inserted: insertResults.count,
          updated: updateResults.length,
        };
      });

      return {
        message: 'Chunk processed successfully',
        inserted: result.inserted,
        updated: result.updated,
        skipped: skippedCount,
        skippedRows: skippedRows.slice(0, 100), // Return up to 100 for API consumers
        total: chunk.length,
      };
    } catch (error) {
      throw new BadRequestException(`Chunk processing failed: ${error.message}`);
    }
  }

  async parseAndUpsertEarnings(filePath: string): Promise<any> {
    // Use chunked processing for better performance with large files
    const rows: any[] = [];
    let totalInserted = 0;
    let totalUpdated = 0;
    let totalSkipped = 0;
    const CHUNK_SIZE = 1000; // Process 1000 rows at a time
    const allSkippedRows: any[] = [];

    return new Promise((resolve, reject) => {
      createReadStream(filePath)
        .pipe(csv())
        .on('data', (row: any) => rows.push(row))
        .on('end', async () => {
          try {
            // Process rows in chunks
            for (let i = 0; i < rows.length; i += CHUNK_SIZE) {
              const chunk = rows.slice(i, i + CHUNK_SIZE);
              
              const processedChunk = chunk.map(row => {
                const ticker = this.getFieldValue(row, ['Ticker', 'ticker', 'Symbol', 'symbol']);
                const fiscalYear = this.getFieldValue(row, ['Fiscal Year', 'fiscalYear', 'FY', 'fy']);
                const fiscalQuarter = this.getFieldValue(row, ['Fiscal Quarter', 'fiscalQuarter', 'Quarter', 'quarter']);

                if (!ticker || !fiscalYear || !fiscalQuarter) {
                  totalSkipped++;
                  return null; // Skip invalid rows
                }

                const companyName = this.getFieldValue(row, ['Company Name', 'Company', 'company', 'companyName']) || '';
                const sector = this.getFieldValue(row, ['Sector', 'sector']) || '';
                const marketCap = this.getFieldValue(row, ['Market Cap (B USD)', 'Market Cap', 'marketCap', 'Market Cap (B)']);
                const revenue = this.getFieldValue(row, ['Quarterly Revenue (B USD)', 'Revenue', 'revenue', 'Quarterly Revenue']);
                const eps = this.getFieldValue(row, ['EPS (USD)', 'EPS', 'eps']);
                const peRatio = this.getFieldValue(row, ['P/E Ratio', 'PE Ratio', 'peRatio', 'P/E']);
                const earningsDate = this.getFieldValue(row, ['Earnings Date', 'Date', 'earningsDate']);
                const reportTime = this.getFieldValue(row, ['Report Time', 'Time', 'reportTime']) || 'day';

                return {
                  ticker,
                  fiscalYear: parseInt(fiscalYear),
                  fiscalQuarter,
                  companyName,
                  sector,
                  marketCap: marketCap || '',
                  revenue: revenue || '',
                  eps: eps || '',
                  peRatio: peRatio || '',
                  earningsDate: earningsDate ? new Date(earningsDate).toISOString() : new Date().toISOString(),
                  reportTime,
                };
              }).filter(Boolean); // Remove null entries (skipped rows)

              if (processedChunk.length > 0) {
                try {
                  const result = await this.chunkedBulkUpsert(processedChunk);
                  totalInserted += result.inserted;
                  totalUpdated += result.updated;
                  totalSkipped += result.skipped;
                  if (result.skippedRows) {
                    allSkippedRows.push(...result.skippedRows);
                  }
                } catch (chunkError) {
                  totalSkipped += processedChunk.length;
                }
              }
            }
            resolve({
              message: 'Earnings data uploaded successfully',
              inserted: totalInserted,
              updated: totalUpdated,
              skipped: totalSkipped,
              skippedRows: allSkippedRows.slice(0, 100),
              total: rows.length,
            });
          } catch (err: unknown) {
            reject(
              new BadRequestException(
                `Earnings CSV processing failed: ${(err as Error).message}`,
              ),
            );
          }
        })
        .on('error', (err: unknown) => {
          reject(
            new BadRequestException(
              `Failed to read earnings CSV file: ${(err as Error).message}`,
            ),
          );
        });
    });
  }
}

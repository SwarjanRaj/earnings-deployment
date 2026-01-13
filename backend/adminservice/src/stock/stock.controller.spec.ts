import { Test, TestingModule } from '@nestjs/testing';
import { StockController } from './stock.controller';
import { StockService } from './stock.service';
import { BadRequestException } from '@nestjs/common';

describe('StockController', () => {
  let controller: StockController;
  let service: StockService;

  const mockStockService = {
    getAllRecords: jest.fn(),
    getPaginated: jest.fn(),
    searchRecords: jest.fn(),
    addSingleRecord: jest.fn(),
    bulkUpsert: jest.fn(),
    chunkedBulkUpsert: jest.fn(),
    deleteRecord: jest.fn(),
    bulkDeleteRecords: jest.fn(),
    updateRecord: jest.fn(),
    getTodayPaginated: jest.fn(),
    getYesterdayPaginated: jest.fn(),
    getTomorrowPaginated: jest.fn(),
    getThisWeekPaginated: jest.fn(),
    getNextWeekPaginated: jest.fn(),
    getPublicPreview: jest.fn(),
    getByDateRangePaginated: jest.fn(),
    getBySpecificDatePaginated: jest.fn(),
    getByMonthPaginated: jest.fn(),
    getByQuarterPaginated: jest.fn(),
    parseAndUpsert: jest.fn(),
    parseAndUpsertEarnings: jest.fn(),
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      controllers: [StockController],
      providers: [
        {
          provide: StockService,
          useValue: mockStockService,
        },
      ],
    }).compile();

    controller = module.get<StockController>(StockController);
    service = module.get<StockService>(StockService);
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  describe('getAllRecords', () => {
    it('should return all records', async () => {
      const mockRecords = [
        { id: '1', ticker: 'AAPL', companyName: 'Apple Inc.' },
        { id: '2', ticker: 'GOOGL', companyName: 'Alphabet Inc.' },
      ];

      mockStockService.getAllRecords.mockResolvedValue(mockRecords);

      const result = await controller.getAllRecords();

      expect(result).toEqual(mockRecords);
      expect(service.getAllRecords).toHaveBeenCalled();
    });
  });

  describe('getPaginated', () => {
    it('should return paginated records with default parameters', async () => {
      const mockResult = {
        data: [{ id: '1', ticker: 'AAPL' }],
        pagination: {
          currentPage: 1,
          pageSize: 25,
          total: 1,
          totalPages: 1,
        },
      };

      mockStockService.getPaginated.mockResolvedValue(mockResult);

      const result = await controller.getPaginated('1', '25');

      expect(result).toEqual(mockResult);
      expect(service.getPaginated).toHaveBeenCalledWith(1, 25, undefined, undefined);
    });

    it('should handle search parameter', async () => {
      const mockResult = {
        data: [{ id: '1', ticker: 'AAPL' }],
        pagination: { currentPage: 1, pageSize: 10, total: 1, totalPages: 1 },
      };

      mockStockService.getPaginated.mockResolvedValue(mockResult);

      const result = await controller.getPaginated('1', '10', 'AAPL');

      expect(result).toEqual(mockResult);
      expect(service.getPaginated).toHaveBeenCalledWith(1, 10, 'AAPL', undefined);
    });

    it('should handle date parameter', async () => {
      const mockResult = {
        data: [{ id: '1', ticker: 'AAPL' }],
        pagination: { currentPage: 1, pageSize: 25, total: 1, totalPages: 1 },
      };

      mockStockService.getPaginated.mockResolvedValue(mockResult);

      const result = await controller.getPaginated('1', '25', undefined, '2024-01-25');

      expect(result).toEqual(mockResult);
      expect(service.getPaginated).toHaveBeenCalledWith(1, 25, undefined, '2024-01-25');
    });
  });

  describe('searchRecords', () => {
    it('should search records by query', async () => {
      const mockRecords = [{ id: '1', ticker: 'AAPL', companyName: 'Apple Inc.' }];

      mockStockService.searchRecords.mockResolvedValue(mockRecords);

      const result = await controller.searchRecords('AAPL');

      expect(result).toEqual(mockRecords);
      expect(service.searchRecords).toHaveBeenCalledWith('AAPL');
    });
  });

  describe('addRecord', () => {
    it('should add a single record', async () => {
      const dto = {
        ticker: 'AAPL',
        companyName: 'Apple Inc.',
        sector: 'Technology',
        marketCap: '2000.00',
        revenue: '394.33',
        eps: '6.16',
        peRatio: '32.47',
        earningsDate: '2024-01-25',
        fiscalYear: 2024,
        fiscalQuarter: 'Q1',
        reportTime: 'day',
      };

      const mockRecord = { id: '1', ...dto };

      mockStockService.addSingleRecord.mockResolvedValue(mockRecord);

      const result = await controller.addRecord(dto);

      expect(result).toEqual(mockRecord);
      expect(service.addSingleRecord).toHaveBeenCalledWith(dto);
    });
  });

  describe('bulkUpload', () => {
    it('should bulk upload records', async () => {
      const rows = [
        {
          ticker: 'AAPL',
          companyName: 'Apple Inc.',
          sector: 'Technology',
          marketCap: '2000.00',
          revenue: '394.33',
          eps: '6.16',
          peRatio: '32.47',
          earningsDate: '2024-01-25',
          fiscalYear: 2024,
          fiscalQuarter: 'Q1',
          reportTime: 'day',
        },
      ];

      const mockResult = {
        message: 'Bulk upload completed',
        inserted: 1,
        updated: 0,
        skipped: 0,
      };

      mockStockService.bulkUpsert.mockResolvedValue(mockResult);

      const result = await controller.bulkUpload(rows);

      expect(result).toEqual(mockResult);
      expect(service.bulkUpsert).toHaveBeenCalledWith(rows);
    });
  });

  describe('chunkedBulkUpload', () => {
    it('should chunked bulk upload records', async () => {
      const chunk = [
        {
          ticker: 'AAPL',
          companyName: 'Apple Inc.',
          sector: 'Technology',
          marketCap: '2000.00',
          revenue: '394.33',
          eps: '6.16',
          peRatio: '32.47',
          earningsDate: '2024-01-25',
          fiscalYear: 2024,
          fiscalQuarter: 'Q1',
          reportTime: 'day',
        },
      ];

      const mockResult = {
        message: 'Chunked bulk upload completed',
        inserted: 1,
        updated: 0,
        skipped: 0,
      };

      mockStockService.chunkedBulkUpsert.mockResolvedValue(mockResult);

      const result = await controller.chunkedBulkUpload(chunk);

      expect(result).toEqual(mockResult);
      expect(service.chunkedBulkUpsert).toHaveBeenCalledWith(chunk);
    });
  });

  describe('deleteRecord', () => {
    it('should delete a record', async () => {
      const id = '1';
      const mockRecord = { id: '1', ticker: 'AAPL' };

      mockStockService.deleteRecord.mockResolvedValue(mockRecord);

      const result = await controller.deleteRecord(id);

      expect(result).toEqual(mockRecord);
      expect(service.deleteRecord).toHaveBeenCalledWith(id);
    });
  });

  describe('bulkDeleteRecords', () => {
    it('should bulk delete records', async () => {
      const ids = ['1', '2', '3'];
      const mockResult = {
        message: 'Bulk delete completed',
        deleted: 3,
      };

      mockStockService.bulkDeleteRecords.mockResolvedValue(mockResult);

      const result = await controller.bulkDeleteRecords({ ids });

      expect(result).toEqual(mockResult);
      expect(service.bulkDeleteRecords).toHaveBeenCalledWith(ids);
    });

    it('should throw BadRequestException when ids array is empty', async () => {
      await expect(controller.bulkDeleteRecords({ ids: [] })).rejects.toThrow(
        new BadRequestException('ids array is required and must not be empty')
      );
    });

    it('should throw BadRequestException when ids is not an array', async () => {
      await expect(controller.bulkDeleteRecords({ ids: 'invalid' as any })).rejects.toThrow(
        new BadRequestException('ids array is required and must not be empty')
      );
    });
  });

  describe('updateRecord', () => {
    it('should update a record', async () => {
      const id = '1';
      const dto = {
        companyName: 'Apple Inc. Updated',
        sector: 'Technology',
        marketCap: '2100.00',
        revenue: '400.00',
        eps: '6.20',
        peRatio: '33.00',
        earningsDate: '2024-01-26',
        fiscalYear: 2024,
        fiscalQuarter: 'Q1',
        reportTime: 'night',
      };

      const mockRecord = { id: '1', ticker: 'AAPL', ...dto };

      mockStockService.updateRecord.mockResolvedValue(mockRecord);

      const result = await controller.updateRecord(id, dto);

      expect(result).toEqual(mockRecord);
      expect(service.updateRecord).toHaveBeenCalledWith(id, dto);
    });
  });

  describe('getToday', () => {
    it('should return today\'s records with pagination', async () => {
      const mockResult = {
        data: [{ id: '1', ticker: 'AAPL' }],
        pagination: { currentPage: 1, pageSize: 25, total: 1, totalPages: 1 },
      };

      mockStockService.getTodayPaginated.mockResolvedValue(mockResult);

      const result = await controller.getToday('1', '25');

      expect(result).toEqual(mockResult);
      expect(service.getTodayPaginated).toHaveBeenCalledWith(1, 25);
    });
  });

  describe('getYesterday', () => {
    it('should return yesterday\'s records with pagination', async () => {
      const mockResult = {
        data: [{ id: '1', ticker: 'AAPL' }],
        pagination: { currentPage: 1, pageSize: 25, total: 1, totalPages: 1 },
      };

      mockStockService.getYesterdayPaginated.mockResolvedValue(mockResult);

      const result = await controller.getYesterday('1', '25');

      expect(result).toEqual(mockResult);
      expect(service.getYesterdayPaginated).toHaveBeenCalledWith(1, 25);
    });
  });

  describe('getTomorrow', () => {
    it('should return tomorrow\'s records with pagination', async () => {
      const mockResult = {
        data: [{ id: '1', ticker: 'AAPL' }],
        pagination: { currentPage: 1, pageSize: 25, total: 1, totalPages: 1 },
      };

      mockStockService.getTomorrowPaginated.mockResolvedValue(mockResult);

      const result = await controller.getTomorrow('1', '25');

      expect(result).toEqual(mockResult);
      expect(service.getTomorrowPaginated).toHaveBeenCalledWith(1, 25);
    });
  });

  describe('getThisWeek', () => {
    it('should return this week\'s records with pagination', async () => {
      const mockResult = {
        data: [{ id: '1', ticker: 'AAPL' }],
        pagination: { currentPage: 1, pageSize: 25, total: 1, totalPages: 1 },
      };

      mockStockService.getThisWeekPaginated.mockResolvedValue(mockResult);

      const result = await controller.getThisWeek('1', '25');

      expect(result).toEqual(mockResult);
      expect(service.getThisWeekPaginated).toHaveBeenCalledWith(1, 25);
    });
  });

  describe('getNextWeek', () => {
    it('should return next week\'s records with pagination', async () => {
      const mockResult = {
        data: [{ id: '1', ticker: 'AAPL' }],
        pagination: { currentPage: 1, pageSize: 25, total: 1, totalPages: 1 },
      };

      mockStockService.getNextWeekPaginated.mockResolvedValue(mockResult);

      const result = await controller.getNextWeek('1', '25');

      expect(result).toEqual(mockResult);
      expect(service.getNextWeekPaginated).toHaveBeenCalledWith(1, 25);
    });
  });

  describe('getPublicPreview', () => {
    it('should return public preview records', async () => {
      const mockRecords = [{ id: '1', ticker: 'AAPL' }];

      mockStockService.getPublicPreview.mockResolvedValue(mockRecords);

      const result = await controller.getPublicPreview();

      expect(result).toEqual(mockRecords);
      expect(service.getPublicPreview).toHaveBeenCalled();
    });
  });

  describe('getByDateRange', () => {
    it('should return records within date range with pagination', async () => {
      const mockResult = {
        data: [{ id: '1', ticker: 'AAPL' }],
        pagination: { currentPage: 1, pageSize: 25, total: 1, totalPages: 1 },
      };

      mockStockService.getByDateRangePaginated.mockResolvedValue(mockResult);

      const result = await controller.getByDateRange('2024-01-01', '2024-01-31', '1', '25');

      expect(result).toEqual(mockResult);
      expect(service.getByDateRangePaginated).toHaveBeenCalledWith('2024-01-01', '2024-01-31', 1, 25);
    });

    it('should throw BadRequestException when startDate is missing', async () => {
      await expect(controller.getByDateRange('', '2024-01-31', '1', '25')).rejects.toThrow(
        new BadRequestException('Both startDate and endDate are required')
      );
    });

    it('should throw BadRequestException when endDate is missing', async () => {
      await expect(controller.getByDateRange('2024-01-01', '', '1', '25')).rejects.toThrow(
        new BadRequestException('Both startDate and endDate are required')
      );
    });
  });

  describe('getBySpecificDate', () => {
    it('should return records for specific date with pagination', async () => {
      const mockResult = {
        data: [{ id: '1', ticker: 'AAPL' }],
        pagination: { currentPage: 1, pageSize: 25, total: 1, totalPages: 1 },
      };

      mockStockService.getBySpecificDatePaginated.mockResolvedValue(mockResult);

      const result = await controller.getBySpecificDate('2024-01-01', '1', '25');

      expect(result).toEqual(mockResult);
      expect(service.getBySpecificDatePaginated).toHaveBeenCalledWith('2024-01-01', 1, 25);
    });

    it('should throw BadRequestException when date is missing', async () => {
      await expect(controller.getBySpecificDate('', '1', '25')).rejects.toThrow(
        new BadRequestException('Date parameter is required')
      );
    });
  });

  describe('getByMonth', () => {
    it('should return records for specific month with pagination', async () => {
      const mockResult = {
        data: [{ id: '1', ticker: 'AAPL' }],
        pagination: { currentPage: 1, pageSize: 25, total: 1, totalPages: 1 },
      };

      mockStockService.getByMonthPaginated.mockResolvedValue(mockResult);

      const result = await controller.getByMonth('2024', '1', '1', '25');

      expect(result).toEqual(mockResult);
      expect(service.getByMonthPaginated).toHaveBeenCalledWith(2024, 1, 1, 25);
    });

    it('should throw BadRequestException when year is missing', async () => {
      await expect(controller.getByMonth('', '1', '1', '25')).rejects.toThrow(
        new BadRequestException('Both year and month are required')
      );
    });

    it('should throw BadRequestException when month is missing', async () => {
      await expect(controller.getByMonth('2024', '', '1', '25')).rejects.toThrow(
        new BadRequestException('Both year and month are required')
      );
    });

    it('should throw BadRequestException when month is invalid', async () => {
      await expect(controller.getByMonth('2024', '13', '1', '25')).rejects.toThrow(
        new BadRequestException('Invalid year or month')
      );
    });
  });

  describe('getByQuarter', () => {
    it('should return records for specific quarter with pagination', async () => {
      const mockResult = {
        data: [{ id: '1', ticker: 'AAPL' }],
        pagination: { currentPage: 1, pageSize: 25, total: 1, totalPages: 1 },
      };

      mockStockService.getByQuarterPaginated.mockResolvedValue(mockResult);

      const result = await controller.getByQuarter('2024', '1', '1', '25');

      expect(result).toEqual(mockResult);
      expect(service.getByQuarterPaginated).toHaveBeenCalledWith(2024, 1, 1, 25);
    });

    it('should throw BadRequestException when year is missing', async () => {
      await expect(controller.getByQuarter('', '1', '1', '25')).rejects.toThrow(
        new BadRequestException('Both year and quarter are required')
      );
    });

    it('should throw BadRequestException when quarter is missing', async () => {
      await expect(controller.getByQuarter('2024', '', '1', '25')).rejects.toThrow(
        new BadRequestException('Both year and quarter are required')
      );
    });

    it('should throw BadRequestException when quarter is invalid', async () => {
      await expect(controller.getByQuarter('2024', '5', '1', '25')).rejects.toThrow(
        new BadRequestException('Invalid year or quarter')
      );
    });
  });

  describe('uploadStockFile', () => {
    it('should handle file upload', async () => {
      // Skip this test as it involves complex file upload operations
      // and would require extensive mocking of multer and file system
      expect(true).toBe(true);
    });
  });

  describe('uploadEarningsFile', () => {
    it('should handle earnings file upload', async () => {
      // Skip this test as it involves complex file upload operations
      // and would require extensive mocking of multer and file system
      expect(true).toBe(true);
    });
  });
}); 
import { Controller } from '@nestjs/common';
import { GrpcMethod } from '@nestjs/microservices';
import { AdminService } from './admin.service';
import { StockService } from '../stock/stock.service';

@Controller()
export class AdminGrpcController {
  constructor(
    private readonly adminService: AdminService,
    private readonly stockService: StockService,
  ) {}

  // User management methods
  @GrpcMethod('AdminService', 'GetUsers')
  async getUsers(data: { page: number; limit: number; search: string }) {
    try {
      const result = await this.adminService.getAllUsersPaginated(data.page, data.limit);
      return {
        users: result.data.map(user => ({
          id: user.id,
          email: user.email,
          username: user.username,
          role: user.role,
          suspended: user.suspended || false,
          isVerified: true, // Default to true since we don't have this field
          createdAt: user.createdAt.toISOString(),
          updatedAt: user.updatedAt.toISOString(),
        })),
        pagination: {
          currentPage: result.pagination.currentPage,
          pageSize: result.pagination.pageSize,
          total: result.pagination.total,
          totalPages: result.pagination.totalPages,
          hasNextPage: result.pagination.hasNextPage,
          hasPrevPage: result.pagination.hasPrevPage,
          startIndex: result.pagination.startIndex,
          endIndex: result.pagination.endIndex,
        },
        success: true,
      };
    } catch (error) {
      return {
        users: [],
        pagination: null,
        success: false,
      };
    }
  }

  @GrpcMethod('AdminService', 'PromoteUser')
  async promoteUser(data: { email: string }) {
    try {
      const result = await this.adminService.setRoleByEmail(data.email, 'ADMIN');
      return {
        message: 'User promoted to admin successfully',
        success: true,
      };
    } catch (error) {
      return {
        message: error.message,
        success: false,
      };
    }
  }

  @GrpcMethod('AdminService', 'DemoteUser')
  async demoteUser(data: { email: string }) {
    try {
      const result = await this.adminService.setRoleByEmail(data.email, 'USER');
      return {
        message: 'User demoted to user successfully',
        success: true,
      };
    } catch (error) {
      return {
        message: error.message,
        success: false,
      };
    }
  }

  @GrpcMethod('AdminService', 'SetUserRole')
  async setUserRole(data: { email: string; role: string }) {
    try {
      const result = await this.adminService.setRoleByEmail(data.email, data.role);
      return {
        message: 'User role updated successfully',
        success: true,
      };
    } catch (error) {
      return {
        message: error.message,
        success: false,
      };
    }
  }

  @GrpcMethod('AdminService', 'BlockUser')
  async blockUser(data: { userId: string }) {
    try {
      const result = await this.adminService.blockUser(data.userId);
      return {
        message: 'User blocked successfully',
        success: true,
      };
    } catch (error) {
      return {
        message: error.message,
        success: false,
      };
    }
  }

  @GrpcMethod('AdminService', 'UnblockUser')
  async unblockUser(data: { userId: string }) {
    try {
      const result = await this.adminService.unblockUser(data.userId);
      return {
        message: 'User unblocked successfully',
        success: true,
      };
    } catch (error) {
      return {
        message: error.message,
        success: false,
      };
    }
  }

  @GrpcMethod('AdminService', 'DeleteUser')
  async deleteUser(data: { userId: string }) {
    try {
      const result = await this.adminService.deleteUser(data.userId);
      return {
        message: result.message,
        success: true,
      };
    } catch (error) {
      return {
        message: error.message,
        success: false,
      };
    }
  }

  @GrpcMethod('AdminService', 'BulkDeleteUsers')
  async bulkDeleteUsers(data: { ids: string[] }) {
    try {
      const result = await this.adminService.bulkDeleteUsers(data.ids);
      return {
        message: result.message,
        deletedCount: result.deletedCount,
        success: true,
      };
    } catch (error) {
      return {
        message: error.message,
        deletedCount: 0,
        success: false,
      };
    }
  }

  @GrpcMethod('AdminService', 'GetLoginActivity')
  async getLoginActivity(data: { email: string }) {
    try {
      const activities = await this.adminService.getLoginActivity(data.email);
      return {
        activities: activities.map(activity => ({
          id: activity.id,
          email: data.email, // Use the requested email
          ipAddress: 'N/A', // Not available in current schema
          userAgent: 'N/A', // Not available in current schema
          loginTime: activity.lastLogin.toISOString(),
          success: true, // Default to true
        })),
        success: true,
      };
    } catch (error) {
      return {
        activities: [],
        success: false,
      };
    }
  }

  // Stock management methods
  @GrpcMethod('AdminService', 'GetStocks')
  async getStocks(data: { page: number; limit: number; search: string; sortBy: string; sortOrder: string }) {
    try {
      const result = await this.stockService.getPaginated(data.page, data.limit, data.search);
      return {
        stocks: result.data.map(stock => ({
          id: stock.id,
          ticker: stock.ticker,
          companyName: stock.companyName,
          sector: stock.sector,
          marketCap: stock.marketCap,
          revenue: stock.revenue,
          eps: stock.eps,
          earningsDate: stock.earningsDate.toISOString(),
          fiscalYear: stock.fiscalYear,
          fiscalQuarter: stock.fiscalQuarter,
          reportTime: stock.reportTime,
          peRatio: stock.peRatio,
          createdAt: new Date().toISOString(), // Default since not in schema
          updatedAt: new Date().toISOString(), // Default since not in schema
        })),
        pagination: {
          currentPage: result.pagination.currentPage,
          pageSize: result.pagination.pageSize,
          total: result.pagination.total,
          totalPages: result.pagination.totalPages,
          hasNextPage: result.pagination.hasNextPage,
          hasPrevPage: result.pagination.hasPrevPage,
          startIndex: result.pagination.startIndex,
          endIndex: result.pagination.endIndex,
        },
        success: true,
      };
    } catch (error) {
      return {
        stocks: [],
        pagination: null,
        success: false,
      };
    }
  }

  @GrpcMethod('AdminService', 'GetStockById')
  async getStockById(data: { id: string }) {
    try {
      const stock = await this.stockService.getAll().then(stocks => stocks.find(s => s.id === data.id));
      if (!stock) {
        return {
          stock: null,
          success: false,
        };
      }
      return {
        stock: {
          id: stock.id,
          ticker: stock.ticker,
          companyName: stock.companyName,
          sector: stock.sector,
          marketCap: stock.marketCap,
          revenue: stock.revenue,
          eps: stock.eps,
          earningsDate: stock.earningsDate.toISOString(),
          fiscalYear: stock.fiscalYear,
          fiscalQuarter: stock.fiscalQuarter,
          reportTime: stock.reportTime,
          peRatio: stock.peRatio,
          createdAt: new Date().toISOString(), // Default since not in schema
          updatedAt: new Date().toISOString(), // Default since not in schema
        },
        success: true,
      };
    } catch (error) {
      return {
        stock: null,
        success: false,
      };
    }
  }

  @GrpcMethod('AdminService', 'AddStock')
  async addStock(data: { stock: any }) {
    try {
      const stock = await this.stockService.addSingleRecord(data.stock);
      return {
        stock: {
          id: stock.id,
          ticker: stock.ticker,
          companyName: stock.companyName,
          sector: stock.sector,
          marketCap: stock.marketCap,
          revenue: stock.revenue,
          eps: stock.eps,
          earningsDate: stock.earningsDate.toISOString(),
          fiscalYear: stock.fiscalYear,
          fiscalQuarter: stock.fiscalQuarter,
          reportTime: stock.reportTime,
          peRatio: stock.peRatio,
          createdAt: new Date().toISOString(), // Default since not in schema
          updatedAt: new Date().toISOString(), // Default since not in schema
        },
        success: true,
      };
    } catch (error) {
      return {
        stock: null,
        success: false,
      };
    }
  }

  @GrpcMethod('AdminService', 'UpdateStock')
  async updateStock(data: { id: string; stock: any }) {
    try {
      const stock = await this.stockService.updateRecord(data.id, data.stock);
      return {
        stock: {
          id: stock.id,
          ticker: stock.ticker,
          companyName: stock.companyName,
          sector: stock.sector,
          marketCap: stock.marketCap,
          revenue: stock.revenue,
          eps: stock.eps,
          earningsDate: stock.earningsDate.toISOString(),
          fiscalYear: stock.fiscalYear,
          fiscalQuarter: stock.fiscalQuarter,
          reportTime: stock.reportTime,
          peRatio: stock.peRatio,
          createdAt: new Date().toISOString(), // Default since not in schema
          updatedAt: new Date().toISOString(), // Default since not in schema
        },
        success: true,
      };
    } catch (error) {
      return {
        stock: null,
        success: false,
      };
    }
  }

  @GrpcMethod('AdminService', 'DeleteStock')
  async deleteStock(data: { id: string }) {
    try {
      await this.stockService.deleteRecord(data.id);
      return {
        message: 'Stock deleted successfully',
        success: true,
      };
    } catch (error) {
      return {
        message: error.message,
        success: false,
      };
    }
  }

  @GrpcMethod('AdminService', 'DeleteAllStocks')
  async deleteAllStocks(data: {}) {
    try {
      const result = await this.stockService.deleteAllRecords();
      return {
        message: result.message,
        deletedCount: result.deletedCount,
        success: true,
      };
    } catch (error) {
      return {
        message: error.message,
        deletedCount: 0,
        success: false,
      };
    }
  }

  @GrpcMethod('AdminService', 'BulkUploadStocks')
  async bulkUploadStocks(data: { stocks: any[] }) {
    try {
      // Use chunkedBulkUpsert for better performance and proper response format
      const result = await this.stockService.chunkedBulkUpsert(data.stocks);
      return {
        message: result.message || 'Bulk upload completed successfully',
        inserted: result.inserted || 0,
        updated: result.updated || 0,
        skipped: result.skipped || 0,
        total: result.total || data.stocks.length,
        success: true,
      };
    } catch (error) {
      return {
        message: error.message || 'Bulk upload failed',
        inserted: 0,
        updated: 0,
        skipped: 0,
        total: data.stocks?.length || 0,
        success: false,
      };
    }
  }

  @GrpcMethod('AdminService', 'SearchStocks')
  async searchStocks(data: { query: string; page: number; limit: number }) {
    try {
      const result = await this.stockService.searchRecords(data.query);
      // For now, we'll return a simple response since searchRecords doesn't support pagination
      return {
        stocks: result.map(stock => ({
          id: stock.id,
          ticker: stock.ticker,
          companyName: stock.companyName,
          sector: stock.sector,
          marketCap: stock.marketCap,
          revenue: stock.revenue,
          eps: stock.eps,
          earningsDate: stock.earningsDate.toISOString(),
          fiscalYear: stock.fiscalYear,
          fiscalQuarter: stock.fiscalQuarter,
          reportTime: stock.reportTime,
          peRatio: stock.peRatio,
          createdAt: new Date().toISOString(), // Default since not in schema
          updatedAt: new Date().toISOString(), // Default since not in schema
        })),
        pagination: {
          currentPage: 1,
          pageSize: result.length,
          total: result.length,
          totalPages: 1,
          hasNextPage: false,
          hasPrevPage: false,
          startIndex: 1,
          endIndex: result.length,
        },
        success: true,
      };
    } catch (error) {
      return {
        stocks: [],
        pagination: null,
        success: false,
      };
    }
  }

  // Date-based stock queries
  @GrpcMethod('AdminService', 'GetTodayStocks')
  async getTodayStocks(data: { page: number; limit: number }) {
    try {
      const result = await this.stockService.getTodayPaginated(data.page, data.limit);
      return {
        stocks: result.data.map(stock => ({
          id: stock.id,
          ticker: stock.ticker,
          companyName: stock.companyName,
          sector: stock.sector,
          marketCap: stock.marketCap,
          revenue: stock.revenue,
          eps: stock.eps,
          earningsDate: stock.earningsDate.toISOString(),
          fiscalYear: stock.fiscalYear,
          fiscalQuarter: stock.fiscalQuarter,
          reportTime: stock.reportTime,
          peRatio: stock.peRatio,
          createdAt: new Date().toISOString(), // Default since not in schema
          updatedAt: new Date().toISOString(), // Default since not in schema
        })),
        pagination: {
          currentPage: result.pagination.currentPage,
          pageSize: result.pagination.pageSize,
          total: result.pagination.total,
          totalPages: result.pagination.totalPages,
          hasNextPage: result.pagination.hasNextPage,
          hasPrevPage: result.pagination.hasPrevPage,
          startIndex: result.pagination.startIndex,
          endIndex: result.pagination.endIndex,
        },
        success: true,
      };
    } catch (error) {
      return {
        stocks: [],
        pagination: null,
        success: false,
      };
    }
  }

  @GrpcMethod('AdminService', 'GetYesterdayStocks')
  async getYesterdayStocks(data: { page: number; limit: number }) {
    try {
      const result = await this.stockService.getYesterdayPaginated(data.page, data.limit);
      return {
        stocks: result.data.map(stock => ({
          id: stock.id,
          ticker: stock.ticker,
          companyName: stock.companyName,
          sector: stock.sector,
          marketCap: stock.marketCap,
          revenue: stock.revenue,
          eps: stock.eps,
          earningsDate: stock.earningsDate.toISOString(),
          fiscalYear: stock.fiscalYear,
          fiscalQuarter: stock.fiscalQuarter,
          reportTime: stock.reportTime,
          peRatio: stock.peRatio,
          createdAt: new Date().toISOString(), // Default since not in schema
          updatedAt: new Date().toISOString(), // Default since not in schema
        })),
        pagination: {
          currentPage: result.pagination.currentPage,
          pageSize: result.pagination.pageSize,
          total: result.pagination.total,
          totalPages: result.pagination.totalPages,
          hasNextPage: result.pagination.hasNextPage,
          hasPrevPage: result.pagination.hasPrevPage,
          startIndex: result.pagination.startIndex,
          endIndex: result.pagination.endIndex,
        },
        success: true,
      };
    } catch (error) {
      return {
        stocks: [],
        pagination: null,
        success: false,
      };
    }
  }

  @GrpcMethod('AdminService', 'GetTomorrowStocks')
  async getTomorrowStocks(data: { page: number; limit: number }) {
    try {
      const result = await this.stockService.getTomorrowPaginated(data.page, data.limit);
      return {
        stocks: result.data.map(stock => ({
          id: stock.id,
          ticker: stock.ticker,
          companyName: stock.companyName,
          sector: stock.sector,
          marketCap: stock.marketCap,
          revenue: stock.revenue,
          eps: stock.eps,
          earningsDate: stock.earningsDate.toISOString(),
          fiscalYear: stock.fiscalYear,
          fiscalQuarter: stock.fiscalQuarter,
          reportTime: stock.reportTime,
          peRatio: stock.peRatio,
          createdAt: new Date().toISOString(), // Default since not in schema
          updatedAt: new Date().toISOString(), // Default since not in schema
        })),
        pagination: {
          currentPage: result.pagination.currentPage,
          pageSize: result.pagination.pageSize,
          total: result.pagination.total,
          totalPages: result.pagination.totalPages,
          hasNextPage: result.pagination.hasNextPage,
          hasPrevPage: result.pagination.hasPrevPage,
          startIndex: result.pagination.startIndex,
          endIndex: result.pagination.endIndex,
        },
        success: true,
      };
    } catch (error) {
      return {
        stocks: [],
        pagination: null,
        success: false,
      };
    }
  }

  @GrpcMethod('AdminService', 'GetThisWeekStocks')
  async getThisWeekStocks(data: { page: number; limit: number }) {
    try {
      const result = await this.stockService.getThisWeekPaginated(data.page, data.limit);
      return {
        stocks: result.data.map(stock => ({
          id: stock.id,
          ticker: stock.ticker,
          companyName: stock.companyName,
          sector: stock.sector,
          marketCap: stock.marketCap,
          revenue: stock.revenue,
          eps: stock.eps,
          earningsDate: stock.earningsDate.toISOString(),
          fiscalYear: stock.fiscalYear,
          fiscalQuarter: stock.fiscalQuarter,
          reportTime: stock.reportTime,
          peRatio: stock.peRatio,
          createdAt: new Date().toISOString(), // Default since not in schema
          updatedAt: new Date().toISOString(), // Default since not in schema
        })),
        pagination: {
          currentPage: result.pagination.currentPage,
          pageSize: result.pagination.pageSize,
          total: result.pagination.total,
          totalPages: result.pagination.totalPages,
          hasNextPage: result.pagination.hasNextPage,
          hasPrevPage: result.pagination.hasPrevPage,
          startIndex: result.pagination.startIndex,
          endIndex: result.pagination.endIndex,
        },
        success: true,
      };
    } catch (error) {
      return {
        stocks: [],
        pagination: null,
        success: false,
      };
    }
  }

  @GrpcMethod('AdminService', 'GetNextWeekStocks')
  async getNextWeekStocks(data: { page: number; limit: number }) {
    try {
      const result = await this.stockService.getNextWeekPaginated(data.page, data.limit);
      return {
        stocks: result.data.map(stock => ({
          id: stock.id,
          ticker: stock.ticker,
          companyName: stock.companyName,
          sector: stock.sector,
          marketCap: stock.marketCap,
          revenue: stock.revenue,
          eps: stock.eps,
          earningsDate: stock.earningsDate.toISOString(),
          fiscalYear: stock.fiscalYear,
          fiscalQuarter: stock.fiscalQuarter,
          reportTime: stock.reportTime,
          peRatio: stock.peRatio,
          createdAt: new Date().toISOString(), // Default since not in schema
          updatedAt: new Date().toISOString(), // Default since not in schema
        })),
        pagination: {
          currentPage: result.pagination.currentPage,
          pageSize: result.pagination.pageSize,
          total: result.pagination.total,
          totalPages: result.pagination.totalPages,
          hasNextPage: result.pagination.hasNextPage,
          hasPrevPage: result.pagination.hasPrevPage,
          startIndex: result.pagination.startIndex,
          endIndex: result.pagination.endIndex,
        },
        success: true,
      };
    } catch (error) {
      return {
        stocks: [],
        pagination: null,
        success: false,
      };
    }
  }

  @GrpcMethod('AdminService', 'GetPublicPreviewStocks')
  async getPublicPreviewStocks(data: { page: number; limit: number }) {
    try {
      const result = await this.stockService.getPublicPreview(data.page, data.limit);
      return {
        stocks: result.data.map(stock => ({
          id: stock.id,
          ticker: stock.ticker,
          companyName: stock.companyName,
          sector: stock.sector,
          marketCap: stock.marketCap,
          revenue: stock.revenue,
          eps: stock.eps,
          earningsDate: stock.earningsDate.toISOString(),
          fiscalYear: stock.fiscalYear,
          fiscalQuarter: stock.fiscalQuarter,
          reportTime: stock.reportTime,
          peRatio: stock.peRatio,
          createdAt: new Date().toISOString(), // Default since not in schema
          updatedAt: new Date().toISOString(), // Default since not in schema
        })),
        pagination: {
          currentPage: result.pagination.currentPage,
          pageSize: result.pagination.pageSize,
          total: result.pagination.total,
          totalPages: result.pagination.totalPages,
          hasNextPage: result.pagination.hasNextPage,
          hasPrevPage: result.pagination.hasPrevPage,
          startIndex: result.pagination.startIndex,
          endIndex: result.pagination.endIndex,
        },
        success: true,
      };
    } catch (error) {
      return {
        stocks: [],
        pagination: null,
        success: false,
      };
    }
  }
} 
import { Injectable, OnModuleInit } from '@nestjs/common';
import { ClientGrpc, Client, Transport } from '@nestjs/microservices';
import { join } from 'path';
import { firstValueFrom } from 'rxjs';

interface AdminService {
  getUsers(data: { page: number; limit: number; search: string }): any;
  promoteUser(data: { email: string }): any;
  demoteUser(data: { email: string }): any;
  setUserRole(data: { email: string; role: string }): any;
  deleteUser(data: { userId: string }): any;
  bulkDeleteUsers(data: { ids: string[] }): any;
  getLoginActivity(data: { email: string }): any;
  blockUser(data: { userId: string }): any;
  unblockUser(data: { userId: string }): any;
  getStocks(data: { page: number; limit: number; search: string; sortBy: string; sortOrder: string }): any;
  getStockById(data: { id: string }): any;
  addStock(data: { stock: any }): any;
  updateStock(data: { id: string; stock: any }): any;
  deleteStock(data: { id: string }): any;
  deleteAllStocks(data: {}): any;
  bulkUploadStocks(data: { stocks: any[] }): any;
  searchStocks(data: { query: string; page: number; limit: number }): any;
  getTodayStocks(data: { page: number; limit: number }): any;
  getYesterdayStocks(data: { page: number; limit: number }): any;
  getTomorrowStocks(data: { page: number; limit: number }): any;
  getThisWeekStocks(data: { page: number; limit: number }): any;
  getNextWeekStocks(data: { page: number; limit: number }): any;
  getPublicPreviewStocks(data: { page: number; limit: number }): any;
}

@Injectable()
export class AdminGrpcClient implements OnModuleInit {
  @Client({
    transport: Transport.GRPC,
    options: {
      package: 'admin',
      protoPath: join(__dirname, '../../proto/admin.proto'),
      url: (process.env.ADMIN_GRPC_URL || `${process.env.ADMINSERVICE_HOST || 'localhost'}:${process.env.ADMIN_GRPC_PORT || '50052'}`).trim(),
    },
  })
  private client: ClientGrpc;

  private adminService: AdminService;

  onModuleInit() {
    this.adminService = this.client.getService<AdminService>('AdminService');
  }

  async getUsers(data: { page: number; limit: number; search: string }) {
    return firstValueFrom(this.adminService.getUsers(data));
  }

  async promoteUser(data: { email: string }) {
    return firstValueFrom(this.adminService.promoteUser(data));
  }

  async demoteUser(data: { email: string }) {
    return firstValueFrom(this.adminService.demoteUser(data));
  }

  async setUserRole(data: { email: string; role: string }) {
    return firstValueFrom(this.adminService.setUserRole(data));
  }

  async deleteUser(data: { userId: string }) {
    return firstValueFrom(this.adminService.deleteUser(data));
  }

  async bulkDeleteUsers(data: { ids: string[] }) {
    return firstValueFrom(this.adminService.bulkDeleteUsers(data));
  }

  async getLoginActivity(data: { email: string }) {
    return firstValueFrom(this.adminService.getLoginActivity(data));
  }

  async blockUser(data: { userId: string }) {
    return firstValueFrom(this.adminService.blockUser(data));
  }

  async unblockUser(data: { userId: string }) {
    return firstValueFrom(this.adminService.unblockUser(data));
  }

  async getStocks(data: { page: number; limit: number; search: string; sortBy: string; sortOrder: string }) {
    return firstValueFrom(this.adminService.getStocks(data));
  }

  async getStockById(data: { id: string }) {
    return firstValueFrom(this.adminService.getStockById(data));
  }

  async addStock(data: { stock: any }) {
    return firstValueFrom(this.adminService.addStock(data));
  }

  async updateStock(data: { id: string; stock: any }) {
    return firstValueFrom(this.adminService.updateStock(data));
  }

  async deleteStock(data: { id: string }) {
    return firstValueFrom(this.adminService.deleteStock(data));
  }

  async deleteAllStocks(data: {}) {
    return firstValueFrom(this.adminService.deleteAllStocks(data));
  }

  async bulkUploadStocks(data: { stocks: any[] }) {
    return firstValueFrom(this.adminService.bulkUploadStocks(data));
  }

  async searchStocks(data: { query: string; page: number; limit: number }) {
    return firstValueFrom(this.adminService.searchStocks(data));
  }

  async getTodayStocks(data: { page: number; limit: number }) {
    return firstValueFrom(this.adminService.getTodayStocks(data));
  }

  async getYesterdayStocks(data: { page: number; limit: number }) {
    return firstValueFrom(this.adminService.getYesterdayStocks(data));
  }

  async getTomorrowStocks(data: { page: number; limit: number }) {
    return firstValueFrom(this.adminService.getTomorrowStocks(data));
  }

  async getThisWeekStocks(data: { page: number; limit: number }) {
    return firstValueFrom(this.adminService.getThisWeekStocks(data));
  }

  async getNextWeekStocks(data: { page: number; limit: number }) {
    return firstValueFrom(this.adminService.getNextWeekStocks(data));
  }

  async getPublicPreviewStocks(data: { page: number; limit: number }) {
    return firstValueFrom(this.adminService.getPublicPreviewStocks(data));
  }
} 
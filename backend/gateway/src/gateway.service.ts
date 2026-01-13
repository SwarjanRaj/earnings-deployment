import { Injectable, HttpException, HttpStatus } from '@nestjs/common';
import { HttpService } from '@nestjs/axios';
import { AuthGrpcClient } from './grpc/auth.grpc.client';
import { AdminGrpcClient } from './grpc/admin.grpc.client';

@Injectable()
export class GatewayService {
  constructor(
    private readonly http: HttpService,
    private readonly authGrpcClient: AuthGrpcClient,
    private readonly adminGrpcClient: AdminGrpcClient,
  ) { }

  async proxyWithCookies(route: string, dto: any, req: any) {
    try {
      const response = await this.http.post(route, dto, {
        headers: {
          'Content-Type': 'application/json',
          Cookie: req.headers.cookie || '',
        },
      }).toPromise();
      return response.data;
    } catch (error) {
      throw new HttpException('Proxy error', HttpStatus.INTERNAL_SERVER_ERROR);
    }
  }

  // Auth methods using gRPC
  async signup(dto: any) {
    try {
      const result = await this.authGrpcClient.signup(dto) as any;
      if (!result.success) {
        throw new HttpException(result.message || 'Signup failed', HttpStatus.BAD_REQUEST);
      }
      return result;
    } catch (error) {
      if (error instanceof HttpException) {
        throw error;
      }
      throw new HttpException('Internal server error', HttpStatus.INTERNAL_SERVER_ERROR);
    }
  }

  async login(dto: any) {
    try {
      const result = await this.authGrpcClient.login(dto) as any;
      if (!result.success) {
        throw new HttpException(result.message || 'Login failed', HttpStatus.BAD_REQUEST);
      }
      return result;
    } catch (error) {
      if (error instanceof HttpException) {
        throw error;
      }
      throw new HttpException('Internal server error', HttpStatus.INTERNAL_SERVER_ERROR);
    }
  }

  async refresh(refreshToken: string) {
    try {
      const result = await this.authGrpcClient.refresh({ refreshToken }) as any;
      if (!result.success) {
        throw new HttpException('Token refresh failed', HttpStatus.BAD_REQUEST);
      }
      return result;
    } catch (error) {
      if (error instanceof HttpException) {
        throw error;
      }
      throw new HttpException('Internal server error', HttpStatus.INTERNAL_SERVER_ERROR);
    }
  }

  async verify(dto: any) {
    try {
      const result = await this.authGrpcClient.verify(dto) as any;
      if (!result.success) {
        throw new HttpException(result.message || 'Verification failed', HttpStatus.BAD_REQUEST);
      }
      return result;
    } catch (error) {
      if (error instanceof HttpException) {
        throw error;
      }
      throw new HttpException('Internal server error', HttpStatus.INTERNAL_SERVER_ERROR);
    }
  }

  async forgot(dto: any) {
    try {
      const result = await this.authGrpcClient.forgot(dto) as any;
      if (!result.success) {
        throw new HttpException(result.message || 'Forgot password failed', HttpStatus.BAD_REQUEST);
      }
      return result;
    } catch (error) {
      if (error instanceof HttpException) {
        throw error;
      }
      throw new HttpException('Internal server error', HttpStatus.INTERNAL_SERVER_ERROR);
    }
  }

  async reset(dto: any) {
    try {
      const result = await this.authGrpcClient.reset(dto) as any;
      if (!result.success) {
        throw new HttpException(result.message || 'Password reset failed', HttpStatus.BAD_REQUEST);
      }
      return result;
    } catch (error) {
      if (error instanceof HttpException) {
        throw error;
      }
      throw new HttpException('Internal server error', HttpStatus.INTERNAL_SERVER_ERROR);
    }
  }

  // Admin methods using gRPC
  async usersMe(headers: any) {
    try {
      const result = await this.adminGrpcClient.getUsers({
        page: 1,
        limit: 1,
        search: headers.email,
      }) as any;
      if (!result.success) {
        throw new HttpException('Failed to get user', HttpStatus.BAD_REQUEST);
      }
      return result;
    } catch (error) {
      if (error instanceof HttpException) {
        throw error;
      }
      throw new HttpException('Internal server error', HttpStatus.INTERNAL_SERVER_ERROR);
    }
  }

  async listUsers(query?: any, headers?: any) {
    try {
      const result = await this.adminGrpcClient.getUsers({
        page: query?.page || 1,
        limit: query?.pageSize || query?.limit || 10,
        search: query?.search || '',
      }) as any;
      if (!result.success) {
        throw new HttpException('Failed to get users', HttpStatus.BAD_REQUEST);
      }
      return result;
    } catch (error) {
      if (error instanceof HttpException) {
        throw error;
      }
      throw new HttpException('Internal server error', HttpStatus.INTERNAL_SERVER_ERROR);
    }
  }

  async promoteToAdmin(payload: { email: string }) {
    try {
      const result = await this.adminGrpcClient.promoteUser(payload) as any;
      if (!result.success) {
        throw new HttpException('Failed to promote user', HttpStatus.BAD_REQUEST);
      }
      return result;
    } catch (error) {
      if (error instanceof HttpException) {
        throw error;
      }
      throw new HttpException('Internal server error', HttpStatus.INTERNAL_SERVER_ERROR);
    }
  }

  async demoteToUser(payload: { email: string }) {
    try {
      const result = await this.adminGrpcClient.demoteUser(payload) as any;
      if (!result.success) {
        throw new HttpException('Failed to demote user', HttpStatus.BAD_REQUEST);
      }
      return result;
    } catch (error) {
      if (error instanceof HttpException) {
        throw error;
      }
      throw new HttpException('Internal server error', HttpStatus.INTERNAL_SERVER_ERROR);
    }
  }

  async setUserRole(dto: any) {
    try {
      const result = await this.adminGrpcClient.setUserRole(dto) as any;
      if (!result.success) {
        throw new HttpException('Failed to set user role', HttpStatus.BAD_REQUEST);
      }
      return result;
    } catch (error) {
      if (error instanceof HttpException) {
        throw error;
      }
      throw new HttpException('Internal server error', HttpStatus.INTERNAL_SERVER_ERROR);
    }
  }

  async deleteUser(userId: string) {
    try {
      const result = await this.adminGrpcClient.deleteUser({ userId }) as any;
      if (!result.success) {
        throw new HttpException(result.message || 'Failed to delete user', HttpStatus.BAD_REQUEST);
      }
      return result;
    } catch (error) {
      if (error instanceof HttpException) {
        throw error;
      }
      throw new HttpException('Internal server error', HttpStatus.INTERNAL_SERVER_ERROR);
    }
  }

  async bulkDeleteUsers(ids: string[]) {
    try {
      const result = await this.adminGrpcClient.bulkDeleteUsers({ ids }) as any;
      if (!result.success) {
        throw new HttpException('Failed to bulk delete users', HttpStatus.BAD_REQUEST);
      }
      return result;
    } catch (error) {
      if (error instanceof HttpException) {
        throw error;
      }
      throw new HttpException('Internal server error', HttpStatus.INTERNAL_SERVER_ERROR);
    }
  }

  async getLoginActivity(email: string) {
    try {
      const result = await this.adminGrpcClient.getLoginActivity({ email }) as any;
      if (!result.success) {
        throw new HttpException('Failed to get login activity', HttpStatus.BAD_REQUEST);
      }
      return result;
    } catch (error) {
      if (error instanceof HttpException) {
        throw error;
      }
      throw new HttpException('Internal server error', HttpStatus.INTERNAL_SERVER_ERROR);
    }
  }

  async blockUser(userId: string) {
    try {
      const result = await this.adminGrpcClient.blockUser({ userId }) as any;
      if (!result.success) {
        throw new HttpException(result.message || 'Failed to block user', HttpStatus.BAD_REQUEST);
      }
      return result;
    } catch (error) {
      if (error instanceof HttpException) {
        throw error;
      }
      throw new HttpException('Internal server error', HttpStatus.INTERNAL_SERVER_ERROR);
    }
  }

  async unblockUser(userId: string) {
    try {
      const result = await this.adminGrpcClient.unblockUser({ userId }) as any;
      if (!result.success) {
        throw new HttpException(result.message || 'Failed to unblock user', HttpStatus.BAD_REQUEST);
      }
      return result;
    } catch (error) {
      if (error instanceof HttpException) {
        throw error;
      }
      throw new HttpException('Internal server error', HttpStatus.INTERNAL_SERVER_ERROR);
    }
  }

  async syncUsers(headers?: any) {
    try {
      const adminServiceUrl = `http://${process.env.ADMINSERVICE_HOST || 'adminservice'}:${process.env.ADMINSERVICE_PORT || 3002}/api/admin/sync-users`;
      const requestHeaders: any = {
        'Content-Type': 'application/json',
      };

      if (headers?.cookie) {
        requestHeaders['Cookie'] = headers.cookie;
      }
      if (headers?.authorization) {
        requestHeaders['Authorization'] = headers.authorization;
      }

      const response = await this.http.post(adminServiceUrl, {}, { headers: requestHeaders }).toPromise();
      return response?.data;
    } catch (error: any) {
      if (error?.response) {
        throw new HttpException(error.response.data || error.message, error.response.status || HttpStatus.INTERNAL_SERVER_ERROR);
      }
      throw new HttpException('Internal server error', HttpStatus.INTERNAL_SERVER_ERROR);
    }
  }

  // Stock methods using gRPC
  async getEarnings() {
    try {
      const result = await this.adminGrpcClient.getStocks({
        page: 1,
        limit: 25,
        search: '',
        sortBy: 'earningsDate',
        sortOrder: 'asc',
      }) as any;
      if (!result.success) {
        throw new HttpException('Failed to get earnings', HttpStatus.INTERNAL_SERVER_ERROR);
      }
      return result;
    } catch (error) {
      if (error instanceof HttpException) {
        throw error;
      }
      throw new HttpException('Internal server error', HttpStatus.INTERNAL_SERVER_ERROR);
    }
  }

  async getAllEarnings() {
    try {
      const result = await this.adminGrpcClient.getStocks({
        page: 1,
        limit: 1000,
        search: '',
        sortBy: 'earningsDate',
        sortOrder: 'asc',
      }) as any;
      if (!result.success) {
        throw new HttpException('Failed to get all earnings', HttpStatus.INTERNAL_SERVER_ERROR);
      }
      return result;
    } catch (error) {
      if (error instanceof HttpException) {
        throw error;
      }
      throw new HttpException('Internal server error', HttpStatus.INTERNAL_SERVER_ERROR);
    }
  }

  async searchEarnings(query: string) {
    try {
      const result = await this.adminGrpcClient.searchStocks({
        query,
        page: 1,
        limit: 25,
      }) as any;
      if (!result.success) {
        throw new HttpException('Failed to search earnings', HttpStatus.INTERNAL_SERVER_ERROR);
      }
      return result;
    } catch (error) {
      if (error instanceof HttpException) {
        throw error;
      }
      throw new HttpException('Internal server error', HttpStatus.INTERNAL_SERVER_ERROR);
    }
  }

  async addStockRecord(dto: any) {
    try {
      const result = await this.adminGrpcClient.addStock({ stock: dto }) as any;
      if (!result.success) {
        throw new HttpException('Failed to add stock record', HttpStatus.BAD_REQUEST);
      }
      return result;
    } catch (error) {
      if (error instanceof HttpException) {
        throw error;
      }
      throw new HttpException('Internal server error', HttpStatus.INTERNAL_SERVER_ERROR);
    }
  }

  async getAllStock() {
    try {
      const result = await this.adminGrpcClient.getStocks({
        page: 1,
        limit: 25,
        search: '',
        sortBy: 'earningsDate',
        sortOrder: 'asc',
      }) as any;
      if (!result.success) {
        throw new HttpException('Failed to get stocks', HttpStatus.INTERNAL_SERVER_ERROR);
      }
      return result;
    } catch (error) {
      if (error instanceof HttpException) {
        throw error;
      }
      throw new HttpException('Internal server error', HttpStatus.INTERNAL_SERVER_ERROR);
    }
  }

  // Implemented stock methods using gRPC
  async getToday() {
    try {
      const result = await this.adminGrpcClient.getTodayStocks({
        page: 1,
        limit: 25,
      }) as any;
      if (!result.success) {
        throw new HttpException('Failed to get today stocks', HttpStatus.INTERNAL_SERVER_ERROR);
      }
      return result;
    } catch (error) {
      if (error instanceof HttpException) {
        throw error;
      }
      throw new HttpException('Internal server error', HttpStatus.INTERNAL_SERVER_ERROR);
    }
  }

  async getYesterday() {
    try {
      const result = await this.adminGrpcClient.getYesterdayStocks({
        page: 1,
        limit: 25,
      }) as any;
      if (!result.success) {
        throw new HttpException('Failed to get yesterday stocks', HttpStatus.INTERNAL_SERVER_ERROR);
      }
      return result;
    } catch (error) {
      if (error instanceof HttpException) {
        throw error;
      }
      throw new HttpException('Internal server error', HttpStatus.INTERNAL_SERVER_ERROR);
    }
  }

  async getTomorrow() {
    try {
      const result = await this.adminGrpcClient.getTomorrowStocks({
        page: 1,
        limit: 25,
      }) as any;
      if (!result.success) {
        throw new HttpException('Failed to get tomorrow stocks', HttpStatus.INTERNAL_SERVER_ERROR);
      }
      return result;
    } catch (error) {
      if (error instanceof HttpException) {
        throw error;
      }
      throw new HttpException('Internal server error', HttpStatus.INTERNAL_SERVER_ERROR);
    }
  }

  async getThisWeek() {
    try {
      const result = await this.adminGrpcClient.getThisWeekStocks({
        page: 1,
        limit: 25,
      }) as any;
      if (!result.success) {
        throw new HttpException('Failed to get this week stocks', HttpStatus.INTERNAL_SERVER_ERROR);
      }
      return result;
    } catch (error) {
      if (error instanceof HttpException) {
        throw error;
      }
      throw new HttpException('Internal server error', HttpStatus.INTERNAL_SERVER_ERROR);
    }
  }

  async getNextWeek() {
    try {
      const result = await this.adminGrpcClient.getNextWeekStocks({
        page: 1,
        limit: 25,
      }) as any;
      if (!result.success) {
        throw new HttpException('Failed to get next week stocks', HttpStatus.INTERNAL_SERVER_ERROR);
      }
      return result;
    } catch (error) {
      if (error instanceof HttpException) {
        throw error;
      }
      throw new HttpException('Internal server error', HttpStatus.INTERNAL_SERVER_ERROR);
    }
  }

  async getPublicPreview() {
    try {
      const result = await this.adminGrpcClient.getPublicPreviewStocks({
        page: 1,
        limit: 25,
      }) as any;
      if (!result.success) {
        throw new HttpException('Failed to get public preview stocks', HttpStatus.INTERNAL_SERVER_ERROR);
      }
      return result;
    } catch (error) {
      if (error instanceof HttpException) {
        throw error;
      }
      throw new HttpException('Internal server error', HttpStatus.INTERNAL_SERVER_ERROR);
    }
  }

  async getByDateRange(startDate: string, endDate: string) {
    try {
      const result = await this.adminGrpcClient.getStocks({
        page: 1,
        limit: 25,
        search: '',
        sortBy: 'earningsDate',
        sortOrder: 'asc',
      }) as any;
      if (!result.success) {
        throw new HttpException('Failed to get stocks by date range', HttpStatus.INTERNAL_SERVER_ERROR);
      }
      // Filter by date range in the result
      const filteredStocks = result.stocks?.filter((stock: any) => {
        const stockDate = new Date(stock.earningsDate);
        const start = new Date(startDate);
        const end = new Date(endDate);
        return stockDate >= start && stockDate <= end;
      });
      return { ...result, stocks: filteredStocks };
    } catch (error) {
      if (error instanceof HttpException) {
        throw error;
      }
      throw new HttpException('Internal server error', HttpStatus.INTERNAL_SERVER_ERROR);
    }
  }

  async getBySpecificDate(date: string) {
    try {
      const result = await this.adminGrpcClient.getStocks({
        page: 1,
        limit: 1000,
        search: '',
        sortBy: 'earningsDate',
        sortOrder: 'asc',
      }) as any;
      if (!result.success) {
        throw new HttpException('Failed to get stocks by specific date', HttpStatus.INTERNAL_SERVER_ERROR);
      }
      // Filter by specific date
      const targetDate = new Date(date);
      const filteredStocks = result.stocks?.filter((stock: any) => {
        const stockDate = new Date(stock.earningsDate);
        return stockDate.toDateString() === targetDate.toDateString();
      });
      return { ...result, stocks: filteredStocks };
    } catch (error) {
      if (error instanceof HttpException) {
        throw error;
      }
      throw new HttpException('Internal server error', HttpStatus.INTERNAL_SERVER_ERROR);
    }
  }

  async getByMonth(year: number, month: number) {
    try {
      const result = await this.adminGrpcClient.getStocks({
        page: 1,
        limit: 1000,
        search: '',
        sortBy: 'earningsDate',
        sortOrder: 'asc',
      }) as any;
      if (!result.success) {
        throw new HttpException('Failed to get stocks by month', HttpStatus.INTERNAL_SERVER_ERROR);
      }
      // Filter by month
      const filteredStocks = result.stocks?.filter((stock: any) => {
        const stockDate = new Date(stock.earningsDate);
        return stockDate.getFullYear() === year && stockDate.getMonth() === month - 1;
      });
      return { ...result, stocks: filteredStocks };
    } catch (error) {
      if (error instanceof HttpException) {
        throw error;
      }
      throw new HttpException('Internal server error', HttpStatus.INTERNAL_SERVER_ERROR);
    }
  }

  async getByQuarter(year: number, quarter: number) {
    try {
      const result = await this.adminGrpcClient.getStocks({
        page: 1,
        limit: 1000,
        search: '',
        sortBy: 'earningsDate',
        sortOrder: 'asc',
      }) as any;
      if (!result.success) {
        throw new HttpException('Failed to get stocks by quarter', HttpStatus.INTERNAL_SERVER_ERROR);
      }
      // Filter by quarter
      const startMonth = (quarter - 1) * 3;
      const endMonth = startMonth + 2;
      const filteredStocks = result.stocks?.filter((stock: any) => {
        const stockDate = new Date(stock.earningsDate);
        const stockMonth = stockDate.getMonth();
        return stockDate.getFullYear() === year && stockMonth >= startMonth && stockMonth <= endMonth;
      });
      return { ...result, stocks: filteredStocks };
    } catch (error) {
      if (error instanceof HttpException) {
        throw error;
      }
      throw new HttpException('Internal server error', HttpStatus.INTERNAL_SERVER_ERROR);
    }
  }

  async getPaginatedStock(params: any) {
    try {
      const result = await this.adminGrpcClient.getStocks({
        page: params.page || 1,
        limit: params.limit || 25,
        search: params.search || '',
        sortBy: params.sortBy || 'earningsDate',
        sortOrder: params.sortOrder || 'asc',
      }) as any;
      if (!result.success) {
        throw new HttpException('Failed to get paginated stocks', HttpStatus.INTERNAL_SERVER_ERROR);
      }
      return result;
    } catch (error) {
      if (error instanceof HttpException) {
        throw error;
      }
      throw new HttpException('Internal server error', HttpStatus.INTERNAL_SERVER_ERROR);
    }
  }

  async deleteStockRecord(id: string) {
    try {
      const result = await this.adminGrpcClient.deleteStock({ id }) as any;
      if (!result.success) {
        throw new HttpException('Failed to delete stock record', HttpStatus.BAD_REQUEST);
      }
      return result;
    } catch (error) {
      if (error instanceof HttpException) {
        throw error;
      }
      throw new HttpException('Internal server error', HttpStatus.INTERNAL_SERVER_ERROR);
    }
  }

  async bulkDeleteStockRecords(ids: string[]) {
    try {
      // Delete stocks one by one since bulk delete is not available in gRPC
      const results = await Promise.all(
        ids.map(id => this.adminGrpcClient.deleteStock({ id }))
      );
      const successCount = results.filter((result: any) => result.success).length;
      return {
        success: true,
        message: `Successfully deleted ${successCount} out of ${ids.length} records`,
        deletedCount: successCount,
        totalCount: ids.length,
      };
    } catch (error) {
      if (error instanceof HttpException) {
        throw error;
      }
      throw new HttpException('Internal server error', HttpStatus.INTERNAL_SERVER_ERROR);
    }
  }

  async deleteAllStockRecords() {
    try {
      const result = await this.adminGrpcClient.deleteAllStocks({}) as any;
      return result;
    } catch (error) {
      if (error instanceof HttpException) {
        throw error;
      }
      throw new HttpException('Internal server error', HttpStatus.INTERNAL_SERVER_ERROR);
    }
  }

  async updateStockRecord(id: string, dto: any) {
    try {
      const result = await this.adminGrpcClient.updateStock({ id, stock: dto }) as any;
      if (!result.success) {
        throw new HttpException('Failed to update stock record', HttpStatus.BAD_REQUEST);
      }
      return result;
    } catch (error) {
      if (error instanceof HttpException) {
        throw error;
      }
      throw new HttpException('Internal server error', HttpStatus.INTERNAL_SERVER_ERROR);
    }
  }

  // File upload methods using gRPC
  async uploadStockFile(file: any) {
    try {
      // Convert file to stock data and use bulk upload
      const stockData = this.parseStockFile(file);
      const result = await this.adminGrpcClient.bulkUploadStocks({ stocks: stockData }) as any;
      if (!result.success) {
        throw new HttpException('Failed to upload stock file', HttpStatus.BAD_REQUEST);
      }
      return result;
    } catch (error) {
      if (error instanceof HttpException) {
        throw error;
      }
      throw new HttpException('Internal server error', HttpStatus.INTERNAL_SERVER_ERROR);
    }
  }

  async uploadEarningsFile(file: any) {
    try {
      // Convert file to stock data and use bulk upload
      const stockData = this.parseEarningsFile(file);
      const result = await this.adminGrpcClient.bulkUploadStocks({ stocks: stockData }) as any;
      if (!result.success) {
        throw new HttpException('Failed to upload earnings file', HttpStatus.BAD_REQUEST);
      }
      return result;
    } catch (error) {
      if (error instanceof HttpException) {
        throw error;
      }
      throw new HttpException('Internal server error', HttpStatus.INTERNAL_SERVER_ERROR);
    }
  }

  async bulkUploadEarnings(rows: any[]) {
    try {
      const result = await this.adminGrpcClient.bulkUploadStocks({ stocks: rows }) as any;
      if (!result.success) {
        throw new HttpException('Failed to bulk upload earnings', HttpStatus.BAD_REQUEST);
      }
      return result;
    } catch (error) {
      if (error instanceof HttpException) {
        throw error;
      }
      throw new HttpException('Internal server error', HttpStatus.INTERNAL_SERVER_ERROR);
    }
  }

  async chunkedUploadEarnings(chunk: any[]) {
    try {
      const result = await this.adminGrpcClient.bulkUploadStocks({ stocks: chunk }) as any;
      if (!result.success) {
        throw new HttpException('Failed to upload earnings chunk', HttpStatus.BAD_REQUEST);
      }
      return result;
    } catch (error) {
      if (error instanceof HttpException) {
        throw error;
      }
      throw new HttpException('Internal server error', HttpStatus.INTERNAL_SERVER_ERROR);
    }
  }

  // OAuth methods - proxied to auth-service via HTTP
  async oauthGoogle(req?: any) {
    return this.proxyToAuthService('GET', '/auth/oauth/google', {}, req);
  }

  async oauthGoogleCallback(query: any, req?: any) {
    return this.proxyToAuthService('GET', '/auth/oauth/google/callback', query, req);
  }

  // --- Proxy Helper for Auth Service ---
  async proxyToAuthService(method: string, path: string, data: any, req?: any) {
    try {
      const authServiceUrl = `http://${process.env.AUTHSERVICE_HOST || 'auth-service'}:${process.env.AUTHSERVICE_PORT || 3001}${path}`;
      const headers: any = {
        'Content-Type': 'application/json',
      };

      if (req?.headers?.cookie) {
        headers['Cookie'] = req.headers.cookie;
      }

      if (req?.headers?.authorization) {
        headers['Authorization'] = req.headers.authorization;
      }

      let response;
      if (method === 'GET') {
        const queryString = data && typeof data === 'object' && Object.keys(data).length > 0
          ? new URLSearchParams(data as Record<string, string>).toString()
          : '';
        const url = queryString ? `${authServiceUrl}?${queryString}` : authServiceUrl;
        console.log(`[Gateway] 🔑 Proxying ${method} to Auth: ${url}`);
        response = await this.http.get(url, { headers }).toPromise();
      } else if (method === 'POST') {
        response = await this.http.post(authServiceUrl, data, { headers }).toPromise();
      } else {
        throw new HttpException(`Unsupported method for Auth proxy: ${method}`, HttpStatus.BAD_REQUEST);
      }

      return response?.data;
    } catch (error: any) {
      console.error(`[Gateway] ❌ Auth Proxy Error (${path}):`, error?.message);
      if (error?.response) {
        throw new HttpException(error.response.data || error.message, error.response.status || HttpStatus.INTERNAL_SERVER_ERROR);
      }
      throw new HttpException('Auth Proxy internal error', HttpStatus.INTERNAL_SERVER_ERROR);
    }
  }

  // Helper methods for file parsing
  private parseStockFile(file: any): any[] {
    // Implementation would depend on file format (CSV, Excel, etc.)
    // This is a placeholder implementation
    return [];
  }

  private parseEarningsFile(file: any): any[] {
    // Implementation would depend on file format (CSV, Excel, etc.)
    // This is a placeholder implementation
    return [];
  }

  // Chat proxy methods - direct HTTP to AdminService
  async proxyToAdminService(method: string, path: string, data: any, req: any) {
    try {
      // AdminService has global prefix 'api', so we need to add it
      const adminServiceUrl = `http://${process.env.ADMINSERVICE_HOST || 'adminservice'}:${process.env.ADMINSERVICE_PORT || 3002}/api${path}`;
      const headers: any = {
        'Content-Type': 'application/json',
      };

      // Forward cookies from Express request
      if (req?.headers?.cookie) {
        headers['Cookie'] = req.headers.cookie;
      }

      // Forward authorization if present
      if (req?.headers?.authorization) {
        headers['Authorization'] = req.headers.authorization;
      }

      let response;
      if (method === 'GET') {
        const queryString = data && typeof data === 'object' && Object.keys(data).length > 0
          ? new URLSearchParams(data as Record<string, string>).toString()
          : '';
        const url = queryString ? `${adminServiceUrl}?${queryString}` : adminServiceUrl;
        console.log(`[Gateway] 🚀 Proxying ${method} to: ${url}`);
        response = await this.http.get(url, { headers }).toPromise();
      } else if (method === 'POST') {
        response = await this.http.post(adminServiceUrl, data, { headers }).toPromise();
      } else if (method === 'PUT') {
        response = await this.http.put(adminServiceUrl, data, { headers }).toPromise();
      } else if (method === 'DELETE') {
        response = await this.http.delete(adminServiceUrl, { headers }).toPromise();
      } else {
        throw new HttpException(`Unsupported method: ${method}`, HttpStatus.BAD_REQUEST);
      }

      return response?.data;
    } catch (error: any) {
      if (error?.response) {
        throw new HttpException(error.response.data || error.message, error.response.status || HttpStatus.INTERNAL_SERVER_ERROR);
      }
      throw new HttpException('Internal server error', HttpStatus.INTERNAL_SERVER_ERROR);
    }
  }
}

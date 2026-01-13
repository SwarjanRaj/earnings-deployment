import { Test, TestingModule } from '@nestjs/testing';
import { AdminController } from './admin.controller';
import { AdminService } from './admin.service';
import { UserRole } from '../common/enums/user-role.enum';

describe('AdminController', () => {
  let controller: AdminController;
  let service: AdminService;

  const mockAdminService = {
    getAllUsersPaginated: jest.fn(),
    getLoginActivity: jest.fn(),
    setRoleByEmail: jest.fn(),
    syncUsersFromAuth: jest.fn(),
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      controllers: [AdminController],
      providers: [
        {
          provide: AdminService,
          useValue: mockAdminService,
        },
      ],
    }).compile();

    controller = module.get<AdminController>(AdminController);
    service = module.get<AdminService>(AdminService);
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  describe('getAllUsers', () => {
    it('should return paginated users with default parameters', async () => {
      const mockResult = {
        data: [
          { id: '1', email: 'user1@example.com', role: 'USER' },
          { id: '2', email: 'user2@example.com', role: 'ADMIN' },
        ],
        pagination: {
          currentPage: 1,
          pageSize: 25,
          total: 2,
          totalPages: 1,
          hasNextPage: false,
          hasPrevPage: false,
          startIndex: 1,
          endIndex: 2,
        },
      };

      mockAdminService.getAllUsersPaginated.mockResolvedValue(mockResult);

      const result = await controller.getAllUsers('1', '25');

      expect(result).toEqual(mockResult);
      expect(service.getAllUsersPaginated).toHaveBeenCalledWith(1, 25);
    });

    it('should handle custom page size', async () => {
      const mockResult = {
        data: [{ id: '1', email: 'user1@example.com', role: 'USER' }],
        pagination: {
          currentPage: 1,
          pageSize: 10,
          total: 1,
          totalPages: 1,
          hasNextPage: false,
          hasPrevPage: false,
          startIndex: 1,
          endIndex: 1,
        },
      };

      mockAdminService.getAllUsersPaginated.mockResolvedValue(mockResult);

      const result = await controller.getAllUsers('1', '10');

      expect(result).toEqual(mockResult);
      expect(service.getAllUsersPaginated).toHaveBeenCalledWith(1, 10);
    });

    it('should handle invalid page parameter', async () => {
      const mockResult = {
        data: [],
        pagination: {
          currentPage: 1,
          pageSize: 25,
          total: 0,
          totalPages: 0,
          hasNextPage: false,
          hasPrevPage: false,
          startIndex: 1,
          endIndex: 0,
        },
      };

      mockAdminService.getAllUsersPaginated.mockResolvedValue(mockResult);

      const result = await controller.getAllUsers('invalid', '25');

      expect(result).toEqual(mockResult);
      expect(service.getAllUsersPaginated).toHaveBeenCalledWith(NaN, 25);
    });

    it('should handle invalid pageSize parameter', async () => {
      const mockResult = {
        data: [],
        pagination: {
          currentPage: 1,
          pageSize: 25,
          total: 0,
          totalPages: 0,
          hasNextPage: false,
          hasPrevPage: false,
          startIndex: 1,
          endIndex: 0,
        },
      };

      mockAdminService.getAllUsersPaginated.mockResolvedValue(mockResult);

      const result = await controller.getAllUsers('1', 'invalid');

      expect(result).toEqual(mockResult);
      expect(service.getAllUsersPaginated).toHaveBeenCalledWith(1, NaN);
    });
  });

  describe('getLoginActivity', () => {
    it('should return login activity for user', async () => {
      const email = 'test@example.com';
      const mockActivity = [
        { id: '1', userId: '1', lastLogin: new Date() },
        { id: '2', userId: '1', lastLogin: new Date() },
      ];

      mockAdminService.getLoginActivity.mockResolvedValue(mockActivity);

      const result = await controller.getLoginActivity(email);

      expect(result).toEqual(mockActivity);
      expect(service.getLoginActivity).toHaveBeenCalledWith(email);
    });

    it('should return empty array when no activity found', async () => {
      const email = 'nonexistent@example.com';

      mockAdminService.getLoginActivity.mockResolvedValue([]);

      const result = await controller.getLoginActivity(email);

      expect(result).toEqual([]);
      expect(service.getLoginActivity).toHaveBeenCalledWith(email);
    });
  });

  describe('setRoleByEmail', () => {
    it('should set user role successfully', async () => {
      const email = 'test@example.com';
      const role = 'ADMIN';
      const mockUser = { id: '1', email, role };

      mockAdminService.setRoleByEmail.mockResolvedValue(mockUser);

      const result = await controller.setRoleByEmail(email, { role });

      expect(result).toEqual(mockUser);
      expect(service.setRoleByEmail).toHaveBeenCalledWith(email, role);
    });

    it('should handle different role types', async () => {
      const email = 'test@example.com';
      const role = 'SUPERADMIN';
      const mockUser = { id: '1', email, role };

      mockAdminService.setRoleByEmail.mockResolvedValue(mockUser);

      const result = await controller.setRoleByEmail(email, { role });

      expect(result).toEqual(mockUser);
      expect(service.setRoleByEmail).toHaveBeenCalledWith(email, role);
    });
  });

  describe('syncUsers', () => {
    it('should sync users from auth service successfully', async () => {
      const mockResult = { message: 'Users synced successfully', count: 5 };

      mockAdminService.syncUsersFromAuth.mockResolvedValue(mockResult);

      const result = await controller.syncUsers();

      expect(result).toEqual(mockResult);
      expect(service.syncUsersFromAuth).toHaveBeenCalled();
    });

    it('should handle sync errors gracefully', async () => {
      mockAdminService.syncUsersFromAuth.mockRejectedValue(new Error('Sync failed'));

      await expect(controller.syncUsers()).rejects.toThrow('Sync failed');
      expect(service.syncUsersFromAuth).toHaveBeenCalled();
    });
  });
}); 
import { Test, TestingModule } from '@nestjs/testing';
import { AdminService } from './admin.service';
import { PrismaService } from '../prisma/prisma.service';
import { HttpService } from '@nestjs/axios';
import { UserRole } from '../common/enums/user-role.enum';
import { of } from 'rxjs';

describe('AdminService', () => {
  let service: AdminService;
  let prismaService: PrismaService;
  let httpService: HttpService;

  const mockPrismaService = {
    user: {
      findUnique: jest.fn(),
      findMany: jest.fn(),
      update: jest.fn(),
      count: jest.fn(),
      upsert: jest.fn(),
    },
    loginActivity: {
      findMany: jest.fn(),
    },
  };

  const mockHttpService = {
    get: jest.fn(),
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        AdminService,
        {
          provide: PrismaService,
          useValue: mockPrismaService,
        },
        {
          provide: HttpService,
          useValue: mockHttpService,
        },
      ],
    }).compile();

    service = module.get<AdminService>(AdminService);
    prismaService = module.get<PrismaService>(PrismaService);
    httpService = module.get<HttpService>(HttpService);
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  describe('getLoginActivity', () => {
    it('should return login activity for user', async () => {
      const email = 'test@example.com';
      const mockUser = { id: '1', email };
      const mockActivity = [
        { id: '1', userId: '1', lastLogin: new Date() },
        { id: '2', userId: '1', lastLogin: new Date() },
      ];

      mockPrismaService.user.findUnique.mockResolvedValue(mockUser);
      mockPrismaService.loginActivity.findMany.mockResolvedValue(mockActivity);

      const result = await service.getLoginActivity(email);

      expect(result).toEqual(mockActivity);
      expect(mockPrismaService.user.findUnique).toHaveBeenCalledWith({ where: { email } });
      expect(mockPrismaService.loginActivity.findMany).toHaveBeenCalledWith({
        where: { userId: '1' },
        orderBy: { lastLogin: 'desc' },
      });
    });

    it('should return empty array when user not found', async () => {
      const email = 'nonexistent@example.com';

      mockPrismaService.user.findUnique.mockResolvedValue(null);
      mockPrismaService.loginActivity.findMany.mockResolvedValue([]);

      const result = await service.getLoginActivity(email);

      expect(result).toEqual([]);
      expect(mockPrismaService.user.findUnique).toHaveBeenCalledWith({ where: { email } });
      expect(mockPrismaService.loginActivity.findMany).toHaveBeenCalledWith({
        where: { userId: undefined },
        orderBy: { lastLogin: 'desc' },
      });
    });
  });

  describe('setRoleByEmail', () => {
    it('should update user role successfully', async () => {
      const email = 'test@example.com';
      const role = 'ADMIN';
      const mockUpdatedUser = { id: '1', email, role };

      mockPrismaService.user.update.mockResolvedValue(mockUpdatedUser);

      const result = await service.setRoleByEmail(email, role);

      expect(result).toEqual(mockUpdatedUser);
      expect(mockPrismaService.user.update).toHaveBeenCalledWith({
        where: { email },
        data: { role },
      });
    });
  });

  describe('getAllUsers', () => {
    it('should return all users', async () => {
      const mockUsers = [
        { id: '1', email: 'user1@example.com', role: 'USER' },
        { id: '2', email: 'user2@example.com', role: 'ADMIN' },
      ];

      mockPrismaService.user.findMany.mockResolvedValue(mockUsers);

      const result = await service.getAllUsers();

      expect(result).toEqual(mockUsers);
      expect(mockPrismaService.user.findMany).toHaveBeenCalled();
    });
  });

  describe('getAllUsersPaginated', () => {
    it('should return paginated users with correct structure', async () => {
      const page = 1;
      const pageSize = 25;
      const mockUsers = [
        { id: '1', email: 'user1@example.com', role: 'USER' },
        { id: '2', email: 'user2@example.com', role: 'ADMIN' },
      ];
      const total = 50;

      mockPrismaService.user.findMany.mockResolvedValue(mockUsers);
      mockPrismaService.user.count.mockResolvedValue(total);

      const result = await service.getAllUsersPaginated(page, pageSize);

      expect(result).toEqual({
        data: mockUsers,
        pagination: {
          currentPage: page,
          pageSize,
          total,
          totalPages: 2,
          hasNextPage: true,
          hasPrevPage: false,
          startIndex: 1,
          endIndex: 25,
        },
      });

      expect(mockPrismaService.user.findMany).toHaveBeenCalledWith({
        skip: 0,
        take: pageSize,
        orderBy: { createdAt: 'desc' },
      });
      expect(mockPrismaService.user.count).toHaveBeenCalled();
    });

    it('should handle second page correctly', async () => {
      const page = 2;
      const pageSize = 10;
      const mockUsers = [
        { id: '11', email: 'user11@example.com', role: 'USER' },
        { id: '12', email: 'user12@example.com', role: 'ADMIN' },
      ];
      const total = 25;

      mockPrismaService.user.findMany.mockResolvedValue(mockUsers);
      mockPrismaService.user.count.mockResolvedValue(total);

      const result = await service.getAllUsersPaginated(page, pageSize);

      expect(result.pagination).toEqual({
        currentPage: page,
        pageSize,
        total,
        totalPages: 3,
        hasNextPage: true,
        hasPrevPage: true,
        startIndex: 11,
        endIndex: 20,
      });

      expect(mockPrismaService.user.findMany).toHaveBeenCalledWith({
        skip: 10,
        take: pageSize,
        orderBy: { createdAt: 'desc' },
      });
    });
  });

  describe('syncUsersFromAuth', () => {
    it('should sync users from auth service successfully', async () => {
      const mockAuthUsers = [
        {
          id: '1',
          email: 'user1@example.com',
          username: 'user1',
          role: 'USER',
          createdAt: '2024-01-01T00:00:00Z',
          updatedAt: '2024-01-01T00:00:00Z',
        },
        {
          id: '2',
          email: 'admin@example.com',
          username: 'admin',
          role: 'ADMIN',
          createdAt: '2024-01-01T00:00:00Z',
          updatedAt: '2024-01-01T00:00:00Z',
        },
      ];

      mockHttpService.get.mockReturnValue(of({ data: mockAuthUsers }));
      mockPrismaService.user.upsert.mockResolvedValue({});

      await service.syncUsersFromAuth();

      expect(mockHttpService.get).toHaveBeenCalledWith('http://auth-service:3001/api/users/all');
      expect(mockPrismaService.user.upsert).toHaveBeenCalledTimes(2);
    });

    it('should handle auth service returning non-array data', async () => {
      mockHttpService.get.mockReturnValue(of({ data: 'not an array' }));

      await service.syncUsersFromAuth();

      expect(mockHttpService.get).toHaveBeenCalledWith('http://auth-service:3001/api/users/all');
      expect(mockPrismaService.user.upsert).not.toHaveBeenCalled();
    });

    it('should handle auth service errors gracefully', async () => {
      mockHttpService.get.mockImplementation(() => {
        throw new Error('Network error');
      });

      await service.syncUsersFromAuth();

      expect(mockHttpService.get).toHaveBeenCalledWith('http://auth-service:3001/api/users/all');
      expect(mockPrismaService.user.upsert).not.toHaveBeenCalled();
    });
  });

  describe('mapRole', () => {
    it('should map valid roles correctly', () => {
      expect(service['mapRole']('USER')).toBe('USER');
      expect(service['mapRole']('ADMIN')).toBe('ADMIN');
      expect(service['mapRole']('SUPERADMIN')).toBe('SUPER_ADMIN');
    });

    it('should return USER for unknown roles', () => {
      expect(service['mapRole']('UNKNOWN')).toBe('USER');
      expect(service['mapRole']('')).toBe('USER');
      expect(service['mapRole']('INVALID_ROLE')).toBe('USER');
    });
  });
}); 
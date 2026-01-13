// Simple test setup file
export const createMockPrismaService = () => ({
  financialRecord: {
    findMany: () => Promise.resolve([]),
    findFirst: () => Promise.resolve(null),
    create: () => Promise.resolve({}),
    update: () => Promise.resolve({}),
    delete: () => Promise.resolve({}),
    deleteMany: () => Promise.resolve({ count: 0 }),
    upsert: () => Promise.resolve({}),
    count: () => Promise.resolve(0),
  },
  user: {
    findMany: () => Promise.resolve([]),
    findFirst: () => Promise.resolve(null),
    create: () => Promise.resolve({}),
    update: () => Promise.resolve({}),
    delete: () => Promise.resolve({}),
    deleteMany: () => Promise.resolve({ count: 0 }),
    upsert: () => Promise.resolve({}),
    count: () => Promise.resolve(0),
  },
  $connect: () => Promise.resolve(),
  $disconnect: () => Promise.resolve(),
  $on: () => {},
  $transaction: () => Promise.resolve([]),
});

export const createMockHttpService = () => ({
  get: () => Promise.resolve({ data: [] }),
  post: () => Promise.resolve({ data: {} }),
  put: () => Promise.resolve({ data: {} }),
  delete: () => Promise.resolve({ data: {} }),
  patch: () => Promise.resolve({ data: {} }),
  request: () => Promise.resolve({ data: {} }),
});

export const createMockResponse = (data: any, status = 200) => ({
  data,
  status,
  statusText: 'OK',
  config: {},
  headers: {},
});

export const createMockPaginatedResponse = (data: any[], total: number, page = 1, pageSize = 25) => ({
  data,
  pagination: {
    currentPage: page,
    pageSize,
    total,
    totalPages: Math.ceil(total / pageSize),
    hasNextPage: page < Math.ceil(total / pageSize),
    hasPrevPage: page > 1,
    startIndex: (page - 1) * pageSize + 1,
    endIndex: Math.min(page * pageSize, total),
  },
});

export const createMockUser = (overrides: any = {}) => ({
  id: '1',
  email: 'test@example.com',
  role: 'USER',
  createdAt: new Date(),
  updatedAt: new Date(),
  ...overrides,
});

export const createMockFinancialRecord = (overrides: any = {}) => ({
  id: '1',
  ticker: 'AAPL',
  companyName: 'Apple Inc.',
  sector: 'Technology',
  marketCap: '2000.00',
  revenue: '394.33',
  eps: '6.16',
  peRatio: '32.47',
  earningsDate: new Date('2024-01-25'),
  fiscalYear: 2024,
  fiscalQuarter: 'Q1',
  reportTime: 'day',
  ...overrides,
});

export const createMockUploadStockDto = (overrides: any = {}) => ({
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
  ...overrides,
});

export const createMockUpdateStockDto = (overrides: any = {}) => ({
  ticker: 'AAPL',
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
  ...overrides,
});

export const createMockFile = (overrides: any = {}) => ({
  fieldname: 'file',
  originalname: 'test.csv',
  encoding: '7bit',
  mimetype: 'text/csv',
  buffer: Buffer.from('test'),
  size: 4,
  ...overrides,
});

export const createMockRequest = (overrides: any = {}) => ({
  headers: {
    'content-type': 'application/json',
    'user-agent': 'jest-test',
  },
  body: {},
  query: {},
  params: {},
  ...overrides,
});

export const createMockHttpResponse = (overrides: any = {}) => ({
  status: () => ({ json: () => ({ send: () => {} }) }),
  json: () => ({ send: () => {} }),
  send: () => {},
  ...overrides,
});

export const waitFor = (ms: number) => new Promise(resolve => setTimeout(resolve, ms));

export const getTestDatabaseUrl = () => {
  return process.env.DATABASE_URL || 'postgresql://postgres:postgres@localhost:5432/testdb';
};

export const getTestJwtSecret = () => {
  return process.env.JWT_SECRET || 'test-jwt-secret';
};

export const getTestRefreshTokenSecret = () => {
  return process.env.REFRESH_TOKEN_SECRET || 'test-refresh-secret';
};

export const isValidUUID = (uuid: string) => {
  const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
  return uuidRegex.test(uuid);
};

export const isValidEmail = (email: string) => {
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  return emailRegex.test(email);
};

export const isValidDate = (date: string) => {
  const dateObj = new Date(date);
  return dateObj instanceof Date && !isNaN(dateObj.getTime());
};

export const createTestError = (message: string, status = 400) => {
  const error = new Error(message);
  (error as any).status = status;
  return error;
}; 
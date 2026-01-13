import { createApi, fetchBaseQuery } from '@reduxjs/toolkit/query/react';
import type { UserRole } from '../app/authSlice';

/* ── shared models ─────────────────────────── */

export interface AppUser {
  id: string;
  email: string;
  role: UserRole;  // 'USER' | 'ADMIN' | 'SUPERADMIN'
}

export interface EarningsRow {
  id: string;
  ticker: string;
  companyName: string; // ✅ Fix: use companyName to match backend DTO
  sector: string;
  marketCap: string | null; // Changed from number to string | null to match database schema
  revenue: string | null;   // Changed from number to string | null to match database schema
  eps: string | null;       // Changed from number to string | null to match database schema
  peRatio: string | null;   // Changed from number to string | null to match database schema
  earningsDate: string;     // This is a Date string from the backend
  fiscalYear: number;
  fiscalQuarter: string;
  reportTime: 'day' | 'night';
}

export interface PaginationInfo {
  currentPage: number;
  pageSize: number;
  total: number;
  totalPages: number;
  hasNextPage: boolean;
  hasPrevPage: boolean;
  startIndex: number;
  endIndex: number;
}

export interface PaginatedResponse<T> {
  data?: T[];
  users?: T[];
  pagination: PaginationInfo;
  success?: boolean;
}

/* ── RTK-Query API ─────────────────────────── */

export const adminApi = createApi({
  reducerPath: 'adminApi',
  baseQuery: fetchBaseQuery({
    baseUrl: '/api',
    credentials: 'include',  // send access-token cookie
    prepareHeaders: (headers) => {
      // no Authorization header needed; cookie-based auth
      return headers;
    },
  }),
  tagTypes: ['Users', 'Earnings', 'Topics', 'Discussions', 'AdminOneToOneChats', 'AdminChatMessages'],

  endpoints: (builder) => ({
    listUsers: builder.query<PaginatedResponse<AppUser>, { page?: number; pageSize?: number }>({
      query: (params) => {
        const searchParams = new URLSearchParams();
        if (params.page) searchParams.append('page', params.page.toString());
        if (params.pageSize) searchParams.append('pageSize', params.pageSize.toString());
        return `/admin/users?${searchParams.toString()}`;
      },
      providesTags: ['Users'],
    }),
    addUser: builder.mutation<AppUser, { email: string; role: UserRole }>({
      query: (body) => ({ url: '/admin/set-role', method: 'PATCH', body }),
      invalidatesTags: ['Users'],
    }),
    deleteUser: builder.mutation<{ id: string }, string>({
      query: (id) => ({ url: `/admin/users/${id}`, method: 'DELETE' }),
      invalidatesTags: ['Users'],
    }),
    bulkDeleteUsers: builder.mutation<{ deletedCount: number; message: string }, string[]>({
      query: (ids) => ({ url: '/admin/users/bulk/delete', method: 'DELETE', body: { ids } }),
      invalidatesTags: ['Users'],
    }),
    blockUser: builder.mutation<{ message: string; success: boolean }, string>({
      query: (userId) => ({ url: `/admin/users/${userId}/block`, method: 'POST' }),
      invalidatesTags: ['Users'],
    }),
    unblockUser: builder.mutation<{ message: string; success: boolean }, string>({
      query: (userId) => ({ url: `/admin/users/${userId}/unblock`, method: 'POST' }),
      invalidatesTags: ['Users'],
    }),
    syncUsers: builder.mutation<{ message: string; syncedCount?: number }, void>({
      query: () => ({ url: '/admin/sync-users', method: 'POST' }),
      invalidatesTags: ['Users'],
    }),

    listEarnings: builder.query<PaginatedResponse<EarningsRow>, { page?: number; pageSize?: number; search?: string }>({
      query: (params) => {
        const searchParams = new URLSearchParams();
        if (params.page) searchParams.append('page', params.page.toString());
        if (params.pageSize) searchParams.append('pageSize', params.pageSize.toString());
        if (params.search) searchParams.append('search', params.search);
        return `/stock?${searchParams.toString()}`;
      },
      providesTags: ['Earnings'],
    }),
    listAllEarnings: builder.query<EarningsRow[], void>({
      query: () => '/stock/all',
      providesTags: ['Earnings'],
    }),
    getToday: builder.query<PaginatedResponse<EarningsRow>, { page?: number; pageSize?: number }>({
      query: (params) => {
        const searchParams = new URLSearchParams();
        if (params.page) searchParams.append('page', params.page.toString());
        if (params.pageSize) searchParams.append('pageSize', params.pageSize.toString());
        return `/stock/today?${searchParams.toString()}`;
      },
      providesTags: ['Earnings'],
    }),
    getYesterday: builder.query<PaginatedResponse<EarningsRow>, { page?: number; pageSize?: number }>({
      query: (params) => {
        const searchParams = new URLSearchParams();
        if (params.page) searchParams.append('page', params.page.toString());
        if (params.pageSize) searchParams.append('pageSize', params.pageSize.toString());
        return `/stock/yesterday?${searchParams.toString()}`;
      },
      providesTags: ['Earnings'],
    }),
    getTomorrow: builder.query<PaginatedResponse<EarningsRow>, { page?: number; pageSize?: number }>({
      query: (params) => {
        const searchParams = new URLSearchParams();
        if (params.page) searchParams.append('page', params.page.toString());
        if (params.pageSize) searchParams.append('pageSize', params.pageSize.toString());
        return `/stock/tomorrow?${searchParams.toString()}`;
      },
      providesTags: ['Earnings'],
    }),
    getThisWeek: builder.query<PaginatedResponse<EarningsRow>, { page?: number; pageSize?: number }>({
      query: (params) => {
        const searchParams = new URLSearchParams();
        if (params.page) searchParams.append('page', params.page.toString());
        if (params.pageSize) searchParams.append('pageSize', params.pageSize.toString());
        return `/stock/this-week?${searchParams.toString()}`;
      },
      providesTags: ['Earnings'],
    }),
    getNextWeek: builder.query<PaginatedResponse<EarningsRow>, { page?: number; pageSize?: number }>({
      query: (params) => {
        const searchParams = new URLSearchParams();
        if (params.page) searchParams.append('page', params.page.toString());
        if (params.pageSize) searchParams.append('pageSize', params.pageSize.toString());
        return `/stock/next-week?${searchParams.toString()}`;
      },
      providesTags: ['Earnings'],
    }),
    getPublicPreview: builder.query<PaginatedResponse<EarningsRow>, { page?: number; pageSize?: number }>({
      query: (params) => {
        const searchParams = new URLSearchParams();
        if (params.page) searchParams.append('page', params.page.toString());
        if (params.pageSize) searchParams.append('pageSize', params.pageSize.toString());
        return `/stock/public-preview?${searchParams.toString()}`;
      },
      providesTags: ['Earnings'],
    }),
    searchEarnings: builder.query<EarningsRow[], string>({
      query: (searchTerm) => `/stock/search?q=${encodeURIComponent(searchTerm)}`,
      providesTags: ['Earnings'],
    }),
    addEarning: builder.mutation<EarningsRow, Omit<EarningsRow, 'id'>>({
      query: (row) => ({ url: '/stock/add', method: 'POST', body: row }),
      invalidatesTags: ['Earnings'],
    }),
    updateEarning: builder.mutation<EarningsRow, EarningsRow>({
      query: (row) => {
        const { id, ...updateData } = row;
        return { url: `/stock/${id}`, method: 'PATCH', body: updateData };
      },
      invalidatesTags: ['Earnings'],
    }),
    deleteEarning: builder.mutation<{ id: string }, string>({
      query: (id) => ({ url: `/stock/${id}`, method: 'DELETE' }),
      invalidatesTags: ['Earnings'],
    }),
    bulkDeleteEarnings: builder.mutation<{ deletedCount: number; message: string }, string[]>({
      query: (ids) => ({ url: '/stock/bulk/delete', method: 'DELETE', body: { ids } }),
      invalidatesTags: ['Earnings'],
    }),
    bulkUpload: builder.mutation<EarningsRow[], EarningsRow[]>({
      query: (rows) => ({ url: '/stock/bulk', method: 'POST', body: rows }),
      invalidatesTags: ['Earnings'],
    }),
    chunkedBulkUpload: builder.mutation<any, EarningsRow[]>({
      query: (rows) => ({ url: '/stock/chunked-bulk', method: 'POST', body: rows }),
      invalidatesTags: ['Earnings'],
    }),

    // New date range endpoints
    getByDateRange: builder.query<PaginatedResponse<EarningsRow>, { startDate: string; endDate: string; page?: number; pageSize?: number }>({
      query: ({ startDate, endDate, page, pageSize }) => {
        const searchParams = new URLSearchParams();
        searchParams.append('startDate', startDate);
        searchParams.append('endDate', endDate);
        if (page) searchParams.append('page', page.toString());
        if (pageSize) searchParams.append('pageSize', pageSize.toString());
        return `/stock/date-range?${searchParams.toString()}`;
      },
      providesTags: ['Earnings'],
    }),
    getBySpecificDate: builder.query<PaginatedResponse<EarningsRow>, { date: string; page?: number; pageSize?: number }>({
      query: ({ date, page, pageSize }) => {
        const searchParams = new URLSearchParams();
        searchParams.append('date', date);
        if (page) searchParams.append('page', page.toString());
        if (pageSize) searchParams.append('pageSize', pageSize.toString());
        return `/stock/specific-date?${searchParams.toString()}`;
      },
      providesTags: ['Earnings'],
    }),
    getByMonth: builder.query<PaginatedResponse<EarningsRow>, { year: number; month: number; page?: number; pageSize?: number }>({
      query: ({ year, month, page, pageSize }) => {
        const searchParams = new URLSearchParams();
        searchParams.append('year', year.toString());
        searchParams.append('month', month.toString());
        if (page) searchParams.append('page', page.toString());
        if (pageSize) searchParams.append('pageSize', pageSize.toString());
        return `/stock/month?${searchParams.toString()}`;
      },
      providesTags: ['Earnings'],
    }),
    getByQuarter: builder.query<PaginatedResponse<EarningsRow>, { year: number; quarter: number; page?: number; pageSize?: number }>({
      query: ({ year, quarter, page, pageSize }) => {
        const searchParams = new URLSearchParams();
        searchParams.append('year', year.toString());
        searchParams.append('quarter', quarter.toString());
        if (page) searchParams.append('page', page.toString());
        if (pageSize) searchParams.append('pageSize', pageSize.toString());
        return `/stock/quarter?${searchParams.toString()}`;
      },
      providesTags: ['Earnings'],
    }),
    // Admin Chat Endpoints
    getAdminTopics: builder.query<any[], { includeDeleted?: boolean; startDate?: string; endDate?: string }>({
      query: ({ includeDeleted, startDate, endDate }) => {
        const searchParams = new URLSearchParams();
        if (includeDeleted) searchParams.append('includeDeleted', 'true');
        if (startDate) searchParams.append('startDate', startDate);
        if (endDate) searchParams.append('endDate', endDate);
        return `/chat/admin/topics?${searchParams.toString()}`;
      },
      providesTags: ['Topics'],
    }),
    getAdminDiscussions: builder.query<any[], { includeDeleted?: boolean; startDate?: string; endDate?: string }>({
      query: ({ includeDeleted, startDate, endDate }) => {
        const searchParams = new URLSearchParams();
        if (includeDeleted) searchParams.append('includeDeleted', 'true');
        if (startDate) searchParams.append('startDate', startDate);
        if (endDate) searchParams.append('endDate', endDate);
        return `/chat/admin/discussions?${searchParams.toString()}`;
      },
      providesTags: ['Discussions'],
    }),
    getAdminOneToOneChats: builder.query<PaginatedResponse<any>, { page?: number; limit?: number; startDate?: string; endDate?: string; search?: string }>({
      query: (params) => {
        const searchParams = new URLSearchParams();
        if (params.page) searchParams.append('page', params.page.toString());
        if (params.limit) searchParams.append('limit', params.limit.toString());
        if (params.startDate) searchParams.append('startDate', params.startDate);
        if (params.endDate) searchParams.append('endDate', params.endDate);
        if (params.search) searchParams.append('search', params.search);
        return `/chat/admin/one-to-one?${searchParams.toString()}`;
      },
      providesTags: ['AdminOneToOneChats'],
    }),
    getPrivateChats: builder.query<PaginatedResponse<any>, { page?: number; limit?: number; search?: string }>({
      query: (params) => {
        const searchParams = new URLSearchParams();
        if (params.page) searchParams.append('page', params.page.toString());
        if (params.limit) searchParams.append('limit', params.limit.toString());
        if (params.search) searchParams.append('search', params.search);
        return `/admin/chat/private?${searchParams.toString()}`;
      },
      providesTags: ['AdminOneToOneChats'],
    }),
    getAdminChatMessages: builder.query<PaginatedResponse<any>, { chatId: string; page?: number; limit?: number }>({
      query: (params) => {
        const searchParams = new URLSearchParams();
        if (params.page) searchParams.append('page', params.page.toString());
        if (params.limit) searchParams.append('limit', params.limit.toString());
        return `/admin/chat/messages/${params.chatId}?${searchParams.toString()}`;
      },
      providesTags: (result, error, { chatId }) => [{ type: 'AdminChatMessages', id: chatId }, { type: 'AdminChatMessages', id: 'LIST' }],
    }),
    createAdminTopic: builder.mutation<any, { title: string; description?: string }>({
      query: (body) => ({ url: '/chat/topics', method: 'POST', body }),
      invalidatesTags: ['Topics'],
    }),
    updateAdminTopic: builder.mutation<any, { id: string; data: { title?: string; description?: string } }>({
      query: ({ id, data }) => ({ url: `/chat/topics/${id}`, method: 'PUT', body: data }),
      invalidatesTags: ['Topics'],
    }),
    softDeleteAdminTopic: builder.mutation<any, string>({
      query: (id) => ({ url: `/chat/topics/${id}`, method: 'DELETE' }),
      invalidatesTags: ['Topics'],
    }),
    hardDeleteTopic: builder.mutation<{ success: boolean; message: string }, string>({
      query: (id) => ({ url: `/admin/chat/topics/${id}/hard`, method: 'DELETE' }),
      invalidatesTags: ['Topics'],
    }),
    restoreTopic: builder.mutation<{ success: boolean; message: string }, string>({
      query: (id) => ({ url: `/admin/chat/topics/${id}/restore`, method: 'PATCH' }),
      invalidatesTags: ['Topics'],
    }),
    hardDeleteDiscussion: builder.mutation<{ success: boolean; message: string }, string>({
      query: (id) => ({ url: `/admin/chat/discussions/${id}/hard`, method: 'DELETE' }),
      invalidatesTags: ['Discussions'],
    }),
    restoreDiscussion: builder.mutation<{ success: boolean; message: string }, string>({
      query: (id) => ({ url: `/admin/chat/discussions/${id}/restore`, method: 'PATCH' }),
      invalidatesTags: ['Discussions'],
    }),
    hardDeleteMessage: builder.mutation<{ success: boolean }, string>({
      query: (id) => ({ url: `/admin/chat/messages/${id}/hard`, method: 'DELETE' }),
    }),
    adminDeleteMessage: builder.mutation<void, string>({
      query: (messageId) => ({
        url: `/chat/messages/${messageId}`,
        method: 'DELETE',
      }),
      invalidatesTags: ['AdminChatMessages'],
    }),
    adminEditMessage: builder.mutation<void, { messageId: string; content: string }>({
      query: ({ messageId, content }) => ({
        url: `/chat/admin/messages/${messageId}`,
        method: 'PUT',
        body: { content },
      }),
      invalidatesTags: ['AdminChatMessages'],
    }),
    deleteOneToOneChat: builder.mutation<void, string>({
      query: (chatId) => ({
        url: `/chat/admin/chats/${chatId}`,
        method: 'DELETE',
      }),
      invalidatesTags: ['AdminOneToOneChats'],
    }),
    getAuditLogs: builder.query<any[], { entity?: string; entityId?: string; limit?: number }>({
      query: (params) => {
        const searchParams = new URLSearchParams();
        if (params.entity) searchParams.append('entity', params.entity);
        if (params.entityId) searchParams.append('entityId', params.entityId);
        if (params.limit) searchParams.append('limit', params.limit.toString());
        return `/admin/chat/audit-logs?${searchParams.toString()}`;
      },
    }),
  }),
});

export const {
  useListUsersQuery,
  useAddUserMutation,
  useDeleteUserMutation,
  useBulkDeleteUsersMutation,
  useBlockUserMutation,
  useUnblockUserMutation,
  useSyncUsersMutation,
  useListEarningsQuery,
  useListAllEarningsQuery,
  useGetTodayQuery,
  useGetYesterdayQuery,
  useGetTomorrowQuery,
  useGetThisWeekQuery,
  useGetNextWeekQuery,
  useGetPublicPreviewQuery,
  useSearchEarningsQuery,
  useAddEarningMutation,
  useUpdateEarningMutation,
  useBulkUploadMutation,
  useChunkedBulkUploadMutation,
  useDeleteEarningMutation,
  useBulkDeleteEarningsMutation,
  useGetByDateRangeQuery,
  useGetBySpecificDateQuery,
  useGetByMonthQuery,
  useGetByQuarterQuery,

  // New Admin Chat Hooks
  useGetAdminTopicsQuery,
  useGetAdminDiscussionsQuery,
  useGetAdminOneToOneChatsQuery,
  useGetPrivateChatsQuery,
  useGetAdminChatMessagesQuery,
  useCreateAdminTopicMutation,
  useUpdateAdminTopicMutation,
  useSoftDeleteAdminTopicMutation,
  useHardDeleteTopicMutation,
  useRestoreTopicMutation,
  useHardDeleteDiscussionMutation,
  useRestoreDiscussionMutation,
  useHardDeleteMessageMutation,
  useAdminEditMessageMutation,
  useAdminDeleteMessageMutation,
  useDeleteOneToOneChatMutation,
  useGetAuditLogsQuery,
} = adminApi;

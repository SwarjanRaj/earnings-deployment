import { createApi, fetchBaseQuery } from '@reduxjs/toolkit/query/react';

export interface Topic {
  id: string;
  title: string;
  description?: string;
  createdBy: string;
  creator: {
    id: string;
    username: string;
    email: string;
  };
  createdAt: string;
  updatedAt: string;
  isActive: boolean;
  chat?: {
    id: string;
    _count: {
      members: number;
      messages: number;
    };
  };
  discussions?: Array<Partial<Discussion>>;
  _count?: {
    discussions: number;
  };
}

export interface Discussion {
  id: string;
  title: string;
  description?: string;
  topicId: string;
  topic: {
    id: string;
    title: string;
    description?: string;
  };
  createdBy: string;
  creator: {
    id: string;
    username: string;
    email: string;
  };
  createdAt: string;
  updatedAt: string;
  deleted: boolean;
  deletedAt?: string;
  deletedBy?: string;
  chat?: {
    id: string;
    _count: {
      members: number;
      messages: number;
    };
  };
}

export interface Message {
  id: string;
  chatId?: string;
  topicId?: string;
  discussionId?: string;
  userId: string;
  user: {
    id: string;
    username: string;
    email: string;
  };
  content: string;
  createdAt: string;
  updatedAt: string;
  edited: boolean;
  deleted: boolean;
  deletedAt?: string;
  deletedBy?: string;
  deliveredAt?: string;
  replyToId?: string;
  replyTo?: Message;
  replies?: Message[];
  readBy?: Array<{
    id: string;
    userId: string;
    user: {
      id: string;
      username: string;
    };
    readAt: string;
  }>;
  reactions?: MessageReaction[];
}

export interface MessageReaction {
  id: string;
  messageId: string;
  userId: string;
  user: {
    id: string;
    username: string;
    email: string;
  };
  emoji: string;
  createdAt: string;
}

export interface Chat {
  id: string;
  type: 'GROUP' | 'ONE_TO_ONE';
  topicId?: string;
  topic?: Topic;
  createdAt: string;
  updatedAt: string;
  lastMessageAt?: string;
  members: Array<{
    id: string;
    userId: string;
    user: {
      id: string;
      username: string;
      email: string;
    };
    joinedAt: string;
    isActive: boolean;
    isMuted?: boolean;
  }>;
  messages?: Message[];
}

export interface CreateTopicDto {
  title: string;
  description?: string;
}

export interface UpdateTopicDto {
  title?: string;
  description?: string;
}

export interface CreateDiscussionDto {
  title: string;
  description?: string;
  topicId: string;
}

export interface UpdateDiscussionDto {
  title?: string;
  description?: string;
}

export interface SendMessageDto {
  chatId?: string;
  topicId?: string;
  discussionId?: string;
  content: string;
  replyToId?: string;
}

export interface AddReactionDto {
  messageId: string;
  emoji: string;
}

export interface RemoveReactionDto {
  messageId: string;
  emoji: string;
}

export interface BlockUserDto {
  blockedId: string;
  reason?: string;
}

export const chatApi = createApi({
  reducerPath: 'chatApi',
  baseQuery: fetchBaseQuery({
    baseUrl: '/api',
    credentials: 'include',
    prepareHeaders: (headers, { getState }) => {
      const token = (getState() as any).auth.accessToken;
      if (token) {
        headers.set('authorization', `Bearer ${token}`);
      }
      return headers;
    },
  }),
  tagTypes: ['Topics', 'Discussions', 'Messages', 'Chats', 'BlockedUsers', 'OnlineStatus'],

  endpoints: (builder) => ({
    // Topics
    createTopic: builder.mutation<Topic, CreateTopicDto>({
      query: (body) => ({
        url: '/chat/topics',
        method: 'POST',
        body,
      }),
      invalidatesTags: ['Topics'],
    }),
    getAllTopics: builder.query<Topic[], void>({
      query: () => '/chat/topics',
      providesTags: ['Topics'],
    }),
    getTopicById: builder.query<Topic, string>({
      query: (id) => `/chat/topics/${id}`,
      providesTags: (_result, _error, id) => [{ type: 'Topics', id }],
    }),
    updateTopic: builder.mutation<Topic, { id: string; data: UpdateTopicDto }>({
      query: ({ id, data }) => ({
        url: `/chat/topics/${id}`,
        method: 'PUT',
        body: data,
      }),
      invalidatesTags: (_result, _error, { id }) => [{ type: 'Topics', id }, 'Topics'],
    }),
    deleteTopic: builder.mutation<{ message: string }, string>({
      query: (id) => ({
        url: `/chat/topics/${id}`,
        method: 'DELETE',
      }),
      invalidatesTags: ['Topics'],
    }),

    // Discussions
    createDiscussion: builder.mutation<Discussion, CreateDiscussionDto>({
      query: (body) => ({
        url: '/chat/discussions',
        method: 'POST',
        body,
      }),
      invalidatesTags: ['Discussions', 'Topics'],
    }),
    getDiscussionsByTopic: builder.query<Discussion[], string>({
      query: (topicId) => `/chat/topics/${topicId}/discussions`,
      providesTags: (_result, _error, topicId) => [{ type: 'Discussions', id: `topic-${topicId}` }],
    }),
    getDiscussionById: builder.query<Discussion, string>({
      query: (id) => `/chat/discussions/${id}`,
      providesTags: (_result, _error, id) => [{ type: 'Discussions', id }],
    }),
    updateDiscussion: builder.mutation<Discussion, { id: string; data: UpdateDiscussionDto }>({
      query: ({ id, data }) => ({
        url: `/chat/discussions/${id}`,
        method: 'PUT',
        body: data,
      }),
      invalidatesTags: (_result, _error, { id }) => [{ type: 'Discussions', id }, 'Discussions'],
    }),
    deleteDiscussion: builder.mutation<{ message: string }, string>({
      query: (id) => ({
        url: `/chat/discussions/${id}`,
        method: 'DELETE',
      }),
      invalidatesTags: ['Discussions', 'Topics'],
    }),

    // Messages
    sendMessage: builder.mutation<Message, SendMessageDto>({
      query: (body) => ({
        url: '/chat/messages',
        method: 'POST',
        body,
      }),
      // Don't invalidate Messages tag - we use WebSocket for real-time updates
      // This prevents unnecessary API refetches when messages are sent
      // invalidatesTags: ['Messages'],
    }),
    getMessages: builder.query<
      { messages: Message[]; pagination: { total: number; page: number; pageSize: number; totalPages: number; hasNextPage: boolean; hasPrevPage: boolean } },
      { topicId?: string; chatId?: string; discussionId?: string; page?: number; limit?: number }
    >({
      query: ({ topicId, chatId, discussionId, page = 1, limit = 50 }) => {
        const params = new URLSearchParams();
        if (topicId) params.append('topicId', topicId);
        if (chatId) params.append('chatId', chatId);
        if (discussionId) params.append('discussionId', discussionId);
        params.append('page', page.toString());
        params.append('limit', limit.toString());
        return `/chat/messages?${params.toString()}`;
      },
      // Use specific tags per topic/chat/discussion to prevent unnecessary refetches
      // Real-time updates come via WebSocket, so we don't need tag-based refetching
      providesTags: (_result, _error, { topicId, chatId, discussionId }) =>
        discussionId
          ? [{ type: 'Messages', id: `discussion-${discussionId}` }]
          : topicId
            ? [{ type: 'Messages', id: `topic-${topicId}` }]
            : chatId
              ? [{ type: 'Messages', id: `chat-${chatId}` }]
              : ['Messages'],
    }),

    // User Blocking
    blockUser: builder.mutation<{ id: string; blockerId: string; blockedId: string; createdAt: string }, BlockUserDto>({
      query: (body) => ({
        url: '/chat/block',
        method: 'POST',
        body,
      }),
      invalidatesTags: ['BlockedUsers'],
    }),
    unblockUser: builder.mutation<{ message: string }, string>({
      query: (blockedId) => ({
        url: `/chat/block/${blockedId}`,
        method: 'DELETE',
      }),
      invalidatesTags: ['BlockedUsers'],
    }),
    getBlockedUsers: builder.query<Array<{ id: string; blocked: { id: string; username: string; email: string } }>, void>({
      query: () => '/chat/blocked',
      providesTags: ['BlockedUsers'],
    }),

    // Chats
    createOneToOneChat: builder.mutation<Chat, string>({
      query: (userId) => ({
        url: `/chat/chats/one-to-one/${userId}`,
        method: 'POST',
      }),
      invalidatesTags: ['Chats'],
    }),
    getUserChats: builder.query<Chat[], void>({
      query: () => '/chat/chats',
      providesTags: ['Chats'],
    }),
    getUsersForChat: builder.query<Array<{
      id: string;
      username: string;
      email: string;
      role: string;
      createdAt: string;
      existingChatId: string | null;
      hasExistingChat: boolean;
    }>, void>({
      query: () => '/chat/users',
      providesTags: ['Chats'],
    }),

    // WhatsApp-like features
    markMessageRead: builder.mutation<{ messageId: string; readBy: string }, string>({
      query: (messageId) => ({
        url: `/chat/messages/${messageId}/read`,
        method: 'POST',
      }),
      invalidatesTags: ['Messages'],
    }),
    markChatRead: builder.mutation<{ markedCount: number }, string>({
      query: (chatId) => ({
        url: `/chat/chats/${chatId}/read`,
        method: 'POST',
      }),
      invalidatesTags: ['Messages', 'Chats'],
    }),
    getUserOnlineStatus: builder.query<{ id: string; isOnline: boolean; lastSeen?: string }, string>({
      query: (userId) => `/chat/users/${userId}/status`,
      providesTags: (_result, _error, userId) => [{ type: 'OnlineStatus', id: userId }],
    }),

    // Admin functions
    suspendUser: builder.mutation<{ id: string; suspended: boolean }, string>({
      query: (userId) => ({
        url: `/chat/users/${userId}/suspend`,
        method: 'PUT',
      }),
      invalidatesTags: ['Topics', 'Messages'],
    }),
    unsuspendUser: builder.mutation<{ id: string; suspended: boolean }, string>({
      query: (userId) => ({
        url: `/chat/users/${userId}/unsuspend`,
        method: 'PUT',
      }),
      invalidatesTags: ['Topics', 'Messages'],
    }),

    // Message editing and deletion
    // Message editing and deletion
    editMessage: builder.mutation<Message, { messageId: string; content: string; topicId?: string; chatId?: string; discussionId?: string }>({
      query: ({ messageId, content }) => ({
        url: `/chat/messages/${messageId}`,
        method: 'PUT',
        body: { content },
      }),
      async onQueryStarted({ messageId, content, topicId, chatId, discussionId }, { dispatch, queryFulfilled }) {
        const patchResult = dispatch(
          chatApi.util.updateQueryData('getMessages', { topicId, chatId, discussionId }, (draft) => {
            const message = draft.messages.find((m) => m.id === messageId);
            if (message) {
              message.content = content;
              message.edited = true;
            }
          })
        );
        try {
          await queryFulfilled;
        } catch {
          patchResult.undo();
        }
      },
    }),
    deleteUserMessage: builder.mutation<{ message: string }, { messageId: string; topicId?: string; chatId?: string; discussionId?: string }>({
      query: ({ messageId }) => ({
        url: `/chat/messages/${messageId}/user`,
        method: 'DELETE',
      }),
      async onQueryStarted({ messageId, topicId, chatId, discussionId }, { dispatch, queryFulfilled }) {
        const patchResult = dispatch(
          chatApi.util.updateQueryData('getMessages', { topicId, chatId, discussionId }, (draft) => {
            draft.messages = draft.messages.filter((m) => m.id !== messageId);
          })
        );
        try {
          await queryFulfilled;
        } catch {
          patchResult.undo();
        }
      },
    }),

    // Reactions

    addReaction: builder.mutation<MessageReaction, AddReactionDto>({
      query: (body) => ({
        url: '/chat/reactions',
        method: 'POST',
        body,
      }),
      invalidatesTags: ['Messages'],
    }),
    removeReaction: builder.mutation<{ messageId: string; emoji: string; userId: string }, RemoveReactionDto>({
      query: ({ messageId, emoji }) => ({
        url: `/chat/reactions/${messageId}/${encodeURIComponent(emoji)}`,
        method: 'DELETE',
      }),
      invalidatesTags: ['Messages'],
    }),
    muteChat: builder.mutation<any, string>({
      query: (chatId) => ({
        url: `/chat/chats/${chatId}/mute`,
        method: 'POST',
      }),
      invalidatesTags: ['Chats'],
    }),
    unmuteChat: builder.mutation<any, string>({
      query: (chatId) => ({
        url: `/chat/chats/${chatId}/unmute`,
        method: 'POST',
      }),
      invalidatesTags: ['Chats'],
    }),
  }),
});

export const {
  useCreateTopicMutation,
  useGetAllTopicsQuery,
  useGetTopicByIdQuery,
  useUpdateTopicMutation,
  useDeleteTopicMutation,
  useCreateDiscussionMutation,
  useGetDiscussionsByTopicQuery,
  useGetDiscussionByIdQuery,
  useUpdateDiscussionMutation,
  useDeleteDiscussionMutation,
  useSendMessageMutation,
  useGetMessagesQuery,
  useBlockUserMutation,
  useUnblockUserMutation,
  useGetBlockedUsersQuery,
  useCreateOneToOneChatMutation,
  useGetUserChatsQuery,
  useGetUsersForChatQuery,
  useMarkMessageReadMutation,
  useMarkChatReadMutation,
  useGetUserOnlineStatusQuery,
  useSuspendUserMutation,
  useUnsuspendUserMutation,
  useEditMessageMutation,
  useDeleteUserMessageMutation,
  useAddReactionMutation,
  useRemoveReactionMutation,
  useMuteChatMutation,
  useUnmuteChatMutation,
} = chatApi;



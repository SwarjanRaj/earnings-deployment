import { useState, useEffect, useRef, useCallback, useMemo } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import {
  Box,
  Paper,
  Typography,
  TextField,
  IconButton,
  Stack,
  alpha,
  useTheme,
  Alert,
  Collapse,
  Snackbar,
  Button,
  Avatar,
  useMediaQuery,
  CircularProgress,
} from '@mui/material';
import { Send, Search, MoreVertical, X, ArrowLeft, Info, Bell, BellOff } from 'lucide-react';
import EmojiPicker from '../components/EmojiPicker';
import {
  useGetTopicByIdQuery,
  useGetDiscussionByIdQuery,
  useGetMessagesQuery,
  useSendMessageMutation,
  useGetBlockedUsersQuery,
  useMarkChatReadMutation,
  useAddReactionMutation,
  useRemoveReactionMutation,
  useMuteChatMutation,
  useUnmuteChatMutation,
} from '../../../services/chatApi';

import { useSocket } from '../../../hooks/useSocket';
import { useAuth } from '../../../app/useAuth';
import type { Message } from '../../../services/chatApi';
import UserBlockDialog from '../components/UserBlockDialog';
import UserProfileDialog from '../components/UserProfileDialog';
import MessageBubble from '../components/MessageBubble';
import UnifiedChatLayout from '../components/UnifiedChatLayout';

export default function ChannelChatPage() {
  const theme = useTheme();
  const navigate = useNavigate();
  const isMobile = useMediaQuery(theme.breakpoints.down('sm'));
  const { topicId, discussionId } = useParams<{ topicId?: string; discussionId?: string }>();
  const { user, isAuthenticated } = useAuth();
  const { socket, isConnected, connectionStatus } = useSocket();

  // Determine if this is a discussion or topic chat
  const isDiscussion = !!discussionId;
  const chatId = discussionId || topicId;

  // Security: Redirect if not authenticated
  if (!isAuthenticated) {
    return null; // Will be handled by ProtectedRoute, but this is a safety check
  }

  const [message, setMessage] = useState('');
  const [messages, setMessages] = useState<Message[]>([]);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const messagesContainerRef = useRef<HTMLDivElement>(null);
  const [typingUsers, setTypingUsers] = useState<Set<string>>(new Set());
  const [isScrolledToBottom, setIsScrolledToBottom] = useState(true);

  // CRITICAL: Reset all state when topicId or discussionId changes
  useEffect(() => {
    if (!chatId) return;

    // Reset all chat-related state when switching topics/discussions
    setMessages([]);
    setMessage('');
    setTypingUsers(new Set());
    setIsInitialLoad(true);
    setCurrentPage(1);
    setHasMore(true);
    setIsLoadingMore(false);
    setAllLoadedPages(new Set());
    setSearchQuery('');
    setShowSearch(false);
    setIsScrolledToBottom(true);
    setMessageReactions({});
    setReplyToMessage(null);
    scrollPositionRef.current = 0;
    isLoadingMoreRef.current = false;
    messageIdsRef.current.clear();
    socketMessageCountRef.current = 0;
    apiMessageCountRef.current = 0;
    listenersRegisteredRef.current = false;

    console.log('[ChannelChat] 🔄 Chat ID changed, resetting all state for:', chatId, isDiscussion ? '(discussion)' : '(topic)');
  }, [chatId, isDiscussion]);
  const [blockDialogOpen, setBlockDialogOpen] = useState(false);
  const [selectedUser, setSelectedUser] = useState<{ id: string; username: string } | null>(null);
  const [profileDialogOpen, setProfileDialogOpen] = useState(false);
  const [selectedProfileUser, setSelectedProfileUser] = useState<{ id: string; username: string; email: string } | null>(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [showSearch, setShowSearch] = useState(false);
  const [snackbar, setSnackbar] = useState<{ open: boolean; message: string; severity: 'success' | 'error' }>({
    open: false,
    message: '',
    severity: 'error',
  });
  const [muteChat] = useMuteChatMutation();
  const [unmuteChat] = useUnmuteChatMutation();

  // Fetch blocked users for message filtering
  const { data: blockedUsers = [] } = useGetBlockedUsersQuery();

  // Fetch topic or discussion data
  const { data: topic, isLoading: topicLoading } = useGetTopicByIdQuery(topicId!, {
    skip: !topicId || isDiscussion,
  });
  const { data: discussion, isLoading: discussionLoading } = useGetDiscussionByIdQuery(discussionId!, {
    skip: !discussionId || !isDiscussion,
  });

  const chatData = isDiscussion ? discussion : topic;
  const isLoadingChat = isDiscussion ? discussionLoading : topicLoading;

  const isMuted = useMemo(() => {
    if (!chatData?.members || !user?.id) return false;
    return chatData.members.find(m => m.userId === user.id)?.isMuted || false;
  }, [chatData?.members, user?.id]);

  const handleToggleMute = async () => {
    if (!chatId) return;
    try {
      if (isMuted) {
        await unmuteChat(chatId).unwrap();
        setSnackbar({ open: true, message: 'Notifications unmuted', severity: 'success' });
      } else {
        await muteChat(chatId).unwrap();
        setSnackbar({ open: true, message: 'Notifications muted', severity: 'success' });
      }
    } catch (err) {
      console.error('Mute toggle failed:', err);
      setSnackbar({ open: true, message: 'Failed to update mute status', severity: 'error' });
    }
  };

  const [isInitialLoad, setIsInitialLoad] = useState(true);
  const [currentPage, setCurrentPage] = useState(1);
  const [hasMore, setHasMore] = useState(true);
  const [isLoadingMore, setIsLoadingMore] = useState(false);
  const [allLoadedPages, setAllLoadedPages] = useState<Set<number>>(new Set());
  const [messageReactions, setMessageReactions] = useState<{ [messageId: string]: { [emoji: string]: { users: string[], count: number } } }>({});
  const [replyToMessage, setReplyToMessage] = useState<Message | null>(null);
  const scrollPositionRef = useRef<number>(0);
  const isLoadingMoreRef = useRef(false);
  const messageIdsRef = useRef<Set<string>>(new Set());
  const socketMessageCountRef = useRef<number>(0);
  const apiMessageCountRef = useRef<number>(0);
  const lastSocketMessageTimeRef = useRef<number>(0);
  const listenersRegisteredRef = useRef<boolean>(false);
  const currentChatIdRef = useRef<string>('');

  // Socket event handlers - memoized to prevent recreation
  const typingHandler = useCallback((data: { userId: string; username: string; isTyping: boolean }) => {
    if (data.userId !== user?.id) {
      requestAnimationFrame(() => {
        setTypingUsers((prev) => {
          const newSet = new Set(prev);
          if (data.isTyping) {
            newSet.add(data.username);
          } else {
            newSet.delete(data.username);
          }
          return newSet;
        });
      });
    }
  }, [user?.id]);

  const messageReadHandler = useCallback((data: { messageId: string; readBy: string; readAt: string }) => {
    // Update message read status in local state
    setMessages((prev) => {
      return prev.map(msg => {
        if (msg.id === data.messageId) {
          // Add read receipt if not already present
          const readByEntry = {
            id: `${data.messageId}-${data.readBy}`,
            userId: data.readBy,
            user: { id: data.readBy, username: 'User' },
            readAt: data.readAt,
          };

          const existingReadBy = msg.readBy || [];
          const alreadyRead = existingReadBy.some(read => read.userId === data.readBy);

          if (!alreadyRead) {
            return {
              ...msg,
              readBy: [...existingReadBy, readByEntry],
            };
          }
        }
        return msg;
      });
    });
  }, []);

  const reactionAddedHandler = useCallback((data: { messageId: string; reaction: { emoji: string; userId: string; username: string; createdAt: string } }) => {
    setMessageReactions(prev => {
      const newReactions = { ...prev };
      const messageReactions = { ...newReactions[data.messageId] } || {};
      const reaction = messageReactions[data.reaction.emoji] || { users: [], count: 0 };
      if (!reaction.users.includes(data.reaction.username)) {
        reaction.users.push(data.reaction.username);
        reaction.count = reaction.users.length;
        messageReactions[data.reaction.emoji] = reaction;
        newReactions[data.messageId] = messageReactions;
      }
      return newReactions;
    });
  }, []);

  const reactionRemovedHandler = useCallback((data: { messageId: string; reaction: { emoji: string; userId: string; username: string } }) => {
    setMessageReactions(prev => {
      const newReactions = { ...prev };
      const messageReactions = { ...newReactions[data.messageId] };
      if (messageReactions) {
        const reaction = { ...messageReactions[data.reaction.emoji] };
        reaction.users = reaction.users.filter(u => u !== data.reaction.username);
        reaction.count = reaction.users.length;
        if (reaction.count === 0) {
          delete messageReactions[data.reaction.emoji];
        } else {
          messageReactions[data.reaction.emoji] = reaction;
        }
        if (Object.keys(messageReactions).length === 0) {
          delete newReactions[data.messageId];
        } else {
          newReactions[data.messageId] = messageReactions;
        }
      }
      return newReactions;
    });
  }, []);


  // Fetch initial messages with pagination
  const {
    data: messagesData,
    isSuccess: messagesQuerySuccess,
    refetch: refetchMessages,
  } = useGetMessagesQuery(
    isDiscussion
      ? { discussionId: discussionId!, page: currentPage, limit: 50 }
      : { topicId: topicId!, page: currentPage, limit: 50 },
    {
      refetchOnMountOrArgChange: true,
      refetchOnFocus: false,
      refetchOnReconnect: true,
      pollingInterval: 0, // Disable polling for initial load, we'll handle pagination manually
      skip: !chatId, // Skip if chatId is not available
    }
  );
  const [sendMessage] = useSendMessageMutation();
  const [markChatRead] = useMarkChatReadMutation();
  const [addReaction] = useAddReactionMutation();
  const [removeReaction] = useRemoveReactionMutation();


  const dedupeAndSort = useCallback((list: Message[]) => {
    const map = new Map<string, Message>();
    list.forEach((m) => map.set(m.id, m));
    return Array.from(map.values()).sort(
      (a, b) => new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime()
    );
  }, []);

  // Initialize/merge messages from API (initial load + pagination)
  useEffect(() => {
    if (!messagesData?.messages || !chatId) return;

    // CRITICAL: Filter messages to only include those for the current chat (topic or discussion)
    const chatMessages = isDiscussion
      ? messagesData.messages.filter(m => m.discussionId === discussionId)
      : messagesData.messages.filter(m => m.topicId === topicId);

    if (chatMessages.length === 0) {
      return;
    }

    const sortedMessages = [...chatMessages].sort(
      (a, b) => new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime()
    );

    // Update pagination info
    if (messagesData.pagination) {
      const { page, totalPages } = messagesData.pagination;
      setHasMore(page < totalPages);
      console.log('[ChannelChat] 📊 Pagination:', { page, totalPages, hasMore: page < totalPages });
    }

    // First load (page 1)
    if (isInitialLoad && currentPage === 1) {
      setMessages(dedupeAndSort(sortedMessages));
      messageIdsRef.current = new Set(sortedMessages.map(m => m.id));
      apiMessageCountRef.current = sortedMessages.length;
      setAllLoadedPages(new Set([1]));
      console.log('[ChannelChat] 📥 Loaded', sortedMessages.length, 'messages from API for', isDiscussion ? 'discussion' : 'topic', ':', chatId, 'page:', currentPage);
      setIsInitialLoad(false);
      setIsLoadingMore(false);
      return;
    }

    // Loading more (pagination) - prepend older messages
    if (isLoadingMore && currentPage > 1 && !allLoadedPages.has(currentPage)) {
      const container = messagesContainerRef.current;
      const previousScrollHeight = container?.scrollHeight || 0;
      const previousScrollTop = container?.scrollTop || 0;

      setMessages((prev) => {
        const currentChatMessages = isDiscussion
          ? prev.filter(m => m.discussionId === discussionId)
          : prev.filter(m => m.topicId === topicId);
        const newOnes = sortedMessages.filter((m) => !messageIdsRef.current.has(m.id));
        if (newOnes.length > 0) {
          newOnes.forEach((m) => messageIdsRef.current.add(m.id));
          const merged = dedupeAndSort([...newOnes, ...currentChatMessages]);
          console.log('[ChannelChat] 📥 Loaded', newOnes.length, 'older messages (page', currentPage, ')');

          // Restore scroll position after DOM update
          requestAnimationFrame(() => {
            if (container) {
              const newScrollHeight = container.scrollHeight;
              const scrollDiff = newScrollHeight - previousScrollHeight;
              container.scrollTop = previousScrollTop + scrollDiff;
            }
          });

          return merged;
        }
        return prev;
      });

      setAllLoadedPages(prev => new Set([...prev, currentPage]));
      setIsLoadingMore(false);
      isLoadingMoreRef.current = false;
      return;
    }

    // Subsequent refetch (e.g., reconnect) — merge any messages we might have missed
    setMessages((prev) => {
      const currentChatMessages = isDiscussion
        ? prev.filter(m => m.discussionId === discussionId)
        : prev.filter(m => m.topicId === topicId);
      const newOnes = sortedMessages.filter((m) => !messageIdsRef.current.has(m.id));
      if (!newOnes.length) {
        if (currentChatMessages.length !== prev.length) {
          console.log('[ChannelChat] 🧹 Cleaned up', prev.length - currentChatMessages.length, 'messages from other chats');
          return dedupeAndSort(currentChatMessages);
        }
        return prev;
      }
      newOnes.forEach((m) => messageIdsRef.current.add(m.id));
      const merged = dedupeAndSort([...currentChatMessages, ...newOnes]);
      console.log('[ChannelChat] 🔄 Merged', newOnes.length, 'missed messages from API refetch for', isDiscussion ? 'discussion' : 'topic', ':', chatId);
      return merged;
    });
  }, [messagesData, isInitialLoad, currentPage, isLoadingMore, allLoadedPages, dedupeAndSort, chatId, isDiscussion, discussionId, topicId]);

  // Auto-mark chat as read when viewed (bulk operation)
  useEffect(() => {
    if (!chatId || !user?.id) return;

    // Mark entire chat as read (more efficient than per-message calls)
    markChatRead(chatId).catch(err => console.warn('Failed to mark chat as read:', err));
  }, [chatId, user?.id, markChatRead]);

  // Real-time message handler with deduplication - optimized for performance
  const handleNewMessage = useCallback((newMessage: Message) => {
    // Check if message belongs to current chat (topic or discussion)
    const messageMatches = isDiscussion
      ? newMessage.discussionId === chatId
      : newMessage.topicId === chatId;

    if (!messageMatches) {
      return;
    }

    // Enhanced deduplication: check both ID and content-based duplicate detection
    if (messageIdsRef.current.has(newMessage.id)) {
      console.log('[ChannelChat] ⏭️ Duplicate message by ID, ignoring:', newMessage.id);
      return;
    }

    // Additional check: prevent content-based duplicates within last few messages
    const isContentDuplicate = messages.some(msg =>
      msg.userId === newMessage.userId &&
      msg.content === newMessage.content &&
      Math.abs(new Date(msg.createdAt).getTime() - new Date(newMessage.createdAt).getTime()) < 5000 // Within 5 seconds
    );

    if (isContentDuplicate) {
      console.log('[ChannelChat] ⏭️ Content-based duplicate message, ignoring:', newMessage.id);
      return;
    }

    messageIdsRef.current.add(newMessage.id);
    lastSocketMessageTimeRef.current = Date.now();

    // Use requestAnimationFrame to batch DOM updates and prevent forced reflows
    requestAnimationFrame(() => {
      setMessages((prev) => {
        // Filter first to ensure safety
        const currentChatMessages = isDiscussion
          ? prev.filter(m => m.discussionId === chatId)
          : prev.filter(m => m.topicId === chatId);

        // Optimization: If empty or new message is newer than last, just append (O(1))
        const lastMsg = currentChatMessages[currentChatMessages.length - 1];
        const newTime = new Date(newMessage.createdAt).getTime();

        if (!lastMsg || newTime >= new Date(lastMsg.createdAt).getTime()) {
          return [...currentChatMessages, newMessage];
        }

        // Fallback: If out of order, find insertion point (O(N))
        let insertIndex = 0;
        for (let i = currentChatMessages.length - 1; i >= 0; i--) {
          if (newTime >= new Date(currentChatMessages[i].createdAt).getTime()) {
            insertIndex = i + 1;
            break;
          }
        }

        const newMessages = [...currentChatMessages];
        newMessages.splice(insertIndex, 0, newMessage);
        return newMessages;
      });
    });
  }, [isDiscussion, chatId, messages]);

  // Socket message handler - defined outside useEffect to avoid recreation
  const messageHandler = useCallback((newMessage: Message) => {
    // CRITICAL: Only process messages for the current chat (topic or discussion)
    const currentChatId = chatId;
    const shouldProcess = isDiscussion
      ? newMessage.discussionId === currentChatId
      : newMessage.topicId === currentChatId;

    if (!shouldProcess) {
      console.log('[ChannelChat] ⏭️ [SOCKET] Ignoring message from different chat:', {
        messageTopicId: newMessage.topicId,
        messageDiscussionId: newMessage.discussionId,
        currentChatId,
        isDiscussion,
        messageId: newMessage.id,
      });
      return;
    }

    socketMessageCountRef.current += 1;
    console.log('[ChannelChat] 📨 [SOCKET] Received new-message event (#', socketMessageCountRef.current, '):', {
      messageId: newMessage.id,
      messageTopicId: newMessage.topicId,
      messageDiscussionId: newMessage.discussionId,
      currentChatId,
      isDiscussion,
      userId: newMessage.userId,
      content: newMessage.content?.substring(0, 50),
      source: 'SOCKET',
      timestamp: new Date().toISOString(),
    });

    // Message already filtered by chat ID above, so process it
    console.log('[ChannelChat] ✅ Processing SOCKET message for current', isDiscussion ? 'discussion' : 'topic');
    // Immediately process the message - handleNewMessage handles deduplication
    try {
      handleNewMessage(newMessage);
    } catch (error) {
      console.error('[ChannelChat] ❌ Error processing message:', error);
    }
  }, [isDiscussion, chatId, handleNewMessage]);

  // Function to join room
  const joinRoom = useCallback(() => {
    const effectiveTopicId = isDiscussion ? (discussion?.topicId || topicId) : topicId;
    if (socket && socket.connected) {
      if (isDiscussion && discussionId) {
        // Join discussion room
        console.log('[ChannelChat] 🚪 Joining discussion room:', discussionId, 'Socket ID:', socket.id);
        socket.emit('join-discussion', { discussionId }, (response: { success?: boolean; error?: string; discussionId?: string; roomSize?: number }) => {
          if (response?.success) {
            console.log('[ChannelChat] ✅ Successfully joined discussion room:', discussionId, 'Room size:', response.roomSize);
            console.log('[ChannelChat] 📡 Ready to receive real-time messages for discussion:', discussionId);
            console.log('[ChannelChat] ✅ Socket setup complete - messages will arrive in real-time');
          } else {
            console.error('[ChannelChat] ❌ Failed to join discussion room:', response);
          }
        });
      } else if (effectiveTopicId) {
        // Join topic room
        console.log('[ChannelChat] 🚪 Joining topic room:', effectiveTopicId, 'Socket ID:', socket.id);
        socket.emit('join-topic', { topicId: effectiveTopicId }, (response: { success?: boolean; error?: string; topicId?: string; roomSize?: number }) => {
          if (response?.success) {
            console.log('[ChannelChat] ✅ Successfully joined topic room:', effectiveTopicId, 'Room size:', response.roomSize);
            console.log('[ChannelChat] 📡 Ready to receive real-time messages for topic:', effectiveTopicId);
            console.log('[ChannelChat] ✅ Socket setup complete - messages will arrive in real-time');
          } else {
            console.error('[ChannelChat] ❌ Failed to join topic room:', response);
          }
        });
      }
    } else {
      console.warn('[ChannelChat] ⚠️ Socket not connected, cannot join room');
    }
  }, [socket, isDiscussion, discussionId, topicId, discussion?.topicId]);

  // Function to setup listeners
  const setupListeners = useCallback(() => {
    if (!socket) return;

    // Prevent duplicate listener registration for the same chat
    if (listenersRegisteredRef.current && currentChatIdRef.current === chatId) {
      console.log('[ChannelChat] ⏭️ Listeners already registered for chat:', chatId);
      return;
    }

    // Clean up existing listeners only if switching chats
    if (listenersRegisteredRef.current && currentChatIdRef.current !== chatId) {
      console.log('[ChannelChat] 🧹 Cleaning up listeners for previous chat:', currentChatIdRef.current);
      socket.removeAllListeners('new-message');
      socket.removeAllListeners('user-typing');
      socket.removeAllListeners('message-read');
      socket.removeAllListeners('reaction-added');
      socket.removeAllListeners('reaction-removed');
      listenersRegisteredRef.current = false;
    }

    // Set up new listeners
    socket.on('new-message', messageHandler);
    socket.on('user-typing', typingHandler);
    socket.on('message-read', messageReadHandler);
    socket.on('reaction-added', reactionAddedHandler);
    socket.on('reaction-removed', reactionRemovedHandler);

    listenersRegisteredRef.current = true;
    currentChatIdRef.current = chatId;

    const listenerCount = socket.listeners('new-message').length;
    console.log('[ChannelChat] ✅ Socket listeners registered for', isDiscussion ? 'discussion' : 'topic', ':', chatId);
    console.log('[ChannelChat] 📋 Listener count - new-message:', listenerCount);
    if (listenerCount !== 1) {
      console.warn('[ChannelChat] ⚠️ Expected 1 new-message listener, found', listenerCount);
    }
  }, [socket, messageHandler, typingHandler, messageReadHandler, reactionAddedHandler, reactionRemovedHandler, isDiscussion, chatId]);

  // Handle reconnection
  const reconnectHandler = useCallback(() => {
    console.log('[ChannelChat] 🔄 Socket reconnected, joining room and setting up listeners');
    setTimeout(() => {
      joinRoom();
      // Setup listeners AFTER joining room to ensure proper order
      setTimeout(() => {
        setupListeners();
        // Only refetch if we haven't received recent messages via socket
        const timeSinceLastSocketMessage = Date.now() - (lastSocketMessageTimeRef.current || 0);
        if (timeSinceLastSocketMessage > 5000 && messagesQuerySuccess) {
          console.log('[ChannelChat] 🔄 Refetching messages after reconnection (no recent socket messages)');
          refetchMessages().catch((err) => console.warn('Refetch on reconnect failed', err));
        } else {
          console.log('[ChannelChat] ⏭️ Skipping refetch - recent socket messages indicate connection was stable');
        }
      }, 100);
    }, 200);
  }, [joinRoom, setupListeners, messagesQuerySuccess, refetchMessages]);

  // Socket connection and message listeners - CRITICAL: Must be set up correctly for real-time
  useEffect(() => {
    // For discussions, we need topicId from the discussion object or URL params
    const effectiveTopicId = isDiscussion ? (discussion?.topicId || topicId) : topicId;

    if (!socket || (!effectiveTopicId && !discussionId)) {
      console.log('[ChannelChat] ⚠️ Socket or topicId/discussionId not available:', {
        socket: !!socket,
        topicId,
        discussionId,
        effectiveTopicId,
        isDiscussion
      });
      return;
    }

    console.log('[ChannelChat] 🔧 Setting up socket for:', isDiscussion ? `discussion ${discussionId}` : `topic ${effectiveTopicId}`, {
      socketConnected: socket.connected,
      socketId: socket.id,
      isConnected,
    });

    // Set up reconnection handler
    socket.off('reconnect', reconnectHandler);
    socket.on('reconnect', reconnectHandler);

    // Join room if already connected, otherwise wait for connection
    if (socket.connected) {
      console.log('[ChannelChat] 🔌 Socket already connected, joining room and setting up listeners');
      setTimeout(() => {
        joinRoom();
        setTimeout(() => setupListeners(), 100);
      }, 100);
    } else {
      console.log('[ChannelChat] ⏳ Socket not connected, waiting for connection...');
      const connectHandler = () => {
        console.log('[ChannelChat] 🔌 Socket connected, joining room and setting up listeners');
        setTimeout(() => {
          joinRoom();
          setTimeout(() => {
            setupListeners();
            // Only refetch if query has been executed successfully
            if (messagesQuerySuccess) {
              refetchMessages().catch((err) => console.warn('Refetch on connect failed', err));
            }
          }, 100);
        }, 100);
      };
      socket.off('connect', connectHandler);
      socket.once('connect', connectHandler);
    }

    // Cleanup function
    return () => {
      const cleanupTopicId = isDiscussion ? (discussion?.topicId || topicId) : topicId;
      console.log('[ChannelChat] 🧹 Cleaning up socket listeners for', isDiscussion ? 'discussion' : 'topic', ':', chatId);

      // Only remove listeners if this component is managing them
      if (listenersRegisteredRef.current && currentChatIdRef.current === chatId) {
        socket.off('new-message', messageHandler);
        socket.off('user-typing', typingHandler);
        socket.off('message-read', messageReadHandler);
        socket.off('reaction-added', reactionAddedHandler);
        socket.off('reaction-removed', reactionRemovedHandler);
        listenersRegisteredRef.current = false;
        currentChatIdRef.current = '';
      }

      socket.off('reconnect', reconnectHandler);
      if (socket.connected) {
        if (isDiscussion && discussionId) {
          socket.emit('leave-discussion', { discussionId });
        } else if (cleanupTopicId) {
          socket.emit('leave-topic', { topicId: cleanupTopicId });
        }
      }
    };
  }, [socket, chatId, isDiscussion, discussionId, topicId, user?.id, messageHandler, typingHandler, messageReadHandler, reactionAddedHandler, reactionRemovedHandler, reconnectHandler, joinRoom, setupListeners, isConnected]);

  // Load more messages when scrolling to top (infinite scroll) - MUST be defined before useEffect that uses it
  const loadMoreMessages = useCallback(async () => {
    if (!topicId || isLoadingMoreRef.current || !hasMore || isLoadingMore) {
      return;
    }

    const nextPage = currentPage + 1;
    if (allLoadedPages.has(nextPage)) {
      return; // Already loaded this page
    }

    console.log('[ChannelChat] 📥 Loading more messages, page:', nextPage);
    isLoadingMoreRef.current = true;
    setIsLoadingMore(true);
    setCurrentPage(nextPage);
  }, [chatId, isDiscussion, discussionId, topicId, currentPage, hasMore, isLoadingMore, allLoadedPages]);

  // Improved scroll behavior - only auto-scroll if user is near bottom (like Instagram/WhatsApp)
  useEffect(() => {
    if (!messagesContainerRef.current || !messagesEndRef.current) return;

    const container = messagesContainerRef.current;
    const isNearBottom = container.scrollHeight - container.scrollTop - container.clientHeight < 150;

    // Always scroll to bottom on initial load or when new messages arrive and user is near bottom
    if (isInitialLoad || isNearBottom) {
      // Use requestAnimationFrame for smoother scrolling
      requestAnimationFrame(() => {
        if (messagesEndRef.current && messagesContainerRef.current) {
          // Scroll to bottom smoothly
          messagesContainerRef.current.scrollTo({
            top: messagesContainerRef.current.scrollHeight,
            behavior: isInitialLoad ? 'auto' : 'smooth',
          });
        }
      });
    }
  }, [messages, isInitialLoad]);

  // Handle scroll for infinite scroll and scroll position tracking
  const handleScroll = useCallback((e: React.UIEvent<HTMLDivElement>) => {
    const container = e.currentTarget;
    const scrollTop = container.scrollTop;
    const scrollHeight = container.scrollHeight;
    const clientHeight = container.clientHeight;

    const isNearBottom = scrollHeight - scrollTop - clientHeight < 100;
    setIsScrolledToBottom(isNearBottom);

    // Load more messages when scrolling near top (within 200px)
    const isNearTop = scrollTop < 200;
    if (isNearTop && hasMore && !isLoadingMore && !isLoadingMoreRef.current) {
      loadMoreMessages();
    }
  }, [hasMore, isLoadingMore, loadMoreMessages]);

  // Filter messages based on search
  const filteredMessages = searchQuery.trim()
    ? messages.filter((msg) =>
      msg.content.toLowerCase().includes(searchQuery.toLowerCase()) ||
      msg.user.username.toLowerCase().includes(searchQuery.toLowerCase())
    )
    : messages;

  const handleSendMessage = async () => {
    if (!message.trim() || !chatId) return;

    const messageContent = message.trim();
    const replyToId = replyToMessage?.id;
    setMessage('');
    setReplyToMessage(null);

    // Optimistic update - add message immediately to local state
    const tempId = `temp-${Date.now()}`;
    const optimisticMessage: Message = {
      id: tempId,
      ...(isDiscussion ? { discussionId } : { topicId }),
      userId: user?.id || '',
      user: {
        id: user?.id || '',
        username: user?.username || user?.email?.split('@')[0] || 'You',
        email: user?.email || '',
      },
      content: messageContent,
      replyToId,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
      edited: false,
      deleted: false,
    };

    // Add optimistic message (only if it belongs to current chat)
    setMessages((prev) => {
      const currentChatMessages = isDiscussion
        ? prev.filter(m => m.discussionId === discussionId)
        : prev.filter(m => m.topicId === topicId);
      return dedupeAndSort([...currentChatMessages, optimisticMessage]);
    });
    messageIdsRef.current.add(tempId);

    // Prefer socket for sending to ensure broadcast to joined room
    const sendViaSocket = () =>
      new Promise<void>((resolve, reject) => {
        if (!socket || !isConnected) {
          reject(new Error('Socket not connected'));
          return;
        }
        const messageData = isDiscussion
          ? { discussionId, content: messageContent, replyToId }
          : { topicId, content: messageContent, replyToId };
        socket.emit(
          'send-message',
          messageData,
          (response: { success?: boolean; error?: string; message?: Message; warning?: string }) => {
            if (response?.success && response.message) {
              // Replace optimistic with server message (only current chat messages)
              setMessages((prev) => {
                const currentChatMessages = isDiscussion
                  ? prev.filter(m => m.discussionId === discussionId)
                  : prev.filter(m => m.topicId === topicId);
                const filtered = currentChatMessages.filter((m) => m.id !== tempId);
                return dedupeAndSort([...filtered, response.message!]);
              });
              messageIdsRef.current.delete(tempId);
              messageIdsRef.current.add(response.message.id);
              if (response.warning) {
                console.warn('[ChannelChat] ⚠️ [SOCKET]', response.warning);
              } else {
                console.log('[ChannelChat] 📤 [SOCKET] Message sent via socket and acknowledged');
              }
              resolve();
            } else if (response?.success) {
              // Message was saved but no message object returned (shouldn't happen in normal flow)
              setMessages((prev) => {
                const currentChatMessages = isDiscussion
                  ? prev.filter(m => m.discussionId === discussionId)
                  : prev.filter(m => m.topicId === topicId);
                return currentChatMessages.filter((m) => m.id !== tempId);
              });
              messageIdsRef.current.delete(tempId);
              console.warn('[ChannelChat] ⚠️ [SOCKET] Message saved but no message object returned');
              resolve();
            } else {
              reject(new Error(response?.error || 'Socket send failed'));
            }
          }
        );
        // Safety timeout
        setTimeout(() => reject(new Error('Socket send timeout')), 5000);
      });

    try {
      await sendViaSocket();
    } catch (socketErr) {
      console.warn('[ChannelChat] ⚠️ Socket send failed, falling back to API:', socketErr);
      // Check if message was already saved (might have been saved before error)
      // Wait a bit to see if socket message arrives
      await new Promise(resolve => setTimeout(resolve, 500));

      // Check if we already have the message (by checking if tempId was replaced)
      const hasMessage = messageIdsRef.current.has(tempId) === false &&
        Array.from(messageIdsRef.current).some(id => {
          const msg = messages.find(m => m.id === id);
          return msg && msg.content === messageContent;
        });

      if (hasMessage) {
        console.log('[ChannelChat] ✅ Message already received via socket, skipping API fallback');
        return;
      }

      try {
        const messagePayload = isDiscussion
          ? { discussionId, content: messageContent, replyToId }
          : { topicId, content: messageContent, replyToId };
        const savedMessage = await sendMessage(messagePayload).unwrap();
        // Check for duplicates before adding
        if (messageIdsRef.current.has(savedMessage.id)) {
          console.log('[ChannelChat] ⏭️ Duplicate message from API fallback, ignoring:', savedMessage.id);
          setMessages((prev) => {
            const currentChatMessages = isDiscussion
              ? prev.filter(m => m.discussionId === discussionId)
              : prev.filter(m => m.topicId === topicId);
            return currentChatMessages.filter((m) => m.id !== tempId);
          });
          messageIdsRef.current.delete(tempId);
          return;
        }
        // Replace optimistic message with real message (only current chat messages)
        console.log('[ChannelChat] 📤 [API] Message sent successfully (socket fallback)');
        setMessages((prev) => {
          const currentChatMessages = isDiscussion
            ? prev.filter(m => m.discussionId === discussionId)
            : prev.filter(m => m.topicId === topicId);
          const filtered = currentChatMessages.filter((m) => m.id !== tempId);
          return dedupeAndSort([...filtered, savedMessage]);
        });
        messageIdsRef.current.delete(tempId);
        messageIdsRef.current.add(savedMessage.id);
      } catch (apiErr) {
        console.error('Failed to send message:', apiErr);
        // Remove optimistic message on error (only current chat messages)
        setMessages((prev) => {
          const currentChatMessages = isDiscussion
            ? prev.filter(m => m.discussionId === discussionId)
            : prev.filter(m => m.topicId === topicId);
          return currentChatMessages.filter((m) => m.id !== tempId);
        });
        messageIdsRef.current.delete(tempId);
        const errorObj = apiErr as { data?: { message?: string; error?: string }; message?: string };
        const errorMsg =
          errorObj?.data?.message ||
          errorObj?.data?.error ||
          errorObj?.message ||
          'Failed to send message. Please try again.';
        setSnackbar({
          open: true,
          message: errorMsg,
          severity: 'error',
        });
        setMessage(messageContent); // Restore message on error
      }
    }
  };

  const handleTyping = useCallback((isTyping: boolean) => {
    if (socket && chatId) {
      if (isDiscussion && discussionId) {
        socket.emit('typing', { discussionId, isTyping });
      } else if (topicId) {
        socket.emit('typing', { topicId, isTyping });
      }
    }
  }, [socket, chatId, isDiscussion, discussionId, topicId]);

  const handleBlockUser = useCallback((userId: string, username: string) => {
    setSelectedUser({ id: userId, username });
    setBlockDialogOpen(true);
  }, [setSelectedUser, setBlockDialogOpen]);

  const handleUserClick = useCallback((userId: string, username: string, email: string) => {
    setSelectedProfileUser({ id: userId, username, email });
    setProfileDialogOpen(true);
  }, [setSelectedProfileUser, setProfileDialogOpen]);

  const handleReaction = useCallback(async (messageId: string, emoji: string) => {
    if (!user?.id) return;

    try {
      const currentReactions = messageReactions[messageId] || {};
      const currentReaction = currentReactions[emoji];
      const userReacted = currentReaction?.users.includes(user.username);

      if (userReacted) {
        // Remove reaction
        await removeReaction({ messageId, emoji }).unwrap();
        // Update local state
        setMessageReactions(prev => {
          const newReactions = { ...prev };
          const messageReactions = { ...newReactions[messageId] };
          const reaction = { ...messageReactions[emoji] };
          reaction.users = reaction.users.filter(u => u !== user.username);
          reaction.count = reaction.users.length;
          if (reaction.count === 0) {
            delete messageReactions[emoji];
          } else {
            messageReactions[emoji] = reaction;
          }
          if (Object.keys(messageReactions).length === 0) {
            delete newReactions[messageId];
          } else {
            newReactions[messageId] = messageReactions;
          }
          return newReactions;
        });
      } else {
        // Add reaction
        await addReaction({ messageId, emoji }).unwrap();
        // Update local state
        setMessageReactions(prev => {
          const newReactions = { ...prev };
          const messageReactions = { ...newReactions[messageId] } || {};
          const reaction = messageReactions[emoji] || { users: [], count: 0 };
          reaction.users.push(user.username);
          reaction.count = reaction.users.length;
          messageReactions[emoji] = reaction;
          newReactions[messageId] = messageReactions;
          return newReactions;
        });
      }
    } catch (error) {
      console.error('Failed to toggle reaction:', error);
      setSnackbar({
        open: true,
        message: 'Failed to update reaction',
        severity: 'error',
      });
    }
  }, [user?.id, user?.username, messageReactions, addReaction, removeReaction]);

  const handleReply = useCallback((message: Message) => {
    setReplyToMessage(message);
  }, []);

  // const handleScrollToBottom = () => {
  //   if (messagesEndRef.current) {
  //     messagesEndRef.current.scrollIntoView({ behavior: 'smooth' });
  //   }
  // };


  if (isLoadingChat) {
    return (
      <UnifiedChatLayout>
        <Box sx={{ display: 'flex', justifyContent: 'center', alignItems: 'center', height: '100%' }}>
          <CircularProgress />
        </Box>
      </UnifiedChatLayout>
    );
  }

  if (!chatData) {
    return (
      <UnifiedChatLayout>
        <Box sx={{ p: 4, textAlign: 'center', height: '100%', display: 'flex', flexDirection: 'column', justifyContent: 'center' }}>
          <Typography variant="h6" color="error" sx={{ mb: 2 }}>
            {isDiscussion ? 'Discussion' : 'Topic'} not found
          </Typography>
          <Button variant="contained" onClick={() => navigate(isDiscussion ? `/chat/topic/${discussion?.topicId}/discussions` : '/chat/topics')}>
            {isDiscussion ? 'Back to Discussions' : 'Back to Channels'}
          </Button>
        </Box>
      </UnifiedChatLayout>
    );
  }

  return (
    <UnifiedChatLayout>
      <Box sx={{
        flex: 1,
        display: 'flex',
        flexDirection: 'column',
        height: '100%',
        minHeight: 0,
        overflow: 'hidden',
        background: theme.palette.mode === 'light'
          ? `linear-gradient(135deg, #f8fafc 0%, #f1f5f9 100%)`
          : `linear-gradient(135deg, #0f0f23 0%, #1a1a2e 50%, #16213e 100%)`,
        position: 'relative',
        '&::before': {
          content: '""',
          position: 'absolute',
          top: 0,
          left: 0,
          right: 0,
          bottom: 0,
          background: theme.palette.mode === 'light'
            ? `radial-gradient(circle at 20% 80%, rgba(14, 165, 233, 0.03) 0%, transparent 50%),
               radial-gradient(circle at 80% 20%, rgba(99, 102, 241, 0.03) 0%, transparent 50%)`
            : `radial-gradient(circle at 20% 80%, rgba(59, 130, 246, 0.15) 0%, transparent 50%),
               radial-gradient(circle at 80% 20%, rgba(168, 85, 247, 0.15) 0%, transparent 50%)`,
          pointerEvents: 'none',
          zIndex: 0,
        },
      }}>
        {/* Modern Header */}
        <Box
          sx={{
            flexShrink: 0, // CRITICAL: Prevent header from shrinking
            p: { xs: 1.5, sm: 3 },
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            background: theme.palette.mode === 'light'
              ? 'linear-gradient(135deg, rgba(255, 255, 255, 0.95) 0%, rgba(248, 250, 252, 0.95) 100%)'
              : 'linear-gradient(135deg, rgba(15, 23, 42, 0.95) 0%, rgba(30, 41, 59, 0.95) 100%)',
            backdropFilter: 'blur(30px)',
            borderBottom: `1px solid ${alpha(theme.palette.mode === 'light' ? '#667eea' : '#3b82f6', 0.2)}`,
            boxShadow: theme.palette.mode === 'light'
              ? '0 2px 16px rgba(102, 126, 234, 0.1), 0 1px 8px rgba(0, 0, 0, 0.08)'
              : '0 2px 16px rgba(59, 130, 246, 0.15), 0 1px 8px rgba(0, 0, 0, 0.3)',
            zIndex: 10,
          }}
        >
          <Stack direction="row" spacing={2} alignItems="center">
            {isMobile && (
              <IconButton onClick={() => navigate(-1)} size="small">
                <ArrowLeft size={20} />
              </IconButton>
            )}
            <Avatar
              sx={{
                width: 44,
                height: 44,
                background: `linear-gradient(135deg, ${theme.palette.primary.main} 0%, ${theme.palette.secondary.main} 100%)`,
                color: 'white',
              }}
            >
              {isDiscussion ? 'D' : (topic?.title?.charAt(0) || '#')}
            </Avatar>
            <Box>
              <Typography variant="subtitle1" fontWeight={700} sx={{ lineHeight: 1.2 }}>
                {isDiscussion ? discussion?.title : topic?.title}
              </Typography>
              <Typography component="span" variant="caption" color="text.secondary" sx={{ display: 'flex', alignItems: 'center', gap: 0.5 }}>
                <Box
                  sx={{
                    width: 8,
                    height: 8,
                    borderRadius: '50%',
                    bgcolor: isConnected ? '#4caf50' : '#f44336',
                    boxShadow: isConnected ? `0 0 8px ${alpha('#4caf50', 0.5)}` : 'none',
                  }}
                />
                {isConnected ? 'Connected' : 'Reconnecting...'}
                {typingUsers.size > 0 && (
                  <>
                    {' • '}
                    <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.3 }}>
                      <div className="typing-indicator">
                        <span></span><span></span><span></span>
                      </div>
                      {typingUsers.size === 1
                        ? `${Array.from(typingUsers)[0]} typing...`
                        : typingUsers.size === 2
                          ? `${Array.from(typingUsers)[0]}, ${Array.from(typingUsers)[1]} typing...`
                          : `${Array.from(typingUsers)[0]} and ${typingUsers.size - 1} others typing...`
                      }
                    </Box>
                  </>
                )}
              </Typography>
            </Box>
          </Stack>

          <Stack direction="row" spacing={1}>
            <IconButton
              size="small"
              onClick={handleToggleMute}
              title={isMuted ? 'Unmute' : 'Mute'}
              sx={{ color: isMuted ? theme.palette.text.secondary : 'inherit' }}
            >
              {isMuted ? <BellOff size={20} /> : <Bell size={20} />}
            </IconButton>
            <IconButton size="small" onClick={() => setShowSearch(!showSearch)}>
              <Search size={20} />
            </IconButton>
            <IconButton size="small"><Info size={20} /></IconButton>
            <IconButton size="small"><MoreVertical size={20} /></IconButton>
          </Stack>
        </Box>

        {/* Search Bar */}
        <Collapse in={showSearch}>
          <Box sx={{ px: 2, py: 1.5, borderBottom: `1px solid ${alpha(theme.palette.divider, 0.08)}`, bgcolor: alpha(theme.palette.background.paper, 0.5) }}>
            <TextField
              fullWidth
              size="small"
              placeholder="Search in conversation..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              InputProps={{
                startAdornment: <Search size={16} style={{ marginRight: 8, opacity: 0.5 }} />,
                endAdornment: searchQuery && (
                  <IconButton size="small" onClick={() => setSearchQuery('')}><X size={16} /></IconButton>
                )
              }}
              sx={{ '& .MuiOutlinedInput-root': { borderRadius: '12px' } }}
            />
          </Box>
        </Collapse>

        {/* Connection Status Box */}
        {(connectionStatus === 'error' || connectionStatus === 'disconnected') && (
          <Box sx={{ px: 2, py: 1 }}>
            <Alert severity="warning" variant="outlined" sx={{ borderRadius: '12px', py: 0 }}>
              {connectionStatus === 'error' ? 'Connection lost. Real-time updates paused.' : 'Connecting to chat server...'}
            </Alert>
          </Box>
        )}

        {/* Messages Window */}
        <Box
          ref={messagesContainerRef}
          onScroll={handleScroll}
          sx={{
            flex: 1,
            flexGrow: 1, // Explicitly allow growing
            minHeight: 0, // CRITICAL: Allow container to shrink for scrolling
            overflowY: 'auto',
            overflowX: 'hidden',
            p: { xs: 2, sm: 3 },
            display: 'flex',
            flexDirection: 'column',
            gap: 0.5,
            scrollBehavior: 'smooth',
            '&::-webkit-scrollbar': { width: '6px' },
            '&::-webkit-scrollbar-thumb': {
              background: alpha(theme.palette.text.primary, 0.1),
              borderRadius: '10px',
            },
          }}
        >
          {isLoadingMore && (
            <Box sx={{ display: 'flex', justifyContent: 'center', py: 2 }}>
              <CircularProgress size={24} thickness={5} />
            </Box>
          )}

          {filteredMessages.map((msg, index) => (
            <MessageBubble
              key={msg.id}
              message={msg}
              isOwnMessage={msg.userId === user?.id}
              showAvatar={index === 0 || filteredMessages[index - 1].userId !== msg.userId}
              showUsername={!isDiscussion && (index === 0 || filteredMessages[index - 1].userId !== msg.userId)}
              prevMessage={index > 0 ? filteredMessages[index - 1] : null}
              onUserClick={handleUserClick}
              onBlockUser={handleBlockUser}
              onReaction={handleReaction}
              reactions={messageReactions[msg.id]}
              currentUsername={user?.username}
              onReply={handleReply}
            />
          ))}

          {typingUsers.size > 0 && (
            <Box sx={{
              display: 'flex',
              alignItems: 'center',
              gap: 1.5,
              ml: 1,
              mt: 1,
              opacity: 0.8,
              px: 2,
              py: 1,
            }}>
              <Avatar
                sx={{
                  width: 28,
                  height: 28,
                  bgcolor: 'linear-gradient(135deg, #6366f1 0%, #10b981 100%)',
                  fontSize: 12,
                  fontWeight: 600,
                }}
              >
                {Array.from(typingUsers)[0].charAt(0).toUpperCase()}
              </Avatar>
              <Box sx={{ display: 'flex', gap: 0.5 }}>
                <Box
                  sx={{
                    width: 4,
                    height: 4,
                    borderRadius: '50%',
                    bgcolor: theme.palette.primary.main,
                    animation: 'typing-bounce 1.4s infinite ease-in-out',
                    '&:nth-of-type(1)': { animationDelay: '0s' },
                    '&:nth-of-type(2)': { animationDelay: '0.16s' },
                    '&:nth-of-type(3)': { animationDelay: '0.32s' },
                  }}
                />
                <Box
                  sx={{
                    width: 4,
                    height: 4,
                    borderRadius: '50%',
                    bgcolor: theme.palette.primary.main,
                    animation: 'typing-bounce 1.4s infinite ease-in-out',
                    '&:nth-of-type(1)': { animationDelay: '0s' },
                    '&:nth-of-type(2)': { animationDelay: '0.16s' },
                    '&:nth-of-type(3)': { animationDelay: '0.32s' },
                  }}
                />
                <Box
                  sx={{
                    width: 4,
                    height: 4,
                    borderRadius: '50%',
                    bgcolor: theme.palette.primary.main,
                    animation: 'typing-bounce 1.4s infinite ease-in-out',
                    '&:nth-of-type(1)': { animationDelay: '0s' },
                    '&:nth-of-type(2)': { animationDelay: '0.16s' },
                    '&:nth-of-type(3)': { animationDelay: '0.32s' },
                  }}
                />
              </Box>
              <Typography
                variant="body2"
                sx={{
                  color: 'text.secondary',
                  fontStyle: 'italic',
                  fontWeight: 500,
                  fontSize: '0.875rem',
                }}
              >
                {typingUsers.size === 1
                  ? `${Array.from(typingUsers)[0]} is typing...`
                  : typingUsers.size === 2
                    ? `${Array.from(typingUsers)[0]} and ${Array.from(typingUsers)[1]} are typing...`
                    : `${Array.from(typingUsers)[0]} and ${typingUsers.size - 1} others are typing...`
                }
              </Typography>
            </Box>
          )}

          <div ref={messagesEndRef} />
        </Box>

        {/* Floating Scroll Button */}
        {!isScrolledToBottom && messages.length > 5 && (
          <Box
            sx={{
              position: 'absolute',
              bottom: 100,
              right: 20,
              zIndex: 100,
            }}
          >
            <IconButton
              onClick={() => messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' })}
              sx={{
                bgcolor: theme.palette.primary.main,
                color: 'white',
                boxShadow: `0 4px 12px ${alpha(theme.palette.primary.main, 0.4)}`,
                '&:hover': { bgcolor: theme.palette.primary.dark },
              }}
            >
              <ArrowLeft size={20} style={{ transform: 'rotate(-90deg)' }} />
            </IconButton>
          </Box>
        )}

        {/* Input Bar */}
        <Box
          sx={{
            flexShrink: 0, // CRITICAL: Prevent input bar from disappearing
            p: { xs: 1.5, sm: 3 },
            bgcolor: theme.palette.mode === 'light'
              ? 'rgba(255, 255, 255, 0.98)'
              : 'rgba(15, 23, 42, 0.98)',
            borderTop: `1px solid ${alpha(theme.palette.divider, 0.08)}`,
            backdropFilter: 'blur(30px)',
            boxShadow: theme.palette.mode === 'light'
              ? '0 -4px 16px rgba(102, 126, 234, 0.05)'
              : '0 -4px 16px rgba(0, 0, 0, 0.4)',
            pb: { xs: 2, sm: 3 },
            position: 'relative',
            '&::before': {
              content: '""',
              position: 'absolute',
              top: 0,
              left: 0,
              right: 0,
              height: '1px',
              background: `linear-gradient(90deg, transparent 0%, ${alpha(theme.palette.primary.main, 0.2)} 50%, transparent 100%)`,
            },
          }}
        >
          <Stack spacing={1.5}>
            {/* Reply Preview */}
            {replyToMessage && (
              <Paper
                sx={{
                  p: 2,
                  borderRadius: 2,
                  bgcolor: theme.palette.mode === 'light'
                    ? 'rgba(59, 130, 246, 0.1)'
                    : 'rgba(59, 130, 246, 0.2)',
                  border: `1px solid ${theme.palette.mode === 'light' ? 'rgba(59, 130, 246, 0.3)' : 'rgba(59, 130, 246, 0.4)'}`,
                  position: 'relative',
                }}
              >
                <Stack direction="row" justifyContent="space-between" alignItems="flex-start">
                  <Box sx={{ flex: 1, minWidth: 0 }}>
                    <Typography variant="caption" color="primary" fontWeight={600}>
                      Replying to {replyToMessage.user.username}
                    </Typography>
                    <Typography
                      variant="body2"
                      sx={{
                        mt: 0.5,
                        color: 'text.secondary',
                        overflow: 'hidden',
                        textOverflow: 'ellipsis',
                        display: '-webkit-box',
                        WebkitLineClamp: 2,
                        WebkitBoxOrient: 'vertical',
                      }}
                    >
                      {replyToMessage.content}
                    </Typography>
                  </Box>
                  <IconButton
                    size="small"
                    onClick={() => setReplyToMessage(null)}
                    sx={{ ml: 1, flexShrink: 0 }}
                  >
                    <X size={16} />
                  </IconButton>
                </Stack>
              </Paper>
            )}

            <Paper
              elevation={0}
              sx={{
                display: 'flex',
                alignItems: 'center',
                p: '16px 20px',
                borderRadius: '28px',
                background: theme.palette.mode === 'light'
                  ? 'rgba(225, 225, 225, 0.9)'
                  : 'rgba(30, 41, 59, 0.9)',
                backdropFilter: 'blur(20px)',
                border: `2px solid ${alpha(theme.palette.mode === 'light' ? '#667eea' : '#3b82f6', 0.15)}`,
                boxShadow: theme.palette.mode === 'light'
                  ? '0 4px 16px rgba(102, 126, 234, 0.15), 0 2px 8px rgba(0, 0, 0, 0.08), inset 0 1px 0 rgba(255, 255, 255, 0.1)'
                  : '0 4px 16px rgba(59, 130, 246, 0.2), 0 2px 8px rgba(0, 0, 0, 0.3), inset 0 1px 0 rgba(255, 255, 255, 0.05)',
                '&:focus-within': {
                  borderColor: theme.palette.mode === 'light' ? '#667eea' : '#3b82f6',
                  background: theme.palette.mode === 'light'
                    ? 'rgba(255, 255, 255, 0.98)'
                    : 'rgba(30, 41, 59, 0.98)',
                  boxShadow: theme.palette.mode === 'light'
                    ? `0 0 0 4px ${alpha('#667eea', 0.1)}, 0 8px 24px rgba(102, 126, 234, 0.2), 0 4px 12px rgba(0, 0, 0, 0.15)`
                    : `0 0 0 4px ${alpha('#3b82f6', 0.15)}, 0 8px 24px rgba(59, 130, 246, 0.3), 0 4px 12px rgba(0, 0, 0, 0.4)`,
                  transform: 'translateY(-2px) scale(1.01)',
                },
                transition: 'all 0.4s cubic-bezier(0.4, 0, 0.2, 1)',
              }}
            >
              <EmojiPicker onEmojiSelect={(emoji) => setMessage(prev => prev + emoji)} />
              <TextField
                fullWidth
                multiline
                maxRows={4}
                placeholder="Message..."
                value={message}
                onChange={(e) => {
                  setMessage(e.target.value);
                  handleTyping(true);
                }}
                onKeyPress={(e) => {
                  if (e.key === 'Enter' && !e.shiftKey) {
                    e.preventDefault();
                    handleSendMessage();
                  }
                }}
                onBlur={() => handleTyping(false)}
                variant="standard"
                InputProps={{ disableUnderline: true }}
                sx={{ px: 2 }}
              />
              <IconButton
                color="primary"
                disabled={!message.trim() || !isConnected}
                onClick={handleSendMessage}
                sx={{
                  width: 44,
                  height: 44,
                  borderRadius: '16px',
                  background: message.trim()
                    ? 'linear-gradient(135deg, #6366f1 0%, #8b5cf6 100%)'
                    : 'transparent',
                  color: message.trim() ? 'white' : 'text.disabled',
                  boxShadow: message.trim()
                    ? '0 4px 12px rgba(99, 102, 241, 0.3)'
                    : 'none',
                  '&:hover': {
                    background: message.trim()
                      ? 'linear-gradient(135deg, #4f46e5 0%, #7c3aed 100%)'
                      : 'rgba(0,0,0,0.05)',
                    transform: message.trim() ? 'translateY(-2px)' : 'none',
                    boxShadow: message.trim()
                      ? '0 8px 16px rgba(99, 102, 241, 0.4)'
                      : 'none',
                  },
                  transition: 'all 0.3s cubic-bezier(0.4, 0, 0.2, 1)',
                }}
              >
                <Send size={20} />
              </IconButton>
            </Paper>
          </Stack>
        </Box>

        {/* Dialogs */}
        <UserBlockDialog
          open={blockDialogOpen}
          onClose={() => setBlockDialogOpen(false)}
          userId={selectedUser?.id || ''}
          username={selectedUser?.username || ''}
          isBlocked={blockedUsers.some((b: any) => (b.blocked?.id || b.blockedId) === selectedUser?.id)}
        />
        <UserProfileDialog
          open={profileDialogOpen}
          onClose={() => setProfileDialogOpen(false)}
          userId={selectedProfileUser?.id || ''}
          username={selectedProfileUser?.username || ''}
          email={selectedProfileUser?.email || ''}
        />
        <Snackbar
          open={snackbar.open}
          autoHideDuration={4000}
          onClose={() => setSnackbar({ ...snackbar, open: false })}
        >
          <Alert severity={snackbar.severity}>{snackbar.message}</Alert>
        </Snackbar>
      </Box>

      {/* Global CSS for typing indicator */}
      <style>
        {`
          .typing-indicator span {
            height: 5px;
            width: 5px;
            float: left;
            margin: 0 1px;
            background-color: ${theme.palette.primary.main};
            display: block;
            border-radius: 50%;
            opacity: 0.4;
            animation: 1s typing-blink infinite;
          }
          .typing-indicator span:nth-of-type(2) { animation-delay: 0.2s; }
          .typing-indicator span:nth-of-type(3) { animation-delay: 0.4s; }
          @keyframes typing-blink {
            0% { opacity: 0.4; transform: translateY(0); }
            50% { opacity: 1; transform: translateY(-2px); }
            100% { opacity: 0.4; transform: translateY(0); }
          }
          @keyframes typing-bounce {
            0%, 80%, 100% {
              transform: scale(0);
              opacity: 0.5;
            }
            40% {
              transform: scale(1);
              opacity: 1;
            }
          }
        `}
      </style>
    </UnifiedChatLayout>
  );
}

import { useState, useEffect, useRef, useCallback, useMemo } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import {
  Box,
  Paper,
  Typography,
  TextField,
  IconButton,
  Stack,
  Avatar,
  alpha,
  useTheme,
  Button,
  Menu,
  MenuItem,
  ListItemIcon,
  ListItemText,
  Collapse,
  Skeleton,
  CircularProgress,
  Alert,
  Tooltip,
} from '@mui/material';
import { Send, Search, MoreVertical, X, ArrowLeft, Ban, ChevronDown, Paperclip, Mic, MicOff, Image, File, Bell, BellOff } from 'lucide-react';
import EmojiPicker from '../components/EmojiPicker';
import {
  useGetMessagesQuery,
  useSendMessageMutation,
  useGetUserChatsQuery,
  useGetBlockedUsersQuery,
  useMarkChatReadMutation,
  useGetUserOnlineStatusQuery,
  useMuteChatMutation,
  useUnmuteChatMutation
} from '../../../services/chatApi';
import { useSocket } from '../../../hooks/useSocket';
import { useAuth } from '../../../app/useAuth';
import type { Message, Chat } from '../../../services/chatApi';
import MessageBubble from '../components/MessageBubble';
import UserProfileDialog from '../components/UserProfileDialog';
import UserBlockDialog from '../components/UserBlockDialog';
import UnifiedChatLayout from '../components/UnifiedChatLayout';

export default function OneToOneChatPage() {
  const theme = useTheme();
  const navigate = useNavigate();
  const { chatId } = useParams<{ chatId: string }>();
  const { user, isAuthenticated } = useAuth();
  const { socket, isConnected, connectionStatus } = useSocket();

  const [message, setMessage] = useState('');
  const [messages, setMessages] = useState<Message[]>([]);
  const [chat, setChat] = useState<Chat | null>(null);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const messagesContainerRef = useRef<HTMLDivElement>(null);
  const [typingUsers, setTypingUsers] = useState<Set<string>>(new Set());
  const [isInitialLoad, setIsInitialLoad] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [showSearch, setShowSearch] = useState(false);
  const [isScrolledToBottom, setIsScrolledToBottom] = useState(true);
  const [searchResults, setSearchResults] = useState<number[]>([]);
  const [currentSearchIndex, setCurrentSearchIndex] = useState(-1);
  const [profileDialogOpen, setProfileDialogOpen] = useState(false);
  const [blockDialogOpen, setBlockDialogOpen] = useState(false);
  const [menuAnchor, setMenuAnchor] = useState<null | HTMLElement>(null);
  const [replyingTo, setReplyingTo] = useState<Message | null>(null);
  const [messageReactions, setMessageReactions] = useState<{ [messageId: string]: { [emoji: string]: { users: string[], count: number } } }>({});
  const [attachments, setAttachments] = useState<File[]>([]);
  const [isRecording, setIsRecording] = useState(false);
  const [recordingTime, setRecordingTime] = useState(0);
  const recordingIntervalRef = useRef<NodeJS.Timeout | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const messageIdsRef = useRef<Set<string>>(new Set());
  const socketMessageCountRef = useRef<number>(0);
  const apiMessageCountRef = useRef<number>(0);
  const lastSocketMessageTimeRef = useRef<number>(0);

  const { data: chats = [] } = useGetUserChatsQuery();
  const { data: blockedUsers = [] } = useGetBlockedUsersQuery();
  const [markChatRead] = useMarkChatReadMutation();
  const [muteChat] = useMuteChatMutation();
  const [unmuteChat] = useUnmuteChatMutation();

  const isMuted = useMemo(() => {
    if (!chat?.members || !user?.id) return false;
    return chat.members.find(m => m.userId === user.id)?.isMuted || false;
  }, [chat?.members, user?.id]);

  const handleToggleMute = async () => {
    if (!chatId) return;
    try {
      if (isMuted) {
        await unmuteChat(chatId).unwrap();
      } else {
        await muteChat(chatId).unwrap();
      }
    } catch (err) {
      console.error('Mute toggle failed:', err);
    }
  };

  // Get blocked user IDs
  const blockedUserIds = useMemo(() => {
    return new Set(
      blockedUsers.map((b) => {
        const blocked = (b as { blocked?: { id: string } }).blocked;
        return blocked?.id;
      }).filter(Boolean) as string[]
    );
  }, [blockedUsers]);

  // Fetch messages (history) once; use socket for live, allow refetch on reconnect to catch missed messages
  const {
    data: messagesData,
    isLoading: messagesLoading,
    refetch: refetchMessages,
  } = useGetMessagesQuery(
    { chatId: chatId!, page: 1, limit: 100 },
    {
      refetchOnMountOrArgChange: true,
      refetchOnFocus: false,
      refetchOnReconnect: true, // allow refetch on reconnect
      pollingInterval: 30000, // Reduced polling - socket should handle real-time updates
      skip: !chatId || !isAuthenticated,
    }
  );

  // CRITICAL: Reset all state when chatId changes (fixes bug where old messages mix with new chat)
  useEffect(() => {
    if (!chatId) return;

    console.log('[OneToOneChat] 🔄 Chat ID changed, resetting all state for:', chatId);

    // IMMEDIATELY clear all messages and state to prevent bleed
    setMessages([]);
    setMessage('');
    setChat(null);
    setTypingUsers(new Set());
    setIsInitialLoad(true);
    setSearchQuery('');
    setShowSearch(false);
    setIsScrolledToBottom(true);
    messageIdsRef.current.clear();
    socketMessageCountRef.current = 0;
    apiMessageCountRef.current = 0;

    // Force scroll to top when switching chats
    if (messagesContainerRef.current) {
      messagesContainerRef.current.scrollTop = 0;
    }
  }, [chatId]);

  const dedupeAndSort = useCallback((list: Message[]) => {
    const map = new Map<string, Message>();
    list.forEach((m) => map.set(m.id, m));
    return Array.from(map.values()).sort(
      (a, b) => new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime()
    );
  }, []);
  const [sendMessage] = useSendMessageMutation();

  useEffect(() => {
    const foundChat = chats.find((c) => c.id === chatId);
    if (foundChat) {
      setChat(foundChat);
    }
  }, [chats, chatId]);

  // Initialize/merge messages from API (initial load + any refetches on reconnect)
  useEffect(() => {
    if (!messagesData?.messages || !chatId) return;

    // CRITICAL: Only process messages for the current chatId to prevent bleed
    const chatMessages = messagesData.messages.filter(m => m.chatId === chatId);
    if (chatMessages.length === 0) {
      console.log('[OneToOneChat] ⚠️ No messages found for chatId:', chatId);
      setIsInitialLoad(false);
      return;
    }

    const sortedMessages = [...chatMessages].sort(
      (a, b) => new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime()
    );

    // First load - completely replace messages
    if (isInitialLoad) {
      console.log('[OneToOneChat] 📥 Loading', sortedMessages.length, 'messages for chat:', chatId);
      setMessages(dedupeAndSort(sortedMessages));
      messageIdsRef.current = new Set(sortedMessages.map(m => m.id));
      apiMessageCountRef.current = sortedMessages.length;
      setIsInitialLoad(false);
      return;
    }

    // Subsequent refetch (e.g., reconnect) — merge any messages we might have missed
    setMessages((prev) => {
      // Only merge messages that belong to current chat
      const currentChatMessages = prev.filter(m => m.chatId === chatId);
      const newOnes = sortedMessages.filter((m) => !messageIdsRef.current.has(m.id));
      if (!newOnes.length) return currentChatMessages;
      newOnes.forEach((m) => messageIdsRef.current.add(m.id));
      const merged = dedupeAndSort([...currentChatMessages, ...newOnes]);
      console.log('[OneToOneChat] 🔄 Merged', newOnes.length, 'missed messages from API refetch');
      return merged;
    });
  }, [messagesData, isInitialLoad, dedupeAndSort, chatId]);

  // Auto-mark chat as read when viewed (bulk operation)
  useEffect(() => {
    if (!chatId || !user?.id) return;

    // Mark entire chat as read (more efficient than per-message calls)
    markChatRead(chatId).catch(err => {
      // Ignore 404 errors (chat not found) - likely synchronization issue or new chat
      if (err?.status !== 404) {
        console.warn('Failed to mark chat as read:', err);
      }
    });
  }, [chatId, user?.id, markChatRead]);

  // Real-time message handler with deduplication - optimized for performance
  const handleNewMessage = useCallback((newMessage: Message) => {
    // Check if message belongs to current chat
    if (newMessage.chatId?.toLowerCase() !== chatId?.toLowerCase()) {
      return;
    }

    // Check for duplicates - fast O(1) check
    if (messageIdsRef.current.has(newMessage.id)) {
      return;
    }

    messageIdsRef.current.add(newMessage.id);
    lastSocketMessageTimeRef.current = Date.now();

    // Direct state update without requestAnimationFrame to reduce latency
    setMessages((prev) => {
      // Optimization: If empty or new message is newer than last, just append (O(1))
      const lastMsg = prev[prev.length - 1];
      const newTime = new Date(newMessage.createdAt).getTime();

      if (!lastMsg || newTime >= new Date(lastMsg.createdAt).getTime()) {
        return [...prev, newMessage];
      }

      // Fallback: If out of order, sort (O(N log N)) but lighter than Map creation
      const combined = [...prev, newMessage];
      return combined.sort((a, b) => new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime());
    });
  }, [chatId]);

  // Socket message handler - defined outside useEffect to avoid recreation
  const messageHandler = useCallback((newMessage: Message) => {
    socketMessageCountRef.current += 1;
    console.log('[OneToOneChat] 📨 [SOCKET] Received new-message event (#', socketMessageCountRef.current, '):', {
      messageId: newMessage.id,
      chatId: newMessage.chatId,
      currentChatId: chatId,
      userId: newMessage.userId,
      content: newMessage.content?.substring(0, 50),
      source: 'SOCKET',
    });

    // Only process if message belongs to current chat
    if (newMessage.chatId?.toLowerCase() === chatId?.toLowerCase()) {
      console.log('[OneToOneChat] ✅ Processing SOCKET message for current chat');
      // Call handleNewMessage directly (it's already wrapped in requestAnimationFrame)
      handleNewMessage(newMessage);
    } else {
      console.log('[OneToOneChat] ⏭️ SOCKET message ignored - different chat:', {
        messageChatId: newMessage.chatId,
        currentChatId: chatId,
      });
    }
  }, [chatId, handleNewMessage]);

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
            user: { id: data.readBy, username: 'User' }, // Will be updated when message is refetched
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

  // Function to join room
  const joinRoom = useCallback(() => {
    if (socket && socket.connected && chatId) {
      console.log('[OneToOneChat] 🚪 Joining chat room:', chatId, 'Socket ID:', socket.id);
      socket.emit('join-chat', { chatId }, (response: { success?: boolean; error?: string; chatId?: string; roomSize?: number }) => {
        if (response?.success) {
          console.log('[OneToOneChat] ✅ Successfully joined chat room:', chatId, 'Room size:', response.roomSize);
          console.log('[OneToOneChat] 📡 Ready to receive real-time messages for chat:', chatId);
          console.log('[OneToOneChat] ✅ Socket setup complete - messages will arrive in real-time');
        } else {
          console.error('[OneToOneChat] ❌ Failed to join chat room:', response);
        }
      });
    } else {
      console.warn('[OneToOneChat] ⚠️ Socket not connected or chatId missing, cannot join room');
    }
  }, [socket, chatId]);

  // Function to setup listeners
  const setupListeners = useCallback(() => {
    if (!socket) return;

    // Aggressively remove ALL listeners for these events to prevent duplicates
    // This is safe because we are the only active view consuming these events for this socket
    socket.removeAllListeners('new-message');
    socket.removeAllListeners('user-typing');
    socket.removeAllListeners('message-read');

    // Set up new listeners
    socket.on('new-message', messageHandler);
    socket.on('user-typing', typingHandler);
    socket.on('message-read', messageReadHandler);

    const listenerCount = socket.listeners('new-message').length;
    console.log('[OneToOneChat] ✅ Socket listeners registered for chat:', chatId);
    console.log('[OneToOneChat] 📋 Listener count - new-message:', listenerCount);
    if (listenerCount !== 1) {
      console.warn('[OneToOneChat] ⚠️ Expected 1 new-message listener, found', listenerCount);
    }
  }, [socket, messageHandler, typingHandler, messageReadHandler, chatId]);

  // Handle reconnection
  const reconnectHandler = useCallback(() => {
    console.log('[OneToOneChat] 🔄 Socket reconnected, joining room and setting up listeners');
    setTimeout(() => {
      joinRoom();
      // Setup listeners AFTER joining room to ensure proper order
      setTimeout(() => {
        setupListeners();
        // Only refetch if we haven't received recent messages via socket
        const timeSinceLastSocketMessage = Date.now() - (lastSocketMessageTimeRef.current || 0);
        if (timeSinceLastSocketMessage > 5000) {
          console.log('[OneToOneChat] 🔄 Refetching messages after reconnection (no recent socket messages)');
          refetchMessages().catch((err) => console.warn('Refetch on reconnect failed', err));
        } else {
          console.log('[OneToOneChat] ⏭️ Skipping refetch - recent socket messages indicate connection was stable');
        }
      }, 100);
    }, 200);
  }, [joinRoom, setupListeners, refetchMessages]);

  // Socket connection and message listeners - CRITICAL: Must be set up correctly for real-time
  useEffect(() => {
    if (!socket || !chatId) {
      console.log('[OneToOneChat] ⚠️ Socket or chatId not available:', { socket: !!socket, chatId });
      return;
    }

    console.log('[OneToOneChat] 🔧 Setting up socket for chat:', chatId, {
      socketConnected: socket.connected,
      socketId: socket.id,
      isConnected,
    });
    socket.off('reconnect', reconnectHandler);
    socket.on('reconnect', reconnectHandler);

    // Join room if already connected, otherwise wait for connection
    if (socket.connected) {
      console.log('[OneToOneChat] 🔌 Socket already connected, joining room and setting up listeners');
      setTimeout(() => {
        joinRoom();
        setTimeout(() => setupListeners(), 100);
      }, 100);
    } else {
      console.log('[OneToOneChat] ⏳ Socket not connected, waiting for connection...');
      const connectHandler = () => {
        console.log('[OneToOneChat] 🔌 Socket connected, joining room and setting up listeners');
        setTimeout(() => {
          joinRoom();
          setTimeout(() => {
            setupListeners();
            // initial sync dealt with by useGetMessagesQuery
            // refetchMessages().catch((err) => console.warn('Refetch on connect failed', err));
          }, 100);
        }, 100);
      };
      socket.off('connect', connectHandler);
      socket.once('connect', connectHandler);
    }

    // Cleanup function - CRITICAL: Abort old listeners when chatId changes
    return () => {
      console.log('[OneToOneChat] 🧹 Cleaning up socket listeners for chat:', chatId);
      socket.off('new-message', messageHandler);
      socket.off('user-typing', typingHandler);
      socket.off('message-read', messageReadHandler);
      socket.off('reconnect', reconnectHandler);
      if (socket.connected && chatId) {
        socket.emit('leave-chat', { chatId });
      }
    };
  }, [socket, chatId, messageHandler, typingHandler, messageReadHandler, reconnectHandler, joinRoom, setupListeners, isConnected]);

  // Improved scroll behavior - only auto-scroll if user is near bottom (like Instagram/WhatsApp)
  useEffect(() => {
    if (!messagesContainerRef.current || !messagesEndRef.current || !chatId) return;

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
  }, [messages, isInitialLoad, chatId]);

  // Track scroll position with throttling for better performance
  useEffect(() => {
    const container = messagesContainerRef.current;
    if (!container) return;

    let ticking = false;
    const handleScroll = () => {
      if (!ticking) {
        requestAnimationFrame(() => {
          const isNearBottom = container.scrollHeight - container.scrollTop - container.clientHeight < 150;
          setIsScrolledToBottom(isNearBottom);
          ticking = false;
        });
        ticking = true;
      }
    };

    container.addEventListener('scroll', handleScroll, { passive: true });
    return () => container.removeEventListener('scroll', handleScroll);
  }, []);

  // Filter messages - exclude messages from blocked users and apply search
  const filteredMessages = useMemo(() => {
    let filtered = messages.filter((msg) => !blockedUserIds.has(msg.userId));

    // Apply search filter if search query exists
    if (searchQuery.trim()) {
      const query = searchQuery.toLowerCase();
      filtered = filtered.filter((msg) =>
        msg.content.toLowerCase().includes(query) ||
        msg.user.username.toLowerCase().includes(query)
      );
    }

    return filtered;
  }, [messages, blockedUserIds, searchQuery]);

  const handleUserClick = useCallback(() => {
    setProfileDialogOpen(true);
  }, []);

  const handleMenuOpen = (event: React.MouseEvent<HTMLElement>) => {
    setMenuAnchor(event.currentTarget);
  };

  const handleMenuClose = () => {
    setMenuAnchor(null);
  };

  const handleBlockClick = () => {
    handleMenuClose();
    setBlockDialogOpen(true);
  };

  const handleScrollToBottom = () => {
    if (messagesContainerRef.current && messagesEndRef.current) {
      messagesContainerRef.current.scrollTo({
        top: messagesContainerRef.current.scrollHeight,
        behavior: 'smooth',
      });
    }
  };

  const handleReply = useCallback((message: Message) => {
    setReplyingTo(message);
  }, []);

  const handleReaction = useCallback((messageId: string, emoji: string) => {
    setMessageReactions(prev => {
      const messageReactions = prev[messageId] || {};
      const reaction = messageReactions[emoji] || { users: [], count: 0 };

      // For demo purposes, toggle reaction for current user
      const currentUserId = user?.id || 'current-user';
      const userIndex = reaction.users.indexOf(currentUserId);

      if (userIndex > -1) {
        // Remove reaction
        reaction.users.splice(userIndex, 1);
        reaction.count--;

        if (reaction.count === 0) {
          delete messageReactions[emoji];
        }
      } else {
        // Add reaction
        reaction.users.push(currentUserId);
        reaction.count++;
        messageReactions[emoji] = reaction;
      }

      return {
        ...prev,
        [messageId]: messageReactions,
      };
    });
  }, [user?.id]);

  const handleEdit = useCallback((messageId: string, newContent: string) => {
    setMessages(prev => prev.map(msg =>
      msg.id === messageId ? { ...msg, content: newContent, edited: true } : msg
    ));
  }, []);

  const handleDelete = useCallback((messageId: string) => {
    setMessages(prev => prev.filter(msg => msg.id !== messageId));
  }, []);

  const handleCopy = useCallback((content: string) => {
    // Could add toast notification here
    console.log('Message copied:', content);
  }, []);


  const handleFileSelect = useCallback((event: React.ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(event.target.files || []);
    const validFiles = files.filter(file => {
      const maxSize = 10 * 1024 * 1024; // 10MB
      const allowedTypes = ['image/', 'video/', 'audio/', 'application/pdf', 'text/'];
      return file.size <= maxSize && allowedTypes.some(type => file.type.startsWith(type));
    });
    setAttachments(prev => [...prev, ...validFiles]);
    event.target.value = ''; // Reset input
  }, []);

  const handleAttachmentClick = useCallback(() => {
    fileInputRef.current?.click();
  }, []);

  const handleRemoveAttachment = useCallback((index: number) => {
    setAttachments(prev => prev.filter((_, i) => i !== index));
  }, []);

  const startRecording = useCallback(() => {
    setIsRecording(true);
    setRecordingTime(0);
    recordingIntervalRef.current = setInterval(() => {
      setRecordingTime(prev => prev + 1);
    }, 1000);
  }, []);

  const stopRecording = useCallback(() => {
    setIsRecording(false);
    if (recordingIntervalRef.current) {
      clearInterval(recordingIntervalRef.current);
      recordingIntervalRef.current = null;
    }
    // Here you would typically send the recorded audio
    console.log('Voice message recorded for', recordingTime, 'seconds');
    setRecordingTime(0);
  }, [recordingTime]);

  const formatRecordingTime = useCallback((seconds: number) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins}:${secs.toString().padStart(2, '0')}`;
  }, []);

  const handleSearch = useCallback((query: string) => {
    setSearchQuery(query);
    if (!query.trim()) {
      setSearchResults([]);
      setCurrentSearchIndex(-1);
      return;
    }

    const results: number[] = [];
    messages.forEach((message, index) => {
      if (message.content.toLowerCase().includes(query.toLowerCase()) ||
        message.user.username.toLowerCase().includes(query.toLowerCase())) {
        results.push(index);
      }
    });
    setSearchResults(results);
    setCurrentSearchIndex(results.length > 0 ? 0 : -1);
  }, [messages]);

  const navigateSearchResult = useCallback((direction: 'prev' | 'next') => {
    if (searchResults.length === 0) return;

    let newIndex;
    if (direction === 'next') {
      newIndex = currentSearchIndex + 1 >= searchResults.length ? 0 : currentSearchIndex + 1;
    } else {
      newIndex = currentSearchIndex - 1 < 0 ? searchResults.length - 1 : currentSearchIndex - 1;
    }

    setCurrentSearchIndex(newIndex);

    // Scroll to the message
    const messageIndex = searchResults[newIndex];
    const messageElement = document.querySelector(`[data-message-id="${messages[messageIndex]?.id}"]`);
    if (messageElement) {
      messageElement.scrollIntoView({ behavior: 'smooth', block: 'center' });
    }
  }, [searchResults, currentSearchIndex, messages]);

  const handleSendMessage = async () => {
    if (!message.trim() || !chatId || isUserBlocked) return;

    const messageContent = message.trim();
    const replyTo = replyingTo;
    setMessage('');
    setReplyingTo(null);

    // Optimistic update - add message immediately to local state
    const tempId = `temp-${Date.now()}`;
    const optimisticMessage: Message = {
      id: tempId,
      chatId,
      userId: user?.id || '',
      user: {
        id: user?.id || '',
        username: user?.username || user?.email?.split('@')[0] || 'You',
        email: user?.email || '',
      },
      content: messageContent,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
      edited: false,
      deleted: false,
      replyToId: replyTo?.id,
    };

    // Add optimistic message
    setMessages((prev) => dedupeAndSort([...prev, optimisticMessage]));
    messageIdsRef.current.add(tempId);

    // Prefer socket for sending to ensure broadcast to joined room
    const sendViaSocket = () =>
      new Promise<void>((resolve, reject) => {
        if (!socket || !isConnected) {
          reject(new Error('Socket not connected'));
          return;
        }
        socket.emit(
          'send-message',
          { chatId, content: messageContent },
          (response: { success?: boolean; error?: string; message?: Message; warning?: string }) => {
            if (response?.success && response.message) {
              // Replace optimistic with server message
              const serverMessage = response.message;
              setMessages((prev) => {
                const filtered = prev.filter((m) => m.id !== tempId);
                return dedupeAndSort([...filtered, serverMessage]);
              });
              messageIdsRef.current.delete(tempId);
              messageIdsRef.current.add(serverMessage.id);
              if (response.warning) {
                console.warn('[OneToOneChat] ⚠️ [SOCKET]', response.warning);
              } else {
                console.log('[OneToOneChat] 📤 [SOCKET] Message sent via socket and acknowledged');
              }
              resolve();
            } else if (response?.success) {
              // Message was saved but no message object returned (shouldn't happen in normal flow)
              setMessages((prev) => prev.filter((m) => m.id !== tempId));
              messageIdsRef.current.delete(tempId);
              console.warn('[OneToOneChat] ⚠️ [SOCKET] Message saved but no message object returned');
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
      console.warn('[OneToOneChat] ⚠️ Socket send failed, falling back to API:', socketErr);
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
        console.log('[OneToOneChat] ✅ Message already received via socket, skipping API fallback');
        return;
      }

      try {
        const savedMessage = await sendMessage({ chatId, content: messageContent }).unwrap();
        // Check for duplicates before adding
        if (messageIdsRef.current.has(savedMessage.id)) {
          console.log('[OneToOneChat] ⏭️ Duplicate message from API fallback, ignoring:', savedMessage.id);
          setMessages((prev) => prev.filter((m) => m.id !== tempId));
          messageIdsRef.current.delete(tempId);
          return;
        }
        // Replace optimistic message with real message
        console.log('[OneToOneChat] 📤 [API] Message sent successfully (socket fallback)');
        setMessages((prev) => {
          const filtered = prev.filter((m) => m.id !== tempId);
          return dedupeAndSort([...filtered, savedMessage]);
        });
        messageIdsRef.current.delete(tempId);
        messageIdsRef.current.add(savedMessage.id);
      } catch (apiErr) {
        console.error('Failed to send message:', apiErr);
        // Remove optimistic message on error
        setMessages((prev) => prev.filter((m) => m.id !== tempId));
        messageIdsRef.current.delete(tempId);
        setMessage(messageContent); // Restore message on error
      }
    }
  };

  const handleTyping = (isTyping: boolean) => {
    if (socket && chatId) {
      socket.emit('typing', { chatId, isTyping });
    }
  };

  const otherUser = useMemo(() => {
    return chat?.members.find((m) => m.userId !== user?.id)?.user;
  }, [chat, user?.id]);

  const { data: otherUserStatus } = useGetUserOnlineStatusQuery(otherUser?.id || '', {
    skip: !otherUser?.id,
    pollingInterval: 30000, // Check every 30 seconds
  });

  const isUserBlocked = useMemo(() => {
    if (!otherUser) return false;
    return blockedUserIds.has(otherUser.id);
  }, [otherUser, blockedUserIds]);

  // Security: Redirect if not authenticated
  if (!isAuthenticated) {
    return null; // Will be handled by ProtectedRoute, but this is a safety check
  }

  if (!chat) {
    return (
      <UnifiedChatLayout>
        <Box sx={{ p: 4, textAlign: 'center', height: '100%', display: 'flex', flexDirection: 'column', justifyContent: 'center' }}>
          <Typography variant="h6" color="error" sx={{ mb: 2 }}>
            Chat not found
          </Typography>
          <Button variant="contained" onClick={() => navigate('/chat/chats')}>
            Back to Chats
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
        overflow: 'hidden',
        background: theme.palette.mode === 'light'
          ? `linear-gradient(135deg, #f8fafc 0%, #f1f5f9 100%)` // Clean white/light-gray
          : `linear-gradient(135deg, #0f0f23 0%, #1a1a2e 50%, #16213e 100%)`, // Deep dark blue/black
        position: 'relative',
        animation: 'pageEnter 0.4s cubic-bezier(0.4, 0, 0.2, 1)',
        '@keyframes pageEnter': {
          from: {
            opacity: 0,
            transform: 'translateX(20px) scale(0.98)',
          },
          to: {
            opacity: 1,
            transform: 'translateX(0) scale(1)',
          },
        },
        '&::before': {
          content: '""',
          position: 'absolute',
          top: 0,
          left: 0,
          right: 0,
          bottom: 0,
          background: theme.palette.mode === 'light'
            ? `radial-gradient(circle at 20% 80%, rgba(14, 165, 233, 0.03) 0%, transparent 50%),
               radial-gradient(circle at 80% 20%, rgba(99, 102, 241, 0.03) 0%, transparent 50%)` // Extremely subtle hints of color
            : `radial-gradient(circle at 20% 80%, rgba(59, 130, 246, 0.15) 0%, transparent 50%),
               radial-gradient(circle at 80% 20%, rgba(168, 85, 247, 0.15) 0%, transparent 50%),
               radial-gradient(circle at 40% 40%, rgba(14, 165, 233, 0.1) 0%, transparent 50%)`,
          pointerEvents: 'none',
          zIndex: 0,
        },
      }}>
        {/* Modern Header - Beautiful Gradient */}
        <Box
          sx={{
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
            position: 'relative',
            minHeight: { xs: 64, sm: 80 },
            '&::before': {
              content: '""',
              position: 'absolute',
              top: 0,
              left: 0,
              right: 0,
              bottom: 0,
              background: theme.palette.mode === 'light'
                ? 'linear-gradient(135deg, rgba(102, 126, 234, 0.05) 0%, rgba(118, 75, 162, 0.05) 100%)'
                : 'linear-gradient(135deg, rgba(59, 130, 246, 0.08) 0%, rgba(168, 85, 247, 0.08) 100%)',
              pointerEvents: 'none',
            },
          }}
        >
          <Stack direction="row" spacing={2} alignItems="center">
            <IconButton
              onClick={() => navigate('/chat/chats')}
              size="small"
              sx={{
                color: theme.palette.text.primary,
                '&:hover': {
                  background: alpha(theme.palette.primary.main, 0.1),
                  transform: 'scale(1.05)',
                },
                transition: 'all 0.2s ease-in-out',
              }}
            >
              <ArrowLeft size={20} />
            </IconButton>
            <Box sx={{ position: 'relative' }}>
              <Avatar
                onClick={handleUserClick}
                sx={{
                  width: { xs: 44, sm: 48 },
                  height: { xs: 44, sm: 48 },
                  background: `linear-gradient(135deg, #0ea5e9 0%, #0284c7 50%, #0369a1 100%)`,
                  color: 'white',
                  cursor: 'pointer',
                  border: `3px solid ${alpha(theme.palette.mode === 'light' ? '#ffffff' : '#1e293b', 0.8)}`,
                  boxShadow: theme.palette.mode === 'light'
                    ? '0 6px 20px rgba(102, 126, 234, 0.4), 0 3px 10px rgba(118, 75, 162, 0.3)'
                    : '0 6px 20px rgba(59, 130, 246, 0.4), 0 3px 10px rgba(168, 85, 247, 0.3)',
                  transition: 'all 0.3s cubic-bezier(0.4, 0, 0.2, 1)',
                  '&:hover': {
                    transform: 'scale(1.08)',
                    boxShadow: theme.palette.mode === 'light'
                      ? '0 8px 28px rgba(102, 126, 234, 0.5), 0 4px 14px rgba(118, 75, 162, 0.4)'
                      : '0 8px 28px rgba(59, 130, 246, 0.5), 0 4px 14px rgba(168, 85, 247, 0.4)',
                  },
                  '&:active': {
                    transform: 'scale(0.95)',
                  },
                }}
              >
                {otherUser?.username?.charAt(0)?.toUpperCase() || 'U'}
              </Avatar>
              {otherUserStatus?.isOnline && (
                <Box
                  sx={{
                    position: 'absolute',
                    bottom: 2,
                    right: 2,
                    width: { xs: 12, sm: 14 },
                    height: { xs: 12, sm: 14 },
                    borderRadius: '50%',
                    bgcolor: 'linear-gradient(135deg, #10b981 0%, #06d6a0 100%)',
                    border: `2px solid ${theme.palette.mode === 'light' ? '#ffffff' : '#1e293b'}`,
                    boxShadow: '0 2px 8px rgba(16, 185, 129, 0.6), 0 0 0 1px rgba(16, 185, 129, 0.3)',
                    animation: 'onlinePulse 3s ease-in-out infinite',
                    '@keyframes onlinePulse': {
                      '0%, 100%': {
                        transform: 'scale(1)',
                        boxShadow: '0 2px 8px rgba(16, 185, 129, 0.6), 0 0 0 1px rgba(16, 185, 129, 0.3)',
                      },
                      '50%': {
                        transform: 'scale(1.2)',
                        boxShadow: '0 4px 12px rgba(16, 185, 129, 0.8), 0 0 0 2px rgba(16, 185, 129, 0.4)',
                      },
                    },
                  }}
                />
              )}
            </Box>
            <Box>
              <Typography
                variant="h6"
                fontWeight={800}
                sx={{
                  lineHeight: 1.2,
                  background: 'linear-gradient(135deg, #0ea5e9 0%, #0284c7 50%, #0369a1 100%)',
                  backgroundClip: 'text',
                  WebkitBackgroundClip: 'text',
                  WebkitTextFillColor: 'transparent',
                  textShadow: theme.palette.mode === 'light'
                    ? '0 2px 4px rgba(102, 126, 234, 0.2)'
                    : '0 2px 4px rgba(59, 130, 246, 0.3)',
                }}
              >
                {otherUser?.username || 'Unknown User'}
              </Typography>
              <Typography
                component="div"
                variant="body2"
                color="text.secondary"
                sx={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: 0.5,
                  mt: 0.5
                }}
              >
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
                {otherUserStatus?.isOnline && (
                  <>
                    <Typography variant="caption" sx={{ mx: 0.5 }}>•</Typography>
                    <Box
                      sx={{
                        width: 6,
                        height: 6,
                        borderRadius: '50%',
                        bgcolor: '#10b981',
                      }}
                    />
                    Active now
                  </>
                )}
                {!otherUserStatus?.isOnline && !isConnected && (
                  <>
                    <Typography variant="caption" sx={{ mx: 0.5 }}>•</Typography>
                    <Box
                      sx={{
                        width: 6,
                        height: 6,
                        borderRadius: '50%',
                        bgcolor: '#94a3b8',
                      }}
                    />
                    Offline
                  </>
                )}
                {typingUsers.size > 0 && (
                  <>
                    <Typography variant="caption" sx={{ mx: 0.5 }}>•</Typography>
                    <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5 }}>
                      <Box sx={{ display: 'flex', gap: 0.3 }}>
                        <Box
                          sx={{
                            width: 3,
                            height: 3,
                            borderRadius: '50%',
                            bgcolor: '#6366f1',
                            animation: 'typingDotSmall 1.4s ease-in-out infinite',
                            '@keyframes typingDotSmall': {
                              '0%, 80%, 100%': { opacity: 0.6, transform: 'scale(0.8)' },
                              '40%': { opacity: 1, transform: 'scale(1.2)' },
                            },
                          }}
                        />
                        <Box
                          sx={{
                            width: 3,
                            height: 3,
                            borderRadius: '50%',
                            bgcolor: '#6366f1',
                            animation: 'typingDotSmall 1.4s ease-in-out infinite',
                            animationDelay: '0.2s',
                          }}
                        />
                        <Box
                          sx={{
                            width: 3,
                            height: 3,
                            borderRadius: '50%',
                            bgcolor: '#6366f1',
                            animation: 'typingDotSmall 1.4s ease-in-out infinite',
                            animationDelay: '0.4s',
                          }}
                        />
                      </Box>
                      <Typography variant="caption" sx={{ color: '#6366f1', fontStyle: 'italic', fontWeight: 500 }}>
                        typing...
                      </Typography>
                    </Box>
                  </>
                )}
              </Typography>
            </Box>
          </Stack>

          <Stack direction="row" spacing={1}>
            <Tooltip title={isMuted ? 'Unmute notifications' : 'Mute notifications'}>
              <IconButton
                size="small"
                onClick={handleToggleMute}
                sx={{
                  color: isMuted ? theme.palette.text.secondary : theme.palette.text.primary,
                  '&:hover': {
                    background: alpha('#6366f1', 0.1),
                    transform: 'scale(1.05)',
                  },
                }}
              >
                {isMuted ? <BellOff size={20} /> : <Bell size={20} />}
              </IconButton>
            </Tooltip>
            <IconButton
              onClick={() => setShowSearch(!showSearch)}
              sx={{
                minWidth: { xs: 44, sm: 40 },
                minHeight: { xs: 44, sm: 40 },
                color: theme.palette.text.primary,
                '&:hover': {
                  background: alpha('#6366f1', 0.1),
                  transform: 'scale(1.05)',
                },
                '&:active': {
                  transform: 'scale(0.95)',
                },
                transition: 'all 0.2s ease-in-out',
              }}
            >
              <Search size={20} />
            </IconButton>
            <IconButton
              onClick={handleMenuOpen}
              sx={{
                minWidth: { xs: 44, sm: 40 },
                minHeight: { xs: 44, sm: 40 },
                color: theme.palette.text.primary,
                '&:hover': {
                  background: alpha('#6366f1', 0.1),
                  transform: 'scale(1.05)',
                },
                '&:active': {
                  transform: 'scale(0.95)',
                },
                transition: 'all 0.2s ease-in-out',
              }}
            >
              <MoreVertical size={20} />
            </IconButton>
          </Stack>
        </Box>

        {/* Modern Search Bar */}
        <Collapse
          in={showSearch}
          timeout={300}
          sx={{
            '& .MuiCollapse-wrapper': {
              '& .MuiCollapse-wrapperInner': {
                animation: showSearch ? 'slideDownFade 0.3s cubic-bezier(0.4, 0, 0.2, 1)' : 'slideUpFade 0.3s cubic-bezier(0.4, 0, 0.2, 1)',
                '@keyframes slideDownFade': {
                  from: {
                    opacity: 0,
                    transform: 'translateY(-10px)',
                  },
                  to: {
                    opacity: 1,
                    transform: 'translateY(0)',
                  },
                },
                '@keyframes slideUpFade': {
                  from: {
                    opacity: 1,
                    transform: 'translateY(0)',
                  },
                  to: {
                    opacity: 0,
                    transform: 'translateY(-10px)',
                  },
                },
              },
            },
          }}
        >
          <Box
            sx={{
              px: { xs: 2, sm: 3 },
              py: 2,
              borderBottom: `1px solid ${alpha(theme.palette.divider, 0.1)}`,
              background: theme.palette.mode === 'light'
                ? 'rgba(255, 255, 255, 0.6)'
                : 'rgba(18, 18, 20, 0.6)',
              backdropFilter: 'blur(10px)',
              transform: 'translateZ(0)', // Force hardware acceleration
            }}
          >
            <Stack spacing={1}>
              <TextField
                fullWidth
                size="small"
                placeholder="Search in conversation..."
                value={searchQuery}
                onChange={(e) => handleSearch(e.target.value)}
                InputProps={{
                  startAdornment: <Search size={16} style={{ marginRight: 8, opacity: 0.5 }} />,
                  endAdornment: searchQuery && (
                    <IconButton size="small" onClick={() => {
                      setSearchQuery('');
                      setSearchResults([]);
                      setCurrentSearchIndex(-1);
                    }}>
                      <X size={16} />
                    </IconButton>
                  )
                }}
                sx={{
                  '& .MuiOutlinedInput-root': {
                    borderRadius: '16px',
                    background: theme.palette.mode === 'light'
                      ? 'rgba(255, 255, 255, 0.8)'
                      : 'rgba(26, 26, 30, 0.8)',
                    backdropFilter: 'blur(10px)',
                    border: `1px solid ${alpha(theme.palette.divider, 0.2)}`,
                    '&:hover': {
                      borderColor: alpha('#6366f1', 0.3),
                    },
                    '&.Mui-focused': {
                      borderColor: '#6366f1',
                      boxShadow: `0 0 0 3px ${alpha('#6366f1', 0.1)}`,
                    },
                    transition: 'all 0.2s ease-in-out',
                  }
                }}
              />

              {/* Search Results Navigation */}
              {searchResults.length > 0 && (
                <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                  <Typography variant="caption" sx={{ color: 'text.secondary' }}>
                    {currentSearchIndex + 1} of {searchResults.length} results
                  </Typography>
                  <Stack direction="row" spacing={0.5}>
                    <IconButton
                      size="small"
                      onClick={() => navigateSearchResult('prev')}
                      disabled={searchResults.length <= 1}
                      sx={{
                        width: 28,
                        height: 28,
                        color: 'text.secondary',
                        '&:hover': {
                          bgcolor: alpha(theme.palette.primary.main, 0.1),
                          color: 'primary.main',
                        },
                      }}
                    >
                      <ChevronDown size={16} style={{ transform: 'rotate(90deg)' }} />
                    </IconButton>
                    <IconButton
                      size="small"
                      onClick={() => navigateSearchResult('next')}
                      disabled={searchResults.length <= 1}
                      sx={{
                        width: 28,
                        height: 28,
                        color: 'text.secondary',
                        '&:hover': {
                          bgcolor: alpha(theme.palette.primary.main, 0.1),
                          color: 'primary.main',
                        },
                      }}
                    >
                      <ChevronDown size={16} style={{ transform: 'rotate(-90deg)' }} />
                    </IconButton>
                  </Stack>
                </Box>
              )}
            </Stack>
          </Box>
        </Collapse>

        {/* Reply Indicator */}
        {replyingTo && (
          <Box sx={{
            px: { xs: 2, sm: 3 },
            py: 1.5,
            animation: 'slideDown 0.3s cubic-bezier(0.4, 0, 0.2, 1)',
            '@keyframes slideDown': {
              from: {
                opacity: 0,
                transform: 'translateY(-10px)',
              },
              to: {
                opacity: 1,
                transform: 'translateY(0)',
              },
            },
          }}>
            <Box
              sx={{
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'space-between',
                p: 2,
                borderRadius: 3,
                bgcolor: theme.palette.mode === 'light'
                  ? 'rgba(102, 126, 234, 0.08)'
                  : 'rgba(59, 130, 246, 0.15)',
                border: `2px solid ${alpha(theme.palette.mode === 'light' ? '#667eea' : '#3b82f6', 0.2)}`,
                backdropFilter: 'blur(20px)',
                boxShadow: theme.palette.mode === 'light'
                  ? '0 4px 16px rgba(102, 126, 234, 0.1), 0 2px 8px rgba(0, 0, 0, 0.08)'
                  : '0 4px 16px rgba(59, 130, 246, 0.15), 0 2px 8px rgba(0, 0, 0, 0.2)',
                transition: 'all 0.3s cubic-bezier(0.4, 0, 0.2, 1)',
                '&:hover': {
                  transform: 'translateY(-2px)',
                  boxShadow: theme.palette.mode === 'light'
                    ? '0 8px 24px rgba(102, 126, 234, 0.15), 0 4px 12px rgba(0, 0, 0, 0.12)'
                    : '0 8px 24px rgba(59, 130, 246, 0.2), 0 4px 12px rgba(0, 0, 0, 0.3)',
                },
                position: 'relative',
                '&::before': {
                  content: '""',
                  position: 'absolute',
                  top: 0,
                  left: 0,
                  right: 0,
                  bottom: 0,
                  borderRadius: 3,
                  background: theme.palette.mode === 'light'
                    ? 'linear-gradient(135deg, rgba(102, 126, 234, 0.03) 0%, rgba(118, 75, 162, 0.03) 100%)'
                    : 'linear-gradient(135deg, rgba(59, 130, 246, 0.05) 0%, rgba(168, 85, 247, 0.05) 100%)',
                  pointerEvents: 'none',
                },
              }}
            >
              <Box sx={{ flex: 1, minWidth: 0 }}>
                <Typography
                  variant="caption"
                  sx={{
                    color: '#6366f1',
                    fontWeight: 600,
                    display: 'block',
                    mb: 0.5,
                  }}
                >
                  Replying to {replyingTo.user.username}
                </Typography>
                <Typography
                  variant="body2"
                  sx={{
                    color: 'text.secondary',
                    overflow: 'hidden',
                    textOverflow: 'ellipsis',
                    whiteSpace: 'nowrap',
                  }}
                >
                  {replyingTo.content}
                </Typography>
              </Box>
              <IconButton
                size="small"
                onClick={() => setReplyingTo(null)}
                sx={{
                  color: 'text.secondary',
                  '&:hover': {
                    color: theme.palette.error.main,
                    bgcolor: alpha(theme.palette.error.main, 0.1),
                  },
                }}
              >
                <X size={16} />
              </IconButton>
            </Box>
          </Box>
        )}

        {/* Modern Connection Status */}
        {(connectionStatus === 'error' || connectionStatus === 'disconnected') && (
          <Box sx={{
            px: { xs: 2, sm: 3 },
            py: 1.5,
            animation: 'slideInFromTop 0.4s cubic-bezier(0.4, 0, 0.2, 1)',
            '@keyframes slideInFromTop': {
              from: {
                opacity: 0,
                transform: 'translateY(-20px)',
              },
              to: {
                opacity: 1,
                transform: 'translateY(0)',
              },
            },
          }}>
            <Alert
              severity="warning"
              variant="outlined"
              sx={{
                borderRadius: '16px',
                py: 1,
                background: theme.palette.mode === 'light'
                  ? 'rgba(255, 193, 7, 0.1)'
                  : 'rgba(255, 193, 7, 0.2)',
                border: `1px solid ${alpha('#f59e0b', 0.3)}`,
                color: '#d97706',
                '& .MuiAlert-icon': {
                  color: '#d97706',
                },
                animation: 'pulseWarning 2s ease-in-out infinite',
                '@keyframes pulseWarning': {
                  '0%, 100%': {
                    boxShadow: '0 0 0 0 rgba(245, 158, 11, 0.2)',
                  },
                  '50%': {
                    boxShadow: '0 0 0 4px rgba(245, 158, 11, 0)',
                  },
                },
              }}
            >
              {connectionStatus === 'error' ? 'Connection lost' : 'Reconnecting...'}
            </Alert>
          </Box>
        )}

        {/* Modern Messages Container */}
        <Box
          ref={messagesContainerRef}
          sx={{
            flex: 1,
            overflowY: 'auto',
            p: { xs: 2, sm: 3 },
            display: 'flex',
            flexDirection: 'column',
            gap: 1.5,
            background: 'transparent',
            scrollBehavior: 'smooth',
            WebkitOverflowScrolling: 'touch',
            position: 'relative',
            zIndex: 1,
            '&::-webkit-scrollbar': {
              width: { xs: '6px', sm: '10px' },
            },
            '&::-webkit-scrollbar-track': {
              background: theme.palette.mode === 'light'
                ? 'rgba(255, 255, 255, 0.1)'
                : 'rgba(0, 0, 0, 0.2)',
              borderRadius: '10px',
              margin: '4px',
            },
            '&::-webkit-scrollbar-thumb': {
              background: theme.palette.mode === 'light'
                ? 'linear-gradient(135deg, #0ea5e9 0%, #0284c7 100%)'
                : 'linear-gradient(135deg, #3b82f6 0%, #8b5cf6 100%)',
              borderRadius: '10px',
              border: theme.palette.mode === 'light'
                ? '2px solid rgba(255, 255, 255, 0.3)'
                : '2px solid rgba(0, 0, 0, 0.3)',
              boxShadow: theme.palette.mode === 'light'
                ? '0 2px 8px rgba(102, 126, 234, 0.3)'
                : '0 2px 8px rgba(59, 130, 246, 0.3)',
              '&:hover': {
                background: theme.palette.mode === 'light'
                  ? 'linear-gradient(135deg, #5a67d8 0%, #6b46c1 100%)'
                  : 'linear-gradient(135deg, #2563eb 0%, #7c3aed 100%)',
                boxShadow: theme.palette.mode === 'light'
                  ? '0 4px 12px rgba(102, 126, 234, 0.5)'
                  : '0 4px 12px rgba(59, 130, 246, 0.5)',
              },
            },
            '&::-webkit-scrollbar-corner': {
              background: 'transparent',
            },
            scrollbarWidth: 'thin',
            scrollbarColor: theme.palette.mode === 'light'
              ? '#667eea rgba(255, 255, 255, 0.1)'
              : '#3b82f6 rgba(0, 0, 0, 0.2)',
            // Message background pattern
            '&::before': {
              content: '""',
              position: 'absolute',
              top: 0,
              left: 0,
              right: 0,
              bottom: 0,
              backgroundImage: theme.palette.mode === 'light'
                ? `radial-gradient(circle at 25% 25%, rgba(120, 119, 198, 0.05) 0%, transparent 50%),
                   radial-gradient(circle at 75% 75%, rgba(255, 119, 198, 0.05) 0%, transparent 50%)`
                : `radial-gradient(circle at 25% 25%, rgba(59, 130, 246, 0.08) 0%, transparent 50%),
                   radial-gradient(circle at 75% 75%, rgba(168, 85, 247, 0.08) 0%, transparent 50%)`,
              pointerEvents: 'none',
              zIndex: -1,
            },
          }}
        >

          {messagesLoading && isInitialLoad && (
            <Box sx={{
              display: 'flex',
              flexDirection: 'column',
              alignItems: 'center',
              py: 4,
              gap: 2
            }}>
              <Box sx={{
                width: 40,
                height: 40,
                borderRadius: '50%',
                background: 'linear-gradient(135deg, #6366f1 0%, #10b981 100%)',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                animation: 'loadingPulse 1.5s ease-in-out infinite',
                '@keyframes loadingPulse': {
                  '0%, 100%': {
                    transform: 'scale(1)',
                    boxShadow: '0 0 0 0 rgba(99, 102, 241, 0.4)',
                  },
                  '50%': {
                    transform: 'scale(1.1)',
                    boxShadow: '0 0 0 10px rgba(99, 102, 241, 0)',
                  },
                },
              }}>
                <Box
                  sx={{
                    width: 20,
                    height: 20,
                    borderRadius: '50%',
                    border: '2px solid white',
                    borderTop: '2px solid transparent',
                    animation: 'spin 1s linear infinite',
                    '@keyframes spin': {
                      '0%': { transform: 'rotate(0deg)' },
                      '100%': { transform: 'rotate(360deg)' },
                    },
                  }}
                />
              </Box>
              <Typography variant="body2" color="text.secondary" sx={{ animation: 'fadeIn 0.5s ease-in' }}>
                Loading messages...
              </Typography>
            </Box>
          )}

          {filteredMessages.map((msg, index) => (
            <MessageBubble
              key={msg.id}
              message={msg}
              isOwnMessage={msg.userId === user?.id}
              showAvatar={index === 0 || filteredMessages[index - 1].userId !== msg.userId}
              showUsername={false}
              prevMessage={index > 0 ? filteredMessages[index - 1] : null}
              onUserClick={handleUserClick}
              messageStatus="delivered"
              isHighlighted={searchResults.includes(index) && currentSearchIndex === searchResults.indexOf(index)}
              searchQuery={searchQuery}
              reactions={messageReactions[msg.id] || {}}
              onReaction={handleReaction}
              onReply={handleReply}
              onEdit={handleEdit}
              onDelete={handleDelete}
              onCopy={handleCopy}
            />
          ))}

          {typingUsers.size > 0 && (
            <Box sx={{
              display: 'flex',
              alignItems: 'center',
              gap: 1.5,
              ml: 1,
              mt: 1.5,
              px: 2.5,
              py: 1.5,
              borderRadius: '24px',
              background: theme.palette.mode === 'light'
                ? 'rgba(255, 255, 255, 0.9)'
                : 'rgba(30, 41, 59, 0.9)',
              backdropFilter: 'blur(20px)',
              border: `2px solid ${alpha(theme.palette.mode === 'light' ? '#667eea' : '#3b82f6', 0.15)}`,
              boxShadow: theme.palette.mode === 'light'
                ? '0 6px 20px rgba(102, 126, 234, 0.15), 0 3px 10px rgba(0, 0, 0, 0.1)'
                : '0 6px 20px rgba(59, 130, 246, 0.2), 0 3px 10px rgba(0, 0, 0, 0.3)',
              maxWidth: 'fit-content',
              opacity: 0.95,
              animation: 'typingPulse 2s ease-in-out infinite',
              '@keyframes typingPulse': {
                '0%, 100%': {
                  transform: 'scale(1)',
                  boxShadow: theme.palette.mode === 'light'
                    ? '0 6px 20px rgba(102, 126, 234, 0.15), 0 3px 10px rgba(0, 0, 0, 0.1)'
                    : '0 6px 20px rgba(59, 130, 246, 0.2), 0 3px 10px rgba(0, 0, 0, 0.3)'
                },
                '50%': {
                  transform: 'scale(1.02)',
                  boxShadow: theme.palette.mode === 'light'
                    ? '0 8px 24px rgba(102, 126, 234, 0.2), 0 4px 14px rgba(0, 0, 0, 0.15)'
                    : '0 8px 24px rgba(59, 130, 246, 0.25), 0 4px 14px rgba(0, 0, 0, 0.4)'
                },
              },
            }}>
              <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                <Avatar
                  sx={{
                    width: 24,
                    height: 24,
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
                      bgcolor: '#6366f1',
                      animation: 'typingDot 1.4s ease-in-out infinite',
                      '@keyframes typingDot': {
                        '0%, 80%, 100%': {
                          transform: 'scale(0.8)',
                          opacity: 0.6,
                        },
                        '40%': {
                          transform: 'scale(1.2)',
                          opacity: 1,
                        },
                      },
                    }}
                  />
                  <Box
                    sx={{
                      width: 4,
                      height: 4,
                      borderRadius: '50%',
                      bgcolor: '#6366f1',
                      animation: 'typingDot 1.4s ease-in-out infinite',
                      animationDelay: '0.2s',
                    }}
                  />
                  <Box
                    sx={{
                      width: 4,
                      height: 4,
                      borderRadius: '50%',
                      bgcolor: '#6366f1',
                      animation: 'typingDot 1.4s ease-in-out infinite',
                      animationDelay: '0.4s',
                    }}
                  />
                </Box>
              </Box>
              <Typography
                variant="body2"
                sx={{
                  color: '#6366f1',
                  fontStyle: 'italic',
                  fontWeight: 600,
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

        {/* Modern Floating Scroll Button */}
        {!isScrolledToBottom && messages.length > 5 && (
          <Box
            sx={{
              position: 'absolute',
              bottom: { xs: 100, sm: 120 },
              right: { xs: 16, sm: 24 },
              zIndex: 100,
            }}
          >
            <IconButton
              onClick={handleScrollToBottom}
              sx={{
                width: { xs: 56, sm: 48 },
                height: { xs: 56, sm: 48 },
                background: 'linear-gradient(135deg, #0ea5e9 0%, #0284c7 100%)',
                color: 'white',
                boxShadow: '0 8px 25px rgba(102, 126, 234, 0.4), 0 4px 12px rgba(118, 75, 162, 0.3)',
                border: `2px solid ${alpha(theme.palette.mode === 'light' ? '#ffffff' : '#1e293b', 0.8)}`,
                '&:hover': {
                  background: 'linear-gradient(135deg, #5a67d8 0%, #6b46c1 100%)',
                  transform: 'scale(1.08) rotate(5deg)',
                  boxShadow: '0 12px 35px rgba(102, 126, 234, 0.5), 0 6px 16px rgba(118, 75, 162, 0.4)',
                },
                '&:active': {
                  transform: 'scale(0.92)',
                },
                transition: 'all 0.4s cubic-bezier(0.4, 0, 0.2, 1)',
                '&::before': {
                  content: '""',
                  position: 'absolute',
                  top: 0,
                  left: 0,
                  right: 0,
                  bottom: 0,
                  borderRadius: '50%',
                  background: 'linear-gradient(135deg, rgba(255, 255, 255, 0.2) 0%, rgba(255, 255, 255, 0.1) 100%)',
                  pointerEvents: 'none',
                },
              }}
            >
              <ChevronDown size={24} />
            </IconButton>
          </Box>
        )}

        {/* Modern Input Bar */}
        <Box
          sx={{
            p: { xs: 1.5, sm: 3 },
            background: theme.palette.mode === 'light'
              ? 'rgba(255, 255, 255, 0.98)'
              : 'rgba(15, 23, 42, 0.98)',
            backdropFilter: 'blur(30px)',
            borderTop: `1px solid ${alpha(theme.palette.mode === 'light' ? '#667eea' : '#3b82f6', 0.2)}`,
            boxShadow: theme.palette.mode === 'light'
              ? '0 -4px 20px rgba(102, 126, 234, 0.15), 0 -2px 8px rgba(0, 0, 0, 0.1)'
              : '0 -4px 20px rgba(59, 130, 246, 0.25), 0 -2px 8px rgba(0, 0, 0, 0.4)',
            position: 'relative',
            pb: { xs: 2, sm: 3 },
            zIndex: 2,
            '&::before': {
              content: '""',
              position: 'absolute',
              top: 0,
              left: 0,
              right: 0,
              bottom: 0,
              background: theme.palette.mode === 'light'
                ? 'linear-gradient(135deg, rgba(102, 126, 234, 0.05) 0%, rgba(118, 75, 162, 0.05) 100%)'
                : 'linear-gradient(135deg, rgba(59, 130, 246, 0.08) 0%, rgba(168, 85, 247, 0.08) 100%)',
              pointerEvents: 'none',
              borderRadius: 0,
            }
          }}
        >
          <Stack spacing={1.5}>
            {/* Attachments Preview */}
            {attachments.length > 0 && (
              <Box sx={{
                display: 'flex',
                gap: 1,
                flexWrap: 'wrap',
                animation: 'attachmentsSlideIn 0.3s cubic-bezier(0.4, 0, 0.2, 1)',
                '@keyframes attachmentsSlideIn': {
                  from: {
                    opacity: 0,
                    transform: 'translateY(10px)',
                  },
                  to: {
                    opacity: 1,
                    transform: 'translateY(0)',
                  },
                },
              }}>
                {attachments.map((file, index) => (
                  <Box
                    key={index}
                    sx={{
                      display: 'flex',
                      alignItems: 'center',
                      gap: 1,
                      p: 1.5,
                      borderRadius: 2,
                      bgcolor: alpha(theme.palette.primary.main, 0.1),
                      border: `1px solid ${alpha(theme.palette.primary.main, 0.2)}`,
                      maxWidth: 200,
                      animation: `attachmentItemIn 0.3s cubic-bezier(0.4, 0, 0.2, 1) ${index * 0.1}s both`,
                      '@keyframes attachmentItemIn': {
                        from: {
                          opacity: 0,
                          transform: 'translateX(-10px) scale(0.9)',
                        },
                        to: {
                          opacity: 1,
                          transform: 'translateX(0) scale(1)',
                        },
                      },
                      transition: 'all 0.2s ease-in-out',
                      '&:hover': {
                        transform: 'translateY(-1px)',
                        boxShadow: '0 4px 12px rgba(99, 102, 241, 0.15)',
                      },
                    }}
                  >
                    {file.type.startsWith('image/') ? (
                      <Image size={16} color={theme.palette.primary.main} />
                    ) : (
                      <File size={16} color={theme.palette.primary.main} />
                    )}
                    <Typography variant="caption" sx={{ flex: 1, overflow: 'hidden', textOverflow: 'ellipsis' }}>
                      {file.name}
                    </Typography>
                    <IconButton size="small" onClick={() => handleRemoveAttachment(index)}>
                      <X size={14} />
                    </IconButton>
                  </Box>
                ))}
              </Box>
            )}

            <Paper
              elevation={0}
              sx={{
                display: 'flex',
                alignItems: 'flex-end',
                p: '16px 20px',
                borderRadius: '28px',
                background: theme.palette.mode === 'light'
                  ? 'rgba(255, 255, 255, 0.9)'
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
                position: 'relative',
                '&::before': {
                  content: '""',
                  position: 'absolute',
                  top: 0,
                  left: 0,
                  right: 0,
                  bottom: 0,
                  borderRadius: '28px',
                  background: theme.palette.mode === 'light'
                    ? 'linear-gradient(135deg, rgba(102, 126, 234, 0.03) 0%, rgba(118, 75, 162, 0.03) 100%)'
                    : 'linear-gradient(135deg, rgba(59, 130, 246, 0.05) 0%, rgba(168, 85, 247, 0.05) 100%)',
                  pointerEvents: 'none',
                },
              }}
            >
              {/* Input Tools */}
              <Box sx={{
                display: 'flex',
                flexDirection: 'column',
                gap: 0.5,
                mr: { xs: 0.5, sm: 1 },
                alignItems: 'center'
              }}>
                <EmojiPicker onEmojiSelect={(emoji) => setMessage(prev => prev + emoji)} />
                {/* 
                <Tooltip title="Attach file">
                  <IconButton
                    onClick={handleAttachmentClick}
                    sx={{
                      minWidth: { xs: 40, sm: 32 },
                      minHeight: { xs: 40, sm: 32 },
                      width: { xs: 40, sm: 32 },
                      height: { xs: 40, sm: 32 },
                      color: 'text.secondary',
                      '&:hover': {
                        bgcolor: alpha(theme.palette.primary.main, 0.1),
                        color: 'primary.main',
                      },
                      '&:active': {
                        transform: 'scale(0.95)',
                      },
                      transition: 'all 0.2s ease-in-out',
                    }}
                  >
                    <Paperclip size={18} />
                  </IconButton>
                </Tooltip>

                <Tooltip title={isRecording ? "Stop recording" : "Voice message"}>
                  <IconButton
                    onClick={isRecording ? stopRecording : startRecording}
                    disabled={!isConnected || isUserBlocked}
                    sx={{
                      minWidth: { xs: 40, sm: 32 },
                      minHeight: { xs: 40, sm: 32 },
                      width: { xs: 40, sm: 32 },
                      height: { xs: 40, sm: 32 },
                      color: isRecording ? '#ef4444' : 'text.secondary',
                      animation: isRecording ? 'pulse 1s infinite' : 'none',
                      '@keyframes pulse': {
                        '0%': { transform: 'scale(1)' },
                        '50%': { transform: 'scale(1.1)' },
                        '100%': { transform: 'scale(1)' },
                      },
                      '&:hover': {
                        bgcolor: isRecording ? alpha('#ef4444', 0.1) : alpha(theme.palette.primary.main, 0.1),
                        color: isRecording ? '#ef4444' : 'primary.main',
                      },
                      '&:active': {
                        transform: 'scale(0.95)',
                      },
                      transition: 'all 0.2s ease-in-out',
                    }}
                  >
                    {isRecording ? <MicOff size={18} /> : <Mic size={18} />}
                  </IconButton>
                </Tooltip> */}
              </Box>

              {/* Recording Indicator */}
              {isRecording && (
                <Box sx={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: 1,
                  mr: 2,
                  px: 2,
                  py: 1,
                  borderRadius: 2,
                  bgcolor: alpha('#ef4444', 0.1),
                  border: `1px solid ${alpha('#ef4444', 0.2)}`,
                }}>
                  <Box
                    sx={{
                      width: 8,
                      height: 8,
                      borderRadius: '50%',
                      bgcolor: '#ef4444',
                      animation: 'recordingBlink 1s infinite',
                      '@keyframes recordingBlink': {
                        '0%, 50%': { opacity: 1 },
                        '51%, 100%': { opacity: 0.3 },
                      },
                    }}
                  />
                  <Typography variant="caption" sx={{ color: '#ef4444', fontWeight: 600 }}>
                    {formatRecordingTime(recordingTime)}
                  </Typography>
                </Box>
              )}

              <TextField
                fullWidth
                multiline
                maxRows={4}
                placeholder={
                  isRecording
                    ? "Recording voice message..."
                    : isUserBlocked
                      ? "User is blocked"
                      : "Type a message..."
                }
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
                disabled={isUserBlocked || !isConnected || isRecording}
                InputProps={{ disableUnderline: true }}
                sx={{
                  px: 2,
                  py: 1,
                  background: theme.palette.mode === 'light'
                    ? 'rgba(248, 250, 252, 0.8)'
                    : 'rgba(15, 23, 42, 0.8)',
                  borderRadius: '16px',
                  border: `1px solid ${alpha(theme.palette.divider, 0.2)}`,
                  transition: 'all 0.3s cubic-bezier(0.4, 0, 0.2, 1)',
                  '&:hover': {
                    borderColor: alpha('#6366f1', 0.3),
                    background: theme.palette.mode === 'light'
                      ? 'rgba(248, 250, 252, 0.9)'
                      : 'rgba(15, 23, 42, 0.9)',
                  },
                  '&:focus-within': {
                    borderColor: '#6366f1',
                    boxShadow: '0 0 0 3px rgba(99, 102, 241, 0.1)',
                    background: theme.palette.mode === 'light'
                      ? 'rgba(255, 255, 255, 0.95)'
                      : 'rgba(30, 41, 59, 0.95)',
                  },
                  '& .MuiInputBase-input::placeholder': {
                    color: theme.palette.text.disabled,
                    opacity: 0.7,
                  },
                  '& .MuiInputBase-input': {
                    color: theme.palette.text.primary,
                    fontSize: '0.95rem',
                    lineHeight: 1.4,
                  }
                }}
              />
              <IconButton
                color="primary"
                disabled={(!message.trim() && attachments.length === 0) || !isConnected || isUserBlocked || isRecording}
                onClick={handleSendMessage}
                sx={{
                  minWidth: { xs: 48, sm: 44 },
                  minHeight: { xs: 48, sm: 44 },
                  width: { xs: 48, sm: 44 },
                  height: { xs: 48, sm: 44 },
                  background: (message.trim() || attachments.length > 0)
                    ? 'linear-gradient(135deg, #0ea5e9 0%, #0284c7 100%)'
                    : 'transparent',
                  color: (message.trim() || attachments.length > 0) ? 'white' : theme.palette.text.disabled,
                  border: (message.trim() || attachments.length > 0) ? 'none' : `2px solid ${alpha(theme.palette.mode === 'light' ? '#667eea' : '#3b82f6', 0.3)}`,
                  boxShadow: (message.trim() || attachments.length > 0)
                    ? '0 6px 20px rgba(102, 126, 234, 0.4), 0 3px 10px rgba(118, 75, 162, 0.3), inset 0 1px 0 rgba(255, 255, 255, 0.2)'
                    : 'none',
                  '&:hover': {
                    background: (message.trim() || attachments.length > 0)
                      ? 'linear-gradient(135deg, #5a67d8 0%, #6b46c1 100%)'
                      : alpha(theme.palette.mode === 'light' ? '#667eea' : '#3b82f6', 0.1),
                    transform: (message.trim() || attachments.length > 0) ? 'scale(1.08)' : 'none',
                    boxShadow: (message.trim() || attachments.length > 0)
                      ? '0 8px 28px rgba(102, 126, 234, 0.5), 0 4px 14px rgba(118, 75, 162, 0.4), inset 0 1px 0 rgba(255, 255, 255, 0.3)'
                      : 'none',
                  },
                  '&:active': {
                    transform: 'scale(0.92)',
                    transition: 'transform 0.1s ease-in-out',
                  },
                  '&:disabled': {
                    background: 'transparent',
                    color: theme.palette.text.disabled,
                    border: `1px solid ${alpha(theme.palette.divider, 0.2)}`,
                  },
                  transition: 'all 0.3s cubic-bezier(0.4, 0, 0.2, 1)',
                }}
              >
                <Send size={20} />
              </IconButton>
            </Paper>

            {/* Hidden file input */}
            <input
              ref={fileInputRef}
              type="file"
              multiple
              accept="image/*,video/*,audio/*,.pdf,.txt,.doc,.docx"
              onChange={handleFileSelect}
              style={{ display: 'none' }}
            />
          </Stack>
        </Box>

        {/* Menus & Dialogs */}
        <Menu
          anchorEl={menuAnchor}
          open={Boolean(menuAnchor)}
          onClose={handleMenuClose}
          transformOrigin={{ horizontal: 'right', vertical: 'top' }}
          anchorOrigin={{ horizontal: 'right', vertical: 'bottom' }}
        >
          <MenuItem onClick={handleBlockClick} sx={{ color: theme.palette.error.main }}>
            <ListItemIcon><Ban size={18} color={theme.palette.error.main} /></ListItemIcon>
            <ListItemText>{isUserBlocked ? 'Unblock User' : 'Block User'}</ListItemText>
          </MenuItem>
        </Menu>

        <UserProfileDialog
          open={profileDialogOpen}
          onClose={() => setProfileDialogOpen(false)}
          userId={otherUser?.id || ''}
          username={otherUser?.username || ''}
          email={otherUser?.email || ''}
        />
        <UserBlockDialog
          open={blockDialogOpen}
          onClose={() => setBlockDialogOpen(false)}
          userId={otherUser?.id || ''}
          username={otherUser?.username || ''}
          isBlocked={isUserBlocked}
        />
      </Box>

      {/* Global CSS for animations */}
      <style>
        {`
          @keyframes pulse {
            0% { transform: scale(1); opacity: 1; }
            50% { transform: scale(1.1); opacity: 0.8; }
            100% { transform: scale(1); opacity: 1; }
          }
        `}
      </style>
    </UnifiedChatLayout>
  );
}

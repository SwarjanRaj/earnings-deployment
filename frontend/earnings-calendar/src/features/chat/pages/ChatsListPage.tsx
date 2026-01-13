import { useState, useEffect, useMemo, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  Box,
  Typography,
  Button,
  Stack,
  Card,
  CardContent,
  alpha,
  useTheme,
  Chip,
  Avatar,
  Snackbar,
  Alert,
  TextField,
  InputAdornment,
  Tabs,
  Tab,
  IconButton,
  Badge,
  Skeleton,
} from '@mui/material';
import {
  MessageSquare,
  User,
  Search,
  X,
  Users,
} from 'lucide-react';
import {
  useGetUsersForChatQuery,
  useCreateOneToOneChatMutation,
  useGetUserChatsQuery,
} from '../../../services/chatApi';
import { useAuth } from '../../../app/useAuth';
import UnifiedChatLayout from '../components/UnifiedChatLayout';
import type { Chat } from '../../../services/chatApi';

interface TabPanelProps {
  children?: React.ReactNode;
  index: number;
  value: number;
}

function TabPanel(props: TabPanelProps) {
  const { children, value, index, ...other } = props;
  return (
    <div
      role="tabpanel"
      hidden={value !== index}
      id={`chat-tabpanel-${index}`}
      aria-labelledby={`chat-tab-${index}`}
      {...other}
    >
      {value === index && <Box sx={{ pt: 3 }}>{children}</Box>}
    </div>
  );
}

export default function ChatsListPage() {
  const theme = useTheme();
  const navigate = useNavigate();
  const { user, isAuthenticated } = useAuth();

  // Security: Redirect if not authenticated
  if (!isAuthenticated) {
    return null; // Will be handled by PrivateRoute, but this is a safety check
  }
  const [tabValue, setTabValue] = useState(0);
  const [searchQuery, setSearchQuery] = useState('');
  const [hoveredCard, setHoveredCard] = useState<string | null>(null);

  const { data: usersData = [], isLoading: isLoadingUsers } = useGetUsersForChatQuery();
  const { data: existingChats = [], isLoading: isLoadingChats } = useGetUserChatsQuery();
  const [createChat, { isLoading: isCreatingChat }] = useCreateOneToOneChatMutation();

  // Filter out current user and admin users from the list
  const users = useMemo(() => {
    return usersData.filter((u) => {
      // Exclude current user
      if (u.id === user?.id) return false;
      // Exclude admin and superadmin users
      const userRole = u.role?.toLowerCase();
      if (userRole === 'admin' || userRole === 'superadmin') return false;
      return true;
    });
  }, [usersData, user?.id]);

  const [snackbar, setSnackbar] = useState<{ open: boolean; message: string; severity: 'success' | 'error' }>({
    open: false,
    message: '',
    severity: 'success',
  });

  // Get one-to-one chats only
  const oneToOneChats = useMemo(() => {
    return existingChats.filter((chat) => chat.type === 'ONE_TO_ONE');
  }, [existingChats]);

  // Helper to get existing chat for a user
  const getExistingChat = useCallback((userId: string) => {
    return oneToOneChats.find(
      (chat) =>
        chat.type === 'ONE_TO_ONE' &&
        chat.members.some((m) => m.userId === userId)
    );
  }, [oneToOneChats]);


  // Filter chats based on search
  const filteredChats = useMemo(() => {
    if (!searchQuery.trim()) return oneToOneChats;
    const query = searchQuery.toLowerCase();
    return oneToOneChats.filter((chat) => {
      const otherMember = chat.members.find((m) => m.userId !== user?.id);
      return (
        otherMember?.user.username.toLowerCase().includes(query) ||
        otherMember?.user.email.toLowerCase().includes(query)
      );
    });
  }, [oneToOneChats, searchQuery, user?.id]);

  const isUserOnline = () => {
    // TODO: Implement online status check when API is available
    // For now, return false (can be enhanced with socket connection status)
    return false;
  };

  const handleStartChat = async (targetUserId: string, existingChatId?: string | null) => {
    try {
      let chatId: string;

      if (existingChatId) {
        chatId = existingChatId;
      } else {
        const chat = await createChat(targetUserId).unwrap();
        chatId = chat.id;
      }

      navigate(`/chat/one-to-one/${chatId}`);
    } catch (error: any) {
      console.error('Failed to start chat:', error);
      const errorMessage = error && typeof error === 'object' && 'data' in error
        ? ((error.data as { message?: string })?.message) || 'Failed to start chat. Please try again.'
        : 'Failed to start chat. Please try again.';
      setSnackbar({
        open: true,
        message: errorMessage,
        severity: 'error',
      });
    }
  };

  const formatLastMessageTime = (dateString?: string) => {
    if (!dateString) return '';
    const date = new Date(dateString);
    const now = new Date();
    const diffMs = now.getTime() - date.getTime();
    const diffMins = Math.floor(diffMs / 60000);
    const diffHours = Math.floor(diffMs / 3600000);
    const diffDays = Math.floor(diffMs / 86400000);

    if (diffMins < 1) return 'Just now';
    if (diffMins < 60) return `${diffMins}m ago`;
    if (diffHours < 24) return `${diffHours}h ago`;
    if (diffDays < 7) return `${diffDays}d ago`;
    return date.toLocaleDateString();
  };

  const getOtherUser = (chat: Chat) => {
    if (!chat.members || chat.members.length === 0) return null;
    // For one-to-one chats, find the member that's not the current user
    const otherMember = chat.members.find((m) => m.userId !== user?.id);
    return otherMember?.user || null;
  };

  return (
    <UnifiedChatLayout>
      <Box
        sx={{
          width: '100%',
          height: '100%',
          display: 'flex',
          flexDirection: 'column',
          overflow: 'hidden',
        }}
      >
        {/* Modern Header Section with Search - No Breadcrumb */}
        <Box
          sx={{
            p: { xs: 1.5, sm: 2, md: 2.5 },
            borderBottom: `1px solid ${alpha(theme.palette.divider, 0.08)}`,
            bgcolor: theme.palette.mode === 'light'
              ? alpha(theme.palette.grey[50], 0.98)
              : alpha(theme.palette.grey[800], 0.98),
            position: 'sticky',
            top: 0,
            zIndex: 10,
          }}
        >
          <Stack spacing={2}>
            <Box sx={{ flex: 1 }}>
              <Typography
                variant="h5"
                fontWeight={700}
                sx={{
                  fontSize: { xs: '1.25rem', sm: '1.5rem', md: '1.75rem' },
                  mb: 0.5,
                }}
              >
                Messages
              </Typography>
              <Typography variant="body2" color="text.secondary" sx={{ fontSize: '0.875rem' }}>
                {tabValue === 0
                  ? `${oneToOneChats.length} ${oneToOneChats.length === 1 ? 'conversation' : 'conversations'} started`
                  : `${users.length} ${users.length === 1 ? 'user' : 'users'} available`}
              </Typography>
            </Box>

            {/* Modern Search Bar */}
            <TextField
              fullWidth
              size="small"
              placeholder={tabValue === 0 ? 'Search conversations...' : 'Search users...'}
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              InputProps={{
                startAdornment: (
                  <InputAdornment position="start">
                    <Search size={18} style={{ opacity: 0.5 }} />
                  </InputAdornment>
                ),
                endAdornment: searchQuery && (
                  <InputAdornment position="end">
                    <IconButton
                      size="small"
                      onClick={() => setSearchQuery('')}
                      sx={{ mr: -1 }}
                    >
                      <X size={16} />
                    </IconButton>
                  </InputAdornment>
                ),
              }}
              sx={{
                '& .MuiOutlinedInput-root': {
                  borderRadius: 2.5,
                  bgcolor: theme.palette.mode === 'light'
                    ? alpha(theme.palette.background.paper, 0.98)
                    : alpha(theme.palette.grey[700], 0.5),
                  transition: 'all 0.3s',
                  '&:hover': {
                    bgcolor: theme.palette.mode === 'light'
                      ? theme.palette.background.paper
                      : alpha(theme.palette.grey[700], 0.7),
                  },
                  '&.Mui-focused': {
                    bgcolor: theme.palette.background.paper,
                    boxShadow: `0 0 0 3px ${alpha(theme.palette.primary.main, 0.1)}`,
                  },
                },
              }}
            />

            {/* Modern Tabs */}
            <Tabs
              value={tabValue}
              onChange={(_, newValue) => setTabValue(newValue)}
              sx={{
                mt: 1,
                '& .MuiTab-root': {
                  textTransform: 'none',
                  fontWeight: 600,
                  minHeight: 44,
                  fontSize: { xs: '0.875rem', sm: '0.9375rem' },
                  px: { xs: 1.5, sm: 2 },
                  '&.Mui-selected': {
                    color: theme.palette.primary.main,
                  },
                },
                '& .MuiTabs-indicator': {
                  height: 3,
                  borderRadius: '3px 3px 0 0',
                },
              }}
            >
              <Tab
                icon={<MessageSquare size={18} />}
                iconPosition="start"
                label={
                  <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5 }}>
                    <Box component="span" sx={{ display: { xs: 'none', sm: 'inline' } }}>
                      My Chats
                    </Box>
                    <Box component="span" sx={{ display: { xs: 'inline', sm: 'none' } }}>
                      Chats
                    </Box>
                    {oneToOneChats.length > 0 && (
                      <Chip
                        label={oneToOneChats.length}
                        size="small"
                        sx={{
                          height: 20,
                          minWidth: 20,
                          fontSize: '0.7rem',
                          bgcolor: alpha(theme.palette.primary.main, 0.1),
                          color: theme.palette.primary.main,
                          fontWeight: 600,
                        }}
                      />
                    )}
                  </Box>
                }
              />
              <Tab
                icon={<Users size={18} />}
                iconPosition="start"
                label={
                  <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5 }}>
                    <Box component="span" sx={{ display: { xs: 'none', sm: 'inline' } }}>
                      All Users
                    </Box>
                    <Box component="span" sx={{ display: { xs: 'inline', sm: 'none' } }}>
                      Users
                    </Box>
                    {users.length > 0 && (
                      <Chip
                        label={users.length}
                        size="small"
                        sx={{
                          height: 20,
                          minWidth: 20,
                          fontSize: '0.7rem',
                          bgcolor: alpha(theme.palette.secondary.main, 0.1),
                          color: theme.palette.secondary.main,
                          fontWeight: 600,
                        }}
                      />
                    )}
                  </Box>
                }
              />
            </Tabs>
          </Stack>
        </Box>

        {/* Content Area */}
        <Box
          sx={{
            flex: 1,
            overflowY: 'auto',
            overflowX: 'hidden',
            p: { xs: 2, sm: 3 },
            bgcolor: theme.palette.mode === 'light'
              ? alpha(theme.palette.grey[50], 0.5)
              : alpha(theme.palette.grey[900], 0.3),
          }}
        >
          {/* My Chats Tab */}
          <TabPanel value={tabValue} index={0}>
            {isLoadingChats ? (
              <Stack spacing={1.5}>
                {[1, 2, 3, 4, 5].map((i) => (
                  <Box key={i} sx={{ display: 'flex', gap: 2, alignItems: 'center', p: 2 }}>
                    <Skeleton variant="circular" width={56} height={56} />
                    <Box sx={{ flex: 1 }}>
                      <Skeleton variant="text" width="40%" height={24} sx={{ mb: 1 }} />
                      <Skeleton variant="text" width="80%" height={20} />
                    </Box>
                  </Box>
                ))}
              </Stack>
            ) : oneToOneChats.length === 0 ? (
              <Box sx={{ textAlign: 'center', py: 12 }}>
                <Box
                  sx={{
                    width: 80,
                    height: 80,
                    borderRadius: '50%',
                    bgcolor: alpha(theme.palette.primary.main, 0.08),
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    mx: 'auto',
                    mb: 3,
                  }}
                >
                  <MessageSquare size={40} color={theme.palette.primary.main} style={{ opacity: 0.6 }} />
                </Box>
                <Typography variant="h5" fontWeight={700} sx={{ mb: 1 }}>
                  No conversations yet
                </Typography>
                <Typography variant="body2" color="text.secondary" sx={{ mb: 4, maxWidth: 400, mx: 'auto' }}>
                  Start a conversation with someone to see it here
                </Typography>
                <Button
                  variant="contained"
                  onClick={() => setTabValue(1)}
                  startIcon={<Users size={18} />}
                  sx={{ borderRadius: 2 }}
                >
                  Browse Users
                </Button>
              </Box>
            ) : filteredChats.length === 0 && searchQuery ? (
              <Box sx={{ textAlign: 'center', py: 12 }}>
                <Box
                  sx={{
                    width: 80,
                    height: 80,
                    borderRadius: '50%',
                    bgcolor: alpha(theme.palette.primary.main, 0.08),
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    mx: 'auto',
                    mb: 3,
                  }}
                >
                  <MessageSquare size={40} color={theme.palette.primary.main} style={{ opacity: 0.6 }} />
                </Box>
                <Typography variant="h5" fontWeight={700} sx={{ mb: 1 }}>
                  {searchQuery ? 'No conversations found' : 'No conversations yet'}
                </Typography>
                <Typography variant="body2" color="text.secondary" sx={{ mb: 4, maxWidth: 400, mx: 'auto' }}>
                  {searchQuery
                    ? 'Try a different search term'
                    : 'Start a conversation with someone to see it here'}
                </Typography>
                {!searchQuery && (
                  <Button
                    variant="contained"
                    onClick={() => setTabValue(1)}
                    startIcon={<Users size={18} />}
                    sx={{ borderRadius: 2 }}
                  >
                    Browse Users
                  </Button>
                )}
              </Box>
            ) : (
              <Stack spacing={1.5}>
                {filteredChats.map((chat, index) => {
                  const otherUser = getOtherUser(chat);
                  // Don't skip if otherUser is null - show chat anyway with fallback
                  const displayName = otherUser?.username || 'Unknown User';
                  const isOnline = otherUser ? isUserOnline() : false;
                  // Get the most recent message (assuming messages are sorted by createdAt desc)
                  const lastMessage = chat.messages && chat.messages.length > 0
                    ? [...chat.messages].sort((a, b) =>
                      new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
                    )[0]
                    : null;

                  return (
                    <Card
                      key={chat.id}
                      onMouseEnter={() => setHoveredCard(chat.id)}
                      onMouseLeave={() => setHoveredCard(null)}
                      onClick={() => navigate(`/chat/one-to-one/${chat.id}`)}
                      sx={{
                        borderRadius: 3,
                        bgcolor: theme.palette.background.paper,
                        border: `1px solid ${alpha(theme.palette.divider, 0.08)}`,
                        boxShadow: hoveredCard === chat.id
                          ? `0 4px 12px ${alpha(theme.palette.primary.main, 0.1)}`
                          : '0 2px 8px rgba(0,0,0,0.08)',
                        cursor: 'pointer',
                        '&:hover': {
                          borderColor: alpha(theme.palette.primary.main, 0.2),
                        },
                      }}
                    >
                      <CardContent sx={{ p: { xs: 1.5, sm: 2 } }}>
                        <Stack direction="row" spacing={1.5} alignItems="center">
                          <Badge
                            overlap="circular"
                            anchorOrigin={{ vertical: 'bottom', horizontal: 'right' }}
                            variant="dot"
                            sx={{
                              '& .MuiBadge-badge': {
                                bgcolor: isOnline ? theme.palette.success.main : 'transparent',
                                border: `2px solid ${theme.palette.background.paper}`,
                                width: 12,
                                height: 12,
                              },
                            }}
                          >
                            <Avatar
                              sx={{
                                width: { xs: 48, sm: 52 },
                                height: { xs: 48, sm: 52 },
                                bgcolor: theme.palette.primary.main,
                                fontSize: { xs: '1.25rem', sm: '1.5rem' },
                                fontWeight: 700,
                              }}
                            >
                              {displayName.charAt(0).toUpperCase()}
                            </Avatar>
                          </Badge>
                          <Box sx={{ flex: 1, minWidth: 0 }}>
                            <Stack direction="row" spacing={1} alignItems="center" mb={0.5}>
                              <Typography
                                variant="subtitle1"
                                fontWeight={600}
                                noWrap
                                sx={{
                                  flex: 1,
                                  fontSize: { xs: '0.9375rem', sm: '1rem' },
                                }}
                              >
                                {displayName}
                              </Typography>
                              {chat.lastMessageAt && (
                                <Typography
                                  variant="caption"
                                  color="text.secondary"
                                  sx={{
                                    fontSize: '0.7rem',
                                    whiteSpace: 'nowrap',
                                  }}
                                >
                                  {formatLastMessageTime(chat.lastMessageAt)}
                                </Typography>
                              )}
                            </Stack>
                            <Typography
                              variant="body2"
                              color="text.secondary"
                              noWrap
                              sx={{
                                fontSize: { xs: '0.8125rem', sm: '0.875rem' },
                                opacity: 0.8,
                              }}
                            >
                              {lastMessage
                                ? `${lastMessage.user.username}: ${lastMessage.content.substring(0, 40)}${lastMessage.content.length > 40 ? '...' : ''}`
                                : 'No messages yet'}
                            </Typography>
                          </Box>
                        </Stack>
                      </CardContent>
                    </Card>
                  );
                })}
              </Stack>
            )}
          </TabPanel>

          {/* All Users Tab */}
          <TabPanel value={tabValue} index={1}>
            {/* Show all users in one unified list */}
            {!isLoadingUsers && users.length > 0 && (
              <Box
                sx={{
                  display: 'grid',
                  gridTemplateColumns: {
                    xs: '1fr',
                    sm: 'repeat(2, 1fr)',
                    md: 'repeat(3, 1fr)',
                    lg: 'repeat(4, 1fr)',
                  },
                  gap: { xs: 2, sm: 2.5, md: 3 },
                }}
              >
                {users
                  .filter((user) => {
                    if (!searchQuery.trim()) return true;
                    const query = searchQuery.toLowerCase();
                    return (
                      user.username.toLowerCase().includes(query) ||
                      user.email.toLowerCase().includes(query) ||
                      user.role?.toLowerCase().includes(query)
                    );
                  })
                  .map((userItem, index) => {
                    const existingChat = getExistingChat(userItem.id);
                    const hasExistingChat = !!existingChat;
                    const isOnline = isUserOnline();

                    return (
                      <Card
                        key={userItem.id}
                        onMouseEnter={() => setHoveredCard(userItem.id)}
                        onMouseLeave={() => setHoveredCard(null)}
                        sx={{
                          borderRadius: 3,
                          bgcolor: theme.palette.background.paper,
                          border: hasExistingChat
                            ? `1px solid ${alpha(theme.palette.primary.main, 0.2)}`
                            : `1px solid ${alpha(theme.palette.divider, 0.08)}`,
                          boxShadow: hoveredCard === userItem.id
                            ? `0 4px 12px ${alpha(theme.palette.primary.main, 0.1)}`
                            : '0 2px 8px rgba(0,0,0,0.08)',
                          overflow: 'hidden',
                          position: 'relative',
                          '&:hover': {
                            borderColor: hasExistingChat
                              ? alpha(theme.palette.primary.main, 0.3)
                              : alpha(theme.palette.secondary.main, 0.2),
                          },
                        }}
                      >
                        <CardContent sx={{ p: { xs: 1.5, sm: 2 } }}>
                          <Stack spacing={1.5} alignItems="center" sx={{ textAlign: 'center', pt: 0.5 }}>
                            <Badge
                              overlap="circular"
                              anchorOrigin={{ vertical: 'bottom', horizontal: 'right' }}
                              variant="dot"
                              sx={{
                                '& .MuiBadge-badge': {
                                  bgcolor: isOnline ? theme.palette.success.main : 'transparent',
                                  border: `2px solid ${theme.palette.background.paper}`,
                                  width: 14,
                                  height: 14,
                                },
                              }}
                            >
                              <Avatar
                                sx={{
                                  width: { xs: 56, sm: 64 },
                                  height: { xs: 56, sm: 64 },
                                  bgcolor: hasExistingChat ? theme.palette.primary.main : theme.palette.secondary.main,
                                  fontSize: { xs: '1.5rem', sm: '1.75rem' },
                                  fontWeight: 700,
                                }}
                              >
                                {userItem.username.charAt(0).toUpperCase()}
                              </Avatar>
                            </Badge>
                            <Box sx={{ width: '100%' }}>
                              <Typography
                                variant="subtitle1"
                                fontWeight={700}
                                noWrap
                                sx={{
                                  fontSize: { xs: '0.9375rem', sm: '1rem' },
                                  mb: 0.5,
                                }}
                              >
                                {userItem.username}
                              </Typography>
                              <Typography
                                variant="body2"
                                color="text.secondary"
                                noWrap
                                sx={{
                                  fontSize: { xs: '0.75rem', sm: '0.8125rem' },
                                  mb: 1,
                                }}
                              >
                                {userItem.email}
                              </Typography>
                              <Stack direction="row" spacing={0.75} justifyContent="center" sx={{ mb: 1.5 }}>
                                {hasExistingChat && (
                                  <Chip
                                    label="Chat"
                                    size="small"
                                    sx={{
                                      height: 22,
                                      fontSize: '0.7rem',
                                      borderRadius: 1.5,
                                      bgcolor: alpha(theme.palette.success.main, 0.1),
                                      color: theme.palette.success.main,
                                      fontWeight: 600,
                                    }}
                                  />
                                )}
                                {userItem.role && userItem.role.toLowerCase() !== 'user' && (
                                  <Chip
                                    label={userItem.role}
                                    size="small"
                                    sx={{
                                      height: 22,
                                      fontSize: '0.7rem',
                                      borderRadius: 1.5,
                                      bgcolor: alpha(theme.palette.primary.main, 0.1),
                                      color: theme.palette.primary.main,
                                      fontWeight: 600,
                                    }}
                                  />
                                )}
                              </Stack>
                            </Box>
                            <Button
                              variant="contained"
                              fullWidth
                              onClick={() => handleStartChat(userItem.id, existingChat?.id)}
                              disabled={isCreatingChat}
                              startIcon={<MessageSquare size={16} />}
                              sx={{
                                borderRadius: 2,
                                py: { xs: 1, sm: 1.2 },
                                fontWeight: 600,
                                fontSize: { xs: '0.8125rem', sm: '0.875rem' },
                                bgcolor: hasExistingChat
                                  ? theme.palette.primary.main
                                  : theme.palette.secondary.main,
                                '&:hover': {
                                  bgcolor: hasExistingChat
                                    ? theme.palette.primary.dark
                                    : theme.palette.secondary.dark,
                                },
                              }}
                            >
                              {hasExistingChat ? 'Open Chat' : 'Start Chat'}
                            </Button>
                          </Stack>
                        </CardContent>
                      </Card>
                    );
                  })}
              </Box>
            )}

            {/* Loading state */}
            {isLoadingUsers && (
              <Box
                sx={{
                  display: 'grid',
                  gridTemplateColumns: {
                    xs: '1fr',
                    sm: 'repeat(2, 1fr)',
                    md: 'repeat(3, 1fr)',
                    lg: 'repeat(4, 1fr)',
                  },
                  gap: { xs: 1.5, sm: 2, md: 2.5 },
                }}
              >
                {[1, 2, 3, 4, 5, 6, 7, 8].map((i) => (
                  <Skeleton
                    key={i}
                    variant="rectangular"
                    height={200}
                    sx={{
                      borderRadius: 3,
                      height: { xs: 180, sm: 200 },
                    }}
                  />
                ))}
              </Box>
            )}

            {/* Empty state when no users */}
            {!isLoadingUsers && users.length === 0 && (
              <Box sx={{ textAlign: 'center', py: 12 }}>
                <Box
                  sx={{
                    width: 80,
                    height: 80,
                    borderRadius: '50%',
                    bgcolor: alpha(theme.palette.secondary.main, 0.08),
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    mx: 'auto',
                    mb: 3,
                  }}
                >
                  <User size={40} color={theme.palette.secondary.main} style={{ opacity: 0.6 }} />
                </Box>
                <Typography variant="h5" fontWeight={700} sx={{ mb: 1 }}>
                  {searchQuery ? 'No users found' : 'No users available'}
                </Typography>
                <Typography variant="body2" color="text.secondary" sx={{ mb: 4, maxWidth: 400, mx: 'auto' }}>
                  {searchQuery
                    ? 'Try a different search term'
                    : 'There are no other users available to chat with at the moment.'}
                </Typography>
              </Box>
            )}
          </TabPanel>
        </Box>

        {/* Snackbar for errors */}
        <Snackbar
          open={snackbar.open}
          autoHideDuration={6000}
          onClose={() => setSnackbar({ ...snackbar, open: false })}
          anchorOrigin={{ vertical: 'bottom', horizontal: 'center' }}
        >
          <Alert
            onClose={() => setSnackbar({ ...snackbar, open: false })}
            severity={snackbar.severity}
            sx={{ width: '100%', borderRadius: 2 }}
          >
            {snackbar.message}
          </Alert>
        </Snackbar>
      </Box>
    </UnifiedChatLayout>
  );
}

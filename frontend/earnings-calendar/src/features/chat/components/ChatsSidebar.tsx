import { useState, useMemo } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import {
  Box,
  Typography,
  TextField,
  InputAdornment,
  Avatar,
  alpha,
  useTheme,
  Stack,
  Badge,
} from '@mui/material';
import { Search, User, BellOff } from 'lucide-react';
import { useGetUserChatsQuery, chatApi } from '../../../services/chatApi';
import { useAuth } from '../../../app/useAuth';
import { useDispatch } from 'react-redux';
import type { Chat } from '../../../services/chatApi';

interface ChatsSidebarProps {
  onClose?: () => void;
}

export default function ChatsSidebar({ onClose }: ChatsSidebarProps) {
  const theme = useTheme();
  const navigate = useNavigate();
  const { chatId } = useParams<{ chatId: string }>();
  const { user } = useAuth();
  const dispatch = useDispatch();
  const { data: chats = [], isLoading } = useGetUserChatsQuery();
  const [searchQuery, setSearchQuery] = useState('');

  const prefetchChat = (chatId: string) => {
    dispatch(chatApi.util.prefetch('getMessages', { chatId, page: 1, limit: 100 }, { force: true }));
  };

  // Strictly filter for ONE_TO_ONE chats always
  const oneToOneChats = useMemo(() => {
    return chats.filter((chat) => chat.type === 'ONE_TO_ONE');
  }, [chats]);

  const filteredChats = useMemo(() => {
    if (!searchQuery.trim()) return oneToOneChats;
    const query = searchQuery.toLowerCase();

    return oneToOneChats.filter((chat) => {
      const otherUser = chat.members.find((m) => m.userId !== user?.id)?.user;
      return (
        otherUser?.username.toLowerCase().includes(query) ||
        otherUser?.email.toLowerCase().includes(query)
      );
    });
  }, [oneToOneChats, searchQuery, user?.id]);

  const handleChatClick = (chat: Chat) => {
    navigate(`/chat/one-to-one/${chat.id}`);
    onClose?.();
  };

  const formatLastMessage = (chat: Chat) => {
    if (chat.messages && chat.messages.length > 0) {
      // Sort messages to get the real last one if needed, though they usually come sorted or we look at lastMessageAt
      // Assuming chat.messages[0] is the latest or we rely on lastMessageAt. 
      // Let's optimize by trusting the API or basic finding content.
      // Usually messages are paginated, so we might check if 'messages' is populated.
      // For snippet preview, finding the last in the array is safest if array is small, 
      // or first if backend sends latest first. Assuming DESC order for preview:
      const lastMsg = chat.messages[0];
      if (!lastMsg) return 'No messages yet';

      const content = lastMsg.content || ((lastMsg as any).attachments?.length ? 'Attachment' : '');
      return content.length > 35
        ? content.substring(0, 35) + '...'
        : content;
    }
    return 'No messages yet';
  };

  const formatTime = (dateString?: string) => {
    if (!dateString) return '';
    const date = new Date(dateString);
    const now = new Date();
    const diff = now.getTime() - date.getTime();
    const minutes = Math.floor(diff / 60000);

    if (minutes < 1) return 'Just now';
    if (minutes < 60) return `${minutes}m`;
    if (minutes < 1440) return `${Math.floor(minutes / 60)}h`;
    return date.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
  };

  return (
    <Box
      sx={{
        width: '100%',
        height: '100%',
        display: 'flex',
        flexDirection: 'column',
        bgcolor: 'transparent',
        overflow: 'hidden',
      }}
    >
      {/* Header */}
      <Box sx={{
        p: 3,
        pb: 2,
        // borderBottom: `1px solid ${alpha(theme.palette.divider, 0.05)}`,
      }}>
        <Typography
          variant="h6"
          fontWeight={700}
          sx={{
            mb: 2.5,
            letterSpacing: '-0.02em',
            fontSize: '1.25rem',
            background: 'linear-gradient(45deg, #6366f1, #8b5cf6)',
            backgroundClip: 'text',
            textFillColor: 'transparent',
            WebkitBackgroundClip: 'text',
            WebkitTextFillColor: 'transparent',
            display: 'inline-block'
          }}
        >
          Direct Messages
        </Typography>

        <TextField
          fullWidth
          size="small"
          placeholder="Search people..."
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          InputProps={{
            startAdornment: (
              <InputAdornment position="start">
                <Search size={16} color={theme.palette.text.secondary} style={{ opacity: 0.7 }} />
              </InputAdornment>
            ),
          }}
          sx={{
            '& .MuiOutlinedInput-root': {
              borderRadius: '16px',
              bgcolor: theme.palette.mode === 'light'
                ? alpha(theme.palette.common.black, 0.04)
                : alpha(theme.palette.common.white, 0.04),
              border: '1px solid transparent',
              transition: 'all 0.2s',
              '& fieldset': { border: 'none' },
              '&:hover': {
                bgcolor: theme.palette.mode === 'light'
                  ? alpha(theme.palette.common.black, 0.06)
                  : alpha(theme.palette.common.white, 0.08),
              },
              '&.Mui-focused': {
                bgcolor: theme.palette.background.paper,
                boxShadow: `0 4px 20px -2px ${alpha(theme.palette.primary.main, 0.15)}`,
                border: `1px solid ${alpha(theme.palette.primary.main, 0.3)}`,
              }
            },
            '& .MuiInputBase-input': {
              py: 1.2,
              fontSize: '0.9rem',
            },
          }}
        />
      </Box>

      {/* Chats List */}
      <Box sx={{
        flex: 1,
        overflowY: 'auto',
        px: 2,
        pb: 2,
        '&::-webkit-scrollbar': {
          width: '5px',
        },
        '&::-webkit-scrollbar-thumb': {
          borderRadius: '10px',
          bgcolor: alpha(theme.palette.text.secondary, 0.1),
          '&:hover': {
            bgcolor: alpha(theme.palette.text.secondary, 0.2),
          },
        },
      }}>
        {isLoading ? (
          <Stack spacing={2} sx={{ pt: 1 }}>
            {[1, 2, 3, 4].map(i => (
              <Box
                key={i}
                sx={{
                  height: 76,
                  borderRadius: 4,
                  bgcolor: theme.palette.mode === 'light'
                    ? alpha(theme.palette.common.black, 0.03)
                    : alpha(theme.palette.common.white, 0.03),
                }}
              />
            ))}
          </Stack>
        ) : filteredChats.length === 0 ? (
          <Box sx={{
            p: 4,
            textAlign: 'center',
            mt: 4,
            opacity: 0.6
          }}>
            <Box sx={{
              width: 64,
              height: 64,
              borderRadius: '50%',
              bgcolor: alpha(theme.palette.primary.main, 0.08),
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              mx: 'auto',
              mb: 2
            }}>
              <User size={32} color={theme.palette.primary.main} />
            </Box>
            <Typography variant="body2" fontWeight={500} color="text.secondary">
              {searchQuery ? 'No users found' : 'No chats yet'}
            </Typography>
          </Box>
        ) : (
          <Stack spacing={0.5}>
            {filteredChats.map((chat) => {
              const isActive = chatId === chat.id;
              const otherUser = chat.members.find((m) => m.userId !== user?.id)?.user;
              const myMemberEntry = chat.members.find((m) => m.userId === user?.id);
              const isMuted = myMemberEntry?.isMuted;
              const hasUnread = chat.lastMessageAt && (!chat.lastReadAt || new Date(chat.lastMessageAt) > new Date(chat.lastReadAt));
              const displayName = otherUser?.username || 'Unknown User';

              return (
                <Box
                  key={chat.id}
                  onClick={() => handleChatClick(chat)}
                  onMouseEnter={() => prefetchChat(chat.id)}
                  sx={{
                    borderRadius: '16px',
                    p: 1.5,
                    cursor: 'pointer',
                    transition: 'all 0.2s cubic-bezier(0.4, 0, 0.2, 1)',
                    position: 'relative',
                    overflow: 'hidden',
                    bgcolor: isActive
                      ? alpha(theme.palette.primary.main, 0.08)
                      : 'transparent',
                    '&:hover': {
                      bgcolor: isActive
                        ? alpha(theme.palette.primary.main, 0.12)
                        : alpha(theme.palette.text.primary, 0.03),
                      transform: 'translateY(-1px)',
                    },
                    '&:active': {
                      transform: 'translateY(0) scale(0.99)',
                    }
                  }}
                >
                  {/* Active Indicator Bar */}
                  {isActive && (
                    <Box sx={{
                      position: 'absolute',
                      left: 0,
                      top: '50%',
                      transform: 'translateY(-50%)',
                      width: 3,
                      height: '60%',
                      bgcolor: theme.palette.primary.main,
                      borderRadius: '0 4px 4px 0',
                      boxShadow: `0 0 8px ${alpha(theme.palette.primary.main, 0.6)}`
                    }} />
                  )}

                  <Stack direction="row" spacing={2} alignItems="center">
                    <Badge
                      overlap="circular"
                      anchorOrigin={{ vertical: 'bottom', horizontal: 'right' }}
                      variant="dot"
                      sx={{
                        '& .MuiBadge-badge': {
                          bgcolor: '#10b981',
                          color: '#10b981',
                          boxShadow: `0 0 0 2px ${theme.palette.background.paper}`,
                          '&::after': {
                            position: 'absolute',
                            top: 0,
                            left: 0,
                            width: '100%',
                            height: '100%',
                            borderRadius: '50%',
                            animation: 'ripple 1.2s infinite ease-in-out',
                            border: '1px solid currentColor',
                            content: '""',
                          },
                        },
                        '@keyframes ripple': {
                          '0%': { transform: 'scale(.8)', opacity: 1 },
                          '100%': { transform: 'scale(2.4)', opacity: 0 },
                        },
                      }}
                      invisible={true} // TODO: Add real online check
                    >
                      <Avatar
                        sx={{
                          width: 48,
                          height: 48,
                          borderRadius: '14px',
                          bgcolor: isActive
                            ? theme.palette.primary.main
                            : alpha(theme.palette.primary.main, 0.1),
                          color: isActive
                            ? '#fff'
                            : theme.palette.primary.main,
                          fontWeight: 700,
                          fontSize: '1.25rem',
                          boxShadow: isActive ? `0 4px 12px ${alpha(theme.palette.primary.main, 0.3)}` : 'none',
                          transition: 'all 0.2s',
                        }}
                      >
                        {displayName.charAt(0).toUpperCase()}
                      </Avatar>
                    </Badge>

                    <Box sx={{ flex: 1, minWidth: 0 }}>
                      <Stack direction="row" spacing={1} alignItems="center" justifyContent="space-between" sx={{ mb: 0.25 }}>
                        <Typography
                          variant="subtitle2"
                          fontWeight={hasUnread || isActive ? 700 : 600}
                          sx={{
                            color: theme.palette.text.primary,
                            fontSize: '0.95rem'
                          }}
                          noWrap
                        >
                          {displayName}
                        </Typography>
                        {isMuted && (
                          <BellOff
                            size={12}
                            style={{
                              marginLeft: 4,
                              color: theme.palette.text.secondary,
                              opacity: 0.6
                            }}
                          />
                        )}
                        <Box sx={{ flex: 1 }} />
                        {chat.lastMessageAt && (
                          <Typography
                            variant="caption"
                            sx={{
                              color: hasUnread ? theme.palette.primary.main : theme.palette.text.secondary,
                              fontSize: '0.65rem',
                              fontWeight: hasUnread ? 700 : 500,
                            }}
                          >
                            {formatTime(chat.lastMessageAt)}
                          </Typography>
                        )}
                      </Stack>

                      <Stack direction="row" spacing={1} alignItems="center" justifyContent="space-between">
                        <Typography
                          variant="body2"
                          sx={{
                            color: hasUnread
                              ? theme.palette.text.primary
                              : theme.palette.text.secondary,
                            fontSize: '0.8rem',
                            fontWeight: hasUnread ? 600 : 400,
                            opacity: hasUnread ? 1 : 0.8,
                          }}
                          noWrap
                        >
                          {formatLastMessage(chat)}
                        </Typography>
                        {hasUnread && (
                          <Box sx={{
                            width: 10,
                            height: 10,
                            borderRadius: '50%',
                            bgcolor: theme.palette.primary.main,
                            boxShadow: `0 2px 6px ${alpha(theme.palette.primary.main, 0.4)}`
                          }} />
                        )}
                      </Stack>
                    </Box>
                  </Stack>
                </Box>
              );
            })}
          </Stack>
        )}
      </Box>
    </Box>
  );
}

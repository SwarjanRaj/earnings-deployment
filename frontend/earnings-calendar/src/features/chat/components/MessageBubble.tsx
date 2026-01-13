import { memo, useState, useCallback } from 'react';
import { Box, Typography, Stack, Avatar, useTheme, Paper, IconButton, Fade, Tooltip, Chip, alpha } from '@mui/material';
import { MoreVertical, CheckCheck, Heart, Smile, ThumbsUp, ThumbsDown, Laugh } from 'lucide-react';
import MessageActionsMenu from './MessageActionsMenu';
import type { Message } from '../../../services/chatApi';

interface MessageBubbleProps {
  message: Message;
  isOwnMessage: boolean;
  showAvatar: boolean;
  showUsername: boolean;
  onBlockUser?: (userId: string, username: string) => void;
  onUserClick?: (userId: string, username: string, email: string) => void;
  prevMessage?: Message | null;
  messageStatus?: 'sent' | 'delivered' | 'read'; // Message status for own messages
  isHighlighted?: boolean; // For search highlighting
  searchQuery?: string; // For highlighting search matches
  onReaction?: (messageId: string, emoji: string) => void;
  reactions?: { [emoji: string]: { users: string[], count: number } };
  currentUsername?: string; // Current user's username for reaction highlighting
  onReply?: (message: Message) => void;
  onEdit?: (messageId: string, newContent: string) => void;
  onDelete?: (messageId: string) => void;
  onCopy?: (content: string) => void;
}

function MessageBubble({
  message,
  isOwnMessage,
  showAvatar,
  showUsername,
  onBlockUser,
  onUserClick,
  prevMessage,
  messageStatus = 'sent',
  isHighlighted = false,
  searchQuery = '',
  onReaction,
  reactions = {},
  currentUsername,
  onReply,
  onEdit,
  onDelete,
  onCopy,
}: MessageBubbleProps) {
  const theme = useTheme();
  const [showActions, setShowActions] = useState(false);
  const [showReactions, setShowReactions] = useState(false);
  const [menuAnchor, setMenuAnchor] = useState<null | HTMLElement>(null);

  // Check if this message should show a date separator
  const showDateSeparator = !prevMessage ||
    new Date(message.createdAt).toDateString() !== new Date(prevMessage.createdAt).toDateString();

  // Check if messages are from same user and within 5 minutes (group them)
  const isGrouped = prevMessage &&
    prevMessage.userId === message.userId &&
    new Date(message.createdAt).getTime() - new Date(prevMessage.createdAt).getTime() < 300000; // 5 minutes

  const formatTime = (date: string) => {
    return new Date(date).toLocaleTimeString('en-US', {
      hour: 'numeric',
      minute: '2-digit',
      hour12: true,
    });
  };

  const formatDate = (date: string) => {
    const msgDate = new Date(date);
    const today = new Date();
    const yesterday = new Date(today);
    yesterday.setDate(yesterday.getDate() - 1);

    if (msgDate.toDateString() === today.toDateString()) {
      return 'Today';
    } else if (msgDate.toDateString() === yesterday.toDateString()) {
      return 'Yesterday';
    } else {
      return msgDate.toLocaleDateString('en-US', { month: 'long', day: 'numeric', year: msgDate.getFullYear() !== today.getFullYear() ? 'numeric' : undefined });
    }
  };

  const handleReaction = (emoji: string) => {
    if (onReaction) {
      onReaction(message.id, emoji);
    }
    setShowReactions(false);
  };

  const reactionEmojis = [
    { emoji: '❤️', icon: Heart, label: 'Love' },
    { emoji: '👍', icon: ThumbsUp, label: 'Like' },
    { emoji: '👎', icon: ThumbsDown, label: 'Dislike' },
    { emoji: '😂', icon: Laugh, label: 'Laugh' },
    { emoji: '😊', icon: Smile, label: 'Smile' },
  ];

  const highlightText = useCallback((text: string, query: string) => {
    if (!query.trim()) return text;

    const regex = new RegExp(`(${query.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')})`, 'gi');
    const parts = text.split(regex);

    return parts.map((part, index) => {
      if (regex.test(part)) {
        return (
          <Box
            key={index}
            component="span"
            sx={{
              backgroundColor: alpha('#fbbf24', 0.3),
              borderRadius: 1,
              px: 0.5,
              fontWeight: 600,
            }}
          >
            {part}
          </Box>
        );
      }
      return part;
    });
  }, []);

  return (
    <Box data-message-id={message.id}>
      {showDateSeparator && (
        <Box
          sx={{
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            my: 3,
            position: 'relative',
          }}
        >
          <Typography
            variant="caption"
            sx={{
              px: 2,
              py: 0.5,
              borderRadius: 4,
              bgcolor: theme.palette.mode === 'light'
                ? 'rgba(0,0,0,0.05)'
                : 'rgba(255,255,255,0.1)',
              color: theme.palette.text.secondary,
              fontSize: '0.75rem',
              fontWeight: 600,
            }}
          >
            {formatDate(message.createdAt)}
          </Typography>
        </Box>
      )}

      <Stack
        direction="row"
        spacing={1}
        onMouseEnter={() => setShowActions(true)}
        onMouseLeave={() => {
          setShowActions(false);
          setShowReactions(false);
        }}
        sx={{
          alignSelf: isOwnMessage ? 'flex-end' : 'flex-start',
          maxWidth: { xs: '90%', sm: '75%', md: '65%' },
          alignItems: 'flex-end',
          mb: isGrouped ? 0.5 : { xs: 1.5, sm: 2 },
          px: { xs: 0.5, sm: 2 },
          position: 'relative',
          animation: 'slideIn 0.3s cubic-bezier(0.4, 0, 0.2, 1)',
          '@keyframes slideIn': {
            from: {
              opacity: 0,
              transform: isOwnMessage ? 'translateX(20px)' : 'translateX(-20px)'
            },
            to: {
              opacity: 1,
              transform: 'translateX(0)'
            },
          },
          ...(isHighlighted && {
            animation: 'highlight 0.6s ease-in-out',
            '@keyframes highlight': {
              '0%': { backgroundColor: 'rgba(99, 102, 241, 0.1)' },
              '50%': { backgroundColor: 'rgba(99, 102, 241, 0.2)' },
              '100%': { backgroundColor: 'transparent' },
            },
          }),
        }}
      >
        {showAvatar && !isOwnMessage && (
          <Avatar
            onClick={() => onUserClick?.(message.userId, message.user.username, message.user.email)}
            sx={{
              width: 32,
              height: 32,
              borderRadius: '50%',
              bgcolor: '#e0e0e0', // Placeholder gray, or dynamic logic
              color: '#000',
              fontSize: 14,
              fontWeight: 600,
              flexShrink: 0,
              opacity: isGrouped ? 0 : 1,
              cursor: onUserClick ? 'pointer' : 'default',
              border: '1px solid rgba(0,0,0,0.05)',
            }}
          >
            {message.user.username.charAt(0).toUpperCase()}
          </Avatar>
        )}
        {!showAvatar && !isOwnMessage && <Box sx={{ width: 32 }} />}
        {isOwnMessage && <Box sx={{ width: 32 }} />}

        <Box sx={{ flex: 1, minWidth: 0 }}>
          {showUsername && !isOwnMessage && (
            <Typography
              variant="caption"
              sx={{
                display: 'block',
                mb: 0.5,
                ml: 1.5,
                fontSize: '0.75rem',
                color: theme.palette.text.secondary,
              }}
            >
              {message.user.username}
            </Typography>
          )}

          <Paper
            elevation={0}
            sx={{
              p: '12px 16px',
              borderRadius: '24px',
              borderTopLeftRadius: isOwnMessage ? '24px' : isGrouped ? '6px' : '24px',
              borderTopRightRadius: isOwnMessage ? isGrouped ? '6px' : '24px' : '24px',
              borderBottomLeftRadius: isOwnMessage ? '24px' : '6px',
              borderBottomRightRadius: isOwnMessage ? '6px' : '24px',

              bgcolor: isOwnMessage
                ? '#0ea5e9'
                : theme.palette.mode === 'light'
                  ? 'rgba(255, 255, 255, 0.95)'
                  : 'rgba(15, 23, 42, 0.95)',

              color: isOwnMessage
                ? '#ffffff'
                : theme.palette.text.primary,

              position: 'relative',
              transition: 'all 0.3s cubic-bezier(0.4, 0, 0.2, 1)',
              backdropFilter: 'blur(10px)',
              border: isOwnMessage
                ? 'none'
                : `1px solid ${theme.palette.mode === 'light' ? 'rgba(0,0,0,0.08)' : 'rgba(255,255,255,0.1)'}`,
              boxShadow: isOwnMessage
                ? '0 6px 20px rgba(14, 165, 233, 0.3), 0 3px 10px rgba(2, 132, 199, 0.2), inset 0 1px 0 rgba(255, 255, 255, 0.2)'
                : theme.palette.mode === 'light'
                  ? '0 4px 16px rgba(0,0,0,0.1), 0 2px 8px rgba(0,0,0,0.08)'
                  : '0 4px 16px rgba(0,0,0,0.4), 0 2px 8px rgba(0,0,0,0.3)',
              '&:hover': {
                // Removed scale/translate for "no animation" request
                boxShadow: isOwnMessage
                  ? '0 8px 24px rgba(14, 165, 233, 0.4), 0 4px 12px rgba(2, 132, 199, 0.3), inset 0 1px 0 rgba(255, 255, 255, 0.3)'
                  : theme.palette.mode === 'light'
                    ? '0 6px 20px rgba(0,0,0,0.12), 0 3px 10px rgba(0,0,0,0.1)'
                    : '0 6px 20px rgba(0,0,0,0.5), 0 3px 10px rgba(0,0,0,0.4)',
              },
            }}
          >
            {!isOwnMessage && onBlockUser && (
              <IconButton
                size="small"
                onClick={() => onBlockUser(message.userId, message.user.username)}
                sx={{
                  position: 'absolute',
                  top: 2,
                  right: 2,
                  opacity: 0,
                  transition: 'opacity 0.2s',
                  width: 20,
                  height: 20,
                  color: 'text.secondary',
                  '&:hover': {
                    opacity: 1,
                    bgcolor: 'rgba(0,0,0,0.05)',
                    color: theme.palette.error.main,
                  },
                }}
              >
                <MoreVertical size={14} />
              </IconButton>
            )}

            {/* Reply Context */}
            {message.replyTo && (
              <Box
                sx={{
                  mb: 1.5,
                  p: 1.5,
                  borderRadius: 1,
                  bgcolor: theme.palette.mode === 'light'
                    ? 'rgba(0,0,0,0.05)'
                    : 'rgba(255,255,255,0.08)',
                  borderLeft: `3px solid ${theme.palette.primary.main}`,
                  opacity: 0.8,
                }}
              >
                <Typography
                  variant="caption"
                  sx={{
                    color: theme.palette.primary.main,
                    fontWeight: 600,
                    display: 'block',
                    mb: 0.5,
                  }}
                >
                  Replying to {message.replyTo.user.username}
                </Typography>
                <Typography
                  variant="body2"
                  sx={{
                    color: 'text.secondary',
                    fontSize: '0.85rem',
                    overflow: 'hidden',
                    textOverflow: 'ellipsis',
                    display: '-webkit-box',
                    WebkitLineClamp: 2,
                    WebkitBoxOrient: 'vertical',
                    lineHeight: 1.3,
                  }}
                >
                  {message.replyTo.content}
                </Typography>
              </Box>
            )}

            <Typography
              variant="body1"
              sx={{
                fontSize: '0.95rem',
                lineHeight: 1.5,
                fontWeight: 400,
                wordBreak: 'break-word',
                whiteSpace: 'pre-wrap',
                textAlign: 'left',
                display: 'block',
                '& strong': { fontWeight: 600 },
                '& em': { fontStyle: 'italic' },
                mb: Object.keys(reactions).length > 0 ? 1 : 0,
              }}
            >
              {highlightText(message.content, searchQuery)}
            </Typography>

            {/* Reactions Display */}
            {Object.keys(reactions).length > 0 && (
              <Stack direction="row" spacing={0.5} sx={{ flexWrap: 'wrap', gap: 0.5 }}>
                {Object.entries(reactions).map(([emoji, data]) => (
                  <Chip
                    key={emoji}
                    label={`${emoji} ${data.count}`}
                    size="small"
                    sx={{
                      height: 24,
                      fontSize: '0.7rem',
                      bgcolor: currentUsername && data.users.includes(currentUsername)
                        ? 'rgba(99, 102, 241, 0.2)'
                        : 'rgba(255, 255, 255, 0.1)',
                      color: 'inherit',
                      border: '1px solid rgba(255, 255, 255, 0.2)',
                      '&:hover': {
                        bgcolor: 'rgba(99, 102, 241, 0.3)',
                        transform: 'scale(1.05)',
                      },
                      transition: 'all 0.2s ease-in-out',
                    }}
                  />
                ))}
              </Stack>
            )}

            {/* Action Buttons */}
            <Fade in={showActions} timeout={200}>
              <Stack
                direction="row"
                spacing={0.5}
                sx={{
                  position: 'absolute',
                  top: -10,
                  right: isOwnMessage ? 'auto' : -50,
                  left: isOwnMessage ? -50 : 'auto',
                  animation: showActions
                    ? 'actionButtonsIn 0.3s cubic-bezier(0.4, 0, 0.2, 1)'
                    : 'actionButtonsOut 0.2s cubic-bezier(0.4, 0, 0.2, 1)',
                  '@keyframes actionButtonsIn': {
                    from: {
                      opacity: 0,
                      transform: `translateY(-8px) scale(0.9) ${isOwnMessage ? 'translateX(10px)' : 'translateX(-10px)'}`,
                    },
                    to: {
                      opacity: 1,
                      transform: 'translateY(0) scale(1) translateX(0)',
                    },
                  },
                  '@keyframes actionButtonsOut': {
                    from: {
                      opacity: 1,
                      transform: 'translateY(0) scale(1)',
                    },
                    to: {
                      opacity: 0,
                      transform: `translateY(-8px) scale(0.9) ${isOwnMessage ? 'translateX(10px)' : 'translateX(-10px)'}`,
                    },
                  },
                }}
              >
                <Tooltip title="Add reaction">
                  <IconButton
                    onClick={() => setShowReactions(!showReactions)}
                    sx={{
                      minWidth: { xs: 36, sm: 28 },
                      minHeight: { xs: 36, sm: 28 },
                      width: { xs: 36, sm: 28 },
                      height: { xs: 36, sm: 28 },
                      bgcolor: 'rgba(255, 255, 255, 0.9)',
                      color: '#6366f1',
                      border: '1px solid rgba(0,0,0,0.1)',
                      boxShadow: '0 2px 8px rgba(0,0,0,0.15)',
                      '&:hover': {
                        bgcolor: '#6366f1',
                        color: 'white',
                        transform: 'scale(1.1)',
                      },
                      '&:active': {
                        transform: 'scale(0.95)',
                      },
                      transition: 'all 0.2s ease-in-out',
                    }}
                  >
                    <Smile size={16} />
                  </IconButton>
                </Tooltip>
                <Tooltip title="More actions">
                  <IconButton
                    onClick={(e) => {
                      e.stopPropagation();
                      setMenuAnchor(e.currentTarget);
                    }}
                    sx={{
                      minWidth: { xs: 36, sm: 28 },
                      minHeight: { xs: 36, sm: 28 },
                      width: { xs: 36, sm: 28 },
                      height: { xs: 36, sm: 28 },
                      bgcolor: 'rgba(255, 255, 255, 0.9)',
                      color: theme.palette.text.secondary,
                      border: '1px solid rgba(0,0,0,0.1)',
                      boxShadow: '0 2px 8px rgba(0,0,0,0.15)',
                      '&:hover': {
                        bgcolor: theme.palette.primary.main,
                        color: 'white',
                        transform: 'scale(1.1)',
                      },
                      '&:active': {
                        transform: 'scale(0.95)',
                      },
                      transition: 'all 0.2s ease-in-out',
                    }}
                  >
                    <MoreVertical size={16} />
                  </IconButton>
                </Tooltip>
              </Stack>
            </Fade>

            {/* Reactions Picker */}
            <Fade in={showReactions} timeout={250}>
              <Stack
                direction="row"
                spacing={0.5}
                sx={{
                  position: 'absolute',
                  top: 30,
                  right: isOwnMessage ? 'auto' : -10,
                  left: isOwnMessage ? -10 : 'auto',
                  bgcolor: 'rgba(255, 255, 255, 0.95)',
                  borderRadius: 3,
                  p: 1,
                  boxShadow: '0 8px 24px rgba(0,0,0,0.15), 0 4px 8px rgba(0,0,0,0.1)',
                  border: '1px solid rgba(0,0,0,0.1)',
                  backdropFilter: 'blur(12px)',
                  zIndex: 1000,
                  animation: showReactions
                    ? 'reactionPickerIn 0.3s cubic-bezier(0.4, 0, 0.2, 1)'
                    : 'reactionPickerOut 0.2s cubic-bezier(0.4, 0, 0.2, 1)',
                  '@keyframes reactionPickerIn': {
                    from: {
                      opacity: 0,
                      transform: 'translateY(-10px) scale(0.9)',
                      filter: 'blur(2px)',
                    },
                    to: {
                      opacity: 1,
                      transform: 'translateY(0) scale(1)',
                      filter: 'blur(0)',
                    },
                  },
                  '@keyframes reactionPickerOut': {
                    from: {
                      opacity: 1,
                      transform: 'translateY(0) scale(1)',
                      filter: 'blur(0)',
                    },
                    to: {
                      opacity: 0,
                      transform: 'translateY(-10px) scale(0.9)',
                      filter: 'blur(2px)',
                    },
                  },
                }}
              >
                {reactionEmojis.map(({ emoji, icon: Icon, label }) => (
                  <Tooltip key={emoji} title={label}>
                    <IconButton
                      size="small"
                      onClick={() => handleReaction(emoji)}
                      sx={{
                        width: 32,
                        height: 32,
                        borderRadius: 2,
                        transition: 'all 0.3s cubic-bezier(0.4, 0, 0.2, 1)',
                        '&:hover': {
                          bgcolor: 'rgba(99, 102, 241, 0.1)',
                          transform: 'scale(1.1) rotate(5deg)',
                          boxShadow: '0 4px 12px rgba(99, 102, 241, 0.2)',
                        },
                        '&:active': {
                          transform: 'scale(0.95) rotate(0deg)',
                          transition: 'all 0.1s ease-in-out',
                        },
                      }}
                    >
                      <Icon size={16} />
                    </IconButton>
                  </Tooltip>
                ))}
              </Stack>
            </Fade>

            {/* Bubble Footer (Time + Status) */}
            <Stack
              direction="row"
              spacing={0.5}
              alignItems="center"
              justifyContent="flex-end"
              sx={{
                mt: 0.5,
                marginBottom: '-2px',
                opacity: 0.8,
              }}
            >
              <Typography
                variant="caption"
                sx={{
                  fontSize: '0.65rem',
                  color: 'inherit', // Inherit from Paper color
                }}
              >
                {formatTime(message.createdAt)}
              </Typography>
              {isOwnMessage && (
                <Box sx={{ display: 'flex', ml: 0.25, alignItems: 'center' }}>
                  {messageStatus === 'sent' && (
                    <CheckCheck size={13} color="rgba(255,255,255,0.7)" />
                  )}
                  {messageStatus === 'delivered' && (
                    <Box sx={{ display: 'flex' }}>
                      <CheckCheck size={13} color="rgba(255,255,255,0.7)" />
                      <CheckCheck size={13} color="rgba(255,255,255,0.7)" style={{ marginLeft: -4 }} />
                    </Box>
                  )}
                  {messageStatus === 'read' && (
                    <Box sx={{ display: 'flex' }}>
                      <CheckCheck size={13} color="#10b981" />
                      <CheckCheck size={13} color="#10b981" style={{ marginLeft: -4 }} />
                    </Box>
                  )}
                </Box>
              )}
            </Stack>
          </Paper>
        </Box>
      </Stack>

      {/* Message Actions Menu */}
      <MessageActionsMenu
        anchorEl={menuAnchor}
        open={Boolean(menuAnchor)}
        onClose={() => setMenuAnchor(null)}
        message={message}
        isOwnMessage={isOwnMessage}
        onReply={onReply}
        onEdit={onEdit}
        onDelete={onDelete}
        onCopy={onCopy}
      />
    </Box>
  );
}

export default memo(MessageBubble);


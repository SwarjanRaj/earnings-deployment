import {
  Dialog,
  DialogContent,
  DialogActions,
  Box,
  Avatar,
  Typography,
  Button,
  Stack,
  Divider,
  alpha,
  useTheme,
  CircularProgress,
  Tooltip,
} from '@mui/material';
import { MessageSquare, Mail, Shield, VolumeX, Volume2, ShieldOff } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import {
  useCreateOneToOneChatMutation,
  useGetUserChatsQuery,
  useBlockUserMutation,
  useUnblockUserMutation,
  useMuteChatMutation,
  useUnmuteChatMutation,
  useGetBlockedUsersQuery
} from '../../../services/chatApi';
import { useAuth } from '../../../app/useAuth';

interface UserProfileDialogProps {
  open: boolean;
  onClose: () => void;
  userId: string;
  username: string;
  email: string;
}

export default function UserProfileDialog({
  open,
  onClose,
  userId,
  username,
  email,
}: UserProfileDialogProps) {
  const theme = useTheme();
  const navigate = useNavigate();
  const { user: currentUser } = useAuth();
  const [createChat, { isLoading: isCreatingChat }] = useCreateOneToOneChatMutation();
  const { data: chats = [] } = useGetUserChatsQuery();
  const { data: blockedUsers = [] } = useGetBlockedUsersQuery();

  const [blockUser, { isLoading: isBlocking }] = useBlockUserMutation();
  const [unblockUser, { isLoading: isUnblocking }] = useUnblockUserMutation();
  const [muteChat, { isLoading: isMuting }] = useMuteChatMutation();
  const [unmuteChat, { isLoading: isUnmuting }] = useUnmuteChatMutation();

  const existingChat = chats.find((chat) => {
    if (chat.type === 'ONE_TO_ONE' && chat.members) {
      return chat.members.some((member) => member.userId === userId);
    }
    return false;
  });

  const isBlocked = blockedUsers.some(b => b.blocked.id === userId);
  const myMemberInfo = existingChat?.members.find(m => m.userId === currentUser?.id);
  const isMuted = myMemberInfo?.isMuted || false;

  const handleStartChat = async () => {
    try {
      if (existingChat) {
        navigate(`/chat/one-to-one/${existingChat.id}`);
        onClose();
      } else {
        const newChat = await createChat(userId).unwrap();
        navigate(`/chat/one-to-one/${newChat.id}`);
        onClose();
      }
    } catch (error) {
      console.error('Failed to create chat:', error);
    }
  };

  const handleBlockAction = async () => {
    try {
      if (isBlocked) {
        await unblockUser(userId).unwrap();
      } else {
        await blockUser({ blockedId: userId }).unwrap();
      }
    } catch (err) {
      console.error('Block action failed:', err);
    }
  };

  const handleMuteAction = async () => {
    if (!existingChat) return;
    try {
      if (isMuted) {
        await unmuteChat(existingChat.id).unwrap();
      } else {
        await muteChat(existingChat.id).unwrap();
      }
    } catch (err) {
      console.error('Mute action failed:', err);
    }
  };

  return (
    <Dialog
      open={open}
      onClose={onClose}
      maxWidth="xs"
      fullWidth
      PaperProps={{
        sx: {
          borderRadius: 4,
          boxShadow: '0 8px 32px rgba(0,0,0,0.2)',
          background: theme.palette.mode === 'dark'
            ? 'rgba(30, 30, 45, 0.95)'
            : 'rgba(255, 255, 255, 0.98)',
          backdropFilter: 'blur(10px)',
          border: `1px solid ${alpha(theme.palette.divider, 0.1)}`,
        },
      }}
    >
      <DialogContent sx={{ pt: 4, px: 3, pb: 2 }}>
        <Stack spacing={3} alignItems="center">
          <Avatar
            sx={{
              width: 120,
              height: 120,
              bgcolor: theme.palette.primary.main,
              fontSize: 48,
              fontWeight: 700,
              boxShadow: `0 8px 24px ${alpha(theme.palette.primary.main, 0.3)}`,
              borderRadius: '24px',
            }}
          >
            {username.charAt(0).toUpperCase()}
          </Avatar>

          <Box sx={{ textAlign: 'center', width: '100%' }}>
            <Typography variant="h5" fontWeight={800} sx={{ mb: 0.5 }}>
              {username}
            </Typography>
            <Stack direction="row" spacing={1} alignItems="center" justifyContent="center">
              <Mail size={14} color={theme.palette.text.secondary} />
              <Typography variant="body2" color="text.secondary" sx={{ opacity: 0.8 }}>
                {email}
              </Typography>
            </Stack>
          </Box>

          <Button
            fullWidth
            onClick={handleStartChat}
            variant="contained"
            disabled={isCreatingChat || isBlocked}
            startIcon={isCreatingChat ? <CircularProgress size={16} color="inherit" /> : <MessageSquare size={18} />}
            sx={{
              borderRadius: '12px',
              py: 1.2,
              textTransform: 'none',
              fontWeight: 600,
              boxShadow: `0 4px 12px ${alpha(theme.palette.primary.main, 0.2)}`
            }}
          >
            {isCreatingChat ? 'Starting...' : isBlocked ? 'Blocked' : 'Send Message'}
          </Button>

          <Divider sx={{ width: '100%', opacity: 0.5 }} />

          <Stack spacing={1} sx={{ width: '100%' }}>
            <Typography variant="overline" color="text.secondary" sx={{ fontWeight: 700, px: 1 }}>
              Settings
            </Typography>

            <Stack direction="row" spacing={1}>
              {existingChat && (
                <Tooltip title={isMuted ? "Unmute notifications" : "Mute notifications"}>
                  <Button
                    fullWidth
                    onClick={handleMuteAction}
                    variant="outlined"
                    startIcon={isMuted ? <Volume2 size={18} /> : <VolumeX size={18} />}
                    disabled={isMuting || isUnmuting}
                    sx={{
                      borderRadius: '12px',
                      textTransform: 'none',
                      color: isMuted ? theme.palette.primary.main : theme.palette.text.primary,
                      borderColor: alpha(theme.palette.divider, 0.2),
                      '&:hover': {
                        borderColor: theme.palette.primary.main,
                        bgcolor: alpha(theme.palette.primary.main, 0.04)
                      }
                    }}
                  >
                    {isMuted ? 'Unmute' : 'Mute'}
                  </Button>
                </Tooltip>
              )}

              <Tooltip title={isBlocked ? "Unblock this user" : "Block this user"}>
                <Button
                  fullWidth
                  onClick={handleBlockAction}
                  variant="outlined"
                  startIcon={isBlocked ? <ShieldOff size={18} /> : <Shield size={18} />}
                  disabled={isBlocking || isUnblocking}
                  color={isBlocked ? "primary" : "error"}
                  sx={{
                    borderRadius: '12px',
                    textTransform: 'none',
                    borderColor: alpha(theme.palette.divider, 0.2),
                    '&:hover': {
                      bgcolor: isBlocked ? alpha(theme.palette.primary.main, 0.04) : alpha(theme.palette.error.main, 0.04),
                      borderColor: isBlocked ? 'inherit' : theme.palette.error.main
                    }
                  }}
                >
                  {isBlocked ? 'Unblock' : 'Block'}
                </Button>
              </Tooltip>
            </Stack>
          </Stack>
        </Stack>
      </DialogContent>
      <DialogActions sx={{ px: 3, pb: 3, pt: 0 }}>
        <Button onClick={onClose} sx={{ textTransform: 'none', fontWeight: 600 }}>
          Close
        </Button>
      </DialogActions>
    </Dialog>
  );
}

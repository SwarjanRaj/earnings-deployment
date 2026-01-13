import { useState } from 'react';
import {
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Button,
  TextField,
  Typography,
  Box,
  alpha,
  useTheme,
  Stack,
} from '@mui/material';
import { Shield, Ban } from 'lucide-react';
import { useBlockUserMutation, useUnblockUserMutation } from '../../../services/chatApi';

interface UserBlockDialogProps {
  open: boolean;
  onClose: () => void;
  userId: string;
  username: string;
  isBlocked: boolean;
}

export default function UserBlockDialog({
  open,
  onClose,
  userId,
  username,
  isBlocked,
}: UserBlockDialogProps) {
  const theme = useTheme();
  const [blockUser] = useBlockUserMutation();
  const [unblockUser] = useUnblockUserMutation();
  const [reason, setReason] = useState('');

  const handleBlock = async () => {
    try {
      await blockUser({ blockedId: userId, reason: reason || undefined }).unwrap();
      setReason('');
      onClose();
    } catch (error) {
      console.error('Failed to block user:', error);
    }
  };

  const handleUnblock = async () => {
    try {
      await unblockUser(userId).unwrap();
      onClose();
    } catch (error) {
      console.error('Failed to unblock user:', error);
    }
  };

  return (
    <Dialog
      open={open}
      onClose={onClose}
      maxWidth="sm"
      fullWidth
      PaperProps={{
        sx: {
          borderRadius: 2,
          boxShadow: theme.customShadows.cardHover,
        },
      }}
    >
      <DialogTitle
        sx={{
          background: `linear-gradient(135deg, ${alpha(theme.palette.error.main, 0.1)} 0%, ${alpha(theme.palette.error.main, 0.05)} 100%)`,
          borderBottom: `1px solid ${alpha(theme.palette.divider, 0.12)}`,
          fontWeight: 700,
          display: 'flex',
          alignItems: 'center',
          gap: 1.5,
        }}
      >
        <Box
          sx={{
            width: 40,
            height: 40,
            borderRadius: 2,
            background: `linear-gradient(135deg, ${theme.palette.error.main} 0%, ${theme.palette.error.dark} 100%)`,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            boxShadow: `0 4px 12px ${alpha(theme.palette.error.main, 0.3)}`,
          }}
        >
          {isBlocked ? <Shield size={20} color="white" /> : <Ban size={20} color="white" />}
        </Box>
        {isBlocked ? 'Unblock User' : 'Block User'}
      </DialogTitle>
      <DialogContent sx={{ pt: 3 }}>
        <Stack spacing={2.5}>
          <Typography variant="body1">
            {isBlocked
              ? `Are you sure you want to unblock ${username}? They will be able to message you again.`
              : `Are you sure you want to block ${username}? You won't receive messages from them.`}
          </Typography>
          {!isBlocked && (
            <TextField
              label="Reason (optional)"
              fullWidth
              multiline
              rows={3}
              value={reason}
              onChange={(e) => setReason(e.target.value)}
              placeholder="Why are you blocking this user?"
              sx={{
                '& .MuiOutlinedInput-root': {
                  borderRadius: 2,
                },
              }}
            />
          )}
        </Stack>
      </DialogContent>
      <DialogActions sx={{ p: 2.5, gap: 1.5 }}>
        <Button
          onClick={onClose}
          variant="outlined"
          sx={{ borderRadius: 2, px: 2.5, py: 1, fontWeight: 600 }}
        >
          Cancel
        </Button>
        <Button
          onClick={isBlocked ? handleUnblock : handleBlock}
          variant="contained"
          color={isBlocked ? 'primary' : 'error'}
          sx={{
            borderRadius: 2,
            px: 2.5,
            py: 1,
            fontWeight: 600,
            ...(isBlocked
              ? {
                  background: `linear-gradient(135deg, ${theme.palette.primary.main} 0%, ${theme.palette.primary.dark} 100%)`,
                }
              : {
                  background: `linear-gradient(135deg, ${theme.palette.error.main} 0%, ${theme.palette.error.dark} 100%)`,
                }),
          }}
        >
          {isBlocked ? 'Unblock' : 'Block'}
        </Button>
      </DialogActions>
    </Dialog>
  );
}


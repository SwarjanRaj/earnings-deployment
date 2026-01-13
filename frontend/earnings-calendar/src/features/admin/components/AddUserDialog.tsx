import {
  Dialog,
  DialogTitle,
  DialogContent,
  TextField,
  DialogActions,
  Button,
  MenuItem,
  Box,
  alpha,
  useTheme,
} from '@mui/material';
import { UserPlus } from 'lucide-react';
import { useForm } from 'react-hook-form';
import { type UserRole } from '../../../app/authSlice';

interface Props {
  open: boolean;
  onClose: () => void;
  onSubmit: (data: { email: string; role: UserRole }) => void;
}

export default function AddUserDialog({ open, onClose, onSubmit }: Props) {
  const theme = useTheme();
  const { register, handleSubmit, reset } = useForm<{ email: string; role: UserRole }>({
    defaultValues: { role: 'user' },
  });

  const submit = handleSubmit((d) => {
    onSubmit(d);
    reset();
  });

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
          background: `linear-gradient(135deg, ${alpha(theme.palette.primary.main, 0.1)} 0%, ${alpha(theme.palette.primary.main, 0.05)} 100%)`,
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
            background: `linear-gradient(135deg, ${theme.palette.primary.main} 0%, ${theme.palette.primary.dark} 100%)`,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            boxShadow: `0 4px 12px ${alpha(theme.palette.primary.main, 0.3)}`,
          }}
        >
          <UserPlus size={20} color="white" />
        </Box>
        Add User
      </DialogTitle>
      <DialogContent sx={{ pt: 3 }}>
        <Box 
          sx={{ 
            display: 'grid', 
            gridTemplateColumns: { xs: '1fr', sm: '1fr 1fr' },
            gap: 2.5,
          }}
        >
          <TextField 
            label="Email" 
            fullWidth 
            {...register('email')} 
            required
            type="email"
            sx={{
              '& .MuiOutlinedInput-root': {
                borderRadius: 2,
              },
            }}
          />
          <TextField 
            label="Role" 
            select 
            fullWidth 
            defaultValue="user" 
            {...register('role')}
            sx={{
              '& .MuiOutlinedInput-root': {
                borderRadius: 2,
              },
            }}
          >
          <MenuItem value="user">User</MenuItem>
          <MenuItem value="admin">Admin</MenuItem>
        </TextField>
        </Box>
      </DialogContent>
      <DialogActions sx={{ p: 2.5, gap: 1.5, borderTop: `1px solid ${alpha(theme.palette.divider, 0.12)}` }}>
        <Button 
          onClick={onClose}
          variant="outlined"
          sx={{
            borderRadius: 2,
            px: 2.5,
            py: 1,
            fontWeight: 600,
            borderWidth: 1.5,
          }}
        >
          Cancel
        </Button>
        <Button 
          variant="contained" 
          onClick={submit}
          sx={{
            borderRadius: 2,
            px: 2.5,
            py: 1,
            fontWeight: 600,
            background: `linear-gradient(135deg, ${theme.palette.primary.main} 0%, ${theme.palette.primary.dark} 100%)`,
            boxShadow: `0 4px 12px ${alpha(theme.palette.primary.main, 0.3)}`,
            '&:hover': {
              boxShadow: `0 6px 16px ${alpha(theme.palette.primary.main, 0.4)}`,
            },
          }}
        >
          Save
        </Button>
      </DialogActions>
    </Dialog>
  );
}

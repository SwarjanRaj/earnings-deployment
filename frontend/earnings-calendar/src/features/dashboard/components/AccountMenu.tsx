import { useState } from 'react';
import {
  Avatar,
  IconButton,
  Menu,
  MenuItem,
  ListItemIcon,
  Divider,
  Typography,
  Box,
  alpha,
  useTheme,
} from '@mui/material';
import { LogOut, Settings, Shield, User } from 'lucide-react';
import { useDispatch } from 'react-redux';
import { logout } from '../../../app/authSlice';
import { useAuth } from '../../../app/useAuth';
import { useNavigate } from 'react-router-dom';
import { useLogoutMutation } from '../../../services/authApi';

export default function AccountMenu() {
  const theme = useTheme();
  const [anchor, setAnchor] = useState<null | HTMLElement>(null);
  const open = Boolean(anchor);
  const dispatch = useDispatch();
  const nav = useNavigate();
  const { role, user } = useAuth();           // <- get user data including username
  const [logoutMutation] = useLogoutMutation();

  const handleLogout = async () => {
    try {
      await logoutMutation().unwrap();
      // The mutation will handle clearing Redux state
    } catch (error) {
      // Even if the API call fails, clear local state
      dispatch(logout());
    }
    setAnchor(null);
  };

  return (
    <>
      <IconButton 
        onClick={(e) => setAnchor(e.currentTarget)}
        sx={{
          position: 'relative',
          transition: 'all 0.3s cubic-bezier(0.4, 0, 0.2, 1)',
          '&:hover': {
            transform: 'scale(1.1)',
            '& .MuiAvatar-root': {
              boxShadow: `0 4px 12px ${alpha(theme.palette.primary.main, 0.4)}`,
            },
          },
        }}
      >
          <Avatar 
          sx={{ 
            width: 36, 
            height: 36,
            bgcolor: `linear-gradient(135deg, ${theme.palette.primary.main} 0%, ${theme.palette.primary.dark} 100%)`,
            border: `2px solid ${alpha(theme.palette.primary.main, 0.2)}`,
            transition: 'all 0.3s ease',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
          }}
        >
          <User size={20} color="white" />
        </Avatar>
      </IconButton>

      <Menu 
        anchorEl={anchor} 
        open={open} 
        onClose={() => setAnchor(null)}
        PaperProps={{
          sx: {
            mt: 1.5,
            minWidth: 220,
            borderRadius: 2,
            boxShadow: theme.customShadows.cardHover,
            border: `1px solid ${alpha(theme.palette.divider, 0.1)}`,
            overflow: 'hidden',
          },
        }}
        transformOrigin={{ horizontal: 'right', vertical: 'top' }}
        anchorOrigin={{ horizontal: 'right', vertical: 'bottom' }}
      >
        {/* Greeting with username */}
        <Box sx={{ 
          px: 2.5, 
          py: 2, 
          borderBottom: `1px solid ${alpha(theme.palette.divider, 0.1)}`,
          background: `linear-gradient(135deg, ${alpha(theme.palette.primary.main, 0.08)} 0%, transparent 100%)`,
        }}>
          <Typography variant="body2" color="text.secondary" sx={{ mb: 0.5, fontSize: 11, textTransform: 'uppercase', letterSpacing: '0.5px' }}>
            Signed in as
          </Typography>
          <Typography variant="body1" fontWeight={700} color="text.primary">
            {user?.username || 'User'}
          </Typography>
        </Box>

        {/* Settings (everyone) */}
        <MenuItem 
          onClick={() => alert('Settings coming soon!')}
          sx={{
            px: 2.5,
            py: 1.5,
            transition: 'all 0.2s ease',
            '&:hover': {
              bgcolor: alpha(theme.palette.primary.main, 0.08),
            },
          }}
        >
          <ListItemIcon sx={{ minWidth: 40 }}>
            <Settings size={18} color={theme.palette.primary.main} />
          </ListItemIcon>
          <Typography variant="body2" fontWeight={500}>
          Account Settings
          </Typography>
        </MenuItem>

        {/* Admin Console (only admins & superAdmins) */}
        {(role === 'admin' || role === 'superadmin') && (
          <MenuItem
            onClick={() => {
              nav('/admin/users');       // default tab
              setAnchor(null);
            }}
            sx={{
              px: 2.5,
              py: 1.5,
              transition: 'all 0.2s ease',
              '&:hover': {
                bgcolor: alpha(theme.palette.primary.main, 0.08),
              },
            }}
          >
            <ListItemIcon sx={{ minWidth: 40 }}>
              <Shield size={18} color={theme.palette.primary.main} />
            </ListItemIcon>
            <Typography variant="body2" fontWeight={500}>
            Admin Console
            </Typography>
          </MenuItem>
        )}

        <Divider sx={{ my: 1, borderColor: alpha(theme.palette.divider, 0.1) }} />

        {/* logout */}
        <MenuItem 
          onClick={handleLogout}
          sx={{
            px: 2.5,
            py: 1.5,
            transition: 'all 0.2s ease',
            '&:hover': {
              bgcolor: alpha(theme.palette.error.main, 0.08),
              '& .MuiListItemIcon-root': {
                color: 'error.main',
              },
              '& .MuiTypography-root': {
                color: 'error.main',
              },
            },
          }}
        >
          <ListItemIcon sx={{ minWidth: 40 }}>
            <LogOut size={18} color={theme.palette.text.secondary} />
          </ListItemIcon>
          <Typography variant="body2" fontWeight={600}>
            Sign Out
          </Typography>
        </MenuItem>
      </Menu>
    </>
  );
}

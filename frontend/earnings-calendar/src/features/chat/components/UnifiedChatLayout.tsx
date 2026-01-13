import type { ReactNode } from 'react';
import { useState, useEffect } from 'react';
import { useNavigate, useLocation, Navigate } from 'react-router-dom';
import {
  Box,
  Paper,
  Tabs,
  Tab,
  Stack,
  Badge,
  Drawer,
  IconButton,
  Typography,
  useMediaQuery,
  CircularProgress,
  useTheme,
  alpha,
} from '@mui/material';
import { MessageSquare, Users, Settings, Hash, UserCircle } from 'lucide-react';
import { useGetUserChatsQuery } from '../../../services/chatApi';
import { useAuth } from '../../../app/useAuth';
import HeaderBar from '../../dashboard/components/HeaderBar';
import Footer from '../../dashboard/components/Footer';
import ChannelsSidebar from './ChannelsSidebar';
import ChatsSidebar from './ChatsSidebar';

interface UnifiedChatLayoutProps {
  children: ReactNode;
}

export default function UnifiedChatLayout({ children }: UnifiedChatLayoutProps) {
  const theme = useTheme();
  const navigate = useNavigate();
  const location = useLocation();
  const { isAuthenticated } = useAuth();
  const isMobile = useMediaQuery(theme.breakpoints.down('md'));
  const [sidebarOpen, setSidebarOpen] = useState(!isMobile);
  const [mounted, setMounted] = useState(false);
  const { data: chats = [], isLoading: isLoadingChats } = useGetUserChatsQuery(undefined, {
    skip: !isAuthenticated,
  });

  useEffect(() => {
    setMounted(true);
  }, []);

  useEffect(() => {
    setSidebarOpen(!isMobile);
  }, [isMobile]);

  const isChannelView = location.pathname.startsWith('/chat/topic/') ||
    location.pathname.startsWith('/chat/discussion/') ||
    location.pathname === '/chat/topics';
  const isChatView = location.pathname.startsWith('/chat/one-to-one/') || location.pathname === '/chat/chats';

  const unreadCount = chats.filter((chat: any) => {
    // Basic unread check - refined to handle missing properties
    return chat.lastMessageAt && (!chat.lastReadAt || new Date(chat.lastMessageAt) > new Date(chat.lastReadAt));
  }).length;

  if (!isAuthenticated) {
    return <Navigate to="/signin" replace />;
  }

  if (isLoadingChats && !mounted) {
    return (
      <Box sx={{ display: 'flex', justifyContent: 'center', alignItems: 'center', minHeight: '100vh' }}>
        <CircularProgress />
      </Box>
    );
  }

  const NavRailItem = ({ icon: Icon, label, active, onClick, badge }: any) => (
    <Box
      onClick={onClick}
      sx={{
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        justifyContent: 'center',
        py: 2,
        px: 1,
        mx: 0.5,
        cursor: 'pointer',
        borderRadius: 2,
        color: active ? '#6366f1' : theme.palette.mode === 'light' ? '#64748b' : '#94a3b8',
        '&:hover': {
          color: active ? '#6366f1' : theme.palette.mode === 'light' ? '#1e293b' : '#f1f5f9',
          bgcolor: active
            ? 'rgba(99, 102, 241, 0.1)'
            : theme.palette.mode === 'light'
              ? 'rgba(0,0,0,0.05)'
              : 'rgba(255,255,255,0.05)',
        },
      }}
    >
      <Badge
        color="error"
        badgeContent={badge}
        overlap="circular"
        sx={{
          '& .MuiBadge-badge': {
            bgcolor: '#ef4444',
            color: '#ffffff',
            fontSize: '0.7rem',
            fontWeight: 700,
            minWidth: 18,
            height: 18,
            borderRadius: '9px',
            border: '2px solid rgba(255,255,255,0.9)',
          },
        }}
      >
        <Icon size={24} strokeWidth={active ? 2.5 : 2} />
      </Badge>
      <Typography
        variant="caption"
        sx={{
          mt: 0.5,
          fontWeight: active ? 700 : 500,
          fontSize: '0.65rem',
          color: 'inherit',
        }}
      >
        {label}
      </Typography>
    </Box>
  );

  return (
    <Box
      sx={{
        width: '100%',
        height: '100vh',
        overflow: 'hidden',
        display: 'flex',
        bgcolor: theme.palette.mode === 'light'
          ? '#f8fafc'
          : '#0f0f23',
      }}
    >
      {/* Navigation Rail - Modern Discord-style */}
      <Box
        sx={{
          width: 72,
          display: { xs: 'none', sm: 'flex' },
          flexDirection: 'column',
          bgcolor: theme.palette.mode === 'light'
            ? 'rgba(255,255,255,0.95)'
            : 'rgba(15,23,42,0.95)',
          borderRight: `1px solid ${alpha(theme.palette.mode === 'light' ? '#667eea' : '#3b82f6', 0.2)}`,
          zIndex: 100,
        }}
      >
        <Box sx={{ py: 3, display: 'flex', justifyContent: 'center' }}>
          <Box
            sx={{
              width: 48,
              height: 48,
              borderRadius: '12px',
              bgcolor: theme.palette.mode === 'light' ? '#0ea5e9' : '#3b82f6',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              color: '#ffffff',
            }}
          >
            <MessageSquare size={24} fill="currentColor" />
          </Box>
        </Box>

        <Stack spacing={1} sx={{ mt: 2, px: 1 }}>
          <NavRailItem
            icon={Hash}
            label="Channels"
            active={isChannelView}
            onClick={() => navigate('/chat/topics')}
          />
          <NavRailItem
            icon={UserCircle}
            label="Direct"
            active={isChatView}
            onClick={() => navigate('/chat/chats')}
            badge={unreadCount > 0 ? unreadCount : undefined}
          />
        </Stack>

        <Box sx={{ mt: 'auto', pb: 3, px: 1 }}>
          <NavRailItem
            icon={Settings}
            label="Settings"
            active={false}
            onClick={() => { }}
          />
        </Box>
      </Box>

      {/* Main Content Area */}
      <Box sx={{ flex: 1, display: 'flex', flexDirection: 'column', minWidth: 0, position: 'relative' }}>
        <HeaderBar />

        <Box sx={{ flex: 1, display: 'flex', overflow: 'hidden' }}>
          {/* Sidebars Component Container */}
          <Box
            sx={{
              display: { xs: 'none', md: 'block' },
              width: 320,
              height: '100%',
              bgcolor: theme.palette.mode === 'light'
                ? 'rgba(255,255,255,0.95)'
                : 'rgba(30,41,59,0.95)',
              borderRight: `1px solid ${theme.palette.mode === 'light' ? '#e2e8f0' : '#334155'}`,
              backdropFilter: 'blur(24px)',
              boxShadow: theme.palette.mode === 'light'
                ? '4px 0 20px rgba(0,0,0,0.08)'
                : '4px 0 20px rgba(0,0,0,0.3)',
            }}
          >
            {isChannelView ? <ChannelsSidebar /> : <ChatsSidebar />}
          </Box>

          {/* Chat Window */}
          <Box
            sx={{
              flex: 1,
              display: 'flex',
              flexDirection: 'column',
              minWidth: 0,
              bgcolor: theme.palette.mode === 'light'
                ? 'rgba(255,255,255,0.98)'
                : 'rgba(15,23,42,0.98)',
              backdropFilter: 'blur(30px)',
              position: 'relative',
              borderRadius: { xs: 0, md: '0 20px 20px 0' },
              overflow: 'hidden',
              boxShadow: theme.palette.mode === 'light'
                ? 'inset 0 1px 0 rgba(102, 126, 234, 0.05), 0 2px 8px rgba(0, 0, 0, 0.08)'
                : 'inset 0 1px 0 rgba(59, 130, 246, 0.08), 0 2px 8px rgba(0, 0, 0, 0.3)',
            }}
          >
            <Box sx={{ position: 'relative', zIndex: 1, flex: 1, minHeight: 0, display: 'flex', flexDirection: 'column' }}>
              {children}
            </Box>
          </Box>
        </Box>
      </Box>

      {/* Mobile Navigation */}
      <Box
        sx={{
          display: { xs: 'flex', sm: 'none' },
          position: 'fixed',
          bottom: 0,
          left: 0,
          right: 0,
          height: 72,
          bgcolor: theme.palette.mode === 'light'
            ? 'rgba(255,255,255,0.98)'
            : 'rgba(15,23,42,0.98)',
          backdropFilter: 'blur(30px)',
          borderTop: `1px solid ${alpha(theme.palette.mode === 'light' ? '#667eea' : '#3b82f6', 0.2)}`,
          boxShadow: theme.palette.mode === 'light'
            ? '0 -6px 24px rgba(102, 126, 234, 0.1), 0 -2px 12px rgba(0, 0, 0, 0.08)'
            : '0 -6px 24px rgba(59, 130, 246, 0.15), 0 -2px 12px rgba(0, 0, 0, 0.3)',
          zIndex: 1000,
          justifyContent: 'space-around',
          alignItems: 'center',
          px: 2,
        }}
      >
        <IconButton
          onClick={() => navigate('/chat/topics')}
          sx={{
            color: isChannelView ? '#6366f1' : theme.palette.mode === 'light' ? '#64748b' : '#94a3b8',
            bgcolor: isChannelView ? 'rgba(99, 102, 241, 0.1)' : 'transparent',
            borderRadius: 3,
            p: 2,
            transition: 'all 0.3s cubic-bezier(0.4, 0, 0.2, 1)',
            '&:hover': {
              bgcolor: isChannelView ? 'rgba(99, 102, 241, 0.15)' : 'rgba(0,0,0,0.05)',
              transform: 'scale(1.05)',
            },
          }}
        >
          <Hash size={24} />
        </IconButton>
        <IconButton
          onClick={() => navigate('/chat/chats')}
          sx={{
            color: isChatView ? '#6366f1' : theme.palette.mode === 'light' ? '#64748b' : '#94a3b8',
            bgcolor: isChatView ? 'rgba(99, 102, 241, 0.1)' : 'transparent',
            borderRadius: 3,
            p: 2,
            transition: 'all 0.3s cubic-bezier(0.4, 0, 0.2, 1)',
            '&:hover': {
              bgcolor: isChatView ? 'rgba(99, 102, 241, 0.15)' : 'rgba(0,0,0,0.05)',
              transform: 'scale(1.05)',
            },
          }}
        >
          <Badge
            badgeContent={unreadCount > 0 ? unreadCount : undefined}
            color="error"
            sx={{
              '& .MuiBadge-badge': {
                bgcolor: '#ef4444',
                color: '#ffffff',
                fontSize: '0.7rem',
                fontWeight: 700,
                minWidth: 18,
                height: 18,
                borderRadius: '9px',
                border: '2px solid rgba(255,255,255,0.9)',
              },
            }}
          >
            <UserCircle size={24} />
          </Badge>
        </IconButton>
        <IconButton
          sx={{
            color: theme.palette.mode === 'light' ? '#64748b' : '#94a3b8',
            borderRadius: 3,
            p: 2,
            transition: 'all 0.3s cubic-bezier(0.4, 0, 0.2, 1)',
            '&:hover': {
              bgcolor: 'rgba(0,0,0,0.05)',
              transform: 'scale(1.05)',
            },
          }}
        >
          <Settings size={24} />
        </IconButton>
      </Box>
    </Box>
  );
}

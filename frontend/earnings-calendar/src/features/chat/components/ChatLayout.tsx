import type { ReactNode } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import {
  Box,
  Paper,
  Tabs,
  Tab,
  Stack,
  Typography,
  alpha,
  useTheme,
  Badge,
} from '@mui/material';
import { MessageSquare, Users, Home } from 'lucide-react';
import { useGetUserChatsQuery } from '../../../services/chatApi';

interface ChatLayoutProps {
  children: ReactNode;
}

export default function ChatLayout({ children }: ChatLayoutProps) {
  const theme = useTheme();
  const navigate = useNavigate();
  const location = useLocation();
  const { data: chats = [] } = useGetUserChatsQuery();
  
  // Count unread messages (simplified - you can enhance this)
  const unreadCount = chats.filter(() => {
    // Add logic to count unread messages if you have that data
    return false;
  }).length;

  const getCurrentTab = () => {
    if (location.pathname.startsWith('/chat/topic/')) return 1;
    if (location.pathname.startsWith('/chat/one-to-one/')) return 2;
    if (location.pathname === '/chat/chats') return 2;
    if (location.pathname === '/chat/topics') return 0;
    return 0;
  };

  const handleTabChange = (_event: React.SyntheticEvent, newValue: number) => {
    switch (newValue) {
      case 0:
        navigate('/chat/topics');
        break;
      case 1:
        // If already in a topic, stay there, otherwise go to topics
        if (!location.pathname.startsWith('/chat/topic/')) {
          navigate('/chat/topics');
        }
        break;
      case 2:
        navigate('/chat/chats');
        break;
      default:
        navigate('/chat/topics');
    }
  };

  return (
    <Box
      sx={{
        width: '100%',
        minHeight: '100vh',
        position: 'relative',
        display: 'flex',
        flexDirection: 'column',
        bgcolor: theme.palette.background.default,
        '&::before': {
          content: '""',
          position: 'fixed',
          top: 0,
          left: 0,
          right: 0,
          bottom: 0,
          background: theme.palette.mode === 'light'
            ? 'linear-gradient(135deg, #f5f7fa 0%, #e8ecf1 50%, #c3cfe2 100%)'
            : 'linear-gradient(135deg, #0f0f23 0%, #1a1a2e 50%, #0f0f23 100%)',
          zIndex: 0,
        },
      }}
    >
      {/* Navigation Header */}
      <Paper
        elevation={0}
        sx={{
          position: 'sticky',
          top: 0,
          zIndex: 100,
          borderRadius: 0,
          borderBottom: `1px solid ${alpha(theme.palette.divider, 0.12)}`,
          bgcolor: alpha(theme.palette.background.paper, 0.95),
          backdropFilter: 'blur(20px)',
          boxShadow: `0 2px 8px ${alpha(theme.palette.common.black, 0.05)}`,
        }}
      >
        <Box
          sx={{
            maxWidth: { xs: '100%', sm: '100%', md: '1400px', lg: '1600px' },
            mx: 'auto',
            px: { xs: 2, sm: 3 },
          }}
        >
          <Stack
            direction="row"
            spacing={2}
            alignItems="center"
            justifyContent="space-between"
            sx={{ py: 1.5 }}
          >
            <Stack direction="row" spacing={2} alignItems="center">
              <Box
                sx={{
                  width: 40,
                  height: 40,
                  borderRadius: 1.5,
                  background: `linear-gradient(135deg, ${theme.palette.primary.main} 0%, ${theme.palette.primary.dark} 100%)`,
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  boxShadow: `0 4px 12px ${alpha(theme.palette.primary.main, 0.3)}`,
                }}
              >
                <MessageSquare size={20} color="white" />
              </Box>
              <Typography variant="h6" fontWeight={700}>
                Chat & Discussions
              </Typography>
            </Stack>
            <Stack direction="row" spacing={1} alignItems="center">
              <Box
                component="button"
                onClick={() => navigate('/dashboard')}
                sx={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: 0.5,
                  px: 2,
                  py: 1,
                  borderRadius: 1.5,
                  border: 'none',
                  bgcolor: alpha(theme.palette.primary.main, 0.1),
                  color: theme.palette.primary.main,
                  cursor: 'pointer',
                  transition: 'all 0.2s',
                  '&:hover': {
                    bgcolor: alpha(theme.palette.primary.main, 0.2),
                  },
                }}
              >
                <Home size={16} />
                <Typography variant="body2" fontWeight={600}>
                  Dashboard
                </Typography>
              </Box>
            </Stack>
          </Stack>

          {/* Navigation Tabs */}
          <Tabs
            value={getCurrentTab()}
            onChange={handleTabChange}
            sx={{
              borderBottom: `1px solid ${alpha(theme.palette.divider, 0.12)}`,
              '& .MuiTab-root': {
                minHeight: 48,
                textTransform: 'none',
                fontWeight: 600,
                fontSize: '0.9375rem',
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
              label="Topics"
              sx={{ gap: 1 }}
            />
            <Tab
              icon={<Users size={18} />}
              iconPosition="start"
              label={
                <Badge badgeContent={unreadCount > 0 ? unreadCount : undefined} color="error">
                  My Chats
                </Badge>
              }
              sx={{ gap: 1 }}
            />
          </Tabs>
        </Box>
      </Paper>

      {/* Content */}
      <Box
        sx={{
          flex: 1,
          position: 'relative',
          zIndex: 1,
          maxWidth: { xs: '100%', sm: '100%', md: '1400px', lg: '1600px' },
          mx: 'auto',
          width: '100%',
        }}
      >
        {children}
      </Box>
    </Box>
  );
}

import { useState } from 'react';
import { useNavigate, useParams, useLocation } from 'react-router-dom';
import {
  Box,
  Paper,
  Typography,
  TextField,
  InputAdornment,
  List,
  ListItemButton,
  Avatar,
  alpha,
  useTheme,
  Stack,
  Divider,
} from '@mui/material';
import { Search, MessageSquare, Users, Hash } from 'lucide-react';
import { useGetAllTopicsQuery } from '../../../services/chatApi';
import type { Topic } from '../../../services/chatApi';

interface ChannelsSidebarProps {
  onClose?: () => void;
}

export default function ChannelsSidebar({ onClose }: ChannelsSidebarProps) {
  const theme = useTheme();
  const navigate = useNavigate();
  const location = useLocation();
  const { topicId } = useParams<{ topicId: string }>();
  const { data: topics = [], isLoading } = useGetAllTopicsQuery();
  const [searchQuery, setSearchQuery] = useState('');

  // Show channels when on topics, topic, or discussion pages
  const isChannelPage = location.pathname.startsWith('/chat/topic/') ||
    location.pathname.startsWith('/chat/discussion/') ||
    location.pathname === '/chat/topics';
  const relevantTopics = isChannelPage ? topics : [];

  const filteredTopics = relevantTopics.filter((topic) =>
    topic.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
    topic.description?.toLowerCase().includes(searchQuery.toLowerCase())
  );

  const handleTopicClick = (topic: Topic) => {
    // Navigate to discussions for the selected topic
    navigate(`/chat/topic/${topic.id}/discussions`);
    onClose?.();
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
        borderBottom: `1px solid ${theme.palette.mode === 'light' ? '#e2e8f0' : '#334155'}`,
        bgcolor: theme.palette.mode === 'light'
          ? 'rgba(255,255,255,0.95)'
          : 'rgba(30,41,59,0.95)',
      }}>
        <Typography 
          variant="h6" 
          fontWeight={600} 
          sx={{ 
            mb: 3, 
            color: theme.palette.mode === 'light' ? '#262626' : '#fafafa',
          }}
        >
          {isChannelPage ? 'Channels' : 'All Channels'}
        </Typography>
        <TextField
          fullWidth
          size="small"
          placeholder="Filter channels..."
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          InputProps={{
            startAdornment: (
              <InputAdornment position="start">
                <Search size={18} color={theme.palette.mode === 'light' ? '#64748b' : '#94a3b8'} />
              </InputAdornment>
            ),
          }}
          sx={{
            '& .MuiOutlinedInput-root': {
              borderRadius: '12px',
              bgcolor: theme.palette.mode === 'light' ? '#f8fafc' : '#1e293b',
              border: `1px solid ${theme.palette.mode === 'light' ? '#e2e8f0' : '#334155'}`,
              '& fieldset': { border: 'none' },
              '&:hover': { 
                bgcolor: theme.palette.mode === 'light' ? '#f1f5f9' : '#334155',
                borderColor: '#6366f1',
              },
              '&.Mui-focused': { 
                bgcolor: theme.palette.mode === 'light' ? '#ffffff' : '#1e293b',
                borderColor: '#6366f1',
              },
            },
            '& .MuiInputBase-input': {
              fontSize: '0.9rem',
              fontWeight: 500,
            },
          }}
        />
      </Box>

      {/* Channels List */}
      <Box sx={{ 
        flex: 1, 
        overflowY: 'auto', 
        px: 2, 
        py: 2,
        '&::-webkit-scrollbar': {
          width: '6px',
        },
        '&::-webkit-scrollbar-track': {
          background: 'transparent',
        },
        '&::-webkit-scrollbar-thumb': {
          background: theme.palette.mode === 'light' ? '#cbd5e1' : '#475569',
          borderRadius: '3px',
          '&:hover': {
            background: theme.palette.mode === 'light' ? '#94a3b8' : '#64748b',
          },
        },
      }}>
        {isLoading ? (
          <Stack spacing={2} sx={{ p: 1 }}>
            {[1, 2, 3, 4, 5].map(i => (
              <Box 
                key={i} 
                sx={{ 
                  height: 64, 
                  borderRadius: 3, 
                  bgcolor: theme.palette.mode === 'light'
                    ? 'rgba(0,0,0,0.04)'
                    : 'rgba(255,255,255,0.04)',
                  animation: 'pulse 1.5s ease-in-out infinite',
                  '@keyframes pulse': {
                    '0%, 100%': { opacity: 0.5 },
                    '50%': { opacity: 0.8 },
                  },
                }} 
              />
            ))}
          </Stack>
        ) : filteredTopics.length === 0 ? (
          <Box sx={{ 
            p: 6, 
            textAlign: 'center', 
            opacity: 0.7,
            borderRadius: 3,
            bgcolor: theme.palette.mode === 'light'
              ? 'rgba(255,255,255,0.5)'
              : 'rgba(30,41,59,0.5)',
            backdropFilter: 'blur(8px)',
          }}>
            <Hash size={48} color={theme.palette.mode === 'light' ? '#cbd5e1' : '#475569'} style={{ marginBottom: 16 }} />
            <Typography variant="body1" color="text.secondary" sx={{ fontWeight: 600 }}>
              No channels found
            </Typography>
            <Typography variant="body2" color="text.secondary" sx={{ mt: 1 }}>
              Try adjusting your search
            </Typography>
          </Box>
        ) : (
          <Stack spacing={1}>
            {filteredTopics.map((topic) => {
              const isActive = topicId === topic.id;
              return (
                <Box
                  key={topic.id}
                  onClick={() => handleTopicClick(topic)}
                  sx={{
                    borderRadius: '12px',
                    p: 2.5,
                    cursor: 'pointer',
                    bgcolor: isActive 
                      ? 'rgba(99, 102, 241, 0.1)'
                      : theme.palette.mode === 'light'
                        ? 'rgba(255,255,255,0.95)'
                        : 'rgba(30,41,59,0.95)',
                    border: `1px solid ${isActive 
                      ? '#6366f1' 
                      : theme.palette.mode === 'light' ? '#e2e8f0' : '#334155'}`,
                    '&:hover': {
                      bgcolor: isActive 
                        ? 'rgba(99, 102, 241, 0.15)'
                        : theme.palette.mode === 'light'
                          ? 'rgba(255,255,255,1)'
                          : 'rgba(30,41,59,1)',
                      borderColor: isActive ? '#6366f1' : '#8b5cf6',
                    },
                  }}
                >
                  <Stack direction="row" spacing={2} alignItems="center" sx={{ width: '100%' }}>
                    <Avatar
                      sx={{
                        width: 48,
                        height: 48,
                        borderRadius: '12px',
                        bgcolor: isActive 
                          ? '#6366f1'
                          : theme.palette.mode === 'light'
                            ? '#e2e8f0'
                            : '#334155',
                        color: isActive ? '#ffffff' : theme.palette.mode === 'light' ? '#64748b' : '#94a3b8',
                      }}
                    >
                      <Hash size={22} />
                    </Avatar>
                    <Box sx={{ flex: 1, minWidth: 0 }}>
                      <Typography
                        variant="subtitle1"
                        fontWeight={isActive ? 800 : 700}
                        sx={{
                          color: isActive 
                            ? '#6366f1' 
                            : theme.palette.mode === 'light' ? '#1e293b' : '#f1f5f9',
                          mb: 0.5,
                          letterSpacing: '-0.01em',
                        }}
                        noWrap
                      >
                        {topic.title}
                      </Typography>
                      <Stack direction="row" spacing={2} alignItems="center">
                        <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5 }}>
                          <Users size={12} style={{ color: '#10b981' }} />
                          <Typography variant="body2" sx={{ fontSize: '0.7rem', fontWeight: 600, color: '#10b981' }}>
                            {topic.chat?._count?.members || 0}
                          </Typography>
                        </Box>
                        <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5 }}>
                          <MessageSquare size={12} style={{ color: '#6366f1' }} />
                          <Typography variant="body2" sx={{ fontSize: '0.7rem', fontWeight: 600, color: '#6366f1' }}>
                            {topic.chat?._count?.messages || 0}
                          </Typography>
                        </Box>
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

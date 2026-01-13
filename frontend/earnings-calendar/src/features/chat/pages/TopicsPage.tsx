import { useState, useEffect, useMemo } from 'react';
import {
  Box,
  Typography,
  Button,
  Stack,
  Card,
  CardContent,
  alpha,
  useTheme,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  TextField,
  CircularProgress,
  Grid,
  Paper,
  Avatar,
  InputAdornment,
  Tabs,
  Tab,
} from '@mui/material';
import {
  MessageSquare,
  Plus,
  Hash,
  Users,
  TrendingUp,
  Search,
} from 'lucide-react';
import { useGetAllTopicsQuery, useCreateTopicMutation } from '../../../services/chatApi';
import { useAuth } from '../../../app/useAuth';
import { useNavigate } from 'react-router-dom';
import UnifiedChatLayout from '../components/UnifiedChatLayout';

export default function TopicsPage() {
  const theme = useTheme();
  const navigate = useNavigate();
  const { role, isAuthenticated } = useAuth();
  const { data: topics = [], isLoading } = useGetAllTopicsQuery(undefined, {
    skip: !isAuthenticated,
  });
  const [createTopic] = useCreateTopicMutation();
  const [createDialogOpen, setCreateDialogOpen] = useState(false);
  const [newTopic, setNewTopic] = useState({ title: '', description: '' });
  const [mounted, setMounted] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');
  const [activeTab, setActiveTab] = useState(0);

  const canCreateTopic = role === 'admin' || role === 'superadmin';

  useEffect(() => {
    if (isAuthenticated) {
      setMounted(true);
    }
  }, [isAuthenticated]);

  if (!isAuthenticated) return null;

  const handleCreateTopic = async () => {
    try {
      await createTopic(newTopic).unwrap();
      setCreateDialogOpen(false);
      setNewTopic({ title: '', description: '' });
    } catch (error) {
      console.error('Failed to create topic:', error);
    }
  };

  // Filter topics based on search term
  const filteredTopics = useMemo(() => {
    if (!searchTerm.trim()) return topics;
    return topics.filter(topic =>
      topic.title.toLowerCase().includes(searchTerm.toLowerCase()) ||
      (topic.description && topic.description.toLowerCase().includes(searchTerm.toLowerCase()))
    );
  }, [topics, searchTerm]);

  // derived state for stats
  const totalMessages = topics.reduce((acc, t) => acc + (t.chat?._count?.messages || 0), 0);
  const totalDiscussions = topics.reduce((acc, t) => acc + (t.discussions?.length || 0), 0);

  // Get all discussions and sort by creation date (newest first)
  const recentDiscussions = topics
    .flatMap(t => (t.discussions || []).map(d => ({ ...d, topicTitle: t.title })))
    .sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime())
    .slice(0, 5); // Limit to top 5 for trending

  return (
    <UnifiedChatLayout>
      <Box sx={{
        width: '100%',
        minHeight: '100vh',
        display: 'flex',
        flexDirection: 'column',
        position: 'relative',
        background: theme.palette.mode === 'light'
          ? '#f8fafc'
          : '#0f0f23',
      }}>

        {/* Header Section */}
        <Box
          sx={{
            p: { xs: 3, sm: 4, md: 5 },
            borderBottom: theme.palette.mode === 'light'
              ? `1px solid ${alpha('#e2e8f0', 0.8)}`
              : `1px solid ${alpha('#334155', 0.5)}`,
            bgcolor: theme.palette.mode === 'light'
              ? '#f8fafc'
              : '#1e293b',
            position: 'sticky',
            top: 0,
            zIndex: 10,
            boxShadow: theme.palette.mode === 'light'
              ? '0 2px 4px rgba(0,0,0,0.08)'
              : '0 2px 4px rgba(0,0,0,0.3)',
            flexShrink: 0,
          }}
        >
          <Stack spacing={4}>
            <Stack direction="row" spacing={3} alignItems="center" justifyContent="space-between">
              <Box sx={{ flex: 1, maxWidth: 600 }}>
                <TextField
                  fullWidth
                  placeholder="Search channels..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  InputProps={{
                    startAdornment: (
                      <InputAdornment position="start">
                        <Search size={20} color={theme.palette.mode === 'light' ? '#64748b' : '#94a3b8'} />
                      </InputAdornment>
                    ),
                  }}
                  sx={{
                    '& .MuiOutlinedInput-root': {
                      borderRadius: 8,
                      bgcolor: theme.palette.mode === 'light' ? '#ffffff' : '#1e293b',
                      border: `1px solid ${theme.palette.mode === 'light' ? '#e2e8f0' : '#334155'}`,
                      '& fieldset': {
                        border: 'none',
                      },
                      '&:hover': {
                        borderColor: '#6366f1',
                      },
                      '&.Mui-focused': {
                        borderColor: '#6366f1',
                        boxShadow: '0 0 0 2px rgba(99, 102, 241, 0.1)',
                      },
                    },
                    '& .MuiInputBase-input': {
                      fontSize: '0.95rem',
                      fontWeight: 500,
                    },
                  }}
                />
              </Box>
              {canCreateTopic && (
                <Button
                  startIcon={<Plus size={20} />}
                  variant="contained"
                  onClick={() => setCreateDialogOpen(true)}
                  sx={{
                    borderRadius: 8,
                    px: 3,
                    py: 1.5,
                    fontWeight: 600,
                    textTransform: 'none',
                    fontSize: '0.95rem',
                    bgcolor: '#6366f1',
                    color: '#ffffff',
                    '&:hover': {
                      bgcolor: '#5855eb',
                    },
                    flexShrink: 0,
                  }}
                >
                  New Channel
                </Button>
              )}
            </Stack>
          </Stack>
          <Tabs
            value={activeTab}
            onChange={(e, newValue) => setActiveTab(newValue)}
            sx={{
              mt: 3,
              '& .MuiTabs-indicator': {
                height: 2,
                backgroundColor: '#6366f1',
              },
              '& .MuiTab-root': {
                textTransform: 'none',
                fontWeight: 600,
                fontSize: '0.95rem',
                color: theme.palette.mode === 'light' ? '#64748b' : '#94a3b8',
                '&.Mui-selected': {
                  color: '#6366f1',
                },
              },
            }}
          >
            <Tab icon={<Hash size={18} />} iconPosition="start" label="All Channels" />
            <Tab icon={<TrendingUp size={18} />} iconPosition="start" label="Trending Discussions" />
          </Tabs>
        </Box>

        {/* Dashboard Content */}
        <Box
          sx={{
            flex: 1,
            overflowY: 'auto',
            overflowX: 'hidden',
            p: { xs: 2, sm: 3, md: 4 },
            minHeight: 'calc(100vh - 200px)',
            position: 'relative',
            zIndex: 1,
          }}
        >
          {isLoading ? (
            <Box sx={{ display: 'flex', justifyContent: 'center', py: 12 }}>
              <CircularProgress
                size={48}
                sx={{
                  color: '#6366f1',
                }}
              />
            </Box>
          ) : (
            <Stack spacing={4} sx={{ pb: 6 }}>
              {/* All Channels Tab */}
              {activeTab === 0 && (
                <Box>

                  {filteredTopics.length === 0 ? (
                    <Paper
                      variant="outlined"
                      sx={{
                        p: 6,
                        textAlign: 'center',
                        borderRadius: 8,
                        bgcolor: theme.palette.mode === 'light'
                          ? '#ffffff'
                          : '#1e293b',
                        border: `1px solid ${theme.palette.mode === 'light' ? '#e2e8f0' : '#334155'}`,
                      }}
                    >
                      <Typography variant="h6" color="text.secondary" sx={{ mb: 2, fontWeight: 600 }}>
                        {searchTerm ? 'No channels found' : 'No channels yet'}
                      </Typography>
                      <Typography color="text.secondary" sx={{ fontSize: '1rem' }}>
                        {searchTerm ? 'Try adjusting your search terms.' : 'Be the first to create a channel and start discussions!'}
                      </Typography>
                    </Paper>
                  ) : (
                    <Grid container spacing={2}>
                      {filteredTopics.map((topic) => (
                        <Grid size={{ xs: 12, sm: 6, md: 4 }} key={topic.id}>
                          <Card
                            onClick={() => navigate(`/chat/topic/${topic.id}/discussions`)}
                            sx={{
                              height: '100%',
                              borderRadius: 12,
                              border: `1px solid ${theme.palette.mode === 'light' ? '#e2e8f0' : '#334155'}`,
                              cursor: 'pointer',
                              bgcolor: theme.palette.mode === 'light'
                                ? '#ffffff'
                                : '#1e293b',
                              boxShadow: theme.palette.mode === 'light'
                                ? '0 2px 4px rgba(0,0,0,0.08)'
                                : '0 2px 4px rgba(0,0,0,0.3)',
                              '&:hover': {
                                boxShadow: theme.palette.mode === 'light'
                                  ? '0 4px 8px rgba(0,0,0,0.12)'
                                  : '0 4px 8px rgba(0,0,0,0.4)',
                              },
                            }}
                          >
                            <CardContent sx={{ p: 3 }}>
                              <Stack spacing={2} sx={{ flex: 1 }}>
                                <Box sx={{ display: 'flex', alignItems: 'center', gap: 2 }}>
                                  <Avatar
                                    sx={{
                                      bgcolor: '#0ea5e9',
                                      color: '#ffffff',
                                      width: 48,
                                      height: 48,
                                    }}
                                  >
                                    <Hash size={24} />
                                  </Avatar>
                                  <Box sx={{ flex: 1, minWidth: 0 }}>
                                    <Typography variant="h6" fontWeight={700} sx={{ mb: 1, color: theme.palette.mode === 'light' ? '#1e293b' : '#f1f5f9' }}>
                                      {topic.title}
                                    </Typography>
                                    <Typography variant="body2" color="text.secondary" sx={{ lineHeight: 1.4 }}>
                                      {topic.description || 'No description'}
                                    </Typography>
                                  </Box>
                                </Box>
                                <Stack direction="row" spacing={1.5} sx={{ mt: 'auto', pt: 1.5 }}>
                                  <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                                    <MessageSquare size={14} color="#10b981" />
                                    <Typography variant="body2" fontWeight={600} color="#10b981">
                                      {topic.discussions?.length || 0} discussions
                                    </Typography>
                                  </Box>
                                  <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                                    <Users size={14} color="#0ea5e9" />
                                    <Typography variant="body2" fontWeight={600} color="#0ea5e9">
                                      {topic.chat?._count?.messages || 0} messages
                                    </Typography>
                                  </Box>
                                </Stack>
                              </Stack>
                            </CardContent>
                          </Card>
                        </Grid>
                      ))}
                    </Grid>
                  )}
                </Box>
              )}

              {/* Trending Discussions Tab */}
              {activeTab === 1 && (
                <Box>

                  <Stack spacing={3}>
                    {recentDiscussions.length === 0 ? (
                      <Paper
                        variant="outlined"
                        sx={{
                          p: 6,
                          textAlign: 'center',
                          borderRadius: 8,
                          bgcolor: theme.palette.mode === 'light'
                            ? '#ffffff'
                            : '#1e293b',
                          border: `1px solid ${theme.palette.mode === 'light' ? '#e2e8f0' : '#334155'}`,
                        }}
                      >
                        <Typography color="text.secondary" sx={{ fontSize: '1rem', fontWeight: 500 }}>
                          No active discussions found. Start one in a channel!
                        </Typography>
                      </Paper>
                    ) : (
                      recentDiscussions.map((discussion) => (
                        <Card
                          key={discussion.id}
                          onClick={() => navigate(`/chat/discussion/${discussion.id}`)}
                          sx={{
                            borderRadius: 12,
                            border: `1px solid ${theme.palette.mode === 'light' ? '#e2e8f0' : '#334155'}`,
                            cursor: 'pointer',
                            bgcolor: theme.palette.mode === 'light'
                              ? '#ffffff'
                              : '#1e293b',
                            boxShadow: theme.palette.mode === 'light'
                              ? '0 2px 4px rgba(0,0,0,0.08)'
                              : '0 2px 4px rgba(0,0,0,0.3)',
                            '&:hover': {
                              boxShadow: theme.palette.mode === 'light'
                                ? '0 4px 8px rgba(0,0,0,0.12)'
                                : '0 4px 8px rgba(0,0,0,0.4)',
                            },
                          }}
                        >
                          <CardContent sx={{ p: 3 }}>
                            <Stack direction="row" spacing={2.5} alignItems="center">
                              <Box
                                sx={{
                                  width: 48,
                                  height: 48,
                                  borderRadius: 8,
                                  bgcolor: '#10b981',
                                  display: 'flex',
                                  alignItems: 'center',
                                  justifyContent: 'center',
                                  color: '#ffffff',
                                }}
                              >
                                <Hash size={24} />
                              </Box>
                              <Box sx={{ flex: 1, minWidth: 0 }}>
                                <Typography variant="caption" fontWeight={700} sx={{ color: '#10b981', textTransform: 'uppercase', letterSpacing: '0.1em', mb: 0.5 }}>
                                  {discussion.topicTitle}
                                </Typography>
                                <Typography variant="h6" fontWeight={700} sx={{ mb: 0.5, color: theme.palette.mode === 'light' ? '#1e293b' : '#f1f5f9' }}>
                                  {discussion.title}
                                </Typography>
                                <Typography variant="body2" color="text.secondary" sx={{ opacity: 0.8, lineHeight: 1.4 }}>
                                  {discussion.description || 'No description provided'}
                                </Typography>
                              </Box>
                              <Stack alignItems="flex-end" spacing={0.5}>
                                <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                                  <MessageSquare size={14} color="#0ea5e9" />
                                  <Typography variant="body2" fontWeight={600} color="#0ea5e9">
                                    {discussion.chat?._count?.messages || 0} messages
                                  </Typography>
                                </Box>
                                <Typography variant="caption" color="text.secondary" sx={{ fontWeight: 500 }}>
                                  {new Date(discussion.createdAt).toLocaleDateString()}
                                </Typography>
                              </Stack>
                            </Stack>
                          </CardContent>
                        </Card>
                      ))
                    )}
                  </Stack>
                </Box>
              )}
            </Stack>
          )}
        </Box>

        {/* Create Topic Dialog */}
        <Dialog
          open={createDialogOpen}
          onClose={() => setCreateDialogOpen(false)}
          maxWidth="sm"
          fullWidth
          PaperProps={{
            sx: {
              borderRadius: 12,
              border: `1px solid ${theme.palette.mode === 'light' ? '#e2e8f0' : '#334155'}`,
            },
          }}
        >
          <DialogTitle
            sx={{
              bgcolor: theme.palette.mode === 'light'
                ? '#f8fafc'
                : '#1e293b',
              borderBottom: `1px solid ${theme.palette.mode === 'light' ? '#e2e8f0' : '#334155'}`,
              fontWeight: 700,
              color: theme.palette.mode === 'light' ? '#1e293b' : '#f1f5f9',
              fontSize: '1.25rem',
              pt: 3,
              pb: 2,
            }}
          >
            Create New Channel
          </DialogTitle>
          <DialogContent sx={{ pt: 3, px: 3 }}>
            <Stack spacing={3}>
              <TextField
                label="Channel Title"
                fullWidth
                value={newTopic.title}
                onChange={(e) => setNewTopic({ ...newTopic, title: e.target.value })}
                required
                sx={{
                  '& .MuiOutlinedInput-root': {
                    borderRadius: 8,
                    bgcolor: theme.palette.mode === 'light' ? '#f8fafc' : '#1e293b',
                    border: `1px solid ${theme.palette.mode === 'light' ? '#e2e8f0' : '#334155'}`,
                    '& fieldset': {
                      border: 'none',
                    },
                    '&:hover': {
                      borderColor: '#6366f1',
                    },
                    '&.Mui-focused': {
                      borderColor: '#6366f1',
                      boxShadow: '0 0 0 2px rgba(99, 102, 241, 0.1)',
                    },
                  },
                  '& .MuiInputLabel-root': {
                    fontWeight: 600,
                    color: theme.palette.mode === 'light' ? '#64748b' : '#94a3b8',
                  },
                }}
              />
              <TextField
                label="Description (Optional)"
                fullWidth
                multiline
                rows={4}
                value={newTopic.description}
                onChange={(e) => setNewTopic({ ...newTopic, description: e.target.value })}
                sx={{
                  '& .MuiOutlinedInput-root': {
                    borderRadius: 8,
                    bgcolor: theme.palette.mode === 'light' ? '#f8fafc' : '#1e293b',
                    border: `1px solid ${theme.palette.mode === 'light' ? '#e2e8f0' : '#334155'}`,
                    '& fieldset': {
                      border: 'none',
                    },
                    '&:hover': {
                      borderColor: '#6366f1',
                    },
                    '&.Mui-focused': {
                      borderColor: '#6366f1',
                      boxShadow: '0 0 0 2px rgba(99, 102, 241, 0.1)',
                    },
                  },
                  '& .MuiInputLabel-root': {
                    fontWeight: 600,
                    color: theme.palette.mode === 'light' ? '#64748b' : '#94a3b8',
                  },
                }}
              />
            </Stack>
          </DialogContent>
          <DialogActions sx={{ p: 3, gap: 2, borderTop: `1px solid ${theme.palette.mode === 'light' ? '#e2e8f0' : '#334155'}` }}>
            <Button
              onClick={() => setCreateDialogOpen(false)}
              variant="text"
              sx={{
                borderRadius: 8,
                px: 3,
                py: 1.5,
                fontWeight: 600,
                color: theme.palette.mode === 'light' ? '#64748b' : '#94a3b8',
                '&:hover': {
                  bgcolor: theme.palette.mode === 'light' ? '#f1f5f9' : '#334155',
                },
              }}
            >
              Cancel
            </Button>
            <Button
              onClick={handleCreateTopic}
              variant="contained"
              disabled={!newTopic.title}
              sx={{
                borderRadius: 8,
                px: 3,
                py: 1.5,
                fontWeight: 600,
                bgcolor: '#6366f1',
                color: '#ffffff',
                '&:hover': {
                  bgcolor: '#5855eb',
                },
                '&:disabled': {
                  bgcolor: theme.palette.mode === 'light' ? '#cbd5e1' : '#475569',
                  color: theme.palette.mode === 'light' ? '#94a3b8' : '#64748b',
                },
              }}
            >
              Create
            </Button>
          </DialogActions>
        </Dialog>
      </Box>
    </UnifiedChatLayout>
  );
}

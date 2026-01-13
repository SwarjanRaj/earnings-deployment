import { useState, useEffect, useMemo } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
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
  InputAdornment,
  IconButton,
  Tooltip,
  Grid,

} from '@mui/material';
import {
  MessageSquare,
  Plus,
  Users,
  Search,
  X,
  ArrowLeft,
  Edit,
  Trash2,
} from 'lucide-react';
import {
  useGetDiscussionsByTopicQuery,
  useCreateDiscussionMutation,
  useUpdateDiscussionMutation,
  useDeleteDiscussionMutation,
  useGetTopicByIdQuery,
} from '../../../services/chatApi';
import { useAuth } from '../../../app/useAuth';
import UnifiedChatLayout from '../components/UnifiedChatLayout';

export default function DiscussionsPage() {
  const theme = useTheme();
  const navigate = useNavigate();
  const { topicId } = useParams<{ topicId: string }>();
  const { role, isAuthenticated, user } = useAuth();

  const { data: topic, isLoading: topicLoading } = useGetTopicByIdQuery(topicId!, {
    skip: !topicId,
  });

  const { data: discussions = [], isLoading, refetch } = useGetDiscussionsByTopicQuery(topicId!, {
    skip: !topicId,
  });

  const [createDiscussion] = useCreateDiscussionMutation();
  const [updateDiscussion] = useUpdateDiscussionMutation();
  const [deleteDiscussion] = useDeleteDiscussionMutation();

  const [createDialogOpen, setCreateDialogOpen] = useState(false);
  const [editDialogOpen, setEditDialogOpen] = useState(false);
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [selectedDiscussion, setSelectedDiscussion] = useState<{ id: string; title: string; description?: string } | null>(null);
  const [newDiscussion, setNewDiscussion] = useState({ title: '', description: '' });
  const [searchQuery, setSearchQuery] = useState('');

  // Filter out deleted discussions (backend should handle this, but double-check)
  const activeDiscussions = useMemo(() => {
    return discussions.filter(d => !d.deleted);
  }, [discussions]);

  // Filter discussions based on search query
  const filteredDiscussions = useMemo(() => {
    if (!searchQuery.trim()) return activeDiscussions;
    const query = searchQuery.toLowerCase();
    return activeDiscussions.filter(
      (discussion) =>
        discussion.title.toLowerCase().includes(query) ||
        discussion.description?.toLowerCase().includes(query)
    );
  }, [activeDiscussions, searchQuery]);

  const canCreateDiscussion = isAuthenticated; // All authenticated users can create
  const isAdmin = role === 'admin' || role === 'superadmin';

  if (!isAuthenticated) {
    return null;
  }

  const handleCreateDiscussion = async () => {
    if (!topicId || !newDiscussion.title.trim()) return;
    try {
      await createDiscussion({
        ...newDiscussion,
        topicId,
      }).unwrap();
      setCreateDialogOpen(false);
      setNewDiscussion({ title: '', description: '' });
    } catch (error) {
      console.error('Failed to create discussion:', error);
    }
  };

  const handleEditDiscussion = async () => {
    if (!selectedDiscussion) return;
    try {
      await updateDiscussion({
        id: selectedDiscussion.id,
        data: {
          title: newDiscussion.title || selectedDiscussion.title,
          description: newDiscussion.description ?? selectedDiscussion.description,
        },
      }).unwrap();
      setEditDialogOpen(false);
      setSelectedDiscussion(null);
      setNewDiscussion({ title: '', description: '' });
    } catch (error) {
      console.error('Failed to update discussion:', error);
    }
  };

  const handleDeleteDiscussion = async () => {
    if (!selectedDiscussion) return;
    try {
      await deleteDiscussion(selectedDiscussion.id).unwrap();
      setDeleteDialogOpen(false);
      setSelectedDiscussion(null);
    } catch (error) {
      console.error('Failed to delete discussion:', error);
    }
  };

  const canEditOrDelete = (discussion: any) => {
    return discussion.createdBy === user?.id || isAdmin;
  };

  if (topicLoading) {
    return (
      <UnifiedChatLayout>
        <Box sx={{ display: 'flex', justifyContent: 'center', alignItems: 'center', height: '100%' }}>
          <CircularProgress />
        </Box>
      </UnifiedChatLayout>
    );
  }

  if (!topic) {
    return (
      <UnifiedChatLayout>
        <Box sx={{ textAlign: 'center', py: 12 }}>
          <Typography variant="h5" fontWeight={700} sx={{ mb: 1 }}>
            Topic not found
          </Typography>
          <Button onClick={() => navigate('/chat/topics')} startIcon={<ArrowLeft />}>
            Back to Topics
          </Button>
        </Box>
      </UnifiedChatLayout>
    );
  }

  return (
    <UnifiedChatLayout>
      <Box sx={{
        width: '100%',
        height: '100%',
        display: 'flex',
        flexDirection: 'column',
        overflow: 'hidden',
        background: theme.palette.mode === 'light'
          ? '#f8fafc'
          : '#0f0f23',
      }}>
        {/* Header Section */}
        <Box
          sx={{
            p: { xs: 2, sm: 2.5, md: 3 },
            borderBottom: `1px solid ${alpha(theme.palette.mode === 'light' ? '#0ea5e9' : '#3b82f6', 0.2)}`,
            bgcolor: theme.palette.mode === 'light'
              ? 'rgba(255, 255, 255, 0.95)'
              : 'rgba(15, 23, 42, 0.95)',
            position: 'sticky',
            top: 0,
            zIndex: 10,
            boxShadow: theme.palette.mode === 'light'
              ? '0 2px 16px rgba(14, 165, 233, 0.1)'
              : '0 2px 16px rgba(59, 130, 246, 0.15)',
          }}
        >
          <Stack spacing={2}>
            <Stack direction="row" spacing={2} alignItems="center">
              <IconButton
                onClick={() => navigate('/chat/topics')}
                sx={{
                  color: theme.palette.mode === 'light' ? '#262626' : '#fafafa',
                }}
              >
                <ArrowLeft size={20} />
              </IconButton>
              <Box sx={{ flex: 1 }}>
                <Typography
                  variant="h5"
                  fontWeight={700}
                  sx={{
                    fontSize: { xs: '1.25rem', sm: '1.5rem', md: '1.75rem' },
                    mb: 0.5,
                    color: theme.palette.mode === 'light' ? '#262626' : '#fafafa',
                  }}
                >
                  {topic.title}
                </Typography>
                <Typography
                  variant="body2"
                  sx={{
                    fontSize: '0.875rem',
                    color: theme.palette.mode === 'light' ? '#8e8e8e' : '#a8a8a8',
                  }}
                >
                  {filteredDiscussions.length} {filteredDiscussions.length === 1 ? 'discussion' : 'discussions'}
                </Typography>
              </Box>
              {canCreateDiscussion && (
                <Button
                  startIcon={<Plus size={18} />}
                  variant="contained"
                  onClick={() => setCreateDialogOpen(true)}
                  sx={{
                    borderRadius: 12,
                    px: { xs: 2, sm: 3 },
                    py: 1.2,
                    fontWeight: 600,
                    fontSize: { xs: '0.8125rem', sm: '0.875rem' },
                    textTransform: 'none',
                    bgcolor: theme.palette.mode === 'light' ? '#0ea5e9' : '#3b82f6',
                    color: '#ffffff',
                    '&:hover': {
                      bgcolor: theme.palette.mode === 'light' ? '#0284c7' : '#2563eb',
                    },
                  }}
                >
                  <Box component="span" sx={{ display: { xs: 'none', sm: 'inline' } }}>New Discussion</Box>
                  <Box component="span" sx={{ display: { xs: 'inline', sm: 'none' } }}>New</Box>
                </Button>
              )}
            </Stack>

            {/* Search Bar */}
            <TextField
              fullWidth
              size="small"
              placeholder="Search discussions..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              InputProps={{
                startAdornment: (
                  <InputAdornment position="start">
                    <Search size={18} style={{ color: theme.palette.mode === 'light' ? '#64748b' : '#94a3b8' }} />
                  </InputAdornment>
                ),
                endAdornment: searchQuery && (
                  <InputAdornment position="end">
                    <IconButton
                      size="small"
                      onClick={() => setSearchQuery('')}
                      sx={{
                        mr: -1,
                        color: theme.palette.mode === 'light' ? '#64748b' : '#94a3b8',
                        '&:hover': {
                          color: theme.palette.mode === 'light' ? '#1e293b' : '#f1f5f9',
                        },
                      }}
                    >
                      <X size={16} />
                    </IconButton>
                  </InputAdornment>
                ),
              }}
              sx={{
                '& .MuiOutlinedInput-root': {
                  borderRadius: 12,
                  bgcolor: theme.palette.mode === 'light' ? 'rgba(255, 255, 255, 0.8)' : 'rgba(30, 41, 59, 0.8)',
                  border: `1px solid ${theme.palette.mode === 'light' ? 'rgba(14, 165, 233, 0.2)' : 'rgba(59, 130, 246, 0.2)'}`,
                  '& fieldset': {
                    border: 'none',
                  },
                  '&:hover': {
                    bgcolor: theme.palette.mode === 'light' ? 'rgba(255, 255, 255, 0.9)' : 'rgba(30, 41, 59, 0.9)',
                    borderColor: theme.palette.mode === 'light' ? '#0ea5e9' : '#3b82f6',
                  },
                  '&.Mui-focused': {
                    bgcolor: theme.palette.mode === 'light' ? 'rgba(255, 255, 255, 0.95)' : 'rgba(30, 41, 59, 0.95)',
                    borderColor: theme.palette.mode === 'light' ? '#0ea5e9' : '#3b82f6',
                  },
                },
                '& .MuiInputBase-input': {
                  fontSize: '0.9rem',
                  fontWeight: 500,
                },
              }}
            />
          </Stack>
        </Box>

        {/* Discussions List */}
        <Box
          sx={{
            flex: 1,
            overflowY: 'auto',
            overflowX: 'hidden',
            p: { xs: 1.5, sm: 2, md: 2.5 },
            position: 'relative',
            zIndex: 1,
            '&::-webkit-scrollbar': {
              width: '6px',
            },
            '&::-webkit-scrollbar-track': {
              background: theme.palette.mode === 'light' ? 'rgba(241, 245, 249, 0.5)' : 'rgba(30, 41, 59, 0.5)',
              borderRadius: '4px',
            },
            '&::-webkit-scrollbar-thumb': {
              background: theme.palette.mode === 'light'
                ? 'linear-gradient(135deg, #0ea5e9 0%, #0284c7 100%)'
                : 'linear-gradient(135deg, #3b82f6 0%, #1e40af 100%)',
              borderRadius: '4px',
              '&:hover': {
                background: theme.palette.mode === 'light'
                  ? 'linear-gradient(135deg, #0284c7 0%, #0369a1 100%)'
                  : 'linear-gradient(135deg, #2563eb 0%, #1d4ed8 100%)',
              },
            },
          }}
        >
          {isLoading ? (
            <Box sx={{ display: 'flex', justifyContent: 'center', py: 8 }}>
              <CircularProgress />
            </Box>
          ) : filteredDiscussions.length === 0 ? (
            <Box sx={{
              display: 'flex',
              flexDirection: 'column',
              alignItems: 'center',
              justifyContent: 'center',
              py: { xs: 8, md: 12 },
              px: 3,
              minHeight: 400,
            }}>
              <Box
                sx={{
                  display: 'flex',
                  flexDirection: 'column',
                  alignItems: 'center',
                  textAlign: 'center',
                  maxWidth: 500,
                }}
              >
                <Box sx={{ mb: 4 }}>
                  <MessageSquare
                    size={48}
                    style={{
                      color: theme.palette.mode === 'light' ? '#0ea5e9' : '#3b82f6',
                    }}
                  />
                </Box>

                <Typography
                  variant="h4"
                  fontWeight={600}
                  sx={{
                    mb: 2,
                    color: theme.palette.mode === 'light' ? '#262626' : '#fafafa',
                    textAlign: 'center',
                  }}
                >
                  {searchQuery ? 'No discussions found' : 'No discussions yet'}
                </Typography>

                <Typography
                  variant="body1"
                  sx={{
                    mb: 5,
                    maxWidth: 400,
                    mx: 'auto',
                    color: theme.palette.mode === 'light' ? '#64748b' : '#94a3b8',
                    textAlign: 'center',
                  }}
                >
                  {searchQuery
                    ? 'Try adjusting your search terms to find what you\'re looking for.'
                    : canCreateDiscussion
                      ? 'Start the conversation! Create the first discussion and spark meaningful dialogue.'
                      : 'Check back later for new discussions.'}
                </Typography>

                {canCreateDiscussion && !searchQuery && (
                  <Button
                    variant="contained"
                    startIcon={<Plus size={20} />}
                    onClick={() => setCreateDialogOpen(true)}
                    sx={{
                      borderRadius: 12,
                      px: 4,
                      py: 1.5,
                      fontWeight: 600,
                      textTransform: 'none',
                      bgcolor: theme.palette.mode === 'light' ? '#0ea5e9' : '#3b82f6',
                      color: '#ffffff',
                      '&:hover': {
                        bgcolor: theme.palette.mode === 'light' ? '#0284c7' : '#2563eb',
                      },
                    }}
                  >
                    Create First Discussion
                  </Button>
                )}
              </Box>
            </Box>
          ) : (
            <Box sx={{ width: '100%' }}>
              <Grid container spacing={3}>
                {filteredDiscussions.map((discussion, index) => (
                  <Grid size={{ xs: 12, sm: 6, md: 4, lg: 3 }} key={discussion.id}>
                    <Card
                      onClick={() => navigate(`/chat/discussion/${discussion.id}`)}
                      sx={{
                        height: '100%',
                        borderRadius: 12,
                        bgcolor: theme.palette.mode === 'light'
                          ? 'rgba(255, 255, 255, 0.95)'
                          : 'rgba(15, 23, 42, 0.95)',
                        border: `1px solid ${alpha(theme.palette.mode === 'light' ? '#0ea5e9' : '#3b82f6', 0.2)}`,
                        cursor: 'pointer',
                        '&:hover': {
                          boxShadow: theme.palette.mode === 'light'
                            ? '0 4px 12px rgba(14, 165, 233, 0.15)'
                            : '0 4px 12px rgba(59, 130, 246, 0.2)',
                          borderColor: theme.palette.mode === 'light' ? '#0ea5e9' : '#3b82f6',
                        },
                      }}
                    >
                      <CardContent sx={{ p: { xs: 2, sm: 2.5 }, '&:last-child': { pb: { xs: 2, sm: 2.5 } } }}>
                        <Stack spacing={2}>
                          <Stack direction="row" spacing={2} alignItems="flex-start">
                            <Box
                              sx={{
                                width: 48,
                                height: 48,
                                borderRadius: '50%',
                                bgcolor: theme.palette.mode === 'light' ? '#0ea5e9' : '#3b82f6',
                                display: 'flex',
                                alignItems: 'center',
                                justifyContent: 'center',
                                flexShrink: 0,
                              }}
                            >
                              <MessageSquare
                                size={24}
                                style={{
                                  color: '#ffffff',
                                }}
                              />
                            </Box>
                            <Box sx={{ flex: 1, minWidth: 0 }}>
                              <Stack direction="row" spacing={1} alignItems="center" justifyContent="space-between">
                                <Typography
                                  variant="h6"
                                  fontWeight={600}
                                  sx={{
                                    mb: 0.5,
                                    color: theme.palette.mode === 'light' ? '#262626' : '#fafafa',
                                    fontSize: { xs: '1rem', sm: '1.125rem' },
                                  }}
                                  noWrap
                                >
                                  {discussion.title}
                                </Typography>
                                {canEditOrDelete(discussion) && (
                                  <Stack direction="row" spacing={0.5} onClick={(e) => e.stopPropagation()}>
                                    <Tooltip title="Edit">
                                      <IconButton
                                        size="small"
                                        onClick={(e) => {
                                          e.stopPropagation();
                                          setSelectedDiscussion(discussion);
                                          setNewDiscussion({ title: discussion.title, description: discussion.description || '' });
                                          setEditDialogOpen(true);
                                        }}
                                      >
                                        <Edit size={16} />
                                      </IconButton>
                                    </Tooltip>
                                    <Tooltip title="Delete">
                                      <IconButton
                                        size="small"
                                        onClick={(e) => {
                                          e.stopPropagation();
                                          setSelectedDiscussion(discussion);
                                          setDeleteDialogOpen(true);
                                        }}
                                      >
                                        <Trash2 size={16} />
                                      </IconButton>
                                    </Tooltip>
                                  </Stack>
                                )}
                              </Stack>
                              {discussion.description && (
                                <Typography
                                  variant="body2"
                                  sx={{
                                    mb: 1.5,
                                    color: theme.palette.mode === 'light' ? '#8e8e8e' : '#a8a8a8',
                                    display: '-webkit-box',
                                    WebkitLineClamp: 2,
                                    WebkitBoxOrient: 'vertical',
                                    overflow: 'hidden',
                                    lineHeight: 1.4,
                                  }}
                                >
                                  {discussion.description}
                                </Typography>
                              )}
                              <Stack direction="row" spacing={2} alignItems="center" flexWrap="wrap">
                                <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5 }}>
                                  <Users size={16} style={{ color: '#10b981' }} />
                                  <Typography variant="body2" sx={{ fontSize: '0.8125rem', fontWeight: 600, color: '#10b981' }}>
                                    {discussion.chat?._count?.members || 0} members
                                  </Typography>
                                </Box>
                                <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5 }}>
                                  <MessageSquare size={16} style={{ color: '#0ea5e9' }} />
                                  <Typography variant="body2" sx={{ fontSize: '0.8125rem', fontWeight: 600, color: '#0ea5e9' }}>
                                    {discussion.chat?._count?.messages || 0} messages
                                  </Typography>
                                </Box>
                              </Stack>
                            </Box>
                          </Stack>
                        </Stack>
                      </CardContent>
                    </Card>
                  </Grid>
                ))}
              </Grid>
            </Box>
          )}
        </Box>

        {/* Create Discussion Dialog */}
        <Dialog
          open={createDialogOpen}
          onClose={() => setCreateDialogOpen(false)}
          maxWidth="sm"
          fullWidth
        >
          <DialogTitle>Create New Discussion</DialogTitle>
          <DialogContent>
            <Stack spacing={2.5} sx={{ pt: 3 }}>
              <TextField
                label="Discussion Title"
                fullWidth
                value={newDiscussion.title}
                onChange={(e) => setNewDiscussion({ ...newDiscussion, title: e.target.value })}
                required
              />
              <TextField
                label="Description (Optional)"
                fullWidth
                multiline
                rows={4}
                value={newDiscussion.description}
                onChange={(e) => setNewDiscussion({ ...newDiscussion, description: e.target.value })}
              />
            </Stack>
          </DialogContent>
          <DialogActions>
            <Button onClick={() => setCreateDialogOpen(false)}>Cancel</Button>
            <Button
              onClick={handleCreateDiscussion}
              variant="contained"
              disabled={!newDiscussion.title}
            >
              Create
            </Button>
          </DialogActions>
        </Dialog>

        {/* Edit Discussion Dialog */}
        <Dialog
          open={editDialogOpen}
          onClose={() => setEditDialogOpen(false)}
          maxWidth="sm"
          fullWidth
        >
          <DialogTitle>Edit Discussion</DialogTitle>
          <DialogContent>
            <Stack spacing={2.5} sx={{ pt: 3 }}>
              <TextField
                label="Discussion Title"
                fullWidth
                value={newDiscussion.title}
                onChange={(e) => setNewDiscussion({ ...newDiscussion, title: e.target.value })}
                required
              />
              <TextField
                label="Description (Optional)"
                fullWidth
                multiline
                rows={4}
                value={newDiscussion.description}
                onChange={(e) => setNewDiscussion({ ...newDiscussion, description: e.target.value })}
              />
            </Stack>
          </DialogContent>
          <DialogActions>
            <Button onClick={() => setEditDialogOpen(false)}>Cancel</Button>
            <Button
              onClick={handleEditDiscussion}
              variant="contained"
              disabled={!newDiscussion.title}
            >
              Save
            </Button>
          </DialogActions>
        </Dialog>

        {/* Delete Confirmation Dialog */}
        <Dialog
          open={deleteDialogOpen}
          onClose={() => setDeleteDialogOpen(false)}
          maxWidth="sm"
          fullWidth
        >
          <DialogTitle>Delete Discussion</DialogTitle>
          <DialogContent>
            <Typography>
              Are you sure you want to delete "{selectedDiscussion?.title}"? This will hide the discussion and all its messages, but they will not be permanently removed.
            </Typography>
          </DialogContent>
          <DialogActions>
            <Button onClick={() => setDeleteDialogOpen(false)}>Cancel</Button>
            <Button
              onClick={handleDeleteDiscussion}
              variant="contained"
              color="error"
            >
              Delete
            </Button>
          </DialogActions>
        </Dialog>
      </Box>
    </UnifiedChatLayout>
  );
}

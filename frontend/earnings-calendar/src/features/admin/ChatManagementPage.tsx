import { useState } from 'react';
import {
  Box,
  Button,
  Typography,
  Paper,
  Chip,
  alpha,
  useTheme,
  Fade,
  Stack,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  TextField,
  Alert,
  Snackbar,
  Tabs,
  Tab,
  Switch,
  FormControlLabel,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  Avatar,
  IconButton,
  Tooltip,
  CircularProgress
} from '@mui/material';
import {
  MessageSquare,
  Plus,
  Users,
  Shield,
  Edit,
  Trash2,
  RotateCcw,
  Eye,
  Search,
} from 'lucide-react';
import {
  useGetAdminTopicsQuery,
  useGetAdminDiscussionsQuery,
  useGetAdminOneToOneChatsQuery,
  useGetAdminChatMessagesQuery,
  useCreateAdminTopicMutation,
  useUpdateAdminTopicMutation,
  useSoftDeleteAdminTopicMutation,
  useHardDeleteTopicMutation,
  useRestoreTopicMutation,
  useHardDeleteDiscussionMutation,
  useRestoreDiscussionMutation,
  useHardDeleteMessageMutation,
  useAdminEditMessageMutation,
  useAdminDeleteMessageMutation,
  useDeleteOneToOneChatMutation,
} from '../../services/adminApi';
import { useAuth } from '../../app/useAuth';

interface TabPanelProps {
  children?: React.ReactNode;
  index: number;
  value: number;
}

function CustomTabPanel(props: TabPanelProps) {
  const { children, value, index, ...other } = props;

  return (
    <div
      role="tabpanel"
      hidden={value !== index}
      id={`chat-tabpanel-${index}`}
      aria-labelledby={`chat-tab-${index}`}
      {...other}
    >
      {value === index && (
        <Box sx={{ py: 3 }}>
          {children}
        </Box>
      )}
    </div>
  );
}

export default function ChatManagementPage() {
  const theme = useTheme();
  const { role } = useAuth();
  const [tabValue, setTabValue] = useState(0);
  const [includeDeleted, setIncludeDeleted] = useState(false);
  const [startDate, setStartDate] = useState<string>('');
  const [endDate, setEndDate] = useState<string>('');
  const [searchQuery, setSearchQuery] = useState('');

  // API Hooks with date filtering - automatic updates via tags
  const { data: topics = [], isLoading: topicsLoading } = useGetAdminTopicsQuery({
    includeDeleted,
    startDate: startDate || undefined,
    endDate: endDate || undefined
  });
  const { data: discussions = [], isLoading: discussionsLoading } = useGetAdminDiscussionsQuery({
    includeDeleted,
    startDate: startDate || undefined,
    endDate: endDate || undefined
  });
  const { data: oneToOneChatsData, isLoading: chatsLoading } = useGetAdminOneToOneChatsQuery({
    page: 1,
    limit: 50,
    startDate: startDate || undefined,
    endDate: endDate || undefined,
    search: searchQuery || undefined,
  });

  const [createTopic] = useCreateAdminTopicMutation();
  const [updateTopic] = useUpdateAdminTopicMutation();
  const [softDeleteTopic] = useSoftDeleteAdminTopicMutation();
  const [hardDeleteTopic] = useHardDeleteTopicMutation();
  const [restoreTopic] = useRestoreTopicMutation();
  const [hardDeleteDiscussion] = useHardDeleteDiscussionMutation();
  const [restoreDiscussion] = useRestoreDiscussionMutation();
  const [deleteOneToOneChat] = useDeleteOneToOneChatMutation();

  // State for Dialogs
  const [createDialogOpen, setCreateDialogOpen] = useState(false);
  const [editDialogOpen, setEditDialogOpen] = useState(false);
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false); // Can be soft or hard
  const [restoreDialogOpen, setRestoreDialogOpen] = useState(false);

  const [selectedItem, setSelectedItem] = useState<any>(null); // Topic or Discussion
  const [deleteType, setDeleteType] = useState<'soft' | 'hard'>('soft');
  const [itemType, setItemType] = useState<'topic' | 'discussion' | 'one-to-one'>('topic');

  const [newTopic, setNewTopic] = useState({ title: '', description: '' });
  const [snackbar, setSnackbar] = useState<{ open: boolean; message: string; severity: 'success' | 'error' }>({
    open: false,
    message: '',
    severity: 'success',
  });

  // Message Viewer State
  const [messageViewerOpen, setMessageViewerOpen] = useState(false);
  const [viewingChatId, setViewingChatId] = useState<string | null>(null);

  const canCreateTopic = role === 'admin' || role === 'superadmin';
  const isSuperAdmin = role === 'superadmin';

  const handleTabChange = (_event: React.SyntheticEvent, newValue: number) => {
    setTabValue(newValue);
  };

  // --- Handlers ---

  const handleCreateTopic = async () => {
    try {
      await createTopic(newTopic).unwrap();
      setCreateDialogOpen(false);
      setNewTopic({ title: '', description: '' });
      setSnackbar({ open: true, message: 'Topic created successfully!', severity: 'success' });
    } catch (error: any) {
      setSnackbar({ open: true, message: error?.message || 'Failed to create topic', severity: 'error' });
    }
  };

  const handleEditTopic = async () => {
    if (!selectedItem) return;
    try {
      await updateTopic({ id: selectedItem.id, data: { title: newTopic.title, description: newTopic.description } }).unwrap();
      setEditDialogOpen(false);
      setSelectedItem(null);
      setNewTopic({ title: '', description: '' });
      setSnackbar({ open: true, message: 'Topic updated successfully!', severity: 'success' });
    } catch (error: any) {
      setSnackbar({ open: true, message: error?.message || 'Failed to update topic', severity: 'error' });
    }
  };

  const executeDelete = async () => {
    if (!selectedItem) return;
    try {
      if (itemType === 'topic') {
        if (deleteType === 'soft') {
          await softDeleteTopic(selectedItem.id).unwrap();
        } else {
          await hardDeleteTopic(selectedItem.id).unwrap();
        }
      } else if (itemType === 'discussion') {
        if (deleteType === 'hard') {
          await hardDeleteDiscussion(selectedItem.id).unwrap();
        }
      } else if (itemType === 'one-to-one') {
        await deleteOneToOneChat(selectedItem.id).unwrap();
      }
      setDeleteDialogOpen(false);
      setSelectedItem(null);
      setSnackbar({ open: true, message: `${itemType} deleted successfully!`, severity: 'success' });
    } catch (error: any) {
      setSnackbar({ open: true, message: error?.message || 'Delete failed', severity: 'error' });
    }
  };

  const executeRestore = async () => {
    if (!selectedItem) return;
    try {
      if (itemType === 'topic') {
        await restoreTopic(selectedItem.id).unwrap();
      } else {
        await restoreDiscussion(selectedItem.id).unwrap();
      }
      setRestoreDialogOpen(false);
      setSelectedItem(null);
      setSnackbar({ open: true, message: `${itemType} restored successfully!`, severity: 'success' });
    } catch (error: any) {
      setSnackbar({ open: true, message: error?.message || 'Restore failed', severity: 'error' });
    }
  }

  const openDeleteDialog = (item: any, type: 'topic' | 'discussion', mode: 'soft' | 'hard') => {
    setSelectedItem(item);
    setItemType(type);
    setDeleteType(mode);
    setDeleteDialogOpen(true);
  };

  const openRestoreDialog = (item: any, type: 'topic' | 'discussion') => {
    setSelectedItem(item);
    setItemType(type);
    setRestoreDialogOpen(true);
  };

  // --- Render Helpers ---

  const renderStatusChip = (deleted: boolean, active: boolean = true) => {
    if (deleted) return <Chip label="Deleted" size="small" color="error" variant="outlined" />;
    if (!active) return <Chip label="Inactive" size="small" color="warning" variant="outlined" />;
    return <Chip label="Active" size="small" color="success" variant="outlined" />;
  };

  return (
    <Box sx={{ width: '100%', p: { xs: 2, sm: 3, md: 4 } }}>
      {/* Header */}
      <Fade in={true} timeout={400}>
        <Paper
          elevation={0}
          sx={{
            p: 3,
            mb: 3,
            borderRadius: 2,
            backgroundImage: `linear-gradient(135deg, ${alpha(theme.palette.background.paper, 0.9)} 0%, ${alpha(theme.palette.background.paper, 0.7)} 100%)`,
            border: `1px solid ${alpha(theme.palette.divider, 0.1)}`,
          }}
        >
          <Stack direction={{ xs: 'column', md: 'row' }} justifyContent="space-between" alignItems="center" spacing={2}>
            <Stack direction="row" spacing={2} alignItems="center">
              <Box
                sx={{
                  width: 48,
                  height: 48,
                  borderRadius: 2,
                  bgcolor: alpha(theme.palette.primary.main, 0.1),
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  color: theme.palette.primary.main,
                }}
              >
                <Shield size={24} />
              </Box>
              <Box>
                <Typography variant="h5" fontWeight={700}>Chat Administration</Typography>
                <Typography variant="body2" color="text.secondary">
                  Manage topics, discussions, and specific chat rooms
                </Typography>
              </Box>
            </Stack>

            {/* <FormControlLabel
              control={<Switch checked={includeDeleted} onChange={(e) => setIncludeDeleted(e.target.checked)} />}
              label="Show Deleted Items"
            /> */}
          </Stack>
        </Paper>
      </Fade>

      {/* Tabs */}
      <Box sx={{ borderBottom: 1, borderColor: 'divider' }}>
        <Tabs value={tabValue} onChange={handleTabChange} aria-label="chat admin tabs">
          <Tab label="Topics" icon={<MessageSquare size={16} />} iconPosition="start" />
          <Tab label="Discussions" icon={<Users size={16} />} iconPosition="start" />
          <Tab label="One-to-One Chats" icon={<Shield size={16} />} iconPosition="start" />
        </Tabs>
      </Box>

      {/* Date Filter */}
      <Paper elevation={0} variant="outlined" sx={{ p: 2, my: 2, borderRadius: 2 }}>
        <Stack direction={{ xs: 'column', sm: 'row' }} spacing={2} alignItems="center">
          <Typography variant="subtitle2" sx={{ minWidth: 100 }}>Filter by Date:</Typography>
          <TextField
            type="date"
            label="Start Date"
            size="small"
            value={startDate}
            onChange={(e) => setStartDate(e.target.value)}
            InputLabelProps={{ shrink: true }}
            sx={{ width: 200 }}
          />
          <TextField
            type="date"
            label="End Date"
            size="small"
            value={endDate}
            onChange={(e) => setEndDate(e.target.value)}
            InputLabelProps={{ shrink: true }}
            sx={{ width: 200 }}
          />
          <Button
            variant="outlined"
            onClick={() => { setStartDate(''); setEndDate(''); }}
            size="small"
          >
            Clear
          </Button>
        </Stack>
      </Paper>

      {/* Topics Tab */}
      <CustomTabPanel value={tabValue} index={0}>
        <Stack direction="row" justifyContent="flex-end" mb={2}>
          {canCreateTopic && (
            <Button
              startIcon={<Plus size={18} />}
              variant="contained"
              onClick={() => setCreateDialogOpen(true)}
              sx={{ borderRadius: 2 }}
            >
              Create Topic
            </Button>
          )}
        </Stack>

        <Paper elevation={0} variant="outlined" sx={{ borderRadius: 2, overflow: 'hidden' }}>
          {topicsLoading ? (
            <Box p={4} display="flex" justifyContent="center"><CircularProgress /></Box>
          ) : (
            <TableContainer>
              <Table>
                <TableHead>
                  <TableRow>
                    <TableCell>Title</TableCell>
                    <TableCell>Status</TableCell>
                    <TableCell>Stats</TableCell>
                    <TableCell align="right">Actions</TableCell>
                  </TableRow>
                </TableHead>
                <TableBody>
                  {topics.map((topic) => (
                    <TableRow key={topic.id} sx={{ '&:last-child td, &:last-child th': { border: 0 } }}>
                      <TableCell>
                        <Typography variant="subtitle2" fontWeight={600}>{topic.title}</Typography>
                        <Typography variant="caption" color="text.secondary">{topic.description}</Typography>
                      </TableCell>
                      <TableCell>{renderStatusChip(topic.deleted, topic.isActive)}</TableCell>
                      <TableCell>
                        <Stack direction="row" spacing={1}>
                          <Chip size="small" label={`${topic.chat?._count.members || 0} members`} />
                          <Chip size="small" label={`${topic.chat?._count.messages || 0} msgs`} />
                        </Stack>
                      </TableCell>
                      <TableCell align="right">
                        <Stack direction="row" spacing={1} justifyContent="flex-end">
                          {topic.deleted ? (
                            <>
                              <Tooltip title="Restore">
                                <IconButton color="success" onClick={() => openRestoreDialog(topic, 'topic')}>
                                  <RotateCcw size={18} />
                                </IconButton>
                              </Tooltip>
                              <Tooltip title="Hard Delete (Permanent)">
                                <IconButton color="error" onClick={() => openDeleteDialog(topic, 'topic', 'hard')}>
                                  <Trash2 size={18} />
                                </IconButton>
                              </Tooltip>
                            </>
                          ) : (
                            <>
                              <Tooltip title="Edit">
                                <IconButton onClick={() => {
                                  setSelectedItem(topic);
                                  setNewTopic({ title: topic.title, description: topic.description || '' });
                                  setEditDialogOpen(true);
                                }}>
                                  <Edit size={18} />
                                </IconButton>
                              </Tooltip>
                              <Tooltip title="Soft Delete">
                                <IconButton color="error" onClick={() => openDeleteDialog(topic, 'topic', 'soft')}>
                                  <Trash2 size={18} />
                                </IconButton>
                              </Tooltip>
                            </>
                          )}
                        </Stack>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </TableContainer>
          )}
        </Paper>
      </CustomTabPanel>

      {/* Discussions Tab */}
      <CustomTabPanel value={tabValue} index={1}>
        <Paper elevation={0} variant="outlined" sx={{ borderRadius: 2, overflow: 'hidden' }}>
          {discussionsLoading ? (
            <Box p={4} display="flex" justifyContent="center"><CircularProgress /></Box>
          ) : (
            <TableContainer>
              <Table>
                <TableHead>
                  <TableRow>
                    <TableCell>Title</TableCell>
                    <TableCell>Topic</TableCell>
                    <TableCell>Creator</TableCell>
                    <TableCell>Status</TableCell>
                    <TableCell>Stats</TableCell>
                    <TableCell align="right">Actions</TableCell>
                  </TableRow>
                </TableHead>
                <TableBody>
                  {discussions.map((disc) => (
                    <TableRow key={disc.id}>
                      <TableCell>
                        <Typography variant="subtitle2" fontWeight={600}>{disc.title}</Typography>
                      </TableCell>
                      <TableCell>{disc.topic?.title || 'Unknown'}</TableCell>
                      <TableCell>{disc.creator?.username}</TableCell>
                      <TableCell>{renderStatusChip(disc.deleted)}</TableCell>
                      <TableCell>
                        <Chip size="small" label={`${disc.chat?._count.messages || 0} msgs`} />
                      </TableCell>
                      <TableCell align="right">
                        <Stack direction="row" spacing={1} justifyContent="flex-end">
                          <Button
                            startIcon={<Eye size={16} />}
                            size="small"
                            onClick={() => {
                              setViewingChatId(disc.chat?.id || disc.id);
                              setMessageViewerOpen(true);
                            }}
                          >
                            View Chats
                          </Button>
                          {disc.deleted ? (
                            <>
                              <Tooltip title="Restore">
                                <IconButton color="success" onClick={() => openRestoreDialog(disc, 'discussion')}>
                                  <RotateCcw size={18} />
                                </IconButton>
                              </Tooltip>
                              <Tooltip title="Hard Delete">
                                <IconButton color="error" onClick={() => openDeleteDialog(disc, 'discussion', 'hard')}>
                                  <Trash2 size={18} />
                                </IconButton>
                              </Tooltip>
                            </>
                          ) : (
                            <Tooltip title="Hard Delete">
                              <IconButton color="error" onClick={() => openDeleteDialog(disc, 'discussion', 'hard')}>
                                <Trash2 size={18} />
                              </IconButton>
                            </Tooltip>
                          )}
                        </Stack>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </TableContainer>
          )}
        </Paper>
      </CustomTabPanel>

      {/* One-to-One Chats Tab */}
      <CustomTabPanel value={tabValue} index={2}>
        <Stack direction="row" spacing={2} mb={2}>
          <TextField
            size="small"
            placeholder="Search by username, email, or user ID..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            InputProps={{
              startAdornment: <Search size={18} style={{ marginRight: 8, opacity: 0.5 }} />
            }}
            sx={{ width: 350 }}
          />
        </Stack>

        <Paper elevation={0} variant="outlined" sx={{ borderRadius: 2 }}>
          {chatsLoading ? (
            <Box p={4} display="flex" justifyContent="center"><CircularProgress /></Box>
          ) : (
            <TableContainer>
              <Table>
                <TableHead>
                  <TableRow>
                    <TableCell>Participants</TableCell>
                    <TableCell>Last Active</TableCell>
                    <TableCell>Messages</TableCell>
                    <TableCell align="right">Actions</TableCell>
                  </TableRow>
                </TableHead>
                <TableBody>
                  {oneToOneChatsData?.data?.map((chat: any) => (
                    <TableRow key={chat.id}>
                      <TableCell>
                        <Stack direction="row" spacing={2} alignItems="center">
                          {chat.members.map((m: any) => (
                            <Chip
                              key={m.userId}
                              avatar={<Avatar>{m.user.username[0]}</Avatar>}
                              label={m.user.username}
                              variant="outlined"
                            />
                          ))}
                        </Stack>
                      </TableCell>
                      <TableCell>{new Date(chat.updatedAt).toLocaleDateString()}</TableCell>
                      <TableCell>{chat._count.messages}</TableCell>
                      <TableCell align="right">
                        <Stack direction="row" spacing={1} justifyContent="flex-end">
                          <Button
                            startIcon={<Eye size={16} />}
                            size="small"
                            onClick={() => {
                              setViewingChatId(chat.id);
                              setMessageViewerOpen(true);
                            }}
                          >
                            View Logs
                          </Button>
                          {isSuperAdmin && (
                            <Button
                              size="small"
                              color="error"
                              startIcon={<Trash2 size={16} />}
                              onClick={() => {
                                setItemType('one-to-one');
                                setSelectedItem(chat);
                                setDeleteType('hard');
                                setDeleteDialogOpen(true);
                              }}
                            >
                              Delete
                            </Button>
                          )}
                        </Stack>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </TableContainer>
          )}
        </Paper>
      </CustomTabPanel>

      {/* --- Dialogs --- */}

      {/* Create Topic Dialog */}
      <Dialog open={createDialogOpen} onClose={() => setCreateDialogOpen(false)} maxWidth="sm" fullWidth>
        <DialogTitle>Create New Topic</DialogTitle>
        <DialogContent sx={{ pt: 2 }}>
          <Stack spacing={2} mt={1}>
            <TextField
              label="Title"
              fullWidth
              value={newTopic.title}
              onChange={(e) => setNewTopic({ ...newTopic, title: e.target.value })}
            />
            <TextField
              label="Description"
              fullWidth
              multiline
              rows={3}
              value={newTopic.description}
              onChange={(e) => setNewTopic({ ...newTopic, description: e.target.value })}
            />
          </Stack>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setCreateDialogOpen(false)}>Cancel</Button>
          <Button variant="contained" onClick={handleCreateTopic} disabled={!newTopic.title}>Create</Button>
        </DialogActions>
      </Dialog>

      {/* Edit Dialog */}
      <Dialog open={editDialogOpen} onClose={() => setEditDialogOpen(false)} maxWidth="sm" fullWidth>
        <DialogTitle>Edit Topic</DialogTitle>
        <DialogContent sx={{ pt: 2 }}>
          <Stack spacing={2} mt={1}>
            <TextField
              label="Title"
              fullWidth
              value={newTopic.title}
              onChange={(e) => setNewTopic({ ...newTopic, title: e.target.value })}
            />
            <TextField
              label="Description"
              fullWidth
              multiline
              rows={3}
              value={newTopic.description}
              onChange={(e) => setNewTopic({ ...newTopic, description: e.target.value })}
            />
          </Stack>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setEditDialogOpen(false)}>Cancel</Button>
          <Button variant="contained" onClick={handleEditTopic}>Save Changes</Button>
        </DialogActions>
      </Dialog>

      {/* Delete/Hard Delete Dialog */}
      <Dialog open={deleteDialogOpen} onClose={() => setDeleteDialogOpen(false)}>
        <DialogTitle sx={{ color: theme.palette.error.main }}>
          {deleteType === 'hard' ? 'Permanent Delete?' : 'Soft Delete'}
        </DialogTitle>
        <DialogContent>
          <Typography>
            Are you sure you want to {deleteType === 'hard' ? <strong>permanently delete</strong> : 'delete'} this {itemType}?
          </Typography>
          {deleteType === 'hard' && (
            <Alert severity="error" sx={{ mt: 2 }}>
              This action cannot be undone. All associated data will be lost forever.
            </Alert>
          )}
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setDeleteDialogOpen(false)}>Cancel</Button>
          <Button color="error" variant="contained" onClick={executeDelete}>
            {deleteType === 'hard' ? 'Delete Permanently' : 'Delete'}
          </Button>
        </DialogActions>
      </Dialog>

      {/* Restore Dialog */}
      <Dialog open={restoreDialogOpen} onClose={() => setRestoreDialogOpen(false)}>
        <DialogTitle>Restore Item</DialogTitle>
        <DialogContent>
          Are you sure you want to restore this {itemType}? It will be visible to users again.
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setRestoreDialogOpen(false)}>Cancel</Button>
          <Button color="success" variant="contained" onClick={executeRestore}>Restore</Button>
        </DialogActions>
      </Dialog>

      {/* Message Viewer Modal */}
      <Dialog
        open={messageViewerOpen}
        onClose={() => setMessageViewerOpen(false)}
        maxWidth="md"
        fullWidth
        PaperProps={{ sx: { height: '80vh' } }}
      >
        <DialogTitle>Chat Logs</DialogTitle>
        <DialogContent dividers sx={{ p: 0 }}>
          {viewingChatId && <MessageLogViewer chatId={viewingChatId} />}
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setMessageViewerOpen(false)}>Close</Button>
        </DialogActions>
      </Dialog>

      <Snackbar
        open={snackbar.open}
        autoHideDuration={4000}
        onClose={() => setSnackbar({ ...snackbar, open: false })}
        anchorOrigin={{ vertical: 'bottom', horizontal: 'right' }}
      >
        <Alert severity={snackbar.severity}>{snackbar.message}</Alert>
      </Snackbar>
    </Box>
  );
}

// Enhanced Message Log Viewer with Edit/Delete
function MessageLogViewer({ chatId }: { chatId: string }) {
  const theme = useTheme();
  const { data, isLoading } = useGetAdminChatMessagesQuery({ chatId });
  const { role } = useAuth();
  const [adminEditMessage] = useAdminEditMessageMutation();
  const [adminDeleteMessage] = useAdminDeleteMessageMutation();
  const [editingMessageId, setEditingMessageId] = useState<string | null>(null);
  const [editContent, setEditContent] = useState('');
  const [snackbar, setSnackbar] = useState<{ open: boolean; message: string; severity: 'success' | 'error' }>({
    open: false, message: '', severity: 'success'
  });
  const [messageEditDialogOpen, setMessageEditDialogOpen] = useState(false);
  const [messageDeleteDialogOpen, setMessageDeleteDialogOpen] = useState(false);
  const [selectedMessage, setSelectedMessage] = useState<any>(null);

  const messages = data?.data || [];
  const isSuperAdmin = role === 'superadmin';

  const handleEdit = async () => {
    if (!selectedMessage) return;
    try {
      await adminEditMessage({ messageId: selectedMessage.id, content: editContent }).unwrap();
      setSnackbar({ open: true, message: 'Message edited successfully', severity: 'success' });
      setMessageEditDialogOpen(false);
      setSelectedMessage(null);
      setEditContent('');
    } catch (error: any) {
      setSnackbar({ open: true, message: error?.data?.message || 'Failed to edit message', severity: 'error' });
    }
  };

  const handleDelete = async () => {
    if (!selectedMessage) return;
    try {
      await adminDeleteMessage(selectedMessage.id).unwrap();
      setSnackbar({ open: true, message: 'Message deleted successfully', severity: 'success' });
      setMessageDeleteDialogOpen(false);
      setSelectedMessage(null);
    } catch (error: any) {
      setSnackbar({ open: true, message: error?.data?.message || 'Failed to delete message', severity: 'error' });
    }
  };

  if (isLoading) return <Box p={4} textAlign="center"><CircularProgress /></Box>;

  return (
    <>
      <Box sx={{ p: 2, display: 'flex', flexDirection: 'column', gap: 1 }}>
        {messages.length === 0 ? (
          <Typography color="text.secondary" align="center">No messages found.</Typography>
        ) : (
          messages.map((msg: any) => (
            <Paper key={msg.id} sx={{ p: 1.5, mb: 1, bgcolor: alpha('#000', 0.02) }}>
              <Stack direction="row" justifyContent="space-between" mb={0.5}>
                <Typography variant="subtitle2" color="primary">{msg.user.username}</Typography>
                <Typography variant="caption" color="text.secondary">
                  {new Date(msg.createdAt).toLocaleString()}
                </Typography>
              </Stack>
              <>
                <Typography variant="body2">{msg.content}</Typography>
                {msg.edited && <Chip size="small" label="Edited" sx={{ mt: 0.5 }} />}
                {msg.deleted && <Chip size="small" label="Deleted" color="error" variant="outlined" sx={{ mt: 1 }} />}
                {isSuperAdmin && !msg.deleted && (
                  <Stack direction="row" spacing={1} mt={1}>
                    <Button
                      size="small"
                      startIcon={<Edit size={14} />}
                      onClick={() => {
                        setSelectedMessage(msg);
                        setEditContent(msg.content);
                        setMessageEditDialogOpen(true);
                      }}
                    >
                      Edit
                    </Button>
                    <Button
                      size="small"
                      color="error"
                      startIcon={<Trash2 size={14} />}
                      onClick={() => {
                        setSelectedMessage(msg);
                        setMessageDeleteDialogOpen(true);
                      }}
                    >
                      Delete
                    </Button>
                  </Stack>
                )}
              </>
            </Paper>
          ))
        )}
      </Box>

      {/* Nice Popups for Messages */}
      <Dialog open={messageEditDialogOpen} onClose={() => setMessageEditDialogOpen(false)} maxWidth="sm" fullWidth>
        <DialogTitle>Edit Message Content</DialogTitle>
        <DialogContent sx={{ pt: 2 }}>
          <TextField
            fullWidth
            multiline
            rows={4}
            value={editContent}
            onChange={(e) => setEditContent(e.target.value)}
            sx={{ mt: 1 }}
          />
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setMessageEditDialogOpen(false)}>Cancel</Button>
          <Button variant="contained" onClick={handleEdit}>Save Changes</Button>
        </DialogActions>
      </Dialog>

      <Dialog open={messageDeleteDialogOpen} onClose={() => setMessageDeleteDialogOpen(false)}>
        <DialogTitle sx={{ color: theme.palette.error.main }}>Delete Message?</DialogTitle>
        <DialogContent>
          Are you sure you want to delete this message? This action is permanent.
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setMessageDeleteDialogOpen(false)}>Cancel</Button>
          <Button variant="contained" color="error" onClick={handleDelete}>Delete</Button>
        </DialogActions>
      </Dialog>

      <Snackbar
        open={snackbar.open}
        autoHideDuration={4000}
        onClose={() => setSnackbar({ ...snackbar, open: false })}
      >
        <Alert severity={snackbar.severity}>{snackbar.message}</Alert>
      </Snackbar>
    </>
  );
}

import { useState } from 'react';
import {
  Menu,
  MenuItem,
  ListItemIcon,
  ListItemText,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Button,
  TextField,
  Typography,
  Box,
  useTheme,
  Tooltip,
} from '@mui/material';
import {
  Reply,
  Edit3,
  Trash2,
  Copy,
} from 'lucide-react';
import type { Message } from '../../../services/chatApi';

interface MessageActionsMenuProps {
  anchorEl: HTMLElement | null;
  open: boolean;
  onClose: () => void;
  message: Message;
  isOwnMessage: boolean;
  onReply?: (message: Message) => void;
  onEdit?: (messageId: string, newContent: string) => void;
  onDelete?: (messageId: string) => void;
  onCopy?: (content: string) => void;
}

export default function MessageActionsMenu({
  anchorEl,
  open,
  onClose,
  message,
  isOwnMessage,
  onReply,
  onEdit,
  onDelete,
  onCopy,
}: MessageActionsMenuProps) {
  const theme = useTheme();
  const [editDialogOpen, setEditDialogOpen] = useState(false);
  const [editContent, setEditContent] = useState(message.content);
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);

  const handleReply = () => {
    onReply?.(message);
    onClose();
  };

  const handleEdit = () => {
    setEditDialogOpen(true);
    onClose();
  };

  const handleEditConfirm = () => {
    if (editContent.trim() && editContent !== message.content) {
      onEdit?.(message.id, editContent.trim());
    }
    setEditDialogOpen(false);
  };

  const handleDelete = () => {
    setDeleteDialogOpen(true);
    onClose();
  };

  const handleDeleteConfirm = () => {
    onDelete?.(message.id);
    setDeleteDialogOpen(false);
  };

  const handleCopy = () => {
    navigator.clipboard.writeText(message.content);
    onCopy?.(message.content);
    onClose();
  };

  return (
    <>
      <Menu
        anchorEl={anchorEl}
        open={open}
        onClose={onClose}
        transformOrigin={{ horizontal: 'right', vertical: 'top' }}
        anchorOrigin={{ horizontal: 'right', vertical: 'bottom' }}
        PaperProps={{
          sx: {
            borderRadius: 2,
            minWidth: 200,
            boxShadow: '0 8px 32px rgba(0,0,0,0.12)',
            border: `1px solid ${theme.palette.mode === 'light' ? 'rgba(0,0,0,0.08)' : 'rgba(255,255,255,0.1)'}`,
            backdropFilter: 'blur(10px)',
            bgcolor: theme.palette.mode === 'light' ? 'rgba(255,255,255,0.95)' : 'rgba(30,41,59,0.95)',
          },
        }}
      >
        <MenuItem onClick={handleReply} sx={{ py: 1.5 }}>
          <ListItemIcon>
            <Reply size={18} color={theme.palette.primary.main} />
          </ListItemIcon>
          <ListItemText primary="Reply" />
        </MenuItem>

        <MenuItem onClick={handleCopy} sx={{ py: 1.5 }}>
          <ListItemIcon>
            <Copy size={18} />
          </ListItemIcon>
          <ListItemText primary="Copy text" />
        </MenuItem>

        {isOwnMessage && (
          <Tooltip title={
            (new Date().getTime() - new Date(message.createdAt).getTime() > 15 * 60 * 1000)
              ? "Messages can only be edited within 15 minutes of sending"
              : ""
          } placement="left">
            <span>
              <MenuItem
                onClick={handleEdit}
                disabled={new Date().getTime() - new Date(message.createdAt).getTime() > 15 * 60 * 1000}
                sx={{ py: 1.5 }}
              >
                <ListItemIcon>
                  <Edit3 size={18} color={theme.palette.primary.main} />
                </ListItemIcon>
                <ListItemText primary="Edit message" />
              </MenuItem>
            </span>
          </Tooltip>
        )}

        {isOwnMessage && (
          <Tooltip title={
            (new Date().getTime() - new Date(message.createdAt).getTime() > 60 * 60 * 1000)
              ? "Messages can only be deleted within 1 hour of sending"
              : ""
          } placement="left">
            <span>
              <MenuItem
                onClick={handleDelete}
                disabled={new Date().getTime() - new Date(message.createdAt).getTime() > 60 * 60 * 1000}
                sx={{ py: 1.5, color: theme.palette.error.main }}
              >
                <ListItemIcon>
                  <Trash2 size={18} color={theme.palette.error.main} />
                </ListItemIcon>
                <ListItemText primary="Delete message" />
              </MenuItem>
            </span>
          </Tooltip>
        )}
      </Menu>

      {/* Edit Dialog */}
      <Dialog
        open={editDialogOpen}
        onClose={() => setEditDialogOpen(false)}
        maxWidth="sm"
        fullWidth
        PaperProps={{
          sx: {
            borderRadius: 3,
            boxShadow: '0 24px 48px rgba(0,0,0,0.2)',
          },
        }}
      >
        <DialogTitle sx={{ pb: 1 }}>
          <Typography variant="h6" fontWeight={600}>
            Edit Message
          </Typography>
        </DialogTitle>
        <DialogContent sx={{ pt: 1 }}>
          <TextField
            fullWidth
            multiline
            maxRows={4}
            value={editContent}
            onChange={(e) => setEditContent(e.target.value)}
            placeholder="Edit your message..."
            variant="outlined"
            sx={{
              '& .MuiOutlinedInput-root': {
                borderRadius: 2,
                bgcolor: theme.palette.mode === 'light' ? 'rgba(0,0,0,0.04)' : 'rgba(255,255,255,0.05)',
              },
            }}
          />
        </DialogContent>
        <DialogActions sx={{ px: 3, pb: 2 }}>
          <Button
            onClick={() => setEditDialogOpen(false)}
            variant="outlined"
            sx={{ borderRadius: 2 }}
          >
            Cancel
          </Button>
          <Button
            onClick={handleEditConfirm}
            variant="contained"
            disabled={!editContent.trim() || editContent === message.content}
            sx={{
              borderRadius: 2,
              bgcolor: 'linear-gradient(135deg, #6366f1 0%, #4f46e5 100%)',
              '&:hover': {
                bgcolor: 'linear-gradient(135deg, #4f46e5 0%, #3730a3 100%)',
              },
            }}
          >
            Save Changes
          </Button>
        </DialogActions>
      </Dialog>

      {/* Delete Confirmation Dialog */}
      <Dialog
        open={deleteDialogOpen}
        onClose={() => setDeleteDialogOpen(false)}
        maxWidth="xs"
        fullWidth
        PaperProps={{
          sx: {
            borderRadius: 3,
            boxShadow: '0 24px 48px rgba(0,0,0,0.2)',
          },
        }}
      >
        <DialogTitle sx={{ pb: 1 }}>
          <Typography variant="h6" fontWeight={600}>
            Delete Message
          </Typography>
        </DialogTitle>
        <DialogContent sx={{ pt: 1 }}>
          <Typography variant="body2" color="text.secondary">
            Are you sure you want to delete this message? This action cannot be undone.
          </Typography>
          <Box
            sx={{
              mt: 2,
              p: 2,
              borderRadius: 2,
              bgcolor: theme.palette.mode === 'light' ? 'rgba(0,0,0,0.04)' : 'rgba(255,255,255,0.05)',
              border: `1px solid ${theme.palette.mode === 'light' ? 'rgba(0,0,0,0.08)' : 'rgba(255,255,255,0.1)'}`,
            }}
          >
            <Typography variant="body2" sx={{ fontStyle: 'italic' }}>
              "{message.content.length > 100 ? `${message.content.substring(0, 100)}...` : message.content}"
            </Typography>
          </Box>
        </DialogContent>
        <DialogActions sx={{ px: 3, pb: 2 }}>
          <Button
            onClick={() => setDeleteDialogOpen(false)}
            variant="outlined"
            sx={{ borderRadius: 2 }}
          >
            Cancel
          </Button>
          <Button
            onClick={handleDeleteConfirm}
            variant="contained"
            color="error"
            sx={{
              borderRadius: 2,
              bgcolor: 'linear-gradient(135deg, #ef4444 0%, #dc2626 100%)',
              '&:hover': {
                bgcolor: 'linear-gradient(135deg, #dc2626 0%, #b91c1c 100%)',
              },
            }}
          >
            Delete
          </Button>
        </DialogActions>
      </Dialog>
    </>
  );
}
import { IconButton, Tooltip, useTheme, alpha } from '@mui/material';
import { MessageCircle } from 'lucide-react';
import { useAuth } from '../../../app/useAuth';
import { useNavigate } from 'react-router-dom';

export default function ChatIconButton() {
  const theme = useTheme();
  const { isAuthenticated } = useAuth();
  const nav = useNavigate();

  const handleClick = () => {
    if (!isAuthenticated) {
      nav('/signin');
      return;
    }
    nav('/chat/topics');
  };

  // Only show chat icon if authenticated (or show it but redirect to signin on click)
  return (
    <Tooltip title={isAuthenticated ? 'Open chat' : 'Login to use chat'}>
      <IconButton 
        color="inherit" 
        onClick={handleClick}
        sx={{
          transition: 'all 0.2s',
          '&:hover': {
            '& svg': {
              color: theme.palette.primary.main,
            },
            bgcolor: alpha(theme.palette.primary.main, 0.08),
            transform: 'scale(1.1)',
          },
        }}
      >
        <MessageCircle size={20} />
      </IconButton>
    </Tooltip>
  );
}

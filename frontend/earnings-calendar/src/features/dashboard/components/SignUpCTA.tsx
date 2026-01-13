import { Box, Button, Typography, Paper } from '@mui/material';
import { Link } from 'react-router-dom';

export default function SignUpCTA() {
  return (
    <Paper 
      elevation={2} 
      sx={{ 
        p: 3, 
        mb: 3, 
        background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
        color: 'white',
        textAlign: 'center'
      }}
    >
      <Typography variant="h5" gutterBottom fontWeight="bold">
        Unlock Full Earnings Calendar Access
      </Typography>
      <Typography variant="body1" sx={{ mb: 3, opacity: 0.9 }}>
        Get complete access to our comprehensive earnings calendar with advanced filtering,
        real-time updates, and detailed financial metrics.
      </Typography>
      <Box sx={{ display: 'flex', gap: 2, justifyContent: 'center', flexWrap: 'wrap' }}>
        <Button 
          component={Link} 
          to="/signup" 
          variant="contained" 
          size="large"
          sx={{ 
            bgcolor: 'white', 
            color: '#667eea',
            '&:hover': { bgcolor: '#f5f5f5' }
          }}
        >
          Sign Up Free
        </Button>
        <Button 
          component={Link} 
          to="/signin" 
          variant="outlined" 
          size="large"
          sx={{ 
            borderColor: 'white', 
            color: 'white',
            '&:hover': { 
              borderColor: 'white', 
              bgcolor: 'rgba(255,255,255,0.1)' 
            }
          }}
        >
          Sign In
        </Button>
      </Box>
    </Paper>
  );
} 
import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useDispatch } from 'react-redux';
import {
  Box,
  CircularProgress,
  Typography,
  Alert,
  Paper,
  Button,
} from '@mui/material';
import { setCredentials } from '../../app/authSlice';

export default function OAuthCallback() {
  const navigate = useNavigate();
  const dispatch = useDispatch();
  const [error, setError] = useState<string | null>(null);
  const [isProcessing, setIsProcessing] = useState(true);

  useEffect(() => {
    const handleOAuthCallback = async () => {
      try {
        console.log('OAuth callback started');
        
        // Get the authorization code from URL params
        const urlParams = new URLSearchParams(window.location.search);
        const code = urlParams.get('code');
        const error = urlParams.get('error');
        const state = urlParams.get('state');

        console.log('OAuth params:', { code: !!code, error, state: !!state });

        if (error) {
          console.error('OAuth error received:', error);
          setError(`OAuth error: ${error}`);
          setIsProcessing(false);
          return;
        }

        if (!code) {
          console.error('No authorization code received');
          setError('No authorization code received');
          setIsProcessing(false);
          return;
        }

        console.log('Exchanging code for tokens...');
        
        // Exchange code for tokens
        const response = await fetch('/api/auth/google/callback', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({ code, state }),
          credentials: 'include',
        });

        console.log('OAuth callback response status:', response.status);

        if (!response.ok) {
          const errorData = await response.json().catch(() => ({ message: 'Unknown error' }));
          console.error('OAuth callback failed:', errorData);
          setError(errorData.message || 'Failed to authenticate with Google');
          setIsProcessing(false);
          return;
        }

        const data = await response.json();
        console.log('OAuth callback successful, user data received');
        
        // Store user data in Redux
        dispatch(setCredentials({
          user: data.user,
          token: data.accessToken,
        }));

        console.log('Redirecting to dashboard...');
        
        // Redirect to dashboard
        navigate('/dashboard?oauth=success');
      } catch (err) {
        console.error('OAuth callback error:', err);
        setError('Failed to complete authentication');
        setIsProcessing(false);
      }
    };

    // Add a small delay to prevent race conditions
    const timer = setTimeout(() => {
      handleOAuthCallback();
    }, 100);

    return () => clearTimeout(timer);
  }, [navigate, dispatch]);

  if (error) {
    return (
      <Box
        sx={{
          minHeight: '100vh',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          px: 2,
        }}
      >
        <Paper
          elevation={8}
          sx={{
            width: 400,
            p: 4,
            borderRadius: 2,
            textAlign: 'center',
          }}
        >
          <Alert severity="error" sx={{ mb: 2 }}>
            {error}
          </Alert>
          <Typography variant="body1" sx={{ mb: 2 }}>
            Please try signing in again.
          </Typography>
          <Button 
            variant="contained" 
            onClick={() => navigate('/signin')}
            sx={{ mt: 2 }}
          >
            Back to Sign In
          </Button>
        </Paper>
      </Box>
    );
  }

  return (
    <Box
      sx={{
        minHeight: '100vh',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        flexDirection: 'column',
        gap: 2,
      }}
    >
      <CircularProgress size={60} />
      <Typography variant="h6" color="text.secondary">
        {isProcessing ? 'Completing sign in...' : 'Processing...'}
      </Typography>
    </Box>
  );
} 
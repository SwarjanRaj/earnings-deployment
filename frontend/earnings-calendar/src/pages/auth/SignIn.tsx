// src/pages/auth/SignIn.tsx
import { useState, type FormEvent } from 'react';
import { Link as RouterLink, useNavigate } from 'react-router-dom';
import {
  Box,
  Paper,
  Typography,
  TextField,
  Button,
  Divider,
  Link,
  IconButton,
  InputAdornment,
  Fade,
  Alert,
  Collapse,
} from '@mui/material';
import { Chrome, Eye, EyeOff, Mail, Lock } from 'lucide-react';

import { useLoginMutation, useOauthUrlQuery } from '../../services/authApi';
import HeaderBar from '../../features/dashboard/components/HeaderBar';
import Footer from '../../features/dashboard/components/Footer';

export default function SignIn() {
  /* ---------------------------------------------------------------- */
  /* local state                                                      */
  /* ---------------------------------------------------------------- */
  const [form, setForm] = useState({
    email: '',
    password: '',
    showPw: false,
  });
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  
  const onChange =
    (k: 'email' | 'password') => (e: React.ChangeEvent<HTMLInputElement>) => {
      setForm({ ...form, [k]: e.target.value });
      // Clear error when user starts typing
      if (errorMessage) {
        setErrorMessage(null);
      }
    };
  const toggleShowPw = () => setForm({ ...form, showPw: !form.showPw });

  /* ---------------------------------------------------------------- */
  /* API + nav                                                        */
  /* ---------------------------------------------------------------- */
  const nav = useNavigate();
  const [login, { isLoading }] = useLoginMutation();
  const { data: oauthUrl, error: oauthError, isLoading: oauthLoading } = useOauthUrlQuery();

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    setErrorMessage(null); // Clear previous errors
    
    try {
      const result = await login({ email: form.email, password: form.password }).unwrap();
      if (result) {
        // Use the response data directly instead of relying on Redux state
        const userRole = result.user?.role;
        if (userRole === 'ADMIN' || userRole === 'SUPERADMIN' || userRole === 'SUPER_ADMIN') {
          nav('/admin/earnings'); // Navigate to admin earnings page
        } else {
          nav('/dashboard'); // Navigate to dashboard for regular users
        }
      }
    } catch (error: unknown) {
      console.error('Login failed:', error);
      
      // Extract error message from RTK Query error response
      let message = 'Login failed. Please try again.';
      
      // Type guard for RTK Query error structure
      if (error && typeof error === 'object') {
        const rtkError = error as { 
          data?: { message?: string } | string; 
          status?: number; 
          message?: string;
        };
        
        if (rtkError.data) {
          // Check if error.data has a message property
          if (typeof rtkError.data === 'object' && rtkError.data.message) {
            message = rtkError.data.message;
          } else if (typeof rtkError.data === 'string') {
            message = rtkError.data;
          }
        } else if (rtkError.message) {
          message = rtkError.message;
        } else if (rtkError.status === 401) {
          message = 'Invalid credentials. Please check your email and password.';
        } else if (rtkError.status === 403) {
          message = 'Please verify your email before signing in.';
        } else if (rtkError.status && rtkError.status >= 500) {
          message = 'Server error. Please try again later.';
        }
      }
      
      setErrorMessage(message);
    }
  };

  /* ---------------------------------------------------------------- */
  /* UI                                                               */
  /* ---------------------------------------------------------------- */
  return (
    <Box 
      sx={{ 
        minHeight: '100vh', 
        display: 'flex', 
        flexDirection: 'column',
        position: 'relative',
        '&::before': {
          content: '""',
          position: 'fixed',
          top: 0,
          left: 0,
          right: 0,
          bottom: 0,
          background: (t) => t.palette.mode === 'light'
            ? 'linear-gradient(135deg, #f5f7fa 0%, #e8ecf1 50%, #c3cfe2 100%)'
            : 'linear-gradient(135deg, #0f0f23 0%, #1a1a2e 50%, #0f0f23 100%)',
          zIndex: -1,
        },
      }}
    >
      <Box
        sx={{
          width: '100%',
          maxWidth: { xs: '100%', sm: '100%', md: '1400px', lg: '1600px' },
          mx: 'auto',
          px: { xs: 2, sm: 3, md: 4, lg: 6 }, 
          py: { xs: 3, sm: 4, md: 5, lg: 6 },
          position: 'relative',
          zIndex: 1,
          flex: 1,
          display: 'flex',
          flexDirection: 'column',
        }}
      >
        <Fade in={true} timeout={600}>
        <Box>
            <HeaderBar />
        </Box>
        </Fade>

      {/* center card */}
      <Box
        sx={{
          flexGrow: 1,
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          px: 2,
            my: 4,
        }}
      >
          <Fade in={true} timeout={800}>
        <Paper
              elevation={0}
          sx={{
                width: { xs: '100%', sm: 400 },
                maxWidth: 400,
            p: 4,
                borderRadius: 2,
                boxShadow: (t) => t.customShadows.card,
                bgcolor: 'background.paper',
          }}
        >
          <Typography variant="h4" fontWeight={700} textAlign="center" mb={3}>
            Welcome back!
          </Typography>

          {/* Google OAuth */}
          <Button
            fullWidth
            variant="outlined"
            startIcon={<Chrome size={20} />}
            sx={{ textTransform: 'none', mb: 2, borderRadius: 2 }}
            onClick={() => {
              if (oauthUrl) {
                window.location.href = oauthUrl;
              }
            }}
            disabled={!oauthUrl || oauthLoading}
          >
            {oauthLoading ? 'Loading...' : oauthError ? 'OAuth Unavailable' : 'Continue with Google'}
          </Button>

          <Divider sx={{ my: 2 }}>or</Divider>

          {/* Error Alert */}
          <Collapse in={!!errorMessage}>
            <Alert 
              severity="error" 
              sx={{ mb: 2, borderRadius: 2 }}
              onClose={() => setErrorMessage(null)}
            >
              {errorMessage}
            </Alert>
          </Collapse>

          {/* form */}
          <Box component="form" noValidate onSubmit={handleSubmit}>
            <TextField
              fullWidth
              required
              margin="normal"
              label="Work Email"
              type="email"
              value={form.email}
              onChange={onChange('email')}
              InputProps={{
                startAdornment: (
                  <InputAdornment position="start">
                    <Mail size={18} />
                  </InputAdornment>
                ),
              }}
            />

            <TextField
              fullWidth
              required
              margin="normal"
              label="Password"
              type={form.showPw ? 'text' : 'password'}
              value={form.password}
              onChange={onChange('password')}
              InputProps={{
                startAdornment: (
                  <InputAdornment position="start">
                    <Lock size={18} />
                  </InputAdornment>
                ),
                endAdornment: (
                  <InputAdornment position="end">
                    <IconButton size="small" onClick={toggleShowPw}>
                      {form.showPw ? <EyeOff size={18} /> : <Eye size={18} />}
                    </IconButton>
                  </InputAdornment>
                ),
              }}
            />

            <Box sx={{ mt: 1, textAlign: 'right' }}>
              <Link component={RouterLink} to="/forgot">
                Forgot Password?
              </Link>
            </Box>

            <Button
              type="submit"
              fullWidth
              variant="contained"
              sx={{ mt: 3, py: 1.2, borderRadius: 1 }}
              disabled={isLoading}
            >
              Sign In
            </Button>
          </Box>
        </Paper>
          </Fade>
        </Box>

        <Fade in={true} timeout={1000}>
          <Box sx={{ mt: 'auto', pt: { xs: 4, md: 6 } }}>
            <Footer />
          </Box>
        </Fade>
      </Box>
    </Box>
  );
}

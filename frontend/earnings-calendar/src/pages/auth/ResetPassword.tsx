import {
  Box,
  Paper,
  Button,
  Stack,
  TextField,
  Typography,
  Fade,
  Alert,
  Snackbar,
} from '@mui/material';
import { useForm } from 'react-hook-form';
import { useNavigate, useLocation, Navigate } from 'react-router-dom';
import { useState, useEffect } from 'react';
import { useResetPasswordMutation } from '../../services/authApi';
import HeaderBar from '../../features/dashboard/components/HeaderBar';
import Footer from '../../features/dashboard/components/Footer';

export default function ResetPassword() {
  const [reset, { isLoading }] = useResetPasswordMutation();
  const nav = useNavigate();
  const { state } = useLocation() as { state: { email: string } };
  const [errorMessage, setErrorMessage] = useState<string>('');
  const [snackbarOpen, setSnackbarOpen] = useState(false);
  const { register, handleSubmit, watch, formState: { errors } } = useForm<{ 
    code: string; 
    newPassword: string; 
    confirmPassword: string; 
  }>();

  const newPassword = watch('newPassword');

  // Redirect if email is not in state (user accessed page directly)
  useEffect(() => {
    if (!state?.email) {
      nav('/forgot');
    }
  }, [state, nav]);

  const onSubmit = async (d: any) => {
    if (!state?.email) {
      setErrorMessage('Email is missing. Please start from the forgot password page.');
      setSnackbarOpen(true);
      return;
    }

    try {
      await reset({ ...d, email: state.email }).unwrap();
      nav('/');
    } catch (error: any) {
      const message = error?.data?.message || error?.message || 'Failed to reset password. Please try again.';
      setErrorMessage(message);
      setSnackbarOpen(true);
    }
  };

  // Show loading or redirect if no email
  if (!state?.email) {
    return <Navigate to="/forgot" replace />;
  }

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
                maxWidth: 420,
                width: '100%',
                p: 4,
                borderRadius: 2,
                boxShadow: (t) => t.customShadows.card,
                bgcolor: 'background.paper',
              }}
            >
        <Typography variant="h5" mb={3}>
          Reset Password
        </Typography>

        <Stack component="form" spacing={2} onSubmit={handleSubmit(onSubmit)}>
          <TextField 
            label="Reset code" 
            {...register('code', { 
              required: 'Reset code is required',
              pattern: {
                value: /^\d{6}$/,
                message: 'Reset code must be 6 digits'
              }
            })} 
            error={!!errors.code}
            helperText={errors.code?.message}
            fullWidth 
          />
          <TextField
            label="New password"
            {...register('newPassword', {
              required: 'New password is required',
              minLength: {
                value: 8,
                message: 'Password must be at least 8 characters'
              },
              pattern: {
                value: /^(?=.*[A-Z])(?=.*[a-z])(?=.*\d)(?=.*[@$!%*?&])/,
                message: 'Password must include uppercase, lowercase, digit, and special character'
              }
            })}
            type="password"
            error={!!errors.newPassword}
            helperText={errors.newPassword?.message}
            fullWidth
          />
          <TextField
            label="Confirm new password"
            {...register('confirmPassword', {
              required: 'Please confirm your password',
              validate: (value) => value === newPassword || 'Passwords do not match'
            })}
            type="password"
            error={!!errors.confirmPassword}
            helperText={errors.confirmPassword?.message}
            fullWidth
          />
          <Button type="submit" variant="contained" color="primary" disabled={isLoading} sx={{ borderRadius: 1 }}>
            Reset &amp; Sign In
          </Button>
        </Stack>
            </Paper>
          </Fade>
        </Box>

        <Fade in={true} timeout={1000}>
          <Box sx={{ mt: 'auto', pt: { xs: 4, md: 6 } }}>
            <Footer />
          </Box>
        </Fade>
      </Box>

      {/* Error Snackbar */}
      <Snackbar
        open={snackbarOpen}
        autoHideDuration={6000}
        onClose={() => setSnackbarOpen(false)}
        anchorOrigin={{ vertical: 'bottom', horizontal: 'center' }}
      >
        <Alert 
          onClose={() => setSnackbarOpen(false)} 
          severity="error" 
          sx={{ width: '100%', borderRadius: 2 }}
        >
          {errorMessage}
        </Alert>
      </Snackbar>
    </Box>
  );
}

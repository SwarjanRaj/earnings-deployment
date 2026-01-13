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
import { useNavigate } from 'react-router-dom';
import { useState } from 'react';
import { useForgotMutation } from '../../services/authApi';
import HeaderBar from '../../features/dashboard/components/HeaderBar';
import Footer from '../../features/dashboard/components/Footer';

export default function ForgotPassword() {
  const [forgot, { isLoading }] = useForgotMutation();
  const nav = useNavigate();
  const [errorMessage, setErrorMessage] = useState<string>('');
  const [snackbarOpen, setSnackbarOpen] = useState(false);
  const { register, handleSubmit, formState: { errors } } = useForm<{ email: string }>();

  const onSubmit = async ({ email }: { email: string }) => {
    try {
      await forgot({ email }).unwrap();
      nav('/reset', { state: { email } });
    } catch (error: any) {
      const message = error?.data?.message || error?.message || 'Failed to send reset code. Please try again.';
      setErrorMessage(message);
      setSnackbarOpen(true);
    }
  };

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
          Forgot Password
        </Typography>

        <Stack component="form" spacing={2} onSubmit={handleSubmit(onSubmit)}>
          <TextField 
            label="Email" 
            type="email"
            {...register('email', {
              required: 'Email is required',
              pattern: {
                value: /^[A-Z0-9._%+-]+@[A-Z0-9.-]+\.[A-Z]{2,}$/i,
                message: 'Invalid email address'
              }
            })} 
            error={!!errors.email}
            helperText={errors.email?.message}
            fullWidth 
          />
          <Button type="submit" variant="contained" color="tertiary" disabled={isLoading} sx={{ borderRadius: 1 }}>
            Send reset code
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

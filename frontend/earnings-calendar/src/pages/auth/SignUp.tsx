// src/pages/auth/SignUp.tsx
import { useState } from 'react';
import { useNavigate } from 'react-router-dom'
import { useForm } from 'react-hook-form';
import { yupResolver } from '@hookform/resolvers/yup';
import * as yup from 'yup';
import {
  Box,
  Button,
  Card,
  Divider,
  IconButton,
  InputAdornment,
  Stack,
  TextField,
  Typography,
  Fade,
  Alert,
  Collapse,
} from '@mui/material';
import { Chrome, User, Mail, Lock, Calendar, Eye, EyeOff } from 'lucide-react';
import { useSignupMutation, useOauthUrlQuery } from '../../services/authApi';
import HeaderBar from '../../features/dashboard/components/HeaderBar';
import Footer from '../../features/dashboard/components/Footer';

// Validation schema
const signupSchema = yup.object().shape({
  username: yup
    .string()
    .required('Username is required')
    .min(3, 'Username must be at least 3 characters')
    .max(50, 'Username must be less than 50 characters')
    .matches(/^[a-zA-Z0-9_]+$/, 'Username can only contain letters, numbers, and underscores'),
  email: yup
    .string()
    .required('Email is required')
    .email('Please enter a valid email address'),
  password: yup
    .string()
    .required('Password is required')
    .min(8, 'Password must be at least 8 characters')
    .matches(/^(?=.*[A-Z])/, 'Password must contain at least one uppercase letter')
    .matches(/^(?=.*[a-z])/, 'Password must contain at least one lowercase letter')
    .matches(/^(?=.*\d)/, 'Password must contain at least one number')
    .matches(/^(?=.*[@$!%*?&])/, 'Password must contain at least one special character'),
  confirmPassword: yup
    .string()
    .required('Please confirm your password')
    .oneOf([yup.ref('password')], 'Passwords do not match'),
  dob: yup
    .string()
    .required('Date of birth is required')
    .matches(/^(0[1-9]|1[0-2])\/(0[1-9]|[12]\d|3[01])\/\d{4}$/, 'Date must be in MM/DD/YYYY format')
    .test('valid-date', 'Please enter a valid date', (value) => {
      if (!value) return false;
      const [month, day, year] = value.split('/').map(Number);
      const date = new Date(year, month - 1, day);
      return date.getFullYear() === year &&
             date.getMonth() === month - 1 &&
             date.getDate() === day;
    })
    .test('age-check', 'You must be at least 13 years old', (value) => {
      if (!value) return false;
      const [month, day, year] = value.split('/').map(Number);
      const birthDate = new Date(year, month - 1, day);
      const today = new Date();
      const age = today.getFullYear() - birthDate.getFullYear();
      const monthDiff = today.getMonth() - birthDate.getMonth();
      if (monthDiff < 0 || (monthDiff === 0 && today.getDate() < birthDate.getDate())) {
        return age - 1 >= 13;
      }
      return age >= 13;
    }),
});

type SignupFormData = {
  username: string;
  email: string;
  password: string;
  confirmPassword: string;
  dob: string;
};

export default function SignUp() {
  const nav = useNavigate();
  const [showPwd, setShowPwd] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  const [signup, { isLoading }] = useSignupMutation();
  const { data: oauthUrl, error: oauthError, isLoading: oauthLoading } = useOauthUrlQuery();

  const {
    register,
    handleSubmit,
    formState: { errors },
    setError,
    clearErrors,
  } = useForm<SignupFormData>({
    resolver: yupResolver(signupSchema),
  });

  const onSubmit = async (data: SignupFormData) => {
    try {
      setErrorMessage(null); // Clear previous errors
      clearErrors(); // Clear form errors

      const result = await signup(data).unwrap();

      // Handle successful signup
      if (result && 'devCode' in result) {
        // Development mode - show verification code
        nav('/verify', {
          state: { email: data.email, prefill: (result as any).devCode },
        });
      } else {
        // Production mode - redirect to verification page
        nav('/verify', { state: { email: data.email } });
      }
    } catch (error: any) {
      console.error('Signup failed:', error);

      // Handle API errors
      let message = 'Signup failed. Please try again.';

      if (error?.data) {
        // Handle different error response formats
        if (typeof error.data === 'object' && error.data.message) {
          message = error.data.message;
        } else if (typeof error.data === 'string') {
          message = error.data;
        } else if (error.status) {
          // Handle HTTP status-based errors
          switch (error.status) {
            case 400:
              message = 'Please check your input and try again.';
              break;
            case 409:
              message = 'An account with this email already exists.';
              break;
            case 422:
              message = 'Please check your input data.';
              break;
            case 429:
              message = 'Too many signup attempts. Please try again later.';
              break;
            case 500:
              message = 'Server error. Please try again later.';
              break;
            default:
              message = `Signup failed (${error.status}). Please try again.`;
          }
        }
      } else if (error?.message) {
        message = error.message;
      }

      // Set specific field errors if available
      if (error?.data?.errors) {
        Object.entries(error.data.errors).forEach(([field, fieldError]) => {
          if (typeof fieldError === 'string') {
            setError(field as keyof SignupFormData, {
              type: 'manual',
              message: fieldError,
            });
          }
        });
      } else {
        // Set general error message
        setErrorMessage(message);
      }
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

      {/* auth card */}
        <Stack flex={1} alignItems="center" justifyContent="center" sx={{ px: 2, my: 4 }}>
          <Fade in={true} timeout={800}>
        <Card
          sx={{
                width: { xs: '100%', sm: 440 },
                maxWidth: 440,
            px: 4,
            py: 6,
                borderRadius: 2,
                boxShadow: (t) => t.customShadows.card,
                bgcolor: 'background.paper',
          }}
        >
          <Typography variant="h4" fontWeight={700} textAlign="center" mb={4}>
            Seconds to sign up!
          </Typography>

          <Button
            fullWidth
            startIcon={<Chrome size={20} />}
            variant="outlined"
            sx={{ textTransform: 'none', borderRadius: 2 }}
            onClick={() => {
              if (oauthUrl) {
                window.location.href = oauthUrl;
              }
            }}
            disabled={!oauthUrl || oauthLoading}
          >
            {oauthLoading ? 'Loading...' : oauthError ? 'OAuth Unavailable' : 'Continue with Google'}
          </Button>

          <Divider sx={{ my: 3 }}>OR</Divider>

          {/* API Error Alert */}
          <Collapse in={!!errorMessage}>
            <Alert
              severity="error"
              sx={{ mb: 2, borderRadius: 2 }}
              onClose={() => setErrorMessage(null)}
            >
              {errorMessage}
            </Alert>
          </Collapse>

          <Box component="form" onSubmit={handleSubmit(onSubmit)}>
            <Stack spacing={2}>
              <TextField
                label="Username"
                required
                {...register('username')}
                error={!!errors.username}
                helperText={errors.username?.message}
                InputProps={{
                  startAdornment: (
                    <InputAdornment position="start">
                      <User size={18} />
                    </InputAdornment>
                  ),
                }}
              />

              <TextField
                label="Work Email"
                type="email"
                required
                {...register('email')}
                error={!!errors.email}
                helperText={errors.email?.message}
                InputProps={{
                  startAdornment: (
                    <InputAdornment position="start">
                      <Mail size={18} />
                    </InputAdornment>
                  ),
                }}
              />

              <TextField
                label="Password"
                type={showPwd ? 'text' : 'password'}
                required
                {...register('password')}
                error={!!errors.password}
                helperText={errors.password?.message}
                InputProps={{
                  startAdornment: (
                    <InputAdornment position="start">
                      <Lock size={18} />
                    </InputAdornment>
                  ),
                  endAdornment: (
                    <InputAdornment position="end">
                      <IconButton size="small" onClick={() => setShowPwd(!showPwd)}>
                        {showPwd ? <EyeOff size={18} /> : <Eye size={18} />}
                      </IconButton>
                    </InputAdornment>
                  ),
                }}
              />

              <TextField
                label="Confirm Password"
                type={showPwd ? 'text' : 'password'}
                required
                {...register('confirmPassword')}
                error={!!errors.confirmPassword}
                helperText={errors.confirmPassword?.message}
                InputProps={{
                  startAdornment: (
                    <InputAdornment position="start">
                      <Lock size={18} />
                    </InputAdornment>
                  ),
                }}
              />

              <TextField
                label="Date of Birth (MM/DD/YYYY)"
                placeholder="01/31/1990"
                required
                {...register('dob')}
                error={!!errors.dob}
                helperText={errors.dob?.message}
                InputProps={{
                  startAdornment: (
                    <InputAdornment position="start">
                      <Calendar size={18} />
                    </InputAdornment>
                  ),
                }}
              />

              <Button
                type="submit"
                variant="contained"
                size="large"
                fullWidth
                disabled={isLoading}
                sx={{ mt: 1 }}
              >
                {isLoading ? 'Creating account...' : 'Create account'}
              </Button>
            </Stack>
          </Box>
        </Card>
          </Fade>
      </Stack>

        <Fade in={true} timeout={1000}>
          <Box sx={{ mt: 'auto', pt: { xs: 4, md: 6 } }}>
            <Footer />
          </Box>
        </Fade>
      </Box>
    </Box>
  );
}

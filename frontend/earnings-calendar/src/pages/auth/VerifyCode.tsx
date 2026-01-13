import {
  Box,
  Paper,
  Button,
  Stack,
  TextField,
  Typography,
  Fade,
} from '@mui/material';
import { useLocation, useNavigate } from 'react-router-dom';
import { useForm } from 'react-hook-form';
import { useVerifyCodeMutation } from '../../services/authApi';
import HeaderBar from '../../features/dashboard/components/HeaderBar';
import Footer from '../../features/dashboard/components/Footer';

export default function VerifyCode() {
  const [verify, { isLoading }] = useVerifyCodeMutation();
  const nav = useNavigate();
  const { state } = useLocation() as { state: { email: string } };
  const { register, handleSubmit } = useForm<{ code: string }>();

  const onSubmit = async ({ code }: { code: string }) => {
    await verify({ email: state.email, code }).unwrap();
    nav('/');
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
          Enter Verification Code
        </Typography>

        <Stack component="form" spacing={2} onSubmit={handleSubmit(onSubmit)}>
          <TextField label="6-digit code" {...register('code')} fullWidth />
          <Button type="submit" variant="contained" color="tertiary" disabled={isLoading} sx={{ borderRadius: 1 }}>
            Verify
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
    </Box>
  );
}

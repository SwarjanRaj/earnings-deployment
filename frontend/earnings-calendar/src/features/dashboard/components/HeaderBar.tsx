import {
  Box,
  styled,
  InputBase,
  IconButton,
  Stack,
  Button,
  useTheme,
  alpha,
} from '@mui/material';
import { useContext } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import Logo from  "../../../assets/images/logo.png"
import { Search, Moon, Sun, LogIn, UserPlus } from 'lucide-react';

import { ColorModeContext } from '../../../theme';
import { useAuth } from '../../../app/useAuth';
import { useAuthLoading } from './AuthBootStrap';

import ChatIconButton from './ChatIconButton';
import AccountMenu    from './AccountMenu';

/* ── Search-bar background ─────────────────────────────────────────────── */
const SearchWrapper = styled('div')(({ theme }) => ({
  position: 'relative',
  flexGrow: 1,
  borderRadius: 2,
  background: theme.palette.mode === 'light'
    ? alpha(theme.palette.neutral.main, 0.6)
    : alpha(theme.palette.neutral.main, 0.3),
  transition: 'all 0.3s cubic-bezier(0.4, 0, 0.2, 1)',
  '&:hover': {
    background: theme.palette.mode === 'light'
      ? alpha(theme.palette.neutral.main, 0.8)
      : alpha(theme.palette.neutral.main, 0.5),
    transform: 'translateY(-1px)',
    boxShadow: `0 4px 12px ${alpha(theme.palette.primary.main, 0.15)}`,
  },
  '&:focus-within': {
    background: theme.palette.mode === 'light'
      ? '#FFFFFF'
      : alpha(theme.palette.background.paper, 0.8),
    boxShadow: `0 0 0 3px ${alpha(theme.palette.primary.main, 0.2)}`,
    transform: 'translateY(-1px)',
  },
}));

export default function HeaderBar() {
  const theme = useTheme();
  const { toggleColorMode } = useContext(ColorModeContext);
  const { isAuthenticated } = useAuth();
  const isAuthLoading = useAuthLoading();
  const nav = useNavigate();
  const isLight = theme.palette.mode === 'light';

  return (
    <Box
      sx={{
        width: '100%',
        bgcolor: 'background.paper',
        boxShadow: (t) => t.customShadows.card,
        px: { xs: 3, sm: 4 },
        py: { xs: 4, sm: 5 },
        borderRadius: 2,
        display: 'flex',
        flexDirection: { xs: 'column', sm: 'row' },
        alignItems: 'center',
        justifyContent: 'space-between',
        gap: 3,
        backdropFilter: 'blur(10px)',
        border: (t) => `1px solid ${alpha(t.palette.divider, 0.1)}`,
        transition: 'all 0.3s cubic-bezier(0.4, 0, 0.2, 1)',
        '&:hover': {
          boxShadow: (t) => t.customShadows.cardHover,
          transform: 'translateY(-2px)',
        },
      }}
    >
      {/* Brand ----------------------------------------------------------- */}
      <Stack direction="row" spacing={1.5} alignItems="center">
        <Link to="/" style={{ textDecoration: 'none', display: 'flex', alignItems: 'center' }}>
          <img src={Logo} alt="Logo" width={180}  />
        </Link>
      </Stack>

      {/* Search ---------------------------------------------------------- */}
      <SearchWrapper sx={{ maxWidth: { xs: '100%', sm: 480 } }}>
        <IconButton
          disableRipple
          sx={{
            position: 'absolute',
            top: '50%',
            left: 12,
            transform: 'translateY(-50%)',
            p: 1,
            color: 'text.secondary',
            transition: 'all 0.2s ease',
            '&:hover': {
              color: 'primary.main',
              transform: 'translateY(-50%) scale(1.1)',
            },
          }}
        >
          <Search size={18} />
        </IconButton>
        <InputBase
          placeholder="Search companies, tickers..."
          sx={{
            width: '100%',
            pl: 8,
            pr: 2,
            height: 48,
            fontSize: 15,
            color: 'text.primary',
            '&::placeholder': {
              opacity: 0.6,
            },
          }}
        />
      </SearchWrapper>

      {/* Tools row ------------------------------------------------------- */}
      <Stack
        direction="row"
        spacing={2}
        sx={{
          mt: { xs: 2, sm: 0 },
          justifyContent: { xs: 'center', sm: 'flex-end' },
          alignItems: 'center',                 /* ⬅ centers buttons & icons */
        }}
      >
        {/* Chat (premium) */}
        <ChatIconButton />

        {/* Dark / light toggle */}
        <IconButton 
          onClick={toggleColorMode} 
          sx={{ 
            color: 'text.secondary',
            transition: 'all 0.3s cubic-bezier(0.4, 0, 0.2, 1)',
            '&:hover': {
              color: 'primary.main',
              backgroundColor: (t) => alpha(t.palette.primary.main, 0.1),
              transform: 'rotate(180deg)',
            },
          }}
        >
          {isLight ? <Moon size={20} /> : <Sun size={20} />}
        </IconButton>

        {/* Account menu OR auth buttons - hide during auth loading */}
        {!isAuthLoading && (
          isAuthenticated ? (
            <AccountMenu />
          ) : (
            <>
              {/* Sign-In — premium modern button */}
              <Button
                variant="outlined"
                startIcon={<LogIn size={18} />}
                sx={{
                  height: 42,
                  px: 4,
                  textTransform: 'none',
                  fontWeight: 700,
                  fontSize: 14,
                  letterSpacing: '0.3px',
                  borderRadius: 2,
                  borderWidth: 2,
                  borderColor: (t) => alpha(t.palette.primary.main, 0.3),
                  color: 'primary.main',
                  position: 'relative',
                  overflow: 'hidden',
                  transition: 'all 0.4s cubic-bezier(0.4, 0, 0.2, 1)',
                  gap: 1,
                  '&::before': {
                    content: '""',
                    position: 'absolute',
                    top: 0,
                    left: '-100%',
                    width: '100%',
                    height: '100%',
                    background: (t) => `linear-gradient(90deg, transparent, ${alpha(t.palette.primary.main, 0.15)}, transparent)`,
                    transition: 'left 0.6s ease',
                  },
                  '&:hover': {
                    borderColor: 'primary.main',
                    backgroundColor: alpha(theme.palette.primary.main, 0.1),
                    transform: 'translateY(-3px)',
                    boxShadow: `0 10px 20px ${alpha(theme.palette.primary.main, 0.25)}, 0 0 0 1px ${alpha(theme.palette.primary.main, 0.1)}`,
                    '&::before': {
                      left: '100%',
                    },
                  },
                  '&:active': {
                    transform: 'translateY(-1px)',
                    transition: 'transform 0.1s',
                  },
                }}
                onClick={() => nav('/signin')}
              >
                Sign In
              </Button>

              {/* Sign-Up — premium gradient button */}
              <Button
                variant="contained"
                startIcon={<UserPlus size={18} />}
                sx={{
                  height: 42,
                  px: 4,
                  textTransform: 'none',
                  fontWeight: 700,
                  fontSize: 14,
                  letterSpacing: '0.3px',
                  borderRadius: 2,
                  background: (t) => `linear-gradient(135deg, ${t.palette.primary.main} 0%, ${t.palette.primary.dark} 100%)`,
                  boxShadow: `0 6px 20px ${alpha(theme.palette.primary.main, 0.4)}, inset 0 1px 0 ${alpha('#fff', 0.1)}`,
                  position: 'relative',
                  overflow: 'hidden',
                  transition: 'all 0.4s cubic-bezier(0.4, 0, 0.2, 1)',
                  gap: 1,
                  '&::before': {
                    content: '""',
                    position: 'absolute',
                    top: 0,
                    left: '-100%',
                    width: '100%',
                    height: '100%',
                    background: 'linear-gradient(90deg, transparent, rgba(255,255,255,0.25), transparent)',
                    transition: 'left 0.6s ease',
                  },
                  '&::after': {
                    content: '""',
                    position: 'absolute',
                    top: 0,
                    left: 0,
                    right: 0,
                    bottom: 0,
                    background: 'linear-gradient(135deg, rgba(255,255,255,0.1) 0%, transparent 50%)',
                    opacity: 0,
                    transition: 'opacity 0.4s ease',
                  },
                  '&:hover': {
                    background: (t) => `linear-gradient(135deg, ${t.palette.primary.light} 0%, ${t.palette.primary.main} 100%)`,
                    transform: 'translateY(-3px) scale(1.02)',
                    boxShadow: `0 12px 28px ${alpha(theme.palette.primary.main, 0.5)}, inset 0 1px 0 ${alpha('#fff', 0.15)}`,
                    '&::before': {
                      left: '100%',
                    },
                    '&::after': {
                      opacity: 1,
                    },
                  },
                  '&:active': {
                    transform: 'translateY(-1px) scale(1)',
                    transition: 'transform 0.1s',
                  },
                }}
                onClick={() => nav('/signup')}
              >
                Sign Up
              </Button>
            </>
          )
        )}
      </Stack>
    </Box>
  );
}

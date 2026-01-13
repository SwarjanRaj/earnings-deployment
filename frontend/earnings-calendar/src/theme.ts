/* ------------------------------------------------------------------ */
/* 1.  Type augmentations – must come before createTheme is imported  */
/* ------------------------------------------------------------------ */
import '@mui/material/styles';
import '@mui/material/Button';          // so we can extend Button’s color map

declare module '@mui/material/styles' {
  /* extra palette slots */
  interface Palette {
    neutral:   Palette['primary'];      // grey for search bar
    tertiary:  Palette['primary'];      // silver button
  }
  interface PaletteOptions {
    neutral?:  PaletteOptions['primary'];
    tertiary?: PaletteOptions['primary'];
  }

  /* custom shadow token */
  interface Theme {
    customShadows: { card: string; cardHover: string };
  }
  interface ThemeOptions {
    customShadows?: { card?: string; cardHover?: string };
  }
}

declare module '@mui/material/Button' {
  /* allow <Button color="tertiary" /> */
  interface ButtonPropsColorOverrides {
    tertiary: true;
  }
}

/* ------------------------------------------------------------------ */
/* 2.  Theme factory                                                  */
/* ------------------------------------------------------------------ */
import { createTheme, type PaletteMode } from '@mui/material';
import { createContext } from 'react';

export const ColorModeContext = createContext({ toggleColorMode: () => {} });

export const getDesignTokens = (mode: PaletteMode) => ({
  palette: {
    mode,

    /* page & card colours */
    background: {
      default: mode === 'light' ? '#f5f7fa' : '#0f0f23', // solid color (gradient applied via CSS)
      paper: mode === 'light' ? '#FFFFFF' : '#1a1a2e', // cards / header
    },

    /* greys */
    neutral: { main: mode === 'light' ? '#E8ECF1' : '#2D3748' },

    /* brand + utility colours */
    primary: { 
      main: mode === 'light' ? '#6366f1' : '#818cf8', // modern indigo
      light: mode === 'light' ? '#818cf8' : '#a5b4fc',
      dark: mode === 'light' ? '#4f46e5' : '#6366f1',
    },
    secondary: { 
      main: mode === 'light' ? '#1e293b' : '#f1f5f9', 
      contrastText: mode === 'light' ? '#FFFFFF' : '#1e293b',
    },
    tertiary: { 
      main: mode === 'light' ? '#94a3b8' : '#64748b', 
      contrastText: mode === 'light' ? '#1e293b' : '#f1f5f9',
    },

    success: { main: '#10b981', light: '#34d399', dark: '#059669' },
    error: { main: '#ef4444', light: '#f87171', dark: '#dc2626' },
    warning: { main: '#f59e0b', light: '#fbbf24', dark: '#d97706' },
    info: { main: '#3b82f6', light: '#60a5fa', dark: '#2563eb' },

    text: {
      primary: mode === 'light' ? '#0f172a' : '#f1f5f9',
      secondary: mode === 'light' ? '#64748b' : '#94a3b8',
    },
  },

  /* modern shadows with depth */
  customShadows: {
    card: mode === 'light'
      ? '0 4px 6px -1px rgba(0, 0, 0, 0.1), 0 2px 4px -1px rgba(0, 0, 0, 0.06)'
      : '0 4px 6px -1px rgba(0, 0, 0, 0.3), 0 2px 4px -1px rgba(0, 0, 0, 0.2)',
    cardHover: mode === 'light'
      ? '0 10px 15px -3px rgba(0, 0, 0, 0.1), 0 4px 6px -2px rgba(0, 0, 0, 0.05)'
      : '0 10px 15px -3px rgba(0, 0, 0, 0.4), 0 4px 6px -2px rgba(0, 0, 0, 0.3)',
  },

  spacing: 4,
  shape: { borderRadius: 1 },

  typography: {
    fontFamily: '"Inter", "Roboto", "Segoe UI", system-ui, sans-serif',
    h5: { 
      fontWeight: 700,
      letterSpacing: '-0.02em',
    },
    h6: {
      fontWeight: 600,
      letterSpacing: '-0.01em',
    },
    body1: {
      letterSpacing: '0.01em',
    },
  },

  transitions: {
    duration: {
      shortest: 150,
      shorter: 200,
      short: 250,
      standard: 300,
      complex: 375,
      enteringScreen: 225,
      leavingScreen: 195,
    },
    easing: {
      easeInOut: 'cubic-bezier(0.4, 0, 0.2, 1)',
      easeOut: 'cubic-bezier(0.0, 0, 0.2, 1)',
      easeIn: 'cubic-bezier(0.4, 0, 1, 1)',
      sharp: 'cubic-bezier(0.4, 0, 0.6, 1)',
    },
  },

  /* MUI component overrides */
  components: {
    MuiButton: {
      styleOverrides: {
        root: {
          textTransform: 'none' as const,
          fontWeight: 600,
          borderRadius: 2,
          padding: '8px 20px',
          transition: 'all 0.2s cubic-bezier(0.4, 0, 0.2, 1)',
          '&:hover': {
            transform: 'translateY(-1px)',
          },
        },
        contained: {
          boxShadow: '0 4px 6px -1px rgba(0, 0, 0, 0.1), 0 2px 4px -1px rgba(0, 0, 0, 0.06)',
          '&:hover': {
            boxShadow: '0 10px 15px -3px rgba(0, 0, 0, 0.1), 0 4px 6px -2px rgba(0, 0, 0, 0.05)',
          },
        },
        outlined: {
          borderWidth: 1.5,
          borderColor: mode === 'light' ? '#cbd5e1' : '#475569',
          '&:hover': {
            borderWidth: 1.5,
            transform: 'translateY(-1px)',
            boxShadow: '0 4px 6px -1px rgba(0, 0, 0, 0.1)',
          },
        },
      },
    },
    MuiPaper: {
      styleOverrides: {
        root: {
          backgroundImage: 'none',
          transition: 'all 0.3s cubic-bezier(0.4, 0, 0.2, 1)',
        },
        rounded: { 
          borderRadius: 2,
        },
      },
    },
    MuiCard: {
      styleOverrides: {
        root: {
          transition: 'all 0.3s cubic-bezier(0.4, 0, 0.2, 1)',
          '&:hover': {
            transform: 'translateY(-4px)',
          },
        },
      },
    },
    MuiIconButton: {
      styleOverrides: {
        root: {
          transition: 'all 0.2s cubic-bezier(0.4, 0, 0.2, 1)',
          '&:hover': {
            transform: 'scale(1.1)',
            backgroundColor: mode === 'light' ? 'rgba(99, 102, 241, 0.08)' : 'rgba(129, 140, 248, 0.16)',
          },
        },
      },
    },
    MuiSkeleton: {
      styleOverrides: {
        root: {
          backgroundColor: mode === 'light' ? 'rgba(0, 0, 0, 0.04)' : 'rgba(255, 255, 255, 0.08)',
        },
      },
    },
  },
});

/* ------------------------------------------------------------------ */
/* 3.  Factory helper                                                 */
/* ------------------------------------------------------------------ */
export const buildTheme = (mode: PaletteMode) => createTheme(getDesignTokens(mode));

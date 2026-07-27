import { createTheme } from '@mui/material';

export const theme = createTheme({
  typography: {
    fontFamily: '"Inter", "Helvetica Neue", Helvetica, Arial, sans-serif',
    allVariants: {
      color: '#e0e0e0',
    },
  },
  palette: {
    mode: 'dark',
    primary: {
      main: '#a8a8a8',
      light: '#c8c8c8',
      dark: '#888888',
    },
    secondary: {
      main: '#666666',
    },
    background: {
      default: '#0a0a0f',
      paper: 'rgba(255,255,255,0.04)',
    },
    success: {
      main: '#4caf50',
    },
    error: {
      main: '#f44336',
    },
    text: {
      primary: '#e0e0e0',
      secondary: '#888888',
    },
  },
  components: {
    MuiCard: {
      styleOverrides: {
        root: {
          backgroundImage: 'none',
        },
      },
    },
    MuiCssBaseline: {
      styleOverrides: {
        body: {
          backgroundColor: '#0a0a0f',
          scrollbarColor: '#333 #0a0a0f',
          '&::-webkit-scrollbar': {
            width: 8,
          },
          '&::-webkit-scrollbar-track': {
            background: '#0a0a0f',
          },
          '&::-webkit-scrollbar-thumb': {
            background: '#333',
            borderRadius: 4,
          },
        },
      },
    },
  },
});

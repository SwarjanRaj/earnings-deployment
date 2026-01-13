import { IconButton, useTheme } from '@mui/material';
import { Moon, Sun } from 'lucide-react';
import { useContext } from 'react';
import { ColorModeContext } from '../../../theme';

export default function ColorModeSwitch() {
  const theme = useTheme();
  const { toggleColorMode } = useContext(ColorModeContext);

  return (
    <IconButton onClick={toggleColorMode} color="inherit">
      {theme.palette.mode === 'light' ? <Moon size={20} /> : <Sun size={20} />}
    </IconButton>
  );
}

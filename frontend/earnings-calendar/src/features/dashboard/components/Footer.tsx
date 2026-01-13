import { Box, Typography, Stack, alpha, useTheme } from '@mui/material';
import { Heart, Copyright } from 'lucide-react';

export default function Footer() {
  const theme = useTheme();
  
  return (
    <Box 
      sx={{ 
        width: '100%',
        textAlign: 'center', 
        mt: { xs: 4, md: 6 },
        pt: { xs: 4, md: 5 },
        pb: { xs: 3, md: 4 },
        px: { xs: 2, md: 3 },
        borderTop: `2px solid ${alpha(theme.palette.divider, 0.15)}`,
        bgcolor: alpha(theme.palette.background.paper, 0.5),
        borderRadius: 2,
        backdropFilter: 'blur(10px)',
      }}
    >
      <Stack 
        direction="row" 
        spacing={1} 
        alignItems="center" 
        justifyContent="center"
        sx={{
          flexWrap: 'wrap',
          gap: 1,
        }}
      >
        <Typography 
          color="text.secondary" 
          fontSize={14}
          sx={{
            display: 'flex',
            alignItems: 'center',
            gap: 0.5,
            fontWeight: 500,
          }}
        >
          <Copyright size={16} />
          VisualMicron 2025
        </Typography>
        <Typography 
          color="text.secondary" 
          fontSize={14}
          sx={{
            display: 'flex',
            alignItems: 'center',
            gap: 0.5,
          }}
        >
          Made with
          <Heart 
            size={14}
            fill={theme.palette.error.main}
            color={theme.palette.error.main}
            style={{
              animation: 'pulse 2s ease-in-out infinite',
            }}
          />
      </Typography>
      </Stack>
    </Box>
  );
}

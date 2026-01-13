import { Box, Typography } from '@mui/material';

export default function TestPage() {
  console.log('TestPage loaded');
  
  return (
    <Box sx={{ p: 3 }}>
      <Typography variant="h4">Test Page</Typography>
      <Typography variant="body1">
        This is a minimal test page to isolate the size error.
      </Typography>
    </Box>
  );
} 
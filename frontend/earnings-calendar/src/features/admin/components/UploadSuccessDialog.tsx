import {
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Button,
  Typography,
  Box,
  Chip,
} from '@mui/material';
import { CheckCircle2, Info, AlertTriangle } from 'lucide-react';
import { useTheme } from '@mui/material';

interface UploadResult {
  inserted: number;
  updated: number;
  skipped: number;
  total?: number;
  message: string;
}

interface Props {
  open: boolean;
  onClose: () => void;
  result: UploadResult | null;
}

export default function UploadSuccessDialog({ open, onClose, result }: Props) {
  const theme = useTheme();
  if (!result) return null;

  const totalProcessed = result.inserted + result.updated + result.skipped;
  const successRate = totalProcessed > 0 ? ((result.inserted + result.updated) / totalProcessed * 100).toFixed(1) : '0';

  return (
    <Dialog open={open} onClose={onClose} maxWidth="sm" fullWidth>
      <DialogTitle sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
        <CheckCircle2 size={24} color={theme.palette.success.main} />
        Upload Successful
      </DialogTitle>
      
      <DialogContent>
        <Typography variant="body1" sx={{ mb: 2 }}>
          {result.message}
        </Typography>

        <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
          {/* Summary Stats */}
          <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <Typography variant="h6">Summary</Typography>
            <Chip 
              label={`${successRate}% Success Rate`}
              color={parseFloat(successRate) >= 90 ? 'success' : parseFloat(successRate) >= 70 ? 'warning' : 'error'}
              size="small"
            />
          </Box>

          {/* Detailed Counts */}
          <Box sx={{ display: 'flex', flexDirection: 'column', gap: 1 }}>
            <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
              <CheckCircle2 size={18} color={theme.palette.success.main} />
              <Typography variant="body2">
                <strong>{result.inserted}</strong> new records created
              </Typography>
            </Box>
            
            <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
              <Info size={18} color={theme.palette.info.main} />
              <Typography variant="body2">
                <strong>{result.updated}</strong> existing records updated
              </Typography>
            </Box>
            
            {result.skipped > 0 && (
              <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                <AlertTriangle size={18} color={theme.palette.warning.main} />
                <Typography variant="body2">
                  <strong>{result.skipped}</strong> records skipped (invalid data)
                </Typography>
              </Box>
            )}
          </Box>

          {/* Total Processed */}
          {result.total && (
            <Box sx={{ 
              mt: 2, 
              p: 2, 
              bgcolor: 'grey.50', 
              borderRadius: 1,
              border: '1px solid',
              borderColor: 'grey.200'
            }}>
              <Typography variant="body2" color="text.secondary">
                Total records processed: <strong>{result.total}</strong>
              </Typography>
            </Box>
          )}
        </Box>
      </DialogContent>

      <DialogActions>
        <Button onClick={onClose} variant="contained" color="primary">
          Close
        </Button>
      </DialogActions>
    </Dialog>
  );
} 
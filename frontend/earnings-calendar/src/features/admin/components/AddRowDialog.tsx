import {
  Dialog, DialogTitle, DialogContent, DialogActions,
  Button, TextField, Box, alpha, useTheme,
} from '@mui/material';
import { Plus } from 'lucide-react';
import { useForm } from 'react-hook-form';
import { type EarningsRow } from '../../../services/adminApi';

interface Props {
  open: boolean;
  onClose: () => void;
  onSave: (row: Omit<EarningsRow,'id'>) => void;
}

export default function AddRowDialog({ open, onClose, onSave }: Props) {
  const theme = useTheme();
  const { register, handleSubmit, reset } = useForm<Omit<EarningsRow,'id'>>({
    defaultValues: { 
      ticker: '',
      companyName: '',
      sector: '',
      marketCap: '',
      revenue: '',
      eps: '',
      peRatio: '',
      earningsDate: '',
      fiscalYear: 2024,
      fiscalQuarter: 'Q1'
    },
  });

  return (
    <Dialog 
      open={open} 
      onClose={onClose}
      maxWidth="md"
      fullWidth
      PaperProps={{
        sx: {
          borderRadius: 2,
          boxShadow: theme.customShadows.cardHover,
        },
      }}
    >
      <DialogTitle
        sx={{
          background: `linear-gradient(135deg, ${alpha(theme.palette.primary.main, 0.1)} 0%, ${alpha(theme.palette.primary.main, 0.05)} 100%)`,
          borderBottom: `1px solid ${alpha(theme.palette.divider, 0.12)}`,
          fontWeight: 700,
          display: 'flex',
          alignItems: 'center',
          gap: 1.5,
        }}
      >
        <Box
          sx={{
            width: 40,
            height: 40,
            borderRadius: 2,
            background: `linear-gradient(135deg, ${theme.palette.primary.main} 0%, ${theme.palette.primary.dark} 100%)`,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            boxShadow: `0 4px 12px ${alpha(theme.palette.primary.main, 0.3)}`,
          }}
        >
          <Plus size={20} color="white" />
        </Box>
        Add Earnings Row
      </DialogTitle>
      <DialogContent sx={{ pt: 3 }}>
        <Box 
          sx={{ 
            display: 'grid', 
            gridTemplateColumns: { xs: '1fr', sm: '1fr 1fr' },
            gap: 2.5,
          }}
        >
          <TextField 
            label="Ticker Symbol" 
            {...register('ticker')} 
            required
            fullWidth
            sx={{
              '& .MuiOutlinedInput-root': {
                borderRadius: 2,
              },
            }}
          />
          <TextField 
            label="Company Name" 
            {...register('companyName')} 
            required
            fullWidth
            sx={{
              '& .MuiOutlinedInput-root': {
                borderRadius: 2,
              },
            }}
          />
          <TextField 
            label="Sector" 
            {...register('sector')} 
            required
            fullWidth
            sx={{
              '& .MuiOutlinedInput-root': {
                borderRadius: 2,
              },
            }}
          />
          <TextField 
            label="Market Cap (B USD)" 
            type="number" 
            inputProps={{ step: "0.00001" }} 
            {...register('marketCap')} 
            fullWidth
            sx={{
              '& .MuiOutlinedInput-root': {
                borderRadius: 2,
              },
            }}
          />
          <TextField 
            label="Revenue TTM (B USD)" 
            type="number" 
            inputProps={{ step: "0.00001" }} 
            {...register('revenue')} 
            fullWidth
            sx={{
              '& .MuiOutlinedInput-root': {
                borderRadius: 2,
              },
            }}
          />
          <TextField 
            label="EPS TTM (USD)" 
            type="number" 
            inputProps={{ step: "0.00001" }} 
            {...register('eps')} 
            fullWidth
            sx={{
              '& .MuiOutlinedInput-root': {
                borderRadius: 2,
              },
            }}
          />
          <TextField 
            label="P/E Ratio" 
            type="number" 
            inputProps={{ step: "0.00001" }} 
            {...register('peRatio')} 
            fullWidth
            sx={{
              '& .MuiOutlinedInput-root': {
                borderRadius: 2,
              },
            }}
          />
          <TextField 
            label="Earnings Date" 
            type="date" 
            {...register('earningsDate')} 
            required
            fullWidth
            InputLabelProps={{ shrink: true }}
            sx={{
              '& .MuiOutlinedInput-root': {
                borderRadius: 2,
              },
            }}
          />
          <TextField 
            label="Fiscal Year" 
            type="number" 
            {...register('fiscalYear', { valueAsNumber: true })} 
            required
            fullWidth
            sx={{
              '& .MuiOutlinedInput-root': {
                borderRadius: 2,
              },
            }}
          />
          <TextField 
            label="Fiscal Quarter" 
            {...register('fiscalQuarter')} 
            required
            fullWidth
            sx={{
              '& .MuiOutlinedInput-root': {
                borderRadius: 2,
              },
            }}
          />
        </Box>
      </DialogContent>
      <DialogActions sx={{ p: 2.5, gap: 1.5, borderTop: `1px solid ${alpha(theme.palette.divider, 0.12)}` }}>
        <Button 
          onClick={onClose}
          variant="outlined"
          sx={{
            borderRadius: 2,
            px: 2.5,
            py: 1,
            fontWeight: 600,
            borderWidth: 1.5,
          }}
        >
          Cancel
        </Button>
        <Button 
          variant="contained" 
          onClick={handleSubmit((d)=>{ 
          onSave({ 
            ...d,
            marketCap: d.marketCap || '',
            revenue: d.revenue || '',
            eps: d.eps || '',
            peRatio: d.peRatio || ''
          }); 
          reset();
          })}
          sx={{
            borderRadius: 2,
            px: 2.5,
            py: 1,
            fontWeight: 600,
            background: `linear-gradient(135deg, ${theme.palette.primary.main} 0%, ${theme.palette.primary.dark} 100%)`,
            boxShadow: `0 4px 12px ${alpha(theme.palette.primary.main, 0.3)}`,
            '&:hover': {
              boxShadow: `0 6px 16px ${alpha(theme.palette.primary.main, 0.4)}`,
            },
          }}
        >
          Save
        </Button>
      </DialogActions>
    </Dialog>
  );
}

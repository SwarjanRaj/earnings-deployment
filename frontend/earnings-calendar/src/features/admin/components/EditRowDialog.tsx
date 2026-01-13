import {
  Dialog, DialogTitle, DialogContent, DialogActions,
  Button, Box, TextField, alpha, useTheme,
} from '@mui/material';
import { Edit } from 'lucide-react';
import { useState, useEffect } from 'react';
import { type EarningsRow } from '../../../services/adminApi';

interface Props {
  open: boolean;
  onClose: () => void;
  onSave: (row: EarningsRow) => void;
  row: EarningsRow | null;
}

export default function EditRowDialog({ open, onClose, onSave, row }: Props) {
  const theme = useTheme();
  const [formData, setFormData] = useState<Omit<EarningsRow, 'id'>>({
    ticker: '',
    companyName: '',
    sector: '',
    marketCap: '',
    revenue: '',
    eps: '',
    peRatio: '',
    earningsDate: '',
    fiscalYear: 0,
    fiscalQuarter: '',
    reportTime: 'day',
  });

  useEffect(() => {
    if (row) {
      setFormData({
        ticker: row.ticker,
        companyName: row.companyName,
        sector: row.sector,
        marketCap: row.marketCap || '',
        revenue: row.revenue || '',
        eps: row.eps || '',
        peRatio: row.peRatio || '',
        earningsDate: row.earningsDate ? new Date(row.earningsDate).toISOString().split('T')[0] : '',
        fiscalYear: row.fiscalYear,
        fiscalQuarter: row.fiscalQuarter,
        reportTime: row.reportTime,
      });
    }
  }, [row]);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (row) {
      onSave({
        id: row.id, // Include the original record ID
        ...formData,
        marketCap: formData.marketCap || '',
        revenue: formData.revenue || '',
        eps: formData.eps || '',
        peRatio: formData.peRatio || '',
        fiscalYear: Number(formData.fiscalYear),
        earningsDate: new Date(formData.earningsDate).toISOString(),
      });
      onClose();
    }
  };

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
          <Edit size={20} color="white" />
        </Box>
        Edit Earnings Record
      </DialogTitle>
      <form onSubmit={handleSubmit}>
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
              value={formData.ticker}
              onChange={(e) => setFormData({ ...formData, ticker: e.target.value })}
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
              value={formData.companyName}
              onChange={(e) => setFormData({ ...formData, companyName: e.target.value })}
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
              value={formData.sector}
              onChange={(e) => setFormData({ ...formData, sector: e.target.value })}
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
              value={formData.marketCap}
              onChange={(e) => setFormData({ ...formData, marketCap: e.target.value })}
              fullWidth
              sx={{
                '& .MuiOutlinedInput-root': {
                  borderRadius: 2,
                },
              }}
            />
            <TextField
              label="Quarterly Revenue (B USD)"
              type="number"
              value={formData.revenue}
              onChange={(e) => setFormData({ ...formData, revenue: e.target.value })}
              fullWidth
              sx={{
                '& .MuiOutlinedInput-root': {
                  borderRadius: 2,
                },
              }}
            />
            <TextField
              label="EPS (USD)"
              type="number"
              value={formData.eps}
              onChange={(e) => setFormData({ ...formData, eps: e.target.value })}
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
              value={formData.peRatio}
              onChange={(e) => setFormData({ ...formData, peRatio: e.target.value })}
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
              value={formData.earningsDate}
              onChange={(e) => setFormData({ ...formData, earningsDate: e.target.value })}
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
              value={formData.fiscalYear}
              onChange={(e) => setFormData({ ...formData, fiscalYear: Number(e.target.value) })}
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
              value={formData.fiscalQuarter}
              onChange={(e) => setFormData({ ...formData, fiscalQuarter: e.target.value })}
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
            type="submit" 
            variant="contained"
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
            Save Changes
          </Button>
        </DialogActions>
      </form>
    </Dialog>
  );
} 
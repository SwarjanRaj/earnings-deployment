import { useState } from 'react';
import {
  Box,
  Button,
  Stack,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  FormControl,
  InputLabel,
  Select,
  MenuItem,
  Chip,
  alpha,
  useTheme,
  Fade,
} from '@mui/material';
import { DatePicker } from '@mui/x-date-pickers/DatePicker';
import { LocalizationProvider } from '@mui/x-date-pickers/LocalizationProvider';
import { AdapterDateFns } from '@mui/x-date-pickers/AdapterDateFns';
import { format } from 'date-fns';
import { CalendarDays, Calendar, CalendarRange, Calendar as EventIcon, Filter, CheckCircle2 } from 'lucide-react';

export type DateFilterType = 
  | 'today' 
  | 'yesterday' 
  | 'tomorrow' 
  | 'this-week' 
  | 'next-week'
  | 'date-range'
  | 'specific-date'
  | 'month'
  | 'quarter';

export interface DateRangeParams {
  startDate?: string;
  endDate?: string;
  specificDate?: string;
  year?: number;
  month?: number;
  quarter?: number;
  today?: string;
  yesterday?: string;
  tomorrow?: string;
  'this-week'?: string;
  'next-week'?: string;
}

interface Props {
  onDateRangeChange: (params: DateRangeParams) => void;
  currentParams?: DateRangeParams;
}

export default function DateRangePicker({ onDateRangeChange, currentParams }: Props) {
  const theme = useTheme();
  const [open, setOpen] = useState(false);
  const [filterType, setFilterType] = useState<DateFilterType | null>(null);
  const [startDate, setStartDate] = useState<Date | null>(
    currentParams?.startDate ? new Date(currentParams.startDate) : null
  );
  const [endDate, setEndDate] = useState<Date | null>(
    currentParams?.endDate ? new Date(currentParams.endDate) : null
  );
  const [specificDate, setSpecificDate] = useState<Date | null>(null);
  const [selectedYear, setSelectedYear] = useState<number>(new Date().getFullYear());
  const [selectedMonth, setSelectedMonth] = useState<number>(new Date().getMonth() + 1);
  const [selectedQuarter, setSelectedQuarter] = useState<number>(1);
  
  // Determine active filter from currentParams
  const getActiveFilter = () => {
    if (!currentParams) return null;
    if (currentParams.today) return 'today';
    if (currentParams.yesterday) return 'yesterday';
    if (currentParams.tomorrow) return 'tomorrow';
    if (currentParams['this-week']) return 'this-week';
    if (currentParams['next-week']) return 'next-week';
    if (currentParams.startDate && currentParams.endDate) return 'date-range';
    if (currentParams.specificDate) return 'specific-date';
    if (currentParams.year && currentParams.month) return 'month';
    if (currentParams.year && currentParams.quarter) return 'quarter';
    return null;
  };
  
  const activeQuickFilter = getActiveFilter();

  const handleOpen = () => setOpen(true);
  const handleClose = () => setOpen(false);

  const handleApply = () => {
    let params: DateRangeParams = {};

    switch (filterType) {
      case 'date-range':
        if (startDate && endDate) {
          params = {
            startDate: format(startDate, 'yyyy-MM-dd'),
            endDate: format(endDate, 'yyyy-MM-dd'),
          };
        }
        break;
      case 'specific-date':
        if (specificDate) {
          params = {
            specificDate: format(specificDate, 'yyyy-MM-dd'),
          };
        }
        break;
      case 'month':
        params = {
          year: selectedYear,
          month: selectedMonth,
        };
        break;
      case 'quarter':
        params = {
          year: selectedYear,
          quarter: selectedQuarter,
        };
        break;
    }

    if (Object.keys(params).length > 0) {
    onDateRangeChange(params);
    }
    handleClose();
  };

  const handleClearFilters = () => {
    onDateRangeChange({});
    setFilterType(null);
    setStartDate(null);
    setEndDate(null);
    setSpecificDate(null);
  };

  const quickFilters = [
    { label: 'Today', value: 'today', icon: <CalendarDays size={18} /> },
    { label: 'Yesterday', value: 'yesterday', icon: <CalendarDays size={18} /> },
    { label: 'Tomorrow', value: 'tomorrow', icon: <CalendarDays size={18} /> },
    { label: 'This Week', value: 'this-week', icon: <Calendar size={18} /> },
    { label: 'Next Week', value: 'next-week', icon: <Calendar size={18} /> },
  ];

  const customFilters = [
    { label: 'Date Range', value: 'date-range', icon: <CalendarRange size={18} /> },
    { label: 'Specific Date', value: 'specific-date', icon: <EventIcon size={18} /> },
    { label: 'Month', value: 'month', icon: <Calendar size={18} /> },
    { label: 'Quarter', value: 'quarter', icon: <Filter size={18} /> },
  ];

  return (
    <Box
      sx={{
        bgcolor: 'background.paper',
        borderRadius: 2,
        p: 3,
        boxShadow: theme.customShadows.card,
        border: `1px solid ${alpha(theme.palette.divider, 0.1)}`,
      }}
    >
      {/* Centered Filter Buttons Container */}
      <Box sx={{ 
        display: 'flex', 
        justifyContent: 'center', 
        alignItems: 'center',
        mb: activeQuickFilter ? 2 : 0,
        width: '100%',
      }}>
        <Stack 
          direction="row" 
          spacing={1.5} 
          alignItems="center" 
          flexWrap="wrap"
          sx={{ 
            justifyContent: 'center',
            maxWidth: '100%',
            gap: 1.5
          }}
        >
          {/* Quick Filters */}
          {quickFilters.map((filter) => {
            const isActive = activeQuickFilter === filter.value;
            return (
            <Button
              key={filter.value}
                onClick={() => {
                  // Clear other filters and set the selected one
                  onDateRangeChange({ [filter.value as DateFilterType]: filter.value });
                }}
                variant={isActive ? "contained" : "outlined"}
              size="small"
                startIcon={filter.icon}
              sx={{
                textTransform: 'none',
                minWidth: 110,
                px: 2.5,
                py: 1.2,
                borderRadius: 2,
                  fontWeight: 600,
                  fontSize: 13,
                  transition: 'all 0.3s cubic-bezier(0.4, 0, 0.2, 1)',
                  ...(isActive ? {
                    background: `linear-gradient(135deg, ${theme.palette.primary.main} 0%, ${theme.palette.primary.dark} 100%)`,
                    boxShadow: `0 4px 12px ${alpha(theme.palette.primary.main, 0.3)}`,
                    '&:hover': {
                      transform: 'translateY(-2px)',
                      boxShadow: `0 6px 16px ${alpha(theme.palette.primary.main, 0.4)}`,
                    },
                  } : {
                '&:hover': {
                      transform: 'translateY(-2px)',
                      boxShadow: theme.customShadows.card,
                      borderColor: theme.palette.primary.main,
                      bgcolor: alpha(theme.palette.primary.main, 0.05),
                    },
                  }),
              }}
            >
              {filter.label}
            </Button>
            );
          })}

          {/* Custom Date Filters */}
          {customFilters.map((filter) => (
            <Button
              key={filter.value}
              onClick={() => {
                setFilterType(filter.value as DateFilterType);
                handleOpen();
              }}
              variant="outlined"
              size="small"
              startIcon={filter.icon}
              sx={{
                textTransform: 'none',
                minWidth: 130,
                px: 2.5,
                py: 1.2,
                borderRadius: 2,
                fontWeight: 600,
                fontSize: 13,
                transition: 'all 0.3s cubic-bezier(0.4, 0, 0.2, 1)',
                '&:hover': {
                  transform: 'translateY(-2px)',
                  boxShadow: theme.customShadows.card,
                  borderColor: theme.palette.primary.main,
                  bgcolor: alpha(theme.palette.primary.main, 0.05),
                },
              }}
            >
              {filter.label}
            </Button>
          ))}
        </Stack>
      </Box>

      {/* Active Filter Display - Centered */}
      {activeQuickFilter && (
        <Fade in={true}>
          <Box sx={{ display: 'flex', justifyContent: 'center', alignItems: 'center', gap: 2, mb: 2, flexWrap: 'wrap' }}>
            <Chip
              icon={<CheckCircle2 size={16} />}
              label={`Active: ${activeQuickFilter.replace('-', ' ').replace(/\b\w/g, l => l.toUpperCase())}`}
              color="primary"
              onDelete={handleClearFilters}
              sx={{
                fontWeight: 600,
                fontSize: 13,
                height: 36,
                borderRadius: 2,
                bgcolor: alpha(theme.palette.primary.main, 0.1),
                color: 'primary.main',
                '& .MuiChip-icon': {
                  color: 'primary.main',
                },
                '& .MuiChip-deleteIcon': {
                  color: 'primary.main',
                  '&:hover': {
                    color: 'primary.dark',
                  },
                },
              }}
            />
        </Box>
        </Fade>
      )}

      {/* Date Range Dialog */}
      <Dialog 
        open={open} 
        onClose={handleClose} 
        maxWidth="sm" 
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
            bgcolor: alpha(theme.palette.primary.main, 0.05),
            borderBottom: `1px solid ${alpha(theme.palette.divider, 0.1)}`,
            fontWeight: 700,
            display: 'flex',
            alignItems: 'center',
            gap: 1,
          }}
        >
          {filterType === 'date-range' && <CalendarRange size={20} color={theme.palette.primary.main} />}
          {filterType === 'specific-date' && <EventIcon size={20} color={theme.palette.primary.main} />}
          {filterType === 'month' && <Calendar size={20} color={theme.palette.primary.main} />}
          {filterType === 'quarter' && <Filter size={20} color={theme.palette.primary.main} />}
          {filterType === 'date-range' && 'Select Date Range'}
          {filterType === 'specific-date' && 'Select Specific Date'}
          {filterType === 'month' && 'Select Month'}
          {filterType === 'quarter' && 'Select Quarter'}
        </DialogTitle>
        <DialogContent>
          <LocalizationProvider dateAdapter={AdapterDateFns}>
            <Stack spacing={3} sx={{ mt: 1 }}>
              {filterType === 'date-range' && (
                <>
                  <DatePicker
                    label="Start Date"
                    value={startDate}
                    onChange={(newValue) => setStartDate(newValue)}
                    slotProps={{ textField: { fullWidth: true } }}
                  />
                  <DatePicker
                    label="End Date"
                    value={endDate}
                    onChange={(newValue) => setEndDate(newValue)}
                    slotProps={{ textField: { fullWidth: true } }}
                    minDate={startDate || undefined}
                  />
                </>
              )}

              {filterType === 'specific-date' && (
                <DatePicker
                  label="Select Date"
                  value={specificDate}
                  onChange={(newValue) => setSpecificDate(newValue)}
                  slotProps={{ textField: { fullWidth: true } }}
                />
              )}

              {filterType === 'month' && (
                <Stack direction="row" spacing={2}>
                  <FormControl fullWidth>
                    <InputLabel>Year</InputLabel>
                    <Select
                      value={selectedYear}
                      onChange={(e) => setSelectedYear(e.target.value as number)}
                      label="Year"
                    >
                      {Array.from({ length: 41 }, (_, i) => 1990 + i).map((year) => (
                        <MenuItem key={year} value={year}>{year}</MenuItem>
                      ))}
                    </Select>
                  </FormControl>
                  <FormControl fullWidth>
                    <InputLabel>Month</InputLabel>
                    <Select
                      value={selectedMonth}
                      onChange={(e) => setSelectedMonth(e.target.value as number)}
                      label="Month"
                    >
                      {Array.from({ length: 12 }, (_, i) => i + 1).map((month) => (
                        <MenuItem key={month} value={month}>
                          {new Date(2024, month - 1).toLocaleDateString('en-US', { month: 'long' })}
                        </MenuItem>
                      ))}
                    </Select>
                  </FormControl>
                </Stack>
              )}

              {filterType === 'quarter' && (
                <Stack direction="row" spacing={2}>
                  <FormControl fullWidth>
                    <InputLabel>Year</InputLabel>
                    <Select
                      value={selectedYear}
                      onChange={(e) => setSelectedYear(e.target.value as number)}
                      label="Year"
                    >
                      {Array.from({ length: 41 }, (_, i) => 1990 + i).map((year) => (
                        <MenuItem key={year} value={year}>{year}</MenuItem>
                      ))}
                    </Select>
                  </FormControl>
                  <FormControl fullWidth>
                    <InputLabel>Quarter</InputLabel>
                    <Select
                      value={selectedQuarter}
                      onChange={(e) => setSelectedQuarter(e.target.value as number)}
                      label="Quarter"
                    >
                      {[1, 2, 3, 4].map((quarter) => (
                        <MenuItem key={quarter} value={quarter}>Q{quarter}</MenuItem>
                      ))}
                    </Select>
                  </FormControl>
                </Stack>
              )}
            </Stack>
          </LocalizationProvider>
        </DialogContent>
        <DialogActions sx={{ p: 2.5, gap: 1.5 }}>
          <Button 
            onClick={handleClose}
            variant="outlined"
            sx={{
              fontWeight: 600,
              minWidth: 100,
            }}
          >
            Cancel
          </Button>
          <Button 
            onClick={handleApply} 
            variant="contained"
            sx={{
              fontWeight: 600,
              minWidth: 100,
              background: `linear-gradient(135deg, ${theme.palette.primary.main} 0%, ${theme.palette.primary.dark} 100%)`,
              boxShadow: `0 4px 12px ${alpha(theme.palette.primary.main, 0.3)}`,
              '&:hover': {
                background: `linear-gradient(135deg, ${theme.palette.primary.light} 0%, ${theme.palette.primary.main} 100%)`,
                boxShadow: `0 6px 16px ${alpha(theme.palette.primary.main, 0.4)}`,
                transform: 'translateY(-1px)',
              },
            }}
          >
            Apply
          </Button>
        </DialogActions>
      </Dialog>
    </Box>
  );
} 
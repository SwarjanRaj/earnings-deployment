import { Box, Typography, Skeleton, Alert, alpha, Chip, useTheme, Button, Select, MenuItem, FormControl, TextField } from '@mui/material';
import { ChevronLeft, ChevronRight } from 'lucide-react';
import { useState, useEffect } from 'react';
import { 
  useGetTodayQuery, 
  useGetYesterdayQuery, 
  useGetTomorrowQuery, 
  useGetThisWeekQuery, 
  useGetNextWeekQuery, 
  useGetPublicPreviewQuery,
  useGetByDateRangeQuery,
  useGetBySpecificDateQuery,
  useGetByMonthQuery,
  useGetByQuarterQuery,
  useListEarningsQuery,
} from '../../../services/adminApi';
import type { DateFilterType, DateRangeParams } from './DateRangePicker';
import { useSelector } from 'react-redux';
import { useAuthLoading } from './AuthBootStrap';
import type { RootState } from '../../../app/store';
import { TrendingUp, TrendingDown, Calendar, Clock, DollarSign } from 'lucide-react';

// Utility functions for formatting
const formatNumber = (value: string | null | undefined): string => {
  if (value === null || value === undefined || value === '') return '';
  const numValue = parseFloat(value);
  if (isNaN(numValue)) return '';
  return numValue.toFixed(5);
};

const formatDate = (value: string | null | undefined): string => {
  if (!value) return '';
  const date = new Date(value);
  if (isNaN(date.getTime())) return '';
  return date.toISOString().split('T')[0]; // Returns YYYY-MM-DD format
};

const columns = [
  'S.No','Ticker','Company','Sector','M-Cap (B)','Quarterly Rev (B)',
  'EPS','P/E','Date','FY','Quarter','Time',
] as const;

interface Props {
  activeFilter?: DateFilterType | null;
  filterParams?: DateRangeParams;
  showPagination?: boolean;
}

export default function EarningsTable({ activeFilter, filterParams }: Props) {
  const theme = useTheme();
  const isAuthenticated = useSelector((state: RootState) => state.auth.user !== null);
  const isAuthLoading = useAuthLoading();
  const [currentPage, setCurrentPage] = useState(1);
  const [pageSize, setPageSize] = useState(50);
  const [manualPageInput, setManualPageInput] = useState('');
  
  // Reset to page 1 when pageSize changes
  useEffect(() => {
    setCurrentPage(1);
  }, [pageSize]);
  
  // Reset to page 1 when filter changes
  useEffect(() => {
    setCurrentPage(1);
  }, [activeFilter]);
  
  // Skip all queries while authentication is being checked
  const shouldSkipQueries = isAuthLoading;
  
  // Public preview query (for all users when no filter is active) - with pagination
  const { data: publicPreviewData, isLoading: publicPreviewLoading, error: publicPreviewError } = useGetPublicPreviewQuery(
    { page: currentPage, pageSize }, 
    { skip: shouldSkipQueries }
  );
  
  // Authenticated user queries - use pagination with dynamic pageSize and currentPage
  const { data: allData, isLoading: allLoading, error: allError } = useListEarningsQuery(
    { page: currentPage, pageSize }, 
    { skip: !isAuthenticated || activeFilter !== null || shouldSkipQueries }
  );
  const { data: todayData, isLoading: todayLoading, error: todayError } = useGetTodayQuery(
    { page: currentPage, pageSize }, 
    { skip: !isAuthenticated || activeFilter !== 'today' || shouldSkipQueries }
  );
  const { data: yesterdayData, isLoading: yesterdayLoading, error: yesterdayError } = useGetYesterdayQuery(
    { page: currentPage, pageSize }, 
    { skip: !isAuthenticated || activeFilter !== 'yesterday' || shouldSkipQueries }
  );
  const { data: tomorrowData, isLoading: tomorrowLoading, error: tomorrowError } = useGetTomorrowQuery(
    { page: currentPage, pageSize }, 
    { skip: !isAuthenticated || activeFilter !== 'tomorrow' || shouldSkipQueries }
  );
  const { data: thisWeekData, isLoading: thisWeekLoading, error: thisWeekError } = useGetThisWeekQuery(
    { page: currentPage, pageSize }, 
    { skip: !isAuthenticated || activeFilter !== 'this-week' || shouldSkipQueries }
  );
  const { data: nextWeekData, isLoading: nextWeekLoading, error: nextWeekError } = useGetNextWeekQuery(
    { page: currentPage, pageSize }, 
    { skip: !isAuthenticated || activeFilter !== 'next-week' || shouldSkipQueries }
  );

  // New date range queries - use pagination with dynamic pageSize and currentPage
  const { data: dateRangeData, isLoading: dateRangeLoading, error: dateRangeError } = useGetByDateRangeQuery(
    { 
      startDate: (filterParams?.startDate || '') as string, 
      endDate: (filterParams?.endDate || '') as string,
      page: currentPage,
      pageSize
    },
    { skip: !isAuthenticated || activeFilter !== 'date-range' || !filterParams?.startDate || !filterParams?.endDate || shouldSkipQueries }
  );
  const { data: specificDateData, isLoading: specificDateLoading, error: specificDateError } = useGetBySpecificDateQuery(
    { 
      date: (filterParams?.specificDate || '') as string,
      page: currentPage,
      pageSize
    },
    { skip: !isAuthenticated || activeFilter !== 'specific-date' || !filterParams?.specificDate || shouldSkipQueries }
  );
  const { data: monthData, isLoading: monthLoading, error: monthError } = useGetByMonthQuery(
    { 
      year: (filterParams?.year || 0) as number, 
      month: (filterParams?.month || 0) as number,
      page: currentPage,
      pageSize
    },
    { skip: !isAuthenticated || activeFilter !== 'month' || !filterParams?.year || !filterParams?.month || shouldSkipQueries }
  );
  const { data: quarterData, isLoading: quarterLoading, error: quarterError } = useGetByQuarterQuery(
    { 
      year: (filterParams?.year || 0) as number, 
      quarter: (filterParams?.quarter || 0) as number,
      page: currentPage,
      pageSize
    },
    { skip: !isAuthenticated || activeFilter !== 'quarter' || !filterParams?.year || !filterParams?.quarter || shouldSkipQueries }
  );

  // Get the appropriate data, loading state, and pagination info
  const getDataAndLoading = () => {
    // For unauthenticated users, always show public preview
    if (!isAuthenticated) {
      return { 
        data: publicPreviewData?.data || [], 
        isLoading: publicPreviewLoading, 
        error: publicPreviewError,
        pagination: publicPreviewData?.pagination
      };
    }
    
    // For authenticated users, show public preview if no filter is selected
    if (!activeFilter) {
      return { 
        data: publicPreviewData?.data || [], 
        isLoading: publicPreviewLoading, 
        error: publicPreviewError,
        pagination: publicPreviewData?.pagination
      };
    }
    
    switch (activeFilter) {
      case 'today':
        return { 
          data: todayData?.data || todayData || [], 
          isLoading: todayLoading, 
          error: todayError,
          pagination: todayData?.pagination
        };
      case 'yesterday':
        return { 
          data: yesterdayData?.data || yesterdayData || [], 
          isLoading: yesterdayLoading, 
          error: yesterdayError,
          pagination: yesterdayData?.pagination
        };
      case 'tomorrow':
        return { 
          data: tomorrowData?.data || tomorrowData || [], 
          isLoading: tomorrowLoading, 
          error: tomorrowError,
          pagination: tomorrowData?.pagination
        };
      case 'this-week':
        return { 
          data: thisWeekData?.data || thisWeekData || [], 
          isLoading: thisWeekLoading, 
          error: thisWeekError,
          pagination: thisWeekData?.pagination
        };
      case 'next-week':
        return { 
          data: nextWeekData?.data || nextWeekData || [], 
          isLoading: nextWeekLoading, 
          error: nextWeekError,
          pagination: nextWeekData?.pagination
        };
      case 'date-range':
        return { 
          data: dateRangeData?.data || dateRangeData || [], 
          isLoading: dateRangeLoading, 
          error: dateRangeError,
          pagination: dateRangeData?.pagination
        };
      case 'specific-date':
        return { 
          data: specificDateData?.data || specificDateData || [], 
          isLoading: specificDateLoading, 
          error: specificDateError,
          pagination: specificDateData?.pagination
        };
      case 'month':
        return { 
          data: monthData?.data || monthData || [], 
          isLoading: monthLoading, 
          error: monthError,
          pagination: monthData?.pagination
        };
      case 'quarter':
        return { 
          data: quarterData?.data || quarterData || [], 
          isLoading: quarterLoading, 
          error: quarterError,
          pagination: quarterData?.pagination
        };
      default:
        return { 
          data: allData?.data || allData || [], 
          isLoading: allLoading, 
          error: allError,
          pagination: allData?.pagination
        };
    }
  };

  const { data: dataResult, isLoading, error, pagination } = getDataAndLoading();
  const rows = Array.isArray(dataResult) ? dataResult : [];
  
  // Handle manual page input
  const handleManualPageChange = (value: string) => {
    setManualPageInput(value);
  };
  
  const handleManualPageSubmit = () => {
    const pageNum = parseInt(manualPageInput, 10);
    if (pagination && !isNaN(pageNum) && pageNum >= 1 && pageNum <= pagination.totalPages) {
      setCurrentPage(pageNum);
      setManualPageInput('');
    }
  };
  
  const handlePageSizeChange = (newPageSize: number) => {
    setPageSize(newPageSize);
    setCurrentPage(1);
  };
  
  // Generate page numbers to display
  const getPageNumbers = () => {
    if (!pagination) return [];
    const pages: (number | string)[] = [];
    const maxVisiblePages = 5;
    const { currentPage: page, totalPages } = pagination;
    
    if (totalPages <= maxVisiblePages) {
      for (let i = 1; i <= totalPages; i++) {
        pages.push(i);
      }
    } else {
      pages.push(1);
      const leftBound = Math.max(2, page - 1);
      const rightBound = Math.min(totalPages - 1, page + 1);
      
      if (leftBound > 2) {
        pages.push('...');
      }
      
      for (let i = leftBound; i <= rightBound; i++) {
        pages.push(i);
      }
      
      if (rightBound < totalPages - 1) {
        pages.push('...');
      }
      
      if (totalPages > 1) {
        pages.push(totalPages);
      }
    }
    
    return pages;
  };
  
  const pageNumbers = getPageNumbers();

  // Show loading skeleton while auth is being checked or data is loading
  if (isAuthLoading || isLoading) {
    return (
      <Box 
        sx={{ 
          mt: 3,
          borderRadius: 2,
          overflow: 'hidden',
          bgcolor: 'background.paper',
          boxShadow: theme.customShadows.card,
        }}
      >
        {/* Header skeleton */}
        <Box sx={{ 
          display: 'grid',
          gridTemplateColumns: {
            xs: `repeat(${columns.length}, minmax(100px,1fr))`,
            sm: `repeat(${columns.length}, minmax(120px,1fr))`,
            md: `repeat(${columns.length}, 1fr)`,
          },
          py: 2.5,
          px: { xs: 2, sm: 3 },
          borderBottom: 1,
          borderColor: 'divider',
        }}>
          {columns.map((_, idx) => (
            <Skeleton key={idx} variant="text" width="80%" height={20} />
          ))}
        </Box>
        {/* Row skeletons */}
        {[...Array(5)].map((_, idx) => (
          <Box 
            key={idx}
            sx={{ 
              display: 'grid',
              gridTemplateColumns: {
                xs: `repeat(${columns.length}, minmax(100px,1fr))`,
                sm: `repeat(${columns.length}, minmax(120px,1fr))`,
                md: `repeat(${columns.length}, 1fr)`,
              },
              py: { xs: 2, sm: 2.5 },
              px: { xs: 2, sm: 3 },
              borderBottom: idx === 4 ? 'none' : 1,
              borderColor: 'divider',
            }}
          >
            {columns.map((_, colIdx) => (
              <Skeleton 
                key={colIdx} 
                variant="text" 
                width={colIdx === 0 ? "40%" : colIdx === 1 ? "60%" : "80%"} 
                height={16}
                sx={{ 
                  animationDelay: `${idx * 50}ms`,
                }}
              />
            ))}
          </Box>
        ))}
      </Box>
    );
  }

  // Show error message if there's an error
  if (error) {
    return (
      <Alert severity="error" sx={{ mt: 3 }}>
        Failed to load earnings data. Please try again later.
      </Alert>
    );
  }

  // Show no data message for authenticated users when filters return empty results
  if (isAuthenticated && rows.length === 0) {
    const getNoDataMessage = () => {
      switch (activeFilter) {
        case 'today':
          return 'No earnings scheduled for today. Try selecting a different date range.';
        case 'yesterday':
          return 'No earnings were scheduled for yesterday.';
        case 'tomorrow':
          return 'No earnings scheduled for tomorrow. Try selecting a different date range.';
        case 'this-week':
          return 'No earnings scheduled for this week. Try selecting a different date range.';
        case 'next-week':
          return 'No earnings scheduled for next week. Try selecting a different date range.';
        case 'date-range':
          return 'No earnings found for the selected date range. Try selecting different dates.';
        case 'specific-date':
          return 'No earnings found for the selected date. Try selecting a different date.';
        case 'month':
          return 'No earnings found for the selected month. Try selecting a different month.';
        case 'quarter':
          return 'No earnings found for the selected quarter. Try selecting a different quarter.';
        default:
          return 'No earnings data found.';
      }
    };

    return (
      <Alert severity="info" sx={{ mt: 3 }}>
        {getNoDataMessage()}
      </Alert>
    );
  }

  const getEpsColor = (eps: string | null | undefined) => {
    if (!eps) return 'text.secondary';
    const value = parseFloat(eps);
    if (isNaN(value)) return 'text.secondary';
    return value >= 0 ? 'success.main' : 'error.main';
  };

  const getPeColor = (pe: string | null | undefined) => {
    if (!pe) return 'text.secondary';
    const value = parseFloat(pe);
    if (isNaN(value)) return 'text.secondary';
    if (value < 15) return 'success.main';
    if (value > 25) return 'warning.main';
    return 'text.primary';
  };

  return (
    <Box sx={{
      borderRadius: 2, 
      overflow: 'hidden',
      bgcolor: 'background.paper',
      boxShadow: theme.customShadows.card,
      border: `1px solid ${alpha(theme.palette.divider, 0.1)}`,
      transition: 'all 0.3s cubic-bezier(0.4, 0, 0.2, 1)',
      '&:hover': {
        boxShadow: theme.customShadows.cardHover,
      },
    }}>
      <Box sx={{ 
        overflowX: 'auto',
        position: 'relative',
        '&::-webkit-scrollbar': {
          height: 8,
        },
        '&::-webkit-scrollbar-track': {
          background: alpha(theme.palette.divider, 0.1),
        },
        '&::-webkit-scrollbar-thumb': {
          background: alpha(theme.palette.primary.main, 0.3),
          borderRadius: 2,
          '&:hover': {
            background: alpha(theme.palette.primary.main, 0.5),
          },
        },
      }}>
        {/* header */}
        <Box sx={{
          display: 'grid',
          gridTemplateColumns: {
            xs: `repeat(${columns.length}, minmax(100px,1fr))`,
            sm: `repeat(${columns.length}, minmax(120px,1fr))`,
            md: `repeat(${columns.length}, 1fr)`,
          },
          py: 2.5,
          px: { xs: 2, sm: 3 },
          borderBottom: `2px solid ${alpha(theme.palette.primary.main, 0.3)}`,
          background: theme.palette.mode === 'light'
            ? `linear-gradient(135deg, ${alpha(theme.palette.primary.main, 0.15)} 0%, ${alpha(theme.palette.primary.main, 0.08)} 100%)`
            : `linear-gradient(135deg, ${alpha(theme.palette.primary.main, 0.25)} 0%, ${alpha(theme.palette.primary.main, 0.15)} 100%)`,
          fontSize: 13, 
          fontWeight: 700, 
          textAlign: 'center',
          textTransform: 'uppercase',
          letterSpacing: '0.8px',
          position: 'sticky',
          top: 0,
          zIndex: 10,
          backdropFilter: 'blur(10px)',
        }}>
          {columns.map((c, colIdx) => (
            <Typography 
              key={c} 
              color={colIdx === 0 ? 'primary.main' : theme.palette.mode === 'light' ? '#1e293b' : '#f1f5f9'}
              sx={{ 
                fontSize: { xs: 10, sm: 11, md: colIdx === 0 ? 13 : 12 },
                fontWeight: colIdx === 0 ? 800 : 700,
              }}
            >
              {c}
            </Typography>
          ))}
        </Box>

        {/* rows */}
        {rows.map((r, idx) => (
          <Box 
            key={r.id} 
            sx={{
            display: 'grid',
            gridTemplateColumns: {
                xs: `repeat(${columns.length}, minmax(100px,1fr))`,
                sm: `repeat(${columns.length}, minmax(120px,1fr))`,
              md: `repeat(${columns.length}, 1fr)`,
            },
            textAlign: 'center',
              py: { xs: 2, sm: 2.5 },
              px: { xs: 2, sm: 3 },
              fontSize: { xs: 12, sm: 13, md: 14 },
              borderBottom: idx === rows.length - 1 ? 'none' : `1px solid ${alpha(theme.palette.divider, 0.1)}`,
              transition: 'all 0.2s cubic-bezier(0.4, 0, 0.2, 1)',
              cursor: 'pointer',
              '&:hover': {
                bgcolor: alpha(theme.palette.primary.main, 0.06),
                transform: 'translateX(4px)',
                boxShadow: `inset 4px 0 0 ${theme.palette.primary.main}`,
              },
            }}
          >
            {/* Serial Number */}
            <Box sx={{ 
              display: 'flex', 
              alignItems: 'center', 
              justifyContent: 'center',
            }}>
              <Chip
                label={pagination ? (pagination.currentPage - 1) * pagination.pageSize + idx + 1 : idx + 1}
                size="small"
                sx={{
                  height: 32,
                  minWidth: 32,
                  fontSize: 13,
                  fontWeight: 800,
                  bgcolor: alpha(theme.palette.primary.main, 0.15),
                  color: 'primary.main',
                  borderRadius: 20,
                }}
              />
            </Box>
            
            {/* Ticker */}
            <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 0.5 }}>
              {/* <Building2 size={16} color={theme.palette.primary.main} /> */}
              <Typography fontWeight={700} color="primary.main">
                {r.ticker}
              </Typography>
            </Box>
            <Typography>{r.companyName}</Typography>
            <Chip 
              label={r.sector} 
              size="small" 
              sx={{ 
                height: 24,
                fontSize: 11,
                bgcolor: alpha(theme.palette.info.main, 0.1),
                color: 'info.main',
                fontWeight: 500,
              }}
            />
            <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 0.5 }}>
              <DollarSign size={14} color={theme.palette.text.secondary} />
              <Typography fontWeight={500}>{formatNumber(r.marketCap)}</Typography>
            </Box>
            <Typography fontWeight={500}>{formatNumber(r.revenue)}</Typography>
            <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 0.5 }}>
              {parseFloat(r.eps || '0') >= 0 ? (
                <TrendingUp size={16} color={parseFloat(r.eps || '0') >= 0 ? theme.palette.success.main : theme.palette.error.main} />
              ) : (
                <TrendingDown size={16} color={parseFloat(r.eps || '0') >= 0 ? theme.palette.success.main : theme.palette.error.main} />
              )}
              <Typography fontWeight={600} color={getEpsColor(r.eps)}>
                {formatNumber(r.eps)}
              </Typography>
            </Box>
            <Typography color={getPeColor(r.peRatio)} fontWeight={500}>
              {formatNumber(r.peRatio)}
            </Typography>
            <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 0.5 }}>
              <Calendar size={14} color={theme.palette.text.secondary} />
            <Typography>{formatDate(r.earningsDate)}</Typography>
            </Box>
            <Typography>{r.fiscalYear}</Typography>
            <Chip 
              label={`Q${r.fiscalQuarter}`}
              size="small"
              sx={{
                height: 24,
                fontSize: 11,
                bgcolor: alpha(theme.palette.secondary.main, 0.1),
                color: 'secondary.main',
                fontWeight: 600,
              }}
            />
            <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 0.5 }}>
              <Clock size={14} color={theme.palette.text.secondary} />
              <Chip
                label={r.reportTime === 'day' ? 'Day' : 'Night'}
                size="small"
                sx={{
                  height: 22,
                  fontSize: 10,
                  bgcolor: r.reportTime === 'day' 
                    ? alpha(theme.palette.warning.main, 0.15)
                    : alpha(theme.palette.info.main, 0.15),
                  color: r.reportTime === 'day' ? 'warning.main' : 'info.main',
                }}
              />
            </Box>
          </Box>
        ))}
      </Box>
      
      {/* Enhanced Pagination controls */}
      {pagination && (
        <Box sx={{ 
          p: { xs: 2, sm: 2.5 }, 
          borderTop: `1px solid ${alpha(theme.palette.divider, 0.12)}`,
          bgcolor: alpha(theme.palette.background.paper, 0.5),
          backdropFilter: 'blur(10px)',
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          flexWrap: 'wrap',
          gap: { xs: 2, sm: 3 },
        }}>
          {/* Page size selector */}
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5, flexWrap: 'wrap' }}>
            <Typography variant="body2" color="text.secondary" sx={{ fontSize: 13, fontWeight: 500 }}>
              Show
            </Typography>
            <FormControl size="small" sx={{ minWidth: 90 }}>
              <Select
                value={pageSize}
                onChange={(e) => handlePageSizeChange(e.target.value as number)}
                displayEmpty
                sx={{
                  borderRadius: 2,
                  fontSize: 13,
                  '& .MuiOutlinedInput-notchedOutline': {
                    borderColor: alpha(theme.palette.divider, 0.3),
                  },
                  '&:hover .MuiOutlinedInput-notchedOutline': {
                    borderColor: theme.palette.primary.main,
                  },
                }}
              >
                <MenuItem value={10}>10</MenuItem>
                <MenuItem value={20}>20</MenuItem>
                <MenuItem value={50}>50</MenuItem>
                <MenuItem value={100}>100</MenuItem>
              </Select>
            </FormControl>
            <Typography variant="body2" color="text.secondary" sx={{ fontSize: 13, fontWeight: 500 }}>
              per page
            </Typography>
          </Box>

          {/* Page info */}
          <Typography 
            variant="body2" 
            color="text.secondary" 
            sx={{ 
              fontSize: 13,
              fontWeight: 500,
              px: 2,
              py: 0.5,
              borderRadius: 2,
              bgcolor: alpha(theme.palette.primary.main, 0.08),
              color: 'primary.main',
            }}
          >
            Showing {pagination.startIndex} to {pagination.endIndex} of {pagination.total} results
          </Typography>

          {/* Pagination controls */}
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, flexWrap: 'wrap' }}>
            {/* Previous button */}
            <Button
              variant="outlined"
              size="small"
              onClick={() => setCurrentPage(currentPage - 1)}
              disabled={!pagination.hasPrevPage}
              startIcon={<ChevronLeft size={18} />}
              sx={{
                borderRadius: 2,
                px: 2,
                py: 0.8,
                fontSize: 13,
                fontWeight: 600,
                borderWidth: 1.5,
                '&:hover': {
                  borderWidth: 1.5,
                  transform: 'translateX(-2px)',
                },
                '&.Mui-disabled': {
                  opacity: 0.4,
                },
                transition: 'all 0.2s cubic-bezier(0.4, 0, 0.2, 1)',
              }}
            >
              Previous
            </Button>

            {/* Page numbers */}
            <Box sx={{ display: 'flex', gap: 0.5, alignItems: 'center' }}>
              {pageNumbers.map((page, index) => (
                <Box key={index}>
                  {page === '...' ? (
                    <Typography 
                      variant="body2" 
                      sx={{ 
                        px: 1.5, 
                        py: 0.5, 
                        color: 'text.secondary',
                        display: 'flex',
                        alignItems: 'center',
                        fontSize: 14,
                      }}
                    >
                      ...
                    </Typography>
                  ) : (
                    <Button
                      variant={pagination.currentPage === page ? 'contained' : 'outlined'}
                      size="small"
                      onClick={() => setCurrentPage(page as number)}
                      sx={{ 
                        minWidth: 40,
                        height: 36,
                        px: 1.5,
                        fontSize: 13,
                        fontWeight: pagination.currentPage === page ? 700 : 600,
                        borderRadius: 2,
                        borderWidth: pagination.currentPage === page ? 0 : 1.5,
                        ...(pagination.currentPage === page && {
                          background: `linear-gradient(135deg, ${theme.palette.primary.main} 0%, ${theme.palette.primary.dark} 100%)`,
                          boxShadow: `0 4px 12px ${alpha(theme.palette.primary.main, 0.35)}`,
                          '&:hover': {
                            transform: 'translateY(-2px)',
                            boxShadow: `0 6px 16px ${alpha(theme.palette.primary.main, 0.45)}`,
                          },
                        }),
                        ...(pagination.currentPage !== page && {
                          '&:hover': {
                            borderColor: theme.palette.primary.main,
                            bgcolor: alpha(theme.palette.primary.main, 0.08),
                            transform: 'translateY(-1px)',
                          },
                        }),
                        transition: 'all 0.2s cubic-bezier(0.4, 0, 0.2, 1)',
                      }}
                    >
                      {page}
                    </Button>
                  )}
                </Box>
              ))}
            </Box>

            {/* Manual page input */}
            <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5 }}>
              <Typography variant="body2" color="text.secondary" sx={{ fontSize: 12 }}>
                Go to
              </Typography>
              <TextField
                size="small"
                value={manualPageInput}
                onChange={(e) => handleManualPageChange(e.target.value)}
                onKeyPress={(e) => {
                  if (e.key === 'Enter') {
                    handleManualPageSubmit();
                  }
                }}
                placeholder={pagination.currentPage.toString()}
                inputProps={{
                  style: { 
                    textAlign: 'center',
                    fontSize: 13,
                    padding: '6px 8px',
                    width: '50px',
                  }
                }}
                sx={{
                  width: 70,
                  '& .MuiOutlinedInput-root': {
                    borderRadius: 2,
                    fontSize: 13,
                    '& fieldset': {
                      borderColor: alpha(theme.palette.divider, 0.3),
                    },
                    '&:hover fieldset': {
                      borderColor: theme.palette.primary.main,
                    },
                    '&.Mui-focused fieldset': {
                      borderColor: theme.palette.primary.main,
                    },
                  },
                }}
              />
              <Typography variant="body2" color="text.secondary" sx={{ fontSize: 12 }}>
                / {pagination.totalPages}
              </Typography>
            </Box>

            {/* Next button */}
            <Button
              variant="outlined"
              size="small"
              onClick={() => setCurrentPage(currentPage + 1)}
              disabled={!pagination.hasNextPage}
              endIcon={<ChevronRight size={18} />}
              sx={{
                borderRadius: 2,
                px: 2,
                py: 0.8,
                fontSize: 13,
                fontWeight: 600,
                borderWidth: 1.5,
                '&:hover': {
                  borderWidth: 1.5,
                  transform: 'translateX(2px)',
                },
                '&.Mui-disabled': {
                  opacity: 0.4,
                },
                transition: 'all 0.2s cubic-bezier(0.4, 0, 0.2, 1)',
              }}
            >
              Next
            </Button>
          </Box>
        </Box>
      )}
    </Box>
  );
}



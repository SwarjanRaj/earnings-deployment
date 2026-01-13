import { Box, Stack, Fade, Grow } from '@mui/material';
import { useState, useEffect } from 'react';
import { useSelector } from 'react-redux';
import { useSearchParams } from 'react-router-dom';
import HeaderBar from './components/HeaderBar';
import DateRangePicker, { type DateFilterType, type DateRangeParams } from './components/DateRangePicker';
import EarningsTable from './components/EarningsTable';
import Footer from './components/Footer';
import { useRefreshMutation } from '../../services/authApi';
import type { RootState } from '../../app/store';
// Imports removed
export default function Dashboard() {
  console.log('Dashboard component loaded');
  const [activeFilter, setActiveFilter] = useState<DateFilterType | null>(null);
  const [filterParams, setFilterParams] = useState<DateRangeParams>({});
  const [searchParams] = useSearchParams();
  const [refresh] = useRefreshMutation();
  const isAuthenticated = useSelector((state: RootState) => state.auth.user !== null);
  const [mounted, setMounted] = useState(false);

  // Fetch stats for dashboard cards
  // Unused data queries removed

  useEffect(() => {
    setMounted(true);
  }, []);

  // Handle OAuth success
  useEffect(() => {
    const oauthSuccess = searchParams.get('oauth');
    if (oauthSuccess === 'success' && !isAuthenticated) {
      console.log('OAuth success detected, attempting to refresh authentication...');
      refresh().unwrap().catch(error => {
        console.error('Failed to refresh after OAuth:', error);
      });
    }
  }, [searchParams, isAuthenticated, refresh]);

  const handleDateRangeChange = (params: DateRangeParams) => {
    setFilterParams(params);
    // Determine the filter type from the params
    if (params.today) {
      setActiveFilter('today');
    } else if (params.yesterday) {
      setActiveFilter('yesterday');
    } else if (params.tomorrow) {
      setActiveFilter('tomorrow');
    } else if (params['this-week']) {
      setActiveFilter('this-week');
    } else if (params['next-week']) {
      setActiveFilter('next-week');
    } else if (params.startDate && params.endDate) {
      setActiveFilter('date-range');
    } else if (params.specificDate) {
      setActiveFilter('specific-date');
    } else if (params.year && params.month) {
      setActiveFilter('month');
    } else if (params.year && params.quarter) {
      setActiveFilter('quarter');
    } else {
      setActiveFilter(null);
    }
  };

  // Stats for dashboard cards
  // const stats = {
  //   totalRecords: publicPreviewData?.pagination?.total || 0,
  //   todayCount: todayData?.pagination?.total || 0,
  //   tomorrowCount: tomorrowData?.pagination?.total || 0,
  //   thisWeekCount: thisWeekData?.pagination?.total || 0,
  // };

  return (
    <Box
      sx={{
        width: '100%',
        minHeight: '100vh',
        position: 'relative',
        display: 'flex',
        flexDirection: 'column',
        '&::before': {
          content: '""',
          position: 'fixed',
          top: 0,
          left: 0,
          right: 0,
          bottom: 0,
          background: (t) => t.palette.mode === 'light'
            ? 'linear-gradient(135deg, #f5f7fa 0%, #e8ecf1 50%, #c3cfe2 100%)'
            : 'linear-gradient(135deg, #0f0f23 0%, #1a1a2e 50%, #0f0f23 100%)',
          zIndex: -1,
        },
      }}
    >
      <Box
        sx={{
          width: '100%',
          maxWidth: { xs: '100%', sm: '100%', md: '1400px', lg: '1600px' },
          mx: 'auto',
          px: { xs: 2, sm: 3, md: 4, lg: 6 },
          py: { xs: 3, sm: 4, md: 5, lg: 6 },
          position: 'relative',
          zIndex: 1,
          flex: 1,
          display: 'flex',
          flexDirection: 'column',
        }}
      >
        <Stack
          spacing={{ xs: 3, sm: 4, md: 5, lg: 6 }}
          sx={{
            width: '100%',
            flex: 1,
            display: 'flex',
            flexDirection: 'column',
          }}
        >
          <Fade in={mounted} timeout={600}>
            <Box>
              <HeaderBar />
            </Box>
          </Fade>

          {/* Statistics Cards */}


          {isAuthenticated && (
            <Grow in={mounted} timeout={1000}>
              <Box sx={{
                display: 'flex',
                justifyContent: 'center',
                width: '100%',
              }}>
                <DateRangePicker
                  onDateRangeChange={handleDateRangeChange}
                  currentParams={filterParams}
                />
              </Box>
            </Grow>
          )}

          <Fade in={mounted} timeout={1200}>
            <Box>
              <EarningsTable
                activeFilter={activeFilter}
                filterParams={filterParams}
              />
            </Box>
          </Fade>

        </Stack>

        {/* Footer at bottom */}
        <Fade in={mounted} timeout={1200}>
          <Box sx={{ mt: 'auto', pt: { xs: 4, md: 6 } }}>
            <Footer />
          </Box>
        </Fade>
      </Box>
    </Box>
  );
}

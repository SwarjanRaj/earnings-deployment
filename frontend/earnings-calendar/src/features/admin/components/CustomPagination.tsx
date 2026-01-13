import React from 'react';
import {
  Box,
  Button,
  Typography,
  Select,
  MenuItem,
  FormControl,
  alpha,
  useTheme,
} from '@mui/material';
import { ChevronLeft, ChevronRight } from 'lucide-react';
import type { PaginationInfo } from '../../../services/adminApi';

interface CustomPaginationProps {
  pagination: PaginationInfo;
  onPageChange: (page: number) => void;
  onPageSizeChange: (pageSize: number) => void;
}

export default function CustomPagination({ 
  pagination, 
  onPageChange, 
  onPageSizeChange 
}: CustomPaginationProps) {
  const theme = useTheme();
  const { currentPage, totalPages, total, pageSize, startIndex, endIndex } = pagination;

  // Generate page numbers to display
  const getPageNumbers = () => {
    const pages: (number | string)[] = [];
    const maxVisiblePages = 6; // Show 6 page numbers + ellipsis + last page
    
    if (totalPages <= maxVisiblePages) {
      // Show all pages if total is small
      for (let i = 1; i <= totalPages; i++) {
        pages.push(i);
      }
    } else {
      // Always show first page
      pages.push(1);
      
      // Calculate range around current page
      const leftBound = Math.max(2, currentPage - 2);
      const rightBound = Math.min(totalPages - 1, currentPage + 2);
      
      // Add ellipsis if there's a gap
      if (leftBound > 2) {
        pages.push('...');
      }
      
      // Add pages around current page
      for (let i = leftBound; i <= rightBound; i++) {
        pages.push(i);
      }
      
      // Add ellipsis if there's a gap
      if (rightBound < totalPages - 1) {
        pages.push('...');
      }
      
      // Always show last page
      if (totalPages > 1) {
        pages.push(totalPages);
      }
    }
    
    return pages;
  };

  const pageNumbers = getPageNumbers();

  return (
    <Box sx={{ 
      display: 'flex', 
      justifyContent: 'space-between', 
      alignItems: 'center', 
      p: { xs: 2, sm: 2.5 },
      borderTop: `1px solid ${alpha(theme.palette.divider, 0.12)}`,
      bgcolor: alpha(theme.palette.background.paper, 0.5),
      backdropFilter: 'blur(10px)',
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
            onChange={(e) => onPageSizeChange(e.target.value as number)}
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
            <MenuItem value={25}>25</MenuItem>
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
        Showing {startIndex} to {endIndex} of {total} results
      </Typography>

      {/* Pagination controls */}
      <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, flexWrap: 'wrap' }}>
        {/* Previous button */}
        <Button
          variant="outlined"
          size="small"
          onClick={() => onPageChange(currentPage - 1)}
          disabled={currentPage === 1}
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
            <React.Fragment key={index}>
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
                  variant={currentPage === page ? 'contained' : 'outlined'}
                  size="small"
                  onClick={() => onPageChange(page as number)}
                  sx={{ 
                    minWidth: 40,
                    height: 36,
                    px: 1.5,
                    fontSize: 13,
                    fontWeight: currentPage === page ? 700 : 600,
                    borderRadius: 2,
                    borderWidth: currentPage === page ? 0 : 1.5,
                    ...(currentPage === page && {
                      background: `linear-gradient(135deg, ${theme.palette.primary.main} 0%, ${theme.palette.primary.dark} 100%)`,
                      boxShadow: `0 4px 12px ${alpha(theme.palette.primary.main, 0.35)}`,
                      '&:hover': {
                        transform: 'translateY(-2px)',
                        boxShadow: `0 6px 16px ${alpha(theme.palette.primary.main, 0.45)}`,
                      },
                    }),
                    ...(currentPage !== page && {
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
            </React.Fragment>
          ))}
        </Box>

        {/* Next button */}
        <Button
          variant="outlined"
          size="small"
          onClick={() => onPageChange(currentPage + 1)}
          disabled={currentPage === totalPages}
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
  );
} 
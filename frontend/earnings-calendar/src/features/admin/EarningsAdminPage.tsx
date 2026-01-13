import {
  Box,
  Button,
  TextField,
  Checkbox,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Typography,
  InputAdornment,
  Paper,
  alpha,
  Fade,
  Stack,
  Chip,
} from '@mui/material';
import { Upload, Plus, Trash2, Edit, Search, TrendingUp } from 'lucide-react';
import { useTheme } from '@mui/material';
import {
  DataGrid,
  type GridColDef,
  type GridRenderCellParams,
} from '@mui/x-data-grid';
import { useState } from 'react';

import {
  useListEarningsQuery,
  useUpdateEarningMutation,
  useBulkDeleteEarningsMutation,
  useAddEarningMutation,
  useBulkUploadMutation,
  type EarningsRow,
} from '../../services/adminApi';

import UploadCsvDialog   from './components/UploadCsvDialog';
import AddRowDialog      from './components/AddRowDialog';
import EditRowDialog     from './components/EditRowDialog';

/* …imports unchanged… */

export default function EarningsAdminPage() {
  const theme = useTheme();
  /* hooks */
  const [editRow, setEditRow] = useState<EarningsRow | null>(null);
  const [bulkDeleteOpen, setBulkDeleteOpen] = useState(false);
  const [uploadOpen, setUploadOpen] = useState(false);
  const [selectedRows, setSelectedRows] = useState<string[]>([]);
  const [selectAllMode, setSelectAllMode] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');
  
  const [addOpen, setAddOpen]       = useState(false);
  const [editMode, setEditMode] = useState(false);

  // RTK Query hooks
  const [paginationModel, setPaginationModel] = useState({
    page: 0,
    pageSize: 25, // Start with 25 instead of 10
  });

  const { data, isLoading } = useListEarningsQuery({
    page: paginationModel.page + 1, // API uses 1-based pagination
    pageSize: paginationModel.pageSize,
    search: searchTerm || undefined, // Include search term in the query
  });

  const [updateEarning] = useUpdateEarningMutation();
  const [bulkDelete] = useBulkDeleteEarningsMutation();
  const [addEarning] = useAddEarningMutation();
  const [bulkUpload] = useBulkUploadMutation();

  const displayRows = data?.data || [];
  const pagination = data?.pagination;

  // Debug logging to check data
  console.log('EarningsAdminPage - Data received:', {
    paginatedData: data,
    displayRows: displayRows.slice(0, 3), // Log first 3 rows
    displayLoading: isLoading,
    pagination
  });

  // Log sample row data to check numeric values
  if (displayRows.length > 0) {
    const sampleRow = displayRows[0];
    console.log('Sample row data:', {
      id: sampleRow.id,
      ticker: sampleRow.ticker,
      marketCap: sampleRow.marketCap,
      revenue: sampleRow.revenue,
      eps: sampleRow.eps,
      peRatio: sampleRow.peRatio,
      earningsDate: sampleRow.earningsDate,
      marketCapType: typeof sampleRow.marketCap,
      revenueType: typeof sampleRow.revenue,
      epsType: typeof sampleRow.eps,
      peRatioType: typeof sampleRow.peRatio,
      fullRow: sampleRow // Log the entire row to see all fields
    });
    
    // Log all keys in the row to see the exact field names
    console.log('All row keys:', Object.keys(sampleRow));
    console.log('Full row object:', sampleRow);
  }


  // Select all functionality - select ALL records across all pages
  const allSelected = Boolean(pagination && (selectAllMode ? selectedRows.length === 0 : selectedRows.length === pagination.total));
  const someSelected = Boolean(selectedRows.length > 0 && (selectAllMode ? selectedRows.length < (pagination?.total || 0) : selectedRows.length < (pagination?.total || 0)));

  const handleSelectAll = (checked: boolean) => {
    if (checked) {
      // Select all records across all pages
      setSelectAllMode(true);
      setSelectedRows([]); // Empty array means all records are selected (none are deselected)
      console.log('Select All Mode: Enabled - Will select all', pagination?.total, 'records across all pages');
    } else {
      // Deselect all
      setSelectAllMode(false);
      setSelectedRows([]);
      console.log('Select All Mode: Disabled - Cleared all selections');
    }
  };

  const handleSearchChange = (newSearchTerm: string) => {
    setSearchTerm(newSearchTerm);
    setSelectedRows([]); // Clear selection
    setPaginationModel(prev => ({ ...prev, page: 0 })); // Reset to first page when searching
  };

  const handleBulkDelete = async () => {
    try {
      if (selectAllMode) {
        console.log('Attempting to delete ALL records:', pagination?.total, 'records');
        
        if (!pagination || pagination.total === 0) {
          alert('No records to delete.');
          return;
        }
        
        const confirmed = window.confirm(
          `Are you sure you want to delete ALL ${pagination.total} records? This action cannot be undone.`
        );
        
        if (!confirmed) {
          return;
        }
        
        // Call the delete all endpoint directly
        console.log('Select All Delete: Deleting all', pagination.total, 'records');
        
        try {
          const response = await fetch('/api/stock/delete-all', {
            method: 'DELETE',
            headers: {
              'Content-Type': 'application/json',
            },
          });
          
          if (!response.ok) {
            throw new Error(`HTTP error! status: ${response.status}`);
          }
          
          const result = await response.json();
          console.log('Delete all successful:', result);
          setSelectedRows([]);
          setSelectAllMode(false);
          setBulkDeleteOpen(false);
          alert(`Successfully deleted all ${result.deletedCount} records`);
        } catch (error) {
          console.error('Delete all failed:', error);
          alert('Failed to delete all records. Please try again.');
        }
        return;
      }
      
      console.log('Attempting to delete:', selectedRows);
      
      // Validate that we have rows to delete
      if (!selectedRows || selectedRows.length === 0) {
        alert('No rows selected for deletion.');
        return;
      }
      
      // Show progress for large deletions
      if (selectedRows.length > 100) {
        console.log(`Deleting ${selectedRows.length} records - this may take a moment...`);
      }
      
      console.log('Calling bulkDelete with IDs:', selectedRows);
      const result = await bulkDelete(selectedRows).unwrap();
      console.log('Bulk delete successful:', result);
      
      setSelectedRows([]);
      setBulkDeleteOpen(false);
      
      // Show success message
      if (result.deletedCount > 0) {
        console.log(`Successfully deleted ${result.deletedCount} records`);
      } else {
        console.log('No records were deleted (they may have already been removed)');
      }
    } catch (error: unknown) {
      console.error('Bulk delete failed:', error);
      
      // Provide more specific error messages
      if (error && typeof error === 'object') {
        const rtkError = error as { status?: number; data?: { message?: string }; message?: string };
        console.error('Error details:', {
          status: rtkError.status,
          data: rtkError.data,
          message: rtkError.message,
          originalError: error
        });
        
        if (rtkError.status === 401) {
        alert('Authentication failed. Please log in again.');
        } else if (rtkError.status === 403) {
        alert('You do not have permission to delete these records.');
        } else if (rtkError.status === 404) {
        alert('Some records were not found and could not be deleted.');
        } else if (rtkError.status === 500) {
        alert('Server error during bulk delete. Please try again with fewer records or contact support.');
        } else if (rtkError.data?.message) {
          alert(`Delete failed: ${rtkError.data.message}`);
        } else if (rtkError.message) {
          alert(`Delete failed: ${rtkError.message}`);
        } else {
          alert('An unexpected error occurred during bulk delete. Please try again.');
        }
      } else {
        alert('An unexpected error occurred during bulk delete. Please try again.');
      }
    }
  };

  /* columns */
  const cols: GridColDef[] = [
    {
      field: 'select',
      headerName: '',
      width: 60,
      sortable: false,
      renderHeader: () => (
        <Box sx={{ display: 'flex', justifyContent: 'center', alignItems: 'center', height: '100%' }}>
          <Checkbox
            checked={allSelected}
            indeterminate={someSelected}
            onChange={(e) => handleSelectAll(e.target.checked)}
          />
        </Box>
      ),
      renderCell: (p: GridRenderCellParams) => {
        const isSelected = selectAllMode ? !selectedRows.includes(p.row.id) : selectedRows.includes(p.row.id);
        return (
          <Box sx={{ display: 'flex', justifyContent: 'center', alignItems: 'center', height: '100%' }}>
            <Checkbox
              checked={isSelected}
              onChange={(e) => {
                if (selectAllMode) {
                  // In select all mode, selectedRows contains the IDs of records that are DESELECTED
                  if (e.target.checked) {
                    // User is checking the box, so remove from deselected list (i.e., select it)
                    setSelectedRows(selectedRows.filter(id => id !== p.row.id));
                  } else {
                    // User is unchecking the box, so add to deselected list
                    if (!selectedRows.includes(p.row.id)) {
                      setSelectedRows([...selectedRows, p.row.id]);
                    }
                  }
                } else {
                  // Normal individual selection
                  if (e.target.checked) {
                    setSelectedRows([...selectedRows, p.row.id]);
                  } else {
                    setSelectedRows(selectedRows.filter(id => id !== p.row.id));
                  }
                }
              }}
            />
          </Box>
        );
      },
    },
    { 
      field: 'ticker', 
      headerName: 'Ticker Symbol', 
      width: 120,
      renderCell: (params) => {
        console.log('ticker renderCell called with:', params);
        return params.value;
      }
    },
    { field: 'companyName', headerName: 'Company Name', flex: 1, minWidth: 250 },
    { field: 'sector', headerName: 'Sector', width: 180 },
    { 
      field: 'marketCap', 
      headerName: 'Market Cap (Billion USD)', 
      width: 180,
      renderCell: (params) => {
        console.log('marketCap renderCell called with:', params);
        const value = params.row.marketCap;
        if (value === null || value === undefined || value === '') return '';
        const numValue = parseFloat(value);
        if (isNaN(numValue)) return '';
        const result = numValue.toFixed(5);
        console.log('marketCap formatted result:', result);
        return result;
      }
    },
    { 
      field: 'revenue', 
      headerName: 'Revenue (Billion USD)', 
      width: 180,
      renderCell: (params) => {
        console.log('revenue renderCell called with:', params);
        const value = params.row.revenue;
        if (value === null || value === undefined || value === '') return '';
        const numValue = parseFloat(value);
        if (isNaN(numValue)) return '';
        const result = numValue.toFixed(5);
        console.log('revenue formatted result:', result);
        return result;
      }
    },
    { 
      field: 'eps', 
      headerName: 'Earnings Per Share (USD)', 
      width: 200,
      renderCell: (params) => {
        console.log('eps renderCell called with:', params);
        const value = params.row.eps;
        if (value === null || value === undefined || value === '') return '';
        const numValue = parseFloat(value);
        if (isNaN(numValue)) return '';
        const result = numValue.toFixed(5);
        console.log('eps formatted result:', result);
        return result;
      }
      },
    { 
      field: 'peRatio', 
      headerName: 'Price to Earnings Ratio', 
      width: 180,
      renderCell: (params) => {
        console.log('peRatio renderCell called with:', params);
        const value = params.row.peRatio;
        if (value === null || value === undefined || value === '') return '';
        const numValue = parseFloat(value);
        if (isNaN(numValue)) return '';
        const result = numValue.toFixed(5);
        console.log('peRatio formatted result:', result);
        return result;
      }
       },
    { 
      field: 'earningsDate', 
      headerName: 'Earnings Date', 
      width: 140,
      renderCell: (params) => {
        console.log('earningsDate renderCell called with:', params);
        const value = params.row.earningsDate;
        if (!value) return '';
        // Convert to Date object and format
        const date = new Date(value);
        if (isNaN(date.getTime())) return '';
        const result = date.toISOString().split('T')[0];
        console.log('earningsDate formatted result:', result);
        return result;
      }
    },
    { field: 'fiscalYear', headerName: 'Fiscal Year', width: 120 },
    { field: 'fiscalQuarter', headerName: 'Fiscal Quarter', width: 140 },
  ];

  /* UI */
  return (
    <Box sx={{ width: '100%' }}>
      {/* Header Section */}
      <Fade in={true} timeout={400}>
        <Paper
          elevation={0}
          sx={{
            p: { xs: 2.5, sm: 3, md: 3.5 },
            mb: 3,
            borderRadius: 2,
            bgcolor: alpha(theme.palette.background.paper, 0.95),
            backdropFilter: 'blur(20px)',
            border: `1px solid ${alpha(theme.palette.divider, 0.12)}`,
            boxShadow: theme.customShadows.card,
            transition: 'all 0.3s cubic-bezier(0.4, 0, 0.2, 1)',
            '&:hover': {
              boxShadow: theme.customShadows.cardHover,
            },
          }}
        >
          <Stack direction="row" spacing={2.5} alignItems="center" mb={3}>
            <Box
              sx={{
                width: 56,
                height: 56,
                borderRadius: 2,
                background: `linear-gradient(135deg, ${theme.palette.primary.main} 0%, ${theme.palette.primary.dark} 100%)`,
        display: 'flex', 
        alignItems: 'center',
                justifyContent: 'center',
                boxShadow: `0 6px 20px ${alpha(theme.palette.primary.main, 0.35)}`,
                transition: 'all 0.3s cubic-bezier(0.4, 0, 0.2, 1)',
                '&:hover': {
                  transform: 'scale(1.05) rotate(5deg)',
                  boxShadow: `0 8px 24px ${alpha(theme.palette.primary.main, 0.45)}`,
                },
              }}
            >
              <TrendingUp size={28} color="white" />
            </Box>
            <Box sx={{ flex: 1 }}>
              <Typography 
                variant="h5" 
                fontWeight={700}
                sx={{ 
                  mb: 0.5,
                  background: `linear-gradient(135deg, ${theme.palette.primary.main} 0%, ${theme.palette.primary.dark} 100%)`,
                  backgroundClip: 'text',
                  WebkitBackgroundClip: 'text',
                  WebkitTextFillColor: 'transparent',
                }}
              >
                Earnings Management
              </Typography>
              <Typography variant="body2" color="text.secondary" sx={{ fontSize: 14 }}>
                Manage earnings data and financial records
              </Typography>
            </Box>
          </Stack>

          {/* Toolbar Actions */}
          <Stack 
            direction={{ xs: 'column', sm: 'row' }} 
            spacing={2} 
            justifyContent="space-between"
            alignItems={{ xs: 'stretch', sm: 'center' }}
            sx={{ flexWrap: 'wrap', gap: 2 }}
          >
        <Box sx={{ display: 'flex', gap: 2, flexWrap: 'wrap', alignItems: 'center' }}>
              <Button
                variant="outlined"
                startIcon={<Upload size={18} />}
                onClick={() => setUploadOpen(true)}
                sx={{
                  borderRadius: 2,
                  px: 2.5,
                  py: 1.2,
                  fontWeight: 600,
                  fontSize: 14,
                  letterSpacing: '0.3px',
                  borderWidth: 1.5,
                  '&:hover': {
                    borderWidth: 1.5,
                    transform: 'translateY(-2px)',
                    boxShadow: `0 4px 12px ${alpha(theme.palette.primary.main, 0.2)}`,
                  },
                  transition: 'all 0.3s cubic-bezier(0.4, 0, 0.2, 1)',
                }}
              >
                Upload CSV
              </Button>
              <Button
                variant="contained"
                startIcon={<Plus size={18} />}
                onClick={() => setAddOpen(true)}
                sx={{
                  borderRadius: 2,
                  px: 2.5,
                  py: 1.2,
                  fontWeight: 600,
                  fontSize: 14,
                  letterSpacing: '0.3px',
                  background: `linear-gradient(135deg, ${theme.palette.primary.main} 0%, ${theme.palette.primary.dark} 100%)`,
                  boxShadow: `0 4px 14px ${alpha(theme.palette.primary.main, 0.35)}`,
                  '&:hover': {
                    transform: 'translateY(-2px)',
                    boxShadow: `0 6px 20px ${alpha(theme.palette.primary.main, 0.45)}`,
                    background: `linear-gradient(135deg, ${theme.palette.primary.dark} 0%, ${theme.palette.primary.main} 100%)`,
                  },
                  transition: 'all 0.3s cubic-bezier(0.4, 0, 0.2, 1)',
                }}
              >
                Add Row
              </Button>
          
          {/* Search */}
          <TextField
            size="small"
            placeholder="Search by ticker, company, or sector..."
            value={searchTerm}
            onChange={(e) => handleSearchChange(e.target.value)}
            InputProps={{
                  startAdornment: (
                    <InputAdornment position="start">
                      <Search size={18} />
                    </InputAdornment>
                  ),
                }}
                sx={{
                  minWidth: { xs: '100%', sm: 300 },
                  '& .MuiOutlinedInput-root': {
                    borderRadius: 2,
                    '&:hover': {
                      '& .MuiOutlinedInput-notchedOutline': {
                        borderColor: theme.palette.primary.main,
                      },
                    },
                    '&.Mui-focused': {
                      '& .MuiOutlinedInput-notchedOutline': {
                        borderWidth: 2,
                        borderColor: theme.palette.primary.main,
                      },
                    },
                  },
                }}
          />
        </Box>

        {/* Selection Actions */}
        {(selectedRows.length > 0 || selectAllMode) && (
              <Fade in={true}>
                <Box sx={{ display: 'flex', gap: 1.5, alignItems: 'center', flexWrap: 'wrap' }}>
            {selectAllMode && (
                    <Chip
                      label={`SELECT ALL: ${(pagination?.total || 0) - selectedRows.length} selected`}
                      color="warning"
                      sx={{
                        fontWeight: 700,
                        fontSize: 12,
                      }}
                    />
            )}
                          <Button
                variant="outlined"
                    startIcon={<Edit size={18} />}
                onClick={() => {
                  if (selectedRows.length === 1) {
                    const row = displayRows.find(r => r.id === selectedRows[0]);
                    if (row) {
                      setEditRow(row);
                      setEditMode(true);
                    }
                  }
                }}
                disabled={selectedRows.length !== 1 || selectAllMode}
                    sx={{
                      borderRadius: 2,
                      px: 2.5,
                      py: 1.2,
                      fontWeight: 600,
                      fontSize: 14,
                      letterSpacing: '0.3px',
                      borderWidth: 1.5,
                      '&:hover:not(:disabled)': {
                        borderWidth: 1.5,
                        transform: 'translateY(-2px)',
                        boxShadow: `0 4px 12px ${alpha(theme.palette.primary.main, 0.2)}`,
                      },
                      transition: 'all 0.3s cubic-bezier(0.4, 0, 0.2, 1)',
                    }}
              >
                Edit Selected ({selectedRows.length})
              </Button>
              <Button
                    variant="contained"
                color="error"
                    startIcon={<Trash2 size={18} />}
                onClick={() => setBulkDeleteOpen(true)}
                    sx={{
                      borderRadius: 2,
                      px: 2.5,
                      py: 1.2,
                      fontWeight: 600,
                      fontSize: 14,
                      letterSpacing: '0.3px',
                      boxShadow: `0 4px 14px ${alpha(theme.palette.error.main, 0.35)}`,
                      '&:hover': {
                        transform: 'translateY(-2px)',
                        boxShadow: `0 6px 20px ${alpha(theme.palette.error.main, 0.45)}`,
                      },
                      transition: 'all 0.3s cubic-bezier(0.4, 0, 0.2, 1)',
                    }}
              >
                Delete Selected ({selectAllMode ? (pagination?.total || 0) - selectedRows.length : selectedRows.length})
              </Button>
          </Box>
              </Fade>
        )}
          </Stack>
        </Paper>
      </Fade>

      {/* Table Section */}
      <Fade in={true} timeout={600}>
        <Paper
          elevation={0}
          sx={{
            borderRadius: 2,
            overflow: 'hidden',
            bgcolor: alpha(theme.palette.background.paper, 0.95),
            backdropFilter: 'blur(20px)',
            border: `1px solid ${alpha(theme.palette.divider, 0.12)}`,
            boxShadow: theme.customShadows.card,
            display: 'flex',
            flexDirection: 'column',
            transition: 'all 0.3s cubic-bezier(0.4, 0, 0.2, 1)',
            '&:hover': {
              boxShadow: theme.customShadows.cardHover,
            },
          }}
        >
      <DataGrid
        rows={displayRows}
        columns={cols}
        loading={isLoading}
            autoHeight={false}
        disableRowSelectionOnClick
        pagination
        pageSizeOptions={[10, 25, 50, 100]}
        paginationModel={paginationModel}
        rowCount={pagination?.total || 0}
        paginationMode="server"
        initialState={{
          pagination: {
            paginationModel: {
              pageSize: 25,
            },
          },
        }}
        onPaginationModelChange={(model) => {
          setPaginationModel(model);
        }}
        sx={{
              border: 'none',
              minHeight: 500,
          '& .MuiDataGrid-cell': {
                borderBottom: `1px solid ${alpha(theme.palette.divider, 0.08)}`,
                py: 1.5,
                fontSize: 14,
              },
              '& .MuiDataGrid-cell:focus': {
                outline: 'none',
              },
              '& .MuiDataGrid-row': {
                transition: 'all 0.2s cubic-bezier(0.4, 0, 0.2, 1)',
                '&:hover': {
                  bgcolor: alpha(theme.palette.primary.main, 0.06),
                  transform: 'translateX(2px)',
                },
                '&:nth-of-type(even)': {
                  bgcolor: alpha(theme.palette.action.hover, 0.02),
                },
                '&:nth-of-type(even):hover': {
                  bgcolor: alpha(theme.palette.primary.main, 0.08),
                },
          },
          '& .MuiDataGrid-columnHeaders': {
                bgcolor: theme.palette.mode === 'light'
                  ? `linear-gradient(135deg, ${alpha(theme.palette.primary.main, 0.12)} 0%, ${alpha(theme.palette.primary.main, 0.06)} 100%)`
                  : `linear-gradient(135deg, ${alpha(theme.palette.primary.main, 0.2)} 0%, ${alpha(theme.palette.primary.main, 0.12)} 100%)`,
                borderBottom: `2px solid ${alpha(theme.palette.primary.main, 0.25)}`,
                backdropFilter: 'blur(10px)',
                '& .MuiDataGrid-columnHeaderTitle': {
                  fontWeight: 700,
                  fontSize: 12,
                  textTransform: 'uppercase',
                  letterSpacing: '0.8px',
                  color: theme.palette.mode === 'light' ? theme.palette.primary.dark : theme.palette.primary.light,
                },
                '& .MuiDataGrid-columnHeader': {
                  '&:focus': {
                    outline: 'none',
                  },
                  '&:hover': {
                    bgcolor: alpha(theme.palette.primary.main, 0.1),
                  },
                },
              },
              '& .MuiDataGrid-footerContainer': {
                borderTop: `1px solid ${alpha(theme.palette.divider, 0.12)}`,
                bgcolor: alpha(theme.palette.background.paper, 0.5),
                backdropFilter: 'blur(10px)',
              },
              '& .MuiDataGrid-virtualScroller': {
                '&::-webkit-scrollbar': {
                  width: 8,
                  height: 8,
                },
                '&::-webkit-scrollbar-track': {
                  background: alpha(theme.palette.divider, 0.05),
                },
                '&::-webkit-scrollbar-thumb': {
                  background: alpha(theme.palette.primary.main, 0.3),
                  borderRadius: 2,
                  '&:hover': {
                    background: alpha(theme.palette.primary.main, 0.5),
                  },
                },
          },
        }}
      />
        </Paper>
      </Fade>

      {/* dialogs */}
      <UploadCsvDialog
        open={uploadOpen}
        onClose={() => setUploadOpen(false)}
        onParsed={(parsed: EarningsRow[]) => {
          bulkUpload(parsed);
          setUploadOpen(false);
        }}
      />
      <AddRowDialog
        open={addOpen}
        onClose={() => setAddOpen(false)}
        onSave={(row) => {
          addEarning({
            ...row,
            fiscalYear: Number(row.fiscalYear),
            earningsDate: new Date(row.earningsDate).toISOString(),
          });
          setAddOpen(false);
        }}
      />
      <EditRowDialog
        open={editMode}
        onClose={() => {
          setEditMode(false);
          setEditRow(null);
          setSelectedRows([]);
        }}
        onSave={(updatedRow) => {
          updateEarning(updatedRow);
          setEditMode(false);
          setEditRow(null);
          setSelectedRows([]);
        }}
        row={editRow}
      />


      {/* Bulk Delete Confirmation Dialog */}
      <Dialog 
        open={bulkDeleteOpen} 
        onClose={() => setBulkDeleteOpen(false)}
        PaperProps={{
          sx: {
            borderRadius: 2,
            boxShadow: theme.customShadows.cardHover,
          },
        }}
      >
        <DialogTitle
          sx={{
            background: `linear-gradient(135deg, ${alpha(theme.palette.error.main, 0.1)} 0%, ${alpha(theme.palette.error.main, 0.05)} 100%)`,
            borderBottom: `1px solid ${alpha(theme.palette.divider, 0.12)}`,
            fontWeight: 700,
          }}
        >
          Confirm Bulk Delete
        </DialogTitle>
        <DialogContent sx={{ pt: 3 }}>
          <Typography variant="body1" sx={{ mb: 1 }}>
            Are you sure you want to delete{' '}
            <strong>
              {selectAllMode 
                ? (pagination?.total || 0) - selectedRows.length 
                : selectedRows.length
              } selected record{((selectAllMode ? (pagination?.total || 0) - selectedRows.length : selectedRows.length) !== 1) ? 's' : ''}
            </strong>?
          </Typography>
          <Typography variant="body2" color="error.main" fontWeight={600}>
            This action cannot be undone.
          </Typography>
        </DialogContent>
        <DialogActions sx={{ p: 2.5, gap: 1.5 }}>
          <Button 
            onClick={() => setBulkDeleteOpen(false)}
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
            onClick={handleBulkDelete} 
            color="error" 
            variant="contained"
            sx={{
              borderRadius: 2,
              px: 2.5,
              py: 1,
              fontWeight: 600,
              boxShadow: `0 4px 12px ${alpha(theme.palette.error.main, 0.3)}`,
              '&:hover': {
                boxShadow: `0 6px 16px ${alpha(theme.palette.error.main, 0.4)}`,
              },
            }}
          >
            Delete {selectAllMode 
              ? (pagination?.total || 0) - selectedRows.length 
              : selectedRows.length
            } Record{((selectAllMode ? (pagination?.total || 0) - selectedRows.length : selectedRows.length) !== 1) ? 's' : ''}
          </Button>
        </DialogActions>
      </Dialog>
    </Box>
  );
}

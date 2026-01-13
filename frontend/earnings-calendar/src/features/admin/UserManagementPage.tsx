import {
  Box,
  Button,
  IconButton,
  Tooltip,
  Typography,
  Paper,
  Chip,
  alpha,
  useTheme,
  Fade,
  Stack,
  Skeleton,
} from '@mui/material';
import { Trash2, Plus, Users, Shield, Mail } from 'lucide-react';
import {
  DataGrid,
  type GridColDef,
  type GridRenderCellParams,
} from '@mui/x-data-grid';

import { useState } from 'react';
import { useAuth } from '../../app/useAuth';
import {
  useListUsersQuery,
  useAddUserMutation,
  useDeleteUserMutation,
  useBulkDeleteUsersMutation,
} from '../../services/adminApi';

import AddUserDialog from './components/AddUserDialog';
import ConfirmDelete from './components/ConfirmDelete';
import CustomPagination from './components/CustomPagination';

export default function UserManagementPage() {
  const theme = useTheme();
  const { role: myRole } = useAuth();
  const [currentPage, setCurrentPage] = useState(1);
  const [pageSize, setPageSize] = useState(50);
  
  const { data: paginatedData, isLoading, error } = useListUsersQuery({
    page: currentPage,
    pageSize,
  });
  
  // Ensure all rows have stable IDs before using in DataGrid
  const rows = Array.isArray(paginatedData?.users)
    ? paginatedData.users
        .map((row, index: number) => ({
          ...row,
          id: row.id || row.email || `user-${index}`,
        }))
        .filter((row) => row.id) // Filter out any rows without IDs
    : Array.isArray(paginatedData?.data)
      ? paginatedData.data
          .map((row, index: number) => ({
            ...row,
            id: row.id || row.email || `user-${index}`,
          }))
          .filter((row) => row.id) // Filter out any rows without IDs
      : [];

  const pagination = paginatedData?.pagination;

  // Debug: log the rows received from the API
  // console.log('UserManagementPage rows:', rows); // This line is now redundant as it's handled by the new_code
  
  const [addUser]    = useAddUserMutation();
  const [deleteUser] = useDeleteUserMutation();
  const [bulkDeleteUsers] = useBulkDeleteUsersMutation();

  const [addOpen, setAddOpen] = useState(false);
  const [deleteId, setDeleteId] = useState<string | null>(null);
  const [selectedRows, setSelectedRows] = useState<string[]>([]);

  const handlePageChange = (page: number) => {
    setCurrentPage(page);
    setSelectedRows([]); // Clear selection when page changes
  };

  const handlePageSizeChange = (newPageSize: number) => {
    setPageSize(newPageSize);
    setCurrentPage(1); // Reset to first page when changing page size
    setSelectedRows([]); // Clear selection when page size changes
  };

  const handleBulkDelete = async () => {
    const selectedIds = selectedRows as string[];
    if (selectedIds.length === 0) return;
    
    try {
      await bulkDeleteUsers(selectedIds);
      setSelectedRows([]);
    } catch (error) {
      console.error('Bulk delete failed:', error);
    }
  };

  const getRoleColor = (role: string) => {
    switch (role?.toLowerCase()) {
      case 'admin':
      case 'superadmin':
      case 'super_admin':
        return 'error';
      case 'user':
        return 'primary';
      default:
        return 'default';
    }
  };

  const cols: GridColDef[] = [
    {
      field: 'select',
      headerName: '',
      width: 50,
      sortable: false,
      renderCell: (params) => {
        const rowId = String(params.row.id);
        const isSelected = selectedRows.includes(rowId);
        return (
          <Box
            onClick={(e) => {
              e.stopPropagation();
              setSelectedRows((prev) => {
                if (prev.includes(rowId)) {
                  return prev.filter((id) => id !== rowId);
                } else {
                  return [...prev, rowId];
                }
              });
            }}
            sx={{
              width: 20,
              height: 20,
              border: `2px solid ${isSelected ? theme.palette.primary.main : theme.palette.divider}`,
              borderRadius: 1,
              bgcolor: isSelected ? theme.palette.primary.main : 'transparent',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              cursor: 'pointer',
              transition: 'all 0.2s',
              '&:hover': {
                borderColor: theme.palette.primary.main,
              },
            }}
          >
            {isSelected && (
              <Box
                sx={{
                  width: 12,
                  height: 12,
                  bgcolor: 'white',
                  borderRadius: 0.5,
                }}
              />
            )}
          </Box>
        );
      },
    },
    { 
      field: 'email', 
      headerName: 'Email', 
      flex: 1,
      minWidth: 200,
      renderCell: (params) => (
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
          <Mail size={16} color={theme.palette.text.secondary} />
          <Typography 
            variant="body2" 
            fontWeight={500}
            sx={{
              opacity: params.row.suspended ? 0.5 : 1,
              textDecoration: params.row.suspended ? 'line-through' : 'none',
            }}
          >
            {params.value}
          </Typography>
          {params.row.suspended && (
            <Chip
              label="Blocked"
              size="small"
              color="error"
              sx={{ height: 20, fontSize: '0.65rem' }}
            />
          )}
        </Box>
      ),
    },
    { 
      field: 'role',  
      headerName: 'Role', 
      width: 150,
      renderCell: (params) => (
        <Chip
          label={params.value || 'user'}
          size="small"
          color={getRoleColor(params.value)}
          icon={<Shield size={14} />}
          sx={{
            fontWeight: 600,
            textTransform: 'capitalize',
          }}
        />
      ),
    },
    {
      field: 'actions',
      headerName: 'Actions',
      width: 180,
      sortable: false,
      renderCell: (p: GridRenderCellParams) => {
        if (!p.row || typeof p.row !== 'object') return null;
        const isAdminRow = p.row.role === 'admin' || p.row.role === 'superadmin' || p.row.role === 'super_admin' || p.row.role === 'SUPER_ADMIN';
        const canModify = myRole === 'superadmin' ? true : !isAdminRow;
        
        if (!canModify) return null;
        
        return (
          <Box sx={{ display: 'flex', gap: 0.5, alignItems: 'center' }}>
            {/* {isSuspended ? (
              <Tooltip title="Unblock User">
                <IconButton
                  size="small"
                  onClick={async () => {
                    try {
                      await unblockUser(p.row.id).unwrap();
                    } catch (error) {
                      console.error('Failed to unblock user:', error);
                    }
                  }}
                  sx={{
                    color: 'success.main',
                    '&:hover': {
                      bgcolor: alpha(theme.palette.success.main, 0.1),
                      transform: 'scale(1.1)',
                    },
                    transition: 'all 0.2s cubic-bezier(0.4, 0, 0.2, 1)',
                  }}
                >
                  <CheckCircle size={18} />
                </IconButton>
              </Tooltip>
            ) : (
              <Tooltip title="Block User">
                <IconButton
                  size="small"
                  onClick={async () => {
                    try {
                      await blockUser(p.row.id).unwrap();
                    } catch (error) {
                      console.error('Failed to block user:', error);
                    }
                  }}
                  sx={{
                    color: 'warning.main',
                    '&:hover': {
                      bgcolor: alpha(theme.palette.warning.main, 0.1),
                      transform: 'scale(1.1)',
                    },
                    transition: 'all 0.2s cubic-bezier(0.4, 0, 0.2, 1)',
                  }}
                >
                  <Ban size={18} />
                </IconButton>
              </Tooltip>
            )} */}
            <Tooltip title="Delete User">
              <IconButton
                size="small"
                onClick={() => setDeleteId(p.row.id)}
                sx={{
                  color: 'error.main',
                  '&:hover': {
                    bgcolor: alpha(theme.palette.error.main, 0.1),
                    transform: 'scale(1.1)',
                  },
                  transition: 'all 0.2s cubic-bezier(0.4, 0, 0.2, 1)',
                }}
              >
                <Trash2 size={18} />
              </IconButton>
            </Tooltip>
          </Box>
        );
      },
    },
  ];

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
              <Users size={28} color="white" />
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
                User Management
              </Typography>
              <Typography variant="body2" color="text.secondary" sx={{ fontSize: 14 }}>
                Manage user accounts and permissions
              </Typography>
            </Box>
          </Stack>

          <Stack 
            direction={{ xs: 'column', sm: 'row' }} 
            spacing={2} 
            justifyContent="space-between"
            alignItems={{ xs: 'stretch', sm: 'center' }}
            sx={{ flexWrap: 'wrap', gap: 2 }}
          >
        <Box>
          {(selectedRows as string[]).length > 0 && (
                <Fade in={true}>
            <Button
                    startIcon={<Trash2 size={18} />}
              variant="contained"
              color="error"
              onClick={handleBulkDelete}
                    sx={{
                      borderRadius: 2,
                      px: 3,
                      py: 1.3,
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
              Delete Selected ({(selectedRows as string[]).length})
            </Button>
                </Fade>
          )}
        </Box>
        <Button
              startIcon={<Plus size={18} />}
          variant="contained"
          onClick={() => setAddOpen(true)}
              sx={{
                borderRadius: 2,
                px: 3,
                py: 1.3,
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
              Add User
        </Button>
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
          {isLoading ? (
            <Box sx={{ p: 3 }}>
              {[...Array(5)].map((_, i) => (
                <Skeleton key={i} height={60} sx={{ mb: 1, borderRadius: 1 }} />
              ))}
            </Box>
          ) : error ? (
            <Box sx={{ p: 4, textAlign: 'center' }}>
              <Typography color="error">
                Failed to load users. Please try again.
              </Typography>
      </Box>
          ) : rows.length > 0 ? (
            <>
              <Box sx={{ flex: 1, minHeight: 450, maxHeight: 600 }}>
      <DataGrid
                  key={`datagrid-${rows.length}-${currentPage}`}
        rows={rows}
        columns={cols}
                  hideFooter
                  disableColumnMenu
                  disableColumnFilter
                  disableColumnSelector
                  getRowId={(row) => {
                    const id = row.id;
                    if (!id) {
                      console.error('Row missing id:', row);
                      return `missing-id-${Math.random()}`;
                    }
                    return String(id);
                  }}
                  sx={{
                    border: 'none',
                    height: '100%',
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
              </Box>
      {pagination && (
        <CustomPagination
          pagination={pagination}
          onPageChange={handlePageChange}
          onPageSizeChange={handlePageSizeChange}
        />
      )}
            </>
          ) : (
            <Box sx={{ p: 4, textAlign: 'center' }}>
              <Typography color="text.secondary">
                No users found.
              </Typography>
            </Box>
          )}
        </Paper>
      </Fade>

      {/* Add dialog */}
      <AddUserDialog
        open={addOpen}
        onClose={() => setAddOpen(false)}
        onSubmit={(data) => {
          addUser(data);
          setAddOpen(false);
        }}
      />

      {/* Delete confirm */}
      <ConfirmDelete
        open={!!deleteId}
        onClose={() => setDeleteId(null)}
        onConfirm={() => {
          if (deleteId) deleteUser(deleteId);
          setDeleteId(null);
        }}
      />
    </Box>
  );
}

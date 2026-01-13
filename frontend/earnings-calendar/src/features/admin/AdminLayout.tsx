import { Outlet, Link, useNavigate, useLocation } from 'react-router-dom';
import {
  Box,
  Drawer,
  List,
  ListItemButton,
  ListItemIcon,
  ListItemText,
  Toolbar,
  AppBar,
  Typography,
  Button,
  alpha,
  useTheme,
  Fade,
  Chip,
  Divider,
  IconButton,
  useMediaQuery,
} from '@mui/material';
import { LogOut, Users, TrendingUp, Shield, Home, Menu, X, MessageSquare } from 'lucide-react';
import { useState } from 'react';

const drawerWidth = 280;

/** Modern Admin Layout with animated sidebar, header, and footer */
export default function AdminLayout() {
  const theme = useTheme();
  const navigate = useNavigate();
  const location = useLocation();
  const isMobile = useMediaQuery(theme.breakpoints.down('md'));
  const [mobileOpen, setMobileOpen] = useState(false);

  const menuItems = [
    { label: 'Users', path: '/admin/users', icon: Users },
    { label: 'Earnings', path: '/admin/earnings', icon: TrendingUp },
    { label: 'Chat Management', path: '/admin/chat', icon: MessageSquare },
  ];

  const isActive = (path: string) => location.pathname === path;

  const handleDrawerToggle = () => {
    setMobileOpen(!mobileOpen);
  };

  return (
    <Box 
      sx={{ 
        display: 'flex',
        minHeight: '100vh',
        position: 'relative',
        '&::before': {
          content: '""',
          position: 'fixed',
          top: 0,
          left: 0,
          right: 0,
          bottom: 0,
          background: theme.palette.mode === 'light'
            ? 'linear-gradient(135deg, #f5f7fa 0%, #e8ecf1 50%, #c3cfe2 100%)'
            : 'linear-gradient(135deg, #0f0f23 0%, #1a1a2e 50%, #0f0f23 100%)',
          zIndex: -1,
        },
      }}
    >
      {/* Modern Sidebar */}
      <Drawer
        variant={isMobile ? 'temporary' : 'permanent'}
        open={isMobile ? mobileOpen : true}
        onClose={handleDrawerToggle}
        ModalProps={{
          keepMounted: true, // Better open performance on mobile
        }}
        sx={{
          width: drawerWidth,
          flexShrink: 0,
          '& .MuiDrawer-paper': {
            width: drawerWidth,
            boxSizing: 'border-box',
            borderRight: `1px solid ${alpha(theme.palette.divider, 0.1)}`,
            background: alpha(theme.palette.background.paper, 0.95),
            backdropFilter: 'blur(10px)',
            boxShadow: theme.customShadows.card,
          },
        }}
      >
        <Toolbar sx={{ 
          minHeight: { xs: 64, sm: 70 }!,
          borderBottom: `1px solid ${alpha(theme.palette.divider, 0.1)}`,
          justifyContent: 'space-between',
        }}>
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5, width: '100%' }}>
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
              <Shield size={24} color="white" />
            </Box>
            <Box>
              <Typography variant="h6" fontWeight={700} color="primary.main">
                Admin
              </Typography>
              <Typography variant="caption" color="text.secondary" sx={{ fontSize: 11 }}>
                Console
              </Typography>
            </Box>
          </Box>
          {isMobile && (
            <IconButton
              onClick={handleDrawerToggle}
              sx={{
                color: 'text.primary',
              }}
            >
              <X size={20} />
            </IconButton>
          )}
        </Toolbar>

        <Box sx={{ px: 2, py: 3 }}>
          <List sx={{ p: 0 }}>
            {menuItems.map((item, index) => {
              const active = isActive(item.path);
              const Icon = item.icon;
              return (
                <Fade in={true} timeout={300 + index * 100} key={item.path}>
                  <ListItemButton
                    component={Link}
                    to={item.path}
                    onClick={() => isMobile && setMobileOpen(false)}
                    sx={{
                      mb: 1,
                      borderRadius: 2,
                      py: 1.5,
                      px: 2,
                      transition: 'all 0.3s cubic-bezier(0.4, 0, 0.2, 1)',
                      bgcolor: active 
                        ? alpha(theme.palette.primary.main, 0.15)
                        : 'transparent',
                      color: active ? 'primary.main' : 'text.primary',
                      '&:hover': {
                        bgcolor: active
                          ? alpha(theme.palette.primary.main, 0.2)
                          : alpha(theme.palette.primary.main, 0.08),
                        transform: 'translateX(4px)',
                      },
                      '&::before': active ? {
                        content: '""',
                        position: 'absolute',
                        left: 0,
                        top: '50%',
                        transform: 'translateY(-50%)',
                        width: 4,
                        height: '60%',
                        background: theme.palette.primary.main,
                        borderRadius: '0 2px 2px 0',
                      } : {},
                    }}
                  >
                    <ListItemIcon sx={{ minWidth: 40 }}>
                      <Icon 
                        size={20} 
                        color={active ? theme.palette.primary.main : theme.palette.text.secondary}
                      />
                    </ListItemIcon>
                    <ListItemText 
                      primary={item.label}
                      primaryTypographyProps={{
                        fontWeight: active ? 600 : 500,
                        fontSize: 14,
                      }}
                    />
                    {active && (
                      <Chip
                        size="small"
                        label="Active"
                        sx={{
                          height: 20,
                          fontSize: 10,
                          bgcolor: theme.palette.primary.main,
                          color: 'white',
                          fontWeight: 600,
                        }}
                      />
                    )}
          </ListItemButton>
                </Fade>
              );
            })}
        </List>
        </Box>

        <Box sx={{ mt: 'auto', p: 2 }}>
          <Divider sx={{ mb: 2 }} />
          <Button
            fullWidth
            variant="outlined"
            startIcon={<Home size={18} />}
            onClick={() => navigate('/dashboard')}
            sx={{ 
              textTransform: 'none',
              borderRadius: 2,
              py: 1.2,
              borderWidth: 2,
              borderColor: alpha(theme.palette.primary.main, 0.3),
              color: 'primary.main',
              fontWeight: 600,
              '&:hover': {
                borderColor: theme.palette.primary.main,
                bgcolor: alpha(theme.palette.primary.main, 0.08),
                transform: 'translateY(-2px)',
                boxShadow: `0 4px 12px ${alpha(theme.palette.primary.main, 0.2)}`,
              },
              transition: 'all 0.3s cubic-bezier(0.4, 0, 0.2, 1)',
            }}
          >
            Back to Dashboard
          </Button>
        </Box>
      </Drawer>

      {/* Main Content Area */}
      <Box
        component="main"
        sx={{
          flexGrow: 1,
          display: 'flex',
          flexDirection: 'column',
          width: { xs: '100%', md: `calc(100% - ${drawerWidth}px)` },
        }}
      >
        {/* Modern Header */}
        <AppBar
          position="sticky"
          elevation={0}
          sx={{
            background: alpha(theme.palette.background.paper, 0.95),
            backdropFilter: 'blur(10px)',
            borderBottom: `1px solid ${alpha(theme.palette.divider, 0.1)}`,
            color: 'text.primary',
            boxShadow: theme.customShadows.card,
          }}
        >
        <Toolbar sx={{ 
          justifyContent: 'space-between',
          minHeight: { xs: 64, sm: 70 }!,
          px: { xs: 2, sm: 3, md: 4 }!,
        }}>
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 2 }}>
            {isMobile && (
              <IconButton
                onClick={handleDrawerToggle}
                sx={{
                  color: 'text.primary',
                }}
              >
                <Menu size={24} />
              </IconButton>
            )}
            <Box>
              <Typography variant="h5" fontWeight={700} noWrap>
                Admin Console
              </Typography>
              <Typography variant="caption" color="text.secondary" sx={{ fontSize: 12 }}>
                Manage users and earnings data
              </Typography>
            </Box>
          </Box>
            <Button
              variant="outlined"
              startIcon={<LogOut size={18} />}
              onClick={() => navigate('/dashboard')}
              sx={{
                textTransform: 'none',
                borderRadius: 2,
                px: 2.5,
                py: 1,
                borderWidth: 2,
                borderColor: alpha(theme.palette.error.main, 0.3),
                color: 'error.main',
                fontWeight: 600,
                '&:hover': {
                  borderColor: theme.palette.error.main,
                  bgcolor: alpha(theme.palette.error.main, 0.08),
                  transform: 'translateY(-2px)',
                  boxShadow: `0 4px 12px ${alpha(theme.palette.error.main, 0.2)}`,
                },
                transition: 'all 0.3s cubic-bezier(0.4, 0, 0.2, 1)',
              }}
            >
              Exit Admin
          </Button>
        </Toolbar>
      </AppBar>

        {/* Page Content */}
        <Box
          sx={{
            flexGrow: 1,
            p: { xs: 2, sm: 3, md: 4 },
            position: 'relative',
            minHeight: 'calc(100vh - 140px)',
          }}
        >
          <Fade in={true} timeout={600}>
            <Box>
        <Outlet />
            </Box>
          </Fade>
        </Box>

        {/* Footer */}
        <Box
          sx={{
            borderTop: `1px solid ${alpha(theme.palette.divider, 0.1)}`,
            bgcolor: alpha(theme.palette.background.paper, 0.95),
            backdropFilter: 'blur(10px)',
            py: 2,
            px: { xs: 2, sm: 3, md: 4 },
          }}
        >
          <Box sx={{ 
            display: 'flex', 
            justifyContent: 'space-between', 
            alignItems: 'center',
            flexWrap: 'wrap',
            gap: 2,
          }}>
            <Typography variant="body2" color="text.secondary">
              © {new Date().getFullYear()} Earnings App. All rights reserved.
            </Typography>
            <Typography variant="body2" color="text.secondary">
              Admin Dashboard v1.0
            </Typography>
          </Box>
        </Box>
      </Box>
    </Box>
  );
}

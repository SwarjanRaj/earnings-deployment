import { useMemo, useState } from 'react';
import { CssBaseline, ThemeProvider } from '@mui/material';
import { BrowserRouter, Routes, Route } from 'react-router-dom';
import { Provider } from 'react-redux';

import Dashboard          from './features/dashboard/Dashboard';
import SignIn             from './pages/auth/SignIn';
import SignUp             from './pages/auth/SignUp';
import VerifyCode         from './pages/auth/VerifyCode';
import ForgotPassword     from './pages/auth/ForgotPassword';
import ResetPassword      from './pages/auth/ResetPassword';

import AdminRoute         from './router/AdminRoute';
import ProtectedRoute      from './router/ProtectedRoute';
import AdminLayout        from './features/admin/AdminLayout';
import UserManagementPage  from './features/admin/UserManagementPage';
import EarningsAdminPage  from './features/admin/EarningsAdminPage';
import ChatManagementPage from './features/admin/ChatManagementPage';

// Chat pages
import TopicsPage         from './features/chat/pages/TopicsPage';
import DiscussionsPage   from './features/chat/pages/DiscussionsPage';
import ChannelChatPage   from './features/chat/pages/ChannelChatPage';
import OneToOneChatPage   from './features/chat/pages/OneToOneChatPage';
import ChatsListPage      from './features/chat/pages/ChatsListPage';

import { buildTheme, ColorModeContext } from './theme';
import { store } from './app/store';
import AuthBootstrap from './features/dashboard/components/AuthBootStrap';

console.log('App component loaded');

export default function App() {
  const [mode, setMode] = useState<'light' | 'dark'>('light');
  const colorMode = useMemo(() => ({
    toggleColorMode: () => setMode((m) => m === 'light' ? 'dark' : 'light'),
  }), []);
  const theme = useMemo(() => buildTheme(mode), [mode]);

  return (
    <Provider store={store}>
      <ColorModeContext.Provider value={colorMode}>
        <ThemeProvider theme={theme}>
          <CssBaseline />

          <AuthBootstrap>
            <BrowserRouter
              future={{
                v7_startTransition: true,
                v7_relativeSplatPath: true,
              }}
            >
              <Routes>
                <Route path="/" element={<Dashboard />} />
                <Route path="/dashboard" element={<Dashboard />} />

                {/* Auth */}
                <Route path="/signin"  element={<SignIn />} />
                <Route path="/signup"  element={<SignUp />} />
                <Route path="/verify"  element={<VerifyCode />} />
                <Route path="/forgot"  element={<ForgotPassword />} />
                <Route path="/reset"   element={<ResetPassword />} />

                {/* Admin */}
                <Route element={<AdminRoute />}>
                  <Route path="/admin" element={<AdminLayout />}>
                    <Route path="users"    element={<UserManagementPage />} />
                    <Route path="earnings" element={<EarningsAdminPage />} />
                    <Route path="chat"     element={<ChatManagementPage />} />
                  </Route>
                </Route>

                {/* Chat & Discussions - Fully Protected */}
                <Route
                  path="/chat/topics"
                  element={
                    <ProtectedRoute>
                      <TopicsPage />
                    </ProtectedRoute>
                  }
                />
                {/* More specific routes must come first */}
                <Route
                  path="/chat/topic/:topicId/discussions"
                  element={
                    <ProtectedRoute>
                      <DiscussionsPage />
                    </ProtectedRoute>
                  }
                />
                <Route
                  path="/chat/discussion/:discussionId"
                  element={
                    <ProtectedRoute>
                      <ChannelChatPage />
                    </ProtectedRoute>
                  }
                />
                <Route
                  path="/chat/topic/:topicId"
                  element={
                    <ProtectedRoute>
                      <ChannelChatPage />
                    </ProtectedRoute>
                  }
                />
                <Route
                  path="/chat/chats"
                  element={
                    <ProtectedRoute>
                      <ChatsListPage />
                    </ProtectedRoute>
                  }
                />
                <Route
                  path="/chat/one-to-one/:chatId"
                  element={
                    <ProtectedRoute>
                      <OneToOneChatPage />
                    </ProtectedRoute>
                  }
                />
              </Routes>
            </BrowserRouter>
          </AuthBootstrap>
        </ThemeProvider>
      </ColorModeContext.Provider>
    </Provider>
  );
}

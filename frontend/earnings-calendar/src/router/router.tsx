// src/router/router.tsx
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';

import PrivateRoute from './PrivateRoute';
import AdminRoute from './AdminRoute';
import SignIn from '../pages/auth/SignIn';
import SignUp from '../pages/auth/SignUp';
import OAuthCallback from '../pages/auth/OAuthCallback';
import Dashboard from '../features/dashboard/Dashboard';
import AdminLayout from '../features/admin/AdminLayout';
import EarningsAdminPage from '../features/admin/EarningsAdminPage';
import UserManagementPage from '../features/admin/UserManagementPage';
import TestPage from '../features/admin/TestPage';
// Chat pages
import TopicsPage from '../features/chat/pages/TopicsPage';
import DiscussionsPage from '../features/chat/pages/DiscussionsPage';
import ChannelChatPage from '../features/chat/pages/ChannelChatPage';
import OneToOneChatPage from '../features/chat/pages/OneToOneChatPage';
import ChatsListPage from '../features/chat/pages/ChatsListPage';

export default function AppRouter() {
  return (
    <BrowserRouter>
      <Routes>
        {/* PUBLIC */}
        <Route path="/signin" element={<SignIn />} />
        <Route path="/signup" element={<SignUp />} />
        <Route path="/oauth/callback" element={<OAuthCallback />} />

        {/* PROTECTED */}
        <Route element={<PrivateRoute />}>
          <Route path="/dashboard" element={<Dashboard />} />

          {/* ADMIN ONLY */}
          <Route element={<AdminRoute />}>
            <Route path="/admin" element={<AdminLayout />}>
              <Route path="earnings" element={<EarningsAdminPage />} />
              <Route path="users" element={<UserManagementPage />} />
              <Route path="test" element={<TestPage />} />
            </Route>
          </Route>

          {/* Chat & Discussions */}
          <Route path="/chat/topics" element={<TopicsPage />} />
          {/* More specific routes must come first */}
          <Route path="/chat/topic/:topicId/discussions" element={<DiscussionsPage />} />
          <Route path="/chat/discussion/:discussionId" element={<ChannelChatPage />} /> {/* Reuse ChannelChatPage for discussions */}
          <Route path="/chat/topic/:topicId" element={<ChannelChatPage />} /> {/* Legacy route - keep for backward compatibility */}
          <Route path="/chat/chats" element={<ChatsListPage />} />
          <Route path="/chat/one-to-one/:chatId" element={<OneToOneChatPage />} />

          {/* redirect base‐URL to dashboard */}
          <Route path="/" element={<Navigate to="/dashboard" replace />} />
        </Route>

        {/* 404 */}
        {/* <Route path="*" element={<NotFound />} /> */}
      </Routes>
    </BrowserRouter>
  );
}

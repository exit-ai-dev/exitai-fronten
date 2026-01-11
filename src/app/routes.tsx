import { createBrowserRouter } from 'react-router-dom';
import AppLayout from './AppLayout';
import AIChat from '../pages/AIChat';
import Settings from '../pages/Settings';
import Attendance from '../pages/Attendance';
import ConversationHistory from '../pages/ConversationHistory';
import NotFound from '../pages/NotFound';
import Login from '../pages/Login';
import LiffChat from '../pages/LiffChat';
import { ProtectedRoute } from '../components/ProtectedRoute';

/**
 * ルーティング設定。新たに login と company ページを追加しています。
 */
export const router = createBrowserRouter(
  [
    {
      path: '/login',
      element: <Login />,
    },
    {
      path: '/liff',
      element: <LiffChat />,
    },
    {
      path: '/',
      element: (
        <ProtectedRoute>
          <AIChat />
        </ProtectedRoute>
      ),
      errorElement: <NotFound />,
    },
    {
      path: '/history',
      element: (
        <ProtectedRoute>
          <AppLayout />
        </ProtectedRoute>
      ),
      children: [
        { index: true, element: <ConversationHistory /> },
      ],
    },
    {
      path: '/attendance',
      element: (
        <ProtectedRoute>
          <AppLayout />
        </ProtectedRoute>
      ),
      children: [
        { index: true, element: <Attendance /> },
      ],
    },
    {
      path: '/settings',
      element: (
        <ProtectedRoute>
          <AppLayout />
        </ProtectedRoute>
      ),
      children: [
        { index: true, element: <Settings /> },
      ],
    },
    {
      path: '*',
      element: <NotFound />,
    },
  ],
  {
    basename: import.meta.env.BASE_URL,
  }
);
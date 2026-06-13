import type { ReactNode } from 'react';
import { Navigate } from 'react-router-dom';
import { useAuth } from './AuthContext';

interface Props {
  children: ReactNode;
}

// 路由守卫：未登录跳 /login；探活中先白屏一闪
export function RequireAuth({ children }: Props) {
  const { user, loading } = useAuth();
  if (loading) return null;
  if (!user) return <Navigate to="/login" replace />;
  return <>{children}</>;
}

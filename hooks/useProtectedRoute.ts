import { useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/lib/auth-context';

interface UseProtectedRouteOptions {
  requireAuth?: boolean;
  allowedRoles?: string[];
  redirectTo?: string;
}

export function useProtectedRoute(options: UseProtectedRouteOptions = {}) {
  const {
    requireAuth = true,
    allowedRoles = [],
    redirectTo,
  } = options;

  const { user, loading } = useAuth();
  const router = useRouter();

  useEffect(() => {
    if (loading) return;

    // Redirect to login if authentication is required but user is not logged in
    if (requireAuth && !user) {
      router.push('/login');
      return;
    }

    // Check role-based access
    if (user && allowedRoles.length > 0 && !allowedRoles.includes(user.role)) {
      // Redirect based on user role if not authorized for this route
      if (user.role === 'ADMIN' || user.role === 'INTERNAL_USER') {
        router.push(redirectTo || '/internal');
      } else {
        router.push(redirectTo || '/');
      }
      return;
    }

    // Redirect internal users and admins to /internal if they try to access regular pages
    if (user && !allowedRoles.length && (user.role === 'ADMIN' || user.role === 'INTERNAL_USER')) {
      const currentPath = window.location.pathname;
      if (currentPath === '/' || currentPath === '/profile') {
        router.push('/internal');
      }
    }
  }, [user, loading, router, requireAuth, allowedRoles, redirectTo]);

  return { user, loading };
}

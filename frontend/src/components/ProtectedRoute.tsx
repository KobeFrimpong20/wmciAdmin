import { Navigate, Outlet, useLocation } from 'react-router-dom';
import { Loader2 } from 'lucide-react';
import { useAuth } from '../context/authContext';
import { PageShell } from './PageShell';

export function ProtectedRoute() {
  const { isAdmin, isInitializing } = useAuth();
  const location = useLocation();

  if (isInitializing) {
    return (
      <PageShell width="reference">
        <div
          aria-label="Verifying administrator session"
          className="bg-surface border border-border rounded-lg p-8 flex items-center gap-3 text-sm text-muted-foreground"
        >
          <Loader2 className="w-4 h-4 animate-spin text-accent shrink-0" aria-hidden="true" />
          <span>Verifying administrator session...</span>
        </div>
      </PageShell>
    );
  }

  if (!isAdmin) {
    return <Navigate to="/" state={{ from: location }} replace />;
  }

  return <Outlet />;
}

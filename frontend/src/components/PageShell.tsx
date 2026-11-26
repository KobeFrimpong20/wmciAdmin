import type { ReactNode } from 'react';
import { Link, useLocation, useNavigate } from 'react-router-dom';
import { LogOut } from 'lucide-react';
import { useAuth } from '../context/authContext';

interface PageShellProps {
  children: ReactNode;
  width?: 'wide' | 'reference';
}

export function PageShell({ children, width = 'wide' }: PageShellProps) {
  const { pathname } = useLocation();
  const navigate = useNavigate();
  const { isAdmin, logout } = useAuth();

  const containerWidth = width === 'wide' ? 'max-w-5xl' : 'max-w-3xl';
  const isHome = pathname === '/';
  const isDirectory =
    pathname === '/dashboard' ||
    pathname.startsWith('/members/') ||
    pathname.startsWith('/applications/');
  const isIntake = pathname === '/intake';

  const handleSignOut = () => {
    logout();
    navigate('/', { replace: true });
  };

  return (
    <div className="min-h-screen flex flex-col bg-paper text-foreground font-body">
      <header className="bg-surface border-b border-border">
        <div
          className={`${containerWidth} mx-auto px-6 h-16 flex items-center justify-between gap-4`}
        >
          <Link
            to={isAdmin ? '/dashboard' : '/'}
            className="font-heading text-xl text-foreground hover:text-accent transition-colors duration-150"
          >
            Digital Binder
          </Link>

          <nav aria-label="Primary" className="flex items-center gap-6">
            {isAdmin ? (
              <>
                <Link
                  to="/dashboard"
                  className={`font-body text-sm transition-colors duration-150 ${
                    isDirectory
                      ? 'text-accent font-medium underline decoration-accent'
                      : 'text-muted-foreground hover:text-accent'
                  }`}
                >
                  Directory
                </Link>
                <Link
                  to="/intake"
                  className={`font-body text-sm transition-colors duration-150 ${
                    isIntake
                      ? 'text-accent font-medium underline decoration-accent'
                      : 'text-muted-foreground hover:text-accent'
                  }`}
                >
                  Intake Form
                </Link>
                <button
                  type="button"
                  onClick={handleSignOut}
                  className="inline-flex items-center gap-1.5 font-body text-sm text-muted-foreground hover:text-accent transition-colors duration-150 cursor-pointer"
                >
                  <LogOut className="w-3.5 h-3.5" aria-hidden="true" />
                  <span>Sign Out</span>
                </button>
              </>
            ) : (
              <>
                <Link
                  to="/"
                  className={`font-body text-sm transition-colors duration-150 ${
                    isHome
                      ? 'text-accent font-medium underline decoration-accent'
                      : 'text-muted-foreground hover:text-accent'
                  }`}
                >
                  Home
                </Link>
                <Link
                  to="/intake"
                  className={`font-body text-sm transition-colors duration-150 ${
                    isIntake
                      ? 'text-accent font-medium underline decoration-accent'
                      : 'text-muted-foreground hover:text-accent'
                  }`}
                >
                  Intake Form
                </Link>
              </>
            )}
          </nav>
        </div>
      </header>

      <main className={`flex-1 w-full ${containerWidth} mx-auto px-6 py-10 sm:py-12`}>
        {children}
      </main>

      <footer className="border-t border-border bg-paper">
        <div
          className={`${containerWidth} mx-auto px-6 py-6 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-2 text-xs text-muted-foreground`}
        >
          <span>Digital Binder — Congregation Roster &amp; Intake</span>
          <span className="font-accent tabular-nums">TSS Membership Records</span>
        </div>
      </footer>
    </div>
  );
}

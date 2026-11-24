import type { ReactNode } from 'react';
import { Link, useLocation } from 'react-router-dom';

interface PageShellProps {
  children: ReactNode;
  width?: 'wide' | 'reference';
}

export function PageShell({ children, width = 'wide' }: PageShellProps) {
  const { pathname } = useLocation();
  const containerWidth = width === 'wide' ? 'max-w-5xl' : 'max-w-3xl';
  const isDirectory = pathname === '/' || pathname === '/dashboard';
  const isIntake = pathname === '/intake';

  return (
    <div className="min-h-screen flex flex-col bg-paper text-foreground font-body">
      <header className="bg-surface border-b border-border">
        <div
          className={`${containerWidth} mx-auto px-6 h-16 flex items-center justify-between gap-4`}
        >
          <Link
            to="/"
            className="font-heading text-xl text-foreground hover:text-accent transition-colors duration-150"
          >
            Digital Binder
          </Link>

          <nav aria-label="Primary" className="flex items-center gap-6">
            <Link
              to="/"
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

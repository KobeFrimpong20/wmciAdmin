import React, { useState } from 'react';
import { Link, Navigate, useLocation, useNavigate } from 'react-router-dom';
import { AlertCircle, ArrowRight, Eye, EyeOff, Loader2, Lock } from 'lucide-react';
import { useAuth } from '../context/authContext';
import { PageShell } from '../components/PageShell';
import { Button } from '../components/Button';
import { buttonStyles } from '../components/buttonStyles';

interface LocationState {
    from?: {
        pathname?: string;
        search?: string;
    };
}

const inputCls =
    'w-full px-3.5 py-2.5 bg-surface border border-border rounded-sm font-body text-base text-foreground placeholder:text-muted-foreground focus:outline-none focus:border-accent transition-colors duration-150';

const Home = () => {
    const { isAdmin, isInitializing, login } = useAuth();
    const navigate = useNavigate();
    const location = useLocation();

    const [password, setPassword] = useState('');
    const [showPassword, setShowPassword] = useState(false);
    const [error, setError] = useState('');
    const [isSubmitting, setIsSubmitting] = useState(false);

    if (isInitializing) {
        return (
            <PageShell width="wide">
                <div
                    aria-label="Checking session"
                    className="bg-surface border border-border rounded-lg p-8 flex items-center gap-3 text-sm text-muted-foreground"
                >
                    <Loader2 className="w-4 h-4 animate-spin text-accent shrink-0" aria-hidden="true" />
                    <span>Checking session...</span>
                </div>
            </PageShell>
        );
    }

    if (isAdmin) {
        return <Navigate to="/dashboard" replace />;
    }

    const state = location.state as LocationState | null;
    const redirectTarget =
        state?.from?.pathname && state.from.pathname !== '/'
            ? `${state.from.pathname}${state.from.search ?? ''}`
            : '/dashboard';

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!password.trim()) {
            setError('Please enter the administrator password.');
            return;
        }

        setError('');
        setIsSubmitting(true);
        try {
            await login(password);
            navigate(redirectTarget, { replace: true });
        } catch (err: unknown) {
            setError(
                err instanceof Error ? err.message : 'Unable to sign in. Please check the password.'
            );
        } finally {
            setIsSubmitting(false);
        }
    };

    return (
        <PageShell width="wide">
            <div className="space-y-10">
                <header className="space-y-3 max-w-2xl">
                    <h1 className="font-heading text-4xl sm:text-5xl font-normal tracking-tight text-foreground leading-tight">
                        WMCI Congregation Digital Binder
                    </h1>
                    <p className="text-base sm:text-lg text-muted-foreground">
                        Administrators can sign in to review incoming applications and browse member records.
                        Prospective members can submit a new membership application directly without an account.
                    </p>
                </header>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-6 items-stretch">
                    {/* Left Half: Admin Sign In */}
                    <section className="bg-surface border border-border rounded-lg p-6 sm:p-8 flex flex-col justify-between gap-6">
                        <div className="space-y-6">
                            <div className="space-y-2">
                                <div className="flex items-center gap-2.5 text-accent">
                                    <Lock className="w-4 h-4 shrink-0" aria-hidden="true" />
                                    <h2 className="font-heading text-2xl sm:text-3xl font-normal text-foreground">
                                        Admin Sign In
                                    </h2>
                                </div>
                                <p className="text-sm text-muted-foreground">
                                    Sign in with the administrator password to access the congregation directory and
                                    individual application dossiers.
                                </p>
                            </div>

                            <form onSubmit={handleSubmit} noValidate className="space-y-5">
                                <div>
                                    <label
                                        htmlFor="admin-password"
                                        className="block font-body text-sm font-medium text-foreground mb-1.5"
                                    >
                                        Administrator Password
                                    </label>
                                    <div className="relative">
                                        <input
                                            id="admin-password"
                                            name="password"
                                            type={showPassword ? 'text' : 'password'}
                                            autoComplete="current-password"
                                            value={password}
                                            onChange={e => setPassword(e.target.value)}
                                            placeholder="Enter administrator password"
                                            className={`${inputCls} pr-11`}
                                            required
                                        />
                                        <button
                                            type="button"
                                            onClick={() => setShowPassword(prev => !prev)}
                                            aria-label={showPassword ? 'Hide password' : 'Show password'}
                                            className="absolute right-2.5 top-1/2 -translate-y-1/2 p-1.5 text-muted-foreground hover:text-accent transition-colors duration-150 cursor-pointer"
                                        >
                                            {showPassword ? (
                                                <EyeOff className="w-4 h-4" aria-hidden="true" />
                                            ) : (
                                                <Eye className="w-4 h-4" aria-hidden="true" />
                                            )}
                                        </button>
                                    </div>
                                </div>

                                {error && (
                                    <div
                                        role="alert"
                                        className="flex items-start gap-2.5 pt-1 text-sm text-foreground"
                                    >
                                        <AlertCircle className="w-4 h-4 shrink-0 mt-0.5 text-foreground" aria-hidden="true" />
                                        <span>{error}</span>
                                    </div>
                                )}

                                <Button
                                    type="submit"
                                    variant="primary"
                                    disabled={isSubmitting}
                                    className="w-full"
                                >
                                    {isSubmitting ? (
                                        <>
                                            <Loader2 className="w-4 h-4 animate-spin" aria-hidden="true" />
                                            <span>Signing In...</span>
                                        </>
                                    ) : (
                                        <span>Sign In as Admin</span>
                                    )}
                                </Button>
                            </form>
                        </div>

                        <p className="pt-4 border-t border-border font-accent text-xs text-muted-foreground">
                            Directory access is restricted to administrators.
                        </p>
                    </section>

                    {/* Right Half: New Member Application */}
                    <section className="bg-surface border border-border rounded-lg p-6 sm:p-8 flex flex-col justify-between gap-6">
                        <div className="space-y-6">
                            <div className="space-y-2">
                                <h2 className="font-heading text-2xl sm:text-3xl font-normal text-foreground">
                                    New Member Application
                                </h2>
                                <p className="text-sm text-muted-foreground">
                                    Joining the church family? Complete the four-step membership intake form below. No
                                    sign-in is required, and duplicate submissions are prevented automatically.
                                </p>
                            </div>

                            <ol className="divide-y divide-border border-t border-b border-border text-sm">
                                <li className="py-3 flex items-baseline justify-between gap-4">
                                    <span className="text-foreground">Personal &amp; Contact Information</span>
                                    <span className="font-accent text-xs text-muted-foreground tabular-nums">
                                        Step 1
                                    </span>
                                </li>
                                <li className="py-3 flex items-baseline justify-between gap-4">
                                    <span className="text-foreground">Demographics &amp; Household</span>
                                    <span className="font-accent text-xs text-muted-foreground tabular-nums">
                                        Step 2
                                    </span>
                                </li>
                                <li className="py-3 flex items-baseline justify-between gap-4">
                                    <span className="text-foreground">Spiritual Background</span>
                                    <span className="font-accent text-xs text-muted-foreground tabular-nums">
                                        Step 3
                                    </span>
                                </li>
                                <li className="py-3 flex items-baseline justify-between gap-4">
                                    <span className="text-foreground">Membership Commitments &amp; Signature</span>
                                    <span className="font-accent text-xs text-muted-foreground tabular-nums">
                                        Step 4
                                    </span>
                                </li>
                            </ol>
                        </div>

                        <div className="space-y-3">
                            <Link to="/intake" className={buttonStyles('primary', 'w-full')}>
                                <span>Start New Application</span>
                                <ArrowRight className="w-4 h-4" aria-hidden="true" />
                            </Link>
                        </div>
                    </section>
                </div>
            </div>
        </PageShell>
    );
};

export default Home;

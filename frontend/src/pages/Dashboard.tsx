import { useEffect, useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import { membersApi } from '../api/members';
import type { Application, Member } from '../types/member';
import MemberCard from '../components/MemberCard';
import { Button } from '../components/Button';
import { buttonStyles } from '../components/buttonStyles';
import { PageShell } from '../components/PageShell';
import { AlertCircle, ArrowRight, Mail, Phone, Plus, Search } from 'lucide-react';

type ActiveTab = 'applications' | 'members';

function formatDate(value: string): string {
    if (!value) return 'Date unavailable';
    const parsed = new Date(value);
    if (Number.isNaN(parsed.getTime())) return value;
    return parsed.toLocaleDateString(undefined, {
        year: 'numeric',
        month: 'short',
        day: 'numeric',
    });
}

function toTelHref(phone: string): string {
    return `tel:${phone.replace(/[^\d+]/g, '')}`;
}

function countCommitments(app: Application): number {
    return [
        app.attendance_commitment,
        app.tithe_commitment,
        app.prayer_commitment,
        app.sober_commitment,
        app.respect_commitment,
        app.faith_commitment,
    ].filter(Boolean).length;
}

const Dashboard = () => {
    const [activeTab, setActiveTab] = useState<ActiveTab>('applications');
    const [applications, setApplications] = useState<Application[]>([]);
    const [members, setMembers] = useState<Member[]>([]);
    const [query, setQuery] = useState('');
    const [isLoading, setIsLoading] = useState(true);
    const [error, setError] = useState('');
    const [reloadKey, setReloadKey] = useState(0);

    useEffect(() => {
        let isMounted = true;

        const loadRecords = async () => {
            try {
                const [appData, memberData] = await Promise.all([
                    membersApi.getAllApplications(),
                    membersApi.getAllMembers(),
                ]);
                if (isMounted) {
                    setApplications(appData || []);
                    setMembers(memberData || []);
                    setError('');
                }
            } catch (err: unknown) {
                if (isMounted) {
                    setError(err instanceof Error ? err.message : 'Unable to reach the membership server.');
                }
            } finally {
                if (isMounted) setIsLoading(false);
            }
        };

        void loadRecords();
        return () => {
            isMounted = false;
        };
    }, [reloadKey]);

    const handleRetry = () => {
        setIsLoading(true);
        setError('');
        setReloadKey(k => k + 1);
    };

    const normalizedQuery = query.trim().toLowerCase();

    const filteredApplications = useMemo(() => {
        if (!normalizedQuery) return applications;
        return applications.filter(app =>
            `${app.full_name} ${app.email} ${app.phone}`.toLowerCase().includes(normalizedQuery)
        );
    }, [applications, normalizedQuery]);

    const filteredMembers = useMemo(() => {
        if (!normalizedQuery) return members;
        return members.filter(member =>
            `${member.full_name} ${member.email} ${member.phone} ${member.address} ${(member.tags || []).join(' ')}`
                .toLowerCase()
                .includes(normalizedQuery)
        );
    }, [members, normalizedQuery]);

    return (
        <PageShell width="wide">
            <div className="space-y-8">
                {/* Page Header */}
                <section className="flex flex-col sm:flex-row sm:items-end justify-between gap-6">
                    <div className="space-y-2">
                        <h1 className="font-heading text-4xl sm:text-5xl font-normal tracking-tight text-foreground leading-tight">
                            WMCI Congregation Binder
                        </h1>
                        <p className="text-base sm:text-lg text-muted-foreground max-w-xl">
                            Review incoming membership applications and browse the active congregation directory.
                        </p>
                    </div>
                    <Link to="/intake" className={buttonStyles('primary', 'shrink-0')}>
                        <Plus className="w-4 h-4" aria-hidden="true" />
                        <span>New Application</span>
                    </Link>
                </section>

                {/* Tab Bar & Search */}
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-border pb-4">
                    <div role="tablist" aria-label="Binder sections" className="flex items-center gap-6">
                        <button
                            type="button"
                            role="tab"
                            aria-selected={activeTab === 'applications'}
                            onClick={() => setActiveTab('applications')}
                            className={`inline-flex items-center gap-2 pb-1 text-sm font-medium border-b-2 transition-colors duration-150 cursor-pointer ${activeTab === 'applications'
                                    ? 'border-accent text-accent'
                                    : 'border-transparent text-muted-foreground hover:text-foreground'
                                }`}
                        >
                            <span>Applications</span>
                            {!isLoading && !error && (
                                <span
                                    className={`font-accent text-xs px-2 py-0.5 rounded-sm tabular-nums ${activeTab === 'applications'
                                            ? 'bg-accent-wash text-accent'
                                            : 'text-muted-foreground'
                                        }`}
                                >
                                    {applications.length}
                                </span>
                            )}
                        </button>

                        <button
                            type="button"
                            role="tab"
                            aria-selected={activeTab === 'members'}
                            onClick={() => setActiveTab('members')}
                            className={`inline-flex items-center gap-2 pb-1 text-sm font-medium border-b-2 transition-colors duration-150 cursor-pointer ${activeTab === 'members'
                                    ? 'border-accent text-accent'
                                    : 'border-transparent text-muted-foreground hover:text-foreground'
                                }`}
                        >
                            <span>Members</span>
                            {!isLoading && !error && (
                                <span
                                    className={`font-accent text-xs px-2 py-0.5 rounded-sm tabular-nums ${activeTab === 'members'
                                            ? 'bg-accent-wash text-accent'
                                            : 'text-muted-foreground'
                                        }`}
                                >
                                    {members.length}
                                </span>
                            )}
                        </button>
                    </div>

                    <div className="relative w-full sm:w-72">
                        <Search
                            className="w-4 h-4 text-muted-foreground absolute left-3 top-1/2 -translate-y-1/2 pointer-events-none"
                            aria-hidden="true"
                        />
                        <label htmlFor="binder-search" className="sr-only">
                            Filter records by name, email, or phone
                        </label>
                        <input
                            id="binder-search"
                            type="search"
                            value={query}
                            onChange={e => setQuery(e.target.value)}
                            placeholder={`Filter ${activeTab}...`}
                            className="w-full pl-9 pr-3 py-2 bg-surface border border-border rounded-sm text-sm text-foreground placeholder:text-muted-foreground focus:outline-none focus:border-accent transition-colors duration-150"
                        />
                    </div>
                </div>

                {/* Content */}
                {isLoading ? (
                    <div
                        aria-label="Loading binder records"
                        className="grid grid-cols-1 md:grid-cols-2 gap-6"
                    >
                        {[0, 1, 2, 3].map(slot => (
                            <div
                                key={slot}
                                className="bg-surface border border-border rounded-lg p-6 space-y-4"
                            >
                                <div className="flex items-center justify-between gap-4">
                                    <div className="h-6 w-44 bg-border rounded-sm" />
                                    <div className="h-5 w-24 bg-accent-wash rounded-sm" />
                                </div>
                                <div className="space-y-2.5">
                                    <div className="h-4 w-56 bg-border rounded-sm" />
                                    <div className="h-4 w-40 bg-border rounded-sm" />
                                </div>
                                <div className="pt-4 border-t border-border flex justify-between">
                                    <div className="h-4 w-28 bg-border rounded-sm" />
                                    <div className="h-4 w-24 bg-border rounded-sm" />
                                </div>
                            </div>
                        ))}
                    </div>
                ) : error ? (
                    <div
                        role="alert"
                        className="bg-surface border border-foreground rounded-lg p-8 flex flex-col sm:flex-row sm:items-center justify-between gap-6"
                    >
                        <div className="flex items-start gap-3">
                            <AlertCircle className="w-5 h-5 text-foreground shrink-0 mt-0.5" aria-hidden="true" />
                            <div className="space-y-1">
                                <h2 className="font-heading text-xl font-normal text-foreground">
                                    Unable to load binder records
                                </h2>
                                <p className="text-sm text-muted-foreground">{error}</p>
                            </div>
                        </div>
                        <Button variant="secondary" onClick={handleRetry} className="shrink-0">
                            Retry Loading Records
                        </Button>
                    </div>
                ) : activeTab === 'applications' ? (
                    applications.length === 0 ? (
                        <div className="bg-surface border border-border rounded-lg p-10 text-center space-y-4">
                            <h2 className="font-heading text-2xl font-normal text-foreground">
                                No pending applications
                            </h2>
                            <p className="text-sm text-muted-foreground max-w-md mx-auto">
                                New membership intake submissions waiting for registrar review will appear here.
                            </p>
                            <div className="pt-2">
                                <Link to="/intake" className={buttonStyles('primary')}>
                                    <Plus className="w-4 h-4" aria-hidden="true" />
                                    <span>Start New Application</span>
                                </Link>
                            </div>
                        </div>
                    ) : filteredApplications.length === 0 ? (
                        <div className="bg-surface border border-border rounded-lg p-10 text-center space-y-3">
                            <h2 className="font-heading text-2xl font-normal text-foreground">
                                No matching applications
                            </h2>
                            <p className="text-sm text-muted-foreground">
                                No applications matched &ldquo;{query}&rdquo;.
                            </p>
                            <div className="pt-1">
                                <Button variant="secondary" onClick={() => setQuery('')}>
                                    Clear Filter
                                </Button>
                            </div>
                        </div>
                    ) : (
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                            {filteredApplications.map(app => {
                                const fullName = app.full_name?.trim() || 'Unnamed Applicant';
                                const commitments = countCommitments(app);

                                return (
                                    <article
                                        key={app.id}
                                        className="bg-surface border border-border rounded-lg p-6 transition-colors duration-150 hover:border-accent flex flex-col justify-between gap-5"
                                    >
                                        <div className="space-y-4">
                                            <div className="flex items-start justify-between gap-3">
                                                <div className="min-w-0">
                                                    <h3 className="font-heading text-2xl font-normal text-foreground leading-snug">
                                                        <Link
                                                            to={`/applications/${app.id}`}
                                                            className="hover:text-accent transition-colors duration-150"
                                                        >
                                                            {fullName}
                                                        </Link>
                                                    </h3>
                                                    <p className="font-accent text-xs text-muted-foreground mt-1 truncate tabular-nums">
                                                        Submitted {formatDate(app.created_at)}
                                                    </p>
                                                </div>

                                                <span className="shrink-0 bg-accent-wash text-accent font-body text-xs font-medium px-2.5 py-1 rounded-sm tabular-nums">
                                                    {commitments}/6 Commitments
                                                </span>
                                            </div>

                                            <div className="space-y-2 text-sm">
                                                <div className="flex items-center gap-2.5 text-muted-foreground min-w-0">
                                                    <Mail className="w-4 h-4 shrink-0" aria-hidden="true" />
                                                    {app.email ? (
                                                        <a
                                                            href={`mailto:${app.email}`}
                                                            className="truncate text-foreground hover:text-accent hover:underline transition-colors duration-150"
                                                        >
                                                            {app.email}
                                                        </a>
                                                    ) : (
                                                        <span>No email provided</span>
                                                    )}
                                                </div>

                                                <div className="flex items-center gap-2.5 text-muted-foreground min-w-0">
                                                    <Phone className="w-4 h-4 shrink-0" aria-hidden="true" />
                                                    {app.phone ? (
                                                        <a
                                                            href={toTelHref(app.phone)}
                                                            className="truncate text-foreground hover:text-accent hover:underline transition-colors duration-150 tabular-nums"
                                                        >
                                                            {app.phone}
                                                        </a>
                                                    ) : (
                                                        <span>No phone provided</span>
                                                    )}
                                                </div>
                                            </div>
                                        </div>

                                        <div className="pt-4 border-t border-border flex items-center justify-between gap-3">
                                            <span className="font-accent text-xs text-muted-foreground tabular-nums">
                                                {app.pastor_signature_date ? 'Registrar signed' : 'Pending registrar review'}
                                            </span>
                                            <Link
                                                to={`/applications/${app.id}`}
                                                className="shrink-0 inline-flex items-center gap-1.5 text-sm font-medium text-accent hover:text-accent-hover transition-colors duration-150"
                                            >
                                                <span>Review Application</span>
                                                <ArrowRight className="w-4 h-4" aria-hidden="true" />
                                            </Link>
                                        </div>
                                    </article>
                                );
                            })}
                        </div>
                    )
                ) : members.length === 0 ? (
                    <div className="bg-surface border border-border rounded-lg p-10 text-center space-y-4">
                        <h2 className="font-heading text-2xl font-normal text-foreground">
                            No members in the directory yet
                        </h2>
                        <p className="text-sm text-muted-foreground max-w-md mx-auto">
                            Members appear here once their intake application has been accepted.
                        </p>
                        <div className="pt-2">
                            <Link to="/intake" className={buttonStyles('primary')}>
                                <Plus className="w-4 h-4" aria-hidden="true" />
                                <span>Add Member via Intake</span>
                            </Link>
                        </div>
                    </div>
                ) : filteredMembers.length === 0 ? (
                    <div className="bg-surface border border-border rounded-lg p-10 text-center space-y-3">
                        <h2 className="font-heading text-2xl font-normal text-foreground">
                            No matching members
                        </h2>
                        <p className="text-sm text-muted-foreground">
                            No directory records matched &ldquo;{query}&rdquo;.
                        </p>
                        <div className="pt-1">
                            <Button variant="secondary" onClick={() => setQuery('')}>
                                Clear Filter
                            </Button>
                        </div>
                    </div>
                ) : (
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                        {filteredMembers.map(member => (
                            <MemberCard key={member.id} member={member} />
                        ))}
                    </div>
                )}
            </div>
        </PageShell>
    );
};

export default Dashboard;

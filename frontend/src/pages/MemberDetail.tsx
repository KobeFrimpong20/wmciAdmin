import { useEffect, useState } from 'react';
import { useParams, Link } from 'react-router-dom';
import { membersApi } from '../api/members';
import type { Member, Application } from '../types/member';
import { PageShell } from '../components/PageShell';
import { Button } from '../components/Button';
import { MemberLabelBar } from '../components/MemberLabelBar';
import { AlertCircle, ArrowLeft, ChevronRight } from 'lucide-react';

function formatDate(value: string): string {
  if (!value) return 'Not recorded';
  const parsed = new Date(value);
  if (Number.isNaN(parsed.getTime())) return value;
  return parsed.toLocaleDateString(undefined, {
    year: 'numeric',
    month: 'long',
    day: 'numeric',
  });
}

function formatDateTime(value: string): string {
  if (!value) return 'Date unavailable';
  const parsed = new Date(value);
  if (Number.isNaN(parsed.getTime())) return value;
  return parsed.toLocaleString(undefined, {
    year: 'numeric',
    month: 'short',
    day: 'numeric',
    hour: 'numeric',
    minute: '2-digit',
  });
}

function toTelHref(phone: string): string {
  return `tel:${phone.replace(/[^\d+]/g, '')}`;
}

const MemberDetail = () => {
  const { id } = useParams<{ id: string }>();

  const [member, setMember] = useState<Member | null>(null);
  const [applications, setApplications] = useState<Application[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState('');
  const [reloadKey, setReloadKey] = useState(0);

  useEffect(() => {
    if (!id) return;
    let isMounted = true;

    const loadMember = async () => {
      try {
        const [memberData, appList] = await Promise.all([
          membersApi.getMemberById(id),
          membersApi.getAllApplications(id),
        ]);
        if (isMounted) {
          setMember(memberData);
          setApplications(appList || []);
          setError('');
        }
      } catch (err: unknown) {
        if (isMounted) {
          setError(err instanceof Error ? err.message : 'Unable to load member profile.');
        }
      } finally {
        if (isMounted) setIsLoading(false);
      }
    };

    void loadMember();
    return () => {
      isMounted = false;
    };
  }, [id, reloadKey]);

  const handleRetry = () => {
    setIsLoading(true);
    setError('');
    setReloadKey(k => k + 1);
  };

  return (
    <PageShell width="reference">
      <div className="space-y-8">
        <div>
          <Link
            to="/dashboard"
            className="inline-flex items-center gap-2 text-sm text-muted-foreground hover:text-accent transition-colors duration-150"
          >
            <ArrowLeft className="w-4 h-4" aria-hidden="true" />
            <span>Return to Directory</span>
          </Link>
        </div>

        {isLoading ? (
          <div aria-label="Loading member profile" className="space-y-6">
            <div className="space-y-2">
              <div className="h-10 w-64 bg-border rounded-sm" />
              <div className="h-4 w-48 bg-border rounded-sm" />
            </div>
            <div className="bg-surface border border-border rounded-lg p-8 space-y-4">
              <div className="h-5 w-36 bg-border rounded-sm" />
              <div className="h-4 w-full bg-border rounded-sm" />
              <div className="h-4 w-3/4 bg-border rounded-sm" />
            </div>
          </div>
        ) : error || !member ? (
          <div
            role="alert"
            className="bg-surface border border-foreground rounded-lg p-8 flex flex-col sm:flex-row sm:items-center justify-between gap-6"
          >
            <div className="flex items-start gap-3">
              <AlertCircle className="w-5 h-5 text-foreground shrink-0 mt-0.5" aria-hidden="true" />
              <div className="space-y-1">
                <h1 className="font-heading text-2xl font-normal text-foreground">
                  Unable to load member record
                </h1>
                <p className="text-sm text-muted-foreground">{error || 'Member not found.'}</p>
              </div>
            </div>
            <Button variant="secondary" onClick={handleRetry} className="shrink-0">
              Retry Loading Member
            </Button>
          </div>
        ) : (
          <>
            {/* Editorial Member Header */}
            <header className="space-y-2">
              <h1 className="font-heading text-4xl font-normal tracking-tight text-foreground leading-tight">
                {member.full_name}
              </h1>
              <p className="font-accent text-xs text-muted-foreground tabular-nums">
                Member ID {member.id} &middot; Joined {formatDate(member.joined_at)}
              </p>
            </header>

            {/* Member Labels Line & Dropdown Bank */}
            <MemberLabelBar
              memberId={member.id}
              savedTags={member.tags || []}
              onUpdated={updatedMember => setMember(updatedMember)}
            />

            {/* Contact Details Panel */}
            <section className="bg-surface border border-border rounded-lg p-6 sm:p-8">
              <h2 className="font-heading text-2xl font-normal text-foreground mb-5">
                Member Information
              </h2>
              <dl className="divide-y divide-border">
                <div className="py-3.5 flex flex-col sm:flex-row sm:items-baseline justify-between gap-1">
                  <dt className="text-sm text-muted-foreground">Date of Birth</dt>
                  <dd className="font-accent text-sm text-foreground tabular-nums">
                    {member.date_of_birth || 'Not provided'}
                  </dd>
                </div>

                <div className="py-3.5 flex flex-col sm:flex-row sm:items-baseline justify-between gap-1">
                  <dt className="text-sm text-muted-foreground">Email Address</dt>
                  <dd className="text-sm font-medium text-foreground">
                    {member.email ? (
                      <a
                        href={`mailto:${member.email}`}
                        className="text-accent hover:text-accent-hover hover:underline transition-colors duration-150"
                      >
                        {member.email}
                      </a>
                    ) : (
                      <span className="text-muted-foreground font-normal">Not provided</span>
                    )}
                  </dd>
                </div>

                <div className="py-3.5 flex flex-col sm:flex-row sm:items-baseline justify-between gap-1">
                  <dt className="text-sm text-muted-foreground">Phone Number</dt>
                  <dd className="text-sm font-medium text-foreground tabular-nums">
                    {member.phone ? (
                      <a
                        href={toTelHref(member.phone)}
                        className="text-accent hover:text-accent-hover hover:underline transition-colors duration-150"
                      >
                        {member.phone}
                      </a>
                    ) : (
                      <span className="text-muted-foreground font-normal">Not provided</span>
                    )}
                  </dd>
                </div>

                <div className="py-3.5 flex flex-col sm:flex-row sm:items-baseline justify-between gap-1">
                  <dt className="text-sm text-muted-foreground">Residential Address</dt>
                  <dd className="text-sm font-medium text-foreground sm:text-right">
                    {member.address || (
                      <span className="text-muted-foreground font-normal">Not provided</span>
                    )}
                  </dd>
                </div>

                <div className="py-3.5 flex flex-col sm:flex-row sm:items-baseline justify-between gap-1">
                  <dt className="text-sm text-muted-foreground">Joined Date</dt>
                  <dd className="font-accent text-sm text-foreground tabular-nums">
                    {formatDate(member.joined_at)}
                  </dd>
                </div>
              </dl>
            </section>

            {/* Linked Application Snapshots */}
            <section className="bg-surface border border-border rounded-lg p-6 sm:p-8">
              <div className="flex items-baseline justify-between gap-4 mb-5">
                <h2 className="font-heading text-2xl font-normal text-foreground">
                  Application Snapshots
                </h2>
                <span className="font-accent text-xs text-muted-foreground tabular-nums">
                  {applications.length} {applications.length === 1 ? 'record' : 'records'}
                </span>
              </div>

              {applications.length === 0 ? (
                <p className="text-sm text-muted-foreground">
                  No intake applications are linked to this member yet.
                </p>
              ) : (
                <ul className="divide-y divide-border">
                  {applications.map(app => (
                    <li key={app.id}>
                      <Link
                        to={`/applications/${app.id}`}
                        className="py-4 flex items-center justify-between gap-4 group transition-colors duration-150"
                      >
                        <div className="min-w-0">
                          <div className="text-sm font-medium text-foreground group-hover:text-accent transition-colors duration-150">
                            Submitted {formatDateTime(app.created_at)}
                          </div>
                          <div className="font-accent text-xs text-muted-foreground mt-1 truncate tabular-nums">
                            {app.id}
                          </div>
                        </div>
                        <ChevronRight
                          className="w-4 h-4 text-muted-foreground group-hover:text-accent shrink-0 transition-colors duration-150"
                          aria-hidden="true"
                        />
                      </Link>
                    </li>
                  ))}
                </ul>
              )}
            </section>
          </>
        )}
      </div>
    </PageShell>
  );
};

export default MemberDetail;

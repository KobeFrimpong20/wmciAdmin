import { useEffect, useState } from 'react';
import { useParams, Link } from 'react-router-dom';
import { membersApi } from '../api/members';
import type { Application } from '../types/member';
import { PageShell } from '../components/PageShell';
import { Button } from '../components/Button';
import { buttonStyles } from '../components/buttonStyles';
import { AlertCircle, ArrowLeft, Check, Minus, User } from 'lucide-react';

function formatDateTime(value: string): string {
  if (!value) return 'Date unavailable';
  const parsed = new Date(value);
  if (Number.isNaN(parsed.getTime())) return value;
  return parsed.toLocaleString(undefined, {
    year: 'numeric',
    month: 'long',
    day: 'numeric',
    hour: 'numeric',
    minute: '2-digit',
  });
}

function toTelHref(phone: string): string {
  return `tel:${phone.replace(/[^\d+]/g, '')}`;
}

function StatusRow({ label, checked }: { label: string; checked: boolean }) {
  return (
    <div className="py-3.5 flex items-center justify-between gap-4">
      <span className="text-sm text-foreground">{label}</span>
      <span
        className={`inline-flex items-center gap-1.5 font-accent text-xs ${
          checked ? 'text-accent font-medium' : 'text-muted-foreground'
        }`}
      >
        {checked ? (
          <Check className="w-4 h-4 shrink-0" aria-hidden="true" />
        ) : (
          <Minus className="w-4 h-4 shrink-0" aria-hidden="true" />
        )}
        <span>{checked ? 'Yes' : 'No'}</span>
      </span>
    </div>
  );
}

const ApplicationDetail = () => {
  const { id } = useParams<{ id: string }>();

  const [application, setApplication] = useState<Application | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState('');
  const [reloadKey, setReloadKey] = useState(0);

  useEffect(() => {
    if (!id) return;
    let isMounted = true;

    const loadApplication = async () => {
      try {
        const data = await membersApi.getApplicationById(id);
        if (isMounted) {
          setApplication(data);
          setError('');
        }
      } catch (err: unknown) {
        if (isMounted) {
          setError(err instanceof Error ? err.message : 'Unable to load application.');
        }
      } finally {
        if (isMounted) setIsLoading(false);
      }
    };

    void loadApplication();
    return () => {
      isMounted = false;
    };
  }, [id, reloadKey]);

  const handleRetry = () => {
    setIsLoading(true);
    setError('');
    setReloadKey(k => k + 1);
  };

  const commitmentItems = application
    ? [
        { label: 'Regular Attendance & Participation', checked: application.attendance_commitment },
        { label: 'Faithful Tithing', checked: application.tithe_commitment },
        { label: 'Personal Prayer Life', checked: application.prayer_commitment },
        { label: 'Sober & Self-Controlled Lifestyle', checked: application.sober_commitment },
        { label: 'Respect for Leadership & Members', checked: application.respect_commitment },
        { label: 'Statement of Faith & Growth', checked: application.faith_commitment },
      ]
    : [];

  const agreedCount = commitmentItems.filter(item => item.checked).length;

  return (
    <PageShell width="reference">
      <div className="space-y-8">
        {/* Top Action Bar */}
        <div className="flex flex-wrap items-center justify-between gap-4">
          <Link
            to="/"
            className="inline-flex items-center gap-2 text-sm text-muted-foreground hover:text-accent transition-colors duration-150"
          >
            <ArrowLeft className="w-4 h-4" aria-hidden="true" />
            <span>Return to Directory</span>
          </Link>

          {application && (
            <Link
              to={`/members/${application.member_id}`}
              className={buttonStyles('secondary')}
            >
              <User className="w-4 h-4" aria-hidden="true" />
              <span>Open Member Profile</span>
            </Link>
          )}
        </div>

        {isLoading ? (
          <div aria-label="Loading application snapshot" className="space-y-6">
            <div className="space-y-2">
              <div className="h-10 w-72 bg-border rounded-sm" />
              <div className="h-4 w-56 bg-border rounded-sm" />
            </div>
            <div className="bg-surface border border-border rounded-lg p-8 space-y-4">
              <div className="h-5 w-40 bg-border rounded-sm" />
              <div className="h-4 w-full bg-border rounded-sm" />
              <div className="h-4 w-5/6 bg-border rounded-sm" />
            </div>
          </div>
        ) : error || !application ? (
          <div
            role="alert"
            className="bg-surface border border-foreground rounded-lg p-8 flex flex-col sm:flex-row sm:items-center justify-between gap-6"
          >
            <div className="flex items-start gap-3">
              <AlertCircle className="w-5 h-5 text-foreground shrink-0 mt-0.5" aria-hidden="true" />
              <div className="space-y-1">
                <h1 className="font-heading text-2xl font-normal text-foreground">
                  Unable to load application
                </h1>
                <p className="text-sm text-muted-foreground">
                  {error || 'Application record not found.'}
                </p>
              </div>
            </div>
            <Button variant="secondary" onClick={handleRetry} className="shrink-0">
              Retry Loading Application
            </Button>
          </div>
        ) : (
          <>
            {/* Editorial Document Header (no eyebrow label) */}
            <header className="space-y-3 border-b border-border pb-6">
              <h1 className="font-heading text-4xl font-normal tracking-tight text-foreground leading-tight">
                {application.full_name}
              </h1>
              <p className="text-base text-muted-foreground max-w-xl">
                Immutable membership application snapshot submitted{' '}
                <span className="tabular-nums">{formatDateTime(application.created_at)}</span>.
              </p>

              <div className="flex flex-wrap items-center gap-x-4 gap-y-1.5 text-sm pt-1">
                {application.email ? (
                  <a
                    href={`mailto:${application.email}`}
                    className="text-accent hover:text-accent-hover hover:underline transition-colors duration-150"
                  >
                    {application.email}
                  </a>
                ) : (
                  <span className="text-muted-foreground">No email</span>
                )}
                <span className="text-border" aria-hidden="true">
                  /
                </span>
                {application.phone ? (
                  <a
                    href={toTelHref(application.phone)}
                    className="text-accent hover:text-accent-hover hover:underline transition-colors duration-150 tabular-nums"
                  >
                    {application.phone}
                  </a>
                ) : (
                  <span className="text-muted-foreground">No phone</span>
                )}
                {application.address && (
                  <>
                    <span className="text-border" aria-hidden="true">
                      /
                    </span>
                    <span className="text-muted-foreground">{application.address}</span>
                  </>
                )}
              </div>

              <p className="font-accent text-xs text-muted-foreground tabular-nums">
                Application ID {application.id}
              </p>
            </header>

            {/* Demographics */}
            <section className="bg-surface border border-border rounded-lg p-6 sm:p-8">
              <h2 className="font-heading text-2xl font-normal text-foreground mb-4">
                Demographics
              </h2>
              <dl className="divide-y divide-border">
                <div className="py-3.5 flex items-baseline justify-between gap-4">
                  <dt className="text-sm text-muted-foreground">Date of Birth</dt>
                  <dd className="font-accent text-sm text-foreground tabular-nums">
                    {application.date_of_birth || 'Not provided'}
                  </dd>
                </div>
                <div className="py-3.5 flex items-baseline justify-between gap-4">
                  <dt className="text-sm text-muted-foreground">Marital Status</dt>
                  <dd className="text-sm font-medium text-foreground capitalize">
                    {application.marital_status || 'Not provided'}
                  </dd>
                </div>
                <div className="py-3.5 flex items-baseline justify-between gap-4">
                  <dt className="text-sm text-muted-foreground">Spouse Name</dt>
                  <dd className="text-sm font-medium text-foreground">
                    {application.spouse_name || 'None recorded'}
                  </dd>
                </div>
                <div className="py-3.5 flex items-baseline justify-between gap-4">
                  <dt className="text-sm text-muted-foreground">Number of Children</dt>
                  <dd className="font-accent text-sm text-foreground tabular-nums">
                    {application.num_children}
                  </dd>
                </div>
              </dl>
            </section>

            {/* Spiritual Background */}
            <section className="bg-surface border border-border rounded-lg p-6 sm:p-8">
              <h2 className="font-heading text-2xl font-normal text-foreground mb-4">
                Spiritual Background
              </h2>
              <div className="divide-y divide-border">
                <StatusRow label="Born Again" checked={application.born_again} />
                <StatusRow label="Water Baptized" checked={application.water_baptized} />
                <StatusRow label="Speaks in Tongues" checked={application.speak_tongues} />
                <div className="py-3.5 flex flex-col sm:flex-row sm:items-baseline justify-between gap-1">
                  <span className="text-sm text-muted-foreground">Previous Church</span>
                  <span className="text-sm font-medium text-foreground sm:text-right">
                    {application.prev_church || 'None'}
                  </span>
                </div>
              </div>
            </section>

            {/* Commitment Agreements */}
            <section className="bg-surface border border-border rounded-lg p-6 sm:p-8">
              <div className="flex items-center justify-between gap-4 mb-4">
                <h2 className="font-heading text-2xl font-normal text-foreground">
                  Commitment Agreements
                </h2>
                <span className="bg-accent-wash text-accent font-body text-xs font-medium px-2.5 py-1 rounded-sm tabular-nums">
                  {agreedCount} of {commitmentItems.length} Agreed
                </span>
              </div>
              <div className="divide-y divide-border">
                {commitmentItems.map(item => (
                  <StatusRow key={item.label} label={item.label} checked={item.checked} />
                ))}
              </div>
            </section>

            {/* Signature Record */}
            <section className="bg-surface border border-border rounded-lg p-6 sm:p-8">
              <h2 className="font-heading text-2xl font-normal text-foreground mb-4">
                Signature Record
              </h2>
              <dl className="divide-y divide-border">
                <div className="py-3.5 flex flex-col sm:flex-row sm:items-baseline justify-between gap-1">
                  <div>
                    <dt className="text-sm font-medium text-foreground">Member Signature</dt>
                    <p className="text-xs text-muted-foreground mt-0.5">
                      Agreement to discipleship terms
                    </p>
                  </div>
                  <dd className="font-accent text-sm text-accent tabular-nums">
                    {application.member_signature_date || 'Not dated'}
                  </dd>
                </div>

                <div className="py-3.5 flex flex-col sm:flex-row sm:items-baseline justify-between gap-1">
                  <div>
                    <dt className="text-sm font-medium text-foreground">Pastor Review</dt>
                    <p className="text-xs text-muted-foreground mt-0.5">
                      Recorded upon pastoral approval
                    </p>
                  </div>
                  <dd className="font-accent text-sm text-muted-foreground tabular-nums">
                    {application.pastor_signature_date || 'Pending'}
                  </dd>
                </div>
              </dl>
            </section>
          </>
        )}
      </div>
    </PageShell>
  );
};

export default ApplicationDetail;

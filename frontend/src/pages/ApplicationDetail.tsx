import { useEffect, useState } from 'react';
import { useParams, Link } from 'react-router-dom';
import { membersApi } from '../api/members';
import type { Application } from '../types/member';
import {
  ArrowLeft,
  Loader2,
  AlertCircle,
  CheckCircle2,
  XCircle,
  User,
} from 'lucide-react';

const ApplicationDetail = () => {
  const { id } = useParams<{ id: string }>();

  const [application, setApplication] = useState<Application | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    let isMounted = true;

    const fetchApplication = async () => {
      if (!id) return;
      try {
        setIsLoading(true);
        const data = await membersApi.getApplicationById(id);
        if (isMounted) setApplication(data);
      } catch (err: unknown) {
        if (isMounted) {
          setError(err instanceof Error ? err.message : 'Failed to load application');
        }
      } finally {
        if (isMounted) setIsLoading(false);
      }
    };

    fetchApplication();
    return () => {
      isMounted = false;
    };
  }, [id]);

  if (isLoading) {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center p-6 text-slate-500">
        <Loader2 className="w-12 h-12 text-primary animate-spin mb-4" />
        <p className="animate-pulse font-medium">Loading application snapshot...</p>
      </div>
    );
  }

  if (error || !application) {
    return (
      <div className="min-h-screen p-8 max-w-5xl mx-auto flex flex-col items-start">
        <Link
          to="/"
          className="flex items-center text-slate-500 hover:text-primary transition mb-8"
        >
          <ArrowLeft className="w-5 h-5 mr-2" /> Back to Binder
        </Link>
        <div className="w-full min-h-[40vh] p-8 bg-red-500/5 border-2 border-dashed border-red-500/30 rounded-3xl flex flex-col items-center justify-center text-center">
          <AlertCircle className="w-12 h-12 text-red-500 mb-4" />
          <h3 className="text-xl font-bold text-red-600 dark:text-red-400">
            Unable to load application
          </h3>
          <p className="text-red-500/80 mt-2">{error || 'Application not found.'}</p>
        </div>
      </div>
    );
  }

  const BooleanItem = ({ checked, label }: { checked: boolean; label: string }) => (
    <div className="flex items-center space-x-3 p-3 rounded-xl border bg-slate-50 dark:bg-slate-800/50 border-slate-100 dark:border-slate-800">
      {checked ? (
        <CheckCircle2 className="w-5 h-5 text-green-500 flex-shrink-0" />
      ) : (
        <XCircle className="w-5 h-5 text-slate-300 dark:text-slate-600 flex-shrink-0" />
      )}
      <span
        className={`text-sm font-medium ${
          checked ? 'text-slate-900 dark:text-white' : 'text-slate-500 dark:text-slate-400'
        }`}
      >
        {label}
      </span>
    </div>
  );

  return (
    <div className="min-h-screen py-8 px-4 sm:px-6 lg:px-8">
      <div className="max-w-5xl mx-auto space-y-8">
        {/* Top bar */}
        <div className="flex flex-wrap items-center justify-between gap-4">
          <Link
            to="/"
            className="inline-flex items-center text-sm font-semibold text-slate-500 hover:text-primary transition-colors bg-white dark:bg-white/5 py-2 px-4 rounded-xl border border-slate-200 dark:border-slate-800 shadow-sm"
          >
            <ArrowLeft className="w-4 h-4 mr-2" /> Back to Binder
          </Link>

          <Link
            to={`/members/${application.member_id}`}
            className="inline-flex items-center text-sm font-semibold text-primary hover:text-white transition-colors border border-primary/20 hover:bg-primary py-2 px-4 rounded-xl shadow-sm bg-white dark:bg-white/5"
          >
            <User className="w-4 h-4 mr-2" /> View Linked Member
          </Link>
        </div>

        {/* Snapshot Header */}
        <div className="bg-white/70 dark:bg-black/40 backdrop-blur-xl border border-slate-200 dark:border-slate-800 rounded-3xl p-8 shadow-sm relative overflow-hidden">
          <div className="absolute top-0 left-0 w-2 h-full bg-gradient-to-b from-primary to-accent" />
          <div className="pl-4">
            <span className="inline-block text-xs font-bold uppercase tracking-widest text-primary bg-primary/10 px-2.5 py-1 rounded-md mb-3">
              Immutable Application Snapshot
            </span>
            <h1 className="text-4xl font-black tracking-tight text-slate-900 dark:text-white">
              {application.first_name} {application.last_name}
            </h1>
            <p className="text-sm font-medium text-slate-500 dark:text-slate-400 mt-2">
              {application.email || 'No email'} &bull; {application.phone || 'No phone'}
            </p>
            {application.address && (
              <p className="text-sm text-slate-500 dark:text-slate-400 mt-1">
                {application.address}
              </p>
            )}
            <p className="text-xs font-mono text-slate-400 mt-3">
              Application ID: {application.id} &bull; Submitted{' '}
              {new Date(application.created_at).toLocaleString()}
            </p>
          </div>
        </div>

        {/* Snapshot Details */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-8 pb-12">
          <div className="space-y-8">
            <section className="bg-white/50 dark:bg-white/[0.02] border border-slate-200 dark:border-slate-800 rounded-3xl p-7">
              <h2 className="text-lg font-bold text-slate-900 dark:text-white mb-5">
                Demographics
              </h2>
              <div className="space-y-4">
                <div className="flex justify-between items-center border-b border-slate-100 dark:border-slate-800/60 pb-3">
                  <span className="text-slate-500 font-medium text-sm">Date of Birth</span>
                  <span className="text-slate-900 dark:text-slate-200 font-semibold text-sm">
                    {application.date_of_birth || 'N/A'}
                  </span>
                </div>
                <div className="flex justify-between items-center border-b border-slate-100 dark:border-slate-800/60 pb-3">
                  <span className="text-slate-500 font-medium text-sm">Marital Status</span>
                  <span className="text-slate-900 dark:text-slate-200 font-semibold text-sm capitalize">
                    {application.marital_status || 'N/A'}
                  </span>
                </div>
                <div className="flex justify-between items-center border-b border-slate-100 dark:border-slate-800/60 pb-3">
                  <span className="text-slate-500 font-medium text-sm">Spouse Name</span>
                  <span className="text-slate-900 dark:text-slate-200 font-semibold text-sm">
                    {application.spouse_name || 'N/A'}
                  </span>
                </div>
                <div className="flex justify-between items-center pb-1">
                  <span className="text-slate-500 font-medium text-sm">Children</span>
                  <span className="text-slate-900 dark:text-slate-200 font-semibold text-sm">
                    {application.num_children}
                  </span>
                </div>
              </div>
            </section>

            <section className="bg-white/50 dark:bg-white/[0.02] border border-slate-200 dark:border-slate-800 rounded-3xl p-7">
              <h2 className="text-lg font-bold text-slate-900 dark:text-white mb-5">
                Spiritual Context
              </h2>
              <div className="grid grid-cols-2 gap-3 mb-6">
                <BooleanItem checked={application.born_again} label="Born Again" />
                <BooleanItem checked={application.water_baptized} label="Water Baptized" />
                <BooleanItem checked={application.speak_tongues} label="Speaks Tongues" />
              </div>
              <div className="p-4 bg-slate-50 dark:bg-slate-800/30 rounded-xl border border-slate-100 dark:border-slate-800">
                <span className="block text-xs font-bold text-slate-400 uppercase tracking-wider mb-1">
                  Previous Church
                </span>
                <span className="text-slate-800 dark:text-slate-200 text-sm font-medium">
                  {application.prev_church || 'None'}
                </span>
              </div>
            </section>
          </div>

          <div className="space-y-8">
            <section className="bg-slate-900 dark:bg-black/60 rounded-3xl p-7 shadow-lg border border-slate-800 relative overflow-hidden">
              <div className="absolute top-0 right-0 w-32 h-32 bg-primary/20 blur-3xl rounded-full pointer-events-none" />
              <h2 className="text-lg font-bold text-white mb-5 relative z-10">
                Commitment Agreements
              </h2>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 relative z-10">
                <BooleanItem checked={application.attendance_commitment} label="Attendance" />
                <BooleanItem checked={application.tithe_commitment} label="Tithe" />
                <BooleanItem checked={application.prayer_commitment} label="Active Prayer" />
                <BooleanItem checked={application.sober_commitment} label="Sober Lifestyle" />
                <BooleanItem checked={application.respect_commitment} label="Leadership Respect" />
                <BooleanItem checked={application.faith_commitment} label="Statement of Faith" />
              </div>
            </section>

            <section className="bg-white/50 dark:bg-white/[0.02] border border-slate-200 dark:border-slate-800 rounded-3xl p-7">
              <h2 className="text-lg font-bold text-slate-900 dark:text-white mb-5">
                Signature Record
              </h2>
              <div className="space-y-4">
                <div className="flex items-center justify-between p-4 bg-slate-50 dark:bg-white/5 rounded-xl border border-slate-200 dark:border-slate-800/80">
                  <div>
                    <div className="text-sm font-bold text-slate-800 dark:text-slate-200">
                      Member Signed
                    </div>
                    <div className="text-xs font-medium text-slate-500 mt-0.5">
                      Agreement to Discipleship Terms
                    </div>
                  </div>
                  <span className="text-sm font-semibold text-primary">
                    {application.member_signature_date || 'Not dated'}
                  </span>
                </div>
                <div className="flex items-center justify-between p-4 bg-slate-50 dark:bg-white/5 rounded-xl border border-slate-200 dark:border-slate-800/80">
                  <div>
                    <div className="text-sm font-bold text-slate-800 dark:text-slate-200">
                      Pastor Review
                    </div>
                    <div className="text-xs font-medium text-slate-500 mt-0.5">
                      Planned for V2 approval workflow
                    </div>
                  </div>
                  <span className="text-sm font-semibold text-slate-400">
                    {application.pastor_signature_date || 'Pending'}
                  </span>
                </div>
              </div>
            </section>
          </div>
        </div>
      </div>
    </div>
  );
};

export default ApplicationDetail;

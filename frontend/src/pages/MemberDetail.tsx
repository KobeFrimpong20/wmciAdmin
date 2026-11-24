import { useEffect, useState } from 'react';
import { useParams, Link } from 'react-router-dom';
import { membersApi } from '../api/members';
import type { Member, Application } from '../types/member';
import {
  ArrowLeft,
  Loader2,
  AlertCircle,
  Mail,
  Phone,
  MapPin,
  Clock,
  FileText,
  ChevronRight,
} from 'lucide-react';

const MemberDetail = () => {
  const { id } = useParams<{ id: string }>();

  const [member, setMember] = useState<Member | null>(null);
  const [applications, setApplications] = useState<Application[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    let isMounted = true;

    const fetchData = async () => {
      if (!id) return;
      try {
        setIsLoading(true);
        const [memberData, appList] = await Promise.all([
          membersApi.getMemberById(id),
          membersApi.getAllApplications(id),
        ]);

        if (isMounted) {
          setMember(memberData);
          setApplications(appList || []);
        }
      } catch (err: unknown) {
        if (isMounted) {
          setError(err instanceof Error ? err.message : 'Failed to load member profile');
        }
      } finally {
        if (isMounted) setIsLoading(false);
      }
    };

    fetchData();
    return () => {
      isMounted = false;
    };
  }, [id]);

  if (isLoading) {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center p-6 text-slate-500">
        <Loader2 className="w-12 h-12 text-primary animate-spin mb-4" />
        <p className="animate-pulse font-medium">Loading member record...</p>
      </div>
    );
  }

  if (error || !member) {
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
            Unable to load member
          </h3>
          <p className="text-red-500/80 mt-2">{error || 'Member not found.'}</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen py-8 px-4 sm:px-6 lg:px-8">
      <div className="max-w-4xl mx-auto space-y-8">
        <div>
          <Link
            to="/"
            className="inline-flex items-center text-sm font-semibold text-slate-500 hover:text-primary transition-colors bg-white dark:bg-white/5 py-2 px-4 rounded-xl border border-slate-200 dark:border-slate-800 shadow-sm"
          >
            <ArrowLeft className="w-4 h-4 mr-2" /> Back to Binder
          </Link>
        </div>

        {/* Profile Card */}
        <div className="bg-white/70 dark:bg-black/40 backdrop-blur-xl border border-slate-200 dark:border-slate-800 rounded-3xl p-8 shadow-sm relative overflow-hidden">
          <div className="absolute top-0 left-0 w-2 h-full bg-gradient-to-b from-primary to-accent" />
          <div className="pl-4 space-y-5">
            <div>
              <h1 className="text-4xl font-black tracking-tight text-slate-900 dark:text-white">
                {member.first_name} {member.last_name}
              </h1>
              <p className="text-xs font-mono text-slate-400 mt-1">Member ID: {member.id}</p>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 pt-2">
              <div className="flex items-center text-sm text-slate-600 dark:text-slate-300">
                <Mail className="w-4 h-4 mr-3 text-primary flex-shrink-0" />
                <span>{member.email || 'No email provided'}</span>
              </div>
              <div className="flex items-center text-sm text-slate-600 dark:text-slate-300">
                <Phone className="w-4 h-4 mr-3 text-primary flex-shrink-0" />
                <span>{member.phone || 'No phone provided'}</span>
              </div>
              <div className="flex items-center text-sm text-slate-600 dark:text-slate-300">
                <MapPin className="w-4 h-4 mr-3 text-primary flex-shrink-0" />
                <span>{member.address || 'No address provided'}</span>
              </div>
              <div className="flex items-center text-sm text-slate-600 dark:text-slate-300">
                <Clock className="w-4 h-4 mr-3 text-primary flex-shrink-0" />
                <span>Joined {new Date(member.joined_at).toLocaleDateString()}</span>
              </div>
            </div>
          </div>
        </div>

        {/* Linked Application Snapshots */}
        <section className="bg-white/50 dark:bg-white/[0.02] border border-slate-200 dark:border-slate-800 rounded-3xl p-7">
          <div className="flex items-center gap-2 mb-5">
            <FileText className="w-5 h-5 text-primary" />
            <h2 className="text-lg font-bold text-slate-900 dark:text-white">
              Application Snapshots ({applications.length})
            </h2>
          </div>

          {applications.length === 0 ? (
            <p className="text-sm text-slate-500">
              No intake applications linked to this member.
            </p>
          ) : (
            <div className="space-y-3">
              {applications.map(app => (
                <Link
                  key={app.id}
                  to={`/applications/${app.id}`}
                  className="flex items-center justify-between p-4 rounded-2xl bg-slate-50 dark:bg-white/5 border border-slate-200 dark:border-slate-800 hover:border-primary/50 transition"
                >
                  <div>
                    <div className="text-sm font-semibold text-slate-900 dark:text-white">
                      Submitted {new Date(app.created_at).toLocaleString()}
                    </div>
                    <div className="text-xs font-mono text-slate-400 mt-0.5">{app.id}</div>
                  </div>
                  <ChevronRight className="w-5 h-5 text-slate-400" />
                </Link>
              ))}
            </div>
          )}
        </section>
      </div>
    </div>
  );
};

export default MemberDetail;
